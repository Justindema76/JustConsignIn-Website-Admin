-- Portfolio Work Posts: article-style case studies for JustinDeMatteis.com
create table if not exists public.work_posts (
  id uuid primary key default gen_random_uuid(),
  site_key text not null references public.sites(site_key) on delete cascade,
  slug text not null,
  title text not null,
  work_type text not null default '',
  company text not null default '',
  role text not null default '',
  platform text not null default '',
  audience text not null default '',
  excerpt text not null default '',
  featured_image text not null default '',
  featured_image_alt text not null default '',
  project_url text not null default '',
  secondary_url text not null default '',
  tags text[] not null default '{}',
  body_html text not null default '',
  seo_title text not null default '',
  seo_description text not null default '',
  og_image text not null default '',
  status text not null default 'draft' check (status in ('draft','published')),
  author_name text not null default 'Justin DeMatteis',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_key, slug)
);

alter table public.work_posts enable row level security;

drop policy if exists "public reads published work posts" on public.work_posts;
create policy "public reads published work posts"
on public.work_posts for select
to anon, authenticated
using (status = 'published');

drop policy if exists "owner reads work posts" on public.work_posts;
create policy "owner reads work posts"
on public.work_posts for select
to authenticated
using (
  (select auth.jwt() ->> 'email') = 'justindema76@gmail.com'
  and (select auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
);

drop policy if exists "owner inserts work posts" on public.work_posts;
create policy "owner inserts work posts"
on public.work_posts for insert
to authenticated
with check (
  (select auth.jwt() ->> 'email') = 'justindema76@gmail.com'
  and (select auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
);

drop policy if exists "owner updates work posts" on public.work_posts;
create policy "owner updates work posts"
on public.work_posts for update
to authenticated
using (
  (select auth.jwt() ->> 'email') = 'justindema76@gmail.com'
  and (select auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
)
with check (
  (select auth.jwt() ->> 'email') = 'justindema76@gmail.com'
  and (select auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
);

drop policy if exists "owner deletes work posts" on public.work_posts;
create policy "owner deletes work posts"
on public.work_posts for delete
to authenticated
using (
  (select auth.jwt() ->> 'email') = 'justindema76@gmail.com'
  and (select auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
);

grant select on public.work_posts to anon;
grant select, insert, update, delete on public.work_posts to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'work-media','work-media',true,104857600,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/x-m4v','video/m4v','video/webm']::text[]
)
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;
