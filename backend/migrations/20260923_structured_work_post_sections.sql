-- Structured field storage for portfolio Work Posts.
-- The live database migration was applied on 2026-09-23.
alter table public.work_posts
add column if not exists sections jsonb not null default '{}'::jsonb;
