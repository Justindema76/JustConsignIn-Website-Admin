create table if not exists public.sunwings_social_posts (
  site_key text not null references public.sites(site_key) on delete cascade default 'sunwings',
  provider text not null default 'facebook' check (provider = 'facebook'),
  external_id text not null,
  message text not null default '',
  image_url text not null default '',
  permalink_url text not null default '',
  published_at timestamptz,
  synced_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,
  primary key (site_key, provider, external_id)
);

alter table public.sunwings_social_posts enable row level security;

drop policy if exists "owner manages sunwings social posts" on public.sunwings_social_posts;
create policy "owner manages sunwings social posts" on public.sunwings_social_posts
for all to authenticated
using ((select auth.jwt()->>'email')='justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider')='google')
with check ((select auth.jwt()->>'email')='justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider')='google');

grant select,insert,update,delete on public.sunwings_social_posts to authenticated;

-- Justinnovate's version omitted this: the public Facebook-feed endpoint reads this
-- table with the anon key, which RLS would otherwise block entirely.
drop policy if exists "public reads sunwings social posts" on public.sunwings_social_posts;
create policy "public reads sunwings social posts" on public.sunwings_social_posts
for select to anon, authenticated
using (site_key = 'sunwings');

grant select on public.sunwings_social_posts to anon;
