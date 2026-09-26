alter table public.service_request_emails
  add column if not exists attachments jsonb not null default '[]'::jsonb;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'service-request-attachments',
  'service-request-attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/zip'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "service_request_attachments_owner_select" on storage.objects;
drop policy if exists "service_request_attachments_owner_insert" on storage.objects;
drop policy if exists "service_request_attachments_owner_update" on storage.objects;
drop policy if exists "service_request_attachments_owner_delete" on storage.objects;

create policy "service_request_attachments_owner_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'service-request-attachments'
  and lower(coalesce(auth.jwt()->>'email','')) = 'justindema76@gmail.com'
);

create policy "service_request_attachments_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'service-request-attachments'
  and lower(coalesce(auth.jwt()->>'email','')) = 'justindema76@gmail.com'
);

create policy "service_request_attachments_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'service-request-attachments'
  and lower(coalesce(auth.jwt()->>'email','')) = 'justindema76@gmail.com'
)
with check (
  bucket_id = 'service-request-attachments'
  and lower(coalesce(auth.jwt()->>'email','')) = 'justindema76@gmail.com'
);

create policy "service_request_attachments_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'service-request-attachments'
  and lower(coalesce(auth.jwt()->>'email','')) = 'justindema76@gmail.com'
);
