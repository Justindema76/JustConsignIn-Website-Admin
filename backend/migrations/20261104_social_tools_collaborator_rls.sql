-- Social Posts + Metricool: let a site's collaborators (editor/admin) use them for THEIR site.
-- Fixes: "new row violates row-level security policy for table social_integrations" when an
-- editor clicks Connect Metricool, and editors not seeing/creating social posts.
-- Owner policies are left untouched. Safe to run again.

begin;

drop policy if exists "collaborator manages own site social integrations" on public.social_integrations;
create policy "collaborator manages own site social integrations"
on public.social_integrations for all to authenticated
using (
  (select auth.jwt()->'app_metadata'->>'provider') = 'google'
  and exists (
    select 1 from public.site_collaborators sc
    where sc.site_key = social_integrations.site_key
      and lower(sc.email) = lower((select auth.jwt()->>'email'))
  )
)
with check (
  (select auth.jwt()->'app_metadata'->>'provider') = 'google'
  and exists (
    select 1 from public.site_collaborators sc
    where sc.site_key = social_integrations.site_key
      and lower(sc.email) = lower((select auth.jwt()->>'email'))
  )
);

drop policy if exists "collaborator manages own site social campaigns" on public.social_campaigns;
create policy "collaborator manages own site social campaigns"
on public.social_campaigns for all to authenticated
using (
  (select auth.jwt()->'app_metadata'->>'provider') = 'google'
  and exists (
    select 1 from public.site_collaborators sc
    where sc.site_key = social_campaigns.site_key
      and lower(sc.email) = lower((select auth.jwt()->>'email'))
  )
)
with check (
  (select auth.jwt()->'app_metadata'->>'provider') = 'google'
  and exists (
    select 1 from public.site_collaborators sc
    where sc.site_key = social_campaigns.site_key
      and lower(sc.email) = lower((select auth.jwt()->>'email'))
  )
);

commit;

notify pgrst, 'reload schema';

select case when count(*) = 2 then '✅ Editors can now use Social Posts + Metricool for their site' else '❌ Only ' || count(*) || ' of 2 rules added' end as result
from pg_policies where schemaname = 'public' and policyname in ('collaborator manages own site social integrations', 'collaborator manages own site social campaigns');
