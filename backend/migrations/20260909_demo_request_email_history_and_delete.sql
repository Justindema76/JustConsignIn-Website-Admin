-- Demo Request communication history and permanent delete support.
-- Email bodies are stored so Website Admin keeps a record of what was sent.

create table if not exists public.demo_request_emails (
  id uuid primary key default gen_random_uuid(),
  demo_request_id uuid not null references public.demo_requests(id) on delete cascade,
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
  created_by uuid
);

create index if not exists demo_request_emails_request_created_idx
  on public.demo_request_emails (demo_request_id, created_at desc);

alter table public.demo_request_emails enable row level security;
revoke all on public.demo_request_emails from anon, authenticated;
grant select on public.demo_request_emails to authenticated;

-- Owner-only history access. Public users never read outgoing email history.
drop policy if exists website_owner_can_read_demo_request_emails on public.demo_request_emails;
create policy website_owner_can_read_demo_request_emails
  on public.demo_request_emails
  for select
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'justindema76@gmail.com');

-- Permanent delete is owner-only. Child email history is removed by ON DELETE CASCADE.
grant delete on public.demo_requests to authenticated;
drop policy if exists website_owner_can_delete_demo_requests on public.demo_requests;
create policy website_owner_can_delete_demo_requests
  on public.demo_requests
  for delete
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'justindema76@gmail.com');
