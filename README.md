# Website Admin (Just Innovate Admin)

**One private admin app that runs three of my websites.** It's a custom content management system and lead-tracking back office I built instead of using WordPress. Pages, blog posts, media, social posts, form submissions and team access for each site are all managed here.

| Website | Live site | Front-end repo |
|---|---|---|
| **JustConsignIn**: marketing site for my Shopify consignment app | https://www.justconsignin.com | [JustConsignIn-Application](https://github.com/Justindema76/JustConsignIn-Application) |
| **Justin DeMatteis / Just Innovate**: my portfolio | https://www.justindematteis.com | [Justin-DeMatteis-Main-Site](https://github.com/Justindema76/Justin-DeMatteis-Main-Site) |
| **Sunwings Transport**: moving, delivery and junk removal (client) | sunwingstransport.ca | [sunwingstransport](https://github.com/Justindema76/sunwingstransport) |

All three front ends read their published content from the same **Supabase** database. This admin is where that content is written.

```text
                 Website Admin (this repo)
                          │  writes
                          ▼
                 Supabase (database + storage)
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
   justconsignin.com  justindematteis.com  Sunwings site
```

---

## How it works

- **Site switcher:** after sign-in you choose a site. Each site has its own menu, features and data (`src/backend-admin/sites/<site>/config.js`), and a site only sees the features it actually uses.
- **Sign-in:** Google sign-in through Supabase Auth, checked on the server. The owner can see everything; collaborators (for example the Sunwings team) see only their own site.
- **Security:** database access is controlled by Supabase row-level security (RLS) policies, not a shared secret key, and the whole Vercel project is behind Vercel Authentication.

## Features

### Shared by every site
| Feature | What it does |
|---|---|
| **Dashboard** | Greeting, live clock, and quick-access cards for that site's modules |
| **Page builder** | Visual drag-and-drop page editor (built on Puck) with a live desktop / tablet / phone preview. Pages are published straight to the live site. |
| **Block library** | Reusable content blocks shared between pages |
| **Global Styles** | Site-wide fonts (with a real font picker), brand colours and button styles |
| **Global header and footer editor** | Logo, navigation, social icons and favicon, with a preview that matches the live site |
| **Blog** | Write and publish posts with SEO fields |
| **Media library** | Upload once and reuse images and video everywhere |
| **Social links** | The social icons shown on the site |
| **Social automation** | Plan and schedule social posts through **Metricool**, with AI-written captions and video transcription (OpenAI) |
| **Email settings** | Who gets notified for each form, set per website |

### JustConsignIn
| Feature | What it does |
|---|---|
| **Demo Requests** | Every "Request a Free Demo" lead: status workflow, email the lead from inside the admin (with history), and schedule the demo |
| **Beta Partners** | Review beta partner applications |
| **YouTube Videos** | Manage the video gallery and campaigns shown on the homepage (formats and playlists) |
| **Social Image Studio** | Canvas tool for making social media images |
| **Outreach Map** | A tracked list of Facebook groups and Shopify merchant communities for founder outreach |

### Justin DeMatteis portfolio
| Feature | What it does |
|---|---|
| **Work Posts** | Case studies with structured sections (such as the problem it solved), project media, case-study buttons and nested sub-projects |
| **AI Posts** | Articles for the AI Development section |
| **Service Requests** | Project enquiries from the site, auto-classified by service, with assignment to a department and email replies with attachments |
| **Hiring Contacts** | Recruiter and employer messages |
| **Departments** | Who handles which type of request |

### Sunwings Transport
| Feature | What it does |
|---|---|
| **Service Posts** | One post per service (moving, delivery, junk removal, ...) with SEO, hero, body, FAQs and a "where we offer this" locations checklist |
| **Location Posts** | One post per city or service area |
| **Quote Requests** | Quote and contact form submissions |
| **Facebook posts** | Pull the company's Facebook posts onto the website |
| **Integrations** | Connect Facebook and Google Reviews |
| **Team** | The client adds or removes their own admin and editor logins |

---

## Tech stack

- **React 18 + Vite**, React Router 7, Lucide icons
- **Puck** (`@puckeditor/core`) for the visual page builder
- **Supabase:** Postgres, Auth (Google), Storage, row-level security
- **Vercel:** hosting, plus serverless API routes in `api/`
- **Integrations:** Metricool (social scheduling), OpenAI (captions and transcription), YouTube

## Project structure

```text
api/
├── auth/                 Login + token refresh
├── admin/                One serverless route per admin feature (blog, site, demo-requests, ...)
│   └── sunwings/         Sunwings-only routes
├── public/               Public read endpoints (e.g. Sunwings Facebook posts)
└── _lib/                 Shared server code (Supabase, access checks, rate limiting, Metricool)
backend/migrations/       Every database change, in date order (SQL)
src/backend-admin/
├── app/                  Entry point and routes
├── auth/                 Login, auth context, route guards
├── sites/                Per-website config: justconsignin/, justindematteis/, sunwings/
├── features/             One folder per feature (blog, site-builder, demo-requests, ...)
├── components/           Shared UI
├── services/             API clients
└── styles/               Stylesheets (index.css imports the rest)
```

The folder rules are in [`src/backend-admin/README.md`](src/backend-admin/README.md): one folder per feature, thin routes, and shared code in `components/` or `services/`.

## Run locally

```bash
cp .env.example .env.local   # APP_URL, SUPABASE_URL, SUPABASE_ANON_KEY
npm install
npm run dev
```

Never commit `.env.local` or any Supabase secret key.

---

**Developer:** Justin DeMatteis ([justindematteis.com](https://www.justindematteis.com))
