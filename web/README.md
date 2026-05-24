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
- `PENNY_SESSION_KEY` (default `agent:main:main`)

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
- `GET /api/chat/history` — transcript
- `POST /api/chat/send` — start a run
- `GET /api/chat/stream` — SSE (`chat`, tool events)
- `POST /api/chat/abort` — stop active run
