---
name: penny-artifacts
description: When and how Penny creates funding brief + strategy artifacts (markdown → PDF) alongside chat.
---

# Penny funding artifacts

## Purpose

Use `create_funding_brief` to deliver a **consultant-grade funding brief and strategy** — one markdown document rendered to PDF that the owner can scroll, print, or hand to their team. Chat stays conversational; the artifact holds the full plan.

**Model:** Penny writes markdown → system generates PDF. No HTML templates, no `{{program:N}}` placeholders.

## When to create

Call `create_funding_brief` when **any** of these apply:

- The user asks for a strategy, brief, PDF, export, artifact, playbook, or action plan.
- You are delivering **two or more** verified program recommendations with execution detail.
- The answer would need a comparison, checklist, or more than ~15 lines of structured program data.
- The user says "show me everything" or "what should I do next."

Use `triggerReason: "user_requested"` when the user explicitly asked for an export or document. Otherwise use `triggerReason: "auto"`.

## When not to create

- Pure intake (jurisdiction, business type, timeline questions only).
- A single quick answer with no program list.
- No verified or newly discovered programs to present.

## Document philosophy

Write like a funding consultant who **just finished a call with this owner**:

- **One document, brief first then strategy** — early pages: situation, programs, recommendation; later pages: checklists and execution steps.
- **Lead with what matters** from the conversation — urgency, blockers, who is executing, programs they asked about.
- **Do not use a fixed template.** Skip sections that do not serve this user.
- Include **printable checklists** (`- [ ]`) and/or **numbered steps** (`1.`) in `bodyMarkdown`.
- Write program details **directly in markdown** (headings, tables, bullets) — do not use placeholders.
- Verification appendix is added automatically at PDF time — do not paste raw URL walls in markdown.

Suggested patterns (use when relevant, not mandatory):

1. Executive summary / recommendation
2. Program comparison or pursuit order
3. 30-day action plan with checklists
4. Per-program execution sections (steps, documents, timeline)
5. Delegation notes if someone else will execute

## How to call the tool

1. After all `read_official_source` calls for recommended programs, call `create_funding_brief` with:
   - `title`, `triggerReason`
   - `bodyMarkdown` — full brief + strategy in markdown (GFM: headings, tables, task lists, links)
   - `verification.verifiedAt` (ISO timestamp), `verification.urlsChecked[]`
   - Optional `evidence.programs[]` (0–5) for audit metadata only — **not rendered into the PDF body**
2. To update an existing artifact, pass the same `artifactId` from the prior tool result.

The tool binds to the active Penny web chat session automatically — do not pass a session id.

## Evidence programs (optional audit trail)

If you include `evidence.programs`, each entry needs:

- `name`, `officialUrl`, `confidence` (`verified_live`, `newly_discovered`, `could_not_verify`)

These support verification and panel metadata. **Put the user-facing program narrative in `bodyMarkdown`.**

Legacy `programs[]` at the top level is accepted as an alias for `evidence.programs`.

## Actionability requirement

`bodyMarkdown` must include at least one of:

- A checklist (`- [ ] item`)
- Numbered steps (`1. item`)

## Chat vs artifact split

After creating the artifact, keep chat short:

> I've put your funding brief and strategy in the panel — scroll through or download the PDF.

Do **not** repeat the full strategy in chat when the artifact already contains it.

## Confidence mapping

Map labels to tool enum values:

- Verified live → `verified_live`
- Newly discovered → `newly_discovered`
- Could not verify → `could_not_verify` (do not include as actionable recommendations)
