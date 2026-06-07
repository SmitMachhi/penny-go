---
name: penny-artifacts
description: When and how Penny creates funding-aligned operating plans (markdown → PDF) alongside chat.
---

# Penny funding artifacts

## Purpose

Use `publish_funding_brief` to deliver a **funding-aligned operating plan** — one markdown document rendered to PDF that the owner can scroll, print, or hand to their team. Chat stays conversational; the artifact holds the full plan.

**Not** a 40-page MBA business plan. Set that expectation in chat when users say “business plan.”

**Model:** Penny writes markdown → system generates PDF. No HTML templates, no `{{program:N}}` placeholders.

**Memo layout:** Write a consultant-grade **funding memo** the owner will download as PDF. Lead with Recommendation + Context or Aspiration, fit bands with **Fit:**, **Verdict:**, and **Next step:**, then Strategy or Launch strategy checklists. The web panel previews the **same PDF** they download.

## Consultation mode sections

Follow `penny-consultation-modes` for intake. Use the matching `bodyMarkdown` section pattern:

| Mode | Extra memory sections | Execution section |
|------|----------------------|-------------------|
| **Opportunity-backed** | `## Context`, `## Plan alignment` | `## Strategy` |
| **Aspiration-first** | `## Aspiration`, `## Recommended business shape` | `## Launch strategy` |

Both modes still need `## Recommendation`, fit-band sections, **Verdict:**, and **Next step:** per actionable program.

## When to create

Call `publish_funding_brief` when **any** of these apply:

- The user asks for a strategy, plan, brief, PDF, export, artifact, playbook, or action plan.
- You are delivering a substantial fit assessment or **two or more** verified program recommendations with execution detail.
- The answer would need a comparison, checklist, or more than ~15 lines of structured program data.
- The user says "show me everything" or "what should I do next."

The tool fills artifact metadata. Do not invent `triggerReason`, `verifiedAt`,
or schema details.

If the user explicitly asked for an artifact/PDF/export/operating plan and you
have at least one verified actionable program, you must call
`publish_funding_brief` before the final chat answer. Do not end with "review
this draft", "I can build it", or "reply when ready" unless there are zero
verified actionable programs.

## When not to create

- Pure intake (jurisdiction, business type, timeline questions only).
- A single quick answer with no program list.
- No verified or newly discovered programs to present.

## Document philosophy

Write like a funding consultant who **just finished a call with this owner**:

- **One document** — situation and recommendation early; programs and execution after.
- **Cover facts on separate lines** — immediately under `# Title`, put each of **Business:**, **Stage:**, **Target:**, and **Strategy:** on its own line (blank line between). Never run all four in one paragraph; they will print as a single blob.
- **Lead with what matters** from the conversation — urgency, blockers, who is executing, programs they asked about.
- **Do not use a fixed template.** Skip sections that do not serve this user, but use fit-band sections whenever naming programs.
- Include **printable checklists** (`- [ ]`) and/or **numbered steps** (`1.`) in `bodyMarkdown`.
- Write program details **directly in markdown** (headings, tables, bullets) — do not use placeholders.
- Verification appendix is added automatically at PDF time — do not paste raw URL walls in markdown.
- **Do not** add `## What This Plan Does Not Include` (or similar scope/disclaimer sections) — the memo is the plan; boundaries belong in chat if the user asks.

## How to call the tool

1. After all `read_official_source` calls for recommended programs, call `publish_funding_brief` with:
   - `title`
   - `bodyMarkdown` — full plan in markdown (GFM: headings, tables, task lists, links)
   - `verifiedUrls[]` — official URLs that returned real content from `read_official_source`
   - optional `notes` — one short verification note when useful
2. The tool binds to the active Penny web chat session automatically and fills `triggerReason`, `verifiedAt`, and artifact metadata.

For speed, do not wait for exhaustive coverage. If the artifact can answer the
business need with a sufficient verified set, publish it. Normal plans have 2-4
actionable fits; publish fewer when the landscape is thin, and include more when
distinct material funding lanes would change the operating plan.

If a tool call fails, correct the document content or verified URL list. Do not search OpenClaw docs, guess hidden schema values, or retry with invented metadata.

The tool binds to the active Penny web chat session automatically — do not pass a session id.

## Evidence programs (internal audit trail)

Evidence metadata is internal. The model-facing artifact tool only needs
`verifiedUrls`. Put user-facing program narrative in `bodyMarkdown`.

If an internal artifact result includes evidence programs, each entry needs:

- `name`
- `officialUrl`
- `confidence` (`verified_live`, `newly_discovered`, `could_not_verify`)
- `verdict` (`pursue_now`, `explore`, `defer`, `skip`)

These support verification and panel metadata. **Put the user-facing program narrative in `bodyMarkdown`.**

Use this mapping:

| Fit band | `verdict` |
|----------|-----------|
| Strong fit | `pursue_now` |
| Conditional fit | `explore` |
| Stretch | `defer` |
| Ruled out | `skip` |

Do not include `could_not_verify` as an actionable program. A `could_not_verify`
program must use `skip`.

Loan-like or repayable products must also use `skip` and appear only under
`## Ruled out` in `bodyMarkdown`. The artifact tool rejects loan-like wording in
actionable program sections.

Before calling `publish_funding_brief`, audit the body:

- Any loan, repayable contribution, loan guarantee, loan insurance, loan-interest
  subsidy, financing-dependent incentive, or unclear repayment product must be
  under `## Ruled out`.
- Do not write "worth a call", "best bet", "strong", "conditional", or "next
  step" for repayable programs.
- If the artifact tool rejects the brief for loan-like wording, revise the memo
  by moving the program to `## Ruled out`; do not retry the same actionable
  recommendation.

## Actionability requirement

`bodyMarkdown` must include at least one of:

- A checklist (`- [ ] item`)
- Numbered steps (`1. item`)

## Chat vs artifact split

After creating the artifact, keep chat short:

> I've updated your funding memo to **v{N}** — use **Funding plan** in the header or **View in panel** under this message (do not paste download links in chat).

Do **not** repeat the full plan in chat when the artifact already contains it. Do **not** link to `/api/artifacts/.../download` in chat — the panel preview is the same PDF as download. Do **not** emit `[embed ref=…]`, `MEDIA:…`, or filesystem paths — the web UI opens the memo in the artifact panel automatically.

## Confidence mapping

Map labels to tool enum values:

- Verified live → `verified_live`
- Newly discovered → `newly_discovered`
- Could not verify → `could_not_verify` (do not include as actionable recommendations)
