-- Allow only the verified Website Admin owner account to read and manage demo requests.
-- Public visitors retain INSERT-only access through the existing form policy.

create policy "website_owner_can_read_demo_requests"
on public.demo_requests
for select
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'justindema76@gmail.com');

create policy "website_owner_can_update_demo_requests"
on public.demo_requests
for update
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'justindema76@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'justindema76@gmail.com');
