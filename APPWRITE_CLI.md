# Appwrite CLI

This document describes the safe CLI workflow for managing the Appwrite Sites
deployment for this repository from WSL.

It intentionally does not include any secrets, tokens, cookies, or project-
specific credentials.

## Prerequisites

- `appwrite` CLI installed in WSL
- authenticated user session via `appwrite login`
- this repository opened from its project directory:
  - `/home/flo178/projects/agroforst-ff`

Verify the CLI is available:

```bash
appwrite --version
```

## Project Scoping

The Appwrite CLI is scoped to the current directory.

Before running `sites` commands, use this repository directory and confirm the
linked project:

```bash
cd /home/flo178/projects/agroforst-ff
appwrite init project
```

If the CLI says a project is already associated with the current directory,
keep that association unless you explicitly want to repoint the repository to a
different Appwrite project.

## Authentication

Login uses Appwrite account credentials, not GitHub OAuth credentials:

```bash
appwrite login
```

If your Appwrite account was originally created through GitHub, you may need to
set or reset an Appwrite password in the Appwrite Cloud console before CLI login
works.

## Listing Sites

To inspect the connected project's sites:

```bash
appwrite sites list
```

To narrow the output:

```bash
appwrite sites list --search aff
appwrite sites list --search aff --report
```

Use `--search` aggressively. The full table output is wide and hard to read in
terminals.

## Current Site Build Configuration

This repository is deployed as a TanStack Start SSR app.

Expected Appwrite Site settings:

- framework: `tanstack-start`
- adapter: `ssr`
- install command: `npm install`
- build command: `npm run build`
- output directory: `./dist`
- build runtime: `node-22`
- provider branch: `main`
- provider root directory: `./`

## Updating the Site

The CLI `sites update` command behaves like a full update. Always pass the full
desired configuration, including unchanged values such as the site name and VCS
fields.

Template:

```bash
appwrite sites update \
  --site-id YOUR_SITE_ID \
  --name YOUR_SITE_NAME \
  --framework tanstack-start \
  --adapter ssr \
  --enabled true \
  --logging true \
  --timeout 30 \
  --install-command "npm install" \
  --build-command "npm run build" \
  --output-directory "./dist" \
  --build-runtime node-22 \
  --installation-id YOUR_INSTALLATION_ID \
  --provider-repository-id YOUR_PROVIDER_REPOSITORY_ID \
  --provider-branch main \
  --provider-root-directory "./" \
  --provider-silent-mode false \
  --specification YOUR_SPECIFICATION
```

Important:

- do not omit `--name`
- do not omit VCS-related fields if the site is GitHub-connected
- otherwise the CLI may blank those fields

## Variables

The migrated application uses Vite-style public variables.

That means site variables must use the `VITE_*` prefix, not `NEXT_PUBLIC_*`.

Source of truth:

- [/.env.example](/home/flo178/projects/agroforst-ff/.env.example)
- [/src/app/env.ts](/home/flo178/projects/agroforst-ff/src/app/env.ts)

List current variables:

```bash
appwrite sites list-variables --site-id YOUR_SITE_ID
```

Create a variable:

```bash
appwrite sites create-variable \
  --site-id YOUR_SITE_ID \
  --key VITE_APPWRITE_ENDPOINT \
  --value https://cloud.appwrite.io/v1 \
  --secret false
```

Update a variable:

```bash
appwrite sites update-variable \
  --site-id YOUR_SITE_ID \
  --variable-id YOUR_VARIABLE_ID \
  --key VITE_APPWRITE_ENDPOINT \
  --value https://cloud.appwrite.io/v1 \
  --secret false
```

Delete an obsolete variable:

```bash
appwrite sites delete-variable \
  --site-id YOUR_SITE_ID \
  --variable-id YOUR_VARIABLE_ID
```

Recommended migration path for variables:

1. list current variables
2. map each `NEXT_PUBLIC_*` variable to the corresponding `VITE_*` variable
3. create or update the `VITE_*` variables
4. remove obsolete `NEXT_PUBLIC_*` variables once the new deployment is green

## Triggering a Deployment

If the site is connected to GitHub, trigger a deployment from `main` with:

```bash
appwrite sites create-vcs-deployment \
  --site-id YOUR_SITE_ID \
  --type branch \
  --reference main \
  --activate true
```

List deployments:

```bash
appwrite sites list-deployments --site-id YOUR_SITE_ID
```

Inspect one deployment:

```bash
appwrite sites get-deployment \
  --site-id YOUR_SITE_ID \
  --deployment-id YOUR_DEPLOYMENT_ID
```

## Safe Workflow

Use this order:

1. `cd /home/flo178/projects/agroforst-ff`
2. `appwrite login`
3. `appwrite init project`
4. `appwrite sites list --search aff`
5. `appwrite sites update ...`
6. `appwrite sites list-variables --site-id ...`
7. update or create all required `VITE_*` variables
8. `appwrite sites create-vcs-deployment --site-id ... --type branch --reference main --activate true`

## Local Verification Before Deploy

Before changing the Appwrite Site, verify the app locally:

```bash
npm install
npm run build
npm run dev
npm run test:e2e
```

## Notes

- This repository is now on `main` with the `order-function` functionality and
  TanStack Start migration already merged.
- The Appwrite Site framework can be updated from the CLI.
- Variable migration still matters; framework changes alone are not enough.
- Never commit tokens, cookies, passwords, API keys, or copied CLI config files
  into the repository.
