#!/bin/sh
set -eu

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
repo_root="$(CDPATH= cd -- "$script_dir/.." && pwd)"
stub_dir="$(mktemp -d)"
app_root="$stub_dir/app"
log_file="$stub_dir/calls.log"

cleanup() {
  rm -rf "$stub_dir"
}
trap cleanup EXIT

cat > "$stub_dir/openclaw" <<'STUB'
#!/bin/sh
set -eu

printf 'openclaw:%s\n' "$*" >> "$PENNY_FLY_START_TEST_LOG"

if [ "${1:-}" = "gateway" ] && [ "${2:-}" = "run" ]; then
  touch "$PENNY_FLY_START_GATEWAY_READY"
  while :; do
    sleep 1
  done
fi

if [ "${1:-}" = "gateway" ] && [ "${2:-}" = "health" ]; then
  [ -f "$PENNY_FLY_START_GATEWAY_READY" ]
  exit $?
fi
STUB

cat > "$stub_dir/node" <<'STUB'
#!/bin/sh
set -eu

printf 'node:%s\n' "$OPENCLAW_GATEWAY_URL" >> "$PENNY_FLY_START_TEST_LOG"
exit 0
STUB

chmod 700 "$stub_dir/openclaw" "$stub_dir/node"

export PATH="$stub_dir:$PATH"
export PENNY_APP_ROOT="$app_root"
export OPENCLAW_GATEWAY_TOKEN="test-token"
export OPENCLAW_GATEWAY_PORT="28941"
export OPENCLAW_GATEWAY_URL="ws://127.0.0.1:18789"
export OPENCLAW_GATEWAY_HEALTH_ATTEMPTS="3"
export PENNY_FLY_START_TEST_LOG="$log_file"
export PENNY_FLY_START_GATEWAY_READY="$stub_dir/gateway-ready"

mkdir -p "$app_root/workspace.seed" "$app_root/workspace"
printf 'seed agents\n' > "$app_root/workspace.seed/AGENTS.md"
printf 'seed identity\n' > "$app_root/workspace.seed/IDENTITY.md"
printf 'seed soul\n' > "$app_root/workspace.seed/SOUL.md"
printf 'seed tools\n' > "$app_root/workspace.seed/TOOLS.md"
printf 'seed heartbeat\n' > "$app_root/workspace.seed/HEARTBEAT.md"
printf 'seed memory\n' > "$app_root/workspace.seed/MEMORY.md"
printf 'seed user\n' > "$app_root/workspace.seed/USER.md"
printf 'stale agents\n' > "$app_root/workspace/AGENTS.md"
printf 'stale identity\n' > "$app_root/workspace/IDENTITY.md"
printf 'stale soul\n' > "$app_root/workspace/SOUL.md"
printf 'stale tools\n' > "$app_root/workspace/TOOLS.md"
printf 'existing heartbeat\n' > "$app_root/workspace/HEARTBEAT.md"
printf 'existing memory\n' > "$app_root/workspace/MEMORY.md"
printf 'existing user\n' > "$app_root/workspace/USER.md"

sh "$repo_root/scripts/fly-start.sh"

grep -F -- "--port 28941" "$log_file" >/dev/null
grep -F -- "node:ws://127.0.0.1:28941" "$log_file" >/dev/null
grep -F -- "seed agents" "$app_root/workspace/AGENTS.md" >/dev/null
grep -F -- "seed identity" "$app_root/workspace/IDENTITY.md" >/dev/null
grep -F -- "seed soul" "$app_root/workspace/SOUL.md" >/dev/null
grep -F -- "seed tools" "$app_root/workspace/TOOLS.md" >/dev/null
grep -F -- "existing heartbeat" "$app_root/workspace/HEARTBEAT.md" >/dev/null
grep -F -- "existing memory" "$app_root/workspace/MEMORY.md" >/dev/null
grep -F -- "existing user" "$app_root/workspace/USER.md" >/dev/null

rm -f "$log_file" "$PENNY_FLY_START_GATEWAY_READY"
unset OPENCLAW_GATEWAY_PORT
unset OPENCLAW_GATEWAY_URL

sh "$repo_root/scripts/fly-start.sh"

if grep -F -- "--port 18789" "$log_file" >/dev/null; then
  echo "expected Fly startup to avoid the default OpenClaw gateway port" >&2
  exit 1
fi

if grep -F -- "node:ws://127.0.0.1:18789" "$log_file" >/dev/null; then
  echo "expected Fly startup to export a non-default gateway URL" >&2
  exit 1
fi
