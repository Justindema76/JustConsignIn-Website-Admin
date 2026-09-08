create table if not exists public.site_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text not null,
  youtube_id text not null default '',
  description text not null default '',
  placement text not null default 'homepage',
  sort_order integer not null default 0,
  status text not null default 'active' check (status in ('active','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_videos_placement_sort_idx
  on public.site_videos(placement, sort_order, created_at);

alter table public.site_videos enable row level security;

drop policy if exists "public reads active site videos" on public.site_videos;
create policy "public reads active site videos"
  on public.site_videos
  for select
  to anon, authenticated
  using (status = 'active');

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "public reads site settings" on public.site_settings;
create policy "public reads site settings"
  on public.site_settings
  for select
  to anon, authenticated
  using (true);

create or replace function public.set_site_content_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_videos_set_updated_at on public.site_videos;
create trigger site_videos_set_updated_at
before insert or update on public.site_videos
for each row execute function public.set_site_content_updated_at();

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
before insert or update on public.site_settings
for each row execute function public.set_site_content_updated_at();

insert into public.site_videos (title, youtube_url, youtube_id, description, placement, sort_order, status)
select 'JustConsignIn Shopify Product Overview', 'https://youtu.be/xt9ltPjKP5g', 'xt9ltPjKP5g', '', 'homepage', 1, 'active'
where not exists (select 1 from public.site_videos where youtube_id = 'xt9ltPjKP5g');

insert into public.site_videos (title, youtube_url, youtube_id, description, placement, sort_order, status)
select 'JustConsignIn Consignment Demo', 'https://youtu.be/j1LmKY_OY0Y', 'j1LmKY_OY0Y', '', 'homepage', 2, 'active'
where not exists (select 1 from public.site_videos where youtube_id = 'j1LmKY_OY0Y');

insert into public.site_settings (key, value)
values ('social_links', '{"facebook":{"url":"","enabled":true},"instagram":{"url":"","enabled":true},"linkedin":{"url":"","enabled":true},"youtube":{"url":"","enabled":true},"tiktok":{"url":"","enabled":true}}'::jsonb)
on conflict (key) do nothing;
