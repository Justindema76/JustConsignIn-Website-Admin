-- Shopify Studio becomes its own website in the admin (own blog, social posts, Metricool brand,
-- videos and media), separate from the main JustinDeMatteis.com portfolio.
-- Existing per-site policies (owner or site collaborator by site_key) already cover it.
insert into public.sites (site_key, name, domain, admin_label, is_active)
values ('shopifystudio', 'Shopify Studio', 'justindematteis.com/shopify-studio', 'Shopify Studio', true)
on conflict (site_key) do update set
  name = excluded.name,
  domain = excluded.domain,
  admin_label = excluded.admin_label,
  is_active = true;

-- API keys for the Shopify Studio content API (Supabase function "studio-api", used by ChatGPT).
-- Only a SHA-256 hash of each key is stored; the key itself is shown once when created.
create table if not exists public.studio_api_keys (
  id uuid primary key default gen_random_uuid(),
  site_key text not null default 'shopifystudio' references public.sites(site_key),
  label text not null default '',
  key_hash text not null unique,
  key_hint text not null default '',
  scopes text[] not null default array['read', 'draft'],
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

alter table public.studio_api_keys enable row level security;

drop policy if exists "owner manages studio api keys" on public.studio_api_keys;
create policy "owner manages studio api keys"
on public.studio_api_keys for all to authenticated
using ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
with check ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google');

grant select, insert, update on public.studio_api_keys to authenticated;

-- The studio-api function reads keys with the server role.
grant select, update on public.studio_api_keys to service_role;
grant select, insert, update on public.social_campaigns to service_role;
