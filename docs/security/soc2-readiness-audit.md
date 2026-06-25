# SOC 2 readiness audit

Date: 2026-06-25

This is an engineering readiness note, not a SOC 2 compliance assertion. SOC 2 also requires operational controls, policies, evidence collection, vendor management, access reviews, incident response, and auditor validation.

## Executive summary

Penny has a reasonable first user-data isolation model: authenticated SvelteKit routes use Supabase auth, session ownership is stored in `public.penny_sessions`, and the Supabase migration forces row-level security by `user_id = auth.uid()`. The main hardening work completed in this pass reduced browser persistence of transcript data, added baseline browser security headers, aligned Supabase password length with the UI, and stopped unexpected server exception text from reaching clients.

## Confirmed controls

| Control | Evidence |
| --- | --- |
| Authenticated app layout redirects unauthenticated users | `web/src/routes/(app)/+layout.server.ts:6` |
| Request user is loaded from Supabase server client | `web/src/hooks.server.ts:11` |
| Session ownership registry requires authenticated user | `web/src/lib/server/auth-context.ts:57` |
| Public session/artifact/chat routes assert owned session before reading session data | `web/src/routes/api/chat/history/+server.ts:9`, `web/src/routes/api/artifacts/[id]/+server.ts:16`, `web/src/routes/api/chat/stream/+server.ts:10` |
| Supabase session table has RLS and owner-only policies | `supabase/migrations/20260625152611_penny_sessions_rls.sql:10` |
| Artifact file paths are UUID scoped and reject traversal | `shared/penny-paths.ts:68`, `shared/penny-paths.ts:144` |
| Link preview fetches reject private hosts after DNS resolution | `web/src/lib/server/link-preview.ts:170` |
| Assistant markdown is sanitized before `{@html}` rendering | `web/src/lib/chat/markdown.ts:1`, `web/src/lib/chat/markdown.ts:54` |

## Changes made

| Change | Why it matters | Evidence |
| --- | --- | --- |
| Added baseline security headers | Reduces clickjacking, MIME sniffing, browser permission, opener, and referrer leakage risk | `web/src/lib/server/security-headers.ts:1`, commit `bc63123` |
| Raised Supabase minimum password length to 8 | Aligns backend auth policy with UI validation | `supabase/config.toml:185`, commit `5ecb7e8` |
| Removed persistent IndexedDB transcript cache | Prevents chat transcripts and artifact summaries from being retained in browser storage after the page lifetime | `web/src/lib/chat/session-thread-cache.ts:13`, commit `8eda4bb` |
| Hid unexpected internal exception messages from API clients | Reduces file path, infrastructure, and internal service detail leakage | `web/src/lib/server/api-error.ts:40`, commit `17e4eb1` |

## High-priority remaining gaps

| ID | Severity | Gap | Impact | Suggested fix |
| --- | --- | --- | --- | --- |
| SOC2-001 | High | No visible audit/event logging for user-data reads, exports, deletes, auth failures, or admin/operator access | SOC 2 evidence and incident investigation will be weak | Add structured audit events with user id, session key hash, action, route, result, timestamp, and request id. Store outside mutable workspace files. |
| SOC2-002 | High | OpenClaw gateway and workspace storage remain a critical trust boundary outside Supabase RLS | A gateway bug or shared runtime state could bypass app-level ownership checks | Review OpenClaw session storage using `opensrc`, document whether sessions are tenant-isolated, and add integration tests that prove user B cannot fetch user A session history/artifacts. |
| SOC2-003 | High | Dependency audit currently reports high/moderate findings in `web` and `plugin`, including `undici`, `vite`, `dompurify`, `openclaw` transitive packages, and `ws` | Known vulnerable packages are a common SOC 2 exception unless triaged with compensating controls | Run safe dependency updates, document non-runtime/dev-only advisories, and pin/upgrade OpenClaw when patched. |
| SOC2-004 | Medium | CSP is not implemented in app code | XSS defense relies primarily on sanitizer correctness and framework escaping | Design a non-breaking CSP with nonce support or remove inline bootstrap first. Include `connect-src` for Supabase and gateway origins. |
| SOC2-005 | Medium | Auth rate limits and password policy are visible in Supabase config, but CAPTCHA/MFA/session timeout policy is not enabled here | Account takeover controls may be insufficient for production SOC 2 scope | Decide policy by customer risk. At minimum document rate limits, require email confirmation, consider MFA for privileged users, and configure session lifetime. |
| SOC2-006 | Medium | Data retention and deletion policy is not encoded beyond per-session delete paths | Users and auditors need clear guarantees for transcript/artifact retention | Add retention policy, scheduled purge, and deletion verification for OpenClaw transcripts, artifacts, turn ledgers, and engagement memory. |

## Dependency audit snapshot

Commands run:

```bash
npm --prefix web audit --audit-level=moderate
npm --prefix plugin audit --audit-level=moderate
npm --prefix shared audit --audit-level=moderate
```

Results:

| Package area | Result |
| --- | --- |
| `shared` | 0 vulnerabilities |
| `web` | 9 vulnerabilities reported: 6 low, 1 moderate, 2 high |
| `plugin` | 10 vulnerabilities reported: 4 moderate, 6 high |

These require triage before claiming SOC 2 readiness. Some may be dev-server only, but the OpenClaw/plugin transitive advisories need runtime review.

## Next audit focus paths

| Path | Reason |
| --- | --- |
| `web/src/routes/api/**` | Main authenticated API boundary for chat, artifacts, sessions, and link preview |
| `web/src/lib/server/auth-context.ts` | Converts Supabase user context into session ownership checks |
| `web/src/lib/server/supabase-session-ownership-store.ts` | App-level ownership registry over RLS-backed table |
| `supabase/migrations/20260625152611_penny_sessions_rls.sql` | Database isolation policy source of truth |
| `web/src/lib/server/session-orchestration.ts` | Creates, renames, deletes, and lists sessions across gateway plus ownership registry |
| `web/src/lib/server/chat-orchestration.ts` | Enforces ownership before gateway history and artifact reads |
| `web/src/lib/server/artifact-storage.ts` | Reads user artifacts from workspace storage |
| `web/src/lib/server/penny-turn-store.ts` | Stores turn ledgers containing user messages |
| `workspace/` | Runtime memory/artifact/transcript state that may contain customer data |
| `plugin/src/tools/**` | Agent tools that create artifacts and may write sensitive business data |

## Context questions

1. Is production intended to be single-tenant per deployed app, or multi-user/multi-tenant in one deployment?
2. What is the source of truth for production data retention: delete immediately on session delete, fixed retention window, or customer-configurable retention?
3. Are OpenClaw gateway logs/transcripts and Fly volume backups in SOC 2 scope?
