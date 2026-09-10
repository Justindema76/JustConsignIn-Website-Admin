-- Demo Requests must remain publicly insertable while the authenticated website owner
-- can read and update leads through the private Website Admin.
revoke all on table public.demo_requests from anon, authenticated;

grant insert on table public.demo_requests to anon, authenticated;
grant select, update on table public.demo_requests to authenticated;
