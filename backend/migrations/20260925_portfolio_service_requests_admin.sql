-- Portfolio service-request admin support.
-- Additive only: does not change demo requests, beta applications, or existing email history.

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
  cc_emails jsonb not null default '[]'::jsonb,
  bcc_emails jsonb not null default '[]'::jsonb,
  from_email text,
  subject text not null,
  body_text text not null,
  delivery_status text not null default 'sent' check (delivery_status in ('sent','failed')),
  delivery_error text,
  provider_message_id text,
  created_by uuid references auth.users(id)
);

create index if not exists service_request_emails_request_created_idx
  on public.service_request_emails(service_request_id, created_at desc);

alter table public.service_request_emails enable row level security;

revoke all on table public.service_request_emails from anon, authenticated;
