#!/bin/sh
set -eu

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
repo_root="$(CDPATH= cd -- "$script_dir/.." && pwd)"
stub_dir="$(mktemp -d)"
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

cat > "$stub_dir/mkdir" <<'STUB'
#!/bin/sh
set -eu

exit 0
STUB

chmod 700 "$stub_dir/openclaw" "$stub_dir/node" "$stub_dir/mkdir"

export PATH="$stub_dir:$PATH"
export OPENCLAW_GATEWAY_TOKEN="test-token"
export OPENCLAW_GATEWAY_PORT="28941"
export OPENCLAW_GATEWAY_URL="ws://127.0.0.1:18789"
export OPENCLAW_GATEWAY_HEALTH_ATTEMPTS="3"
export PENNY_FLY_START_TEST_LOG="$log_file"
export PENNY_FLY_START_GATEWAY_READY="$stub_dir/gateway-ready"

sh "$repo_root/scripts/fly-start.sh"

grep -F -- "--port 28941" "$log_file" >/dev/null
grep -F -- "node:ws://127.0.0.1:28941" "$log_file" >/dev/null

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
