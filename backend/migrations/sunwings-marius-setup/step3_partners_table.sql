-- Sunwings Marius jobs & commission setup — STEP 3 of 5
-- Create the partners list (Marius). Only Justin can add/remove partners; a partner can only see his own row.
-- Paste into Supabase › SQL Editor › Run. Safe to run again.
-- The last line prints ✅ when this step worked.

begin;

-- 3. Partners (Marius) ---------------------------------------------------------------
create table if not exists public.sunwings_partners (
  id uuid primary key default gen_random_uuid(),
  site_key text not null default 'sunwings' references public.sites(site_key) on delete cascade,
  email text not null,
  label text not null default '',
  created_at timestamptz not null default now(),
  unique (site_key, email)
);
alter table public.sunwings_partners enable row level security;

drop policy if exists "owner manages sunwings partners" on public.sunwings_partners;
create policy "owner manages sunwings partners"
on public.sunwings_partners for all to authenticated
using ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
with check ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google');

drop policy if exists "partner reads own row" on public.sunwings_partners;
create policy "partner reads own row"
on public.sunwings_partners for select to authenticated
using (email = lower((select auth.jwt()->>'email')));

grant select, insert, update, delete on public.sunwings_partners to authenticated;

commit;

-- Tell the API about the new columns/tables right away.
notify pgrst, 'reload schema';

select case when to_regclass('public.sunwings_partners') is not null then '✅ Step 3 done: partners table ready' else '❌ Step 3 did not apply' end as result;
