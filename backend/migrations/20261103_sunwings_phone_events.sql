-- Applied to the shared JustConsignIN Supabase project.
-- Private reporting storage; no anonymous INSERT or SELECT access.
create table if not exists public.sunwings_phone_events (
  id uuid primary key default gen_random_uuid(),
  site_key text not null default 'sunwings' check (site_key = 'sunwings'),
  created_at timestamptz not null default now(),
  page_path text not null default '/',
  button_location text not null default 'unknown',
  destination text not null default '',
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text
);
create index if not exists sunwings_phone_events_created_at_idx on public.sunwings_phone_events (created_at desc);
alter table public.sunwings_phone_events enable row level security;
drop policy if exists "sunwings staff can read phone events" on public.sunwings_phone_events;
create policy "sunwings staff can read phone events" on public.sunwings_phone_events
for select to authenticated using (
  site_key = 'sunwings' and (
    ((select auth.jwt() ->> 'email') = 'justindema76@gmail.com'
      and (select auth.jwt() -> 'app_metadata' ->> 'provider') = 'google')
    or exists (
      select 1 from public.site_collaborators sc
      where sc.site_key = 'sunwings'
      and sc.email = (select auth.jwt() ->> 'email')
    )
  )
);
grant select on public.sunwings_phone_events to authenticated;
revoke all on public.sunwings_phone_events from anon;
