# Website Admin Settings

This feature is the reusable home for site-level configuration that should be editable without changing source code.

## Structure

- `SettingsAdmin.jsx` — settings page shell and future settings navigation.
- `settings.css` — settings-specific responsive styles.
- `email/EmailSettingsForm.jsx` — SMTP configuration and notification-routing UI.
- `email/emailSettings.service.js` — browser-to-admin API client.
- `/api/admin/email-settings.js` — owner-protected settings API and test-email proxy.
- `backend/migrations/20260909_email_settings_vault.sql` — protected settings table and Vault-backed SMTP password.
- `backend/migrations/20260909_email_notification_routing.sql` — reusable To / CC / BCC routing by website event.
- `supabase/functions/send-site-email/index.ts` — server-side delivery function used by website forms.

## Security

SMTP passwords are written to Supabase Vault. The browser never receives the stored password; it only receives a `has_password` flag. The public website cannot read the email settings table.

## Notification routing

Email recipients are stored as routes instead of hard-coded addresses. Each route has:

- `eventKey` — what website event it receives, such as `demo_request`, `contact`, or `all`.
- `recipientType` — `to`, `cc`, or `bcc`.
- `email` — recipient address.
- `enabled` — whether the route is active.

At least one active `demo_request` `to` route is required while the Request a Free Demo feature is enabled. Additional website forms can reuse the same routing structure by adding their event key to the Settings UI and mail function.

## Template reuse

For another website, keep the feature and change the saved values from the Settings screen. Site-specific SMTP credentials and recipients should not be committed to Git or hard-coded into Vercel environment configuration.

Future settings such as SEO, analytics, integrations, or branding can be added as sibling modules under this `settings/` feature.
