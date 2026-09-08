create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  seo_title text not null default '',
  seo_description text not null default '',
  category text not null default 'Shopify Consignment',
  tags text[] not null default '{}',
  featured_image text not null default '',
  body text not null default '',
  status text not null default 'draft' check (status in ('draft','published')),
  author_name text not null default 'JustConsignIn',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_status_published_idx
  on public.blog_posts(status, published_at desc);

create index if not exists blog_posts_category_idx
  on public.blog_posts(category);

alter table public.blog_posts enable row level security;

drop policy if exists "public reads published blog posts" on public.blog_posts;
create policy "public reads published blog posts"
  on public.blog_posts
  for select
  to anon, authenticated
  using (status = 'published');

create or replace function public.set_blog_post_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  if new.status = 'draft' then
    new.published_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
before insert or update on public.blog_posts
for each row execute function public.set_blog_post_updated_at();
