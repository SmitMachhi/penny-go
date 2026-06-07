#!/bin/sh
set -eu

: "${OPENCLAW_GATEWAY_TOKEN:?OPENCLAW_GATEWAY_TOKEN is required}"

export OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-/app/config/openclaw.fly.json5}"
export OPENCLAW_GATEWAY_URL="${OPENCLAW_GATEWAY_URL:-ws://127.0.0.1:18789}"
export PENNY_REPO_ROOT="${PENNY_REPO_ROOT:-/app}"
export PENNY_CORPUS_PATH="${PENNY_CORPUS_PATH:-/app/database/data/funding/curated/verified-programs.jsonl}"
export PENNY_PYTHON="${PENNY_PYTHON:-/app/.venv/bin/python}"

openclaw gateway run \
  --bind loopback \
  --port 18789 \
  --auth token \
  --token "$OPENCLAW_GATEWAY_TOKEN" \
  --allow-unconfigured \
  --ws-log compact &
gateway_pid="$!"

cleanup() {
  kill "$gateway_pid" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

attempt=0
until openclaw gateway health >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    echo "OpenClaw gateway failed to become healthy" >&2
    exit 1
  fi
  sleep 1
done

node web/build
