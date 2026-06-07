# Agent Curation Protocol

Penny's funding database needs human-level judgment. Scripts can prepare evidence; they do not decide the final DB.

## Output Contract

Each verified program profile must include:

- `program_name`
- `jurisdiction`
- `provider`
- `program_type`
- `business_only`
- `eligible_applicants`
- `eligible_projects`
- `funding_amount`
- `deadline_or_intake`
- `status`
- `source_urls`
- `evidence`
- `confidence`

Use `unknown` for fields the source does not support.

## Acceptance Rules

Accept a profile only when official-source evidence supports that it is for Canadian businesses or business projects.

Reject:

- individual-only benefits
- non-Canadian programs
- private-only or municipal-only programs unless explicitly added to scope
- consultant summaries without official source support
- dead pages, stale pages, and duplicate program pages
- pages where the funding mechanism is unclear

## Human-Level Review Loop

For each jurisdiction:

1. Inspect official source pages.
2. Decide whether each page describes a real business funding opportunity.
3. Merge duplicate pages into one canonical profile.
4. Verify every evidence claim against source text.
5. Write verified profiles to `verified-programs.jsonl`.
6. Record gaps and rejected edge cases in `curation-notes.md`.

The final DB is the curated JSONL, not the raw search result file.

## Discovery Tools

Use search tools for breadth and browser-backed checks for source confidence.

1. Search across federal, provincial, territorial, ITC, tax-credit, and sector queries.
2. Open official source indexes, program pages, PDFs, and pages where snippets are thin, stale, or ambiguous.
3. Prefer official program pages over search snippets or third-party summaries.
4. Capture notes for redirect targets, dead pages, dynamic content, PDF links, and application/intake pages.
5. Let an agent curate evidence into profiles; deterministic scripts only check the finished database.
