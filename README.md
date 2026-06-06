# Penny

Penny is an evidence-first funding consultant for Canadian businesses. It helps owners find non-loan government opportunities, including grants, tax credits, rebates, subsidies, and investment tax credits.

Penny is not a generic search box. The tracked funding corpus is the base knowledge layer. Live search extends that corpus when coverage is thin, and every actionable recommendation still has to be checked against an official source before Penny presents it.

## What Penny Does

- Searches a curated Canadian business funding corpus.
- Rejects loans, loan guarantees, low-cost financing, and repayable contributions.
- Verifies recommendations against official government or government-linked sources.
- Separates strong, conditional, stretch, and ruled-out fits.
- Creates funding plan artifacts with evidence, next steps, and business-specific qualification gaps.
- Runs as an OpenClaw agent with a SvelteKit chat UI.

Penny is for Canadian businesses only. It does not provide legal advice, tax filing advice, or personal-benefit recommendations.

## Repository Layout

| Path | Purpose |
| --- | --- |
| `web/` | SvelteKit chat UI and API routes. |
| `plugin/` | OpenClaw plugin that exposes Penny tools. |
| `shared/` | Shared artifact, session, markdown, PDF, and corpus utilities. |
| `workspace/` | OpenClaw agent workspace, Penny instructions, and skills. |
| `database/data/funding/curated/` | Tracked verified funding corpus that powers Penny. |
| `database/scripts/` | Corpus verification scripts. |
| `tools/` | Official-source reader and document rendering helpers. |
| `config/` | Example OpenClaw configuration for Penny. |
| `evals/` | Behavioral and frontend evaluation matrices. |
| `docs/` | Setup notes, artifact docs, ADRs, and implementation notes. |

## Funding Corpus

The curated corpus is intentionally tracked in Git:

- `database/data/funding/curated/verified-programs.jsonl`
- `database/data/funding/curated/verified-programs.json`
- `database/data/funding/curated/coverage-summary.md`
- `database/data/funding/curated/curation-notes.md`

This data is core product behavior, not disposable local output. Penny starts with this corpus so it can give stable, Canada-specific, business-only recommendations instead of relying on broad web search.

Live web search is an extension path. Penny uses it when corpus matches are missing or weak for the user's jurisdiction, sector, or project. Search results are not recommendations until `read_official_source` verifies an official page.

Verify the corpus from the database package:

```bash
cd database
python3 scripts/verify_funding_corpus.py
```

Expected current baseline:

```text
verified_profiles 331
jurisdictions 14
duplicate_program_keys 0
```

## Prerequisites

- Node.js 22 or newer
- npm
- Python 3.11 or newer
- OpenClaw CLI
- DeepSeek API key for the agent model
- Exa API key for web search extension

Install OpenClaw:

```bash
npm install -g openclaw@latest
openclaw onboard
```

## Local Setup

Create the Python environment for official-source reading:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r tools/requirements-read-official-source.txt
crawl4ai-setup
```

Install JavaScript dependencies:

```bash
npm --prefix shared install
npm --prefix plugin install
npm --prefix web install
```

Configure secrets outside Git. Use `.env.example` and `web/.env.example` as checklists.

Minimum OpenClaw environment:

```bash
DEEPSEEK_API_KEY=<your-deepseek-key>
EXA_API_KEY=<your-exa-key>
PENNY_REPO_ROOT=/absolute/path/to/penny-go
PENNY_CORPUS_PATH=/absolute/path/to/penny-go/database/data/funding/curated/verified-programs.jsonl
PENNY_PYTHON=/absolute/path/to/penny-go/.venv/bin/python
```

Minimum web environment:

```bash
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=<gateway-token>
PENNY_REPO_ROOT=/absolute/path/to/penny-go
```

Merge `config/openclaw.penny.example.json5` into your OpenClaw config and update the absolute paths.

## Run Locally

Build and validate the plugin:

```bash
npm --prefix plugin run build
npm --prefix plugin run plugin:build
npm --prefix plugin run plugin:validate
```

Start the OpenClaw gateway:

```bash
openclaw gateway
```

Start the web UI:

```bash
npm --prefix web run dev
```

Open `http://localhost:5173`.

## Test

Run the main proof suite:

```bash
npm --prefix web run check
npm --prefix web test
npm --prefix shared test
npm --prefix plugin test
```

Verify the full Phase 1 stack without live reader calls:

```bash
./scripts/verify_penny_phase1.sh --skip-reader
```

Run live official-source smoke checks when API keys and the Python reader are ready:

```bash
./scripts/verify_penny_phase1.sh --live
```

## Fly.io Deployment

Penny is intended to be deployable on Fly.io as a gateway-backed web application.

Recommended production shape:

| Component | Fly.io role |
| --- | --- |
| SvelteKit web app | Public Fly app serving the chat UI and `/api/*` routes. |
| OpenClaw gateway | Private Fly service or separately managed gateway reachable by the web app. |
| Penny corpus | Tracked repo data mounted in the app image. |
| Secrets | Fly secrets, never committed to Git. |

Set production secrets with Fly:

```bash
fly secrets set \
  OPENCLAW_GATEWAY_URL=<wss-or-private-gateway-url> \
  OPENCLAW_GATEWAY_TOKEN=<gateway-token> \
  PENNY_REPO_ROOT=/app \
  DEEPSEEK_API_KEY=<your-deepseek-key> \
  EXA_API_KEY=<your-exa-key>
```

Deployment checklist:

1. Add or confirm Fly config for the SvelteKit app.
2. Build the web app with `npm --prefix web run build`.
3. Ensure the OpenClaw gateway is reachable from the Fly app.
4. Ensure `OPENCLAW_GATEWAY_TOKEN` never reaches browser code.
5. Run `/api/health` after deployment.
6. Test a corpus-backed prompt and a weak-corpus prompt that escalates to web search.

The web app is already designed as a BFF: the browser talks to SvelteKit routes, and SvelteKit holds the gateway token server-side.

## Agent Rules

Penny's agent behavior lives in `workspace/`.

Core rules:

- Search the corpus first.
- Verify official URLs before recommending programs.
- Treat `read_official_source` benefit-scope vetoes as binding.
- Keep user business facts scoped to the active engagement.
- Do not present loans or repayable contributions as opportunities.
- Write substantial recommendations into funding plan artifacts.

## Public Release Notes

Before publishing this repo, confirm:

- A project license exists at the repo root.
- Secrets are stored only in local env files or Fly secrets.
- Dependency audit findings are reviewed.
- Third-party vendored skills have attribution and license notes.
- Generated local outputs remain ignored.

## More Docs

- [Local setup](docs/penny-local-setup.md)
- [Web UI](web/README.md)
- [Artifacts](docs/penny-artifacts.md)
- [Funding DB completeness audit](database/docs/funding-db/completeness-audit.md)
