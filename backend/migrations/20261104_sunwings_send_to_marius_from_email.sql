-- "Send to Marius" button inside the new-quote email.
-- The email link carries the quote id + that quote's private notification_token (never shown
-- to the customer). These two functions only work with that exact pair, so the public
-- confirm page can read one job and mark it sent without any login. Safe to run again.

begin;

-- Read the job for the confirm page / Make payload.
create or replace function public.sunwings_job_by_token(p_id uuid, p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(q) - 'notification_token' - 'admin_notes' - 'ip_hash'
  from public.sunwings_quote_requests q
  where q.id = p_id and q.notification_token = p_token and q.site_key = 'sunwings';
$$;

-- Mark the job as sent to Marius (only once). Returns false if it was already sent.
create or replace function public.sunwings_mark_sent_by_token(p_id uuid, p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sunwings_quote_requests q
  set forwarded_at = now(),
      status = case when q.status in ('new','reviewing','needs_quote','contacted') then 'forwarded' else q.status end,
      status_changed_at = case when q.status in ('new','reviewing','needs_quote','contacted') then now() else q.status_changed_at end,
      last_activity = 'Sent to Marius (from the quote email)',
      last_activity_at = now(),
      updated_at = now()
  where q.id = p_id and q.notification_token = p_token and q.site_key = 'sunwings' and q.forwarded_at is null;
  return found;
end;
$$;

revoke all on function public.sunwings_job_by_token(uuid, uuid) from public;
revoke all on function public.sunwings_mark_sent_by_token(uuid, uuid) from public;
grant execute on function public.sunwings_job_by_token(uuid, uuid) to anon, authenticated;
grant execute on function public.sunwings_mark_sent_by_token(uuid, uuid) to anon, authenticated;

commit;

notify pgrst, 'reload schema';

select case when count(*) = 2 then '✅ Send-to-Marius email button ready' else '❌ Only ' || count(*) || ' of 2 functions' end as result
from pg_proc where pronamespace = 'public'::regnamespace and proname in ('sunwings_job_by_token', 'sunwings_mark_sent_by_token');
