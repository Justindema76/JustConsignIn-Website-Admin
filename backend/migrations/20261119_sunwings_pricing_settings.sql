-- Sunwings price calculator settings (Admin › Price calculator): Marius's rates, crew pay,
-- minimums, contribution targets and commission rule. Kept in sunwings_integrations (owner and
-- approved collaborators only, never public) as provider 'pricing', config jsonb.
-- Safe to run more than once.
begin;
alter table public.sunwings_integrations drop constraint if exists sunwings_integrations_provider_check;
alter table public.sunwings_integrations
  add constraint sunwings_integrations_provider_check check (provider in ('google_reviews', 'facebook', 'pricing'));
commit;

select case
  when exists (
    select 1 from pg_constraint
    where conname = 'sunwings_integrations_provider_check'
      and pg_get_constraintdef(oid) like '%pricing%'
  ) then '✅ Price calculator storage ready'
  else '❌ Price calculator storage NOT ready'
end as result;
