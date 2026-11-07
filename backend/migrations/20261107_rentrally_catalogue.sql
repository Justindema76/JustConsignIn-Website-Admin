-- Rent & Rally (placeholder name): event and promo equipment rentals.
-- Adds the site to the admin switcher and creates its catalogue + quote tables.
--
-- Public website (anon key) can:   read published categories, rentals, packages and settings;
--                                  create a quote request (status must be 'new').
-- Owner (Google login) and anyone in site_collaborators for 'rentrally' can manage everything.
--
-- Safe to re-run: every statement is "if not exists" / "drop policy if exists" / upsert.

insert into public.sites (site_key, name, domain, admin_label, is_active)
values ('rentrally', 'Rent & Rally', 'rent-and-rally.vercel.app', 'Rent & Rally', true)
on conflict (site_key) do update set
  name = excluded.name,
  domain = excluded.domain,
  admin_label = excluded.admin_label,
  is_active = excluded.is_active,
  updated_at = now();

-- ===== tables =====

create table if not exists public.rentrally_categories (
  id uuid primary key default gen_random_uuid(),
  site_key text not null references public.sites(site_key) on delete cascade default 'rentrally',
  slug text not null,
  name text not null,
  blurb text not null default '',
  image text not null default '',
  status text not null default 'published' check (status in ('draft','published')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_key, slug)
);

create table if not exists public.rentrally_products (
  id uuid primary key default gen_random_uuid(),
  site_key text not null references public.sites(site_key) on delete cascade default 'rentrally',
  slug text not null,                                   -- used in the URL: #/item/<slug>
  category_slug text not null default '',
  sku text not null default '',
  name text not null,
  images text[] not null default '{}',                  -- first image is the main photo
  day_rate numeric(10,2) not null default 0,
  buy_price numeric(10,2),                              -- "Prefer to own it?" price, optional
  buy_note text not null default '',
  buy_url text not null default '',
  badge text not null default '',
  description text[] not null default '{}',             -- one entry per paragraph
  features text[] not null default '{}',
  specs jsonb not null default '[]'::jsonb,             -- [{ "label": "Height", "value": "20 ft" }]
  options jsonb not null default '[]'::jsonb,           -- [{ "label": "Colour", "values": [{ "v": "Red", "img": 4 }] }]
  related text[] not null default '{}',                 -- other product slugs
  featured boolean not null default false,              -- shown under "Popular Rentals"
  status text not null default 'draft' check (status in ('draft','published')),
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_key, slug)
);

create table if not exists public.rentrally_packages (
  id uuid primary key default gen_random_uuid(),
  site_key text not null references public.sites(site_key) on delete cascade default 'rentrally',
  slug text not null,
  tag text not null default '',
  name text not null,
  hero_image text not null default '',
  day_rate numeric(10,2) not null default 0,
  items jsonb not null default '[]'::jsonb,             -- [{ "product": "tubeman", "qty": 2 }]
  description text not null default '',
  good_for text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','published')),
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_key, slug)
);

create table if not exists public.rentrally_site_settings (
  site_key text not null references public.sites(site_key) on delete cascade default 'rentrally',
  key text not null,
  value text not null default '',
  updated_at timestamptz not null default now(),
  primary key (site_key, key)
);

create table if not exists public.rentrally_quote_requests (
  id uuid primary key default gen_random_uuid(),
  site_key text not null references public.sites(site_key) on delete cascade default 'rentrally',
  name text not null,
  business text not null default '',
  phone text not null,
  email text not null default '',
  area text not null default '',
  notes text not null default '',
  lines jsonb not null default '[]'::jsonb,             -- what was in the customer's quote cart
  estimated_total numeric(10,2) not null default 0,
  status text not null default 'new'
    check (status in ('new','contacted','quoted','booked','completed','declined','cancelled')),
  quote_amount numeric(10,2),
  admin_notes text not null default '',
  notification_token uuid not null default gen_random_uuid(),
  email_notified_at timestamptz,
  email_notification_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rentrally_products_status_sort_idx on public.rentrally_products (site_key, status, sort_order);
create index if not exists rentrally_packages_status_sort_idx on public.rentrally_packages (site_key, status, sort_order);
create index if not exists rentrally_quotes_status_idx on public.rentrally_quote_requests (site_key, status, created_at desc);

-- ===== row level security =====

alter table public.rentrally_categories enable row level security;
alter table public.rentrally_products enable row level security;
alter table public.rentrally_packages enable row level security;
alter table public.rentrally_site_settings enable row level security;
alter table public.rentrally_quote_requests enable row level security;

-- public website reads
drop policy if exists "public reads published rentrally categories" on public.rentrally_categories;
create policy "public reads published rentrally categories" on public.rentrally_categories
for select to anon, authenticated using (site_key = 'rentrally' and status = 'published');

drop policy if exists "public reads published rentrally products" on public.rentrally_products;
create policy "public reads published rentrally products" on public.rentrally_products
for select to anon, authenticated using (site_key = 'rentrally' and status = 'published');

drop policy if exists "public reads published rentrally packages" on public.rentrally_packages;
create policy "public reads published rentrally packages" on public.rentrally_packages
for select to anon, authenticated using (site_key = 'rentrally' and status = 'published');

drop policy if exists "public reads rentrally settings" on public.rentrally_site_settings;
create policy "public reads rentrally settings" on public.rentrally_site_settings
for select to anon, authenticated using (site_key = 'rentrally');

-- public website writes: new quote requests only, nothing else
drop policy if exists "public creates rentrally quote requests" on public.rentrally_quote_requests;
create policy "public creates rentrally quote requests" on public.rentrally_quote_requests
for insert to anon, authenticated
with check (site_key = 'rentrally' and status = 'new' and quote_amount is null and admin_notes = '' and email_notified_at is null);

-- owner + Rent & Rally collaborators manage everything
do $$
declare t text;
begin
  foreach t in array array['rentrally_categories','rentrally_products','rentrally_packages','rentrally_site_settings','rentrally_quote_requests'] loop
    execute format('drop policy if exists "owner and team manage %1$s" on public.%1$I', t);
    execute format($p$
      create policy "owner and team manage %1$s" on public.%1$I for all to authenticated
      using (
        ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
        or exists (select 1 from public.site_collaborators sc where sc.site_key = %1$I.site_key and sc.email = (select auth.jwt()->>'email'))
      )
      with check (
        ((select auth.jwt()->>'email') = 'justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider') = 'google')
        or exists (select 1 from public.site_collaborators sc where sc.site_key = %1$I.site_key and sc.email = (select auth.jwt()->>'email'))
      )$p$, t);
  end loop;
end $$;

grant select on public.rentrally_categories, public.rentrally_products, public.rentrally_packages, public.rentrally_site_settings to anon;
grant insert on public.rentrally_quote_requests to anon;
grant select, insert, update, delete on
  public.rentrally_categories, public.rentrally_products, public.rentrally_packages,
  public.rentrally_site_settings, public.rentrally_quote_requests
to authenticated;
-- the send-site-email function reads/updates quotes with the service role (for email alerts)
grant select, update on public.rentrally_quote_requests to service_role;

-- keep updated_at current on every edit
create or replace function public.set_rentrally_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['rentrally_categories','rentrally_products','rentrally_packages','rentrally_quote_requests'] loop
    execute format('drop trigger if exists %1$s_updated_at on public.%1$I', t);
    execute format('create trigger %1$s_updated_at before update on public.%1$I for each row execute function public.set_rentrally_updated_at()', t);
  end loop;
end $$;
