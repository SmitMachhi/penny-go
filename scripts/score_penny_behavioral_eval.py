#!/usr/bin/env python3
"""Aggregate Penny behavioral eval scores into reports."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Iterable

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MATRIX = REPO_ROOT / "evals/penny-behavioral-baseline/matrix.csv"
CRITERIA = [
    "G1",
    "G2",
    "G3",
    "G4",
    "F1",
    "F2",
    "F3",
    "F4",
    "F5",
    "F6",
    "F7",
    "D1",
    "D2",
    "D3",
    "D4",
]
OVERALL = "overall"
VALID_SCORES = {"pass", "partial", "fail", "na"}
PROGRAM_KEYWORDS_RE = re.compile(
    r"\b(program|grant|fund|funding|tax credit|credit|rebate|subsidy|initiative|irap|sr&ed|canexport)\b",
    re.IGNORECASE,
)


def repo_relative(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def read_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def trace_failures(case_dir: Path) -> list[str]:
    path = case_dir / "trace-score.txt"
    failures: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        match = re.match(r"\s+\[FAIL\] ([^:]+):", line)
        if match:
            failures.append(match.group(1))
    return failures


def final_text(case_dir: Path) -> str:
    agent_path = case_dir / "agent.json"
    if not agent_path.is_file():
        return ""
    try:
        payload = read_json(agent_path)
    except json.JSONDecodeError:
        return ""
    payloads = payload.get("payloads")
    if not isinstance(payloads, list) or not payloads:
        return ""
    first = payloads[0]
    if not isinstance(first, dict):
        return ""
    text = first.get("text")
    return text if isinstance(text, str) else ""


def validate_scores(rows: list[dict[str, str]]) -> None:
    for row in rows:
        for key in [*CRITERIA, OVERALL]:
            value = row.get(key, "")
            if value not in VALID_SCORES:
                raise ValueError(f"invalid score {value!r} for {row.get('case_id')} {key}")


def percent(numerator: int, denominator: int) -> str:
    if denominator == 0:
        return "n/a"
    return f"{(numerator / denominator) * 100:.1f}%"


def score_counts(rows: Iterable[dict[str, str]], key: str) -> Counter[str]:
    return Counter(row[key] for row in rows if row[key] != "na")


def criterion_rows(scores: list[dict[str, str]]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for criterion in [*CRITERIA, OVERALL]:
        counts = score_counts(scores, criterion)
        total = sum(counts.values())
        rows.append(
            {
                "metric": criterion,
                "pass": str(counts["pass"]),
                "partial": str(counts["partial"]),
                "fail": str(counts["fail"]),
                "total_scored": str(total),
                "pass_rate": percent(counts["pass"], total),
                "fail_rate": percent(counts["fail"], total),
            }
        )
    return rows


def group_fail_rates(
    scores: list[dict[str, str]], matrix_by_case: dict[str, dict[str, str]], field: str
) -> list[tuple[str, int, int, str]]:
    totals: Counter[str] = Counter()
    fails: Counter[str] = Counter()
    for row in scores:
        group = matrix_by_case[row["case_id"]][field]
        totals[group] += 1
        if row[OVERALL] == "fail":
            fails[group] += 1
    return sorted(
        ((group, fails[group], totals[group], percent(fails[group], totals[group])) for group in totals),
        key=lambda item: (-item[1] / item[2], item[0]),
    )


def tag_counts(scores: list[dict[str, str]]) -> Counter[str]:
    counts: Counter[str] = Counter()
    for row in scores:
        for tag in row.get("failure_tags", "").split(";"):
            if tag:
                counts[tag] += 1
    return counts


def extract_program_names(text: str) -> set[str]:
    names: set[str] = set()
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if not re.match(r"^(#{1,4}\s+|\*\*?#?\d+|#?\d+[.)]\s+)", stripped):
            continue
        candidate = re.sub(r"^#{1,4}\s+", "", stripped)
        candidate = re.sub(r"^\*\*?", "", candidate)
        candidate = re.sub(r"^#?\d+[.)]?\s*", "", candidate)
        candidate = re.sub(r"^[^A-Za-z0-9]+", "", candidate)
        candidate = re.split(r"\s+\|\s+|\s+—\s+|\s+-\s+|\*\*", candidate, maxsplit=1)[0]
        name = " ".join(candidate.split())
        if len(name.split()) < 2:
            continue
        if not PROGRAM_KEYWORDS_RE.search(name):
            continue
        if name.lower().startswith(("here", "verified", "programs", "strong", "conditional")):
            continue
        names.add(name[:100])
    return names


def repeated_programs(run_dir: Path) -> list[tuple[str, int]]:
    counts: Counter[str] = Counter()
    for case_dir in sorted((run_dir / "cases").glob("penny-eval-*")):
        counts.update(extract_program_names(final_text(case_dir)))
    return [(name, count) for name, count in counts.most_common(15) if count > 1]


def write_scoreboard(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["metric", "pass", "partial", "fail", "total_scored", "pass_rate", "fail_rate"],
        )
        writer.writeheader()
        writer.writerows(rows)


def markdown_table(headers: list[str], rows: list[Iterable[object]]) -> str:
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    for row in rows:
        lines.append("| " + " | ".join(str(value) for value in row) + " |")
    return "\n".join(lines)


def top_worst(scores: list[dict[str, str]]) -> list[dict[str, str]]:
    def severity(row: dict[str, str]) -> tuple[int, int, int]:
        fail_count = sum(row[key] == "fail" for key in CRITERIA)
        partial_count = sum(row[key] == "partial" for key in CRITERIA)
        overall_weight = {"fail": 2, "partial": 1, "pass": 0, "na": 0}[row[OVERALL]]
        return (overall_weight, fail_count, partial_count)

    return sorted(scores, key=severity, reverse=True)[:10]


def report_markdown(
    run_dir: Path,
    manifest: dict[str, object],
    scores: list[dict[str, str]],
    matrix_by_case: dict[str, dict[str, str]],
    scoreboard: list[dict[str, str]],
) -> str:
    overall = score_counts(scores, OVERALL)
    total = len(scores)
    tags = tag_counts(scores)
    weak_cases = [row for row in scores if matrix_by_case[row["case_id"]]["weak_corpus_stress"] == "yes"]
    weak_pass = sum(row[OVERALL] == "pass" for row in weak_cases)
    aspiration = [row for row in scores if matrix_by_case[row["case_id"]]["mode"] == "aspiration_first"]
    opportunity = [row for row in scores if matrix_by_case[row["case_id"]]["mode"] == "opportunity_backed"]

    lines = [
        "# Penny Behavioral Baseline Report",
        "",
        "## Summary",
        "",
        f"- Run: `{run_dir.name}`",
        f"- Commit: `{manifest.get('repo_commit')}`",
        f"- Corpus SHA256: `{manifest.get('corpus_sha256')}`",
        f"- Cases scored: {total}",
        f"- Overall pass: {overall['pass']} ({percent(overall['pass'], total)})",
        f"- Overall partial: {overall['partial']} ({percent(overall['partial'], total)})",
        f"- Overall fail: {overall['fail']} ({percent(overall['fail'], total)})",
        "",
        "## Scoreboard",
        "",
        markdown_table(
            ["Metric", "Pass", "Partial", "Fail", "Scored", "Pass Rate", "Fail Rate"],
            [
                [
                    row["metric"],
                    row["pass"],
                    row["partial"],
                    row["fail"],
                    row["total_scored"],
                    row["pass_rate"],
                    row["fail_rate"],
                ]
                for row in scoreboard
            ],
        ),
        "",
        "## Genericism",
        "",
        f"- G1 fail rate: {next(row['fail_rate'] for row in scoreboard if row['metric'] == 'G1')}",
        f"- G2 fail rate: {next(row['fail_rate'] for row in scoreboard if row['metric'] == 'G2')}",
        f"- Top generic tags: {tags.get('generic_filler', 0)} generic_filler, {tags.get('famous_program_overuse', 0)} famous_program_overuse.",
        "",
        "## First-Principles Failures",
        "",
        f"- Verify skips: {tags.get('verify_skip', 0)}",
        f"- Loan or repayable slips/mentions needing review: {tags.get('loan_slip', 0)}",
        f"- Fabricated fact risk: {tags.get('fabricated_fact', 0)}",
        "",
        "## Weak-Corpus Behavior",
        "",
        f"- Weak-corpus cases: {len(weak_cases)}",
        f"- Weak-corpus overall pass: {weak_pass} ({percent(weak_pass, len(weak_cases))})",
        f"- Corpus escalation failures tagged: {tags.get('corpus_never_escalates', 0)}",
        "",
        "## Mode Comparison",
        "",
        markdown_table(
            ["Mode", "Cases", "Pass", "Partial", "Fail", "Pass Rate"],
            [
                [
                    "aspiration_first",
                    len(aspiration),
                    score_counts(aspiration, OVERALL)["pass"],
                    score_counts(aspiration, OVERALL)["partial"],
                    score_counts(aspiration, OVERALL)["fail"],
                    percent(score_counts(aspiration, OVERALL)["pass"], len(aspiration)),
                ],
                [
                    "opportunity_backed",
                    len(opportunity),
                    score_counts(opportunity, OVERALL)["pass"],
                    score_counts(opportunity, OVERALL)["partial"],
                    score_counts(opportunity, OVERALL)["fail"],
                    percent(score_counts(opportunity, OVERALL)["pass"], len(opportunity)),
                ],
            ],
        ),
        "",
        "## Province And Industry Patterns",
        "",
        "### By Jurisdiction",
        "",
        markdown_table(
            ["Jurisdiction", "Fails", "Cases", "Fail Rate"],
            group_fail_rates(scores, matrix_by_case, "jurisdiction"),
        ),
        "",
        "### By Industry",
        "",
        markdown_table(
            ["Industry", "Fails", "Cases", "Fail Rate"],
            group_fail_rates(scores, matrix_by_case, "industry"),
        ),
        "",
        "## Top 10 Worst Cases",
        "",
        markdown_table(
            ["Case", "Overall", "Tags", "Notes"],
            [
                [
                    row["case_id"],
                    row[OVERALL],
                    row["failure_tags"] or "-",
                    row["notes"].replace("|", "/")[:180],
                ]
                for row in top_worst(scores)
            ],
        ),
        "",
        "## Repeated Program Names",
        "",
        markdown_table(["Program-ish heading", "Cases"], repeated_programs(run_dir) or [("No repeated headings extracted", 0)]),
        "",
        "## Notes",
        "",
        "- Automated trace checks are not the same as consultant-quality scoring.",
        "- `manual-scores.csv` is the scoring authority for this report.",
        "- Raw run transcripts remain in the run directory and are not committed by default.",
    ]
    return "\n".join(lines) + "\n"


def backlog_markdown(scores: list[dict[str, str]]) -> str:
    tags = tag_counts(scores)
    priority_rows = [
        ("First-Principles Safety", tags.get("verify_skip", 0) + tags.get("loan_slip", 0) + tags.get("fabricated_fact", 0)),
        ("Generic Recommendation Behavior", tags.get("generic_filler", 0) + tags.get("famous_program_overuse", 0)),
        ("Weak-Corpus Escalation", tags.get("corpus_never_escalates", 0) + tags.get("web_unverified", 0)),
        ("Fit Bands And Levers", tags.get("missing_levers", 0) + tags.get("artifact_ignores_fit_bands", 0)),
        ("Data Gaps", tags.get("data_gap", 0)),
    ]
    lines = [
        "# Penny Behavioral Eval Fix Backlog",
        "",
        "## Priority 1: First-Principles Safety",
        "",
        f"- Frequency signal: {priority_rows[0][1]} tagged issues.",
        "- Fix tool-order discipline first: corpus search must precede official-source reads for named program work.",
        "- Tighten output rules so repayable or loan programs appear only in rejected/ruled-out sections.",
        "- Keep `unknown` when live pages do not state amounts, dates, or stacking rules.",
        "",
        "## Priority 2: Generic Recommendation Behavior",
        "",
        f"- Frequency signal: {priority_rows[1][1]} tagged issues.",
        "- Require at least two user-fact anchors before a program can be labelled strong.",
        "- Treat famous federal programs as conditional unless the prompt facts support the mechanism.",
        "- Stop at earned counts rather than filling five slots.",
        "",
        "## Priority 3: Weak-Corpus Escalation",
        "",
        f"- Frequency signal: {priority_rows[2][1]} tagged issues.",
        "- Escalate when corpus rows are only geographic matches and do not match sector or project mechanics.",
        "- Search official domains with snapshot-shaped terms, then verify every result with `read_official_source`.",
        "",
        "## Priority 4: Fit Bands And Levers",
        "",
        f"- Frequency signal: {priority_rows[3][1]} tagged issues.",
        "- Make strong/conditional/stretch/ruled-out labels mandatory in long answers and artifacts.",
        "- Add a qualification lever whenever a recommendation is conditional.",
        "",
        "## Priority 5: Data Gaps",
        "",
        f"- Frequency signal: {priority_rows[4][1]} tagged issues.",
        "- Separate true corpus gaps from agent-generic behavior before changing the curated data.",
    ]
    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--report-dir", type=Path, required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    run_dir = args.run_dir if args.run_dir.is_absolute() else REPO_ROOT / args.run_dir
    report_dir = args.report_dir if args.report_dir.is_absolute() else REPO_ROOT / args.report_dir
    manifest = read_json(run_dir / "run-manifest.json")
    scores = read_csv(run_dir / "manual-scores.csv")
    matrix = read_csv(DEFAULT_MATRIX)
    validate_scores(scores)
    matrix_by_case = {row["case_id"]: row for row in matrix}
    if len(scores) != len(matrix):
        print(f"score/matrix row mismatch: {len(scores)} vs {len(matrix)}", file=sys.stderr)
        return 2
    for row in scores:
        if row["case_id"] not in matrix_by_case:
            print(f"score case missing from matrix: {row['case_id']}", file=sys.stderr)
            return 2
    scoreboard = criterion_rows(scores)
    report_dir.mkdir(parents=True, exist_ok=True)
    write_scoreboard(report_dir / "scoreboard.csv", scoreboard)
    (report_dir / "baseline-report.md").write_text(
        report_markdown(run_dir, manifest, scores, matrix_by_case, scoreboard),
        encoding="utf-8",
    )
    (report_dir / "fix-backlog.md").write_text(backlog_markdown(scores), encoding="utf-8")
    print(f"reports written: {repo_relative(report_dir)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
