# Website Admin Settings

This feature is the reusable home for site-level configuration that should be editable without changing source code.

## Structure

- `SettingsAdmin.jsx` — settings page shell and future settings navigation.
- `settings.css` — settings-specific responsive styles.
- `email/EmailSettingsForm.jsx` — SMTP configuration UI.
- `email/emailSettings.service.js` — browser-to-admin API client.
- `/api/admin/email-settings.js` — owner-protected settings API and test-email proxy.
- `backend/migrations/20260909_email_settings_vault.sql` — protected settings table, Vault-backed SMTP password, and notification metadata.

## Security

SMTP passwords are written to Supabase Vault. The browser never receives the stored password; it only receives a `has_password` flag. The public website cannot read the email settings table.

## Template reuse

For another website, keep the feature and change the saved values from the Settings screen. Site-specific SMTP credentials should not be committed to Git or hard-coded into Vercel environment configuration.

Future settings such as SEO, analytics, integrations, or branding can be added as sibling modules under this `settings/` feature.
