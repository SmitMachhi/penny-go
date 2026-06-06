# Penny Phase 1 — Local brain setup

Goal: run Penny as an OpenClaw agent on your laptop. She searches the curated JSONL corpus, verifies every suggestion with Crawl4AI (`read_official_source`), and may use Exa `web_search` only when corpus results are insufficient.

This document matches the Phase 1 plan: no Fly.io, no SvelteKit.

## Prerequisites

| Requirement | Notes |
| ----------- | ----- |
| Node.js | 22.x or newer (`node -v`) |
| OpenClaw CLI | `npm install -g openclaw@latest` |
| Python | 3.11+ for Crawl4AI |
| API keys | `OPENROUTER_API_KEY`, `EXA_API_KEY` (usually in `~/.openclaw/.env`; see §5 Model provider) |

## Repo layout involved

| Path | Role |
| ---- | ---- |
| `workspace/` | Agent Markdown home (`AGENTS.md`, `SOUL.md`, skills including stop-slop) |
| `plugin/` | `penny-tools` OpenClaw plugin (`search_corpus`, `read_official_source`, `create_funding_brief`) |
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
OPENROUTER_API_KEY=...
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
- Use `agents.defaults.model.primary: "openrouter/moonshotai/kimi-k2.6"` for the default OpenRouter setup
- Keep the `openrouter/moonshotai/kimi-k2.6` model entry pinned to `params.provider.order: ["wandb/fp4"]` with `allow_fallbacks: false`
- Keep `params.reasoning.effort: "high"` on that model entry so Kimi K2.6 uses high reasoning
- Keep `params.max_tokens: 16384` on that model entry so Kimi's output budget does not overflow Penny's normal prompt

Restart:

```bash
openclaw gateway restart
openclaw skills list
openclaw plugins inspect penny-tools --runtime
```

### Model provider key (where it actually lives)

Penny defaults to OpenRouter with **`openrouter/moonshotai/kimi-k2.6`**, pinned to the **`wandb/fp4`** OpenRouter endpoint. OpenClaw resolves OpenRouter auth from **`OPENROUTER_API_KEY`**.

**Recommended (interactive):**

```bash
openclaw models auth login --provider openrouter
```

That stores OpenRouter auth in your OpenClaw profile.

**Recommended (file the gateway can read):** add the same variable to **`~/.openclaw/.env`**:

```
OPENROUTER_API_KEY=sk-or-...
```

If the gateway runs as a launchd/systemd service, that file (or your process manager’s env) must provide `OPENROUTER_API_KEY`, or the daemon will not see shell-only exports.

Merge `config/openclaw.penny.example.json5` so `agents.defaults.model.primary` is `openrouter/moonshotai/kimi-k2.6` and the model entry has `params.provider.order: ["wandb/fp4"]`. Then confirm the catalog:

```bash
openclaw models list --provider openrouter
```

To switch back to DeepSeek later, set `agents.defaults.model.primary` to `deepseek/deepseek-v4-flash`, provide **`DEEPSEEK_API_KEY`**, restart the gateway, and confirm the catalog:

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

### 6d — Corpus hit — Ontario SaaS hiring

Use **embedded mode** for Phase 1 tasting (no gateway daemon required):

```bash
openclaw agent --local \
  --session-id penny-corpus-hit \
  --message "We're a 12-person SaaS company in Toronto hiring two senior developers in Q3. What government funding can help?" \
  --json
```

Pass when the transcript shows:

1. `search_corpus` before any `web_search`
2. `read_official_source` ≥ once per recommendation
3. No loan products and no hallucinated eligibility

### 6e — Corpus miss — Niche territorial search

```bash
openclaw agent --local \
  --session-id penny-corpus-miss \
  --message "We are a small Inuvik tourism business launching a new cultural experience program in 2026. What territorial or federal non-loan funding exists?" \
  --json
```

Pass when corpus-first behavior remains, weak corpus hits escalate to scoped `web_search`, and discovery routes through `read_official_source`.

### 6f — Consultation mode: opportunity-backed

```bash
openclaw agent --local \
  --session-id penny-opportunity-backed \
  --message "I have a B2B SaaS company in Ontario with 8 employees. Find verified grants and ITCs and put a funding-aligned operating plan in the artifact with plan alignment for our business." \
  --json
```

Pass when:

1. Engagement memory or transcript reflects **opportunity-backed** intake
2. `create_funding_brief` artifact includes `## Plan alignment` (or equivalent alignment section)
3. Evidence trace unchanged (corpus → verify)

### 6g — Consultation mode: aspiration-first

```bash
openclaw agent --local \
  --session-id penny-aspiration-first \
  --message "I want to start a tourism experience business in the Northwest Territories. Find verified non-loan funding and propose a business shape I can build toward, then create the funding plan artifact." \
  --json
```

Pass when:

1. **Aspiration-first** intake (industry + location)
2. Artifact includes `## Recommended business shape` and `## Launch strategy` (or honest thin corpus note)
3. Corpus miss escalates to `web_search` only when needed

**Note:** full-agent runs (6d–6g) require a live model session (Gateway plus keys, or `openclaw agent --local` with working model auth). The repo cannot complete them in CI without your secrets.

Ensure `agents.defaults.skills` includes **`penny-consultation-modes`**, **`penny-funding`**, **`penny-artifacts`**, and **`stop-slop`** (see `config/openclaw.penny.example.json5`).

## 7. Web chat UI (Phase 2)

SvelteKit app in `web/` — browser chat against the OpenClaw gateway via a server-side BFF (gateway token never reaches the browser).

**Multi-session:** the web UI supports ChatGPT-style chats — one session per business engagement (`agent:main:penny:<uuid>`). User preferences stay in `USER.md`; business facts go in `workspace/memory/engagements/<uuid>.md`. A legacy single chat (`agent:main:main`) appears once as **Previous chat** if it has history and no penny sessions exist yet.

**URLs:** `/` is the home screen (no chat loaded). Each chat opens at `/c/{uuid}` (legacy: `/c/legacy`). The agent receives the matching `sessionKey` on every send.

**Transcript persistence:** merge the `session.reset` block from [`config/openclaw.penny.example.json5`](../config/openclaw.penny.example.json5) into `~/.openclaw/openclaw.json` and restart the gateway. OpenClaw defaults to a daily transcript reset at 4 AM; the example switches Penny to a valid one-week idle reset so active conversations survive across days.

```bash
openclaw gateway
cd web && cp .env.example .env   # set OPENCLAW_GATEWAY_TOKEN
npm install && npm run dev
```

Open http://localhost:5173. See **`web/README.md`** for API routes, env vars, and tests.

**Artifacts:** after verified recommendations, Penny can create a funding brief document in the right panel (scrollable preview + PDF download). See **`docs/penny-artifacts.md`**. Ensure `create_funding_brief` is in `tools.allow` and `penny-artifacts` is in `agents.defaults.skills`.

**Voice:** anti–AI-slop rules are in **`workspace/SOUL.md`** (always in context). Full checklist: **`workspace/skills/stop-slop/`**. Add `stop-slop` to `agents.defaults.skills` when merging `config/openclaw.penny.example.json5`.

Regression ladder (offline + optional live agent runs):

```bash
./scripts/verify_penny_phase1.sh --skip-reader
./scripts/verify_penny_phase1.sh --live
./scripts/verify_penny_artifacts.sh
```

## Behavioral baseline eval

The 50-case consultant-quality baseline lives in `evals/penny-behavioral-baseline/`.
Use it when measuring whether Penny gives specific, verified, fit-banded Canadian business funding advice instead of generic program lists.

## What we deliberately skip here

Fly deployments, corpus refresh cron jobs, and auxiliary fetch/browser/exec tools—all deferred to later phases.
