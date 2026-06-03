# Funding Artifact: Markdown → PDF

**Status:** Draft (for review)  
**Date:** 2026-06-02  
**Supersedes:** `2026-06-02-funding-brief-document.md`, `2026-06-02-funding-strategy-document.md`, redundant `brief.json` content model

---

## First principles

Three layers. Only these are the product.

```text
Penny (brain)  →  Markdown (structure)  →  PDF (body)
```

| Layer | Responsibility |
|-------|----------------|
| **Penny** | Authors content from conversation — what to include, order, depth, tone, brief vs strategy emphasis |
| **Markdown** | Structures and formats content — headings, tables, bullets, task lists, links |
| **PDF** | Delivers the artifact — pages the user scrolls, downloads, prints, and hands off |

**Design rule:** If it isn’t markdown (content) or PDF (delivery), it is **system metadata only** — never a second copy of the document, never a layout template.

**Out of scope:** `brief.json` as a content carrier, `slides.html`, custom document HTML/CSS, playbook cards, HTML iframe preview, application-side pagination.

A conversion tool may use HTML internally; that is an implementation detail of md→PDF, not part of our document model.

---

## User experience

### One artifact, one PDF, one scroll

The user opens the artifact panel and scrolls **PDF pages top to bottom**:

1. **Brief (early pages)** — situation, programs to pursue, recommendation  
2. **Strategy (later pages)** — checklists, steps, how to execute  

No tabs, no HTML preview. Page order = markdown order.

### Preview = download

Panel and **Download PDF** serve the **same file** (`brief.pdf`).

### Static document

`- [ ]` task lists render as printable boxes in the PDF. No interactive todo UI.

---

## Architecture

```text
create_funding_brief (tool input)
  → validate
  → write document.md          ← canonical content (only copy)
  → write meta.json            ← system metadata + evidence (no document body)
  → compose PDF input (document.md + verification appendix)
  → md → PDF → brief.pdf
  → update session index
  → SSE artifact.create / update
  → panel: PDF.js on brief.pdf
```

### Separation of concerns

| What | Where | User reads it? |
|------|-------|----------------|
| Document content | `document.md` → `brief.pdf` | Yes (via PDF) |
| Verification / evidence | `meta.json` | No (feeds PDF appendix + audit) |
| Panel list fields | `meta.json` + session `index.json` | Title/version only |

Penny does **not** use `{{program:N}}` placeholders. Program details in the PDF are markdown Penny wrote.

---

## On-disk layout

Per artifact: `workspace/artifacts/<sessionUuid>/<artifactId>/`

| File | Purpose |
|------|---------|
| **`document.md`** | **Canonical content.** The only on-disk copy of Penny’s markdown. Brief + strategy in one file. |
| **`brief.pdf`** | **Generated delivery.** What the user previews and downloads. |
| **`meta.json`** | **System metadata only.** No duplicate of document body. |

### `meta.json` schema (format v4)

```ts
{
  artifactId: string
  sessionUuid: string
  title: string
  version: number
  formatVersion: 4
  triggerReason: 'auto' | 'user_requested'
  createdAt: string
  updatedAt: string
  programCount: number          // derived: evidence.programs.length
  verification: {
    verifiedAt: string
    urlsChecked: string[]
    notes?: string
  }
  evidence?: {
    programs?: Array<{
      name: string
      officialUrl: string
      confidence: 'verified_live' | 'newly_discovered' | 'could_not_verify'
      // optional audit fields — never auto-rendered into PDF
    }>
  }
}
```

**Removed from disk model:**

| File | Why |
|------|-----|
| `brief.json` | Redundant — duplicated content and mixed concerns; replaced by `document.md` + `meta.json` |
| `slides.html` | HTML is not an artifact |

**Path constants:** add `DOCUMENT_MD_FILENAME`; remove `BRIEF_FILENAME`, `SLIDES_FILENAME`.

---

## Tool input contract

The tool still accepts a single payload at the boundary (no extra round trips for Penny):

| Field | Required | Written to |
|-------|----------|------------|
| `bodyMarkdown` | yes | **`document.md` only** |
| `title`, `triggerReason`, `verification` | yes | `meta.json` |
| `evidence.programs` (optional, 0–5) | no | `meta.json` |
| `artifactId` (update) | no | — |

**Never persist `bodyMarkdown` inside JSON.** Read content from `document.md` when regenerating PDF or migrating.

### Validation

- `bodyMarkdown` non-empty; must include at least one actionable element: `- [ ]` task or `1.` numbered step  
- `verification.urlsChecked` — at least one valid HTTPS URL  
- If `evidence.programs` present: validate URLs and confidence; empty array is valid  
- Drop required `programs[]`, `business`, playbook fields, `{{program:N}}`

---

## Markdown authoring (Penny skill)

One document, agent-shaped, intended order: **brief → strategy**.

GFM done well: headings, **tables**, bullets, **task lists**, numbered steps, links.

Penny does **not** paste raw verification URL walls — system appendix handles that.

---

## Verification appendix

Built at PDF time from `meta.json.verification` (+ `updatedAt`), appended to markdown **in memory only**:

```markdown
---

## Verification

Prepared {updatedAt} · Verified {verifiedAt} · {n} official sources

- [labels](urls)
{notes}
```

Not appended to `document.md`. Included in PDF converter input.

---

## Markdown → PDF

- One converter, one print profile (tables, task lists, Letter size)  
- Regenerate on create/update only  
- On PDF failure: keep `document.md` + `meta.json`; surface error; no partial PDF  

---

## Web panel

- **PDF.js** page stack from `?preview=pdf` or download route (same bytes)  
- Remove HTML preview paths entirely  
- Toolbar: title, version, optional program count from `meta.json`, Download PDF  

---

## Legacy migration

| Legacy on disk | Action |
|----------------|--------|
| `brief.json` with `bodyMarkdown` | Extract → `document.md`; metadata → v4 `meta.json`; delete `brief.json` |
| `brief.json` without `bodyMarkdown` | Best-effort markdown from structured fields → `document.md`; then delete `brief.json` |
| `slides.html` | Delete after PDF regenerated |

---

## Removal list

- `brief.json` writes and reads (`BRIEF_FILENAME`)  
- All HTML document renderers and `slides.html`  
- `shared/funding-brief-document*`, `funding-brief-playbook*`  
- `artifact-document-preview.ts`, HTML embedded styles  
- `render_document_pdf.py` (HTML input) → `render_markdown_pdf` (or equivalent)  
- Duplicate content fields in types (`FundingBriefRecord` carrying body — replace with `ArtifactMeta` + file paths)

---

## Open decisions (implementation plan)

1. **md→PDF toolchain** — pandoc vs alternatives; must handle GFM tables + task lists.  
2. **Panel label** — “Funding brief & strategy” (recommended) vs “Funding strategy”.  

---

## Success criteria

- [ ] Content lives in **`document.md` only** — no JSON copy of the document  
- [ ] User sees PDF pages; download matches preview  
- [ ] Brief precedes strategy in PDF page order (via markdown order)  
- [ ] No `brief.json`, no `slides.html` on new artifacts  
- [ ] Verification appendix in PDF, not in `document.md`  
- [ ] Optional evidence in `meta.json` only; never auto-layout into PDF  
