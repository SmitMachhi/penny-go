#!/usr/bin/env python3
from __future__ import annotations

import argparse
import collections
import json
import re
import sys
from pathlib import Path

SHARED_DIR = Path(__file__).resolve().parents[2] / "shared"
sys.path.insert(0, str(SHARED_DIR))

from load_loan_heuristic import load_loan_heuristic, loanlike_pattern

DEFAULT_JSONL_PATH = Path("data/funding/curated/verified-programs.jsonl")
DEFAULT_JSON_PATH = Path("data/funding/curated/verified-programs.json")
DEFAULT_SUMMARY_PATH = Path("data/funding/curated/coverage-summary.md")
EXIT_SUCCESS = 0
EXIT_FAILURE = 1
EXPECTED_JURISDICTION_COUNT = 14
SUMMARY_COUNT_PATTERN = re.compile(r"^- (?P<label>[^:]+): (?P<count>\d+)$")
_LOAN_HEURISTIC = load_loan_heuristic()
LOANLIKE_PATTERN = loanlike_pattern()
REQUIRED_FIELDS = {
    "program_name",
    "jurisdiction",
    "provider",
    "program_type",
    "business_only",
    "eligible_applicants",
    "eligible_projects",
    "funding_amount",
    "deadline_or_intake",
    "status",
    "source_urls",
    "evidence",
    "confidence",
}
TEXT_FIELDS_FOR_LOAN_AUDIT = tuple(_LOAN_HEURISTIC["auditFields"])

JsonObject = dict[str, object]

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify curated Penny funding database.")
    parser.add_argument("--jsonl", type=Path, default=DEFAULT_JSONL_PATH)
    parser.add_argument("--json", type=Path, default=DEFAULT_JSON_PATH)
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY_PATH)
    return parser.parse_args()

def read_jsonl(path: Path) -> list[JsonObject]:
    rows: list[JsonObject] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if line.strip():
                try:
                    rows.append(json.loads(line))
                except json.JSONDecodeError as exc:
                    raise ValueError(f"{path}:{line_number}: invalid JSONL row") from exc
    return rows

def read_json_array(path: Path) -> list[JsonObject]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError(f"{path} must contain a JSON array")
    return data

def validate_row_shape(rows: list[JsonObject]) -> list[str]:
    problems: list[str] = []
    for index, row in enumerate(rows, start=1):
        missing = REQUIRED_FIELDS - set(row)
        if missing:
            problems.append(f"row {index}: missing fields {sorted(missing)}")
        if row.get("business_only") is not True:
            problems.append(f"row {index}: business_only must be true")
        if not isinstance(row.get("source_urls"), list) or not row.get("source_urls"):
            problems.append(f"row {index}: source_urls must be a non-empty list")
        if not isinstance(row.get("evidence"), list) or not row.get("evidence"):
            problems.append(f"row {index}: evidence must be a non-empty list")
    return problems

def loan_audit_text(row: JsonObject) -> str:
    field_text = [str(row.get(field) or "") for field in TEXT_FIELDS_FOR_LOAN_AUDIT]
    if _LOAN_HEURISTIC.get("includeEvidence"):
        evidence = row.get("evidence")
        if isinstance(evidence, list):
            field_text.extend(str(item) for item in evidence)
    return " ".join(field_text).lower()

def validate_no_loanlike_rows(rows: list[JsonObject]) -> list[str]:
    problems: list[str] = []
    for index, row in enumerate(rows, start=1):
        if LOANLIKE_PATTERN.search(loan_audit_text(row)):
            name = str(row.get("program_name") or "unknown")
            problems.append(f"row {index}: loan/repayable-like text remains in {name}")
    return problems

def validate_duplicate_keys(rows: list[JsonObject]) -> list[str]:
    keys = [(str(row.get("jurisdiction")), str(row.get("program_name"))) for row in rows]
    duplicates = [key for key, count in collections.Counter(keys).items() if count > 1]
    return [f"duplicate jurisdiction/program key: {key}" for key in duplicates]

def validate_json_parity(jsonl_rows: list[JsonObject], json_rows: list[JsonObject]) -> list[str]:
    jsonl_keys = sorted((str(row.get("jurisdiction")), str(row.get("program_name"))) for row in jsonl_rows)
    json_keys = sorted((str(row.get("jurisdiction")), str(row.get("program_name"))) for row in json_rows)
    if jsonl_keys != json_keys:
        return ["JSON export keys do not match JSONL keys"]
    return []

def summary_counts(path: Path) -> dict[str, int]:
    counts: dict[str, int] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        match = SUMMARY_COUNT_PATTERN.match(line)
        if match:
            counts[match.group("label")] = int(match.group("count"))
    return counts

def validate_summary(rows: list[JsonObject], args: argparse.Namespace) -> list[str]:
    counts = summary_counts(args.summary)
    problems: list[str] = []
    profile_count = counts.get("verified non-loan business program profiles")
    jurisdiction_count = counts.get("jurisdictions with verified profiles")
    actual_jurisdictions = {str(row.get("jurisdiction")) for row in rows}
    if profile_count != len(rows):
        problems.append(f"summary profile count {profile_count} != {len(rows)}")
    if jurisdiction_count != len(actual_jurisdictions):
        problems.append(f"summary jurisdiction count {jurisdiction_count} != {len(actual_jurisdictions)}")
    if len(actual_jurisdictions) != EXPECTED_JURISDICTION_COUNT:
        problems.append(f"jurisdiction coverage {len(actual_jurisdictions)} != {EXPECTED_JURISDICTION_COUNT}")
    return problems

def verify(args: argparse.Namespace) -> list[str]:
    jsonl_rows = read_jsonl(args.jsonl)
    json_rows = read_json_array(args.json)
    problems = []
    problems.extend(validate_row_shape(jsonl_rows))
    problems.extend(validate_no_loanlike_rows(jsonl_rows))
    problems.extend(validate_duplicate_keys(jsonl_rows))
    problems.extend(validate_json_parity(jsonl_rows, json_rows))
    problems.extend(validate_summary(jsonl_rows, args))
    return problems

def run() -> int:
    args = parse_args()
    problems = verify(args)
    if problems:
        for problem in problems:
            print(f"error: {problem}", file=sys.stderr)
        return EXIT_FAILURE
    rows = read_jsonl(args.jsonl)
    jurisdiction_count = len({str(row.get("jurisdiction")) for row in rows})
    print(f"verified_profiles {len(rows)}")
    print(f"jurisdictions {jurisdiction_count}")
    print("duplicate_program_keys 0")
    return EXIT_SUCCESS

if __name__ == "__main__":
    try:
        raise SystemExit(run())
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(EXIT_FAILURE)
