-- Add private Website Admin workflow and email history for Justin DeMatteis service requests.
-- Public submissions continue through the portfolio API; only the verified owner can read/manage requests.

alter table public.service_requests
  add column if not exists notification_token uuid not null default gen_random_uuid(),
  add column if not exists email_notification_attempted_at timestamptz,
  add column if not exists email_notified_at timestamptz,
  add column if not exists email_notification_error text;

create table if not exists public.service_request_emails (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  to_email text not null,
  cc_emails text[] not null default '{}',
  bcc_emails text[] not null default '{}',
  from_email text,
  subject text not null,
  body_text text not null default '',
  delivery_status text not null default 'sent' check (delivery_status in ('sent','failed')),
  delivery_error text,
  provider_message_id text,
  created_by uuid references auth.users(id)
);

alter table public.service_request_emails enable row level security;

drop policy if exists "website_owner_can_read_service_requests" on public.service_requests;
create policy "website_owner_can_read_service_requests"
on public.service_requests
for select
to authenticated
using (
  site_key = 'justindematteis'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'justindema76@gmail.com'
);

drop policy if exists "website_owner_can_update_service_requests" on public.service_requests;
create policy "website_owner_can_update_service_requests"
on public.service_requests
for update
to authenticated
using (
  site_key = 'justindematteis'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'justindema76@gmail.com'
)
with check (
  site_key = 'justindematteis'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'justindema76@gmail.com'
);

drop policy if exists "website_owner_can_delete_service_requests" on public.service_requests;
create policy "website_owner_can_delete_service_requests"
on public.service_requests
for delete
to authenticated
using (
  site_key = 'justindematteis'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'justindema76@gmail.com'
);

drop policy if exists "website_owner_can_read_service_request_emails" on public.service_request_emails;
create policy "website_owner_can_read_service_request_emails"
on public.service_request_emails
for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'justindema76@gmail.com'
  and exists (
    select 1
    from public.service_requests r
    where r.id = service_request_id
      and r.site_key = 'justindematteis'
  )
);

revoke all on table public.service_requests from anon, authenticated;
grant select, update, delete on table public.service_requests to authenticated;

revoke all on table public.service_request_emails from anon, authenticated;
grant select on table public.service_request_emails to authenticated;

create index if not exists service_request_emails_request_created_idx
  on public.service_request_emails(service_request_id, created_at desc);
