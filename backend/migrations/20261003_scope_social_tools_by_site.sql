-- Scope reusable social publishing data by website so each client site has isolated campaigns
-- and its own Metricool connection.

begin;

alter table public.social_campaigns
  add column if not exists site_key text not null default 'justconsignin';

alter table public.social_integrations
  add column if not exists site_key text not null default 'justconsignin';

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='sites'
  ) and not exists (
    select 1 from pg_constraint
    where conname='social_campaigns_site_key_fkey'
  ) then
    alter table public.social_campaigns
      add constraint social_campaigns_site_key_fkey
      foreign key (site_key) references public.sites(site_key);
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='sites'
  ) and not exists (
    select 1 from pg_constraint
    where conname='social_integrations_site_key_fkey'
  ) then
    alter table public.social_integrations
      add constraint social_integrations_site_key_fkey
      foreign key (site_key) references public.sites(site_key);
  end if;
end $$;

create index if not exists social_campaigns_site_created_idx
  on public.social_campaigns(site_key, created_at desc);

alter table public.social_integrations drop constraint if exists social_integrations_pkey;
alter table public.social_integrations
  add constraint social_integrations_pkey primary key (site_key, provider);

commit;
