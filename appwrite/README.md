# Appwrite Resource Contract

This directory is the canonical Appwrite contract for this repository.

- [`/home/flo178/projects/agroforst-ff/appwrite/resources.json`](/home/flo178/projects/agroforst-ff/appwrite/resources.json) defines the managed database ID, bucket ID, table IDs, column definitions, indexes, function IDs, and optional demo seed rows.
- [`/home/flo178/projects/agroforst-ff/scripts/appwrite-seed.mjs`](/home/flo178/projects/agroforst-ff/scripts/appwrite-seed.mjs) applies that contract with the Appwrite CLI.

## Naming Scheme

- Database ID: `agroforst`
- Bucket ID: `product_images`
- Public content tables: `products`, `offers`, `blog_posts`
- Member and commerce tables: `memberships`, `membership_payments`, `orders`
- Support and audit tables: `customer_messages`, `backoffice_events`
- Column names: `snake_case`
- Function IDs: stable camelCase IDs matching the existing deployed functions

## Commands

Use the root npm scripts:

```bash
npm run appwrite:seed
npm run appwrite:seed:demo
npm run appwrite:reset
```

Expected env:

- `VITE_APPWRITE_ENDPOINT`
- `VITE_APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`

`npm run appwrite:seed` is idempotent for additive changes. If you rename or remove columns, run `npm run appwrite:reset` and then seed again.
