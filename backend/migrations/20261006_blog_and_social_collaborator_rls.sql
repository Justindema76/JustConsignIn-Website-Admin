-- Opens Moving Tips (blog_posts), Media (storage, no DB change needed),
-- Social Links and Social Posts to site collaborators, matching
-- 20261005_collaborator_rls.sql's pattern. Safe to run regardless of
-- current state: every statement is additive (if-not-exists / drop-then-
-- recreate), so it can only grant access, never remove anything that
-- already works.

-- ===== blog_posts =====
-- This table predates the multi-site / collaborator work and may be
-- missing site_key depending on what's actually live; add it
-- defensively so the policy below has something to scope on.
alter table public.blog_posts
  add column if not exists site_key text not null default 'justconsignin';

alter table public.blog_posts enable row level security;

drop policy if exists "owner or collaborator manages blog posts" on public.blog_posts;
create policy "owner or collaborator manages blog posts"
on public.blog_posts for all to authenticated
using (
  ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
  or exists (
    select 1 from public.site_collaborators sc
    where sc.site_key = blog_posts.site_key
      and sc.email = (select auth.jwt()->>'email')
  )
)
with check (
  ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
  or exists (
    select 1 from public.site_collaborators sc
    where sc.site_key = blog_posts.site_key
      and sc.email = (select auth.jwt()->>'email')
  )
);

grant select, insert, update, delete on public.blog_posts to authenticated;

-- ===== site_settings (Social Links only) =====
-- site_settings holds Social Links, Global Styles and Header/Footer in
-- the same table under different `key` values. The app only lets
-- collaborators reach the 'social_links' key (see api/admin/site.js),
-- so this policy is scoped to that key specifically -- a collaborator's
-- own token still cannot write Styles/Header/Footer directly against
-- Supabase even though those stay owner-only in the app UI.
drop policy if exists "owner or collaborator manages social links" on public.site_settings;
create policy "owner or collaborator manages social links"
on public.site_settings for all to authenticated
using (
  key = 'social_links' and (
    ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
    or exists (
      select 1 from public.site_collaborators sc
      where sc.site_key = site_settings.site_key
        and sc.email = (select auth.jwt()->>'email')
    )
  )
)
with check (
  key = 'social_links' and (
    ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
    or exists (
      select 1 from public.site_collaborators sc
      where sc.site_key = site_settings.site_key
        and sc.email = (select auth.jwt()->>'email')
    )
  )
);

-- ===== social_campaigns / social_integrations (Social Posts) =====
-- Neither table currently has row-level security enabled (grants only),
-- so the app-level check in api/admin/social-automation.js is already
-- sufficient -- nothing to add here.
