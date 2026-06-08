#!/bin/sh
set -eu

: "${OPENCLAW_GATEWAY_TOKEN:?OPENCLAW_GATEWAY_TOKEN is required}"

ephemeral_port_min="49152"
ephemeral_port_span="16384"
app_root="${PENNY_APP_ROOT:-/app}"
workspace_dir="$app_root/workspace"
seed_workspace_dir="$app_root/workspace.seed"

random_gateway_port() {
  random_value="$(od -An -N4 -tu4 /dev/urandom | tr -d ' ')"
  echo $((ephemeral_port_min + random_value % ephemeral_port_span))
}

gateway_port="${OPENCLAW_GATEWAY_PORT:-}"
if [ -z "$gateway_port" ]; then
  gateway_port="$(random_gateway_port)"
fi

export OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-$app_root/config/openclaw.fly.json5}"
export OPENCLAW_GATEWAY_URL="ws://127.0.0.1:${gateway_port}"
export OPENCLAW_GATEWAY_PORT="$gateway_port"
export OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR:-$workspace_dir/.openclaw-state}"
export PENNY_REPO_ROOT="${PENNY_REPO_ROOT:-$app_root}"
export PENNY_CORPUS_PATH="${PENNY_CORPUS_PATH:-$app_root/database/data/funding/curated/verified-programs.jsonl}"
export PENNY_PYTHON="${PENNY_PYTHON:-$app_root/.venv/bin/python}"

gateway_health_attempts="${OPENCLAW_GATEWAY_HEALTH_ATTEMPTS:-120}"
gateway_health_pid=""

seed_workspace() {
  mkdir -p "$workspace_dir/memory/engagements"
  mkdir -p "$OPENCLAW_STATE_DIR"
  if [ ! -d "$seed_workspace_dir" ]; then
    return
  fi

  for workspace_file in AGENTS.md IDENTITY.md SOUL.md TOOLS.md; do
    if [ -f "$seed_workspace_dir/$workspace_file" ]; then
      cp "$seed_workspace_dir/$workspace_file" "$workspace_dir/$workspace_file"
    fi
  done

  for workspace_file in HEARTBEAT.md MEMORY.md USER.md; do
    if [ -f "$seed_workspace_dir/$workspace_file" ] && [ ! -f "$workspace_dir/$workspace_file" ]; then
      cp "$seed_workspace_dir/$workspace_file" "$workspace_dir/$workspace_file"
    fi
  done

  if [ -d "$seed_workspace_dir/skills" ]; then
    rm -rf "$workspace_dir/skills"
    cp -a "$seed_workspace_dir/skills" "$workspace_dir/skills"
  fi
}

seed_workspace

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
