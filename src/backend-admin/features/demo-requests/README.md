# Demo Requests admin feature

This feature is the private-admin counterpart to the public website `demo-request` feature.

## Owns
- Demo request inbox/list UI
- Search and status filtering
- Lead detail view
- Contact shortcuts
- Workflow status, scheduled time, and admin notes
- Calls to `/api/admin/demo-requests`

## Does not own
- Public form rendering
- Public form validation/submission
- Supabase credentials or owner authentication

Keep future demo-request admin work in this folder. Shared authentication and API infrastructure stay in the existing `auth/` and `services/` folders.
