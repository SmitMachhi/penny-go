#!/usr/bin/env python3
"""Run Penny behavioral eval cases through OpenClaw local agent."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MATRIX = REPO_ROOT / "evals/penny-behavioral-baseline/matrix.csv"
DEFAULT_OUTPUT_ROOT = REPO_ROOT / "evals/penny-behavioral-baseline/runs"
DEFAULT_CORPUS = REPO_ROOT / "database/data/funding/curated/verified-programs.jsonl"
DEFAULT_OPENCLAW_CONFIG = REPO_ROOT / "config/openclaw.penny.example.json5"
SESSION_DIR = Path.home() / ".openclaw/agents/main/sessions"
EVALUATOR = REPO_ROOT / "scripts/evaluate_penny_trace.py"
CASE_DIR_NAME = "cases"
EXIT_OK = 0
EXIT_RUN_FAILURE = 1
EXIT_USAGE = 2
REQUIRED_PENNY_SKILLS = frozenset(
    ["penny-consultation-modes", "penny-funding", "penny-artifacts", "stop-slop"]
)


@dataclass(frozen=True)
class EvalCase:
    case_id: str
    row: dict[str, str]

    @property
    def prompt(self) -> str:
        return self.row["fixed_prompt"]

    @property
    def expects_weak_pool(self) -> bool:
        return (
            self.row.get("weak_corpus_stress") == "yes"
            or self.row.get("corpus_expectation") == "weak_pool"
        )


def repo_relative(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def run_text(command: list[str]) -> str:
    result = subprocess.run(
        command,
        cwd=REPO_ROOT,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return result.stdout.strip()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_cases(matrix_path: Path) -> list[EvalCase]:
    with matrix_path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    cases = [EvalCase(row["case_id"], row) for row in rows]
    if not cases:
        raise ValueError(f"matrix has no cases: {matrix_path}")
    return cases


def select_cases(
    cases: list[EvalCase], case_id: str | None, limit: int | None
) -> list[EvalCase]:
    selected = cases
    if case_id is not None:
        selected = [case for case in selected if case.case_id == case_id]
    if limit is not None:
        selected = selected[:limit]
    return selected


def scenario_for(case: EvalCase) -> str:
    return "path-b" if case.expects_weak_pool else "path-a"


def build_run_manifest(run_id: str, matrix_path: Path) -> dict[str, Any]:
    return {
        "run_id": run_id,
        "created_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "repo_commit": run_text(["git", "rev-parse", "HEAD"]),
        "branch": run_text(["git", "branch", "--show-current"]),
        "matrix_path": repo_relative(matrix_path),
        "corpus_path": repo_relative(DEFAULT_CORPUS),
        "corpus_sha256": sha256_file(DEFAULT_CORPUS),
        "openclaw_config_path": repo_relative(DEFAULT_OPENCLAW_CONFIG),
        "surface": "openclaw agent --local",
        "active_skills": load_active_skills(),
    }


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def parse_active_skills_config(raw: str) -> list[str]:
    parsed = json.loads(raw)
    if not isinstance(parsed, list):
        raise ValueError("agents.defaults.skills must be a JSON array")
    skills = []
    for index, value in enumerate(parsed):
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"agents.defaults.skills[{index}] must be a non-empty string")
        skills.append(value.strip())
    return skills


def load_active_skills() -> list[str]:
    return parse_active_skills_config(
        run_text(["openclaw", "config", "get", "agents.defaults.skills", "--json"])
    )


def validate_required_skills(active_skills: list[str]) -> None:
    missing = sorted(REQUIRED_PENNY_SKILLS.difference(active_skills))
    if missing:
        raise ValueError(
            "active OpenClaw config is missing required Penny skills: " + ", ".join(missing)
        )


def run_openclaw_case(case: EvalCase, case_dir: Path) -> tuple[int, Path]:
    agent_json = case_dir / "agent.json"
    command = [
        "openclaw",
        "agent",
        "--local",
        "--session-id",
        case.case_id,
        "--message",
        case.prompt,
        "--json",
    ]
    with agent_json.open("w", encoding="utf-8") as output:
        result = subprocess.run(
            command,
            cwd=REPO_ROOT,
            stdout=output,
            stderr=subprocess.PIPE,
            text=True,
        )
    if result.stderr:
        (case_dir / "openclaw-stderr.txt").write_text(result.stderr, encoding="utf-8")
    return result.returncode, agent_json


def reset_session(case: EvalCase, case_dir: Path) -> Path:
    session_file = SESSION_DIR / f"{case.case_id}.jsonl"
    if session_file.is_file():
        case_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(session_file, case_dir / "previous-session.jsonl")
        session_file.unlink()
    return session_file


def score_trace(case: EvalCase, case_dir: Path, session_file: Path, agent_json: Path) -> int:
    trace_score = case_dir / "trace-score.txt"
    command = [
        sys.executable,
        str(EVALUATOR),
        "--scenario",
        scenario_for(case),
        "--session-file",
        str(session_file),
        "--agent-json",
        str(agent_json),
    ]
    result = subprocess.run(
        command,
        cwd=REPO_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    trace_score.write_text(result.stdout, encoding="utf-8")
    return result.returncode


def extract_agent_text(agent_json: Path) -> str:
    if not agent_json.is_file():
        return ""
    try:
        payload = json.loads(agent_json.read_text(encoding="utf-8"))
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


def case_manifest(
    case: EvalCase,
    agent_status: int,
    trace_status: int | None,
    session_file: Path,
    agent_json: Path,
) -> dict[str, Any]:
    final_text = extract_agent_text(agent_json)
    return {
        "case_id": case.case_id,
        "scenario": scenario_for(case),
        "agent_status": agent_status,
        "trace_status": trace_status,
        "session_file": str(session_file),
        "agent_json": repo_relative(agent_json),
        "needs_followup": final_text.rstrip().endswith("?"),
        "allowed_followup": case.row.get("allowed_followup", ""),
        "matrix_row": case.row,
    }


def run_case(case: EvalCase, run_dir: Path) -> bool:
    case_dir = run_dir / CASE_DIR_NAME / case.case_id
    case_dir.mkdir(parents=True, exist_ok=True)
    session_file = reset_session(case, case_dir)
    agent_status, agent_json = run_openclaw_case(case, case_dir)
    trace_status: int | None = None
    if agent_status == EXIT_OK and session_file.is_file():
        trace_status = score_trace(case, case_dir, session_file, agent_json)
    write_json(
        case_dir / "case-manifest.json",
        case_manifest(case, agent_status, trace_status, session_file, agent_json),
    )
    return agent_status == EXIT_OK and trace_status == EXIT_OK


def print_dry_run(run_id: str, selected: list[EvalCase]) -> None:
    print(f"run_id={run_id}")
    print(f"selected_cases={len(selected)}")
    for case in selected:
        print(f"{case.case_id}: {case.prompt}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--matrix", type=Path, default=DEFAULT_MATRIX)
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--run-id", default=datetime.now().strftime("%Y%m%d-%H%M-baseline"))
    parser.add_argument("--case-id", default=None)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    matrix_path = args.matrix if args.matrix.is_absolute() else REPO_ROOT / args.matrix
    output_root = args.output_root if args.output_root.is_absolute() else REPO_ROOT / args.output_root
    try:
        cases = load_cases(matrix_path)
        selected = select_cases(cases, args.case_id, args.limit)
    except (OSError, ValueError, KeyError) as error:
        print(f"invalid matrix: {error}", file=sys.stderr)
        return EXIT_USAGE
    if not selected:
        print("no cases matched selection", file=sys.stderr)
        return EXIT_USAGE
    if args.dry_run:
        print_dry_run(args.run_id, selected)
        return EXIT_OK
    try:
        validate_required_skills(load_active_skills())
    except (subprocess.CalledProcessError, json.JSONDecodeError, ValueError) as error:
        print(f"invalid OpenClaw skills config: {error}", file=sys.stderr)
        return EXIT_USAGE

    run_dir = output_root / args.run_id
    write_json(run_dir / "run-manifest.json", build_run_manifest(args.run_id, matrix_path))
    failures = 0
    for case in selected:
        print(f"running {case.case_id}", flush=True)
        if not run_case(case, run_dir):
            failures += 1
            print(f"case failed: {case.case_id}", file=sys.stderr, flush=True)
    return EXIT_RUN_FAILURE if failures else EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
