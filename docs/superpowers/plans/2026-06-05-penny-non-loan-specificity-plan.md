# Penny Non-Loan Specificity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Penny enforce Canadian business non-loan funding as a hard invariant, improve scorer treatment of ruled-out loans and valid refusals, and verify the fix against the frontend human eval regressions.

**Architecture:** Put loan/repayable classification in shared code so chat artifacts, plugin validation, and eval scoring use the same boundary. Keep model skills responsible for consultant judgment, but make deterministic code reject unsafe actionable outputs and make evals score recommendation context instead of raw word presence.

**Tech Stack:** TypeScript shared package, OpenClaw plugin tool validation, Python trace scorer, workspace skill markdown, existing frontend eval runner.

---

## File Structure

- Create `shared/funding-benefit-scope.ts`
  - Single source of truth for loan-like / repayable / non-loan classification.
  - Exports `classifyFundingBenefitScope`, `stripRuledOutMarkdownSections`, and section helpers usable by validators and tests.
- Create `shared/funding-benefit-scope.test.ts`
  - Unit tests for loans, repayable contributions, non-repayable grants, ruled-out context, and false-positive phrases like "not a loan".
- Modify `shared/package.json`
  - Add the new test file to `npm --prefix shared test`.
- Modify `shared/funding-brief.ts`
  - Reject actionable `programs[]` entries whose name, benefit type, or action fields are loan-like unless `verdict === "skip"`.
  - Reject body markdown that places loan-like language in actionable sections.
- Modify `shared/funding-brief.test.ts`
  - Add tests for actionable loan rejection and ruled-out loan allowance.
- Modify `workspace/skills/penny-funding/SKILL.md`
  - Add the explicit case-file non-loan gate: classify every candidate before fit labels; loans only under ruled out.
- Modify `workspace/skills/penny-artifacts/SKILL.md`
  - Make artifact rules mirror shared validation and prohibit "worth a call" language for repayable programs.
- Modify `scripts/evaluate_penny_trace.py`
  - Replace raw loan regex scoring with recommendation-context scoring.
  - Add response-outcome modes for `normal`, `gate_question`, and `scope_refusal`.
- Modify `scripts/evaluate_penny_trace_test.py`
  - Add scorer tests for ruled-out loans, "not a loan", valid gate questions, and valid individual-scope refusals.
- Modify `scripts/run_penny_frontend_human_eval.py`
  - Pass the correct scoring mode based on the matrix row and final response.
- Create `scripts/report_penny_frontend_human_eval.py`
  - Reusable aggregation script for frontend run reports, replacing one-off shell/Python snippets.

---

## Task 1: Shared Non-Loan Classifier

**Files:**
- Create: `shared/funding-benefit-scope.ts`
- Create: `shared/funding-benefit-scope.test.ts`
- Modify: `shared/package.json`

- [ ] **Step 1: Write failing shared classifier tests**

Add `shared/funding-benefit-scope.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import {
	classifyFundingBenefitScope,
	containsActionableLoanLikeLanguage,
	stripRuledOutMarkdownSections
} from './funding-benefit-scope.ts';

test('classifies explicit grants and rebates as allowed', () => {
	assert.deepEqual(classifyFundingBenefitScope('non-repayable grant'), {
		allowed: true,
		reason: 'non_loan'
	});
	assert.deepEqual(classifyFundingBenefitScope('refundable tax credit and wage subsidy'), {
		allowed: true,
		reason: 'non_loan'
	});
});

test('classifies loan-like benefits as ruled out', () => {
	assert.equal(classifyFundingBenefitScope('interest-free repayable contribution').allowed, false);
	assert.equal(classifyFundingBenefitScope('loan guarantee for working capital').allowed, false);
	assert.equal(classifyFundingBenefitScope('offset loan interest on new equipment').allowed, false);
	assert.equal(classifyFundingBenefitScope('forgivable loan').allowed, false);
});

test('does not treat negative wording as a loan recommendation', () => {
	assert.equal(containsActionableLoanLikeLanguage('This is not a loan.'), false);
	assert.equal(containsActionableLoanLikeLanguage('No loans or repayable contributions in the mix.'), false);
});

test('strips ruled-out markdown before actionable loan scan', () => {
	const markdown = [
		'## Strong fits',
		'Non-repayable equipment grant.',
		'## Ruled out',
		'PictureNL Development Loan is a loan, so skip it.',
		'## Next steps',
		'Call the grant officer.'
	].join('\n');

	const stripped = stripRuledOutMarkdownSections(markdown);
	assert.match(stripped, /Strong fits/);
	assert.doesNotMatch(stripped, /Development Loan/);
	assert.equal(containsActionableLoanLikeLanguage(markdown), false);
});
```

- [ ] **Step 2: Run shared test and verify it fails**

Run:

```bash
npm --prefix shared test
```

Expected: fail because `shared/funding-benefit-scope.ts` does not exist and `shared/package.json` does not include the new test yet.

- [ ] **Step 3: Implement the shared classifier**

Create `shared/funding-benefit-scope.ts`:

```ts
export type FundingBenefitScopeReason = 'non_loan' | 'loan_like' | 'unknown';

export type FundingBenefitScope = {
	allowed: boolean;
	reason: FundingBenefitScopeReason;
	match?: string;
};

const LOAN_LIKE_PATTERN =
	/\b(?:loan|loan[- ]guarantee|loan[- ]insurance|low[- ]cost financing|low interest|repayable contribution|repayable royalty|repayable financing|forgivable loan|loan interest)\b/i;

const NON_LOAN_PATTERN =
	/\b(?:non[- ]repayable|grant|rebate|tax credit|wage subsidy|subsidy|voucher|contribution funding|cost[- ]share)\b/i;

const NEGATED_LOAN_PATTERN =
	/\b(?:not|no|without|exclude|excluded|ruled out|skip|not eligible for)\s+(?:a\s+)?(?:loan|loans|repayable contribution|repayable contributions)\b/i;

const MARKDOWN_HEADING_PATTERN = /^\s*(#{1,6})\s+(.+?)\s*$/;
const RULED_OUT_HEADING_PATTERN = /\b(?:ruled out|not a fit|outside scope|what to skip|closed or out|programs ruled out)\b/i;

export function classifyFundingBenefitScope(text: string): FundingBenefitScope {
	const normalized = text.trim();
	if (!normalized) {
		return { allowed: false, reason: 'unknown' };
	}
	const loanLike = LOAN_LIKE_PATTERN.exec(normalized);
	if (loanLike && !NEGATED_LOAN_PATTERN.test(normalized)) {
		return { allowed: false, reason: 'loan_like', match: loanLike[0] };
	}
	if (NON_LOAN_PATTERN.test(normalized) || NEGATED_LOAN_PATTERN.test(normalized)) {
		return { allowed: true, reason: 'non_loan' };
	}
	return { allowed: false, reason: 'unknown' };
}

export function containsActionableLoanLikeLanguage(markdown: string): boolean {
	const actionableMarkdown = stripRuledOutMarkdownSections(markdown);
	const loanLike = LOAN_LIKE_PATTERN.exec(actionableMarkdown);
	if (!loanLike) {
		return false;
	}
	return !NEGATED_LOAN_PATTERN.test(actionableMarkdown);
}

export function stripRuledOutMarkdownSections(markdown: string): string {
	const keptLines: string[] = [];
	let ruledOutLevel: number | null = null;

	for (const line of markdown.split('\n')) {
		const heading = MARKDOWN_HEADING_PATTERN.exec(line);
		if (heading) {
			const level = heading[1].length;
			const title = heading[2];
			const isRuledOut = RULED_OUT_HEADING_PATTERN.test(title);
			if (ruledOutLevel === null && isRuledOut) {
				ruledOutLevel = level;
			} else if (ruledOutLevel !== null && level <= ruledOutLevel) {
				ruledOutLevel = isRuledOut ? level : null;
			}
		}
		if (ruledOutLevel === null) {
			keptLines.push(line);
		}
	}

	return keptLines.join('\n');
}
```

- [ ] **Step 4: Add test to shared test script**

Modify `shared/package.json` so the `test` script includes `funding-benefit-scope.test.ts`.

- [ ] **Step 5: Run shared tests**

Run:

```bash
npm --prefix shared test
```

Expected: all shared tests pass.

- [ ] **Step 6: Commit**

```bash
git add shared/funding-benefit-scope.ts shared/funding-benefit-scope.test.ts shared/package.json
git commit -m "the loan wore a tag"
```

---

## Task 2: Enforce Non-Loan Safety in Funding Brief Validation

**Files:**
- Modify: `shared/funding-brief.ts`
- Modify: `shared/funding-brief.test.ts`

- [ ] **Step 1: Add failing funding brief validation tests**

Append these tests to `shared/funding-brief.test.ts`:

```ts
test('validateFundingBriefInput rejects actionable loan-like programs', () => {
	const input = buildValidBrief(1);
	input.programs[0] = {
		...input.programs[0],
		name: 'PictureNL Development Loan',
		benefitType: 'loan',
		verdict: 'explore',
		nextStep: 'Apply before the production deadline.'
	};
	const result = validateFundingBriefInput(input);
	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.ok(
			result.errors.some((error) => error.field === 'programs[0].benefitType')
		);
	}
});

test('validateFundingBriefInput allows loan-like programs only when skipped', () => {
	const input = buildValidBrief(1);
	input.bodyMarkdown = [
		'# Ontario SaaS funding brief',
		'',
		'## Ruled out',
		'PictureNL Development Loan is a loan, so skip it.',
		'',
		'## Next steps',
		'1. Keep only non-repayable programs in the plan.'
	].join('\n');
	input.programs[0] = {
		...input.programs[0],
		name: 'PictureNL Development Loan',
		benefitType: 'loan',
		verdict: 'skip',
		nextStep: 'Skip this program because it is a loan.'
	};
	const result = validateFundingBriefInput(input);
	assert.equal(result.ok, true);
});

test('validateFundingBriefInput rejects actionable bodyMarkdown loan language', () => {
	const input = buildValidBrief(1);
	input.bodyMarkdown = [
		'# Ontario SaaS funding brief',
		'',
		'## Strong fits',
		'ACOA BDP is a repayable contribution worth a call.',
		'',
		'## Next steps',
		'1. Call ACOA.'
	].join('\n');
	const result = validateFundingBriefInput(input);
	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.ok(result.errors.some((error) => error.field === 'bodyMarkdown'));
	}
});
```

- [ ] **Step 2: Run funding brief tests and verify they fail**

Run:

```bash
npm --prefix shared test
```

Expected: the new validation tests fail because actionable loan-like content is still accepted.

- [ ] **Step 3: Add validator helpers**

Modify `shared/funding-brief.ts` imports:

```ts
import {
	classifyFundingBenefitScope,
	containsActionableLoanLikeLanguage
} from './funding-benefit-scope.ts';
```

Add this helper near `programHasActionPath`:

```ts
function programScopeText(program: FundingBriefProgram): string {
	return [
		program.name,
		program.benefitType,
		program.plainTerms,
		program.whyFit,
		program.nextStep,
		...(program.steps ?? [])
	]
		.filter((value): value is string => typeof value === 'string')
		.join('\n');
}

function validateProgramBenefitScope(
	program: FundingBriefProgram,
	fieldPrefix: string,
	errors: FundingBriefValidationError[]
): void {
	const scope = classifyFundingBenefitScope(programScopeText(program));
	if (scope.allowed) {
		return;
	}
	if (program.verdict === 'skip') {
		return;
	}
	errors.push({
		field: `${fieldPrefix}.benefitType`,
		message:
			scope.reason === 'loan_like'
				? `loan-like benefits must use verdict skip and appear only under ruled out (${scope.match})`
				: 'benefit type must clearly be non-loan for actionable programs'
	});
}
```

Call `validateProgramBenefitScope(program, fieldPrefix, errors);` before returning `program` in `parseProgram`.

Add this check in `parseFundingBriefContent` after `content` is built:

```ts
if (containsActionableLoanLikeLanguage(content.bodyMarkdown)) {
	errors.push({
		field: 'bodyMarkdown',
		message: 'loan-like benefits must appear only in ruled-out sections'
	});
	return null;
}
```

- [ ] **Step 4: Run shared tests**

Run:

```bash
npm --prefix shared test
```

Expected: all shared tests pass.

- [ ] **Step 5: Run plugin tests**

Run:

```bash
npm --prefix plugin test
```

Expected: plugin build and tests pass.

- [ ] **Step 6: Commit**

```bash
git add shared/funding-brief.ts shared/funding-brief.test.ts
git commit -m "the brief refused debt"
```

---

## Task 3: Tighten Penny Skills Around the Case-File Gate

**Files:**
- Modify: `workspace/skills/penny-funding/SKILL.md`
- Modify: `workspace/skills/penny-artifacts/SKILL.md`

- [ ] **Step 1: Update `penny-funding` with explicit candidate classification**

In `workspace/skills/penny-funding/SKILL.md`, replace the current verification ledger rule block with language that forces this sequence:

```markdown
Before assigning any fit band, classify the candidate:

```text
candidate:
official_url:
benefit_type:
repayment_status: non_repayable | repayable | loan | loan_guarantee | loan_insurance | unknown
scope_verdict: actionable | ruled_out
scope_reason:
```

Hard rule:

- `repayment_status` of `repayable`, `loan`, `loan_guarantee`, or `loan_insurance` means `scope_verdict: ruled_out`.
- `repayment_status: unknown` means `scope_verdict: ruled_out` unless the official page clearly describes a grant, rebate, wage subsidy, voucher, or tax credit elsewhere on the same page.
- Ruled-out candidates cannot use Strong, Conditional, Stretch, Explore, "worth a call", "best bet", or next-step application language.
- If a repayable or loan-like program is strategically nearby, mention it only under `## Ruled out` with the reason: "outside your non-loan scope."
```
```

- [ ] **Step 2: Update `penny-artifacts` with artifact-specific wording**

Add this paragraph under `## Evidence programs`:

```markdown
Before calling `create_funding_brief`, audit the body:

- Any loan, repayable contribution, loan guarantee, loan insurance, loan-interest subsidy, or unclear repayment product must be under `## Ruled out`.
- Do not write "worth a call", "best bet", "strong", "conditional", or "next step" for repayable programs.
- `evidence.programs[]` may include loan-like products only with `verdict: "skip"`.
- If the artifact tool rejects the brief for loan-like wording, revise the memo by moving the program to `## Ruled out`; do not retry the same actionable recommendation.
```

- [ ] **Step 3: Run skill visibility check**

Run:

```bash
openclaw skills check --agent main
```

Expected: `penny-funding`, `penny-artifacts`, `penny-consultation-modes`, and `stop-slop` are visible.

- [ ] **Step 4: Commit**

```bash
git add workspace/skills/penny-funding/SKILL.md workspace/skills/penny-artifacts/SKILL.md
git commit -m "the memo feared debt"
```

---

## Task 4: Make the Scorer Context-Aware

**Files:**
- Modify: `scripts/evaluate_penny_trace.py`
- Modify: `scripts/evaluate_penny_trace_test.py`

- [ ] **Step 1: Add failing scorer tests**

Append these tests to `scripts/evaluate_penny_trace_test.py`:

```py
from evaluate_penny_trace import classify_response_outcome, evaluate


class ResponseOutcomeTest(unittest.TestCase):
    def test_detects_scope_refusal(self) -> None:
        response = "Penny only works with Canadian businesses. This is personal training, so it is outside my scope."
        self.assertEqual(classify_response_outcome(response), "scope_refusal")

    def test_detects_gate_question(self) -> None:
        response = "Do you have a registered business, or is this still a pre-revenue idea without a legal entity?"
        self.assertEqual(classify_response_outcome(response), "gate_question")

    def test_not_a_loan_does_not_fail(self) -> None:
        response = "RTRI is a non-repayable contribution, not a loan."
        self.assertIsNone(loanlike_match(response))

    def test_worth_a_call_repayable_fails(self) -> None:
        response = "ACOA BDP is a repayable contribution worth a call."
        self.assertIsNotNone(loanlike_match(response))
```

- [ ] **Step 2: Run scorer tests and verify they fail**

Run:

```bash
python3 scripts/evaluate_penny_trace_test.py
```

Expected: fail because `classify_response_outcome` does not exist and loan context is too broad.

- [ ] **Step 3: Add scorer outcome and safer loan scanning**

Modify `scripts/evaluate_penny_trace.py`:

```py
OutcomeMode = Literal["normal", "gate_question", "scope_refusal"]

SCOPE_REFUSAL_RE = re.compile(
    r"\b(outside my scope|outside scope|individual benefit seeker|personal training|not starting a business|no business yet)\b",
    re.IGNORECASE,
)
GATE_QUESTION_RE = re.compile(
    r"\?\s*$|\b(do you have|what province|what territory|registered business|incorporat|timeline)\b",
    re.IGNORECASE | re.MULTILINE,
)
NEGATED_LOAN_RE = re.compile(
    r"\b(?:not|no|without|exclude|excluded|ruled out|skip|not eligible for)\s+(?:a\s+)?(?:loan|loans|repayable contribution|repayable contributions)\b",
    re.IGNORECASE,
)

def classify_response_outcome(response: str) -> OutcomeMode:
    if SCOPE_REFUSAL_RE.search(response):
        return "scope_refusal"
    if GATE_QUESTION_RE.search(response) and len(RECOMMENDATION_HEADING_RE.findall(response)) == 0:
        return "gate_question"
    return "normal"
```

Add a CLI argument that lets the runner pass an explicit outcome mode:

```py
parser.add_argument("--outcome-mode", choices=("normal", "gate_question", "scope_refusal"), default=None)
```

Pass that value into `evaluate`; if it is `None`, call `classify_response_outcome(response)` inside `evaluate`.

Change `loanlike_match` so it ignores negated and ruled-out contexts:

```py
def loanlike_match(response: str) -> re.Match[str] | None:
    scoped_response = NON_LOAN_SCOPE_RE.sub("nonloan", strip_ruled_out_sections(response))
    if NEGATED_LOAN_RE.search(scoped_response):
        scoped_response = NEGATED_LOAN_RE.sub("", scoped_response)
    return LOANLIKE_RE.search(scoped_response)
```

Change `evaluate` so `gate_question` and `scope_refusal` do not require corpus/read checks:

```py
outcome = classify_response_outcome(response)
if outcome == "scope_refusal":
    return [
        CheckResult("scope_refusal", True, "response refused out-of-scope request"),
        CheckResult("no_loan_products", loanlike_match(response) is None, "no actionable loan product")
    ]
if outcome == "gate_question":
    return [
        CheckResult("gate_question", True, "response asked an eligibility-changing question"),
        CheckResult("no_loan_products", loanlike_match(response) is None, "no actionable loan product")
    ]
```

- [ ] **Step 4: Run scorer tests**

Run:

```bash
python3 scripts/evaluate_penny_trace_test.py
```

Expected: all scorer tests pass.

- [ ] **Step 5: Run trace test suite**

Run:

```bash
python3 scripts/evaluate_penny_trace_test.py
python3 scripts/run_penny_behavioral_eval_test.py
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/evaluate_penny_trace.py scripts/evaluate_penny_trace_test.py
git commit -m "the rubric got context"
```

---

## Task 5: Pass Scoring Mode from Frontend Eval Runner

**Files:**
- Modify: `scripts/run_penny_frontend_human_eval.py`

- [ ] **Step 1: Add mode mapping in the runner**

Add:

```py
def outcome_mode_for(case: EvalCase) -> str:
    ask_type = case.row.get("ask_type", "")
    mode = case.row.get("mode", "")
    if mode == "negative_edge" and ask_type == "individual_request":
        return "scope_refusal"
    if mode == "negative_edge" and ask_type == "wrong_scope":
        return "scope_refusal"
    return "normal"
```

Pass this value to the scorer in `score_case`:

```py
"--outcome-mode",
outcome_mode_for(case),
```

- [ ] **Step 2: Include scorer mode in case manifest**

Add `score_mode` to `case-manifest.json` so reports can separate normal recommendations from gate/refusal outcomes.

- [ ] **Step 3: Run runner dry-run**

Run:

```bash
python3 scripts/run_penny_frontend_human_eval.py --run-id non-loan-plan-dry --case-id fe-046 --dry-run
```

Expected: selected case prints and exits 0.

- [ ] **Step 4: Commit**

```bash
git add scripts/run_penny_frontend_human_eval.py
git commit -m "the runner read intent"
```

---

## Task 6: Add a Reusable Frontend Eval Report Script

**Files:**
- Create: `scripts/report_penny_frontend_human_eval.py`

- [ ] **Step 1: Create report script**

Create `scripts/report_penny_frontend_human_eval.py` that:

```py
#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

FAIL_RE = re.compile(r"\[FAIL\] ([^:]+): (.*)")

def read_case(case_dir: Path) -> dict[str, object]:
    manifest = json.loads((case_dir / "case-manifest.json").read_text(encoding="utf-8"))
    failures: list[str] = []
    score_path = case_dir / "trace-score.txt"
    if score_path.is_file():
        for line in score_path.read_text(encoding="utf-8").splitlines():
            match = FAIL_RE.search(line)
            if match:
                failures.append(match.group(1))
    return {"manifest": manifest, "failures": failures}

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("run_dir", type=Path)
    args = parser.parse_args()

    cases = [read_case(path) for path in sorted((args.run_dir / "cases").iterdir())]
    statuses = Counter(case["manifest"]["status"] for case in cases)
    failure_names = Counter(name for case in cases for name in case["failures"])
    by_mode: dict[str, Counter[str]] = defaultdict(Counter)
    for case in cases:
        manifest = case["manifest"]
        row = manifest["matrix_row"]
        by_mode[row["mode"]][manifest["status"]] += 1

    lines = [
        "# Penny Frontend Human Eval Report",
        "",
        f"Run: `{args.run_dir.name}`",
        "",
        "## Scoreboard",
        "",
        f"- Cases: {len(cases)}",
        f"- OK: {statuses['ok']}",
        f"- Score failed: {statuses['score_failed']}",
        "",
        "## Failures",
        "",
    ]
    lines.extend(f"- `{name}`: {count}" for name, count in sorted(failure_names.items()))
    lines.append("")
    lines.append("## By Mode")
    lines.append("")
    lines.extend(f"- `{mode}`: {dict(counter)}" for mode, counter in sorted(by_mode.items()))
    lines.append("")

    report_path = args.run_dir / "frontend-report.md"
    report_path.write_text("\n".join(lines), encoding="utf-8")
    print(report_path)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Run script on existing corrected run**

Run:

```bash
python3 scripts/report_penny_frontend_human_eval.py evals/penny-frontend-human/runs/20260605-frontend-human-50-terminal
```

Expected: writes `frontend-report.md` and exits 0.

- [ ] **Step 3: Commit script only**

Do not commit raw run artifacts unless asked.

```bash
git add scripts/report_penny_frontend_human_eval.py
git commit -m "the report stopped improvising"
```

---

## Task 7: Regression Run on Worst Buckets

**Files:**
- No source changes unless a regression exposes a defect.
- Raw output under `evals/penny-frontend-human/runs/<run-id>/`.

- [ ] **Step 1: Verify local services**

Run:

```bash
curl -fsS http://localhost:5173/api/health
openclaw gateway health
openclaw skills check --agent main
```

Expected:

```text
{"ok":true}
Gateway Health
OK (...)
```

and the four Penny skills visible.

- [ ] **Step 2: Run targeted frontend regressions**

Run the loan/refusal subset one case at a time:

```bash
python3 scripts/run_penny_frontend_human_eval.py --run-id 20260605-non-loan-regression --case-id fe-010
python3 scripts/run_penny_frontend_human_eval.py --run-id 20260605-non-loan-regression --case-id fe-012
python3 scripts/run_penny_frontend_human_eval.py --run-id 20260605-non-loan-regression --case-id fe-030
python3 scripts/run_penny_frontend_human_eval.py --run-id 20260605-non-loan-regression --case-id fe-031
python3 scripts/run_penny_frontend_human_eval.py --run-id 20260605-non-loan-regression --case-id fe-035
python3 scripts/run_penny_frontend_human_eval.py --run-id 20260605-non-loan-regression --case-id fe-044
python3 scripts/run_penny_frontend_human_eval.py --run-id 20260605-non-loan-regression --case-id fe-046
python3 scripts/run_penny_frontend_human_eval.py --run-id 20260605-non-loan-regression --case-id fe-050
```

Expected:

- `fe-046` passes as `scope_refusal`.
- `fe-050` either passes as honest ruled-out/no-fit or fails only if it recommends a loan-like program.
- `fe-010`, `fe-012`, `fe-030`, `fe-031`, `fe-035`, and `fe-044` no longer recommend repayable or loan-adjacent programs.

- [ ] **Step 3: Generate regression report**

Run:

```bash
python3 scripts/report_penny_frontend_human_eval.py evals/penny-frontend-human/runs/20260605-non-loan-regression
```

Expected: report shows no actionable loan failures. If failures remain, inspect each `agent.json` and classify as true product failure or scorer issue.

- [ ] **Step 4: Run core verification**

Run:

```bash
npm --prefix shared test
npm --prefix plugin test
npm --prefix web run check
python3 scripts/evaluate_penny_trace_test.py
python3 scripts/run_penny_behavioral_eval_test.py
python3 -m py_compile scripts/run_penny_frontend_human_eval.py scripts/report_penny_frontend_human_eval.py
```

Expected: all commands exit 0.

---

## Success Criteria

- Actionable recommendations never include loans, repayable contributions, loan guarantees, loan insurance, or loan-interest subsidies.
- Loan-like programs can appear only under ruled-out/skip context.
- `create_funding_brief` rejects unsafe actionable loan-like content before artifact creation.
- Scorer fails real loan recommendations but allows "not a loan" and ruled-out loan mentions.
- Valid scope refusals and gate-changing questions do not fail for missing corpus/source reads.
- Targeted regression cases pass or fail only for real product issues.

## Implementation Notes

- Keep deterministic code focused on boundaries and evidence constraints. Do not turn Penny into a rule-based search engine.
- Do not change corpus data in this pass.
- Do not start MCP servers.
- Stage files explicitly by name and commit after each verified logical change.
