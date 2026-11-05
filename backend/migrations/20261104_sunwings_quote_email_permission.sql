-- Fix: new Sunwings quote emails never sent.
-- The send-site-email function reads/updates the quote with the service_role key, but that
-- role had no table permission ("permission denied for table sunwings_quote_requests").
grant select, update on public.sunwings_quote_requests to service_role;
