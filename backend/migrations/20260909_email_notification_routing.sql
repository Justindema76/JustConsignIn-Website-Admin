alter table public.email_settings
  add column if not exists notification_routes jsonb not null default '[]'::jsonb;

update public.email_settings
set notification_routes = jsonb_build_array(
  jsonb_build_object(
    'id', 'demo-primary',
    'eventKey', 'demo_request',
    'recipientType', 'to',
    'email', notification_email,
    'enabled', true
  )
)
where id = 'primary'
  and coalesce(jsonb_array_length(notification_routes), 0) = 0
  and coalesce(trim(notification_email), '') <> '';

drop function if exists public.admin_get_email_settings();
drop function if exists public.admin_save_email_settings(boolean,text,text,integer,boolean,text,text,text,text,text);
drop function if exists public.service_get_email_settings();

create function public.admin_get_email_settings()
returns table (
  enabled boolean,
  provider text,
  smtp_host text,
  smtp_port integer,
  smtp_secure boolean,
  smtp_username text,
  smtp_from_email text,
  smtp_from_name text,
  notification_email text,
  notification_routes jsonb,
  has_password boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() <> 'acfd4d60-fd52-43e3-9313-927645953cb8'::uuid then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select
    e.enabled,
    e.provider,
    e.smtp_host,
    e.smtp_port,
    e.smtp_secure,
    e.smtp_username,
    e.smtp_from_email,
    e.smtp_from_name,
    e.notification_email,
    e.notification_routes,
    (e.password_secret_id is not null) as has_password,
    e.updated_at
  from public.email_settings e
  where e.id = 'primary';
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
  p_notification_routes jsonb default null
)
returns table (
  enabled boolean,
  provider text,
  smtp_host text,
  smtp_port integer,
  smtp_secure boolean,
  smtp_username text,
  smtp_from_email text,
  smtp_from_name text,
  notification_email text,
  notification_routes jsonb,
  has_password boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_password text := nullif(trim(coalesce(p_password, '')), '');
  v_routes jsonb;
  v_primary_email text;
begin
  if auth.uid() <> 'acfd4d60-fd52-43e3-9313-927645953cb8'::uuid then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if coalesce(trim(p_smtp_host), '') = '' then raise exception 'SMTP host is required'; end if;
  if p_smtp_port is null or p_smtp_port < 1 or p_smtp_port > 65535 then raise exception 'Invalid SMTP port'; end if;
  if coalesce(trim(p_smtp_username), '') = '' then raise exception 'SMTP username is required'; end if;
  if coalesce(trim(p_smtp_from_email), '') = '' then raise exception 'From email is required'; end if;
  if coalesce(p_provider, 'smtp') <> 'smtp' then raise exception 'Unsupported email provider'; end if;

  select e.password_secret_id,
         case when p_notification_routes is null then e.notification_routes else p_notification_routes end
    into v_secret_id, v_routes
  from public.email_settings e
  where e.id = 'primary';

  v_routes := coalesce(v_routes, '[]'::jsonb);
  if jsonb_typeof(v_routes) <> 'array' then raise exception 'Notification routes must be a list'; end if;
  if jsonb_array_length(v_routes) > 50 then raise exception 'Too many notification routes'; end if;

  if exists (
    select 1 from jsonb_array_elements(v_routes) r
    where coalesce(r->>'eventKey', '') !~ '^[a-z0-9_-]{1,60}$'
       or coalesce(r->>'recipientType', '') not in ('to','cc','bcc')
       or coalesce(r->>'email', '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) then
    raise exception 'Invalid notification route';
  end if;

  select lower(trim(r->>'email')) into v_primary_email
  from jsonb_array_elements(v_routes) r
  where coalesce((r->>'enabled')::boolean, true)
    and r->>'eventKey' = 'demo_request'
    and r->>'recipientType' = 'to'
  limit 1;

  v_primary_email := coalesce(v_primary_email, nullif(lower(trim(coalesce(p_notification_email, ''))), ''));
  if v_primary_email is null then raise exception 'At least one Demo Requests To address is required'; end if;

  if v_password is not null then
    if v_secret_id is null then
      v_secret_id := vault.create_secret(v_password, 'justconsignin_smtp_password', 'SMTP password managed from Website Admin');
    else
      perform vault.update_secret(v_secret_id, v_password, null, null, null);
    end if;
  end if;

  insert into public.email_settings (
    id, enabled, provider, smtp_host, smtp_port, smtp_secure, smtp_username,
    smtp_from_email, smtp_from_name, notification_email, notification_routes,
    password_secret_id, updated_at, updated_by
  ) values (
    'primary', coalesce(p_enabled, true), 'smtp', trim(p_smtp_host), p_smtp_port,
    coalesce(p_smtp_secure, true), trim(p_smtp_username), lower(trim(p_smtp_from_email)),
    coalesce(nullif(trim(p_smtp_from_name), ''), 'JustConsignIn'), v_primary_email,
    v_routes, v_secret_id, now(), auth.uid()
  )
  on conflict (id) do update set
    enabled = excluded.enabled,
    provider = excluded.provider,
    smtp_host = excluded.smtp_host,
    smtp_port = excluded.smtp_port,
    smtp_secure = excluded.smtp_secure,
    smtp_username = excluded.smtp_username,
    smtp_from_email = excluded.smtp_from_email,
    smtp_from_name = excluded.smtp_from_name,
    notification_email = excluded.notification_email,
    notification_routes = excluded.notification_routes,
    password_secret_id = coalesce(excluded.password_secret_id, public.email_settings.password_secret_id),
    updated_at = now(),
    updated_by = auth.uid();

  return query select * from public.admin_get_email_settings();
end;
$$;

create function public.service_get_email_settings()
returns table (
  enabled boolean,
  provider text,
  smtp_host text,
  smtp_port integer,
  smtp_secure boolean,
  smtp_username text,
  smtp_from_email text,
  smtp_from_name text,
  notification_email text,
  notification_routes jsonb,
  smtp_password text
)
language sql
security definer
set search_path = ''
as $$
  select
    e.enabled,
    e.provider,
    e.smtp_host,
    e.smtp_port,
    e.smtp_secure,
    e.smtp_username,
    e.smtp_from_email,
    e.smtp_from_name,
    e.notification_email,
    e.notification_routes,
    v.decrypted_secret as smtp_password
  from public.email_settings e
  left join vault.decrypted_secrets v on v.id = e.password_secret_id
  where e.id = 'primary';
$$;

revoke all on function public.admin_get_email_settings() from public, anon;
revoke all on function public.admin_save_email_settings(boolean,text,text,integer,boolean,text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.admin_get_email_settings() to authenticated;
grant execute on function public.admin_save_email_settings(boolean,text,text,integer,boolean,text,text,text,text,text,jsonb) to authenticated;

revoke all on function public.service_get_email_settings() from public, anon, authenticated;
grant execute on function public.service_get_email_settings() to service_role;
