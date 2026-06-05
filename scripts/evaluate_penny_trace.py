#!/usr/bin/env python3
"""Score Penny OpenClaw agent runs against Phase 1 rubric (session trace + JSON output)."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

SHARED_DIR = Path(__file__).resolve().parents[1] / "shared"
sys.path.insert(0, str(SHARED_DIR))

from load_loan_heuristic import loanlike_pattern

Scenario = Literal["path-a", "path-b"]
OutcomeMode = Literal["normal", "gate_question", "scope_refusal"]

LOANLIKE_RE = loanlike_pattern()
RECOMMENDATION_HEADING_RE = re.compile(
    r"^\s*(?:#{1,4}\s*#?\d+[.)]?\s*[—.-]|(?:\*\*)?#\d+\s*[—.-])",
    re.MULTILINE,
)
VERIFIED_LABEL_RE = re.compile(r"\bVerified(?: live)?\b|\bNewly discovered\b", re.IGNORECASE)
NON_LOAN_SCOPE_RE = re.compile(r"\bnon[- ]loan\b", re.IGNORECASE)
NON_REPAYABLE_SCOPE_RE = re.compile(r"\bnon[- ]repayable\b", re.IGNORECASE)
MARKDOWN_HEADING_RE = re.compile(r"^\s*(#{1,6})\s+(.+?)\s*$")
RULED_OUT_HEADING_RE = re.compile(
    r"\b(ruled out|not a fit|outside scope|what to skip|what about loans|"
    r"doesn['\u2019]t fit|does not fit|what doesn['\u2019]t fit|what does not fit)\b",
    re.IGNORECASE,
)
REJECTED_LOAN_CONTEXT_RE = re.compile(
    r"\b(excluded by scope|outside scope|ruled out|skip|you said no loans|not eligible|"
    r"not a fit|doesn['\u2019]t fit|does not fit|what doesn['\u2019]t fit|"
    r"what does not fit)\b",
    re.IGNORECASE,
)
SCOPE_REFUSAL_RE = re.compile(
    r"\b(outside my scope|outside scope|individual benefit seeker|personal training|not starting a business)\b",
    re.IGNORECASE,
)
GATE_QUESTION_RE = re.compile(
    r"\?\s*$|\b(do you have|what province|what territory|registered business|incorporat|timeline)\b",
    re.IGNORECASE | re.MULTILINE,
)
NEGATED_LOAN_RE = re.compile(
    r"\b(?:not|no|without|exclude|excluded|ruled out|skip|not eligible for)\s+"
    r"(?:a\s+)?(?:loan|loans|repayable contribution|repayable contributions)"
    r"(?:\s+or\s+repayable contributions)?\b",
    re.IGNORECASE,
)
MAX_RECOMMENDATIONS = 5
MAX_GATE_QUESTION_CHARS = 900
HTTP_URL_RE = re.compile(r"^https?://", re.IGNORECASE)


@dataclass(frozen=True)
class CheckResult:
    name: str
    passed: bool
    detail: str


def should_count_tool_call(name: str, part: dict[str, object]) -> bool:
    if name != "read_official_source":
        return True
    arguments = part.get("arguments")
    if not isinstance(arguments, dict):
        return False
    url = arguments.get("url")
    return isinstance(url, str) and HTTP_URL_RE.match(url.strip()) is not None


def parse_tool_sequence(session_path: Path) -> list[str]:
    tools: list[str] = []
    with session_path.open(encoding="utf-8") as handle:
        for line in handle:
            event = json.loads(line)
            if event.get("type") != "message":
                continue
            message = event.get("message", {})
            for part in message.get("content", []):
                part_type = part.get("type")
                if part_type in {"toolCall", "tool_use"}:
                    name = part.get("name")
                    if isinstance(name, str) and should_count_tool_call(name, part):
                        tools.append(name)
    return tools


def extract_response_text(agent_json_path: Path | None, session_path: Path) -> str:
    if agent_json_path is not None:
        payload = json.loads(agent_json_path.read_text(encoding="utf-8"))
        payloads = payload.get("payloads") or []
        if payloads and isinstance(payloads[0], dict):
            text = payloads[0].get("text")
            if isinstance(text, str):
                return text

    last_assistant = ""
    with session_path.open(encoding="utf-8") as handle:
        for line in handle:
            event = json.loads(line)
            if event.get("type") != "message":
                continue
            message = event.get("message", {})
            if message.get("role") != "assistant":
                continue
            chunks: list[str] = []
            for part in message.get("content", []):
                if part.get("type") == "text" and isinstance(part.get("text"), str):
                    chunks.append(part["text"])
            if chunks:
                last_assistant = "\n".join(chunks)
    return last_assistant


def extract_tool_summary(agent_json_path: Path | None) -> dict[str, object] | None:
    if agent_json_path is None:
        return None
    payload = json.loads(agent_json_path.read_text(encoding="utf-8"))
    summary = payload.get("meta", {}).get("toolSummary")
    return summary if isinstance(summary, dict) else None


def first_index(tools: list[str], name: str) -> int | None:
    try:
        return tools.index(name)
    except ValueError:
        return None


def loanlike_match(response: str) -> re.Match[str] | None:
    scoped_response = normalize_non_loan_phrasing(strip_ruled_out_sections(response))
    scoped_response = strip_rejected_loan_lines(scoped_response)
    scoped_response = NEGATED_LOAN_RE.sub("", scoped_response)
    return LOANLIKE_RE.search(scoped_response)


def normalize_non_loan_phrasing(response: str) -> str:
    response = NON_LOAN_SCOPE_RE.sub("nonloan", response)
    return NON_REPAYABLE_SCOPE_RE.sub("nonrepayable", response)


def strip_rejected_loan_lines(response: str) -> str:
    kept_lines: list[str] = []
    previous_lines: list[str] = []
    for line in response.splitlines():
        context = "\n".join([*previous_lines[-2:], line])
        is_rejected_loan_line = LOANLIKE_RE.search(line) and REJECTED_LOAN_CONTEXT_RE.search(context)
        if not is_rejected_loan_line:
            kept_lines.append(line)
        previous_lines.append(line)
    return "\n".join(kept_lines)


def strip_ruled_out_sections(response: str) -> str:
    kept_lines: list[str] = []
    ruled_out_level: int | None = None
    for line in response.splitlines():
        heading = MARKDOWN_HEADING_RE.match(line)
        if heading:
            level = len(heading.group(1))
            is_ruled_out = RULED_OUT_HEADING_RE.search(heading.group(2)) is not None
            if ruled_out_level is None and is_ruled_out:
                ruled_out_level = level
            elif ruled_out_level is not None and level <= ruled_out_level:
                ruled_out_level = level if is_ruled_out else None

        if ruled_out_level is None:
            kept_lines.append(line)
    return "\n".join(kept_lines)


def classify_response_outcome(response: str) -> OutcomeMode:
    if SCOPE_REFUSAL_RE.search(response):
        return "scope_refusal"
    is_short_question = len(response) <= MAX_GATE_QUESTION_CHARS and "?" in response
    if is_short_question and GATE_QUESTION_RE.search(response):
        return "gate_question"
    return "normal"


def outcome_checks(
    outcome: OutcomeMode,
    response: str,
    summary: dict[str, object] | None,
) -> list[CheckResult]:
    loan_hit = loanlike_match(response)
    checks = [
        CheckResult(
            outcome,
            True,
            "response refused out-of-scope request"
            if outcome == "scope_refusal"
            else "response asked an eligibility-changing question",
        ),
        CheckResult(
            "no_loan_products",
            loan_hit is None,
            "no actionable loan product"
            if loan_hit is None
            else f"loan-like phrase matched: {loan_hit.group(0)!r}",
        ),
    ]
    if summary is not None:
        failures = summary.get("failures", 0)
        checks.append(
            CheckResult(
                "no_tool_failures",
                failures == 0,
                f"tool failures reported: {failures}",
            )
        )
    return checks


def evaluate(
    scenario: Scenario,
    session_path: Path,
    agent_json_path: Path | None,
    outcome_mode: OutcomeMode | None = None,
) -> list[CheckResult]:
    tools = parse_tool_sequence(session_path)
    response = extract_response_text(agent_json_path, session_path)
    summary = extract_tool_summary(agent_json_path)
    outcome = outcome_mode or classify_response_outcome(response)
    if outcome != "normal":
        return outcome_checks(outcome, response, summary)

    corpus_idx = first_index(tools, "search_corpus")
    web_idx = first_index(tools, "web_search")
    read_count = tools.count("read_official_source")
    web_count = tools.count("web_search")
    rec_count = len(RECOMMENDATION_HEADING_RE.findall(response))
    verified_labels = len(VERIFIED_LABEL_RE.findall(response))

    checks: list[CheckResult] = []

    checks.append(
        CheckResult(
            "corpus_used",
            corpus_idx is not None,
            f"search_corpus calls: {tools.count('search_corpus')}"
            if corpus_idx is not None
            else "search_corpus was never called",
        )
    )

    first_tool = tools[0] if tools else None
    corpus_before_web = web_idx is None or (corpus_idx is not None and corpus_idx < web_idx)
    corpus_first = first_tool == "search_corpus"
    checks.append(
        CheckResult(
            "corpus_before_web",
            corpus_before_web and corpus_first,
            f"tool order: {' -> '.join(tools)}"
            if corpus_before_web and corpus_first
            else f"expected first specific-program tool to be search_corpus; got {first_tool}",
        )
    )

    checks.append(
        CheckResult(
            "read_official_source_used",
            read_count >= 1,
            f"read_official_source calls: {read_count}",
        )
    )

    read_covers = read_count >= max(rec_count, 1)
    checks.append(
        CheckResult(
            "read_covers_recommendations",
            read_covers,
            f"reads={read_count}, numbered_recs={rec_count}, verified_labels={verified_labels}"
            if read_covers
            else f"too few reads ({read_count}) for {max(rec_count, verified_labels)} recommendations",
        )
    )

    loan_hit = loanlike_match(response)
    checks.append(
        CheckResult(
            "no_loan_products",
            loan_hit is None,
            "no loan-like benefit language detected"
            if loan_hit is None
            else f"loan-like phrase matched: {loan_hit.group(0)!r}",
        )
    )

    checks.append(
        CheckResult(
            "max_five_recommendations",
            rec_count <= MAX_RECOMMENDATIONS,
            f"numbered recommendations: {rec_count}",
        )
    )

    if scenario == "path-b":
        checks.append(
            CheckResult(
                "path_b_web_search_used",
                web_count >= 1,
                f"web_search calls: {web_count}"
                if web_count >= 1
                else "Path B expected web_search after weak corpus hits",
            )
        )
        read_after_web = web_idx is None or any(
            tool == "read_official_source" for tool in tools[web_idx + 1 :]
        )
        checks.append(
            CheckResult(
                "path_b_read_after_web",
                read_after_web,
                "read_official_source followed web_search"
                if read_after_web
                else "web_search results were not verified with read_official_source",
            )
        )

    if summary is not None:
        failures = summary.get("failures", 0)
        checks.append(
            CheckResult(
                "no_tool_failures",
                failures == 0,
                f"tool failures reported: {failures}",
            )
        )

    return checks


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scenario", choices=("path-a", "path-b"), required=True)
    parser.add_argument("--session-file", type=Path, required=True)
    parser.add_argument("--agent-json", type=Path, default=None)
    parser.add_argument(
        "--outcome-mode",
        choices=("normal", "gate_question", "scope_refusal"),
        default=None,
    )
    args = parser.parse_args()

    if not args.session_file.is_file():
        print(f"session file not found: {args.session_file}", file=sys.stderr)
        return 2

    checks = evaluate(args.scenario, args.session_file, args.agent_json, args.outcome_mode)
    passed = sum(1 for check in checks if check.passed)
    total = len(checks)

    print(f"Penny rubric — {args.scenario} ({passed}/{total} checks passed)\n")
    for check in checks:
        status = "PASS" if check.passed else "FAIL"
        print(f"  [{status}] {check.name}: {check.detail}")

    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
