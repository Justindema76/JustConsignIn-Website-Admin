-- The original sunwings_quote_requests table only allowed four statuses
-- (new, contacted, quoted, closed). The admin workflow uses more, so saving
-- any status after "contacted" failed. Allow every status the admin offers,
-- and keep the two legacy values so existing rows stay valid.

begin;

alter table public.sunwings_quote_requests
  drop constraint if exists sunwings_quote_requests_status_check;

alter table public.sunwings_quote_requests
  add constraint sunwings_quote_requests_status_check
  check (status in (
    'new','reviewing','needs_quote','contacted','quote_sent',
    'accepted','booked','complete','declined','cancelled',
    'quoted','closed'
  ));

commit;
