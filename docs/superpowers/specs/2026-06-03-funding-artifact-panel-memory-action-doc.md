# Funding Artifact Panel: Memory / Action List Doc

**Status:** Superseded — do not implement  
**Date:** 2026-06-03  
**Superseded by:** `2026-06-04-funding-consultant-memo.md` (WYSIWYG PDF memo + version snapshots; panel previews the downloadable file)  
**Builds on:** `2026-06-02-funding-artifact-markdown-pdf.md`  
**Amends:** Web panel UX only — content model (`document.md` → `brief.pdf`) unchanged

---

## Summary

The artifact has **two deliverables**, not one preview of the other:

| Deliverable | Job | Medium |
|-------------|-----|--------|
| **Panel** | Work — remember context, execute next steps | Memory/action list (web) |
| **PDF** | Share — print, email, hand to advisor/board | Consultant memo (pages) |

Both are generated from canonical `document.md`. The user should **not** see a pixel- or layout-faithful copy of the PDF in the panel. That coupling was a category error (treating “work surface” as “print preview”).

---

## First principles

### Two jobs, two surfaces

```text
                    document.md (canonical)
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
    Panel (work)                    PDF (share)
    memory + action list            linear memo + verification appendix
    skim · act · reopen             print · forward · archive
```

| Surface | User question | Success looks like |
|---------|---------------|-------------------|
| **Panel** | What do I do today? | Next steps and checklists jump out in 30 seconds |
| **PDF** | What can I send my CFO? | Professional, complete, printable narrative |

**Preview ≠ download.** They must not be the same UI, layout, or scroll experience. They may differ in section order emphasis, density, and chrome — as long as they do not contradict on facts.

### What the user is holding in the panel

Not a “report viewer” or “PDF preview.” A **working doc** they reopen during execution:

| Mode | Question | Panel job |
|------|----------|-----------|
| **Memory** | What did we decide and why? | Context, recommendation — scannable, trustworthy |
| **Action** | What do I do next? | Ranked pursuits, next steps, checklists, numbered steps |

One linear scroll. Memory before action. No tabs, no card grid, no second content model.

### Source vs presentation

```text
Penny → document.md (canonical) → panel view + PDF export
```

| Rule | Meaning |
|------|---------|
| **One source of truth** | All facts live in `document.md` only — never a duplicate body in `meta.json` |
| **Source alignment** | Panel and PDF must not contradict programs, verdicts, amounts, deadlines, or recommendations drawn from the same version |
| **Presentation divergence** | Panel **may** reorder emphasis, collapse detail, use callouts/rails, and omit PDF-only blocks (e.g. verification appendix in body). PDF **may** stay linear, table-heavy, and print-oriented |
| **No duplicate JSON document** | `meta.json` stays metadata + evidence audit |
| **Static tasks in v1** | `- [ ]` in panel are visual only; PDF keeps printable boxes |

### What changes vs markdown-pdf spec (panel section)

| Before | After |
|--------|-------|
| Panel = PDF.js page stack | Panel = memory/action list renderer |
| Preview = same file as download | **Work panel** and **share PDF** are separate products |
| User squints at pages in a sidebar | User acts in a purpose-built panel; downloads when they need to hand off |

---

## Mental model: memory / action list doc

The artifact reads like notes Penny left for the owner:

1. **Header** — title, version, verification line, download  
2. **Memory** — situation in plain language (business, phase, recommendation)  
3. **Actions** — ranked programs and execution (each with an obvious “do this next”)  
4. **Strategy tail** — checklists and numbered steps for the 30-day plan  
5. **Trust footer** — verified date, source count (from `meta.json`; links optional)

```text
┌─────────────────────────────────────┐
│ Title · v2 · Verified Jun 3         │  [Download PDF]
├─────────────────────────────────────┤
│ MEMORY                              │
│   Recommendation (1–2 sentences)    │
│   Context bullets / short table     │
├─────────────────────────────────────┤
│ ACTIONS                             │
│   1. Program A — pursue             │
│      Next step: …                   │
│      [details collapsed optional]   │
│   2. Program B — explore            │
│      …                              │
├─────────────────────────────────────┤
│ STRATEGY                            │
│   - [ ] checklist items             │
│   1. numbered steps                 │
├─────────────────────────────────────┤
│ Verified · N sources                │
└─────────────────────────────────────┘
```

**Not in scope for v1:** interactive checkboxes, drag-reorder, inline edit, tabs, split PDF/markdown views.

---

## Authoring conventions (Penny skill)

Penny still writes one `bodyMarkdown` → `document.md`. No rigid template, but **follow these patterns** so the panel parser can emphasize memory vs action without a second schema.

### Recommended section order

1. `# {Title}` — matches artifact title  
2. `## Recommendation` — 1–3 sentences, lead with verdict  
3. `## Context` (or `## Situation`) — business facts, phase, constraints  
4. `## Programs to pursue` — ranked program blocks (see below)  
5. `## Strategy` (or `## 30-day plan`) — checklists + numbered steps  

Additional `##` sections are allowed between blocks; parser uses heading text heuristics (below).

### Per-program block (action list item)

Each program is an `###` under the programs section:

```markdown
### 1. Clean Hydrogen Investment Tax Credit (CHITC)

**Verdict:** Pursue now  
**Next step:** Confirm eligible capex line items with your tax advisor this week.

| Field | Detail |
| --- | --- |
| Benefit type | Refundable ITC |
| … | … |

**Why it fits:** …
```

**Required for panel highlight:** a line starting with `**Next step:**` (GFM bold label).  
**Optional:** `**Verdict:**` with one of: `Pursue now`, `Explore`, `Defer`, `Skip` (case-insensitive).  
**Numbering:** `### 1.` `### 2.` … establishes pursuit order.

### Actionability (unchanged)

At least one `- [ ]` checklist item or `1.` numbered step somewhere in the document (validation unchanged).

### Skill copy update (`penny-artifacts`)

Add: “Write so the artifact panel reads as a **memory/action list**: Context + Recommendation first, ranked programs with **Next step**, then Strategy checklists.”

---

## Panel information architecture

### Chrome (`ArtifactPanel` + toolbar)

| Element | Content |
|---------|---------|
| Primary title | `meta.title` only — drop generic “ARTIFACT” + fixed “Funding brief & strategy” subtitle |
| Meta line | `{programCount} programs · v{version} · verified {date}` from `meta.verification.verifiedAt` |
| Primary action | **Download PDF** — explicit handoff (“for your team / printer”), not “see the real version” |
| Copy hint (toolbar subline) | e.g. “Working view · PDF is the shareable memo” (exact copy in implementation) |

### Layout

| Property | Value |
|----------|-------|
| Default width | `min(640px, 48vw)` on desktop (wider than today’s 520px cap) |
| Mobile | Full-screen overlay (unchanged) |
| Background | Panel `bg-card`; doc surface `bg-background` with comfortable padding |
| Scroll | Single column inside `ActionListDoc` |

### In-doc section rails

Parsed sections render with subtle **section labels** (uppercase, tracked, muted) — `Memory`, `Actions`, `Strategy` — derived from markdown headings, not hard-coded tabs.

| Parser bucket | Typical source headings |
|---------------|-------------------------|
| `memory` | `Recommendation`, `Context`, `Situation`, `Executive summary`, content before first program |
| `actions` | `Programs to pursue`, `Opportunities`, numbered `### N.` program headings |
| `strategy` | `Strategy`, `30-day`, `Execution`, `Checklist`, `Next steps` (plural section) |
| `other` | Anything else — rendered in order without a rail label |

---

## View model (shared parser)

New module: `shared/artifact-action-doc.ts` (name indicative; exact export names left to implementation).

### Input

- `markdown: string` — raw `document.md` body (no verification appendix)

### Output

```ts
type ArtifactActionDocSectionKind = 'memory' | 'actions' | 'strategy' | 'other';

type ArtifactActionDocProgram = {
  rank: number;
  title: string;
  verdict?: 'pursue_now' | 'explore' | 'defer' | 'skip';
  nextStep?: string;
  bodyMarkdown: string; // remainder of ### block
};

type ArtifactActionDocSection = {
  kind: ArtifactActionDocSectionKind;
  title: string;
  markdown: string;
  programs?: ArtifactActionDocProgram[];
};

type ArtifactActionDoc = {
  title?: string; // from leading # if present
  sections: ArtifactActionDocSection[];
};
```

### Parsing rules

1. Split on `## ` headings (H2). H1 sets doc title if present.  
2. Classify each H2 section `kind` via normalized heading slug (keyword table above).  
3. Within `actions` sections, split `### ` blocks into `programs[]`.  
4. From each program block, extract:
   - `rank` from `### {N}.` prefix when numeric  
   - `verdict` from `**Verdict:**` line  
   - `nextStep` from `**Next step:**` line  
   - `bodyMarkdown` = block minus extracted lines (still rendered below callout)  
5. If no H2 structure, treat entire document as one `other` section (graceful fallback).  
6. Parser is **best-effort** — never fail panel load; fall back to full markdown render.

### Tests

- Fixture markdown files covering: full structure, missing verdict, no programs (only strategy), legacy unstructured doc  
- Assert section kinds, program order, next-step extraction  

---

## API

### Serve markdown to web

`GET /api/artifacts/[id]?sessionKey=...`

Extend JSON response (non-`preview=pdf`):

```ts
{
  artifact: ArtifactSummary;
  documentMarkdown?: string; // present when document.md exists
}
```

| Query | Response |
|-------|----------|
| `preview=pdf` | Unchanged — PDF bytes |
| (default) | JSON with `artifact` + `documentMarkdown` |

**Security:** same session key + artifact id checks as today. No directory traversal. Markdown is user-generated from Penny tool — sanitize on render (existing chat markdown pipeline).

### Web storage helper

`readArtifactDocumentMarkdown(sessionKey, artifactId)` in `web/src/lib/server/artifact-storage.ts` — mirrors PDF read pattern using `DOCUMENT_MD_FILENAME`.

---

## Web UI components

| Component | Responsibility |
|-----------|----------------|
| `ArtifactPanel.svelte` | Shell, width, multi-artifact tabs, toolbar slot |
| `ArtifactToolbar.svelte` | Title, meta line, download — simplify copy |
| `ActionListDoc.svelte` | Fetch artifact JSON, parse, render sections |
| `ActionListDocSection.svelte` | Section rail + body |
| `ActionListProgramBlock.svelte` | Rank, title, verdict pill, **next step callout**, collapsible detail (default expanded v1; collapse optional v1.1) |
| `ActionListDocBody.svelte` | Shared markdown HTML render for section/program body |

**Remove from panel path:** `DocumentPreview.svelte` PDF.js canvas stack (file may remain unused until deleted in implementation PR).

### Markdown rendering (panel profile)

Panel uses a **panel render profile** — not the PDF print stylesheet and not chat bubble styles.

- Reuse `web/src/lib/chat/markdown.ts` `renderMarkdown()` for HTML generation.  
- Add artifact-scoped CSS in `app.css` under `.artifact-action-doc`:
  - Comfortable `font-size` / `line-height` (15–16px, 1.55)  
  - `.artifact-next-step` callout (left border, muted fill) — **panel-only emphasis**  
  - `.artifact-verdict--pursue_now` etc. using `VERDICT_BADGE_STYLES` from `@penny/shared/penny-brand`  
  - Task lists → clear tappable-looking checkboxes (visual only; distinct from PDF print boxes)  
  - Tables: scroll/wrap in panel; v1 may default program detail tables **collapsed** behind “Details” while PDF keeps them inline  

**Intentional differences from PDF:** section rails (`MEMORY` / `ACTIONS`), callouts, optional collapsed tables, verification only in footer — not in the scroll body.

### Verdict & confidence

- **Verdict** — parsed from markdown `**Verdict:**` when present.  
- **Confidence** — not in markdown by default; v1 optional match `evidence.programs[].name` to program title for badge overlay. If no match, omit badge (do not invent).

---

## PDF relationship (work vs share)

| Concern | Panel (work) | PDF (share) |
|---------|--------------|-------------|
| **Purpose** | Execute | Hand off |
| **Source** | `document.md` via action-doc parser + panel CSS | `document.md` + verification appendix → md→PDF |
| **Layout** | Memory/action list, callouts, optional collapsed detail | Linear consultant memo, full tables, page breaks |
| **Verification** | Compact footer from `meta.json` | Full appendix on last pages |
| **When user opens panel** | Never show PDF pages or “this is what you’ll download” |
| **When user downloads** | Same `artifact.version` as panel fetch; regenerate PDF on create/update |

### Alignment rules (what must match)

| Must align | Must not require |
|------------|------------------|
| Same artifact `version` after update | Same section order in UI |
| Same programs ranked and named | Same table visibility |
| Same recommendation substance | Same typography or page layout |
| Same next-step *meaning* (if authored as `**Next step:**`) | Verbatim paragraph order everywhere |
| No contradictory numbers, dates, or verdicts | Panel looking like a screenshot of the PDF |

### Drift handling

On `artifact.update`, panel refetches markdown; PDF regenerates async. Brief loading state if PDF lags; panel must not fall back to PDF-as-preview.

**User-facing framing:** Panel = “your working brief”; PDF = “memo to share.” Never imply the panel is an incomplete preview of the PDF.

---

## Chat integration

| Event | Panel behavior |
|-------|----------------|
| `artifact.create` | Auto-open panel (existing behavior) |
| `artifact.update` | Refresh markdown; subtle “Updated to v{N}” in toolbar |
| User closes panel | Chip in thread reopens (unchanged) |

**Future (out of scope v1):** “Ask Penny about this program” composer prefill from `###` title.

---

## Migration & compatibility

| Case | Behavior |
|------|----------|
| `document.md` missing (legacy) | Show message + Download PDF if `brief.pdf` exists; optional PDF.js fallback for one release |
| Unstructured markdown | Full-document render in `other` — no program callouts |
| Existing PDF-only preview | Removed from default path once markdown read works |

When approved, amend `2026-06-02-funding-artifact-markdown-pdf.md`:

- Remove **Preview = download** (panel is not a preview of `brief.pdf`).  
- Replace § Web panel with pointer to this spec.  
- Reframe § User experience: PDF = share; panel = work (separate spec).

---

## Out of scope (v1)

- Persisted checkbox state / Notion-style task sync  
- In-panel markdown editing  
- Side-by-side PDF + markdown  
- Full-text search across artifacts  
- Version diff UI  
- `{{program:N}}` placeholders (still forbidden)  
- Rendering `evidence.programs` tables into the doc body  

---

## Success criteria

- [ ] Panel is a memory/action list — **not** PDF pages, not a WYSIWYG preview of the download  
- [ ] Download PDF is clearly labeled as the **shareable memo**, separate from the working view  
- [ ] Recommendation and Context appear before ranked program actions when Penny follows conventions  
- [ ] Each program block surfaces **Next step** as a panel callout when authored  
- [ ] Strategy checklists and numbered steps are easy to scan in the panel  
- [ ] Panel and PDF do not contradict on programs, verdicts, or recommendation for the same version  
- [ ] Panel **may** differ in layout, density, and emphasis from the PDF without being considered a bug  
- [ ] Parser unit tests cover structured + unstructured markdown  
- [ ] Panel width and typography meet readable defaults (no squinting in sidebar)  
- [ ] `penny-artifacts` skill documents memory/action authoring + work-vs-share split  
- [ ] PDF.js preview removed from default artifact panel path  

---

## Implementation notes (for planning phase)

Suggested work order:

1. `shared/artifact-action-doc.ts` + tests  
2. Server: read `document.md`, extend artifact GET JSON  
3. `ActionListDoc` components + CSS  
4. Wire `ArtifactPanel`; remove PDF preview default  
5. Update `penny-artifacts` skill + `docs/penny-artifacts.md`  
6. Amend markdown-pdf spec web section + success criteria cross-link  

**Open decision (resolve in plan):** collapsible program detail default — expanded (recommended for v1 simplicity) vs collapsed with next-step only visible.

---

## Spec self-review

| Check | Result |
|-------|--------|
| Placeholders | None — collapsible default flagged as open decision for plan |
| Consistency | One `document.md`; two presentation profiles (panel vs PDF) |
| Scope | Panel + parser + API + skill; no PDF pipeline rewrite |
| Ambiguity | “Memory/Actions” are panel buckets; PDF stays linear share memo |
