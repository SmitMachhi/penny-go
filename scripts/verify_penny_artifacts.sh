#!/usr/bin/env bash
# Artifact feature verification: shared tests, plugin tests, brief generation smoke.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_PDF=0

usage() {
  cat <<'EOF'
Usage: scripts/verify_penny_artifacts.sh [options]

Options:
  --skip-pdf   Accept document-only success when Playwright PDF render is unavailable
  -h, --help   Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-pdf) SKIP_PDF=1 ;;
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

step "A1 — shared contract tests"
(
  cd "${REPO_ROOT}/shared"
  npm test
) || fail "shared tests failed"

step "A2 — plugin tests (artifact storage + tool validation)"
(
  cd "${REPO_ROOT}/plugin"
  npm test
) || fail "plugin tests failed"

step "A3 — web BFF tests"
(
  cd "${REPO_ROOT}/web"
  npm test
) || fail "web tests failed"

step "A4 — create_funding_brief smoke"
export PENNY_REPO_ROOT="${REPO_ROOT}"
if [[ -x "${REPO_ROOT}/.venv/bin/python" ]]; then
  export PENNY_PYTHON="${REPO_ROOT}/.venv/bin/python"
fi

SMOKE_OUT="$(
  PENNY_SKIP_PDF="${SKIP_PDF}" node "${REPO_ROOT}/scripts/verify-artifact-create.mjs"
)" || fail "artifact create smoke failed"

echo "${SMOKE_OUT}"

PDF_OK="$(echo "${SMOKE_OUT}" | python3 -c "import json,sys; print(json.load(sys.stdin).get('pdfOk', False))")"
if [[ "${PDF_OK}" != "True" && "${SKIP_PDF}" -eq 0 ]]; then
  fail "PDF render failed — run crawl4ai-setup / install Playwright, or pass --skip-pdf"
fi

step "A5 — cross-device persistence checklist (manual)"
cat <<'EOF'
  [ ] Deploy BFF + gateway with shared PENNY_REPO_ROOT volume
  [ ] Create artifact on desktop session in web UI
  [ ] Open same session on mobile viewport — artifact list + preview load
  [ ] Download PDF from artifact toolbar
EOF

printf '\nArtifact verification passed.\n'
