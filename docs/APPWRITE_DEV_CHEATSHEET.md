# Appwrite Dev Cheat Sheet

This is the fast-path Appwrite workflow for this repo.

## Source of truth

- Schema contract: [`/home/flo178/projects/agroforst-ff/appwrite.config.json`](/home/flo178/projects/agroforst-ff/appwrite.config.json)
- Schema sync script: [`/home/flo178/projects/agroforst-ff/scripts/appwrite-schema-sync.mjs`](/home/flo178/projects/agroforst-ff/scripts/appwrite-schema-sync.mjs)
- Schema helper script: [`/home/flo178/projects/agroforst-ff/scripts/appwrite-schema-tools.mjs`](/home/flo178/projects/agroforst-ff/scripts/appwrite-schema-tools.mjs)
- Seed script: [`/home/flo178/projects/agroforst-ff/scripts/appwrite-seed.mjs`](/home/flo178/projects/agroforst-ff/scripts/appwrite-seed.mjs)
- Runtime Appwrite config: [`/home/flo178/projects/agroforst-ff/src/lib/appwrite/shared.ts`](/home/flo178/projects/agroforst-ff/src/lib/appwrite/shared.ts)

## Required local env

Put these in [`/home/flo178/projects/agroforst-ff/.env`](/home/flo178/projects/agroforst-ff/.env):

```env
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=YOUR_PROJECT_ID
APPWRITE_API_KEY=YOUR_LOCAL_DEV_KEY

# [appwrite-functions]
APPWRITE_FUNCTION_DEBUG=1
```

Keep the API key local only. Do not put it in a `VITE_` variable.

## Daily commands

Validate schema file:

```bash
npm run appwrite:schema:validate
```

Push local schema to Appwrite:

```bash
npm run appwrite:schema:push
```

Pull remote schema back into code:

```bash
npm run appwrite:schema:pull
```

Generate TS types from Appwrite:

```bash
npm run appwrite:schema:types
```

Seed demo rows and shared function variables:

```bash
npm run appwrite:seed
```

Full bootstrap from code:

```bash
npm run appwrite:bootstrap
```

Full destructive rebuild:

```bash
npm run appwrite:reset
```

## Common edits

Add a column:

```bash
npm run appwrite:schema:add-column -- --table products --key latin_name --type varchar --size 255
```

Add an enum column:

```bash
npm run appwrite:schema:add-column -- --table offers --key visibility --type enum --elements public,internal --default public
```

Add an index:

```bash
npm run appwrite:schema:add-index -- --table products --key prod_latin_name_key --type key --columns latin_name
```

Add a fulltext index:

```bash
npm run appwrite:schema:add-index -- --table blog_posts --key blog_summary_ft --type fulltext --columns summary
```

Recommended flow after additive changes:

1. edit `appwrite.config.json` or use helper command
2. run `npm run appwrite:schema:validate`
3. run `npm run appwrite:schema:push`
4. update app/function code
5. run `npm run build`

## Managed resource IDs

- Database: `agroforst`
- Bucket: `product_images`
- Tables:
  - `products`
  - `offers`
  - `memberships`
  - `membership_payments`
  - `orders`
  - `blog_posts`
  - `customer_messages`
  - `backoffice_events`
- Functions:
  - `addProdukt`
  - `addAngebot`
  - `createMembership`
  - `createOrder`
  - `verifyPayment`

## Where IDs are consumed in app code

- Shared runtime IDs: [`/home/flo178/projects/agroforst-ff/src/lib/appwrite/shared.ts`](/home/flo178/projects/agroforst-ff/src/lib/appwrite/shared.ts)
- Product and offer reads: [`/home/flo178/projects/agroforst-ff/src/lib/appwrite/appwriteProducts.ts`](/home/flo178/projects/agroforst-ff/src/lib/appwrite/appwriteProducts.ts)
- Membership reads: [`/home/flo178/projects/agroforst-ff/src/lib/appwrite/appwriteMemberships.ts`](/home/flo178/projects/agroforst-ff/src/lib/appwrite/appwriteMemberships.ts)
- Order reads: [`/home/flo178/projects/agroforst-ff/src/lib/appwrite/appwriteOrders.ts`](/home/flo178/projects/agroforst-ff/src/lib/appwrite/appwriteOrders.ts)

When adding a new column, update the matching normalization/parsing code there if the UI needs the field.

## Function workflow

Local function runner:

```bash
scripts/run-function-local.sh addProdukt
scripts/run-function-local.sh addAngebot
scripts/run-function-local.sh createMembership
scripts/run-function-local.sh verifyPayment
scripts/run-function-local.sh createOrder
```

The runner derives managed IDs from [`/home/flo178/projects/agroforst-ff/appwrite.config.json`](/home/flo178/projects/agroforst-ff/appwrite.config.json), so you usually do not need per-function table ID env blocks.

## Good defaults

- Use `appwrite.config.json` as the only schema contract.
- Treat seed data as starter/demo content only.
- Prefer additive schema changes during normal work.
- Use reset only when removing/renaming schema or rebuilding from scratch.
- After Appwrite changes, run `npm run build` to catch naming drift quickly.

## Common recovery moves

Schema file changed locally but remote is behind:

```bash
npm run appwrite:schema:push
```

Remote got changed manually and you want code to match:

```bash
npm run appwrite:schema:pull
```

Schema is inconsistent and you want a clean rebuild:

```bash
npm run appwrite:reset
```

Function variable IDs are stale:

```bash
npm run appwrite:seed
```
