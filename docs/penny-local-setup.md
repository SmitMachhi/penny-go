# Penny Phase 1 — Local brain setup

Goal: run Penny as an OpenClaw agent on your laptop. She searches the curated JSONL corpus, verifies every suggestion with Crawl4AI (`read_official_source`), and may use Exa `web_search` only when corpus results are insufficient.

This document matches the Phase 1 plan: no Fly.io, no SvelteKit.

## Prerequisites

| Requirement | Notes |
| ----------- | ----- |
| Node.js | 22.x or newer (`node -v`) |
| OpenClaw CLI | `npm install -g openclaw@latest` |
| Python | 3.11+ for Crawl4AI |
| API keys | `DEEPSEEK_API_KEY`, `EXA_API_KEY` (usually in `~/.openclaw/.env`; see §5 DeepSeek) |

## Repo layout involved

| Path | Role |
| ---- | ---- |
| `workspace/` | Agent Markdown home (`AGENTS.md`, `SOUL.md`, skill) |
| `plugin/` | `penny-tools` OpenClaw plugin (`search_corpus`, `read_official_source`) |
| `tools/read_official_source.py` | Crawl4AI reader (stdin/stdout JSON) |
| `database/data/funding/curated/verified-programs.jsonl` | Corpus |
| `config/openclaw.penny.example.json5` | Example gateway merge snippet |

## 1. OpenClaw baseline

```bash
npm install -g openclaw@latest
openclaw onboard
```

That creates `~/.openclaw/openclaw.json`.

## 2. Environment (`~/.openclaw/.env`)

Use the repo root `.env.example` as a checklist. Minimum:

```
DEEPSEEK_API_KEY=...
EXA_API_KEY=...

PENNY_REPO_ROOT=/ABSOLUTE_PATH_TO/penny-go
PENNY_CORPUS_PATH=/ABSOLUTE_PATH_TO/penny-go/database/data/funding/curated/verified-programs.jsonl
PENNY_PYTHON=/ABSOLUTE_PATH_TO/penny-go/.venv/bin/python
```

`PENNY_*` overrides are optional when the plugin `config` in `openclaw.json` sets `repoRoot`, `corpusPath`, and `pythonPath`.

## 3. Python venv + Crawl4AI

From the repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r tools/requirements-read-official-source.txt
crawl4ai-setup
```

`crawl4ai-setup` pulls Playwright browser binaries Crawl4AI expects.

Quick reader smoke (downloads real pages):

```bash
echo '{"url":"https://www.alberta.ca/alberta-agri-processing-investment-tax-credit"}' \
  | .venv/bin/python tools/read_official_source.py

echo '{"url":"https://www.gov.nu.ca/sites/default/files/documents/2024-03/edt-2019-grants-and-contribution-policy.pdf"}' \
  | .venv/bin/python tools/read_official_source.py
```

Each run should print JSON with `"success": true` and non-empty `"markdown"` for live government hosts.

### Reader troubleshooting

| Symptom | Fix |
| ------- | --- |
| `ModuleNotFoundError: crawl4ai` | Activate the venv, re-run `pip install -r tools/requirements-read-official-source.txt` |
| Browser / Chromium errors after install | Run `crawl4ai-setup` again; confirm disk space |
| Very slow first fetch | Warm up once manually with the URLs above |

## 4. Build + install `penny-tools`

```bash
cd plugin
npm install
npm test
npm run plugin:build
npm run plugin:validate
```

Install for the Gateway’s Node runtime (link the checkout; child_process in the reader triggers OpenClaw’s safety gate):

```bash
openclaw plugins install --link --dangerously-force-unsafe-install /ABSOLUTE_PATH_TO/penny-go/plugin
openclaw plugins inspect penny-tools --runtime --json
```

Rebuild after edits: `npm run build && npm run plugin:build`.

## 5. Merge Penny gateway config

Open `config/openclaw.penny.example.json5` and manually merge keys into `~/.openclaw/openclaw.json`:

- Restrict tools to corpus + verifier + web search via explicit **`tools.allow`** only (do **not** combine `tools.profile: minimal` with `tools.allow` — OpenClaw intersects those policies and you end up with zero tools)
- Set **`plugins.enabled: true`** and **`plugins.allow: ["penny-tools", "exa"]`**
- Disable `web.fetch` so the model cannot replace `read_official_source`
- Enable `plugins.entries.exa`
- Enable `plugins.entries["penny-tools"]` with your absolute paths

Restart:

```bash
openclaw gateway restart
openclaw skills list
openclaw plugins inspect penny-tools --runtime
```

### DeepSeek API key (where it actually lives)

OpenClaw’s DeepSeek integration uses the environment variable **`DEEPSEEK_API_KEY`** (documented in OpenClaw under the `deepseek` provider).

**Recommended (interactive):**

```bash
openclaw onboard --auth-choice deepseek-api-key
```

That stores auth in your OpenClaw profile and sets `deepseek/deepseek-v4-flash` as a sensible default model.

**Recommended (file the gateway can read):** add the same variable to **`~/.openclaw/.env`**:

```
DEEPSEEK_API_KEY=sk-...
```

If the gateway runs as a launchd/systemd service, that file (or your process manager’s env) must provide `DEEPSEEK_API_KEY`, or the daemon will not see shell-only exports.

**Headless / CI-style one-liner:**

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice deepseek-api-key \
  --deepseek-api-key "$DEEPSEEK_API_KEY" \
  --skip-health \
  --accept-risk
```

Merge `config/openclaw.penny.example.json5` so `agents.defaults.model.primary` stays `deepseek/deepseek-v4-flash`. Then confirm the catalog:

```bash
openclaw models list --provider deepseek
```

### Exa

If `web_search` fails, confirm `EXA_API_KEY` is loaded into the Gateway environment (typically via `~/.openclaw/.env`).

## 6. Verification ladder (do in order)

### 6a — Corpus integrity

```bash
cd database
python3 scripts/verify_funding_corpus.py
```

Expect `verified_profiles 331` and jurisdiction counts unchanged from your baseline.

### 6b — Plugin unit tests

```bash
cd plugin && npm test
```

### 6c — Crawl smoke

Use section **3** HTML + PDF commands.

### 6d — Path A — Ontario SaaS hiring

Use **embedded mode** for Phase 1 tasting (no gateway daemon required):

```bash
openclaw agent --local \
  --session-id penny-path-a \
  --message "We're a 12-person SaaS company in Toronto hiring two senior developers in Q3. What government funding can help?" \
  --json
```

Pass when the transcript shows:

1. `search_corpus` before any `web_search`
2. `read_official_source` ≥ once per recommendation
3. No loan products and no hallucinated eligibility

### 6e — Path B — Niche territorial corpus miss

```bash
openclaw agent --local \
  --session-id penny-path-b \
  --message "We are a small Inuvik tourism business launching a new cultural experience program in 2026. What territorial or federal non-loan funding exists?" \
  --json
```

Pass when corpus-first behavior remains, weak corpus hits escalate to scoped `web_search`, and discovery routes through `read_official_source`.

**Note:** these full-agent runs require a live model session (Gateway plus keys, or `openclaw agent --local` with working DeepSeek auth). The repo cannot complete 6d/6e in CI without your secrets.

## 7. Web chat UI (Phase 2)

SvelteKit app in `web/` — browser chat against the OpenClaw gateway via a server-side BFF (gateway token never reaches the browser).

```bash
openclaw gateway
cd web && cp .env.example .env   # set OPENCLAW_GATEWAY_TOKEN
npm install && npm run dev
```

Open http://localhost:5173. See **`web/README.md`** for API routes, env vars, and tests.

Regression ladder (offline + optional live agent runs):

```bash
./scripts/verify_penny_phase1.sh --skip-reader
./scripts/verify_penny_phase1.sh --live
```

## What we deliberately skip here

Fly deployments, corpus refresh cron jobs, and auxiliary fetch/browser/exec tools—all deferred to later phases.
