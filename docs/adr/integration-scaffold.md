# ADR: Integration scaffold for new Penny tools

## Status

Accepted — 2026-05-24

## Context

Penny-go spans an OpenClaw plugin, a SvelteKit BFF, Python tooling, and shared contracts. Backlog integrations (Composio, QMD, browser harness) must not scatter across routes, workspace scripts, or ad-hoc subprocess calls.

## Decision

New external integrations follow the same layering as funding database search and the official-source reader:

| Layer | Location | Owns |
| ----- | -------- | ---- |
| Tool registration | `plugin/src/index.ts` | OpenClaw tool schema + wiring |
| Actions | `plugin/src/actions/<name>-tools.ts` | Orchestration, payload shaping, when to call services |
| Services | `plugin/src/services/<name>-client.ts` | SDK calls, subprocesses, retries, timeouts |
| Domain | `plugin/src/domain/` | Funding database policy only — no IO |
| Shared contracts | `shared/` | Cross-language constants (paths, heuristics) |

The web BFF (`web/`) stays gateway-focused. It must not embed Composio, QMD, or browser-harness clients. New UI needs go through OpenClaw tools or gateway RPC.

## Consequences

- Integrations ship as plugin tools first; the web UI consumes them via chat/gateway.
- Shared business rules live in `shared/` when TypeScript and Python must agree.
- Before adding an integration, read upstream source via `opensrc` per `AGENTS.md` — do not guess APIs.

## Example layout (future Composio tool)

```
plugin/src/actions/composio-tools.ts
plugin/src/services/composio-client.ts
shared/composio-tool-allowlist.json   # only if TS + Python must agree
```
