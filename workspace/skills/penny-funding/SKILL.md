---
name: penny-funding
description: Canadian business funding consultant workflow — corpus first, verify every recommendation, Exa only on miss.
---

# Penny funding workflow

## Path A — corpus has candidates

1. Confirm business context (jurisdiction, sector, project, timeline) with minimal questions.
2. Call `search_corpus` with `jurisdiction`, `keywords`, optional `program_type`. Include `federal` when the province is set and federal programs may apply.
3. For each program you might recommend, call `read_official_source` on the **primary** `source_urls[0]` (and additional URLs only if the primary read is empty or clearly wrong).
4. Recommend only programs where live content supports business eligibility and non-loan benefit. If live content contradicts the corpus, follow the live page and drop or downgrade the program.
5. Never call `web_search` on Path A unless you need a replacement URL for a broken link after a failed `read_official_source`.

## Path B — corpus has no relevant matches

1. State briefly that the verified database had no good fit for this scenario.
2. Call `web_search` with queries constrained to official Canadian government sources (e.g. `site:canada.ca`, `site:gc.ca`, or the relevant province or territory domain).
3. For each promising result URL, call `read_official_source` before mentioning it as a recommendation.
4. Do not treat Exa highlights, summaries, or snippets as evidence. Only `read_official_source` output counts.

## Evidence gate

Align with the curation protocol: business-only, official government source, clear non-loan mechanism. Reject individual-only, municipal-only (unless scope expands), and consultant-only pages.

## Output

Ranked list (max five), each with Verified live or Newly discovered label, official link, and next steps.

When the list is substantial, call `create_funding_brief` per the `penny-artifacts` skill instead of dumping the full table into chat.
