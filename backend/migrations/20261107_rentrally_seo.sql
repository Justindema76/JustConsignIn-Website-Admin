-- Rent & Rally: per-item SEO title and description (Next.js website).
-- Blank means "let the website write one". Only adds columns to the rentrally_* tables.
-- Safe to re-run.

alter table public.rentrally_products   add column if not exists seo_title text not null default '';
alter table public.rentrally_products   add column if not exists seo_description text not null default '';
alter table public.rentrally_packages   add column if not exists seo_title text not null default '';
alter table public.rentrally_packages   add column if not exists seo_description text not null default '';
alter table public.rentrally_categories add column if not exists seo_title text not null default '';
alter table public.rentrally_categories add column if not exists seo_description text not null default '';
