-- Department-only assignment workflow for service requests.
create table if not exists public.agency_departments (
  id uuid primary key default gen_random_uuid(),
  site_key text not null default 'justindematteis' references public.sites(site_key) on delete cascade,
  name text not null,
  email text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists agency_departments_site_name_unique
  on public.agency_departments(site_key, lower(name));

alter table public.agency_departments enable row level security;

drop policy if exists website_owner_can_read_agency_departments on public.agency_departments;
create policy website_owner_can_read_agency_departments on public.agency_departments
for select to authenticated
using (site_key='justindematteis' and lower(coalesce(auth.jwt()->>'email',''))='justindema76@gmail.com');

drop policy if exists website_owner_can_insert_agency_departments on public.agency_departments;
create policy website_owner_can_insert_agency_departments on public.agency_departments
for insert to authenticated
with check (site_key='justindematteis' and lower(coalesce(auth.jwt()->>'email',''))='justindema76@gmail.com');

drop policy if exists website_owner_can_update_agency_departments on public.agency_departments;
create policy website_owner_can_update_agency_departments on public.agency_departments
for update to authenticated
using (site_key='justindematteis' and lower(coalesce(auth.jwt()->>'email',''))='justindema76@gmail.com')
with check (site_key='justindematteis' and lower(coalesce(auth.jwt()->>'email',''))='justindema76@gmail.com');

drop policy if exists website_owner_can_delete_agency_departments on public.agency_departments;
create policy website_owner_can_delete_agency_departments on public.agency_departments
for delete to authenticated
using (site_key='justindematteis' and lower(coalesce(auth.jwt()->>'email',''))='justindema76@gmail.com');

revoke all on table public.agency_departments from anon;
grant select, insert, update, delete on table public.agency_departments to authenticated;
grant select, insert, update, delete on table public.agency_departments to service_role;

alter table public.service_requests
  add column if not exists assigned_department_id uuid references public.agency_departments(id) on delete set null,
  add column if not exists assigned_department_name text not null default '',
  add column if not exists assigned_department_email text not null default '',
  add column if not exists assigned_at timestamptz,
  add column if not exists quote_requested_at timestamptz,
  add column if not exists assignment_email_sent_at timestamptz,
  add column if not exists assignment_email_error text;

alter table public.service_requests drop constraint if exists service_requests_status_check;
alter table public.service_requests add constraint service_requests_status_check
check (status = any (array[
  'new'::text,'reviewing'::text,'needs_quote'::text,'contacted'::text,'discovery'::text,
  'proposal_sent'::text,'accepted'::text,'in_progress'::text,'complete'::text,'declined'::text,'spam'::text
]));

insert into public.agency_departments(site_key,name,email,active,sort_order)
values
  ('justindematteis','Development','justin@justindematteis.com',true,10),
  ('justindematteis','Ecommerce','justin@justindematteis.com',true,20),
  ('justindematteis','AI / Automation','justin@justindematteis.com',true,30),
  ('justindematteis','SEO / Digital','justin@justindematteis.com',true,40),
  ('justindematteis','Management / Review','justin@justindematteis.com',true,50)
on conflict (site_key, lower(name)) do nothing;
