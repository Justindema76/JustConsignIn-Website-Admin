-- Sunwings quote conversation (Nov 22)
-- Every email, customer reply, note and quote on a job is saved here, so Justin sees all of it.
-- Adds the "Getting details" step (Marius talking to the customer) between Sent to Marius and Priced.
-- Paste into Supabase › SQL Editor › Run. Safe to run again. The last line prints ✅ when it worked.

begin;

-- 1. New step: Marius is getting details from the customer ------------------------------
alter table public.sunwings_quote_requests
  drop constraint if exists sunwings_quote_requests_status_check;
alter table public.sunwings_quote_requests
  add constraint sunwings_quote_requests_status_check
  check (status in (
    'new','reviewing','forwarded','marius_working','priced','needs_quote','contacted','quote_sent',
    'accepted','booked','complete','declined','cancelled',
    'quoted','closed'
  ));

-- 2. Quick flags on the job for the Home screen -----------------------------------------
alter table public.sunwings_quote_requests add column if not exists customer_replied_at timestamptz;
alter table public.sunwings_quote_requests add column if not exists customer_reply_unseen boolean not null default false;
alter table public.sunwings_quote_requests add column if not exists last_message_at timestamptz;
alter table public.sunwings_quote_requests add column if not exists last_message_by text;

-- 3. The conversation -------------------------------------------------------------------
create table if not exists public.sunwings_quote_messages (
  id uuid primary key default gen_random_uuid(),
  site_key text not null default 'sunwings',
  quote_id uuid not null references public.sunwings_quote_requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('email_out','email_in','note','quote','system')),
  author text not null default 'System',          -- Justin, Marius, Customer or System
  subject text,
  body text,
  to_email text,
  from_email text,
  amount numeric(12,2),                           -- quotes only: the total
  lines jsonb,                                    -- quotes only: [{ "label": "...", "amount": 0 }]
  ref text,                                       -- SW-xxxxxx tag used in email subjects
  email_message_id text unique,                   -- stops the same email being saved twice
  meta jsonb not null default '{}'::jsonb
);
create index if not exists sunwings_quote_messages_quote_idx on public.sunwings_quote_messages (quote_id, created_at);
create index if not exists sunwings_quote_messages_ref_idx on public.sunwings_quote_messages (ref);

-- Only Website Admin's server reads and writes messages (it checks who may see each job).
alter table public.sunwings_quote_messages enable row level security;
revoke all on public.sunwings_quote_messages from anon, authenticated;
grant select, insert, update, delete on public.sunwings_quote_messages to service_role;

commit;

notify pgrst, 'reload schema';

select case
  when to_regclass('public.sunwings_quote_messages') is not null
   and exists (select 1 from pg_constraint where conname = 'sunwings_quote_requests_status_check' and pg_get_constraintdef(oid) like '%marius_working%')
  then '✅ Quote conversation is set up'
  else '❌ Quote conversation did not apply' end as result;
