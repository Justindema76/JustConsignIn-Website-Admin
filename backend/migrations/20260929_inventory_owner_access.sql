drop policy if exists "website owner manages resale deals" on public.resale_deals;
create policy "website owner manages resale deals"
on public.resale_deals
for all
to authenticated
using (
  (auth.jwt() ->> 'email') = 'justindema76@gmail.com'
  and coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
)
with check (
  (auth.jwt() ->> 'email') = 'justindema76@gmail.com'
  and coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
);

drop policy if exists "website owner manages buyer leads" on public.buyer_leads;
create policy "website owner manages buyer leads"
on public.buyer_leads
for all
to authenticated
using (
  (auth.jwt() ->> 'email') = 'justindema76@gmail.com'
  and coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
)
with check (
  (auth.jwt() ->> 'email') = 'justindema76@gmail.com'
  and coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
);
