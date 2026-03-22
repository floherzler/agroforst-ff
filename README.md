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
into your local `.env` and fill in the Appwrite endpoint, project ID, and local API key.

The app reads these values from
[`/home/flo178/projects/agroforst-ff/src/app/env.ts`](/home/flo178/projects/agroforst-ff/src/app/env.ts).
Managed database, table, bucket, and function IDs now come from
[`/home/flo178/projects/agroforst-ff/appwrite.config.json`](/home/flo178/projects/agroforst-ff/appwrite.config.json).

## Appwrite

The Appwrite project is linked through
[`/home/flo178/projects/agroforst-ff/appwrite.config.json`](/home/flo178/projects/agroforst-ff/appwrite.config.json).

For the CLI workflow, schema management, bucket sync, and reset workflow, use
[`/home/flo178/projects/agroforst-ff/APPWRITE_CLI.md`](/home/flo178/projects/agroforst-ff/APPWRITE_CLI.md).

Quick developer cheat sheets live in
[`/home/flo178/projects/agroforst-ff/docs/README.md`](/home/flo178/projects/agroforst-ff/docs/README.md).

Short version:

- `appwrite.config.json` is the canonical schema contract
- repo scripts manage schema push, pull, reset, and seed operations
- a full clean rebuild is supported from code with `npm run appwrite:reset`

## Local Function Testing

Put your dev-only local function settings into
[`/home/flo178/projects/agroforst-ff/.env`](/home/flo178/projects/agroforst-ff/.env),
using the function sections from
[`/home/flo178/projects/agroforst-ff/.env.example`](/home/flo178/projects/agroforst-ff/.env.example).

For the remaining server functions, the API key there should have the scopes
documented in
[`/home/flo178/projects/agroforst-ff/LOCAL_FUNCTION_TESTING.md`](/home/flo178/projects/agroforst-ff/LOCAL_FUNCTION_TESTING.md).

The full local testing guide is here:
[`/home/flo178/projects/agroforst-ff/LOCAL_FUNCTION_TESTING.md`](/home/flo178/projects/agroforst-ff/LOCAL_FUNCTION_TESTING.md).

Then run:

```bash
scripts/appwrite-local-dev.sh createMembership
```

The same guide also covers `verifyPayment` and `createOrder`.
