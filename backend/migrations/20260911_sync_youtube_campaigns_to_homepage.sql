alter table public.site_videos
  add column if not exists media_url text not null default '',
  add column if not exists source_campaign_id uuid,
  add column if not exists publish_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'site_videos_source_campaign_id_key'
      and conrelid = 'public.site_videos'::regclass
  ) then
    alter table public.site_videos
      add constraint site_videos_source_campaign_id_key unique (source_campaign_id);
  end if;
end $$;

create or replace function public.sync_youtube_campaign_to_site_videos()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status in ('scheduled', 'published')
     and new.media_type = 'video'
     and coalesce(new.media_url, '') <> ''
     and exists (
       select 1
       from jsonb_array_elements(coalesce(new.metricool_posts, '[]'::jsonb)) as post
       where post->>'network' = 'youtube'
     ) then
    insert into public.site_videos (
      title, youtube_url, youtube_id, description, placement, sort_order, status,
      content_type, playlist_name, media_url, source_campaign_id, publish_at, updated_at
    ) values (
      coalesce(nullif(new.youtube_title, ''), new.title),
      '',
      '',
      coalesce(new.youtube_description, ''),
      'homepage',
      0,
      'active',
      case when new.youtube_format = 'short' then 'short' else 'video' end,
      'JustConsignIn',
      new.media_url,
      new.id,
      new.scheduled_at,
      now()
    )
    on conflict (source_campaign_id) do update set
      title = excluded.title,
      description = excluded.description,
      placement = excluded.placement,
      status = excluded.status,
      content_type = excluded.content_type,
      playlist_name = excluded.playlist_name,
      media_url = excluded.media_url,
      publish_at = excluded.publish_at,
      updated_at = now();
  end if;

  return new;
end;
$$;

revoke all on function public.sync_youtube_campaign_to_site_videos() from public;
grant execute on function public.sync_youtube_campaign_to_site_videos() to authenticated;

drop trigger if exists sync_youtube_campaign_to_site_videos on public.social_campaigns;
create trigger sync_youtube_campaign_to_site_videos
after insert or update of status, metricool_posts, media_url, youtube_title, youtube_description, youtube_format, scheduled_at
on public.social_campaigns
for each row
execute function public.sync_youtube_campaign_to_site_videos();

drop policy if exists "public reads active site videos" on public.site_videos;
create policy "public reads active site videos"
on public.site_videos
for select
to anon, authenticated
using (
  status = 'active'
  and (publish_at is null or publish_at <= now())
);
