-- Harden Sunwings quote submissions and store quote fields separately.

alter table public.sunwings_quote_requests
  add column if not exists preferred_date date,
  add column if not exists move_size text not null default '',
  add column if not exists request_ip text not null default '',
  add column if not exists notification_token uuid not null default gen_random_uuid(),
  add column if not exists email_notification_attempted_at timestamptz,
  add column if not exists email_notified_at timestamptz,
  add column if not exists email_notification_error text;

create unique index if not exists sunwings_quote_requests_notification_token_idx
  on public.sunwings_quote_requests(notification_token);

drop policy if exists "public creates sunwings quote requests" on public.sunwings_quote_requests;

create or replace function public.sunwings_submit_quote(p jsonb, p_ip text default '')
returns table(id uuid, notification_token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := left(trim(coalesce(p->>'name','')),120);
  v_phone text := left(trim(coalesce(p->>'phone','')),60);
  v_email text := lower(left(trim(coalesce(p->>'email','')),160));
  v_service text := left(trim(coalesce(p->>'service','')),160);
  v_from text := left(trim(coalesce(p->>'moveFrom','')),220);
  v_to text := left(trim(coalesce(p->>'moveTo','')),220);
  v_message text := left(trim(coalesce(p->>'message','')),3000);
  v_move_size text := left(trim(coalesce(p->>'moveSize','')),120);
  v_date date;
  v_ip text := left(trim(coalesce(p_ip,'')),120);
  v_id uuid;
  v_token uuid;
begin
  if v_name = '' then raise exception 'name_required'; end if;
  if regexp_replace(v_phone,'\D','','g') !~ '^\d{10,}$' then raise exception 'phone_invalid'; end if;
  if v_email <> '' and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'email_invalid'; end if;

  if coalesce(trim(p->>'preferredDate'),'') <> '' then
    begin
      v_date := (p->>'preferredDate')::date;
    exception when others then
      raise exception 'date_invalid';
    end;
  end if;

  if v_ip <> '' and (
    select count(*)
    from public.sunwings_quote_requests q
    where q.site_key='sunwings'
      and q.request_ip=v_ip
      and q.created_at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'rate_limited';
  end if;

  insert into public.sunwings_quote_requests(
    site_key,name,phone,email,service,move_from,move_to,
    preferred_date,move_size,message,request_ip
  ) values (
    'sunwings',v_name,v_phone,v_email,v_service,v_from,v_to,
    v_date,v_move_size,v_message,v_ip
  )
  returning sunwings_quote_requests.id,sunwings_quote_requests.notification_token
  into v_id,v_token;

  return query select v_id,v_token;
end;
$$;

revoke all on function public.sunwings_submit_quote(jsonb,text) from public;
grant execute on function public.sunwings_submit_quote(jsonb,text) to anon,authenticated;
