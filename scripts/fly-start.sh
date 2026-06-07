#!/bin/sh
set -eu

: "${OPENCLAW_GATEWAY_TOKEN:?OPENCLAW_GATEWAY_TOKEN is required}"

export OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-/app/config/openclaw.fly.json5}"
export OPENCLAW_GATEWAY_URL="${OPENCLAW_GATEWAY_URL:-ws://127.0.0.1:18789}"
export PENNY_REPO_ROOT="${PENNY_REPO_ROOT:-/app}"
export PENNY_CORPUS_PATH="${PENNY_CORPUS_PATH:-/app/database/data/funding/curated/verified-programs.jsonl}"
export PENNY_PYTHON="${PENNY_PYTHON:-/app/.venv/bin/python}"

gateway_port="${OPENCLAW_GATEWAY_PORT:-18789}"
gateway_health_attempts="${OPENCLAW_GATEWAY_HEALTH_ATTEMPTS:-120}"
gateway_health_pid=""

openclaw gateway run \
  --bind loopback \
  --port "$gateway_port" \
  --auth token \
  --token "$OPENCLAW_GATEWAY_TOKEN" \
  --allow-unconfigured \
  --ws-log compact &
gateway_pid="$!"

cleanup() {
  if [ -n "$gateway_health_pid" ]; then
    kill "$gateway_health_pid" 2>/dev/null || true
  fi
  kill "$gateway_pid" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

watch_gateway_health() {
  attempt=0
  until openclaw gateway health >/dev/null 2>&1; do
    if ! kill -0 "$gateway_pid" 2>/dev/null; then
      echo "OpenClaw gateway exited before becoming healthy" >&2
      return
    fi
    attempt=$((attempt + 1))
    if [ "$attempt" -ge "$gateway_health_attempts" ]; then
      echo "OpenClaw gateway still warming after ${gateway_health_attempts}s" >&2
      return
    fi
    sleep 1
  done
  echo "OpenClaw gateway is healthy"
}

watch_gateway_health &
gateway_health_pid="$!"

node web/build
