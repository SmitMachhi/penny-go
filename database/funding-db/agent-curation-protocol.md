# Agent Curation Protocol

Codex owns funding catalog judgment. Scripts prepare evidence; they do not decide the final DB.

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

1. Inspect accepted and rejected source pages.
2. Promote real programs into `program-candidates.jsonl`.
3. Merge duplicates into canonical profiles.
4. Verify evidence claims against source text.
5. Write verified profiles to `verified-programs.jsonl`.
6. Record gaps and rejected edge cases in `curation-notes.md`.

The final DB is the curated JSONL, not the raw search result file.

## Exa Plus Browser Harness

Use Exa for breadth and the browser harness for source confidence.

1. Run Exa discovery across federal, provincial, territorial, ITC, tax-credit, and sector queries.
2. Use `agent-browser` on official source indexes, program pages, PDFs, and pages where Exa text is thin, stale, or ambiguous.
3. Prefer official program pages over search snippets or third-party summaries.
4. Capture browser-backed notes for redirect targets, dead pages, dynamic content, PDF links, and application/intake pages.
5. Let Codex curate the evidence into profiles; deterministic scripts only prepare files and obvious duplicate/domain triage.

Browser harness command shape:

```bash
agent-browser --engine lightpanda open <official-url>
agent-browser snapshot -i
```

Fall back to Chrome only when Lightpanda cannot render the page.
