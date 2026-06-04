# Penny Web UX Performance

## Goal

Penny should paint useful UI before slow OpenClaw reads finish, then reconcile with
OpenClaw as the source of truth for runs, transcript history, tools, and artifacts.

## Current instrumentation

Client metrics use the browser Performance API with `penny:` prefixes:

- `penny:app_boot`
- `penny:session_switch_start`
- `penny:session_switch_end`
- `penny:session_switch`
- `penny:first_message_paint`
- `penny:send_start`
- `penny:first_token`
- `penny:send_to_first_token`
- `penny:artifact_panel_open`
- `penny:pdf_preview_ready`

Server routes emit `Server-Timing` headers:

- `/api/sessions` -> `sessions`
- `/api/sessions` POST -> `sessions_create`
- `/api/chat/history` -> `history`
- `/api/artifacts` -> `artifacts`
- `/api/sessions/:key/generate-title` -> `generate_title`
- `/api/chat/send` -> `send`
- `/api/chat/stream` -> `stream_connect`

## First-pass optimization contract

- OpenClaw remains authoritative for chat execution, stream events, transcript
  recovery, and writes.
- Penny avoids full OpenClaw session-list reads for UI-local state that is already
  known after create, rename, delete, and send completion.
- Artifact summaries load when the panel opens or artifact events arrive, not on
  every session switch.
- Streaming assistant text uses a cheap text render path until the final message
  arrives.
- PDF preview fetches one blob and embeds an object URL instead of causing a
  validation fetch plus an embed fetch.

## Remaining performance work

- Persist thread snapshots in IndexedDB for return visits.
- Add a local server session index for fast sidebar reads.
- Add a bootstrap endpoint for cold session switches.
- Coalesce scroll-follow work with `requestAnimationFrame`.
- Split route components and heavy rendering stacks where SvelteKit can lazy-load
  them without changing user flows.
