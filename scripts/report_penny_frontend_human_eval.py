#!/usr/bin/env python3
"""Write a compact report for a Penny frontend human eval run."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

FAIL_RE = re.compile(r"\[FAIL\] ([^:]+): (.*)")


def read_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"expected JSON object: {path}")
    return payload


def read_case(case_dir: Path) -> dict[str, Any]:
    manifest = read_json(case_dir / "case-manifest.json")
    failures: list[str] = []
    score_path = case_dir / "trace-score.txt"
    if score_path.is_file():
        for line in score_path.read_text(encoding="utf-8").splitlines():
            match = FAIL_RE.search(line)
            if match:
                failures.append(match.group(1))
    return {"manifest": manifest, "failures": failures}


def case_dirs(run_dir: Path) -> list[Path]:
    cases_dir = run_dir / "cases"
    if not cases_dir.is_dir():
        raise ValueError(f"run has no cases directory: {run_dir}")
    return sorted(path for path in cases_dir.iterdir() if path.is_dir())


def format_counter(counter: Counter[str]) -> str:
    if not counter:
        return "{}"
    return ", ".join(f"{key}={counter[key]}" for key in sorted(counter))


def build_report(run_dir: Path) -> str:
    cases = [read_case(path) for path in case_dirs(run_dir)]
    statuses: Counter[str] = Counter()
    failure_names: Counter[str] = Counter()
    by_mode: dict[str, Counter[str]] = defaultdict(Counter)
    by_outcome: dict[str, Counter[str]] = defaultdict(Counter)

    for case in cases:
        manifest = case["manifest"]
        status = str(manifest.get("status", "unknown"))
        statuses[status] += 1
        for name in case["failures"]:
            failure_names[str(name)] += 1
        row = manifest.get("matrix_row", {})
        mode = row.get("mode", "unknown") if isinstance(row, dict) else "unknown"
        outcome = str(manifest.get("outcome_mode", "unknown"))
        by_mode[str(mode)][status] += 1
        by_outcome[outcome][status] += 1

    lines = [
        "# Penny Frontend Human Eval Report",
        "",
        f"Run: `{run_dir.name}`",
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
    if not failure_names:
        lines.append("- none")
    lines.extend(["", "## By Mode", ""])
    lines.extend(f"- `{mode}`: {format_counter(counter)}" for mode, counter in sorted(by_mode.items()))
    lines.extend(["", "## By Outcome", ""])
    lines.extend(
        f"- `{outcome}`: {format_counter(counter)}"
        for outcome, counter in sorted(by_outcome.items())
    )
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("run_dir", type=Path)
    args = parser.parse_args()

    report_path = args.run_dir / "frontend-report.md"
    report_path.write_text(build_report(args.run_dir), encoding="utf-8")
    print(report_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
