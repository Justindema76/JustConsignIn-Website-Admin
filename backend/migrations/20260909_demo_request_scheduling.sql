-- Reusable scheduling metadata for Demo Requests.
-- scheduled_at already exists; these fields describe the appointment and power calendar invites.

alter table public.demo_requests
  add column if not exists scheduled_duration_minutes integer not null default 30,
  add column if not exists scheduled_timezone text not null default 'America/Toronto',
  add column if not exists scheduled_location text,
  add column if not exists scheduled_notes text;

alter table public.demo_requests
  drop constraint if exists demo_requests_scheduled_duration_minutes_check;

alter table public.demo_requests
  add constraint demo_requests_scheduled_duration_minutes_check
  check (scheduled_duration_minutes between 15 and 240);
