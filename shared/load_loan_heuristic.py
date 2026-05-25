from __future__ import annotations

import json
import re
from pathlib import Path
from typing import TypedDict


class LoanHeuristic(TypedDict):
    regex: str
    auditFields: list[str]
    includeEvidence: bool


def load_loan_heuristic() -> LoanHeuristic:
    path = Path(__file__).resolve().parent / "loan-heuristic.json"
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def loanlike_pattern() -> re.Pattern[str]:
    spec = load_loan_heuristic()
    return re.compile(spec["regex"], re.IGNORECASE)
