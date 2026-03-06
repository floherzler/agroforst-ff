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
    case "$function_id" in
        addProdukt)
            printf 'APPWRITE_FUNCTION_DATABASE_ID=%s\n' "${VITE_DATABASE_ID:-}"
            printf 'APPWRITE_FUNCTION_PRODUCE_COLLECTION_ID=%s\n' "${VITE_PRODUCE_COLLECTION_ID:-}"
            ;;
        addAngebot)
            printf 'APPWRITE_FUNCTION_DATABASE_ID=%s\n' "${VITE_DATABASE_ID:-}"
            printf 'APPWRITE_FUNCTION_STAFFEL_COLLECTION_ID=%s\n' "${VITE_STAFFEL_COLLECTION_ID:-}"
            printf 'APPWRITE_FUNCTION_PRODUCE_COLLECTION_ID=%s\n' "${VITE_PRODUCE_COLLECTION_ID:-}"
            ;;
        createMembership)
            printf 'APPWRITE_FUNCTION_DATABASE_ID=%s\n' "${VITE_DATABASE_ID:-}"
            ;;
        verifyPayment)
            printf 'APPWRITE_FUNCTION_DATABASE_ID=%s\n' "${VITE_DATABASE_ID:-}"
            printf 'APPWRITE_FUNCTION_PAYMENT_COLLECTION_ID=%s\n' "${VITE_PAYMENT_COLLECTION_ID:-}"
            printf 'APPWRITE_FUNCTION_MEMBERSHIP_COLLECTION_ID=%s\n' "${VITE_MEMBERSHIP_COLLECTION_ID:-}"
            ;;
        createOrder)
            printf 'DB_ID=%s\n' "${VITE_DATABASE_ID:-}"
            printf 'COLL_ANGEBOTE=%s\n' "${VITE_STAFFEL_COLLECTION_ID:-}"
            printf 'COLL_BESTELLUNG=%s\n' "${VITE_ORDER_COLLECTION_ID:-}"
            printf 'COLL_MITGLIEDSCHAFT=%s\n' "${VITE_MEMBERSHIP_COLLECTION_ID:-}"
            printf 'COLL_PRODUKTE=%s\n' "${VITE_PRODUCE_COLLECTION_ID:-}"
            printf 'COLL_NOTIFICATIONS=nachrichten\n'
            printf 'ADMIN_EMAIL=\n'
            ;;
    esac
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
