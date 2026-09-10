create table if not exists public.email_settings (
  id text primary key default 'primary' check (id = 'primary'),
  enabled boolean not null default true,
  provider text not null default 'smtp' check (provider = 'smtp'),
  smtp_host text not null default 'mail.justconsignin.com',
  smtp_port integer not null default 465 check (smtp_port between 1 and 65535),
  smtp_secure boolean not null default true,
  smtp_username text,
  smtp_from_email text,
  smtp_from_name text not null default 'JustConsignIn',
  notification_email text,
  password_secret_id uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.email_settings enable row level security;
revoke all on public.email_settings from anon, authenticated;

insert into public.email_settings (
  id, enabled, provider, smtp_host, smtp_port, smtp_secure, smtp_username,
  smtp_from_email, smtp_from_name, notification_email
) values (
  'primary', true, 'smtp', 'mail.justconsignin.com', 465, true,
  'support@justconsignin.com', 'support@justconsignin.com', 'JustConsignIn',
  'support@justconsignin.com'
) on conflict (id) do nothing;

alter table public.demo_requests add column if not exists notification_token uuid not null default gen_random_uuid();
alter table public.demo_requests add column if not exists email_notification_attempted_at timestamptz;
alter table public.demo_requests add column if not exists email_notified_at timestamptz;
alter table public.demo_requests add column if not exists email_notification_error text;

create or replace function public.admin_get_email_settings()
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
  has_password boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(auth.jwt()->>'email', '')) <> 'justindema76@gmail.com' then
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
    (e.password_secret_id is not null) as has_password,
    e.updated_at
  from public.email_settings e
  where e.id = 'primary';
end;
$$;

create or replace function public.admin_save_email_settings(
  p_enabled boolean,
  p_provider text,
  p_smtp_host text,
  p_smtp_port integer,
  p_smtp_secure boolean,
  p_smtp_username text,
  p_smtp_from_email text,
  p_smtp_from_name text,
  p_notification_email text,
  p_password text default null
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
begin
  if lower(coalesce(auth.jwt()->>'email', '')) <> 'justindema76@gmail.com' then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if coalesce(trim(p_smtp_host), '') = '' then raise exception 'SMTP host is required'; end if;
  if p_smtp_port is null or p_smtp_port < 1 or p_smtp_port > 65535 then raise exception 'Invalid SMTP port'; end if;
  if coalesce(trim(p_smtp_username), '') = '' then raise exception 'SMTP username is required'; end if;
  if coalesce(trim(p_smtp_from_email), '') = '' then raise exception 'From email is required'; end if;
  if coalesce(trim(p_notification_email), '') = '' then raise exception 'Notification email is required'; end if;
  if coalesce(p_provider, 'smtp') <> 'smtp' then raise exception 'Unsupported email provider'; end if;

  select e.password_secret_id into v_secret_id
  from public.email_settings e
  where e.id = 'primary';

  if v_password is not null then
    if v_secret_id is null then
      v_secret_id := vault.create_secret(
        v_password,
        'justconsignin_smtp_password',
        'SMTP password managed from Website Admin'
      );
    else
      perform vault.update_secret(v_secret_id, v_password, null, null, null);
    end if;
  end if;

  insert into public.email_settings (
    id, enabled, provider, smtp_host, smtp_port, smtp_secure, smtp_username,
    smtp_from_email, smtp_from_name, notification_email, password_secret_id,
    updated_at, updated_by
  ) values (
    'primary', coalesce(p_enabled, true), 'smtp', trim(p_smtp_host), p_smtp_port,
    coalesce(p_smtp_secure, true), trim(p_smtp_username), trim(p_smtp_from_email),
    coalesce(nullif(trim(p_smtp_from_name), ''), 'JustConsignIn'),
    trim(p_notification_email), v_secret_id, now(), auth.uid()
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
    password_secret_id = coalesce(excluded.password_secret_id, public.email_settings.password_secret_id),
    updated_at = now(),
    updated_by = auth.uid();

  return query select * from public.admin_get_email_settings();
end;
$$;

create or replace function public.service_get_email_settings()
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
    v.decrypted_secret as smtp_password
  from public.email_settings e
  left join vault.decrypted_secrets v on v.id = e.password_secret_id
  where e.id = 'primary';
$$;

revoke all on function public.admin_get_email_settings() from public, anon;
revoke all on function public.admin_save_email_settings(boolean,text,text,integer,boolean,text,text,text,text,text) from public, anon;
grant execute on function public.admin_get_email_settings() to authenticated;
grant execute on function public.admin_save_email_settings(boolean,text,text,integer,boolean,text,text,text,text,text) to authenticated;

revoke all on function public.service_get_email_settings() from public, anon, authenticated;
grant execute on function public.service_get_email_settings() to service_role;