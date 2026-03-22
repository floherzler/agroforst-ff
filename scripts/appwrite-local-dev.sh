#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -lt 1 ] || [ "$#" -gt 3 ]; then
    echo "Usage: scripts/appwrite-local-dev.sh <function-id> [user-id] [port]" >&2
    exit 1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
requested_function_id="$1"
user_id="${2:-local-dev-user}"
port="${3:-8091}"
project_env_file="$repo_root/.env"
workspace="$repo_root/.appwrite-local"
manifest_file="$repo_root/functions/local-manifest.json"

case "$requested_function_id" in
    placeOrder|createOrder)
        function_id="createOrder"
        ;;
    *)
        function_id="$requested_function_id"
        ;;
esac

if ! command -v appwrite >/dev/null 2>&1; then
    echo "Missing 'appwrite' CLI in PATH." >&2
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "Missing 'docker' in PATH." >&2
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

appwrite_cli_endpoint="${VITE_APPWRITE_ENDPOINT:-}"
appwrite_cli_project_id="${VITE_APPWRITE_PROJECT_ID:-}"
appwrite_cli_key="${APPWRITE_API_KEY:-}"

: "${appwrite_cli_endpoint:?Missing VITE_APPWRITE_ENDPOINT in .env}"
: "${appwrite_cli_project_id:?Missing VITE_APPWRITE_PROJECT_ID in .env}"
: "${appwrite_cli_key:?Missing APPWRITE_API_KEY in .env}"

mkdir -p "$workspace"
cp "$project_env_file" "$workspace/.env"
cat > "$workspace/appwrite.config.json" <<EOF
{
  "projectId": "$appwrite_cli_project_id"
}
EOF

echo "Configuring Appwrite CLI for project $appwrite_cli_project_id"
appwrite client \
    --endpoint "$appwrite_cli_endpoint" \
    --project-id "$appwrite_cli_project_id" \
    --key "$appwrite_cli_key" >/dev/null

needs_sync=0
if [ ! -d "$workspace/functions/$function_id" ]; then
    needs_sync=1
fi
if [ "${APPWRITE_LOCAL_REFRESH:-0}" = "1" ]; then
    needs_sync=1
fi
if ! grep -q '"functions"' "$workspace/appwrite.config.json" 2>/dev/null; then
    needs_sync=1
fi

if [ "$needs_sync" = "1" ]; then
    echo "Syncing Appwrite functions into $workspace"
    python3 - "$workspace" <<'PY'
import os
import pty
import select
import subprocess
import sys

workspace = sys.argv[1]
cmd = ["appwrite", "pull", "functions", "--with-variables"]
master, slave = pty.openpty()
proc = subprocess.Popen(
    cmd,
    cwd=workspace,
    stdin=slave,
    stdout=slave,
    stderr=slave,
    close_fds=True,
)
os.close(slave)
buffer = ""
selected = False
confirmed = False

while True:
    ready, _, _ = select.select([master], [], [], 0.1)
    if master in ready:
        try:
            data = os.read(master, 4096)
        except OSError:
            break
        if not data:
            break
        text = data.decode(errors="ignore")
        sys.stdout.write(text)
        sys.stdout.flush()
        buffer = (buffer + text)[-12000:]
        lower = buffer.lower()
        if "which functions would you like to pull?" in lower and not selected:
            os.write(master, b"a\r")
            selected = True
        if "do you want to pull source code of the latest deployment?" in lower and not confirmed:
            os.write(master, b"y\r")
            confirmed = True

    if proc.poll() is not None:
        break

os.close(master)
sys.exit(proc.wait())
PY
fi

python3 "$repo_root/scripts/prepare-local-functions.py" \
    "$repo_root" \
    "$workspace" \
    "$manifest_file"

if [ ! -d "$workspace/functions/$function_id" ]; then
    echo "Function '$function_id' not found after sync." >&2
    exit 1
fi

cd "$workspace"
if [ "$requested_function_id" != "$function_id" ]; then
    cp "$project_env_file" "$workspace/.env"
    printf '\n# [%s]\n' "$function_id" >> "$workspace/.env"
    awk -v section="$requested_function_id" '
    $0 ~ "^# \\[" section "\\][[:space:]]*$" { in_section = 1; next }
    /^# \[[^]]+\][[:space:]]*$/ { if (in_section) exit; in_section = 0 }
    in_section { print }
    ' "$project_env_file" >> "$workspace/.env"
fi
exec "$repo_root/scripts/run-function-local.sh" "$function_id" "$user_id" "$port"
