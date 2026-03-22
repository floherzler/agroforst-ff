# TanStack Start And UI Cheat Sheet

This is the shortest useful map of how frontend work is organized in this repo.

## Core structure

- Router factory: [`/home/flo178/projects/agroforst-ff/src/router.tsx`](/home/flo178/projects/agroforst-ff/src/router.tsx)
- Root route and shell: [`/home/flo178/projects/agroforst-ff/src/routes/__root.tsx`](/home/flo178/projects/agroforst-ff/src/routes/__root.tsx)
- File routes: [`/home/flo178/projects/agroforst-ff/src/routes`](/home/flo178/projects/agroforst-ff/src/routes)
- Generated route tree: [`/home/flo178/projects/agroforst-ff/src/routeTree.gen.ts`](/home/flo178/projects/agroforst-ff/src/routeTree.gen.ts)
- Shared UI primitives: [`/home/flo178/projects/agroforst-ff/src/components/ui`](/home/flo178/projects/agroforst-ff/src/components/ui)
- Newer feature pages: [`/home/flo178/projects/agroforst-ff/src/features`](/home/flo178/projects/agroforst-ff/src/features)
- Shared layout shell: [`/home/flo178/projects/agroforst-ff/src/components/base/page-shell.tsx`](/home/flo178/projects/agroforst-ff/src/components/base/page-shell.tsx)

## Routing mental model

Routes are file-based via `createFileRoute(...)`.

Examples:

- root shell: [`/home/flo178/projects/agroforst-ff/src/routes/__root.tsx`](/home/flo178/projects/agroforst-ff/src/routes/__root.tsx)
- home route: [`/home/flo178/projects/agroforst-ff/src/routes/index.tsx`](/home/flo178/projects/agroforst-ff/src/routes/index.tsx)
- dynamic route: [`/home/flo178/projects/agroforst-ff/src/routes/angebote.$id.tsx`](/home/flo178/projects/agroforst-ff/src/routes/angebote.$id.tsx)

Typical pattern:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import SomePage from "@/features/something/some-page";

export const Route = createFileRoute("/something")({
  component: SomePage,
});
```

The root shell already wraps all pages with:

- `AuthProvider`
- `Navbar`
- `Footer`

So page components usually only need to render page content, not global chrome.

## Preferred page pattern in this repo

For newer work, follow the feature-page pattern:

1. put page logic in `src/features/...`
2. keep route files thin
3. let `src/app/page.tsx` or route files re-export feature pages when needed

Example:

- feature page: [`/home/flo178/projects/agroforst-ff/src/features/home/home-page.tsx`](/home/flo178/projects/agroforst-ff/src/features/home/home-page.tsx)
- route shim: [`/home/flo178/projects/agroforst-ff/src/routes/index.tsx`](/home/flo178/projects/agroforst-ff/src/routes/index.tsx)
- app shim: [`/home/flo178/projects/agroforst-ff/src/app/page.tsx`](/home/flo178/projects/agroforst-ff/src/app/page.tsx)

If you add a new substantial page, prefer `src/features/<domain>/<page>.tsx` plus a thin route file.

## Client/server rule of thumb

This repo is configured with `rsc: false` in [`/home/flo178/projects/agroforst-ff/components.json`](/home/flo178/projects/agroforst-ff/components.json), and many pages/components are normal client React files.

Use `"use client"` when the file:

- uses state or effects
- uses browser APIs
- handles form events directly
- uses Zustand stores

Examples:

- [`/home/flo178/projects/agroforst-ff/src/features/home/home-page.tsx`](/home/flo178/projects/agroforst-ff/src/features/home/home-page.tsx)
- [`/home/flo178/projects/agroforst-ff/src/features/catalog/products-catalog-page.tsx`](/home/flo178/projects/agroforst-ff/src/features/catalog/products-catalog-page.tsx)
- [`/home/flo178/projects/agroforst-ff/src/features/auth/auth-store.ts`](/home/flo178/projects/agroforst-ff/src/features/auth/auth-store.ts)

## State and data patterns

### Appwrite data access

Keep Appwrite access in `src/lib/appwrite/*`, not directly inside random components.

- auth: [`/home/flo178/projects/agroforst-ff/src/lib/appwrite/appwriteAuth.ts`](/home/flo178/projects/agroforst-ff/src/lib/appwrite/appwriteAuth.ts)
- products/offers/blog/messages: [`/home/flo178/projects/agroforst-ff/src/lib/appwrite/appwriteProducts.ts`](/home/flo178/projects/agroforst-ff/src/lib/appwrite/appwriteProducts.ts)
- memberships: [`/home/flo178/projects/agroforst-ff/src/lib/appwrite/appwriteMemberships.ts`](/home/flo178/projects/agroforst-ff/src/lib/appwrite/appwriteMemberships.ts)
- orders: [`/home/flo178/projects/agroforst-ff/src/lib/appwrite/appwriteOrders.ts`](/home/flo178/projects/agroforst-ff/src/lib/appwrite/appwriteOrders.ts)
- function executions: [`/home/flo178/projects/agroforst-ff/src/lib/appwrite/appwriteFunctions.ts`](/home/flo178/projects/agroforst-ff/src/lib/appwrite/appwriteFunctions.ts)

### Zustand

Global auth state lives in Zustand with `persist` and `immer`:

- [`/home/flo178/projects/agroforst-ff/src/features/auth/auth-store.ts`](/home/flo178/projects/agroforst-ff/src/features/auth/auth-store.ts)

Use Zustand for cross-page session/user state. Prefer local `useState` for page-local UI concerns.

### Local page state

Use plain `useState` plus `useEffect` for local screen behavior.

Example:

- [`/home/flo178/projects/agroforst-ff/src/features/catalog/products-catalog-page.tsx`](/home/flo178/projects/agroforst-ff/src/features/catalog/products-catalog-page.tsx)

Pattern already used here:

- filters in local state
- debounced input with [`/home/flo178/projects/agroforst-ff/src/hooks/use-debounced-value.ts`](/home/flo178/projects/agroforst-ff/src/hooks/use-debounced-value.ts)
- async loader in an effect

## Forms

This repo already uses:

- `react-hook-form`
- `zod`
- `@hookform/resolvers/zod`
- local form wrappers in [`/home/flo178/projects/agroforst-ff/src/components/ui/form.tsx`](/home/flo178/projects/agroforst-ff/src/components/ui/form.tsx)

Examples:

- [`/home/flo178/projects/agroforst-ff/src/components/StaffelAdmin.tsx`](/home/flo178/projects/agroforst-ff/src/components/StaffelAdmin.tsx)
- [`/home/flo178/projects/agroforst-ff/src/components/ZentraleAdmin.tsx`](/home/flo178/projects/agroforst-ff/src/components/ZentraleAdmin.tsx)

Preferred form stack:

1. define a `zod` schema
2. infer input/output types from it
3. use `useForm(...)`
4. wire through `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`

## UI primitives used here

The local UI layer is in [`/home/flo178/projects/agroforst-ff/src/components/ui`](/home/flo178/projects/agroforst-ff/src/components/ui) and uses Base UI primitives behind shadcn-style wrappers.

Current primitives:

- `button`
- `input`
- `textarea`
- `label`
- `badge`
- `card`
- `dialog`
- `popover`
- `select`
- `tabs`
- `table`
- `accordion`
- `avatar`
- `navigation-menu`
- `separator`
- `skeleton`
- `switch`
- `calendar`
- `carousel`

Use these before inventing custom markup.

## Most useful combinations in this repo

### Page layout

Use:

- `PageShell`
- `PageHeader`
- `SurfaceSection`

from [`/home/flo178/projects/agroforst-ff/src/components/base/page-shell.tsx`](/home/flo178/projects/agroforst-ff/src/components/base/page-shell.tsx)

This is the best starting point for any new full page.

### Section card

Use:

- `Card`
- `CardHeader`
- `CardTitle`
- `CardDescription`
- `CardContent`

### Filters and segmented controls

Use:

- `Tabs`
- `TabsList`
- `TabsTrigger`

See [`/home/flo178/projects/agroforst-ff/src/features/catalog/products-catalog-page.tsx`](/home/flo178/projects/agroforst-ff/src/features/catalog/products-catalog-page.tsx).

### Data tables

Use:

- `Table`
- `TableHeader`
- `TableHead`
- `TableBody`
- `TableRow`
- `TableCell`

Prefer the newer table usage in:

- [`/home/flo178/projects/agroforst-ff/src/features/catalog/products-catalog-page.tsx`](/home/flo178/projects/agroforst-ff/src/features/catalog/products-catalog-page.tsx)
- [`/home/flo178/projects/agroforst-ff/src/components/ZentraleAdmin.tsx`](/home/flo178/projects/agroforst-ff/src/components/ZentraleAdmin.tsx)

over the older all-`TableCell` header pattern used in some legacy components.

### Modal flow

Use:

- `Dialog`
- `DialogContent`
- `DialogHeader`
- `DialogTitle`
- `DialogDescription`

Example:

- [`/home/flo178/projects/agroforst-ff/src/components/OrderDialog.tsx`](/home/flo178/projects/agroforst-ff/src/components/OrderDialog.tsx)

## Styling conventions already present

- Tailwind lives in [`/home/flo178/projects/agroforst-ff/src/styles.css`](/home/flo178/projects/agroforst-ff/src/styles.css)
- utility merging lives in [`/home/flo178/projects/agroforst-ff/src/lib/utils.ts`](/home/flo178/projects/agroforst-ff/src/lib/utils.ts)
- use semantic variants where wrappers expose them
- prefer `gap-*` over manual spacing hacks
- prefer existing wrappers over raw primitive imports

## Good defaults for new work

When adding something new:

1. create or update a feature page/component under `src/features/...`
2. keep route files thin
3. fetch or mutate data through `src/lib/appwrite/*`
4. use local `ui/*` primitives and `base/page-shell`
5. use `react-hook-form` + `zod` for non-trivial forms
6. use Zustand only for cross-page state

## Fast recipes

Add a new page:

1. create `src/features/<domain>/<page>.tsx`
2. add `src/routes/<path>.tsx` with `createFileRoute`
3. use `PageShell` + `PageHeader` + `SurfaceSection`
4. import data helpers from `src/lib/appwrite/*`

Add a new admin form:

1. define a `zod` schema
2. use `useForm` with `zodResolver`
3. render with `Form` helpers from `ui/form`
4. submit through an Appwrite function wrapper in `src/lib/appwrite/appwriteFunctions.ts`

Add a new table-backed view:

1. extend `appwrite.config.json`
2. push schema
3. update the corresponding parser/normalizer in `src/lib/appwrite/*`
4. render with `Table` or `Card` primitives
