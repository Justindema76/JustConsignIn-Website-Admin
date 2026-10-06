-- Lets the site owner grant other people scoped access to one site's admin,
-- without sharing the owner's own Google login. Read only by server-side
-- code using the service-role key (api/_lib/websiteAdmin.js) — never
-- exposed to anon/authenticated REST directly, so no RLS policy is needed
-- or granted here.

create table if not exists public.site_collaborators (
  id uuid primary key default gen_random_uuid(),
  site_key text not null references public.sites(site_key) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','editor')),
  label text not null default '',
  created_at timestamptz not null default now(),
  unique(site_key, email)
);

create index if not exists site_collaborators_site_idx on public.site_collaborators(site_key);

alter table public.site_collaborators enable row level security;
-- No policies: this table is intentionally reachable only via the
-- service-role key from api/admin/collaborators.js and
-- api/_lib/websiteAdmin.js, never from the browser directly.
