# Penny local setup

Goal: run Penny as an OpenClaw agent on your laptop. She searches the curated funding database, verifies every suggestion with `read_official_source` (Crawl4AI first, Firecrawl scrape fallback on anti-bot pages), and may use Exa `web_search` only when database results are insufficient.

Use this document for local OpenClaw and gateway setup. For Fly.io deployment, use the root `README.md`.

## Prerequisites

| Requirement | Notes |
| ----------- | ----- |
| Node.js | 22.x or newer (`node -v`) |
| OpenClaw CLI | `npm install -g openclaw@latest` |
| Python | 3.11+ for Crawl4AI |
| API keys | `FIREWORKS_API_KEY`, `EXA_API_KEY`, `FIRECRAWL_API_KEY` (usually in `~/.openclaw/.env`; see §5 Model provider) |

## Repo layout involved

| Path | Role |
| ---- | ---- |
| `workspace/` | Agent Markdown home (`AGENTS.md`, `SOUL.md`, reference skills) |
| `plugin/` | `penny-tools` OpenClaw plugin (`search_corpus`, `read_official_source`, `publish_funding_brief`) |
| `tools/read_official_source.py` | Crawl4AI reader (stdin/stdout JSON) |
| `database/data/funding/curated/verified-programs.jsonl` | Funding database |
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
FIREWORKS_API_KEY=...
EXA_API_KEY=...
FIRECRAWL_API_KEY=...

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

- Restrict tools to database search + verifier + web search via explicit **`tools.allow`** only (do **not** combine `tools.profile: minimal` with `tools.allow` — OpenClaw intersects those policies and you end up with zero tools)
- Set **`plugins.enabled: true`** and **`plugins.allow: ["fireworks", "penny-tools", "exa"]`**
- Disable `web.fetch` so the model cannot replace `read_official_source`
- Enable `plugins.entries.fireworks`
- Enable `plugins.entries.exa`
- Enable `plugins.entries["penny-tools"]` with your absolute paths
- Use `agents.defaults.model.primary: "fireworks/accounts/fireworks/models/deepseek-v4-flash"` for the Fireworks DeepSeek V4 Flash setup
- Keep `agents.defaults.model.fallbacks: ["fireworks/accounts/fireworks/models/kimi-k2p7-code"]` so Kimi K2.7 Code catches primary model failures
- Keep `params.reasoning.effort: "high"` on the primary model entry
- Keep `params.max_tokens: 16384` on both model entries so Penny's output budget stays bounded
- Do not configure runtime skills unless generic `read` is also allowed. Penny's
  locked setup keeps behavior in always-loaded workspace files and tool
  descriptions so the model never tries to read skill files at runtime.

Restart:

```bash
openclaw gateway restart
openclaw plugins inspect penny-tools --runtime
```

### Model provider key (where it actually lives)

Penny defaults to Fireworks-hosted DeepSeek V4 Flash with **`fireworks/accounts/fireworks/models/deepseek-v4-flash`** and falls back to Kimi K2.7 Code with **`fireworks/accounts/fireworks/models/kimi-k2p7-code`**. OpenClaw resolves Fireworks auth from **`FIREWORKS_API_KEY`**.

**Recommended (interactive):**

```bash
openclaw models auth login --provider fireworks
```

That stores Fireworks auth in your OpenClaw profile.

**Recommended (file the gateway can read):** add the same variable to **`~/.openclaw/.env`**:

```
FIREWORKS_API_KEY=...
```

If the gateway runs as a launchd/systemd service, that file (or your process manager’s env) must provide `FIREWORKS_API_KEY`, or the daemon will not see shell-only exports.

Merge `config/openclaw.penny.example.json5` so `agents.defaults.model.primary` is `fireworks/accounts/fireworks/models/deepseek-v4-flash` and `agents.defaults.model.fallbacks` includes `fireworks/accounts/fireworks/models/kimi-k2p7-code`. Then confirm the catalog:

```bash
openclaw models list --provider fireworks
```

### Compliance posture

Penny uses the OpenClaw Fireworks Chat Completions path and should not use the
Fireworks Responses API unless `store=false` is set. Fireworks documents
open-model serving as Zero Data Retention by default and says its platform is
SOC 2 Type II certified. GDPR readiness still needs Penny-side controls:
Fireworks DPA/SCCs, privacy/subprocessor notices, deletion/export handling, and
logs that do not retain prompts or generated answers.

### Exa and Firecrawl

If `web_search` fails, confirm `EXA_API_KEY` is loaded into the Gateway environment (typically via `~/.openclaw/.env`). If the anti-bot fallback inside `read_official_source` fails, confirm `FIRECRAWL_API_KEY` is loaded.

## 6. Verification ladder (do in order)

### 6a — Funding database integrity

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

### 6d — Database hit — Ontario SaaS hiring

Use **embedded mode** for local testing (no gateway daemon required):

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

### 6e — Database miss — Niche territorial search

```bash
openclaw agent --local \
  --session-id penny-corpus-miss \
  --message "We are a small Inuvik tourism business launching a new cultural experience program in 2026. What territorial or federal non-loan funding exists?" \
  --json
```

Pass when database-first behavior remains, weak database hits escalate to scoped `web_search`, and discovery routes through `read_official_source`.

### 6f — Consultation mode: opportunity-backed

```bash
openclaw agent --local \
  --session-id penny-opportunity-backed \
  --message "I have a B2B SaaS company in Ontario with 8 employees. Find verified grants and ITCs and put a funding-aligned operating plan in the artifact with plan alignment for our business." \
  --json
```

Pass when:

1. Engagement memory or transcript reflects **opportunity-backed** intake
2. `publish_funding_brief` artifact includes `## Plan alignment` (or equivalent alignment section)
3. Evidence trace unchanged (database → verify)

### 6g — Consultation mode: aspiration-first

```bash
openclaw agent --local \
  --session-id penny-aspiration-first \
  --message "I want to start a tourism experience business in the Northwest Territories. Find verified non-loan funding and propose a business shape I can build toward, then create the funding plan artifact." \
  --json
```

Pass when:

1. **Aspiration-first** intake (industry + location)
2. Artifact includes `## Recommended business shape` and `## Launch strategy` (or honest thin database note)
3. Database miss escalates to `web_search` only when needed

**Note:** full-agent runs (6d–6g) require a live model session (Gateway plus keys, or `openclaw agent --local` with working model auth). The repo cannot complete them in CI without your secrets.

The locked Penny config intentionally omits runtime skills. If an agent run tries
to call generic `read`, the config is wrong for this setup.

## 7. Web chat UI

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

**Artifacts:** after verified recommendations, Penny can create a funding brief document in the right panel (scrollable preview + PDF download). See **`docs/penny-artifacts.md`**. Ensure `publish_funding_brief` is in `tools.allow`.

**Voice:** anti–AI-slop rules are in **`workspace/SOUL.md`** (always in context). Reference material can live under `workspace/skills/`, but locked Penny runs do not load those files at runtime.

Regression ladder (offline + optional live agent runs):

```bash
./scripts/verify_penny_phase1.sh --skip-reader
./scripts/verify_penny_phase1.sh --live
./scripts/verify_penny_artifacts.sh
```

## What this local setup skips

This guide skips hosted deployment and scheduled database refresh jobs.
