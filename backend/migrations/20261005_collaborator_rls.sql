-- Extends the existing "owner only" RLS policies on Sunwings content tables
-- so a row in site_collaborators also grants access, not just the one
-- hardcoded owner email. Run this after 20261005_site_collaborators.sql.

-- ===== site_collaborators itself =====
-- The owner (your own login) can see and manage every row.
drop policy if exists "owner manages site collaborators" on public.site_collaborators;
create policy "owner manages site collaborators"
on public.site_collaborators for all to authenticated
using ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
with check ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google');

-- Any signed-in person can read their own row(s), so the app can ask
-- "what am I allowed to see" after login (api/admin/my-access.js).
drop policy if exists "self reads own collaborator rows" on public.site_collaborators;
create policy "self reads own collaborator rows"
on public.site_collaborators for select to authenticated
using (email = (select auth.jwt()->>'email'));

grant select, insert, update, delete on public.site_collaborators to authenticated;

-- ===== sunwings_services =====
drop policy if exists "owner manages sunwings services" on public.sunwings_services;
create policy "owner manages sunwings services"
on public.sunwings_services for all to authenticated
using (
  ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
  or exists (
    select 1 from public.site_collaborators sc
    where sc.site_key = sunwings_services.site_key
      and sc.email = (select auth.jwt()->>'email')
  )
)
with check (
  ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
  or exists (
    select 1 from public.site_collaborators sc
    where sc.site_key = sunwings_services.site_key
      and sc.email = (select auth.jwt()->>'email')
  )
);

-- ===== sunwings_locations =====
drop policy if exists "owner manages sunwings locations" on public.sunwings_locations;
create policy "owner manages sunwings locations"
on public.sunwings_locations for all to authenticated
using (
  ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
  or exists (
    select 1 from public.site_collaborators sc
    where sc.site_key = sunwings_locations.site_key
      and sc.email = (select auth.jwt()->>'email')
  )
)
with check (
  ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
  or exists (
    select 1 from public.site_collaborators sc
    where sc.site_key = sunwings_locations.site_key
      and sc.email = (select auth.jwt()->>'email')
  )
);

-- ===== sunwings_quote_requests =====
drop policy if exists "owner reads and manages sunwings quotes" on public.sunwings_quote_requests;
create policy "owner reads and manages sunwings quotes"
on public.sunwings_quote_requests for all to authenticated
using (
  ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
  or exists (
    select 1 from public.site_collaborators sc
    where sc.site_key = sunwings_quote_requests.site_key
      and sc.email = (select auth.jwt()->>'email')
  )
)
with check (
  ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
  or exists (
    select 1 from public.site_collaborators sc
    where sc.site_key = sunwings_quote_requests.site_key
      and sc.email = (select auth.jwt()->>'email')
  )
);
