# Two Hour Funding Discovery Runbook

Goal: produce the first inspectable Canadian business funding corpus, not the final Penny app.

## Inputs Needed

- `EXA_API_KEY`
- optional `FIRECRAWL_API_KEY` later for hard pages

## Run Order

1. Run Exa JSONL discovery:

```bash
python3 scripts/build_exa_funding_db.py
```

2. Run mechanical triage:

```bash
python3 scripts/sanitize_funding_sources.py
```

3. Use `agent-browser` for official pages that need browser-backed verification:

```bash
agent-browser --engine lightpanda open <official-url>
agent-browser snapshot -i
```

4. Codex curates profiles by jurisdiction into:

```bash
data/funding/curated/program-candidates.jsonl
data/funding/curated/verified-programs.jsonl
data/funding/curated/curation-notes.md
```

## Two Hour Success Bar

- raw Exa source corpus exists
- normalized source list exists
- coverage summary names jurisdictions found and missing
- first federal and Ontario/BC/Alberta/Quebec profiles are curated if source volume permits
- rejected-source notes explain why obvious junk was excluded

## Rule

Scripts do not decide the DB. Codex does the final curation from evidence.
