# Local Function Testing

The canonical Appwrite resource IDs are now defined in
[`/home/flo178/projects/agroforst-ff/appwrite.config.json`](/home/flo178/projects/agroforst-ff/appwrite.config.json).
Local function runs no longer need per-function table ID env blocks in
`.env`; [`/home/flo178/projects/agroforst-ff/scripts/run-function-local.sh`](/home/flo178/projects/agroforst-ff/scripts/run-function-local.sh)
injects them from the repo-owned schema contract.

See the full authoring guide in
[`/home/flo178/projects/agroforst-ff/functions/FUNCTIONS_GUIDE.md`](/home/flo178/projects/agroforst-ff/functions/FUNCTIONS_GUIDE.md)
for the repository template and workflow for new functions.

This repository supports local Appwrite function testing from the project root
with one command.

## Prerequisites

- Appwrite CLI installed
- Docker available from WSL
- root
  [`/home/flo178/projects/agroforst-ff/.env`](/home/flo178/projects/agroforst-ff/.env)
  filled in

## Required `.env` sections

Use
[`/home/flo178/projects/agroforst-ff/.env.example`](/home/flo178/projects/agroforst-ff/.env.example)
as the template.

For Appwrite CLI automation, keep these values in the root `.env`:

```env
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=670b925800275a11d5c1
APPWRITE_API_KEY=your_shared_appwrite_key

# [appwrite-functions]
APPWRITE_FUNCTION_DEBUG=1
```

Those are the only shared Appwrite variables needed for the automated local
workflow.

Do not put the key into a `VITE_` variable. `VITE_` values are client-exposed
in the frontend build. Keep the secret in `APPWRITE_API_KEY`.

Other supported optional override blocks can be copied from
[`/home/flo178/projects/agroforst-ff/.env.example`](/home/flo178/projects/agroforst-ff/.env.example):

- `# [createMembership]`
- `# [verifyPayment]`
- `# [createOrder]`

In most cases you do not need those blocks at all. The runner derives defaults
from the managed schema in
[`/home/flo178/projects/agroforst-ff/appwrite.config.json`](/home/flo178/projects/agroforst-ff/appwrite.config.json).

Use the function blocks only when you want to override those defaults or when a
function needs something extra like `NEXTCLOUD_CSV_URL`.

## Other functions and minimum scopes

These are the current minimum runtime scopes based on the code in the repo.

- `createMembership`: `users.read`, `rows.read`, `rows.write`
- `verifyPayment`: `users.read`, `documents.read`, `documents.write`
- `createOrder`: `documents.read`, `documents.write`
If you want to keep a single shared key for CLI automation and all current
local function tests, the practical union is:

- `users.read`
- `documents.read`
- `documents.write`
- `rows.read`
- `rows.write`

## One-command local run

Run:

```bash
scripts/appwrite-local-dev.sh createMembership
```

By default this:

1. reads the root `.env`
2. configures the Appwrite CLI with your endpoint, project ID, and key
3. pulls Appwrite functions into the gitignored local workspace
   [`/home/flo178/projects/agroforst-ff/.appwrite-local`](/home/flo178/projects/agroforst-ff/.appwrite-local)
4. overlays the pulled function sources with the checked-in Node runtime
   implementations and rewrites the local Appwrite metadata to `node-22`
5. generates the runtime `functions/createMembership/.env` file inside that local
   workspace
6. starts the Docker-backed Appwrite function runner on `http://localhost:8091/`

Optional arguments:

```bash
scripts/appwrite-local-dev.sh <function-id> [user-id] [port]
```

Example:

```bash
scripts/appwrite-local-dev.sh createMembership local-dev-user 8091
```

You can also use:

```bash
scripts/appwrite-local-dev.sh createMembership
scripts/appwrite-local-dev.sh verifyPayment
scripts/appwrite-local-dev.sh createOrder
```

The local runner intentionally patches the pulled Deno function definitions to
`node-22` and uses the repo-owned `src/main.js` handlers plus each function's
local `package.json`.

## Quick test request

After the runner starts, test the function with:

```bash
curl -i -X POST http://localhost:8091/ \
  -H 'Content-Type: application/json' \
  --data '{"name":"CLI test","hauptkategorie":"Gemüse"}'
```

Expected result for a valid request:

- `HTTP/1.1 200 OK`
- JSON response with `"success": true`

## Suggested local test payloads

`createMembership`

```bash
curl -i -X POST http://localhost:8091/ \
  -H 'Content-Type: application/json' \
  --data '{"type":"privat"}'
```

`verifyPayment`

```bash
curl -i -X POST http://localhost:8091/ \
  -H 'Content-Type: application/json' \
  --data '{"paymentId":"<payment-id>","membershipId":"<membership-id>","status":"bezahlt"}'
```

`createOrder`

```bash
curl -i -X POST http://localhost:8091/ \
  -H 'Content-Type: application/json' \
  --data '{"angebotID":"<angebot-id>","mitgliedschaftID":"<membership-id>","menge":1}'
```

## Notes

- The local Appwrite workspace in
  [`/home/flo178/projects/agroforst-ff/.appwrite-local`](/home/flo178/projects/agroforst-ff/.appwrite-local)
  is generated and gitignored.
- The repo itself does not need checked-in Appwrite function metadata for local
  testing anymore.
- If you want to force a fresh pull before running, use:

```bash
APPWRITE_LOCAL_REFRESH=1 scripts/appwrite-local-dev.sh createMembership
```
