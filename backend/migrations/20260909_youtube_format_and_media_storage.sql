alter table public.social_campaigns
  add column if not exists youtube_format text not null default 'video';

update public.social_campaigns
set youtube_format = 'video'
where youtube_format is null or youtube_format not in ('video', 'short');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'social_campaigns_youtube_format_check'
      and conrelid = 'public.social_campaigns'::regclass
  ) then
    alter table public.social_campaigns
      add constraint social_campaigns_youtube_format_check
      check (youtube_format in ('video', 'short'));
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('social-videos', 'social-videos', true, 52428800, array['video/mp4']::text[]),
  ('social-audio', 'social-audio', true, 20971520, array['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','audio/aac','audio/ogg']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
