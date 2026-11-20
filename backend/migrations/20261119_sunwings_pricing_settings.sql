-- Sunwings price calculator settings (Admin › Price calculator): Marius's rates, crew pay,
-- minimums, contribution targets and commission rule. Kept in sunwings_integrations (owner and
-- approved collaborators only, never public) as provider 'pricing', config jsonb.
alter table public.sunwings_integrations drop constraint if exists sunwings_integrations_provider_check;
alter table public.sunwings_integrations
  add constraint sunwings_integrations_provider_check check (provider in ('google_reviews', 'facebook', 'pricing'));
