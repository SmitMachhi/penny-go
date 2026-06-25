#!/usr/bin/env bash
# Verification ladder for Penny (database, plugin, reader, optional live agent runs).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_LIVE=0
SKIP_READER=0
KEEP_ARTIFACTS=0

usage() {
  cat <<'EOF'
Usage: scripts/verify_penny_phase1.sh [options]

Options:
  --live           Run live agent smoke prompts (uses Fireworks + Exa; costs API credits)
  --skip-reader    Skip Crawl4AI HTML/PDF smoke tests
  --keep-artifacts Leave /tmp penny-verify-* JSON outputs (default: delete on success)
  -h, --help       Show this help

Without --live, runs offline checks only (database, plugin tests, optional reader smoke).
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --live) RUN_LIVE=1 ;;
    --skip-reader) SKIP_READER=1 ;;
    --keep-artifacts) KEEP_ARTIFACTS=1 ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

step() {
  printf '\n==> %s\n' "$1"
}

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

step "E1 — funding database integrity"
(
  cd "${REPO_ROOT}/database"
  python3 scripts/verify_funding_corpus.py
) || fail "funding database verification failed"

step "E2 — plugin unit tests"
(
  cd "${REPO_ROOT}/plugin"
  npm test
) || fail "plugin tests failed"

if [[ "${SKIP_READER}" -eq 0 ]]; then
  step "E3 — reader smoke (HTML)"
  HTML_OUT="$(
    echo '{"url":"https://www.alberta.ca/alberta-agri-processing-investment-tax-credit"}' \
      | "${REPO_ROOT}/.venv/bin/python" "${REPO_ROOT}/tools/read_official_source.py" 2>/dev/null
  )"
  echo "${HTML_OUT}" | python3 -c "
import json, sys
data = json.load(sys.stdin)
assert data.get('success') is True, data
assert len(data.get('markdown') or '') > 0
print('  HTML reader OK')
" || fail "HTML reader smoke failed"

  step "E3 — reader smoke (PDF)"
  PDF_OUT="$(
    echo '{"url":"https://www.gov.nu.ca/sites/default/files/documents/2024-03/edt-2019-grants-and-contribution-policy.pdf"}' \
      | "${REPO_ROOT}/.venv/bin/python" "${REPO_ROOT}/tools/read_official_source.py" 2>/dev/null
  )"
  echo "${PDF_OUT}" | python3 -c "
import json, sys
data = json.load(sys.stdin)
assert data.get('success') is True, data
assert len(data.get('markdown') or '') > 0
print('  PDF reader OK')
" || fail "PDF reader smoke failed"
else
  step "E3 — reader smoke skipped (--skip-reader)"
fi

if [[ "${RUN_LIVE}" -eq 0 ]]; then
  step "E4/E5 — skipped (pass --live to run agent prompts)"
  printf '\nOffline ladder complete. Re-run with --live for agent smoke checks.\n'
  exit 0
fi

command -v openclaw >/dev/null 2>&1 || fail "openclaw CLI not found"

ARTIFACT_DIR="$(mktemp -d /tmp/penny-verify-XXXXXX)"
cleanup() {
  if [[ "${KEEP_ARTIFACTS}" -eq 1 || "${RUN_LIVE}" -eq 0 ]]; then
    printf 'Artifacts kept at %s\n' "${ARTIFACT_DIR}"
    return
  fi
  rm -rf "${ARTIFACT_DIR}"
}
trap cleanup EXIT

run_agent_scenario() {
  local scenario="$1"
  local session_id="$2"
  local message="$3"
  local json_out="${ARTIFACT_DIR}/${scenario}.json"

  step "E${4} — ${scenario} agent run"
  openclaw agent --local \
    --session-id "${session_id}" \
    --message "${message}" \
    --json >"${json_out}"

  printf '  agent JSON: %s\n' "${json_out}"
}

run_agent_scenario path-a penny-verify-path-a \
  "We're a 12-person SaaS company in Toronto hiring two senior developers in Q3. What government funding can help?" 4

run_agent_scenario path-b penny-verify-path-b \
  "We are a small Inuvik tourism business launching a new cultural experience program in 2026. What territorial or federal non-loan funding exists?" 5

printf '\nVerification ladder complete (offline + live agent smoke checks).\n'
