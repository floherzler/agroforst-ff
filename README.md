# agroforst-ff

Frontend and Appwrite-backed workflow for the Agroforst project.

## Local Development

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm run build
npm run test:e2e
```

## Environment

Copy the variable names from
[`/home/flo178/projects/agroforst-ff/.env.example`](/home/flo178/projects/agroforst-ff/.env.example)
into your local `.env` and fill in the Appwrite project, database, bucket,
collection, and function IDs.

The app reads these values from
[`/home/flo178/projects/agroforst-ff/src/app/env.ts`](/home/flo178/projects/agroforst-ff/src/app/env.ts).

## Appwrite

The Appwrite project is linked through
[`/home/flo178/projects/agroforst-ff/appwrite.config.json`](/home/flo178/projects/agroforst-ff/appwrite.config.json).

For the CLI workflow, schema management, buckets, and the current reset
recommendations, use
[`/home/flo178/projects/agroforst-ff/APPWRITE_CLI.md`](/home/flo178/projects/agroforst-ff/APPWRITE_CLI.md).

Short version:

- buckets can be managed from the CLI
- database schema can be managed from the CLI
- a full clean rebuild is possible, but this repo currently mixes Appwrite
  legacy collections/documents and newer tables/rows APIs, so that should be
  standardized before a full reset

## Local Function Testing

Put your dev-only local function settings into
[`/home/flo178/projects/agroforst-ff/.env`](/home/flo178/projects/agroforst-ff/.env),
using the function sections from
[`/home/flo178/projects/agroforst-ff/.env.example`](/home/flo178/projects/agroforst-ff/.env.example).

For `addProdukt`, the API key there should have `rows.write` scope.

The full local testing guide is here:
[`/home/flo178/projects/agroforst-ff/LOCAL_FUNCTION_TESTING.md`](/home/flo178/projects/agroforst-ff/LOCAL_FUNCTION_TESTING.md).

Then run:

```bash
scripts/appwrite-local-dev.sh addProdukt
```

The same guide also covers `addAngebot`, `createMembership`, `verifyPayment`,
`placeOrder`, and `syncAVP`.
