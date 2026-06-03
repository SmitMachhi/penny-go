# Funding Strategy Document Spec

**Status:** Approved  
**Date:** 2026-06-02

## Problem

The artifact is labeled a "brief" but owners need a **consultant-grade strategy document**: decision guidance, step-by-step playbooks, printable checklists, and delegation notes — shaped by the conversation, not a fixed template.

## Goal

Deliver a static, print-ready **funding strategy** document the agent authors from chat context. Same HTML for preview and PDF. No interactive todo state.

## Principles

1. **Agent agency** — structure, section order, and depth follow the user's situation and priorities from chat.
2. **Scaffolding, not forms** — skill heuristics suggest consultant patterns; validator does not mandate sections.
3. **Facts vs presentation** — `programs[]` holds evidence + optional playbook fields; `bodyMarkdown` holds narrative strategy.
4. **Static document** — `- [ ]` renders as printable empty boxes; no saved progress in the artifact panel.

## Architecture

```
Agent → create_funding_brief(bodyMarkdown + programs[] + verification)
     → validate evidence + at least one actionable element
     → renderFundingBriefDocumentHtml()
     → scrollable letter pages + Letter PDF
```

## Data contract (format v3)

### Required

- `title`, `triggerReason`, `bodyMarkdown` (non-empty)
- `programs[]` (1–5) with: `name`, `benefitType`, `intakeStatus`, `officialUrl`, `confidence`
- Each program must have **at least one** action path: `nextStep` and/or non-empty `steps[]`
- Document must include **at least one actionable element** in `bodyMarkdown` (task checkbox or numbered list) **or** program `steps[]`
- `verification` unchanged

### Optional program playbook fields

| Field | Type | Rendered when present |
|-------|------|------------------------|
| `verdict` | `pursue_now \| explore \| defer \| skip` | Verdict badge |
| `plainTerms` | string | "In plain terms" |
| `whyFit` | string | Summary / fit (legacy) |
| `whyNot` | string | "Watch out for" |
| `prerequisites` | string[] | "Before you apply" |
| `steps` | string[] | Numbered steps |
| `documents` | string[] | "Documents to prepare" |
| `timeline` | string | "Typical timeline" |
| `fallback` | string | "If this doesn't work" |
| `nextStep` | string | Shown when no `steps[]` |

`whyFit` / `whyNot` optional for backward compatibility; agent may use `plainTerms` instead.

### Program placeholders

`{{program:N}}` embeds a playbook block where the agent chooses. Renderer omits empty optional sections.

### Legacy records

- v1/v2 without playbook fields: render using available `whyFit` / `whyNot` / `nextStep`.
- v1 without `bodyMarkdown`: deterministic fallback body at render time (unchanged).

## Document rendering

- US Letter pages, neutral Penny typography (unchanged from v2 document renderer).
- GFM task lists (`- [ ]`) → print checkbox spans.
- Playbook blocks replace rigid "why fit / why not" cards when structured fields present.
- Verification footer auto-appended.

## UI

- Panel label: **Funding strategy** (internal tool name `create_funding_brief` unchanged).

## Out of scope

- Interactive checklists or progress tracking
- In-artifact editing
- Mandatory section order or minimum page count
- Sector-specific document templates

## Files

| Area | Files |
|------|--------|
| Schema | `shared/funding-brief-types.ts`, `shared/funding-brief.ts` |
| Playbook render | `shared/funding-brief-playbook.ts` |
| Markdown | `shared/brief-markdown.ts` |
| Document | `shared/funding-brief-document.ts`, assets, plugin mirror |
| Tool | `plugin/src/tools/create-funding-brief-tool.ts` |
| Agent | `workspace/skills/penny-artifacts/SKILL.md` |
| Web UI | `ArtifactPanel.svelte`, `DocumentPreview.svelte`, tool labels |
