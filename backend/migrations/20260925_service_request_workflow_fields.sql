alter table public.service_requests
  add column if not exists status_changed_at timestamptz,
  add column if not exists quote_number text,
  add column if not exists quote_amount numeric(12,2),
  add column if not exists last_activity text,
  add column if not exists last_activity_at timestamptz,
  add column if not exists next_action text,
  add column if not exists next_action_due_at timestamptz;

update public.service_requests
set status_changed_at = coalesce(status_changed_at, updated_at, created_at),
    last_activity = coalesce(
      last_activity,
      case
        when status = 'proposal_sent' then 'Proposal sent'
        when status = 'accepted' then 'Quote accepted'
        when assigned_department_name is not null then 'Assigned to ' || assigned_department_name
        else 'Request submitted'
      end
    ),
    last_activity_at = coalesce(last_activity_at, assigned_at, updated_at, created_at)
where site_key='justindematteis';
