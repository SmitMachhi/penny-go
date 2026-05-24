# Exa Funding DB Builder

This builder is for the funding catalog only. Penny app/runtime work stays aside.

The first pass uses Exa to discover official Canadian business funding and ITC source pages, then stores source text and provenance as JSONL. It does not treat Exa results as verified recommendations. Official source pages remain the authority.

Codex is the curation agent. Deterministic scripts only handle cheap mechanics: source provenance, duplicate URLs, official-domain triage, and report files. They are not the intelligence layer and must not make final program decisions alone.

The intelligent pass is:

1. Read sanitized source pages by jurisdiction.
2. Use the browser harness on source pages that need verification beyond Exa text.
3. Decide whether each page describes a business-only grant, ITC, tax incentive, rebate, subsidy, or non-repayable contribution.
4. Reject loans, loan guarantees, low-cost financing, and repayable contributions.
5. Extract a program profile only when the source text supports the claim.
6. Mark uncertain fields as `unknown`; never guess.
7. Reject individual-only, municipal/private, stale, unclear, duplicate, or non-authoritative pages unless the scope changes.
8. Write verified profiles to JSONL with evidence snippets and source URLs.

Run:

```bash
EXA_API_KEY=... python3 scripts/build_exa_funding_db.py
```

Default output:

```bash
data/funding/raw/exa-results/source-pages.jsonl
```

Sanitize raw Exa output:

```bash
python3 scripts/sanitize_funding_sources.py
```

Sanitized outputs:

```bash
data/funding/normalized/source-pages.jsonl
data/funding/normalized/rejected-sources.jsonl
data/funding/normalized/coverage-summary.md
```

Agent-curated outputs:

```bash
data/funding/curated/program-candidates.jsonl
data/funding/curated/verified-programs.jsonl
data/funding/curated/curation-notes.md
```

The npm package `@composio/core`, OpenClaw, and QMD are source references only. They are not required to run this builder.
