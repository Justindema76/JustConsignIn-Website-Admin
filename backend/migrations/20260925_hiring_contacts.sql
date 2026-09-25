-- Hiring / interview contact intake for justindematteis.com.
create table if not exists public.hiring_contacts (
  id uuid primary key default gen_random_uuid(),
  site_key text not null default 'justindematteis' check (site_key = 'justindematteis'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  company text not null,
  email text not null,
  phone text not null default '',
  website_or_linkedin text not null default '',
  reason text not null check (reason in ('interview','job_opportunity','recruiter','other_employment')),
  role_title text not null default '',
  message text not null,
  employment_consent boolean not null default false,
  status text not null default 'new' check (status in ('new','reviewing','contacted','interview','closed','spam')),
  spam_score integer not null default 0,
  spam_reasons text[] not null default '{}'::text[],
  is_spam boolean not null default false,
  source_path text not null default '',
  referrer text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  utm_content text not null default '',
  utm_term text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  admin_notes text,
  contacted_at timestamptz,
  email_notification_attempted_at timestamptz,
  email_notified_at timestamptz,
  email_notification_error text
);

create index if not exists hiring_contacts_created_idx on public.hiring_contacts(created_at desc);
create index if not exists hiring_contacts_status_created_idx on public.hiring_contacts(status, created_at desc);
create index if not exists hiring_contacts_email_created_idx on public.hiring_contacts(lower(email), created_at desc);

alter table public.hiring_contacts enable row level security;

drop policy if exists website_owner_can_read_hiring_contacts on public.hiring_contacts;
create policy website_owner_can_read_hiring_contacts
on public.hiring_contacts for select to authenticated
using (site_key='justindematteis' and lower(coalesce(auth.jwt()->>'email',''))='justindema76@gmail.com');

drop policy if exists website_owner_can_update_hiring_contacts on public.hiring_contacts;
create policy website_owner_can_update_hiring_contacts
on public.hiring_contacts for update to authenticated
using (site_key='justindematteis' and lower(coalesce(auth.jwt()->>'email',''))='justindema76@gmail.com')
with check (site_key='justindematteis' and lower(coalesce(auth.jwt()->>'email',''))='justindema76@gmail.com');

drop policy if exists website_owner_can_delete_hiring_contacts on public.hiring_contacts;
create policy website_owner_can_delete_hiring_contacts
on public.hiring_contacts for delete to authenticated
using (site_key='justindematteis' and lower(coalesce(auth.jwt()->>'email',''))='justindema76@gmail.com');

revoke all on table public.hiring_contacts from anon;
grant select, update, delete on table public.hiring_contacts to authenticated;
grant select, insert, update, delete on table public.hiring_contacts to service_role;
