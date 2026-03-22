# Appwrite CLI Workflow

This repository uses a code-first Appwrite workflow.

## Source of truth

The managed Appwrite schema lives in:

- [`/home/flo178/projects/agroforst-ff/appwrite.config.json`](/home/flo178/projects/agroforst-ff/appwrite.config.json)

Project-specific secrets stay local in `.env`. The scripts configure the Appwrite CLI in non-interactive API-key mode at runtime.

## Commands

Schema lifecycle:

```bash
npm run appwrite:schema:validate
npm run appwrite:schema:push
npm run appwrite:schema:pull
npm run appwrite:schema:reset
npm run appwrite:schema:types
```

Data and bootstrap:

```bash
npm run appwrite:seed
npm run appwrite:seed:demo
npm run appwrite:bootstrap
npm run appwrite:reset
```

## What each script does

- `appwrite:schema:push`: creates or updates the managed database, tables, columns, indexes, and bucket from `appwrite.config.json`
- `appwrite:schema:pull`: reads the remote managed schema back into `appwrite.config.json`
- `appwrite:schema:reset`: deletes the managed database and bucket, then recreates them from code
- `appwrite:schema:types`: runs `appwrite types --language ts src/lib/appwrite-generated`
- `appwrite:seed`: syncs shared function variables only
- `appwrite:seed:demo`: syncs shared function variables and upserts demo rows
- `appwrite:bootstrap`: pushes schema, then seeds demo rows

## Required environment variables

- `VITE_APPWRITE_ENDPOINT`
- `VITE_APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`

The schema and seed scripts both use:

```bash
appwrite client \
  --endpoint "$VITE_APPWRITE_ENDPOINT" \
  --project-id "$VITE_APPWRITE_PROJECT_ID" \
  --key "$APPWRITE_API_KEY"
```

That setup is handled automatically by [`/home/flo178/projects/agroforst-ff/scripts/appwrite-schema-sync.mjs`](/home/flo178/projects/agroforst-ff/scripts/appwrite-schema-sync.mjs) and [`/home/flo178/projects/agroforst-ff/scripts/appwrite-seed.mjs`](/home/flo178/projects/agroforst-ff/scripts/appwrite-seed.mjs).

## How schema changes should be made

Preferred workflow:

1. edit [`/home/flo178/projects/agroforst-ff/appwrite.config.json`](/home/flo178/projects/agroforst-ff/appwrite.config.json)
2. run `npm run appwrite:schema:validate`
3. run `npm run appwrite:schema:push`
4. optionally run `npm run appwrite:schema:types`
5. update application or function code

For common additive changes, use:

```bash
npm run appwrite:schema:add-column -- --table products --key latin_name --type varchar --size 255
npm run appwrite:schema:add-index -- --table products --key prod_latin_name_key --type key --columns latin_name
```

Keep destructive changes explicit. If you rename or remove schema, prefer a deliberate `appwrite:schema:reset`.

## Console usage

Normal schema evolution should not require the Appwrite Cloud console.

The console is still realistic for:

- creating or rotating API keys
- visual inspection of data, permissions, or logs
- one-off manual debugging

## Local function testing

Local function runs derive managed IDs from [`/home/flo178/projects/agroforst-ff/appwrite.config.json`](/home/flo178/projects/agroforst-ff/appwrite.config.json) through [`/home/flo178/projects/agroforst-ff/scripts/run-function-local.sh`](/home/flo178/projects/agroforst-ff/scripts/run-function-local.sh).

See [`/home/flo178/projects/agroforst-ff/LOCAL_FUNCTION_TESTING.md`](/home/flo178/projects/agroforst-ff/LOCAL_FUNCTION_TESTING.md) for the Docker and WSL workflow.
