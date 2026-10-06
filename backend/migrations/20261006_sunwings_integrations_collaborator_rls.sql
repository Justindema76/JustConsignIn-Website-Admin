-- Extends collaborator access (see 20261005_collaborator_rls.sql) to the
-- Sunwings Integrations page: sunwings_integrations (API keys/tokens for
-- Google Reviews + Facebook) and sunwings_social_posts (the Facebook feed
-- cache that page also syncs/displays).
--
-- Note: sunwings_integrations stores the raw secret values. The admin API
-- (api/admin/sunwings/integrations.js) never echoes them back to the
-- browser, but this policy does give any collaborator added for 'sunwings'
-- row-level SELECT on the table itself, same as every other
-- collaborator-accessible table. Only grant Integrations access to people
-- you'd trust with those credentials directly.

-- ===== sunwings_integrations =====
drop policy if exists "owner manages sunwings integrations" on public.sunwings_integrations;
create policy "owner manages sunwings integrations"
on public.sunwings_integrations for all to authenticated
using (
  ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
  or exists (
    select 1 from public.site_collaborators sc
    where sc.site_key = sunwings_integrations.site_key
      and sc.email = (select auth.jwt()->>'email')
  )
)
with check (
  ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
  or exists (
    select 1 from public.site_collaborators sc
    where sc.site_key = sunwings_integrations.site_key
      and sc.email = (select auth.jwt()->>'email')
  )
);

-- ===== sunwings_social_posts =====
-- (the separate "public reads sunwings social posts" policy for the
-- anonymous website feed is untouched by this.)
drop policy if exists "owner manages sunwings social posts" on public.sunwings_social_posts;
create policy "owner manages sunwings social posts" on public.sunwings_social_posts
for all to authenticated
using (
  ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
  or exists (
    select 1 from public.site_collaborators sc
    where sc.site_key = sunwings_social_posts.site_key
      and sc.email = (select auth.jwt()->>'email')
  )
)
with check (
  ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
  or exists (
    select 1 from public.site_collaborators sc
    where sc.site_key = sunwings_social_posts.site_key
      and sc.email = (select auth.jwt()->>'email')
  )
);
