# Appwrite Schema Contract

This repository now uses the same Appwrite mental model as the sibling `home`
repo:

- [`/home/flo178/projects/agroforst-ff/appwrite.config.json`](/home/flo178/projects/agroforst-ff/appwrite.config.json) is the single source of truth for the managed Appwrite schema
- [`/home/flo178/projects/agroforst-ff/scripts/appwrite-schema-sync.mjs`](/home/flo178/projects/agroforst-ff/scripts/appwrite-schema-sync.mjs) owns schema push, pull, reset, and type generation
- [`/home/flo178/projects/agroforst-ff/scripts/appwrite-seed.mjs`](/home/flo178/projects/agroforst-ff/scripts/appwrite-seed.mjs) seeds demo rows and syncs shared function variables only

## Managed resources

- Database: `agroforst`
- Bucket: `product_images`
- Public content tables: `products`, `offers`, `blog_posts`
- Member and commerce tables: `memberships`, `membership_payments`, `orders`
- Support and audit tables: `customer_messages`, `backoffice_events`
- Function IDs: `addProdukt`, `addAngebot`, `createMembership`, `createOrder`, `verifyPayment`

## Commands

```bash
npm run appwrite:schema:validate
npm run appwrite:schema:push
npm run appwrite:schema:pull
npm run appwrite:schema:reset
npm run appwrite:schema:types
npm run appwrite:seed
npm run appwrite:seed:demo
npm run appwrite:bootstrap
```

## How schema changes should be made

1. Edit [`/home/flo178/projects/agroforst-ff/appwrite.config.json`](/home/flo178/projects/agroforst-ff/appwrite.config.json) directly, or use one of the helper commands.
2. Run `npm run appwrite:schema:push`.
3. Run `npm run appwrite:schema:types` if you want refreshed generated types.
4. Update app or function code to use the new table shape.

Additive helpers:

```bash
npm run appwrite:schema:add-column -- --table offers --key harvest_notes --type text
npm run appwrite:schema:add-index -- --table offers --key offer_harvest_notes_ft --type fulltext --columns harvest_notes
```

## How seeding should be used

The seed script is intentionally narrow:

- upsert demo rows
- sync shared function variables such as `APPWRITE_TABLE_PRODUCTS_ID`

It does not:

- create databases
- create tables
- add columns
- add indexes
- own schema migrations

`npm run appwrite:seed:demo` is idempotent for the demo rows tracked in the script.
