# Penny

Penny is an AI agent powered by OpenClaw. It helps Canadian business owners find non-loan government funding: grants, tax credits, rebates, subsidies, and investment tax credits.

Penny starts with a tracked, curated funding database. It uses live web search only when the database has weak coverage for the user's location, sector, or project. Before Penny recommends a program, it verifies the official source and checks whether the benefit is in scope.

Penny serves Canadian businesses. It does not provide legal advice, tax filing advice, personal-benefit advice, loans, loan guarantees, low-cost financing, or repayable contributions.

## What Penny Does

- Searches a verified Canadian business funding database.
- Reads official source pages before recommending programs.
- Rejects loan-like or repayable products.
- Labels fit as strong, conditional, stretch, or ruled out.
- Creates funding plan artifacts with evidence, risks, next steps, and official URLs.
- Runs as an OpenClaw agent behind a SvelteKit chat UI.

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

The browser does not receive the OpenClaw gateway token. SvelteKit acts as a server-side BFF: browser requests hit `/api/*`, and those routes talk to the OpenClaw gateway.

## Funding Database

The curated funding database is core product data and belongs in Git:

- `database/data/funding/curated/verified-programs.jsonl`
- `database/data/funding/curated/verified-programs.json`
- `database/data/funding/curated/coverage-summary.md`
- `database/data/funding/curated/curation-notes.md`

Current baseline:

```text
verified_profiles 331
jurisdictions 14
duplicate_program_keys 0
```

Verify it:

```bash
cd database
python3 scripts/verify_funding_corpus.py
```

Penny searches the database first. If the result pool is thin, Penny can use `web_search` through Exa, then verify official URLs with `read_official_source`. Search results alone are not recommendations.

## Prerequisites

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

## Local Setup

Create the Python environment:

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

Merge `config/openclaw.penny.example.json5` into your OpenClaw config and replace the absolute paths.

The default model is `deepseek/deepseek-v4-flash`. The example config pins provider routing to DeepSeek, disables fallbacks, enables high reasoning, and caps `params.max_tokens` at `16384`.

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

Run live official-source checks when the gateway, keys, and Python reader are ready:

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
| Memory | `1gb` |
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

- Root MIT license exists.
- Third-party notices cover vendored skills.
- Secrets stay in env files or Fly secrets.
- Generated local outputs stay ignored.
- Dependency audit findings are reviewed before launch.

## More Docs

- [Local setup](docs/penny-local-setup.md)
- [Web UI](web/README.md)
- [Artifacts](docs/penny-artifacts.md)
- [Funding DB completeness audit](database/docs/funding-db/completeness-audit.md)
