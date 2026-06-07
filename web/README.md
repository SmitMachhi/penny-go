# Penny web chat UI

Local SvelteKit chat front-end for Penny. The browser talks to SvelteKit API routes; the server holds the OpenClaw gateway token and streams agent events over SSE.

## Prerequisites

- Phase 1 Penny stack working (`penny-tools`, Crawl4AI, OpenRouter, Exa)
- OpenClaw gateway running on `ws://127.0.0.1:18789`

```bash
openclaw gateway
```

## Setup

```bash
cd web
cp .env.example .env
```

Set `OPENCLAW_GATEWAY_TOKEN` from `~/.openclaw/openclaw.json` → `gateway.auth.token`.

Optional:

- `OPENCLAW_GATEWAY_URL` (default `ws://127.0.0.1:18789`)
- `PENNY_REPO_ROOT` (repo root; used to delete engagement memory files on session delete)

## Sessions

Each chat is a separate business engagement (`agent:main:penny:<uuid>`). The sidebar lists sessions from OpenClaw.

**Routes:**

- `/` — home (empty state; no chat loaded)
- `/c/{uuid}` — active penny chat
- `/c/legacy` — previous single-chat history (`agent:main:main`) when shown

The URL drives session identity. Chat history is always loaded from the OpenClaw gateway transcript, not browser storage.

Merge the `session.reset` block from [`../config/openclaw.penny.example.json5`](../config/openclaw.penny.example.json5) into `~/.openclaw/openclaw.json` so daily transcript resets do not wipe chat history.

API routes:

- `GET /api/sessions` — list penny sessions (plus legacy **Previous chat** when applicable)
- `POST /api/sessions` — create session
- `PATCH /api/sessions/:key` — rename
- `POST /api/sessions/:key/generate-title` — backfill title from first user message in transcript
- `DELETE /api/sessions/:key` — delete transcript + engagement memory file + session artifacts

## Artifacts

Funding plan PDFs persist under `workspace/artifacts/<sessionUuid>/`. See **`../docs/penny-artifacts.md`**.

- `GET /api/artifacts?sessionKey=` — list artifacts
- `GET /api/artifacts/:id?sessionKey=&preview=pdf` — PDF bytes for panel preview
- `GET /api/artifacts/:id/download?sessionKey=&format=pdf` — PDF download

SSE: `artifact.create` / `artifact.update` after `publish_funding_brief` or legacy `create_funding_brief` completes.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Test

```bash
npm test          # unit tests
npm run check     # svelte-check
npm run build     # production build
```

Smoke the API (gateway must be running):

```bash
curl http://localhost:5173/api/health
curl -X POST http://localhost:5173/api/chat/send \
  -H 'content-type: application/json' \
  -d '{"message":"What funding helps a Toronto SaaS company hiring developers?"}'
```

## Architecture

| Layer | Role |
| ----- | ---- |
| Browser | Chat UI, SSE stream, light/dark theme |
| SvelteKit `/api/*` | BFF — gateway token never sent to browser |
| OpenClaw gateway | Penny agent, tools, sessions |

API routes:

- `GET /api/health` — gateway connectivity
- `GET /api/sessions` — list/create/manage chat sessions
- `GET /api/chat/history` — transcript
- `POST /api/chat/send` — start a run
- `GET /api/chat/stream` — SSE (`chat`, tool events)
- `POST /api/chat/abort` — stop active run
