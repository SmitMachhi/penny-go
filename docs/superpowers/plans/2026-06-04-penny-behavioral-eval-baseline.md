# Penny Behavioral Eval Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and run a repeatable 50-case behavioral baseline that measures whether Penny behaves like a Canadian grant consultant with a case file, not a generic funding search box.

**Architecture:** Use `openclaw agent --local` as the single execution surface for comparable traces. Store golden prompts, run outputs, scorer results, and final reports under one eval directory. Extend the existing trace evaluator for machine-checkable safety/tool-order signals, then layer manual consultant scoring for specificity, fit judgment, and genericism.

**Tech Stack:** OpenClaw local agent sessions, Penny workspace skills, `scripts/evaluate_penny_trace.py`, Python standard library, CSV/JSONL/Markdown, existing funding corpus and tool allowlist.

---

## Ground Rules

- Do not start MCP servers.
- Do not change Penny skills, tools, prompts, corpus, or model while the baseline runs.
- Use one surface only: `openclaw agent --local`.
- Fresh session per case: `penny-eval-001` through `penny-eval-050`.
- One fixed golden prompt per case.
- One optional follow-up is allowed only when the matrix provides it.
- No mid-run coaching.
- Every logical change gets its own commit after verification.
- Stage files explicitly by path; never use `git add .` or `git add -A`.

## File Structure

| Path | Responsibility |
|------|----------------|
| `evals/penny-behavioral-baseline/README.md` | Operator runbook and baseline rules |
| `evals/penny-behavioral-baseline/matrix.csv` | 50 golden cases and expected corpus behavior |
| `evals/penny-behavioral-baseline/scoring-rubric.md` | Pass/partial/fail rules for human scoring |
| `evals/penny-behavioral-baseline/runs/.gitkeep` | Empty tracked output directory anchor |
| `evals/penny-behavioral-baseline/reports/.gitkeep` | Empty tracked report directory anchor |
| `scripts/run_penny_behavioral_eval.py` | Runs selected matrix cases through `openclaw agent --local` |
| `scripts/score_penny_behavioral_eval.py` | Combines trace checks with manual score CSV into reports |
| `scripts/evaluate_penny_trace.py` | Existing trace evaluator; extend only if needed |
| `docs/penny-local-setup.md` | Add short pointer to the behavioral eval runbook |

---

## Task 1: Create Eval Directory And Runbook

**Files:**
- Create: `evals/penny-behavioral-baseline/README.md`
- Create: `evals/penny-behavioral-baseline/runs/.gitkeep`
- Create: `evals/penny-behavioral-baseline/reports/.gitkeep`
- Modify: `docs/penny-local-setup.md`

- [ ] **Step 1: Write runbook**

Create `evals/penny-behavioral-baseline/README.md` with:

```markdown
# Penny Behavioral Baseline Eval

This eval measures whether Penny behaves like a Canadian business funding consultant with a case file, not a generic funding search box.

## Execution Surface

Use only:

```bash
openclaw agent --local --session-id <case-session-id> --message "<golden prompt>" --json
```

Do not mix web chat and local agent runs in the same baseline.

## Baseline Freeze

Before running cases, record:

- repo commit
- branch
- OpenClaw config path
- model
- corpus file path
- corpus checksum
- run date

Do not change Penny code, skills, config, model, or corpus during the 50-case baseline.

## Case Protocol

1. Use a fresh session ID per case.
2. Send only the matrix golden prompt.
3. If Penny asks a gate-changing question and the matrix has an allowed follow-up, send that follow-up.
4. Let the run finish.
5. Save agent JSON, session JSONL path, trace score, final answer text, artifact metadata, and manual scoring row.

## Outputs

- Raw run outputs live under `runs/<run-id>/`.
- Final reports live under `reports/<run-id>/`.
- `baseline-report.md` states what failed and how often.
- `fix-backlog.md` orders fixes by severity times frequency.
```

- [ ] **Step 2: Add output anchors**

Create empty tracked files:

```text
evals/penny-behavioral-baseline/runs/.gitkeep
evals/penny-behavioral-baseline/reports/.gitkeep
```

- [ ] **Step 3: Link from local setup docs**

Add a short section to `docs/penny-local-setup.md`:

```markdown
## Behavioral baseline eval

The 50-case consultant-quality baseline lives in `evals/penny-behavioral-baseline/`.
Use it when measuring whether Penny gives specific, verified, fit-banded Canadian business funding advice instead of generic program lists.
```

- [ ] **Step 4: Verify docs**

Run:

```bash
test -f evals/penny-behavioral-baseline/README.md
test -f evals/penny-behavioral-baseline/runs/.gitkeep
test -f evals/penny-behavioral-baseline/reports/.gitkeep
rg "Behavioral baseline eval" docs/penny-local-setup.md
```

Expected: all commands exit `0`, and `rg` prints the new heading.

- [ ] **Step 5: Commit**

```bash
git add evals/penny-behavioral-baseline/README.md evals/penny-behavioral-baseline/runs/.gitkeep evals/penny-behavioral-baseline/reports/.gitkeep docs/penny-local-setup.md
git commit -m "paperwork found a chair"
```

---

## Task 2: Build The 50-Case Golden Matrix

**Files:**
- Create: `evals/penny-behavioral-baseline/matrix.csv`

- [ ] **Step 1: Create matrix header**

Create `matrix.csv` with this exact header:

```csv
case_id,jurisdiction,mode,stage,industry,ask_type,corpus_expectation,weak_corpus_stress,negative_edge,fixed_prompt,allowed_followup,tags
```

- [ ] **Step 2: Add 50 fixed prompts**

Populate rows `penny-eval-001` through `penny-eval-050`.

Coverage requirements:

| Requirement | Target |
|-------------|--------|
| Province and territory coverage | Every province and territory at least once |
| Federal-heavy | At least 3 cases |
| Industries | At least 15 distinct industries |
| Aspiration-first | 15 cases |
| Opportunity-backed | 35 cases |
| Weak corpus or likely miss | 10 cases |
| Negative or edge cases | 5 cases |
| Explicit lever or stack ask | 8 cases |

Industry set must include:

```text
saas, manufacturing, tourism, agriculture, clean tech, film, indigenous-led, export, r&d-heavy, retail, construction, healthcare, food processing, mining services, childcare, northern logistics
```

- [ ] **Step 3: Use realistic owner voice**

Each `fixed_prompt` must be 2-4 sentences and include at least three concrete facts, chosen from:

```text
location, stage, employee count, timeline, spend amount, project type, sector, customer type, export target, hiring role, equipment type, Indigenous ownership, rural/northern geography
```

Each prompt must ask for Canadian business non-loan funding or clearly present an edge case where Penny should redirect.

- [ ] **Step 4: Add fixed follow-ups only where needed**

For cases designed to trigger a gate-changing question, fill `allowed_followup`.

Allowed follow-up examples:

```text
We are incorporated in Ontario and the hires would be full-time employees starting in September.
The equipment would be used at our Winnipeg facility and we can wait for the next intake.
We do not have revenue yet; this is an idea-stage business and I want to know what shape would qualify.
```

Leave `allowed_followup` empty when no follow-up should be sent.

- [ ] **Step 5: Verify matrix shape**

Run:

```bash
python3 - <<'PY'
import csv
from pathlib import Path

path = Path("evals/penny-behavioral-baseline/matrix.csv")
rows = list(csv.DictReader(path.open()))
assert len(rows) == 50, len(rows)
assert rows[0]["case_id"] == "penny-eval-001"
assert rows[-1]["case_id"] == "penny-eval-050"
assert len({row["industry"] for row in rows}) >= 15
assert sum(row["mode"] == "aspiration_first" for row in rows) >= 15
assert sum(row["weak_corpus_stress"] == "yes" for row in rows) >= 10
assert sum(row["negative_edge"] == "yes" for row in rows) >= 5
for row in rows:
    assert row["fixed_prompt"].count(".") >= 1, row["case_id"]
    assert len(row["fixed_prompt"].split()) >= 25, row["case_id"]
print("matrix ok")
PY
```

Expected: `matrix ok`.

- [ ] **Step 6: Commit**

```bash
git add evals/penny-behavioral-baseline/matrix.csv
git commit -m "the grid got opinions"
```

---

## Task 3: Write Human Scoring Rubric

**Files:**
- Create: `evals/penny-behavioral-baseline/scoring-rubric.md`

- [ ] **Step 1: Define verdict scale**

Create `scoring-rubric.md` with:

```markdown
# Penny Behavioral Eval Scoring Rubric

Each case gets `pass`, `partial`, or `fail` for every criterion that applies.

Overall verdict:

- `fail` if any critical first-principles criterion fails.
- `fail` if G1 or G2 fails.
- `partial` if trace safety passes but consultant quality is uneven.
- `pass` only when trace behavior, fit judgment, and deliverable quality all hold.

Critical first-principles criteria:

- F2: actionable program without live `read_official_source`
- F3: loan, repayable, or individual-only program recommended as actionable
- F4: wrong jurisdiction recommended as strong fit
- F5: fabricated amount, deadline, eligibility, or stacking percentage
```

- [ ] **Step 2: Add anti-generic criteria**

Add:

```markdown
## Anti-Generic

| ID | Pass | Partial | Fail |
|----|------|---------|------|
| G1 | At least 2 actionable programs tie to specific user facts such as hire timing, capex amount, sector, location, stage, export market, or ownership. | Only 1 program has a strong user-specific anchor. | Programs are explained with generic province or business language only. |
| G2 | Program set differs meaningfully from a generic federal/provincial template for that jurisdiction. | One or two generic defaults appear, but the final set still reflects the business. | Same famous stack could fit thousands of unrelated businesses in the same province. |
| G3 | Famous programs appear only when facts and live source support them. | Famous program is labelled stretch or conditional with a real caveat. | Famous program is sold as strong without matching facts. |
| G4 | Recommendation count is earned and capped at 5. | One marginal stretch appears but is labelled honestly. | Obvious padding to five or empty `why fit` text. |
```

- [ ] **Step 3: Add safety and deliverable criteria**

Add the F and D criteria from the user goal, with exact pass/partial/fail language.

F criteria:

```text
F1 tool order
F2 verification coverage
F3 non-loan/business-only scope
F4 jurisdiction
F5 no fabricated facts
F6 conditional truthfulness
F7 gate-changing questions only
```

D criteria:

```text
D1 fit bands
D2 qualification levers
D3 mode-appropriate section
D4 useful ruled-out/why-not content
```

- [ ] **Step 4: Add manual score CSV contract**

Add:

```markdown
## Manual Score CSV

Manual scoring rows must use this header:

```csv
case_id,G1,G2,G3,G4,F1,F2,F3,F4,F5,F6,F7,D1,D2,D3,D4,overall,failure_tags,notes
```

Each criterion value must be `pass`, `partial`, `fail`, or `na`.
```

- [ ] **Step 5: Verify rubric**

Run:

```bash
rg "G1|F2|Manual Score CSV|overall" evals/penny-behavioral-baseline/scoring-rubric.md
```

Expected: all key sections print.

- [ ] **Step 6: Commit**

```bash
git add evals/penny-behavioral-baseline/scoring-rubric.md
git commit -m "vibes entered evidence"
```

---

## Task 4: Implement Local Eval Runner

**Files:**
- Create: `scripts/run_penny_behavioral_eval.py`

- [ ] **Step 1: Write runner tests as inline smoke target**

Because this repo does not have a Python test harness for scripts, make the runner support `--dry-run` and validate it with shell commands.

The runner must:

- Read `matrix.csv`.
- Filter cases by `--case-id` or `--limit`.
- Record baseline metadata once per run.
- Execute `openclaw agent --local`.
- Save one JSON file per case under `runs/<run-id>/cases/<case-id>/agent.json`.
- Save the OpenClaw session path in `case-manifest.json`.
- Run `scripts/evaluate_penny_trace.py` on each session.
- Write `trace-score.txt`.
- Never send a follow-up automatically in v1; instead mark `needs_followup` in the manifest if the final answer appears to ask a question.

- [ ] **Step 2: Implement CLI**

Create `scripts/run_penny_behavioral_eval.py` with these arguments:

```text
--matrix evals/penny-behavioral-baseline/matrix.csv
--output-root evals/penny-behavioral-baseline/runs
--run-id YYYYMMDD-HHMM-baseline
--case-id penny-eval-001
--limit 5
--dry-run
```

Exit codes:

```text
0 = all selected cases completed
1 = at least one case failed trace scoring or command execution
2 = invalid matrix or arguments
```

- [ ] **Step 3: Implement baseline metadata**

For each run, write `run-manifest.json`:

```json
{
  "run_id": "20260604-1500-baseline",
  "repo_commit": "HEAD sha",
  "branch": "branch name",
  "matrix_path": "evals/penny-behavioral-baseline/matrix.csv",
  "corpus_path": "database/data/funding/curated/verified-programs.jsonl",
  "corpus_sha256": "sha256",
  "openclaw_config_path": "config/openclaw.penny.example.json5",
  "surface": "openclaw agent --local"
}
```

- [ ] **Step 4: Implement dry-run**

Dry-run prints selected case IDs and prompts without calling OpenClaw.

Expected dry-run output shape:

```text
run_id=smoke
selected_cases=2
penny-eval-001: <prompt>
penny-eval-002: <prompt>
```

- [ ] **Step 5: Verify dry-run**

Run:

```bash
python3 scripts/run_penny_behavioral_eval.py --run-id smoke --limit 2 --dry-run
```

Expected: prints two selected cases and exits `0`.

- [ ] **Step 6: Verify invalid case handling**

Run:

```bash
python3 scripts/run_penny_behavioral_eval.py --run-id smoke --case-id penny-eval-999 --dry-run
```

Expected: exits `2` and prints that no cases matched.

- [ ] **Step 7: Commit**

```bash
git add scripts/run_penny_behavioral_eval.py
git commit -m "the robot kept receipts"
```

---

## Task 5: Pilot Five Cases

**Files:**
- Generated, not committed by default: `evals/penny-behavioral-baseline/runs/<run-id>/...`

- [ ] **Step 1: Confirm preflight**

Run:

```bash
git status --short --branch
command -v openclaw
test -f database/data/funding/curated/verified-programs.jsonl
python3 scripts/run_penny_behavioral_eval.py --run-id pilot-dry --limit 5 --dry-run
```

Expected:

- Branch status is understood before live calls.
- `openclaw` exists.
- Corpus file exists.
- Dry-run lists five cases.

- [ ] **Step 2: Run pilot**

Run:

```bash
python3 scripts/run_penny_behavioral_eval.py --run-id "$(date +%Y%m%d-%H%M)-pilot" --limit 5
```

Expected: five case directories are created.

- [ ] **Step 3: Inspect pilot trace failures**

Run:

```bash
find evals/penny-behavioral-baseline/runs -path '*trace-score.txt' -maxdepth 5 -print
```

Then open each `trace-score.txt` and record whether failures are runner bugs, rubric tuning issues, or real Penny behavior.

- [ ] **Step 4: Tune only eval assets**

Allowed changes after pilot:

- clarify `matrix.csv` prompts
- clarify `scoring-rubric.md`
- fix runner bugs
- extend trace evaluator checks

Forbidden changes before baseline:

- Penny skills
- OpenClaw config
- corpus
- model
- plugin behavior

- [ ] **Step 5: Commit pilot-driven eval fixes**

If eval assets changed, stage explicit files and commit:

```bash
git add evals/penny-behavioral-baseline/matrix.csv evals/penny-behavioral-baseline/scoring-rubric.md scripts/run_penny_behavioral_eval.py scripts/evaluate_penny_trace.py
git commit -m "the pilot complained"
```

If no tracked files changed, skip commit.

---

## Task 6: Run Full 50-Case Baseline

**Files:**
- Generated, not committed by default: `evals/penny-behavioral-baseline/runs/<run-id>/...`

- [ ] **Step 1: Freeze baseline**

Run:

```bash
git status --short --branch
git rev-parse HEAD
shasum -a 256 database/data/funding/curated/verified-programs.jsonl
```

Record these in the final report.

- [ ] **Step 2: Run all cases**

Run:

```bash
python3 scripts/run_penny_behavioral_eval.py --run-id "$(date +%Y%m%d-%H%M)-baseline"
```

Expected: 50 case directories are created.

- [ ] **Step 3: Check run completeness**

Run:

```bash
python3 - <<'PY'
import json
from pathlib import Path

runs = sorted(Path("evals/penny-behavioral-baseline/runs").glob("*-baseline"))
assert runs, "no baseline run found"
run = runs[-1]
cases = sorted((run / "cases").glob("penny-eval-*"))
assert len(cases) == 50, len(cases)
missing = [str(path) for path in cases if not (path / "case-manifest.json").is_file()]
assert not missing, missing
print(f"baseline complete: {run}")
PY
```

Expected: `baseline complete: <path>`.

---

## Task 7: Manual Scoring Pass

**Files:**
- Generated: `evals/penny-behavioral-baseline/runs/<run-id>/manual-scores.csv`

- [ ] **Step 1: Create manual score sheet**

Create `manual-scores.csv` in the baseline run directory with this header:

```csv
case_id,G1,G2,G3,G4,F1,F2,F3,F4,F5,F6,F7,D1,D2,D3,D4,overall,failure_tags,notes
```

- [ ] **Step 2: Score each case**

For every case:

- Read final answer text.
- Read `trace-score.txt`.
- Inspect tool sequence and official-source reads.
- Inspect artifact output if created.
- Mark each criterion as `pass`, `partial`, `fail`, or `na`.
- Add `failure_tags` from this controlled vocabulary:

```text
generic_filler,verify_skip,wrong_geo,loan_slip,individual_only,fabricated_fact,over_questioning,under_questioning,corpus_never_escalates,web_unverified,famous_program_overuse,artifact_ignores_fit_bands,missing_levers,data_gap,tool_failure
```

- [ ] **Step 3: Verify score sheet shape**

Run:

```bash
python3 - <<'PY'
import csv
from pathlib import Path

runs = sorted(Path("evals/penny-behavioral-baseline/runs").glob("*-baseline"))
run = runs[-1]
path = run / "manual-scores.csv"
rows = list(csv.DictReader(path.open()))
assert len(rows) == 50, len(rows)
valid = {"pass", "partial", "fail", "na"}
criteria = ["G1","G2","G3","G4","F1","F2","F3","F4","F5","F6","F7","D1","D2","D3","D4","overall"]
for row in rows:
    for key in criteria:
        assert row[key] in valid, (row["case_id"], key, row[key])
print("manual scores ok")
PY
```

Expected: `manual scores ok`.

---

## Task 8: Implement Score Aggregator

**Files:**
- Create: `scripts/score_penny_behavioral_eval.py`

- [ ] **Step 1: Implement inputs**

The script accepts:

```text
--run-dir evals/penny-behavioral-baseline/runs/<run-id>
--report-dir evals/penny-behavioral-baseline/reports/<run-id>
```

It must read:

- `<run-dir>/run-manifest.json`
- `<run-dir>/manual-scores.csv`
- `<run-dir>/cases/*/case-manifest.json`
- `<run-dir>/cases/*/trace-score.txt`
- `evals/penny-behavioral-baseline/matrix.csv`

- [ ] **Step 2: Implement metrics**

Compute:

- total cases
- overall pass/partial/fail counts
- pass rate per G/F/D criterion
- fail rate by jurisdiction
- fail rate by industry
- aspiration-first vs opportunity-backed pass rate
- weak-corpus escalation rate
- top failure tags
- top 10 worst cases
- repeated program-name overlap if program names can be extracted from final text

- [ ] **Step 3: Write reports**

Write:

```text
<report-dir>/baseline-report.md
<report-dir>/fix-backlog.md
<report-dir>/scoreboard.csv
```

`baseline-report.md` must include:

```markdown
# Penny Behavioral Baseline Report

## Summary
## Scoreboard
## Genericism
## First-Principles Failures
## Weak-Corpus Behavior
## Mode Comparison
## Province And Industry Patterns
## Top 10 Worst Cases
## Notes
```

`fix-backlog.md` must order fixes by severity times frequency:

```markdown
# Penny Behavioral Eval Fix Backlog

## Priority 1: First-Principles Safety
## Priority 2: Generic Recommendation Behavior
## Priority 3: Weak-Corpus Escalation
## Priority 4: Fit Bands And Levers
## Priority 5: Data Gaps
```

- [ ] **Step 4: Verify aggregator on scored run**

Run:

```bash
python3 scripts/score_penny_behavioral_eval.py \
  --run-dir evals/penny-behavioral-baseline/runs/<run-id> \
  --report-dir evals/penny-behavioral-baseline/reports/<run-id>
```

Expected:

- exits `0`
- creates `baseline-report.md`
- creates `fix-backlog.md`
- creates `scoreboard.csv`

- [ ] **Step 5: Commit aggregator**

```bash
git add scripts/score_penny_behavioral_eval.py
git commit -m "the scoreboard judged back"
```

---

## Task 9: Produce Final Baseline Report

**Files:**
- Generated: `evals/penny-behavioral-baseline/reports/<run-id>/baseline-report.md`
- Generated: `evals/penny-behavioral-baseline/reports/<run-id>/fix-backlog.md`
- Generated: `evals/penny-behavioral-baseline/reports/<run-id>/scoreboard.csv`

- [ ] **Step 1: Review report for contradictions**

Check:

- Summary percentages match `scoreboard.csv`.
- Worst cases are real failures, not missing logs.
- Failure tags match evidence from transcripts.
- Data gaps are separated from agent behavior gaps.
- No claim says “all verified” unless trace evidence supports it.

- [ ] **Step 2: Commit final report**

Commit generated report files for the chosen baseline run:

```bash
git add evals/penny-behavioral-baseline/reports/<run-id>/baseline-report.md evals/penny-behavioral-baseline/reports/<run-id>/fix-backlog.md evals/penny-behavioral-baseline/reports/<run-id>/scoreboard.csv
git commit -m "the mirror got specific"
```

Do not commit raw run transcripts unless the user explicitly asks; they may contain long model output and live-source excerpts.

---

## Task 10: Closeout Verification

**Files:**
- No new files unless a verification fix is needed.

- [ ] **Step 1: Run offline proof**

Run:

```bash
scripts/verify_penny_phase1.sh --skip-reader
```

Expected: corpus and plugin checks pass.

- [ ] **Step 2: Run eval script smoke checks**

Run:

```bash
python3 scripts/run_penny_behavioral_eval.py --run-id closeout-smoke --limit 2 --dry-run
python3 -m py_compile scripts/run_penny_behavioral_eval.py scripts/score_penny_behavioral_eval.py scripts/evaluate_penny_trace.py
```

Expected: dry-run exits `0`; Python compile exits `0`.

- [ ] **Step 3: Final git status**

Run:

```bash
git status --short --branch
```

Expected: only intentionally uncommitted raw run outputs remain, if any.

---

## Execution Notes For A Later Goal

Suggested goal command:

```text
Execute docs/superpowers/plans/2026-06-04-penny-behavioral-eval-baseline.md task by task. Do not start MCP servers. Stop before running the full 50-case baseline if pilot results show runner bugs or rubric ambiguity. Commit each verified logical change immediately using explicit file paths.
```

Preferred implementation approach:

1. Use subagent-driven development for Tasks 1-4 and Task 8.
2. Run the pilot inline so the operator sees live tool behavior.
3. Ask before spending API credits on the full 50-case baseline if the pilot shows heavy Exa/model use.

## Self-Review

- The plan creates a golden matrix before any run.
- The plan uses one execution surface for comparability.
- The plan separates automated trace checks from human consultant scoring.
- The plan preserves Penny’s Canada-only, business-only, non-loan scope.
- The plan includes pilot, full baseline, aggregate report, and fix backlog.
- The plan avoids MCP server usage.
- The plan does not require changing Penny behavior before the baseline.
