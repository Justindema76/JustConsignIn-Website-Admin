-- Add reusable YouTube content metadata used by Website Admin and the public site.

alter table public.site_videos
  add column if not exists content_type text not null default 'video',
  add column if not exists playlist_name text not null default 'JustConsignIn';

-- Backfill existing Shorts from their canonical YouTube Shorts URL.
update public.site_videos
set content_type = 'short'
where lower(youtube_url) like '%youtube.com/shorts/%';

-- Keep existing site videos attached to the current channel playlist.
update public.site_videos
set playlist_name = 'JustConsignIn'
where coalesce(trim(playlist_name), '') = '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'site_videos_content_type_check'
      and conrelid = 'public.site_videos'::regclass
  ) then
    alter table public.site_videos
      add constraint site_videos_content_type_check
      check (content_type in ('video', 'short'));
  end if;
end $$;

create index if not exists site_videos_playlist_type_order_idx
  on public.site_videos (playlist_name, content_type, placement, sort_order);
