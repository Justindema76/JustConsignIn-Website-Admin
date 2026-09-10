# Website Admin Dashboard

The dashboard is the top-level launcher for website-admin features.

## Adding a module

Add one object to the `modules` array in `Dashboard.jsx` with:

- `to` — admin route
- `icon` — Lucide icon
- `title` — card heading
- `copy` — short description

The dashboard grid is responsive and feature-scoped in `dashboard.css`:

- desktop: 3 columns
- tablet: 2 columns
- mobile: 1 column

Do not add dashboard-specific layout rules to the global `backend.css`. Keep dashboard presentation inside this feature folder so new modules can be added without changing unrelated admin pages.
