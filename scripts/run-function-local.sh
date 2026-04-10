#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -lt 1 ] || [ "$#" -gt 3 ]; then
    echo "Usage: scripts/run-function-local.sh <function-id> [user-id] [port]" >&2
    exit 1
fi

function_id="$1"
user_id="${2:-local-dev-user}"
port="${3:-8091}"
function_dir="functions/$function_id"
project_env_file=".env"
runtime_env_file="$function_dir/.env"

if ! command -v appwrite >/dev/null 2>&1; then
    echo "Missing 'appwrite' CLI in PATH." >&2
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "Missing 'docker' in PATH." >&2
    exit 1
fi

if [ ! -f "appwrite.config.json" ]; then
    echo "Missing appwrite.config.json in repo root." >&2
    exit 1
fi

if [ ! -d "$function_dir" ]; then
    echo "Function directory '$function_dir' does not exist." >&2
    exit 1
fi

if [ ! -f "$project_env_file" ]; then
    echo "Missing $project_env_file" >&2
    echo "Create it first from .env.example." >&2
    exit 1
fi

set -a
. "$project_env_file"
set +a

if ! grep -Eq '^APPWRITE_API_KEY=' "$project_env_file"; then
    echo "No Appwrite API key found in $project_env_file" >&2
    echo "Add APPWRITE_API_KEY=<your_key> before running local tests." >&2
    exit 1
fi

awk -v section="$function_id" '
BEGIN {
    in_global = 0
    in_section = 0
}
/^# \[appwrite-functions\][[:space:]]*$/ {
    in_global = 1
    in_section = 0
    next
}
$0 ~ "^# \\[" section "\\][[:space:]]*$" {
    in_global = 0
    in_section = 1
    next
}
/^# \[[^]]+\][[:space:]]*$/ {
    in_global = 0
    in_section = 0
    next
}
{
    if ((in_global || in_section) && $0 !~ /^[[:space:]]*$/) {
        print
    }
}
' "$project_env_file" > "$runtime_env_file.tmp" || {
    status="$?"
    rm -f "$runtime_env_file.tmp"
    exit "$status"
}

emit_defaults() {
    node --input-type=module <<'NODE'
import config from "./appwrite.config.json" with { type: "json" };

const database = config.tablesDB?.[0];
const bucket = config.buckets?.[0];

if (!database?.$id || !bucket?.$id) {
  throw new Error("appwrite.config.json must define one database and one bucket.");
}

const lines = [
  `APPWRITE_DATABASE_ID=${database.$id}`,
  `APPWRITE_BUCKET_PRODUCT_IMAGES_ID=${bucket.$id}`,
  "APPWRITE_TABLE_PRODUCTS_ID=produkte",
  "APPWRITE_TABLE_OFFERS_ID=angebote",
  "APPWRITE_TABLE_MEMBERSHIPS_ID=mitgliedschaften",
  "APPWRITE_TABLE_PAYMENTS_ID=mitgliedschaftszahlungen",
  "APPWRITE_TABLE_ORDERS_ID=bestellungen",
  "APPWRITE_TABLE_PICKUP_CONFIG_ID=abholkonfiguration",
  "APPWRITE_TABLE_BLOG_POSTS_ID=blog_beitraege",
  "APPWRITE_TABLE_CUSTOMER_MESSAGES_ID=kunden_nachrichten",
  "APPWRITE_TABLE_BACKOFFICE_EVENTS_ID=backoffice_ereignisse",
];

process.stdout.write(`${lines.join("\n")}\n`);
NODE
}

{
    printf 'APPWRITE_FUNCTION_API_KEY=%s\n' "${APPWRITE_API_KEY:-}"
    printf 'APPWRITE_FUNCTION_API_ENDPOINT=%s\n' "${VITE_APPWRITE_ENDPOINT:-}"
    printf 'APPWRITE_FUNCTION_PROJECT_ID=%s\n' "${VITE_APPWRITE_PROJECT_ID:-}"
    emit_defaults
    cat "$runtime_env_file.tmp"
} > "$runtime_env_file"
rm -f "$runtime_env_file.tmp"

echo "Running Appwrite function '$function_id' on http://localhost:$port/ as user '$user_id'"
echo "Using function settings from $project_env_file"
exec appwrite run function --function-id "$function_id" --user-id "$user_id" --port "$port"
