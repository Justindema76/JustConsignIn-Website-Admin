-- Split Website Admin email configuration by website.
-- Keeps JustConsignIn on id='primary' and adds Justin DeMatteis on id='justindematteis'.

alter table public.email_settings drop constraint if exists email_settings_id_check;
alter table public.email_settings
  add constraint email_settings_id_check
  check (id in ('primary','justindematteis'));

insert into public.email_settings (
  id, enabled, provider, smtp_host, smtp_port, smtp_secure, smtp_username,
  smtp_from_email, smtp_from_name, notification_email, notification_routes,
  password_secret_id, updated_at, updated_by
)
values (
  'justindematteis', true, 'smtp', 'justindematteis.com', 465, true,
  'justin@justindematteis.com', 'justin@justindematteis.com', 'Justin DeMatteis',
  'justin@justindematteis.com',
  jsonb_build_array(jsonb_build_object(
    'id','service-primary','eventKey','service_request','recipientType','to',
    'email','justin@justindematteis.com','enabled',true
  )),
  null, now(), null
)
on conflict (id) do nothing;

drop function if exists public.admin_get_email_settings();
drop function if exists public.admin_save_email_settings(boolean,text,text,integer,boolean,text,text,text,text,text,jsonb);
drop function if exists public.service_get_email_settings();

create function public.admin_get_email_settings(p_site_key text default 'justconsignin')
returns table (
  enabled boolean, provider text, smtp_host text, smtp_port integer, smtp_secure boolean,
  smtp_username text, smtp_from_email text, smtp_from_name text, notification_email text,
  notification_routes jsonb, has_password boolean, updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_site_key text := lower(trim(coalesce(p_site_key, 'justconsignin')));
  v_setting_id text;
begin
  if auth.uid() <> 'acfd4d60-fd52-43e3-9313-927645953cb8'::uuid then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if v_site_key not in ('justconsignin','justindematteis') then raise exception 'Unknown website'; end if;
  v_setting_id := case when v_site_key='justconsignin' then 'primary' else 'justindematteis' end;

  return query
  select e.enabled,e.provider,e.smtp_host,e.smtp_port,e.smtp_secure,e.smtp_username,
         e.smtp_from_email,e.smtp_from_name,e.notification_email,e.notification_routes,
         (e.password_secret_id is not null),e.updated_at
  from public.email_settings e
  where e.id=v_setting_id;
end;
$$;

create function public.admin_save_email_settings(
  p_enabled boolean,
  p_provider text,
  p_smtp_host text,
  p_smtp_port integer,
  p_smtp_secure boolean,
  p_smtp_username text,
  p_smtp_from_email text,
  p_smtp_from_name text,
  p_notification_email text,
  p_password text default null,
  p_notification_routes jsonb default null,
  p_site_key text default 'justconsignin'
)
returns table (
  enabled boolean, provider text, smtp_host text, smtp_port integer, smtp_secure boolean,
  smtp_username text, smtp_from_email text, smtp_from_name text, notification_email text,
  notification_routes jsonb, has_password boolean, updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_site_key text := lower(trim(coalesce(p_site_key,'justconsignin')));
  v_setting_id text;
  v_secret_name text;
  v_default_from_name text;
  v_required_event text;
  v_secret_id uuid;
  v_password text := nullif(trim(coalesce(p_password,'')),'');
  v_routes jsonb;
  v_primary_email text;
begin
  if auth.uid() <> 'acfd4d60-fd52-43e3-9313-927645953cb8'::uuid then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if v_site_key not in ('justconsignin','justindematteis') then raise exception 'Unknown website'; end if;

  v_setting_id := case when v_site_key='justconsignin' then 'primary' else 'justindematteis' end;
  v_secret_name := case when v_site_key='justconsignin' then 'justconsignin_smtp_password' else 'justindematteis_smtp_password' end;
  v_default_from_name := case when v_site_key='justconsignin' then 'JustConsignIn' else 'Justin DeMatteis' end;
  v_required_event := case when v_site_key='justconsignin' then 'demo_request' else 'service_request' end;

  if coalesce(trim(p_smtp_host),'')='' then raise exception 'SMTP host is required'; end if;
  if p_smtp_port is null or p_smtp_port<1 or p_smtp_port>65535 then raise exception 'Invalid SMTP port'; end if;
  if coalesce(trim(p_smtp_username),'')='' then raise exception 'SMTP username is required'; end if;
  if coalesce(trim(p_smtp_from_email),'')='' then raise exception 'From email is required'; end if;
  if coalesce(p_provider,'smtp')<>'smtp' then raise exception 'Unsupported email provider'; end if;

  select e.password_secret_id,
         case when p_notification_routes is null then e.notification_routes else p_notification_routes end
  into v_secret_id,v_routes
  from public.email_settings e
  where e.id=v_setting_id;

  v_routes := coalesce(v_routes,'[]'::jsonb);
  if jsonb_typeof(v_routes)<>'array' then raise exception 'Notification routes must be a list'; end if;
  if jsonb_array_length(v_routes)>50 then raise exception 'Too many notification routes'; end if;

  if exists (
    select 1 from jsonb_array_elements(v_routes) r
    where coalesce(r->>'eventKey','') !~ '^[a-z0-9_-]{1,60}$'
       or coalesce(r->>'recipientType','') not in ('to','cc','bcc')
       or coalesce(r->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) then raise exception 'Invalid notification route'; end if;

  select lower(trim(r->>'email')) into v_primary_email
  from jsonb_array_elements(v_routes) r
  where coalesce((r->>'enabled')::boolean,true)
    and r->>'eventKey'=v_required_event
    and r->>'recipientType'='to'
  limit 1;

  v_primary_email := coalesce(v_primary_email,nullif(lower(trim(coalesce(p_notification_email,''))),''));
  if v_primary_email is null then
    raise exception 'At least one % To address is required',
      case when v_required_event='demo_request' then 'Demo Requests' else 'Service Requests' end;
  end if;

  if v_password is not null then
    if v_secret_id is null then
      v_secret_id := vault.create_secret(v_password,v_secret_name,'SMTP password managed from Website Admin');
    else
      perform vault.update_secret(v_secret_id,v_password,null,null,null);
    end if;
  end if;

  insert into public.email_settings (
    id,enabled,provider,smtp_host,smtp_port,smtp_secure,smtp_username,smtp_from_email,
    smtp_from_name,notification_email,notification_routes,password_secret_id,updated_at,updated_by
  ) values (
    v_setting_id,coalesce(p_enabled,true),'smtp',trim(p_smtp_host),p_smtp_port,
    coalesce(p_smtp_secure,true),trim(p_smtp_username),lower(trim(p_smtp_from_email)),
    coalesce(nullif(trim(p_smtp_from_name),''),v_default_from_name),v_primary_email,
    v_routes,v_secret_id,now(),auth.uid()
  )
  on conflict (id) do update set
    enabled=excluded.enabled,provider=excluded.provider,smtp_host=excluded.smtp_host,
    smtp_port=excluded.smtp_port,smtp_secure=excluded.smtp_secure,smtp_username=excluded.smtp_username,
    smtp_from_email=excluded.smtp_from_email,smtp_from_name=excluded.smtp_from_name,
    notification_email=excluded.notification_email,notification_routes=excluded.notification_routes,
    password_secret_id=coalesce(excluded.password_secret_id,public.email_settings.password_secret_id),
    updated_at=now(),updated_by=auth.uid();

  return query select * from public.admin_get_email_settings(v_site_key);
end;
$$;

create function public.service_get_email_settings(p_site_key text default 'justconsignin')
returns table (
  enabled boolean, provider text, smtp_host text, smtp_port integer, smtp_secure boolean,
  smtp_username text, smtp_from_email text, smtp_from_name text, notification_email text,
  notification_routes jsonb, smtp_password text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_site_key text := lower(trim(coalesce(p_site_key,'justconsignin')));
  v_setting_id text;
begin
  if v_site_key not in ('justconsignin','justindematteis') then raise exception 'Unknown website'; end if;
  v_setting_id := case when v_site_key='justconsignin' then 'primary' else 'justindematteis' end;

  return query
  select e.enabled,e.provider,e.smtp_host,e.smtp_port,e.smtp_secure,e.smtp_username,
         e.smtp_from_email,e.smtp_from_name,e.notification_email,e.notification_routes,
         v.decrypted_secret
  from public.email_settings e
  left join vault.decrypted_secrets v on v.id=e.password_secret_id
  where e.id=v_setting_id;
end;
$$;

revoke all on function public.admin_get_email_settings(text) from public,anon;
revoke all on function public.admin_save_email_settings(boolean,text,text,integer,boolean,text,text,text,text,text,jsonb,text) from public,anon;
grant execute on function public.admin_get_email_settings(text) to authenticated;
grant execute on function public.admin_save_email_settings(boolean,text,text,integer,boolean,text,text,text,text,text,jsonb,text) to authenticated;
revoke all on function public.service_get_email_settings(text) from public,anon,authenticated;
grant execute on function public.service_get_email_settings(text) to service_role;
