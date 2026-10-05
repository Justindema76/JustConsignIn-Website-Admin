create table if not exists public.sunwings_integrations (
  site_key text not null references public.sites(site_key) on delete cascade default 'sunwings',
  provider text not null check (provider in ('google_reviews','facebook')),
  config jsonb not null default '{}'::jsonb,
  secrets jsonb not null default '{}'::jsonb,
  enabled boolean not null default false,
  last_tested_at timestamptz,
  last_test_ok boolean,
  last_test_message text not null default '',
  updated_at timestamptz not null default now(),
  primary key(site_key, provider)
);

alter table public.sunwings_integrations enable row level security;

drop policy if exists "owner manages sunwings integrations" on public.sunwings_integrations;
create policy "owner manages sunwings integrations"
on public.sunwings_integrations for all to authenticated
using ((select auth.jwt()->>'email')='justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider')='google')
with check ((select auth.jwt()->>'email')='justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider')='google');

grant select,insert,update,delete on public.sunwings_integrations to authenticated;
