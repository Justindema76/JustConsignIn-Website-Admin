# JustConsignIn Website Admin

Standalone owner-only administration application for managing blog posts, YouTube videos, social links, and media published on https://www.justconsignin.com.

## Security

- Google sign-in is restricted server-side to the verified owner email.
- Never commit .env.local or any Supabase secret key.
- Protect the entire Vercel project with Vercel Authentication.
