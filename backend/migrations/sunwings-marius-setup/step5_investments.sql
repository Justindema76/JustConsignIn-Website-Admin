-- Sunwings Marius jobs & commission setup — STEP 5 of 5
-- Track money you put into Sunwings (flyers, ads…). Only you can see it.
-- Paste into Supabase › SQL Editor › Run. Safe to run again.
-- The last line prints ✅ when this step worked.

begin;

-- 4. Investments ------------------------------------------------------------------------
create table if not exists public.sunwings_investments (
  id uuid primary key default gen_random_uuid(),
  site_key text not null default 'sunwings' references public.sites(site_key) on delete cascade,
  spent_on date not null default current_date,
  amount numeric(12,2) not null check (amount >= 0),
  category text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);
alter table public.sunwings_investments enable row level security;

drop policy if exists "owner manages sunwings investments" on public.sunwings_investments;
create policy "owner manages sunwings investments"
on public.sunwings_investments for all to authenticated
using ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
with check ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google');

grant select, insert, update, delete on public.sunwings_investments to authenticated;

commit;

-- Tell the API about the new columns/tables right away.
notify pgrst, 'reload schema';

select case when to_regclass('public.sunwings_investments') is not null then '✅ Step 5 done: investments table ready' else '❌ Step 5 did not apply' end as result;
