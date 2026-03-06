# Architecture

The app now follows a simpler shape built around deep modules.

## Rules

- `src/routes/*` stays thin.
- `src/app/*/page.tsx` stays thin.
- `src/features/*` owns user-facing flows.
- `src/lib/appwrite/*` is the Appwrite adapter layer.
- `src/components/ui/*` contains shadcn/Base Nova primitives only.

## Current deep modules

- `src/features/auth`
  - Owns session state, auth bootstrap, route guards, and auth forms.
  - Public interface: `useAuthStore`, `AuthProvider`, `AuthGuard`, `login-page`, `signup-page`.

- `src/features/catalog`
  - Owns catalog categories, product and marketplace loading, and catalog formatting rules.
  - Public interface: `listMarketplaceOffers`, `listProductCatalog`, catalog filter helpers.

- `src/features/marketplace`
  - Owns the marketplace page composition.
  - Depends on `src/features/catalog`, not directly on raw Appwrite modules.

- `src/features/home`
  - Owns the landing page and feedback flow.

## Appwrite boundary

Appwrite client creation is centralized in `src/lib/appwrite/shared.ts`.
Feature modules should avoid talking to raw SDK clients directly.
If a new flow needs Appwrite data, add a focused function to the relevant adapter or feature module instead of spreading SDK calls into page files.

## Decision guideline

When adding code, prefer:

1. Add behavior inside an existing feature module.
2. Add a new feature module only when the user-facing flow is clearly separate.
3. Keep `routes`, `app`, and `components/ui` shallow.
