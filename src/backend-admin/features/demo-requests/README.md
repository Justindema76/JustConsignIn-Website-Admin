# Demo Requests admin feature

This feature is the private-admin counterpart to the public website `demo-request` feature.

## Owns
- Demo request inbox/list UI
- Search and status filtering
- Lead detail view
- In-admin email composer
- Sent/failed email history attached to each lead
- Workflow status, scheduled time, and admin notes
- Permanent delete with confirmation
- Calls to `/api/admin/demo-requests` and `/api/admin/demo-request-emails`

## Communication flow

1. Open a demo request.
2. Choose **Email Customer**.
3. The To address is filled from the lead automatically.
4. Write the subject and message. Optional CC/BCC addresses can be added.
5. The server sends through **Settings → Email** using the configured SMTP account.
6. A copy of the outgoing message is stored in `demo_request_emails` and shown under Email history.
7. A New lead becomes Contacted after a successful send.

The email history is attached to the demo request record; it is not a file attachment. If the request is permanently deleted, its communication history is deleted with it.

## Structure

- `DemoRequestsAdmin.jsx` — inbox, lead details, workflow and feature composition.
- `components/DemoRequestEmailComposer.jsx` — in-admin email form.
- `components/DemoRequestEmailHistory.jsx` — communication history.
- `demoRequests.service.js` — browser-to-admin API client.
- `/api/admin/demo-requests.js` — owner-protected request CRUD.
- `/api/admin/demo-request-emails.js` — owner-protected email history and send proxy.
- `supabase/functions/send-site-email/index.ts` — shared SMTP delivery worker.
- `backend/migrations/20260909_demo_request_email_history_and_delete.sql` — communication history and delete permissions.

## Does not own
- Public form rendering
- Public form validation/submission
- SMTP credentials; those belong to **Settings → Email**
- Supabase credentials or owner authentication

Keep future demo-request admin work in this folder. Shared authentication, API infrastructure and site-level email configuration stay in their existing reusable modules.
