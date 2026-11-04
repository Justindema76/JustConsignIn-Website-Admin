-- Sunwings Marius jobs & commission setup — STEP 4 of 5
-- Marius’s secure access: he only sees jobs you sent him, with the customer as “First L.” and no phone/email unless you share it. He can only save his price, status, final price and a note.
-- Paste into Supabase › SQL Editor › Run. Safe to run again.
-- The last line prints ✅ when this step worked.

begin;

create or replace function public.sunwings_is_partner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sunwings_partners p
    where p.site_key = 'sunwings'
      and p.email = lower(coalesce(auth.jwt()->>'email', ''))
  );
$$;

-- Jobs forwarded to the partner. Customer name is shortened to "First L." and the
-- phone/email are only included once Justin shares them for that job.
create or replace function public.sunwings_partner_jobs()
returns table (
  id uuid, created_at timestamptz, request_type text, customer text,
  phone text, email text, contact_shared boolean,
  service text, preferred_date text, preferred_time text, move_size text,
  pickup_address text, pickup_city text, pickup_postal_code text, pickup_elevator boolean, pickup_stairs boolean,
  dropoff_address text, dropoff_city text, dropoff_postal_code text, dropoff_elevator boolean, dropoff_stairs boolean,
  item_list text, message text, status text, forwarded_at timestamptz,
  partner_price numeric, partner_status text, partner_note text, partner_updated_at timestamptz, final_price numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.sunwings_is_partner() then
    raise exception 'not_a_partner';
  end if;
  return query
  select q.id, q.created_at, q.request_type,
    trim(split_part(trim(q.name), ' ', 1) || ' ' ||
      case when position(' ' in trim(q.name)) > 0
        then left(regexp_replace(trim(q.name), '^.*\s', ''), 1) || '.'
        else '' end),
    case when q.contact_shared then q.phone else null end,
    case when q.contact_shared then q.email else null end,
    q.contact_shared,
    q.service, q.preferred_date::text, q.preferred_time, q.move_size,
    q.pickup_address, q.pickup_city, q.pickup_postal_code, q.pickup_elevator, q.pickup_stairs,
    q.dropoff_address, q.dropoff_city, q.dropoff_postal_code, q.dropoff_elevator, q.dropoff_stairs,
    q.item_list, q.message, q.status, q.forwarded_at,
    q.partner_price, q.partner_status, q.partner_note, q.partner_updated_at, q.final_price
  from public.sunwings_quote_requests q
  where q.site_key = 'sunwings' and q.forwarded_at is not null
  order by q.forwarded_at desc;
end;
$$;

-- The partner saves their price, job status, final price and a note. Only forwarded
-- jobs can be changed, and only these fields.
create or replace function public.sunwings_partner_update_job(
  p_id uuid, p_price numeric, p_status text, p_final_price numeric, p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := coalesce(nullif(trim(p_status), ''), '');
begin
  if not public.sunwings_is_partner() then
    raise exception 'not_a_partner';
  end if;
  if v_status not in ('', 'reviewing', 'priced', 'booked', 'complete', 'cant_do') then
    raise exception 'invalid_status';
  end if;

  update public.sunwings_quote_requests q
  set partner_price = p_price,
      partner_status = v_status,
      final_price = coalesce(p_final_price, q.final_price),
      partner_note = left(coalesce(p_note, ''), 4000),
      partner_updated_at = now(),
      partner_update_unseen = true,
      status = case v_status
        when 'priced' then 'priced'
        when 'booked' then 'booked'
        when 'complete' then 'complete'
        when 'cant_do' then 'declined'
        else q.status end,
      status_changed_at = case when v_status in ('priced','booked','complete','cant_do') then now() else q.status_changed_at end,
      last_activity = 'Marius updated the job',
      last_activity_at = now(),
      updated_at = now()
  where q.id = p_id and q.site_key = 'sunwings' and q.forwarded_at is not null;

  if not found then
    raise exception 'job_not_found';
  end if;
end;
$$;

revoke all on function public.sunwings_partner_jobs() from public;
revoke all on function public.sunwings_partner_update_job(uuid, numeric, text, numeric, text) from public;
revoke all on function public.sunwings_is_partner() from public;
grant execute on function public.sunwings_partner_jobs() to authenticated;
grant execute on function public.sunwings_partner_update_job(uuid, numeric, text, numeric, text) to authenticated;
grant execute on function public.sunwings_is_partner() to authenticated;

commit;

-- Tell the API about the new columns/tables right away.
notify pgrst, 'reload schema';

select case when count(*) = 3 then '✅ Step 4 done: Marius access functions ready' else '❌ Step 4 incomplete: ' || count(*) || ' of 3 functions' end as result from pg_proc where pronamespace = 'public'::regnamespace and proname in ('sunwings_is_partner','sunwings_partner_jobs','sunwings_partner_update_job');
