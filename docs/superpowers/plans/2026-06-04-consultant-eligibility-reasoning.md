# Consultant Eligibility Reasoning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Penny reasons like a human grant consultant — specific fit bands, earned program count, unlock paths, and supplemental discovery — without redundant skills or conflicting templates.

**Architecture:** One intelligence contract in `penny-funding` (search + adjudication + levers). `penny-consultation-modes` and `penny-artifacts` only add mode-specific artifact sections. `AGENTS.md` / `SOUL.md` stay short invariants. Optional `search_corpus` relevance hint in plugin. No fifth skill file.

**Tech Stack:** OpenClaw workspace skills, `penny-tools` plugin, `shared/funding-brief*`, existing artifact PDF pipeline.

---

## Anti-redundancy rules

| Do | Don't |
|----|--------|
| Rewrite `penny-funding` as the single consultant loop | Add `penny-consultant-reasoning` skill |
| Trim duplicated workflows from `penny-consultation-modes` | Repeat tool-order in three skills |
| Amend `2026-06-04-funding-consultant-memo.md` § Intelligence | New parallel memo spec |
| Map fit bands → existing `ProgramVerdict` enum | New confidence enum for eligibility |
| Update smoke prompts in `docs/penny-local-setup.md` once | Scatter new test docs |

---

## Fit model (canonical vocabulary)

| User-facing (markdown) | `evidence.programs[].verdict` | `confidence` |
|------------------------|-------------------------------|----------------|
| **Strong fit** | `pursue_now` | `verified_live` or `newly_discovered` |
| **Conditional fit** | `explore` | same |
| **Stretch** | `defer` | same |
| **Ruled out** | `skip` | optional `could_not_verify` if live read failed |

**Verification confidence** (source provenance) stays separate from **fit** (eligibility for this business).

Chat may use the user-facing labels; tool evidence uses `verdict` + `confidence`.

---

## Phase 1 — Spec alignment (docs only)

### Task 1: Amend consultant memo spec (intelligence layer)

**Files:**
- Modify: `docs/superpowers/specs/2026-06-04-funding-consultant-memo.md`

- [ ] Add subsection under Layer 1 (Intelligence): consultant loop (snapshot → ask → discover → verify → adjudicate → levers → deliver).
- [ ] Replace “rank ≤5 programs” language with “earned N (max 5), grouped by fit band.”
- [ ] Add required artifact sections: `## Strong fits`, `## Conditional fits`, `## Qualification levers`, optional `## Ruled out`, optional `## How programs work together`.
- [ ] Document weak-corpus → supplemental `web_search` (not only empty corpus).
- [ ] Note: `% and stacking` only when live official text supports; otherwise “enhanced rate mentioned — confirm with advisor.”

### Task 2: Patch consultation-modes spec (remove drift)

**Files:**
- Modify: `docs/superpowers/specs/2026-06-03-consultation-modes.md`

- [ ] Point workflow diagrams to `penny-funding` consultant loop (one line, no duplicate ASCII).
- [ ] Update shared rules table: weak relevance → `web_search`; fit bands in artifact.
- [ ] Mark checklist items for fit-band artifact sections.

### Task 3: Trim setup / completion docs

**Files:**
- Modify: `docs/penny-local-setup.md` (§6d–6g pass criteria)
- Modify: `docs/penny-completion-plan.md` (Phase E expectations)

- [ ] Corpus-hit smoke: must **not** list generic federal programs without engagement-specific fit anchors.
- [ ] Corpus-miss / weak: supplemental `web_search` with snapshot-shaped queries.
- [ ] Artifact smoke: fit-band sections + at least one qualification lever when conditionals exist.

---

## Phase 2 — Skills (primary behavior change)

### Task 4: Rewrite `penny-funding` (single source of truth)

**Files:**
- Modify: `workspace/skills/penny-funding/SKILL.md`

- [ ] Update description: consultant eligibility engine; corpus is candidate pool.
- [ ] **Engagement snapshot:** require `## Facts` / `## Unknowns` in engagement memory before search; keywords from project + sector + mechanism (reject generic keyword lists).
- [ ] **Question triggers:** ask only when answer moves strong ↔ ruled-out; explain why in one line.
- [ ] **Two-pass:** (1) `search_corpus` + optional weak-hit `web_search` → pool; (2) adjudicate with `read_official_source` per named program.
- [ ] **Weak corpus:** define triggers — e.g. top `corpus_keyword_score` 0, or top 5 all below threshold, or same generic program types; then scoped official-domain `web_search` built from snapshot.
- [ ] **Tier-2 blocklist:** famous federal programs need two engagement-specific facts + live page support for **Strong fit**.
- [ ] **Fit bands** and chat output rules; max 5 **earned** programs.
- [ ] **Qualification levers:** top 2–4 unlock paths (change → unlocks → evidence → caveat).
- [ ] **Interactions:** pairs only when both verified; no invented stacking math.
- [ ] Remove old “corpus hit → never web_search” absolute; replace with relevance rules above.
- [ ] Delete duplicated content that belongs in `penny-artifacts` (when to call tool only — one cross-link).

### Task 5: Slim `penny-consultation-modes`

**Files:**
- Modify: `workspace/skills/penny-consultation-modes/SKILL.md`

- [ ] Replace inline workflow ASCII with: “Follow `penny-funding` consultant loop.”
- [ ] Update artifact patterns:
  - Opportunity-backed: add `## Qualification levers`; rename program area to fit-band sections (see Task 6).
  - Aspiration-first: levers live under `## Recommended business shape` + `## Qualification levers`.
- [ ] Intake: link questions to `Unknowns` that gate programs.
- [ ] Remove “rank ≤5” — reference earned N from `penny-funding`.

### Task 6: Update `penny-artifacts`

**Files:**
- Modify: `workspace/skills/penny-artifacts/SKILL.md`

- [ ] Program blocks grouped under `## Strong fits` / `## Conditional fits` / `## Stretch` (not a flat ranked list only).
- [ ] Each `### Program name` block requires: **Fit:**, **Verdict:** (maps enum), **Why for you:** (engagement quote), **Why not:**, **Next step:**.
- [ ] New sections: `## Qualification levers`, `## How programs work together` (optional), `## Ruled out` (optional, max 3 one-liners).
- [ ] `evidence.programs[]`: require `verdict` when program is actionable; document mapping table (link to plan fit model).
- [ ] Soften “two or more programs → create brief” → “substantial fit assessment or user asks for plan.”

### Task 7: Dedupe `AGENTS.md` and `SOUL.md`

**Files:**
- Modify: `workspace/AGENTS.md`
- Modify: `workspace/SOUL.md`

- [ ] `AGENTS.md`: keep scope, forbidden products, tool order one-liner, memory scoping; remove prose duplicated in `penny-funding` (point to skill).
- [ ] `SOUL.md`: replace “max five ranked matches” with fit-band delivery; require fit label per program in chat; encourage questions that unlock bands; keep stop-slop.

---

## Phase 3 — Tooling hints (small, optional but recommended)

### Task 8: `search_corpus` relevance metadata

**Files:**
- Modify: `plugin/src/domain/corpus-search.ts`
- Modify: `plugin/src/domain/corpus-types.ts`
- Modify: `plugin/src/tools/search-corpus-tool.ts` (or equivalent)
- Test: `plugin/src/search-corpus.test.ts`

- [ ] Add constant `MIN_CORPUS_KEYWORD_SCORE_FOR_RELEVANCE` (start with `1`).
- [ ] Return `poolRelevance: 'strong' | 'weak' | 'empty'` on tool result from top scores + row count.
- [ ] Document in tool description: weak/empty suggests supplemental `web_search` per `penny-funding`.

### Task 9: Tool descriptions align with skills

**Files:**
- Modify: `plugin/src/tools/create-funding-brief-tool.ts`
- Modify: `plugin/src/index.ts` (tool registration descriptions)

- [ ] `create_funding_brief` description mentions fit bands, levers, `verdict` field.
- [ ] `search_corpus` description: candidate pool, not recommendations.

---

## Phase 4 — Shared validation & UI (only if needed)

### Task 10: Validation / playbook nudges

**Files:**
- Modify: `shared/funding-brief.ts` (optional: recommend `verdict` when `programs[]` present)
- Modify: `shared/funding-brief-playbook.ts` (if section headings styled)
- Test: `shared/funding-brief.test.ts`

- [ ] **YAGNI default:** no hard validation of markdown section names (agentic body).
- [ ] If `programs[]` entries exist without `verdict`, soft warning in validation or test fixture only.
- [ ] Ensure playbook/PDF still renders new headings (generic markdown — likely no change).

### Task 11: Web UI labels (only if transcript/tool labels confuse)

**Files:**
- Maybe: `web/src/lib/chat/tool-presentations.ts`, `run-status-headline.ts`

- [ ] Only if product copy should say “Checking program fit” vs “Searching corpus” — skip if no user confusion.

---

## Phase 5 — Verification

### Task 12: Automated tests

- [ ] `plugin/src/search-corpus.test.ts` — poolRelevance weak/empty/strong cases.
- [ ] `shared/funding-brief.test.ts` — verdict + confidence pairs.
- [ ] Existing `shared/artifact.test.ts` — update fixtures if sample markdown sections change.

### Task 13: Manual agent smokes (local)

Run from `docs/penny-local-setup.md` (updated criteria):

| Session | Pass signal |
|---------|-------------|
| ON SaaS hiring Q3 | Specific keywords; no generic SR&ED unless R&D facts; strong/conditional bands; levers mention hires/capex |
| Inuvik tourism | weak pool → `web_search`; newly discovered labeled |
| Aspiration-first NWT | business shape + conditional programs + levers |

### Task 14: Workspace skill list unchanged

**Files:**
- Verify: `config/openclaw.penny.example.json5` skills array — still four skills, no new entry.

---

## Implementation order (recommended)

1. Task 4 (`penny-funding`) + Task 7 (`AGENTS`/`SOUL`) — biggest behavior win.
2. Task 5–6 (modes + artifacts) — consistent memo shape.
3. Task 1–3 (specs/docs) — lock acceptance criteria.
4. Task 8–9 (plugin hints) — reduces model guesswork on weak corpus.
5. Task 10–13 (validation + smokes).

---

## Out of scope (later)

- Corpus JSONL tagging (`wage-subsidy`, `tourism`, etc.) — offline curation pass.
- Deterministic fit scoring in code (stay agentic adjudication).
- UI badges for fit bands in panel (markdown headings sufficient for v1).
- Classic MBA business plan mode.

---

## Success criteria (ship gate)

- [ ] No conflicting “always five / never web_search on hit” language in workspace skills.
- [ ] One consultant loop documented in `penny-funding` only.
- [ ] Artifacts show fit bands + ≥1 qualification lever when conditionals exist.
- [ ] Generic federal programs absent unless snapshot supports strong fit.
- [ ] E4/E5/E7 smokes pass under updated `penny-local-setup.md`.
