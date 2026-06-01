# Penny Web UI Reliability Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix sidebar title pollution, slow startup, sidebar flash-on-send, and opaque "Failed to fetch" errors — without changing OpenClaw upstream.

**Architecture:** Treat the sidebar as a **display index** (sanitized, cache-friendly), the chat pane as a **live session surface** (SSE-driven), and gateway health as a **separate concern** from per-request failures. Penny BFF owns display sanitization; the client owns incremental session-list updates and classified errors.

**Tech Stack:** SvelteKit BFF, Svelte 5 runes, OpenClaw gateway RPC (`sessions.list`, `chat.history`, `chat.send`), Vitest.

---

## First principles

### 1. Display boundary

Anything the user reads in the UI must pass the same hygiene rules as `chat.history`. OpenClaw stores AI-facing metadata inside user messages; `chat.history` strips it, but `sessions.list` derived fields do not. **Penny must sanitize at the BFF boundary** before titles/previews reach the browser.

### 2. Critical path

Time-to-interactive = shell render + gateway health + (optional) session list + active chat history. **Parallelize independent work.** Never put expensive work on the send hot path unless correctness requires it.

### 3. Incremental updates

The sidebar is an index, not a live transcript. After a send completes, **patch the active row** (preview, `updatedAt`, title if still default). Full list refetch is a background concern, not a UI-blocking one.

### 4. Failure taxonomy

| Class | User sees | Recovery |
|-------|-----------|----------|
| Network (no HTTP response) | "Can't reach Penny — check the dev server" | Retry button / auto-retry |
| Gateway down (503 from BFF) | "OpenClaw gateway offline" (badge + message) | Poll health until back |
| Operation failed (4xx/5xx with body) | Specific message from BFF | Retry or fix input |
| Stream error (`chat.error` SSE) | Inline run failure | Send again |

**Never** surface raw `Failed to fetch`. **Never** conflate gateway status with a stale operation error.

---

## Problem → root cause → fix map

| Symptom | Root cause | Fix |
|---------|------------|-----|
| "Sender (untrusted metadata)…" titles | `derivedTitle` from raw transcript; Penny passes through | BFF `sanitizeSessionDisplayText()` on title + preview |
| Slow initial load | Sequential health → sessions; heavy `sessions.list` disk reads; chat open adds history + artifacts + SSE | Parallel bootstrap; optional two-phase session list; defer artifacts |
| Sidebar flashes "Loading chats…" on send | `$effect` calls full `sessions.refresh()` with `loading=true` | Silent refresh + local row patch |
| "Failed to fetch" | Browser network error passed through verbatim; sticky `state.error` | Classify errors; scoped banners; auto-clear on success |

---

## Implementation phases

Phases are independently shippable. Do them in order.

---

### Phase 1 — Display sanitization (BFF)

**Why first:** Pure server-side, no UI churn, fixes the most visible bug immediately.

**Files:**
- Create: `web/src/lib/server/session-display-sanitize.ts`
- Create: `web/src/lib/server/session-display-sanitize.test.ts`
- Modify: `web/src/lib/server/session-view.ts`
- Modify: `web/src/lib/server/session-orchestration.test.ts`

**Approach:**

Port the *behavior* of OpenClaw's `stripInboundMetadata` / `stripUserEnvelopeForDisplay` into a focused Penny module (~80–120 LOC). Reference implementation: `openclaw/src/auto-reply/reply/strip-inbound-meta.ts` (read via `opensrc`, do not add OpenClaw as npm dep).

Sentinels to strip (must stay in sync with OpenClaw):
- `Conversation info (untrusted metadata):`
- `Sender (untrusted metadata):`
- `Thread starter (untrusted, for context):`
- `Reply target of current user message (untrusted, for context):`
- `Forwarded message context (untrusted metadata):`
- `Chat history since last reply (untrusted, for context):`
- Leading timestamp envelopes `[Wed 2026-03-11 …]`

Apply in `toPennySessionView`:
```ts
title: resolveSessionTitle({ ...row, derivedTitle: sanitize(row.derivedTitle) }, isLegacy)
preview: sanitize(row.lastMessagePreview) ?? null
```

**Tests:**
- Input: `Sender (untrusted metadata):\n\`\`\`json\n{"label":"ui"}\n\`\`\`\n\nOntario SaaS grant` → `"Ontario SaaS grant"`
- Empty after sanitize → fall through to `"New chat"` for title
- Regression: labeled sessions unchanged

- [ ] Write failing tests in `session-display-sanitize.test.ts`
- [ ] Implement `sanitizeSessionDisplayText`
- [ ] Wire into `session-view.ts`
- [ ] Extend `session-orchestration.test.ts` with dirty `derivedTitle` fixture
- [ ] Run `pnpm --dir web test`

---

### Phase 2 — Error taxonomy & resilience (client + api layer)

**Files:**
- Create: `web/src/lib/chat/request-error.ts`
- Create: `web/src/lib/chat/request-error.test.ts`
- Modify: `web/src/lib/chat/api-client.ts`
- Modify: `web/src/lib/chat/format-error.ts`
- Modify: `web/src/lib/chat/client.svelte.ts`
- Modify: `web/src/lib/chat/sessions.svelte.ts`
- Modify: `web/src/lib/components/chat/PennyShell.svelte`

**Approach:**

1. **`classifyRequestError(error)`** returns `{ kind: 'network' | 'http' | 'parse', message, retryable }`.
   - `TypeError` + message `Failed to fetch` → `{ kind: 'network', message: 'Penny could not reach the server. Is the dev server running?', retryable: true }`
   - `AbortError` → silent / ignore
   - HTTP 503 + gateway message → `{ kind: 'http', message: server body, retryable: true }`

2. **`apiJson`**: optional `{ timeoutMs, signal }`; wrap `fetch` in `AbortController` (default 30s for GET, 60s for POST send).

3. **Split error state:**
   - `chat.state.connectionError` — health/SSE only (drives badge)
   - `chat.state.operationError` — last failed user action (history, send, artifacts)
   - `sessions.state.error` — sidebar operations only

4. **Auto-clear:** successful `loadHistory`, `sendMessage`, `refresh({ silent })` clears matching `operationError`.

5. **PennyShell UI:**
   - Badge: `connectionError` only
   - Bottom banner: `operationError ?? sessions.state.error` with dismiss (×) and optional "Retry"

- [ ] Tests for `classifyRequestError`
- [ ] Update `api-client.ts` with timeout + classification
- [ ] Refactor `ChatClient` / `SessionClient` error fields
- [ ] Update `PennyShell` banner + badge wiring
- [ ] Run tests

---

### Phase 3 — Startup performance

**Files:**
- Modify: `web/src/lib/components/chat/PennyShell.svelte`
- Modify: `web/src/lib/chat/sessions.svelte.ts`
- Modify: `web/src/lib/server/session-orchestration.ts` (optional two-phase)
- Modify: `web/src/lib/chat/client.svelte.ts`

**Approach:**

1. **Parallel bootstrap** in `PennyShell.onMount`:
   ```ts
   void Promise.all([chat.bootstrap(), sessions.initSidebar()]);
   ```
   Health and sessions no longer block each other.

2. **Defer artifacts** on session switch — load artifacts after history resolves, or when panel opens / first `create_funding_brief` tool event. History + SSE are enough for send/receive.

3. **Optional two-phase session list** (if still slow after parallel bootstrap):
   - Phase A (fast): `includeDerivedTitles: false, includeLastMessage: false` → sidebar shows labels / "New chat" / `updatedAt` sort immediately
   - Phase B (background): full list with derived fields; merge into state without `loading=true`

   Add `listPennySessionsLight()` alongside existing `listPennySessions()` if needed.

4. **Remove redundant pre-send history reload** in `ChatView`:
   - `sendMessage` should skip `loadHistory()` when `sessionId` is already set (session was loaded via `switchSession`)
   - Keep reload only when `sessionId === null` (recovery path)

- [ ] Parallel bootstrap
- [ ] Conditional pre-send history
- [ ] Defer artifacts (measure before/after)
- [ ] Two-phase list only if profiling shows need
- [ ] Manual: cold load with 10+ sessions, note time to sidebar + first message

---

### Phase 4 — Sidebar incremental updates (no flash on send)

**Files:**
- Modify: `web/src/lib/chat/sessions.svelte.ts`
- Modify: `web/src/lib/components/chat/PennyShell.svelte`
- Create: `web/src/lib/chat/session-list-patch.ts`
- Create: `web/src/lib/chat/session-list-patch.test.ts`

**Approach:**

1. **`refresh({ silent?: boolean })`**
   - `silent: true` → do **not** set `loading=true`; keep existing rows visible
   - `silent: false` → current behavior (initial load only)

2. **Replace `$effect` full refresh** with:
   ```ts
   // After send completes:
   sessions.patchActiveSession({
     key: chat.state.sessionKey,
     preview: lastAssistantOrUserText(chat.state.messages),
     updatedAt: Date.now(),
   });
   void sessions.refresh({ silent: true }); // reconcile with server
   ```

3. **`patchActiveSession`** moves row to top, updates preview/title-if-default, no loading flash.

4. **Title patch rule:** only replace title when current title is `"New chat"` and first user message is available client-side.

- [ ] Implement `session-list-patch.ts` + tests
- [ ] Add `refresh({ silent })` and `patchActiveSession`
- [ ] Update `PennyShell` `$effect`
- [ ] Manual: send message → sidebar must not show "Loading chats…"

---

### Phase 5 — Connection health loop (optional but recommended)

**Files:**
- Modify: `web/src/lib/chat/client.svelte.ts`
- Modify: `web/src/lib/components/chat/PennyShell.svelte`

**Approach:**

- Poll `fetchHealth()` every 30s while tab visible (reuse visibility handler pattern)
- On recovery (`ok: true`): clear `connectionError`, silent session refresh
- SSE `onerror` → set offline immediately; poll confirms recovery

- [ ] Health poll with `visibilitychange` guard
- [ ] Recovery clears badge without full page reload

---

## Testing strategy

| Area | Unit | Manual |
|------|------|--------|
| Sanitize | `session-display-sanitize.test.ts` | Sidebar titles show user text |
| Errors | `request-error.test.ts` | Stop gateway → friendly message, not "Failed to fetch" |
| Patch | `session-list-patch.test.ts` | Send → no sidebar flash |
| Bootstrap | — | Cold load: sidebar + chat usable faster |
| Regression | existing `client.svelte.test.ts`, `session-orchestration.test.ts` | Rename/delete session still works |

Run before each phase merge:
```bash
pnpm --dir web test
pnpm --dir web check
```

---

## Out of scope (track separately)

- **OpenClaw upstream fix:** `readSessionTitleFieldsFromTranscript` should call `stripInboundMetadata` — file issue/PR on openclaw; Penny sanitization remains as defense-in-depth.
- **Session list caching** (sessionStorage / IndexedDB) — only if Phase 3 insufficient.
- **LLM-generated titles** — explicitly non-goal in sessions design spec.
- **Auth / multi-user** — non-goal.

---

## Suggested PR split

1. **PR 1 — sanitize session display** (Phase 1)
2. **PR 2 — errors + api timeouts** (Phase 2)
3. **PR 3 — startup + send path** (Phase 3)
4. **PR 4 — sidebar incremental updates + health poll** (Phase 4 + 5)

Each PR should be mergeable and improve UX on its own.

---

## Success criteria

- [ ] No sidebar title contains "untrusted metadata"
- [ ] Cold load: sidebar visible without waiting for health to finish first
- [ ] Sending a message does not replace sidebar with "Loading chats…"
- [ ] No raw "Failed to fetch" shown to user
- [ ] Gateway offline badge reflects connection state, not stale operation errors
- [ ] All existing web tests pass
