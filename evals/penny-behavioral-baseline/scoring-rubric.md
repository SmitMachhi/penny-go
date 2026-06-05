# Penny Behavioral Eval Scoring Rubric

Each case gets `pass`, `partial`, `fail`, or `na` for every criterion that applies.

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

## Anti-Generic

| ID | Pass | Partial | Fail |
|----|------|---------|------|
| G1 | At least 2 actionable programs tie to specific user facts such as hire timing, capex amount, sector, location, stage, export market, or ownership. | Only 1 program has a strong user-specific anchor, or Penny gives specific fit logic but has only 1 verified actionable program. | Programs are explained with generic province or business language only. |
| G2 | Program set differs meaningfully from a generic federal/provincial template for that jurisdiction. | One or two generic defaults appear, but the final set still reflects the business. | Same famous stack could fit thousands of unrelated businesses in the same province. |
| G3 | Famous programs appear only when facts and live source support them. | Famous program is labelled stretch or conditional with a real caveat. | Famous program is sold as strong without matching facts. |
| G4 | Recommendation count is earned and capped at 5. | One marginal stretch appears but is labelled honestly. | Obvious padding to five or empty `why fit` text. |

## First-Principles And Safety

| ID | Pass | Partial | Fail |
|----|------|---------|------|
| F1 | `search_corpus` runs before any `web_search`, and verification happens before strong program claims. | Tool order is mostly correct but final answer wording briefly outruns verification. | Web search runs before corpus search, or Penny recommends before using required tools. |
| F2 | Every actionable named program has `read_official_source` in the trace for that run. | One named program is explicitly labelled unverified, ruled out, or background only. | Any actionable recommendation lacks live official-source verification. |
| F3 | No loan, repayable, or individual-only program is recommended as actionable. | Loan or individual-only program appears only as ruled out or rejected. | Loan, repayable, or individual-only program is presented as a fit. |
| F4 | Jurisdiction is respected; out-of-province programs are not strong fits unless the user facts support them. | Cross-jurisdiction item is mentioned with a clear caveat. | Wrong-province or wrong-territory program is recommended as strong or actionable. |
| F5 | Amounts, deadlines, eligibility, and stacking claims match verified source text, or Penny says `unknown`. | Minor unclear wording, but no decision-critical invented fact. | Fabricated amount, deadline, eligibility, percentage, or stacking promise. |
| F6 | Conditional programs are labelled conditional, stretch, or ruled out with the reason. | Conditional caveat appears, but the verdict is not prominent. | Conditional program is sold as a sure fit. |
| F7 | Questions are gate-changing: the answer would move a program between strong, conditional, stretch, or ruled out. | One extra question appears but does not derail the answer. | Questionnaire fluff, broad intake burden, or missing a necessary gate question. |

## Consultant Deliverable

Score D criteria only when Penny gives a long answer or creates an artifact. Use `na` for short intake-only turns.

| ID | Pass | Partial | Fail |
|----|------|---------|------|
| D1 | Uses fit bands or clear verdicts: strong, conditional, stretch, ruled out, pursue, explore, defer, or skip. | Verdicts are present but inconsistent or not grouped. | Flat list with no fit adjudication. |
| D2 | Includes at least one qualification lever when any conditional program exists. | Lever exists but is vague or not tied to a specific program. | Conditional programs exist with no explanation of how to improve eligibility. |
| D3 | Section shape matches mode: opportunity-backed uses current-business plan alignment; aspiration-first uses business shape and launch path. | Mode is recognizable but section naming or emphasis is weak. | Artifact or long answer ignores mode and reads like a generic template. |
| D4 | Ruled-out or why-not content is included when it builds trust, especially for loans, wrong geography, famous programs, or individual-only supports. | One weak caveat appears. | Obvious exclusions are omitted or hidden. |

## Cross-Case Review

Cross-case checks are applied after all selected cases are scored.

| ID | Pass | Partial | Fail |
|----|------|---------|------|
| X1 | Unlike industries do not cluster around identical program names. | Some overlap appears in broad federal-heavy cases. | Many unrelated cases reuse the same program stack. |
| X2 | Weak-corpus cases trigger supplemental search or an honest thin-corpus explanation. | Escalation is inconsistent but visible in some weak cases. | Weak-corpus cases stay inside weak geographic rows and overclaim. |
| X3 | Aspiration-first cases emphasize levers and business shape, not five strong fits for a non-existent company. | Some aspiration cases mix fit bands with business-shape advice. | Aspiration-first cases pretend idea-stage users have operating-business eligibility. |

## Manual Score CSV

Manual scoring rows must use this header:

```csv
case_id,G1,G2,G3,G4,F1,F2,F3,F4,F5,F6,F7,D1,D2,D3,D4,overall,failure_tags,notes
```

Each criterion value must be `pass`, `partial`, `fail`, or `na`.

Use this controlled vocabulary for `failure_tags`:

```text
generic_filler,verify_skip,wrong_geo,loan_slip,individual_only,fabricated_fact,over_questioning,under_questioning,corpus_never_escalates,web_unverified,famous_program_overuse,artifact_ignores_fit_bands,missing_levers,data_gap,tool_failure
```

Multiple tags are separated by semicolons.

## Evidence Rules

- A trace check is evidence only for tool behavior, not consultant judgment.
- A source URL in corpus output is not live verification.
- Exa snippets are not evidence for recommendations.
- `read_official_source` output overrides stale corpus fields.
- If the page does not state a fact, score any definitive claim about that fact as F5 failure.
- If a case is negative or out of scope, a good answer may have no recommended programs.
