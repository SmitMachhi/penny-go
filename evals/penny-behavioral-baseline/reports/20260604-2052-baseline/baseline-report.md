# Penny Behavioral Baseline Report

## Summary

- Run: `20260604-2052-baseline`
- Commit: `e778c9df24f6a990c8f666c47952ecdf728231be`
- Corpus SHA256: `2e40fd49428027c0ed889de320d67a75ea3254be1d2ea8a680ad84a15d603f08`
- Cases scored: 50
- Overall pass: 10 (20.0%)
- Overall partial: 35 (70.0%)
- Overall fail: 5 (10.0%)

## Scoreboard

| Metric | Pass | Partial | Fail | Scored | Pass Rate | Fail Rate |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | 40 | 4 | 2 | 46 | 87.0% | 4.3% |
| G2 | 39 | 5 | 2 | 46 | 84.8% | 4.3% |
| G3 | 44 | 2 | 0 | 46 | 95.7% | 0.0% |
| G4 | 41 | 0 | 5 | 46 | 89.1% | 10.9% |
| F1 | 26 | 0 | 21 | 47 | 55.3% | 44.7% |
| F2 | 46 | 0 | 1 | 47 | 97.9% | 2.1% |
| F3 | 44 | 5 | 1 | 50 | 88.0% | 2.0% |
| F4 | 50 | 0 | 0 | 50 | 100.0% | 0.0% |
| F5 | 47 | 3 | 0 | 50 | 94.0% | 0.0% |
| F6 | 50 | 0 | 0 | 50 | 100.0% | 0.0% |
| F7 | 50 | 0 | 0 | 50 | 100.0% | 0.0% |
| D1 | 16 | 30 | 0 | 46 | 34.8% | 0.0% |
| D2 | 41 | 1 | 0 | 42 | 97.6% | 0.0% |
| D3 | 46 | 0 | 0 | 46 | 100.0% | 0.0% |
| D4 | 33 | 14 | 0 | 47 | 70.2% | 0.0% |
| overall | 10 | 35 | 5 | 50 | 20.0% | 10.0% |

## Genericism

- G1 fail rate: 4.3%
- G2 fail rate: 4.3%
- Top generic tags: 9 generic_filler, 3 famous_program_overuse.

## First-Principles Failures

- Verify skips: 22
- Loan or repayable slips/mentions needing review: 6
- Fabricated fact risk: 3

## Weak-Corpus Behavior

- Weak-corpus cases: 17
- Weak-corpus overall pass: 0 (0.0%)
- Corpus escalation failures tagged: 3

## Mode Comparison

| Mode | Cases | Pass | Partial | Fail | Pass Rate |
| --- | --- | --- | --- | --- | --- |
| aspiration_first | 16 | 0 | 13 | 3 | 0.0% |
| opportunity_backed | 34 | 10 | 22 | 2 | 29.4% |

## Province And Industry Patterns

### By Jurisdiction

| Jurisdiction | Fails | Cases | Fail Rate |
| --- | --- | --- | --- |
| AB | 2 | 5 | 40.0% |
| NL | 1 | 3 | 33.3% |
| PE | 1 | 3 | 33.3% |
| ON | 1 | 5 | 20.0% |
| BC | 0 | 5 | 0.0% |
| MB | 0 | 4 | 0.0% |
| NB | 0 | 3 | 0.0% |
| NS | 0 | 3 | 0.0% |
| NT | 0 | 2 | 0.0% |
| NU | 0 | 2 | 0.0% |
| QC | 0 | 5 | 0.0% |
| SK | 0 | 4 | 0.0% |
| YT | 0 | 2 | 0.0% |
| federal | 0 | 4 | 0.0% |

### By Industry

| Industry | Fails | Cases | Fail Rate |
| --- | --- | --- | --- |
| saas | 1 | 2 | 50.0% |
| film | 1 | 3 | 33.3% |
| mining services | 1 | 3 | 33.3% |
| healthcare | 1 | 4 | 25.0% |
| clean tech | 1 | 6 | 16.7% |
| agriculture | 0 | 4 | 0.0% |
| childcare | 0 | 2 | 0.0% |
| construction | 0 | 3 | 0.0% |
| export | 0 | 4 | 0.0% |
| food processing | 0 | 3 | 0.0% |
| indigenous-led | 0 | 2 | 0.0% |
| individual-only | 0 | 1 | 0.0% |
| manufacturing | 0 | 3 | 0.0% |
| northern logistics | 0 | 1 | 0.0% |
| r&d-heavy | 0 | 2 | 0.0% |
| retail | 0 | 4 | 0.0% |
| tourism | 0 | 3 | 0.0% |

## Top 10 Worst Cases

| Case | Overall | Tags | Notes |
| --- | --- | --- | --- |
| penny-eval-047 | fail | generic_filler;loan_slip;verify_skip | Trace failures: corpus_before_web, max_five_recommendations, no_loan_products. Review tags: generic_filler, loan_slip, verify_skip. |
| penny-eval-037 | fail | corpus_never_escalates;famous_program_overuse;generic_filler | Trace failures: max_five_recommendations, path_b_web_search_used. Review tags: corpus_never_escalates, famous_program_overuse, generic_filler. |
| penny-eval-024 | fail | generic_filler;loan_slip;verify_skip | Trace failures: corpus_before_web, max_five_recommendations, no_loan_products. Review tags: generic_filler, loan_slip, verify_skip. |
| penny-eval-029 | fail | generic_filler;verify_skip | Trace failures: max_five_recommendations, read_covers_recommendations. Review tags: generic_filler, verify_skip. |
| penny-eval-018 | fail | generic_filler | Trace failures: max_five_recommendations. Review tags: generic_filler. |
| penny-eval-033 | partial | generic_filler;loan_slip;verify_skip | Trace failures: corpus_before_web, no_loan_products. Review tags: generic_filler, loan_slip, verify_skip. |
| penny-eval-009 | partial | loan_slip;verify_skip | Trace failures: corpus_before_web, no_loan_products. Review tags: loan_slip, verify_skip. |
| penny-eval-022 | partial | loan_slip;verify_skip | Trace failures: corpus_before_web, no_loan_products. Review tags: loan_slip, verify_skip. |
| penny-eval-035 | partial | corpus_never_escalates;generic_filler;verify_skip | Trace failures: corpus_before_web, path_b_web_search_used. Review tags: corpus_never_escalates, generic_filler, verify_skip. |
| penny-eval-042 | partial | generic_filler;verify_skip | Trace failures: corpus_before_web. Review tags: generic_filler, verify_skip. |

## Repeated Program Names

| Program-ish heading | Cases |
| --- | --- |
| NRC IRAP | 9 |
| CanExport SMEs | 4 |
| Regional Tariff Response Initiative (RTRI) | 4 |
| SR&ED Investment Tax Credit | 3 |
| Agricultural Clean Technology Program | 2 |
| Alberta Innovation Employment Grant | 2 |
| Apprenticeship Job Creation Tax Credit | 2 |
| Atlantic Region Qualified Property Investment Tax Credit | 2 |
| B.C. Employer Training Grant | 2 |
| Clean Technology Investment Tax Credit (CRA) | 2 |
| Federal Apprenticeship Job Creation Tax Credit | 2 |
| Manitoba Manufacturing Investment Tax Credit | 2 |
| Ontario Innovation Tax Credit | 2 |
| Regional Tariff Response Initiative | 2 |
| SR&ED Investment Tax Credit (Federal) | 2 |

## Notes

- Automated trace checks are not the same as consultant-quality scoring.
- `manual-scores.csv` is the scoring authority for this report.
- Raw run transcripts remain in the run directory and are not committed by default.
