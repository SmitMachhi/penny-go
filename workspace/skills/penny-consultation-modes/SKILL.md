---
name: penny-consultation-modes
description: Two consultation entry paths — opportunity-backed vs aspiration-first — both deliver a funding-aligned operating plan.
---

# Consultation modes

Penny offers **two ways to start**. Both end in the same deliverable today: a **funding-aligned operating plan** (`create_funding_brief` → panel + PDF). This is not a full MBA business plan — it is what to do, which verified programs to pursue, and how to shape the business narrative to qualify.

**Do not confuse** these modes with **corpus hit** vs **corpus miss** (see `penny-funding` skill) — those are internal search fallbacks only.

## Mode detection

| Signal | Mode |
|--------|------|
| Existing company, revenue, employees, or draft operating plan | `opportunity_backed` |
| Industry + location + “want to start” without an operating business | `aspiration_first` |
| Ambiguous | Ask once: “Do you already have a business, or are you exploring an idea?” |

On first classification, write or update the engagement memory header in `memory/engagements/<uuid>.md`:

```markdown
## Consultation
mode: opportunity_backed
jurisdiction: ON
industry: …
stage: idea | planning | operating
updated: YYYY-MM-DD
```

Re-check mode if the user pivots (e.g. “we’re pre-revenue”).

---

## Mode: Opportunity-backed

**User need:** “What funding fits us?” / “Align our plan to grants and ITCs.”

### Intake (minimal)

Ask only what changes eligibility or `search_corpus` keywords:

1. Jurisdiction (province/territory; include federal when relevant)
2. Business type / sector
3. What they sell or do today
4. Project or spend to fund (if any)
5. Timeline / urgency
6. Optional: written plan → capture bullet summary in engagement memory (text in chat only; no file parse in v1)

### Workflow

```text
Intake → search_corpus → read_official_source per candidate
      → [corpus miss → web_search (official domains) → read_official_source]
      → rank ≤5 programs → create_funding_brief (section pattern below)
```

### Artifact `bodyMarkdown` pattern

Use this section order when it serves the user:

1. `# {Title}`
2. `## Recommendation`
3. `## Context` — current business snapshot
4. `## Plan alignment` — what to emphasize or change to qualify (activities, capex, hiring, geography, timing). Label as direction, not legal or tax advice.
5. `## Programs to pursue` — `### 1.` … with **Verdict:** and **Next step:**
6. `## Strategy` — `- [ ]` checklists and `1.` numbered steps

**Chat:** short summary + pointer to the funding plan in the panel.

---

## Mode: Aspiration-first

**User need:** “I want to work in {industry} in {location}” — find funding and a business shape to build toward.

### Intake

1. Industry / activity → keywords
2. Location → `jurisdiction`
3. Stage: idea | planning | operating
4. Optional constraints (budget, solo vs team, timeline, what they will not do yet)

### Workflow

Same tools as opportunity-backed. After verification, give a short opportunity landscape in chat, then `create_funding_brief`.

If corpus is thin: say so, use corpus-miss flow (`web_search` on official domains only), do not invent programs.

### Artifact `bodyMarkdown` pattern

1. `# {Title}`
2. `## Recommendation` — honest if few verified programs
3. `## Aspiration` — industry, location, constraints
4. `## Recommended business shape` — hypothesis: structure, activities, geography, project types that unlock top programs. Validate with advisors.
5. `## Programs to pursue` — same program block rules as `penny-artifacts`
6. `## Launch strategy` — registration, first revenue, hire, capex — ordered by verified intake/deadlines where known

**Chat:** short landscape + pointer to panel.

---

## Shared rules

- Follow `workspace/AGENTS.md` tool order and evidence gate.
- Follow `penny-funding` for corpus hit/miss.
- Follow `penny-artifacts` for when to call `create_funding_brief` and actionability (`- [ ]` or `1.`).
- Write for the **memory/action list** panel: recommendation and context before ranked programs with **Next step:**.

## Later (out of scope)

Classic business plan with funding spine (market, financials, team) — separate spec when scoped.
