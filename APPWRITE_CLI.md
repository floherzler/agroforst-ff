# Appwrite CLI

This document covers the Appwrite CLI workflow for this repository, with a
focus on reducing Appwrite Cloud UI work for a solo developer.

It intentionally does not include secrets, tokens, cookies, or copied local
CLI state.

## Current Status In This Repo

The repository is already linked to one Appwrite project through
[`/home/flo178/projects/agroforst-ff/appwrite.config.json`](/home/flo178/projects/agroforst-ff/appwrite.config.json).

The app expects one Appwrite database, one storage bucket, and multiple
collection or table IDs via public env vars in
[`/home/flo178/projects/agroforst-ff/.env.example`](/home/flo178/projects/agroforst-ff/.env.example)
and
[`/home/flo178/projects/agroforst-ff/src/app/env.ts`](/home/flo178/projects/agroforst-ff/src/app/env.ts).

Important implementation detail:

- the frontend client is still wired to legacy `Databases` and `Storage`
  APIs in
  [`/home/flo178/projects/agroforst-ff/src/models/client/config.ts`](/home/flo178/projects/agroforst-ff/src/models/client/config.ts#L3)
- some functions also use legacy `Databases`, for example
  [`/home/flo178/projects/agroforst-ff/functions/addAngebot/src/main.ts`](/home/flo178/projects/agroforst-ff/functions/addAngebot/src/main.ts#L1)
- newer functions already use `TablesDB`, for example
  [`/home/flo178/projects/agroforst-ff/functions/addProdukt/src/main.ts`](/home/flo178/projects/agroforst-ff/functions/addProdukt/src/main.ts#L1)
  and
  [`/home/flo178/projects/agroforst-ff/functions/createMembership/src/main.ts`](/home/flo178/projects/agroforst-ff/functions/createMembership/src/main.ts#L1)

That means the project currently mixes two Appwrite database APIs:

- legacy collections/documents
- newer tables/rows

This is the main blocker to a clean "recreate everything from scratch" flow.

## What The CLI Can Cover

With the current Appwrite CLI, the following can be done from the terminal:

- link the repo to a project: `appwrite init project`
- authenticate a local session: `appwrite login`
- manage site settings and site env vars
- create, pull, update, run locally, execute, and push Appwrite functions
- create, inspect, update, delete, pull, and push storage buckets
- create, inspect, update, delete, pull, and push database schema
  - legacy path: `databases` plus `pull collections` and `push collections`
  - current path: `tables-db` plus `pull tables` and `push tables`
- seed or migrate data
  - legacy path: `create-document`, `create-documents`, `upsert-document`
  - tables path: `create-row`, `create-rows`, `upsert-row`
- upload files into buckets: `appwrite storage create-file`

Based on the current CLI surface and Appwrite docs, storage bucket management is
fully scriptable from the CLI, and database schema management is also
scriptable, but you need to choose one database model and stick to it.

## What Still Usually Needs The Console

Some Appwrite setup is still more realistic in the Cloud UI:

- creating or rotating project API keys
- creating or rotating dev keys
- one-off visual inspection of data, indexes, permissions, and logs

If you want a fully non-interactive setup later, the CLI supports API-key-based
mode via `appwrite client --endpoint ... --project-id ... --key ...`, but the
API key itself is still created in Appwrite first.

For this repo, the simplest local setup is:

- reuse `VITE_APPWRITE_ENDPOINT`
- reuse `VITE_APPWRITE_PROJECT_ID`
- keep one secret `APPWRITE_API_KEY`

Do not store the secret in a `VITE_` variable because `VITE_` values are meant
for the browser bundle and are not secret.

## What You Need Installed For Local Function Testing In WSL

For local Appwrite function development, Appwrite uses Docker to replicate the
runtime locally. For a WSL-based workflow, the practical setup is:

### Install on Windows

- Docker Desktop for Windows
- WSL 2 enabled on Windows

Docker's current WSL guidance says:

- use WSL version `2.1.5` or later, ideally latest
- use the Docker Desktop WSL 2 backend
- do not keep separate Docker Engine or Docker CLI installations inside your
  Linux distro when using Docker Desktop with WSL integration, to avoid
  conflicts

### Install or verify inside your WSL distro

- Appwrite CLI
- Git
- Node.js and npm
- access to the `docker` command provided through Docker Desktop WSL integration

You do not need a separate Linux `dockerd` daemon inside Ubuntu if you use
Docker Desktop correctly. The goal is that `docker --version` works inside WSL
and talks to Docker Desktop's engine.

### Current state in this environment

In this WSL instance, the Appwrite CLI is already installed, but:

- `docker` is currently not installed or not exposed in the distro
- `appwrite login` has not been completed in this shell profile

## WSL Setup Checklist

If your goal is "functions local-first, Appwrite UI minimal", install and
verify in this order.

### 1. Windows-side prerequisites

1. install or update WSL
2. make sure your distro runs as WSL 2
3. install Docker Desktop for Windows
4. enable the Docker Desktop WSL 2 backend
5. enable WSL integration for your Ubuntu distro

Useful Windows-side checks:

```powershell
wsl --version
wsl -l -v
```

If your distro is not on version 2:

```powershell
wsl --set-version Ubuntu 2
```

### 2. WSL-side checks

Inside Ubuntu/WSL, verify:

```bash
docker --version
docker context ls
appwrite --version
git --version
node --version
npm --version
```

If `docker --version` fails in WSL, Docker Desktop integration is not ready
yet.

## Current Resource Inventory

The app currently expects these IDs:

- database: `VITE_DATABASE_ID`
- storage bucket: `VITE_STORAGE_ID`
- content/data resources:
  - `VITE_POST_COLLECTION_ID`
  - `VITE_STAFFEL_COLLECTION_ID`
  - `VITE_EVENT_COLLECTION_ID`
  - `VITE_PRODUCE_COLLECTION_ID`
  - `VITE_ORDER_COLLECTION_ID`
  - `VITE_MEMBERSHIP_COLLECTION_ID`
  - `VITE_PAYMENT_COLLECTION_ID`
  - hardcoded notifications collection: `nachrichten`
- function IDs:
  - `VITE_ORDER_FUNCTION_ID`
  - `VITE_MEMBERSHIP_FUNCTION_ID`
  - `VITE_PAYMENT_VERIFY_FUNCTION_ID`
  - `VITE_ADD_PRODUKT_FUNCTION_ID`
  - `VITE_ADD_ANGEBOT_FUNCTION_ID`

For a reset, these IDs should be treated as the contract between Appwrite and
the app.

## Recommended Solo-Dev Direction

Short term, do not rebuild the database blindly.

The pragmatic path is:

1. keep using the existing Appwrite project
2. pull the current bucket and schema config into the repo
3. commit the pulled config
4. push changes from the CLI instead of editing Appwrite Cloud by hand

For this repo specifically, standardizing on legacy collections first is the
lowest-risk option, because the frontend and much of the app still read and
write through `Databases`.

Why this is the safer near-term choice:

- the browser app currently depends on collection/document APIs
- moving everything to `tables-db` would require code changes across the app
- Appwrite's CLI supports both, but `pull collections` and `push collections`
  are already marked deprecated, so a tables migration is better handled as a
  dedicated follow-up task, not mixed into a reset

If you want the cleanest long-term Appwrite setup, the better end state is:

1. migrate the app to one data model
2. prefer `tables-db`
3. use `appwrite pull tables` and `appwrite push tables` as the schema source of
   truth

## Recommended Workflow To Reduce UI Work

### 1. Verify local CLI state

```bash
cd /home/flo178/projects/agroforst-ff
appwrite --version
appwrite login
appwrite init project
```

The CLI installed in this environment reports `appwrite version 14.0.1`.

### Local function auth for AI-agent testing

To run a function locally with Docker, the Appwrite CLI and the function runtime
need two different kinds of access:

- the CLI needs to be configured against the Appwrite project
- the function container needs its own runtime API key if the function calls
  Appwrite server APIs

In this repository, both of those can be satisfied by one shared secret:

- `APPWRITE_API_KEY`

The helper scripts use exactly:

- `VITE_APPWRITE_ENDPOINT`
- `VITE_APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`

For
[`/home/flo178/projects/agroforst-ff/functions/addProdukt/src/main.ts`](/home/flo178/projects/agroforst-ff/functions/addProdukt/src/main.ts),
the minimum runtime scope is:

- `rows.write`

Put that dev-only key in:

- [`/home/flo178/projects/agroforst-ff/.env`](/home/flo178/projects/agroforst-ff/.env)

There is a checked-in template here:

- [`/home/flo178/projects/agroforst-ff/.env.example`](/home/flo178/projects/agroforst-ff/.env.example)

The local helper command is:

```bash
scripts/appwrite-local-dev.sh addProdukt
```

By default that script runs the function on port `8091` and impersonates
`local-dev-user`.

The wrapper script:

- configures the Appwrite CLI from root `.env`
- syncs Appwrite functions into a gitignored local workspace
- reads the shared `# [appwrite-functions]` block plus the matching function
  block such as `# [addProdukt]`
- writes the generated runtime env file that `appwrite run function` expects
- starts the local Docker-backed function runner

### 2. Pull existing Appwrite config into the repo

For storage buckets:

```bash
appwrite pull buckets
```

For newer tables:

```bash
appwrite pull tables
```

For legacy collections if this project still stores its schema there:

```bash
appwrite pull collections
```

This is the most useful next step, because it turns the current Appwrite Cloud
state into reviewable files in the repository.

### 3. Commit the pulled manifest

After pull, review the generated changes in
[`/home/flo178/projects/agroforst-ff/appwrite.config.json`](/home/flo178/projects/agroforst-ff/appwrite.config.json)
and any generated Appwrite resource files, then commit them.

Once this exists in git, most future bucket and schema changes can be made in
code review instead of in the Appwrite web UI.

### 4. Manage buckets from CLI

One-off bucket creation:

```bash
appwrite storage create-bucket \
  --bucket-id productStorage \
  --name "Product Storage" \
  --file-security true \
  --enabled true \
  --maximum-file-size 10485760 \
  --compression zstd \
  --encryption true \
  --antivirus true \
  --transformations true
```

Declarative bucket workflow:

```bash
appwrite pull buckets
appwrite push buckets
```

### 5. Manage database schema from CLI

Legacy collections example:

```bash
appwrite databases create-collection \
  --database-id YOUR_DATABASE_ID \
  --collection-id produkte \
  --name produkte \
  --document-security true \
  --enabled true
```

Current tables example:

```bash
appwrite tables-db create-table \
  --database-id YOUR_DATABASE_ID \
  --table-id produkte \
  --name produkte \
  --row-security true \
  --enabled true
```

For long-term reproducibility, prefer the pull/edit/push flow over manually
typing many one-off create commands:

```bash
appwrite pull tables
appwrite push tables
```

Or, if you intentionally stay on legacy collections for now:

```bash
appwrite pull collections
appwrite push collections
```

### 6. Seed data and upload files from CLI when needed

Legacy documents:

```bash
appwrite databases create-document \
  --database-id YOUR_DATABASE_ID \
  --collection-id produkte \
  --document-id product-1 \
  --data '{"name":"Apfel","hauptkategorie":"obst"}'
```

Tables rows:

```bash
appwrite tables-db create-row \
  --database-id YOUR_DATABASE_ID \
  --table-id produkte \
  --row-id product-1 \
  --data '{"name":"Apfel","hauptkategorie":"obst"}'
```

Bucket files:

```bash
appwrite storage create-file \
  --bucket-id YOUR_BUCKET_ID \
  --file-id unique() \
  --file /absolute/path/to/file.jpg
```

### 7. Manage functions from CLI

Pull existing functions into the repo:

```bash
appwrite pull functions
```

Pull function variables too:

```bash
appwrite pull functions --with-variables
```

Initialize a new local function scaffold:

```bash
appwrite init functions
```

Create a function directly in Appwrite:

```bash
appwrite functions create \
  --function-id addProdukt \
  --name addProdukt \
  --runtime node-22 \
  --entrypoint src/main.ts \
  --commands "npm install" \
  --enabled true \
  --logging true \
  --timeout 15
```

Update function settings:

```bash
appwrite functions update \
  --function-id addProdukt \
  --entrypoint src/main.ts \
  --commands "npm install" \
  --timeout 15 \
  --logging true
```

Create or update function variables:

```bash
appwrite functions create-variable \
  --function-id addProdukt \
  --key APPWRITE_FUNCTION_DATABASE_ID \
  --value YOUR_DATABASE_ID \
  --secret false
```

Push local function code and settings:

```bash
appwrite push functions
```

Push function variables too:

```bash
appwrite push functions --with-variables
```

Execute a deployed function remotely from the CLI:

```bash
appwrite functions create-execution \
  --function-id addProdukt \
  --method POST \
  --path / \
  --headers '{"content-type":"application/json"}' \
  --body '{"name":"Apfel","hauptkategorie":"obst"}'
```

## Local Function Development

The Appwrite-supported local function workflow is Docker-backed and CLI-driven.

Appwrite's documented flow is:

1. install Docker
2. ensure Docker is running
3. install Appwrite CLI
4. `appwrite login`
5. initialize the project
6. initialize or pull functions
7. run them locally with `appwrite run functions`

Run a function locally:

```bash
appwrite run functions --function-id addProdukt --port 3000
```

Run locally with Appwrite function variables:

```bash
appwrite run functions --function-id addProdukt --port 3000 --with-variables
```

Impersonate a real Appwrite user while running locally:

```bash
appwrite run functions --function-id addProdukt --user-id USER_ID
```

Important local-dev limitations from Appwrite:

- local execution runs in Docker
- hot reload is enabled by default
- permissions, events, CRON schedules, and timeouts do not apply locally
- `--with-variables` should be used carefully if production secrets exist

For your current functions, this local setup is especially useful because many
handlers depend on Appwrite-provided headers like `x-appwrite-user-id` and on
function env vars such as `APPWRITE_FUNCTION_DATABASE_ID`.

## Recommended Function Workflow For This Repo

If you want the Appwrite CLI to be the default operating model, use this loop:

1. `appwrite login`
2. `appwrite init project`
3. `appwrite pull functions --with-variables`
4. commit the generated function metadata
5. develop with `appwrite run functions --function-id ...`
6. update variables with `appwrite functions create-variable` or `update-variable`
7. deploy with `appwrite push functions --with-variables`
8. verify with `appwrite functions create-execution ...`

That gives you:

- function settings in code
- local Docker-based testing before deployment
- remote execution from the terminal
- far less time in the Appwrite Cloud UI

## Recommended Next Moves For This Machine

To make this WSL machine ready for Appwrite local function development, install
or verify these items:

1. Docker Desktop on Windows with WSL integration enabled for this distro
2. WSL updated to current version
3. `docker` available inside this Ubuntu distro
4. Appwrite CLI login completed in WSL

Then run:

```bash
cd /home/flo178/projects/agroforst-ff
appwrite login
appwrite init project
appwrite pull functions --with-variables
appwrite pull buckets
appwrite pull collections
```

If you later migrate fully to `tables-db`, replace `pull collections` with
`pull tables`.

## Reset Feasibility

Rebuilding the Appwrite side from scratch is possible, but only with one clear
decision first:

- either this repo stays on legacy collections/documents for now
- or it gets migrated fully to tables/rows first

Without that decision, a clean reset is likely to produce an Appwrite project
that satisfies some code paths and breaks others.

## Concrete Next Step

If the goal is "less Appwrite Cloud UI from now on", the highest-value next move
is:

1. run `appwrite pull buckets`
2. run either `appwrite pull collections` or `appwrite pull tables`
3. commit the generated Appwrite config
4. make future bucket/schema changes through pull-edit-push

That gives you versioned infrastructure state immediately, without forcing a
full schema migration in the same step.

## References

Primary sources used for this assessment:

- [Appwrite CLI commands](https://appwrite.io/docs/tooling/command-line/commands)
- [Appwrite CLI functions workflow](https://appwrite.io/docs/tooling/command-line/functions)
- [Appwrite CLI tables workflow](https://appwrite.io/docs/tooling/command-line/tables)
- [Appwrite CLI buckets workflow](https://appwrite.io/docs/tooling/command-line/buckets)
- [Appwrite CLI non-interactive mode](https://appwrite.io/docs/tooling/command-line/non-interactive)
- [Appwrite local function development](https://appwrite.io/docs/products/functions/develop-locally)
- [Appwrite API keys](https://appwrite.io/docs/advanced/platform/api-keys)
- [Docker Desktop WSL 2 backend](https://docs.docker.com/desktop/features/wsl/)
- [Docker Desktop for Windows install requirements](https://docs.docker.com/desktop/setup/install/windows-install/)
