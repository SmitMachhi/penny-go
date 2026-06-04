# Consultation Modes: Opportunity-Backed vs Aspiration-First

**Status:** Approved (Phase 1–2 implemented)  
**Date:** 2026-06-03  
**Builds on:** `2026-06-02-funding-strategy-document.md`, `2026-06-03-funding-artifact-panel-memory-action-doc.md`  
**Decision:** **A now** (funding-aligned operating plan), **B later** (classic business plan with funding emphasis)

---

## Summary

Penny serves Canadian businesses as a grant/ITC consultant. Owners need **two ways to start** a consultation that both end in the same deliverable family today: a verified **funding-aligned operating plan** in the artifact panel + PDF.

| Mode | User arrives with | Penny’s job |
|------|-------------------|-------------|
| **Opportunity-backed** | Existing business and/or draft plan; wants funding that fits | Find verified programs → **align** the operating plan to qualify and apply |
| **Aspiration-first** | Industry, location, stage (“I want to do X in Y”) | Search corpus (+ web on miss) → **propose** business shape → operating plan to **capture** programs |

**Terminology (avoid confusion):**

| Name in this spec | Meaning |
|-------------------|---------|
| **Opportunity-backed** / **Aspiration-first** | User-facing consultation modes (this spec) |
| **Corpus hit** / **Corpus miss** | Internal search fallback (`search_corpus` strong vs weak → `web_search`) — rename in skills/docs; do **not** call these “Path A/B” for users |

**Deliverable now (A):** Funding-aligned **operating plan** — what to do, when, which programs, what to change in the business/project narrative. Same tool: `create_funding_brief`. Same evidence gate: `search_corpus` → `read_official_source` (→ `web_search` only on corpus miss).

**Deliverable later (B):** Classic business plan chapters (market, competition, financials, org) with **funding as the spine** — separate spec when scoped.

---

## Problem

Today Penny optimizes for **program discovery + funding strategy**, not an explicit **consultation entry path**. Users who say “help me build a business around grants in Ontario” and users who say “here’s my company — what funding fits?” follow the same implicit flow. That makes positioning fuzzy and makes artifact sections generic.

---

## Goals

1. Two recognizable **entry paths** without new search tools in v1.
2. Both paths produce artifact markdown that reads as **memory + actions** (panel spec).
3. Operating plan content is **evidence-backed** — no program claims without live verification in-session.
4. Clear **roadmap** to classic business plan (B) without blocking A.

## Non-goals (v1)

- Upload/parse user business plan PDFs
- Financial projections or cap-table modeling
- New artifact tool name or format version bump solely for modes
- Interactive checklist state in the panel
- NAICS picker or structured sector UI

---

## Product framing

### What we call the deliverable (A)

**Funding-aligned operating plan** (user-facing; internal tool still `create_funding_brief`):

- **Memory:** situation, recommendation, constraints  
- **Actions:** ranked programs with **Next step** + plan adjustments  
- **Strategy:** 30-day / launch checklists and numbered steps  

Not a 40-page MBA business plan. Copy and skills must say so plainly to set expectations.

### What B adds later

Classic plan sections (market, competition, revenue model, milestones, team) authored with **funding programs as the organizing spine** — each chapter ties to verified mechanisms where possible. Likely: new skill playbook + optional `create_business_plan` tool alias; reuse markdown → PDF pipeline.

---

## Mode: Opportunity-backed

### Best for

- Operating business or serious draft plan  
- “What grants/ITCs fit us?” / “Adjust our plan for funding”  
- User may paste plan sections in chat (v1: text only)

### Intake (minimal questions)

Ask only what changes eligibility or search keywords:

1. Jurisdiction (province/territory; federal inclusion default on)  
2. Business type / sector (plain language)  
3. What they sell or do today  
4. Project or spend they want funded (if any)  
5. Timeline / urgency  
6. Optional: “Do you have a written plan?” → capture bullets in engagement memory, not a file parse

### Workflow

```text
Intake → search_corpus(jurisdiction, keywords from business+project)
      → read_official_source per candidate
      → [corpus miss → web_search (official domains) → read_official_source]
      → rank ≤5 programs
      → create_funding_brief (opportunity-backed section pattern)
```

### Artifact section pattern (recommended `bodyMarkdown`)

1. `# {Title}`  
2. `## Recommendation` — lead with pursue/explore/defer posture  
3. `## Context` — **current business** snapshot (from chat + engagement memory)  
4. `## Plan alignment` — **what to emphasize or change** in their operating narrative to qualify (activities, capex, hiring, geography, timing); label as direction not legal/tax advice  
5. `## Programs to pursue` — ranked `### N.` blocks with **Verdict:** and **Next step:**  
6. `## Strategy` — `- [ ]` checklists + `1.` numbered steps (application order, internal prep)

**Emphasis:** Retrofit — “given *this* business, here’s how funding maps and what to adjust.”

### Chat vs artifact

- Chat: 3–5 bullet summary + pointer to artifact  
- Artifact: full alignment + program detail  

---

## Mode: Aspiration-first

### Best for

- Idea-stage or career pivot  
- “I want to work in {industry} in {location}”  
- No existing business plan required

### Intake

1. Industry / activity (plain language → keyword list)  
2. Location → `jurisdiction` for `search_corpus`  
3. Stage: idea | planning | already operating (changes tone, not evidence rules)  
4. Constraints: budget band, solo vs team, timeline (optional)  
5. What they will **not** do (e.g. no employees yet) if stated

### Workflow

Same tool chain as opportunity-backed. Difference is **synthesis order** and artifact sections:

```text
Intake → search_corpus → verify → [corpus miss path]
      → chat: short opportunity landscape (≤5 verified)
      → create_funding_brief (aspiration-first section pattern)
```

### Artifact section pattern

1. `# {Title}`  
2. `## Recommendation` — best path given verified programs (honest if corpus thin)  
3. `## Aspiration` — industry, location, constraints (memory)  
4. `## Recommended business shape` — **hypothesis**: legal structure, core activities, geography, project types that unlock top programs; clearly labeled as direction to validate with advisors  
5. `## Programs to pursue` — same program block rules as panel spec  
6. `## Launch strategy` — checklists: registration, first revenue, first hire, first capex — **ordered by program deadlines/intake** where known from verified pages  

**Emphasis:** Greenfield — “given *these verified programs*, here’s a business shape worth building.”

### Honesty when corpus is thin

- Say so in chat before `web_search`  
- Do not invent programs; aspiration-first still requires verification  
- `## Recommended business shape` may be shorter with explicit “explore after verifying X” steps  

---

## Shared rules (both modes)

| Rule | Source |
|------|--------|
| `search_corpus` before recommending specific programs | `workspace/AGENTS.md` |
| `read_official_source` per recommended URL | `workspace/AGENTS.md` |
| `web_search` only on corpus miss | `penny-funding` skill (rename to corpus hit/miss) |
| ≤5 ranked programs | `SOUL.md` |
| `create_funding_brief` when ≥2 verified programs with execution detail or user asks for plan/PDF | `penny-artifacts` |
| At least one `- [ ]` or `1.` in `bodyMarkdown` | artifact validation |
| Panel: memory before actions | `2026-06-03-funding-artifact-panel-memory-action-doc.md` |

---

## Engagement memory

Per-session file: `memory/engagements/<uuid>.md`

### Header block (agent-maintained)

```markdown
## Consultation
mode: opportunity_backed | aspiration_first
jurisdiction: ON
industry: …
stage: idea | planning | operating
updated: 2026-06-03
```

### Body

- **Opportunity-backed:** business facts, project, plan notes (paste summaries), open questions  
- **Aspiration-first:** aspiration thesis, constraints, recommended shape (revise as programs verified)  

Never write business facts to `MEMORY.md` or other engagement files (`AGENTS.md`).

---

## Mode detection

| Signal | Mode |
|--------|------|
| User describes existing company, revenue, employees, current plan | `opportunity_backed` |
| User describes industry + location + “want to start” without operating business | `aspiration_first` |
| Ambiguous | Ask once: “Do you already have a business, or are you exploring an idea?” |

Persist `mode` in engagement memory on first classification; re-check if user pivots (“actually we’re pre-revenue”).

---

## Implementation phases

### Phase 1 — Skills & copy (no plugin changes)

| File | Change |
|------|--------|
| `workspace/skills/penny-consultation-modes/SKILL.md` | **New** — modes, intake, artifact patterns, mode detection |
| `workspace/skills/penny-funding/SKILL.md` | Rename corpus hit/miss; reference consultation modes |
| `workspace/skills/penny-artifacts/SKILL.md` | Mode-specific section guidance; memory/action list wording |
| `workspace/SOUL.md` | One-line mode question when ambiguous; deliverable name “funding-aligned operating plan” |
| `config/openclaw.penny.example.json5` | Add `penny-consultation-modes` to skills list |
| `docs/penny-local-setup.md` | Smoke prompts for both modes |

**Exit:** Agent runs produce distinct artifact section headings per mode; evidence trace unchanged.

### Phase 2 — Web entry (optional, small)

| Area | Change |
|------|--------|
| Home empty state (`PennyShell` or chat home) | Two starter cards → prefill first user message |
| Session | No new API field required in v2; first message + engagement file sufficient |

Starter copy (bullet prefill with `[ ]` hints — user replaces, then sends):

- **Align my business to funding** — province/territory, sector, what they do, optional project; ask for verified grants/ITCs + plan alignment  
- **Explore an idea** — industry, province/territory, stage, optional constraints; ask for verified funding + proposed business shape

### Phase 3 — Panel parser (if not already shipped)

Ensure `shared/artifact-action-doc.ts` maps:

| Mode | Extra memory headings |
|------|------------------------|
| Opportunity-backed | `Plan alignment` → `memory` bucket |
| Aspiration-first | `Aspiration`, `Recommended business shape` → `memory` bucket |
| Both | `Launch strategy` → `strategy` bucket (alias of Strategy) |

### Phase 4 — B (later spec)

- `docs/superpowers/specs/YYYY-MM-DD-business-plan-funding-spine.md`  
- Chapters: market, model, team, financials — each with “funding hooks” from verified programs  
- Optional plan upload, `create_business_plan` tool alias, longer PDF template  

---

## UI labels (v1)

| Surface | Label |
|---------|-------|
| Artifact panel / download | **Funding plan** or **Funding-aligned plan** (pick one in implementation; avoid “business plan” until B) |
| Tool strip | Keep internal `create_funding_brief`; subtitle can say “Funding plan” |
| Home cards | “Align my business to funding” / “Explore an idea” |

---

## Verification & smoke

| Test | Pass |
|------|------|
| Opportunity-backed prompt (ON SaaS, operating) | `search_corpus` → `read_official_source` → artifact with `## Plan alignment` |
| Aspiration-first prompt (Inuvik tourism, idea) | Corpus or miss path → artifact with `## Recommended business shape` |
| Mode persisted | `memory/engagements/<uuid>.md` contains `mode:` |
| Panel | Memory rail shows recommendation + context/aspiration before programs |

Reuse setup doc geography examples; add mode-specific expected headings to checklist.

---

## Open questions (resolve in review)

1. Panel title: **Funding plan** (chosen for v1).  
2. Should home starters create engagement file header before first agent turn (server-side) or agent-only?  
3. When user uploads a plan in B, reuse `read_official_source` pattern or document parser service?

---

## Files (Phase 1 touch list)

| Area | Files |
|------|--------|
| New skill | `workspace/skills/penny-consultation-modes/SKILL.md` |
| Skills | `workspace/skills/penny-funding/SKILL.md`, `workspace/skills/penny-artifacts/SKILL.md` |
| Voice | `workspace/SOUL.md` |
| Config example | `config/openclaw.penny.example.json5` |
| Docs | `docs/penny-local-setup.md`, `docs/penny-completion-plan.md` (smoke table) |

No changes to `create_funding_brief` schema for Phase 1.

---

## Self-review

- [x] A vs B scope explicit; B deferred with funding-spine note  
- [x] Distinct from corpus hit/miss naming  
- [x] Reuses existing tools and panel spec  
- [x] Phased implementation; Phase 1 is skills-only  
- [x] No duplicate JSON document body; markdown conventions only  
