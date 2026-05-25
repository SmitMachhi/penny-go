---
name: penny-artifacts
description: When and how Penny creates funding brief artifacts (slideshow + PDF) alongside chat.
---

# Penny funding brief artifacts

## Purpose

Use `create_funding_brief` to put substantial, presentation-ready deliverables in the artifact panel. Chat stays conversational; the artifact holds the full structured brief.

## When to create

Call `create_funding_brief` when **any** of these apply:

- The user asks for a brief, deck, slides, PDF, export, artifact, or summary document.
- You are delivering **two or more** verified program recommendations with full detail.
- The answer would need a large comparison table or more than ~15 lines of structured program data.
- The user says "show me everything" or similar.

Use `triggerReason: "user_requested"` when the user explicitly asked for an export or brief. Otherwise use `triggerReason: "auto"`.

## When not to create

- Pure intake (jurisdiction, business type, timeline questions only).
- A single quick answer with no program list.
- No verified or newly discovered programs to present.

## How to call the tool

1. Parse `sessionUuid` from the current `sessionKey` (`agent:main:penny:<uuid>`).
2. After all `read_official_source` calls for recommended programs, call `create_funding_brief` with:
   - `sessionUuid`, `title`, `triggerReason`
   - `business` snapshot from the engagement
   - `programs[]` (max five) with all required fields and confidence labels
   - `verification.verifiedAt` (ISO timestamp), `verification.urlsChecked[]`
3. To update an existing brief, pass the same `artifactId` from the prior tool result.

## Chat vs artifact split

After creating the artifact, keep chat short:

> I've put the full funding brief in the panel — {N} programs with live verification details. You can flip through the slides or download the PDF.

Do **not** repeat the full program table in chat when the artifact already contains it.

## Confidence mapping

Map labels to tool enum values:

- Verified live → `verified_live`
- Newly discovered → `newly_discovered`
- Could not verify → `could_not_verify` (do not include as actionable recommendations)
