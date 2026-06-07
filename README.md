# Penny

<p align="center">
  <strong>An OpenClaw-powered AI agent for finding Canadian business funding.</strong>
</p>

<p align="center">
  Penny searches a tracked funding database, verifies official sources, rejects loan-like programs, and turns eligible opportunities into practical funding plans.
</p>

<p align="center">
  <a href="https://penny-go.fly.dev/">Live app</a>
  |
  <a href="docs/penny-local-setup.md">Local setup</a>
  |
  <a href="docs/penny-artifacts.md">Artifacts</a>
  |
  <a href="database/docs/funding-db/completeness-audit.md">Database audit</a>
</p>

<p align="center">
  <img alt="OpenClaw" src="https://img.shields.io/badge/powered%20by-OpenClaw-111827?style=for-the-badge">
  <img alt="DeepSeek" src="https://img.shields.io/badge/DeepSeek-5786FE?style=for-the-badge&logo=deepseek&logoColor=white">
  <img alt="SvelteKit" src="https://img.shields.io/badge/sveltekit-%23ff3e00.svg?style=for-the-badge&logo=svelte&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white">
  <img alt="TailwindCSS" src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/node.js-6DA55F.svg?style=for-the-badge&logo=node.js&logoColor=white">
  <img alt="Python" src="https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54">
  <img alt="Docker" src="https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white">
  <img alt="Fly.io" src="https://img.shields.io/badge/fly.io-8A2BE2?style=for-the-badge&logo=flydotio&logoColor=white">
  <img alt="Vitest" src="https://img.shields.io/badge/-Vitest-252529?style=for-the-badge&logo=vitest&logoColor=FCC72B">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/github/license/SmitMachhi/penny-go?style=for-the-badge"></a>
  <img alt="Funding database" src="https://img.shields.io/badge/funding%20database-331%20verified%20programs-0F766E?style=for-the-badge">
</p>

---

## What Penny Is

Penny is an AI agent powered by OpenClaw. It helps Canadian business owners find
non-loan government funding: grants, tax credits, rebates, subsidies, and
investment tax credits.

Penny starts from a tracked, curated funding database. Live web search is an
extension, used only when the database has weak coverage for the user's
location, sector, or project. Before Penny recommends a program, it verifies the
official source and checks whether the benefit is in scope.

Penny serves Canadian businesses. It does not provide legal advice, tax filing
advice, personal-benefit advice, loans, loan guarantees, low-cost financing, or
repayable contributions.

## Highlights

| Capability | What it does |
| --- | --- |
| Database-first search | Searches verified Canadian business funding data before using live search. |
| Official-source verification | Reads official pages before treating a program as recommendable. |
| Benefit-scope guardrails | Rejects loans, repayable contributions, and personal-benefit programs. |
| Fit reasoning | Labels fit as strong, conditional, stretch, or ruled out. |
| Funding plan artifacts | Creates evidence-backed plans with risks, next steps, and official URLs. |
| Durable sessions | Persists Penny and OpenClaw runtime state on a Fly.io volume. |

## How It Works

```text
Business question
      |
      v
SvelteKit API
      |
      v
OpenClaw agent
      |
      +--> funding database search
      +--> official-source reader
      +--> web search when database coverage is thin
      |
      v
Evidence-backed answer or funding plan artifact
```

The browser never receives the OpenClaw gateway token. SvelteKit acts as the
server-side BFF: browser requests hit `/api/*`, and those routes talk to the
OpenClaw gateway.

## Architecture

| Layer | Path | Role |
| --- | --- | --- |
| Web app | `web/` | SvelteKit chat UI and server API routes. |
| Agent runtime | OpenClaw | Agent sessions, tool calls, skills, and gateway. |
| Penny tools | `plugin/` | OpenClaw plugin for database search, source reading, and funding artifacts. |
| Shared code | `shared/` | Artifact, session, markdown, PDF, and validation helpers. |
| Agent workspace | `workspace/` | Penny instructions, skills, voice, and memory rules. |
| Funding database | `database/data/funding/curated/` | Tracked data that powers Penny's recommendations. |
| Source reader | `tools/read_official_source.py` | Crawl4AI official-page reader with Exa same-URL fallback. |

## Funding Database

The curated funding database is core product data and belongs in Git.

| File | Purpose |
| --- | --- |
| `database/data/funding/curated/verified-programs.jsonl` | Primary searchable funding records. |
| `database/data/funding/curated/verified-programs.json` | JSON export of verified records. |
| `database/data/funding/curated/coverage-summary.md` | Jurisdiction and category coverage notes. |
| `database/data/funding/curated/curation-notes.md` | Curation decisions and source notes. |

Current baseline:

```text
verified_profiles 331
jurisdictions 14
duplicate_program_keys 0
```

Verify the database:

```bash
cd database
python3 scripts/verify_funding_corpus.py
```

Penny searches the database first. If the result pool is thin, Penny can use
`web_search` through Exa, then verify official URLs with `read_official_source`.
Search results alone are not recommendations.

## Quickstart

### 1. Install prerequisites

- Node.js 22 or newer
- npm
- Python 3.11 or newer
- OpenClaw CLI
- DeepSeek API key for the default model
- Exa API key for web search and official-source fallback

Install OpenClaw:

```bash
npm install -g openclaw@latest
openclaw onboard
```

### 2. Create the Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r tools/requirements-read-official-source.txt
crawl4ai-setup
```

### 3. Install JavaScript dependencies

```bash
npm --prefix shared install
npm --prefix plugin install
npm --prefix web install
```

### 4. Configure secrets

Keep secrets outside Git. Use `.env.example` and `web/.env.example` as
checklists.

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

Merge `config/openclaw.penny.example.json5` into your OpenClaw config and
replace the absolute paths. The default model is `deepseek/deepseek-v4-flash`.
The example config pins provider routing to DeepSeek, disables fallbacks,
enables high reasoning, and caps `params.max_tokens` at `16384`.

## Run Locally

Build and validate the plugin:

```bash
npm --prefix plugin run build
npm --prefix plugin run plugin:build
npm --prefix plugin run plugin:validate
```

Start the gateway:

```bash
openclaw gateway
```

Start the web UI:

```bash
npm --prefix web run dev
```

Open `http://localhost:5173`.

## Test

Run the main suite:

```bash
npm --prefix web run check
npm --prefix web test
npm --prefix shared test
npm --prefix plugin test
```

Verify the local stack without live reader calls:

```bash
./scripts/verify_penny_phase1.sh --skip-reader
```

Run live official-source checks when the gateway, keys, and Python reader are
ready:

```bash
./scripts/verify_penny_phase1.sh --live
```

## Fly.io Deployment

The repo includes Fly.io deployment files:

- `fly.toml`
- `Dockerfile`
- `.dockerignore`

Fly settings:

| Setting | Value |
| --- | --- |
| Region | Toronto, `yyz` |
| Machine | `shared-cpu-1x` |
| Memory | `2gb` |
| Durable state | `penny_workspace` volume mounted at `/app/workspace` |
| OpenClaw state | `/app/workspace/.openclaw-state` |
| Idle cost control | `auto_stop_machines = "stop"` and `min_machines_running = 0` |

Set production secrets:

```bash
fly secrets set \
  OPENCLAW_GATEWAY_URL=<wss-or-private-gateway-url> \
  OPENCLAW_GATEWAY_TOKEN=<gateway-token> \
  PENNY_REPO_ROOT=/app \
  DEEPSEEK_API_KEY=<your-deepseek-key> \
  EXA_API_KEY=<your-exa-key>
```

Deploy:

```bash
npm --prefix web run build
fly deploy
```

After deployment:

1. Call `/api/health`.
2. Send a prompt that should hit the database.
3. Send a thin-coverage prompt that should use web search.
4. Confirm the browser does not receive `OPENCLAW_GATEWAY_TOKEN`.
5. Confirm sessions survive a machine restart.

## Agent Rules

Penny's behavior lives in `workspace/`.

Core rules:

- Search the database before web search.
- Verify official URLs before recommendations.
- Treat `read_official_source` benefit-scope vetoes as binding.
- Keep business facts scoped to the active engagement.
- Refuse loans and repayable contributions.
- Put substantial recommendations into funding plan artifacts.

## Public Release Checklist

| Check | Status |
| --- | --- |
| Root MIT license exists | Complete |
| Third-party notices cover vendored skills | Complete |
| Secrets stay in env files or Fly secrets | Complete |
| Generated local outputs stay ignored | Complete |
| Dependency audit findings reviewed before launch | Manual review |

## More Docs

| Document | Link |
| --- | --- |
| Local setup | [docs/penny-local-setup.md](docs/penny-local-setup.md) |
| Web UI | [web/README.md](web/README.md) |
| Artifacts | [docs/penny-artifacts.md](docs/penny-artifacts.md) |
| Funding DB completeness audit | [database/docs/funding-db/completeness-audit.md](database/docs/funding-db/completeness-audit.md) |

---

<p align="center">
  Built for Canadian businesses that need practical, evidence-backed funding guidance.
</p>
