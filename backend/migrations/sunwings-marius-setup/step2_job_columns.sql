-- Sunwings Marius jobs & commission setup — STEP 2 of 5
-- Add the Marius + commission fields to each quote request (forwarded date, Marius price/status/note, final price, commission).
-- Paste into Supabase › SQL Editor › Run. Safe to run again.
-- The last line prints ✅ when this step worked.

begin;

-- 2. Workflow + commission fields ------------------------------------------------------
alter table public.sunwings_quote_requests
  add column if not exists forwarded_at timestamptz,
  add column if not exists partner_price numeric(12,2),
  add column if not exists partner_status text not null default '',
  add column if not exists partner_note text not null default '',
  add column if not exists partner_updated_at timestamptz,
  add column if not exists partner_update_unseen boolean not null default false,
  add column if not exists contact_shared boolean not null default false,
  add column if not exists contact_shared_at timestamptz,
  add column if not exists final_price numeric(12,2),
  add column if not exists commission_rate numeric(5,2),
  add column if not exists commission_status text not null default 'owed',
  add column if not exists commission_paid_at date,
  add column if not exists commission_paid_method text not null default '';

alter table public.sunwings_quote_requests
  drop constraint if exists sunwings_quote_requests_commission_status_check;
alter table public.sunwings_quote_requests
  add constraint sunwings_quote_requests_commission_status_check
  check (commission_status in ('owed','paid','none'));

commit;

-- Tell the API about the new columns/tables right away.
notify pgrst, 'reload schema';

select case when count(*) = 13 then '✅ Step 2 done: 13 job fields added' else '❌ Step 2 incomplete: ' || count(*) || ' of 13 fields' end as result from information_schema.columns where table_schema = 'public' and table_name = 'sunwings_quote_requests' and column_name in ('forwarded_at','partner_price','partner_status','partner_note','partner_updated_at','partner_update_unseen','contact_shared','contact_shared_at','final_price','commission_rate','commission_status','commission_paid_at','commission_paid_method');
