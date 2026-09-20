-- Fix PostgREST privileges for the visual website page builder.
-- RLS policies still control which authenticated user may read/write these rows.

grant select, insert, update, delete
on table public.site_page_drafts
to authenticated;

grant select, insert, update, delete
on table public.site_pages
to authenticated;

grant select
on table public.site_pages
to anon;

grant select, insert, delete
on table public.site_page_versions
to authenticated;

revoke all
on table public.site_page_drafts
from anon;

revoke all
on table public.site_page_versions
from anon;

revoke insert, update, delete
on table public.site_pages
from anon;
