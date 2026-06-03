# Funding Brief Document Spec

**Status:** Approved  
**Date:** 2026-06-02

## Problem

Funding briefs are rendered as a fixed slide deck: rigid JSON slots, one program per slide, carousel navigation, blue-tinted branding, and a 16:9 viewport. The agent fills a form; a template decides layout. Preview and PDF feel like PowerPoint, not a document.

## Goal

Replace the slideshow with an agent-authored **letter-size document** that:

1. Lets the agent choose structure and narrative from chat context
2. Keeps structured program facts for evidence validation
3. Matches the neutral Penny web UI typography and palette
4. Previews as scrollable pages and exports as US Letter PDF

## Architecture

```
Agent → create_funding_brief(bodyMarkdown + programs[] + verification)
     → validate facts (programs, URLs, confidence)
     → renderFundingBriefDocumentHtml()
     → scrollable page preview + Letter PDF
```

### Separation of concerns

| Layer | Owner | Responsibility |
|-------|-------|----------------|
| **Facts** | Agent + validator | Programs, confidence, official URLs, verification metadata |
| **Presentation** | Agent (`bodyMarkdown`) | Section order, headings, prose, where program blocks appear |
| **Layout** | Renderer | Markdown → HTML, program block insertion, pagination, print CSS |

## Data contract (format v2)

### Required

- `title: string`
- `triggerReason: 'auto' | 'user_requested'`
- `bodyMarkdown: string` — agent-authored document body (headings, lists, tables, prose)
- `programs[]` — max 5, same evidence fields as today
- `verification` — unchanged

### Optional

- `business` — deprecated for layout; kept optional for indexing/backward compat only
- `formatVersion: 2` — stored on `FundingBriefRecord`

### Program placeholders

Agent may embed structured program cards in markdown using:

```
{{program:0}}
{{program:1}}
```

Index is zero-based into `programs[]`. If no placeholders appear, the renderer appends a **Program details** appendix with all programs.

### Legacy v1 records

Records without `bodyMarkdown` are upgraded at render time from title + business + programs (deterministic fallback). New artifacts require `bodyMarkdown`.

## Document rendering

### Page model

- **Size:** US Letter (8.5" × 11")
- **Margins:** 0.75in
- **Preview:** Vertical stack of `.page` elements, centered, subtle shadow, neutral gutter
- **PDF:** Same HTML, Playwright `format: Letter`, print CSS

### Pagination

Renderer splits markdown HTML into blocks, estimates block height, packs into pages server-side. No carousel JS.

### Typography

Reuse neutral tokens from `shared/penny-brand.ts` (aligned with `web/src/app.css`). Document body mirrors `.penny-markdown` rules.

## UI changes

- `SlidePreview.svelte` → `DocumentPreview.svelte`
- Embedded preview hides deck toolbar/controls; shows scrollable page stack
- Chat/skill copy: "brief" / "document", not "slides"

## Files

| Area | Files |
|------|-------|
| Schema | `shared/funding-brief-types.ts`, `shared/funding-brief.ts` |
| Markdown | `shared/brief-markdown.ts` |
| Tokens | `shared/penny-brand.ts` |
| Renderer | `plugin/src/services/funding-brief-document.ts`, `funding-brief-document-assets.ts` |
| Remove | `funding-brief-slides.ts`, `funding-brief-deck-assets.ts` |
| PDF | `tools/render_document_pdf.py` |
| Web | `DocumentPreview.svelte`, `artifact-preview.ts`, `ArtifactPanel.svelte` |
| Agent | `create-funding-brief-tool.ts`, `workspace/skills/penny-artifacts/SKILL.md` |

## Non-goals (v2)

- Dark-mode document preview
- Agent-authored raw HTML
- Client-side reflow pagination

## Success criteria

1. Agent-written markdown controls section order and emphasis
2. Preview scrolls through letter pages, no prev/next carousel
3. Visual palette matches chat UI (neutral, not blue)
4. PDF is Letter size and matches preview content
