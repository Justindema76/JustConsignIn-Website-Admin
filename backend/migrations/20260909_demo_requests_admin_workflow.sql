alter table public.demo_requests add column if not exists admin_notes text;
alter table public.demo_requests add column if not exists updated_at timestamptz not null default now();
alter table public.demo_requests add column if not exists contacted_at timestamptz;
alter table public.demo_requests add column if not exists scheduled_at timestamptz;

alter table public.demo_requests drop constraint if exists demo_requests_status_check;
alter table public.demo_requests add constraint demo_requests_status_check
  check (status in ('new','contacted','scheduled','completed','archived'));

create or replace function public.set_demo_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.status = 'contacted' and old.status is distinct from 'contacted' and new.contacted_at is null then
    new.contacted_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists demo_requests_set_updated_at on public.demo_requests;
create trigger demo_requests_set_updated_at
before update on public.demo_requests
for each row execute function public.set_demo_requests_updated_at();
