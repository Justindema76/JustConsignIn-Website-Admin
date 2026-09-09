# Website Admin architecture

This folder is intentionally organized as a reusable admin template instead of a flat collection of JS, JSX and CSS files.

## Folders

- `app/` — application entry point and route composition only.
- `auth/` — authentication context, login and route guards.
- `components/` — reusable UI that is not owned by one feature.
- `config/` — shared configuration and platform definitions.
- `features/` — one folder per admin feature. Feature UI and feature-only helpers stay together.
- `services/` — browser/API/storage integrations shared by features.
- `styles/` — global and feature stylesheet bundles. `styles/index.css` is the only stylesheet imported by the app entry point.

## Rules

1. Do not add new `.js`, `.jsx` or `.css` files directly to `src/backend-admin/`.
2. If code is useful to more than one feature, put it in `components/`, `services/` or `config/`.
3. Keep route files thin. Business and integration logic belongs in services, not page components.
4. Keep reusable media rendering and social-network selection centralized so future modules can use the same behavior.
5. New features get their own `features/<feature-name>/` folder.
6. Serverless routes under `/api` remain public entry points; reusable server logic should be moved into shared server modules rather than duplicated between routes.

This structure is the baseline for turning the Website Admin into a reusable project template.
