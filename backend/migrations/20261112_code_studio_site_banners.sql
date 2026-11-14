-- Banner Studio (Code Studio inside the JustInnovate admin).
-- Reuses the standalone Code Studio table, so the same banners show in both places.
--   site_key    which website the banner belongs to (e.g. 'sunwings'); null = standalone only
--   placements  where the website shows it, e.g. {home} or {contact,pricing}; empty = nowhere
--   html_*      the finished embed code saved by the editor, per language
alter table public.code_studio_banners
  add column if not exists site_key text,
  add column if not exists placements text[] not null default '{}',
  add column if not exists html_en text,
  add column if not exists html_fr text,
  add column if not exists html_us text;

create index if not exists code_studio_banners_site_idx
  on public.code_studio_banners (site_key, updated_at desc) where site_key is not null;

-- Public websites may read only the finished HTML of banners placed on one of their pages.
-- The slides JSON, title and owner stay private.
grant select (id, site_key, placements, html_en, html_fr, html_us, updated_at)
  on public.code_studio_banners to anon;

drop policy if exists "Websites read placed banners" on public.code_studio_banners;
create policy "Websites read placed banners" on public.code_studio_banners
  for select to anon
  using (site_key is not null and cardinality(placements) > 0);
