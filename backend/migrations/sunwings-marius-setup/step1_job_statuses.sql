-- Sunwings Marius jobs & commission setup — STEP 1 of 5
-- Allow every job status the admin uses (New, Sent to Marius, Priced, Quote sent, Booked, Complete, Declined…).
-- Paste into Supabase › SQL Editor › Run. Safe to run again.
-- The last line prints ✅ when this step worked.

begin;

-- 1. Statuses -------------------------------------------------------------------------
alter table public.sunwings_quote_requests
  drop constraint if exists sunwings_quote_requests_status_check;
alter table public.sunwings_quote_requests
  add constraint sunwings_quote_requests_status_check
  check (status in (
    'new','reviewing','forwarded','priced','needs_quote','contacted','quote_sent',
    'accepted','booked','complete','declined','cancelled',
    'quoted','closed'
  ));

commit;

-- Tell the API about the new columns/tables right away.
notify pgrst, 'reload schema';

select case when exists (select 1 from pg_constraint where conname = 'sunwings_quote_requests_status_check' and pg_get_constraintdef(oid) like '%forwarded%') then '✅ Step 1 done: job statuses updated' else '❌ Step 1 did not apply' end as result;
