# Penny web chat UI

Local SvelteKit chat front-end for Penny. The browser talks to SvelteKit API routes; the server holds the OpenClaw gateway token and streams agent events over SSE.

## Prerequisites

- Phase 1 Penny stack working (`penny-tools`, Crawl4AI, DeepSeek, Exa)
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

Each chat is a separate business engagement (`agent:main:penny:<uuid>`). The sidebar lists sessions from OpenClaw; the active session key is stored in browser `localStorage` (`penny:activeSessionKey`).

API routes:

- `GET /api/sessions` — list penny sessions (plus legacy **Previous chat** when applicable)
- `POST /api/sessions` — create session
- `PATCH /api/sessions/:key` — rename
- `DELETE /api/sessions/:key` — delete transcript + engagement memory file + session artifacts

## Artifacts

Funding brief slideshows (preview + PDF download) persist under `workspace/artifacts/<sessionUuid>/`. See **`../docs/penny-artifacts.md`**.

- `GET /api/artifacts?sessionKey=` — list artifacts
- `GET /api/artifacts/:id?sessionKey=&preview=html` — slideshow preview
- `GET /api/artifacts/:id/download?sessionKey=&format=pdf` — PDF download

SSE: `artifact.create` / `artifact.update` after `create_funding_brief` tool completes.

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
