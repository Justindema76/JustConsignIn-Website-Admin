-- Restore server-side service role access required by the shared Supabase Edge Function.
grant select, insert, update, delete on table public.service_requests to service_role;
grant select, insert, update, delete on table public.service_request_emails to service_role;
