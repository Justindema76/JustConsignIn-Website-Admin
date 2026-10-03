-- Expand Sunwings quote requests into a reusable service-request workflow foundation.

begin;

alter table public.sunwings_quote_requests
  add column if not exists preferred_time text not null default '',
  add column if not exists pickup_address text not null default '',
  add column if not exists pickup_city text not null default '',
  add column if not exists pickup_postal_code text not null default '',
  add column if not exists pickup_elevator boolean,
  add column if not exists pickup_stairs boolean,
  add column if not exists dropoff_address text not null default '',
  add column if not exists dropoff_city text not null default '',
  add column if not exists dropoff_postal_code text not null default '',
  add column if not exists dropoff_elevator boolean,
  add column if not exists dropoff_stairs boolean,
  add column if not exists item_list text not null default '',
  add column if not exists priority text not null default 'normal',
  add column if not exists admin_notes text not null default '',
  add column if not exists contacted_at timestamptz,
  add column if not exists status_changed_at timestamptz,
  add column if not exists quote_number text,
  add column if not exists quote_amount numeric(12,2),
  add column if not exists next_action text,
  add column if not exists next_action_due_at timestamptz,
  add column if not exists last_activity text,
  add column if not exists last_activity_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.sunwings_quote_requests'::regclass
      and conname='sunwings_quote_requests_priority_check'
  ) then
    alter table public.sunwings_quote_requests
      add constraint sunwings_quote_requests_priority_check
      check (priority in ('low','normal','high'));
  end if;
end $$;

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
  v_pickup_address text := left(trim(coalesce(p->>'pickupAddress','')),220);
  v_pickup_city text := left(trim(coalesce(p->>'pickupCity','')),120);
  v_pickup_postal text := upper(left(trim(coalesce(p->>'pickupPostalCode','')),24));
  v_dropoff_address text := left(trim(coalesce(p->>'dropoffAddress','')),220);
  v_dropoff_city text := left(trim(coalesce(p->>'dropoffCity','')),120);
  v_dropoff_postal text := upper(left(trim(coalesce(p->>'dropoffPostalCode','')),24));
  v_from text := left(trim(coalesce(p->>'moveFrom','')),220);
  v_to text := left(trim(coalesce(p->>'moveTo','')),220);
  v_message text := left(trim(coalesce(p->>'message','')),3000);
  v_item_list text := left(trim(coalesce(p->>'itemList','')),6000);
  v_move_size text := left(trim(coalesce(p->>'moveSize','')),120);
  v_preferred_time text := left(trim(coalesce(p->>'preferredTime','')),80);
  v_quick boolean := lower(trim(coalesce(p->>'quickRequest','false'))) in ('true','1','yes');
  v_pickup_elevator boolean := case lower(trim(coalesce(p->>'pickupElevator',''))) when 'yes' then true when 'true' then true when 'no' then false when 'false' then false else null end;
  v_pickup_stairs boolean := case lower(trim(coalesce(p->>'pickupStairs',''))) when 'yes' then true when 'true' then true when 'no' then false when 'false' then false else null end;
  v_dropoff_elevator boolean := case lower(trim(coalesce(p->>'dropoffElevator',''))) when 'yes' then true when 'true' then true when 'no' then false when 'false' then false else null end;
  v_dropoff_stairs boolean := case lower(trim(coalesce(p->>'dropoffStairs',''))) when 'yes' then true when 'true' then true when 'no' then false when 'false' then false else null end;
  v_date date;
  v_ip text := left(trim(coalesce(p_ip,'')),120);
  v_id uuid;
  v_token uuid;
begin
  if v_name = '' then raise exception 'name_required'; end if;
  if regexp_replace(v_phone,'\D','','g') !~ '^\d{10,}$' then raise exception 'phone_invalid'; end if;
  if v_email = '' then raise exception 'email_required'; end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'email_invalid'; end if;
  if v_service = '' then raise exception 'service_required'; end if;

  if coalesce(trim(p->>'preferredDate'),'') = '' then raise exception 'date_required'; end if;
  begin
    v_date := (p->>'preferredDate')::date;
  exception when others then
    raise exception 'date_invalid';
  end;

  if not v_quick then
    if v_pickup_address = '' then raise exception 'pickup_address_required'; end if;
    if v_pickup_postal = '' then raise exception 'pickup_postal_required'; end if;
    if v_dropoff_address = '' then raise exception 'dropoff_address_required'; end if;
    if v_dropoff_postal = '' then raise exception 'dropoff_postal_required'; end if;
  end if;

  if v_from = '' then v_from := concat_ws(', ', nullif(v_pickup_address,''), nullif(v_pickup_city,''), nullif(v_pickup_postal,'')); end if;
  if v_to = '' then v_to := concat_ws(', ', nullif(v_dropoff_address,''), nullif(v_dropoff_city,''), nullif(v_dropoff_postal,'')); end if;

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
    preferred_date,preferred_time,move_size,
    pickup_address,pickup_city,pickup_postal_code,pickup_elevator,pickup_stairs,
    dropoff_address,dropoff_city,dropoff_postal_code,dropoff_elevator,dropoff_stairs,
    item_list,message,request_ip,last_activity,last_activity_at
  ) values (
    'sunwings',v_name,v_phone,v_email,v_service,v_from,v_to,
    v_date,v_preferred_time,v_move_size,
    v_pickup_address,v_pickup_city,v_pickup_postal,v_pickup_elevator,v_pickup_stairs,
    v_dropoff_address,v_dropoff_city,v_dropoff_postal,v_dropoff_elevator,v_dropoff_stairs,
    v_item_list,v_message,v_ip,case when v_quick then 'Quick quote request submitted' else 'Quote request submitted' end,now()
  )
  returning sunwings_quote_requests.id,sunwings_quote_requests.notification_token
  into v_id,v_token;

  return query select v_id,v_token;
end;
$$;

revoke all on function public.sunwings_submit_quote(jsonb,text) from public;
grant execute on function public.sunwings_submit_quote(jsonb,text) to anon,authenticated;

commit;
