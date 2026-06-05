#!/usr/bin/env python3
"""Run Penny behavioral eval cases through the web UI using agent-browser."""

from __future__ import annotations

import argparse
import csv
import json
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Literal
from urllib.error import URLError
from urllib.request import urlopen

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MATRIX = REPO_ROOT / "evals/penny-frontend-human/matrix.csv"
DEFAULT_OUTPUT_ROOT = REPO_ROOT / "evals/penny-frontend-human/runs"
SESSION_DIR = Path.home() / ".openclaw/agents/main/sessions"
EVALUATOR = REPO_ROOT / "scripts/evaluate_penny_trace.py"
DEFAULT_BASE_URL = "http://localhost:5173"
CASE_DIR_NAME = "cases"
SESSION_POLL_LIMIT = 10
FRONTEND_READY_TIMEOUT_SECONDS = 60
RUN_TIMEOUT_SECONDS = 900
POLL_SECONDS = 2
HTTP_TIMEOUT_SECONDS = 5
EXIT_OK = 0
EXIT_RUN_FAILURE = 1
EXIT_USAGE = 2
REQUIRED_PENNY_SKILLS = frozenset(
    ["penny-consultation-modes", "penny-funding", "penny-artifacts", "stop-slop"]
)

Scenario = Literal["path-a", "path-b"]


@dataclass(frozen=True)
class EvalCase:
    case_id: str
    row: dict[str, str]

    @property
    def prompt(self) -> str:
        return self.row["fixed_prompt"]

    @property
    def expects_weak_pool(self) -> bool:
        return self.row.get("weak_corpus_stress") == "yes" or self.row.get(
            "corpus_expectation"
        ) in {"weak_pool", "likely_miss"}


@dataclass(frozen=True)
class BrowserState:
    url: str
    text: str
    sending: bool
    has_composer: bool
    textarea_disabled: bool


def run_text(command: list[str], *, timeout: int = 60) -> str:
    result = subprocess.run(
        command,
        cwd=REPO_ROOT,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=timeout,
    )
    return result.stdout.strip()


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def load_cases(matrix_path: Path) -> list[EvalCase]:
    with matrix_path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    cases = [EvalCase(row["case_id"], row) for row in rows]
    if not cases:
        raise ValueError(f"matrix has no cases: {matrix_path}")
    return cases


def select_cases(cases: list[EvalCase], case_id: str | None, limit: int | None) -> list[EvalCase]:
    selected = cases
    if case_id is not None:
        selected = [case for case in selected if case.case_id == case_id]
    if limit is not None:
        selected = selected[:limit]
    return selected


def scenario_for(case: EvalCase) -> Scenario:
    return "path-b" if case.expects_weak_pool else "path-a"


def parse_active_skills_config(raw: str) -> list[str]:
    parsed = json.loads(raw)
    if not isinstance(parsed, list):
        raise ValueError("agents.defaults.skills must be a JSON array")
    return [read_skill_name(value, index) for index, value in enumerate(parsed)]


def read_skill_name(value: object, index: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"agents.defaults.skills[{index}] must be a non-empty string")
    return value.strip()


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


def validate_frontend(base_url: str) -> None:
    try:
        with urlopen(base_url, timeout=HTTP_TIMEOUT_SECONDS) as response:
            if response.status >= 400:
                raise ValueError(f"frontend returned HTTP {response.status}")
    except (OSError, URLError) as error:
        raise ValueError(f"frontend is not reachable at {base_url}: {error}") from error


def browser_command(session_name: str, *args: str, timeout: int = 60) -> str:
    return run_text(
        ["agent-browser", "--engine", "chrome", "--session", session_name, *args],
        timeout=timeout,
    )


def browser_eval(session_name: str, expression: str, *, timeout: int = 60) -> Any:
    raw = browser_command(session_name, "eval", expression, timeout=timeout)
    parsed = json.loads(raw)
    return json.loads(parsed) if isinstance(parsed, str) else parsed


def browser_state(session_name: str) -> BrowserState:
    payload = browser_eval(
        session_name,
        """
JSON.stringify({
  url: location.href,
  text: document.body.innerText,
  sending: !!document.querySelector('button[aria-label="Stop response"]'),
  hasComposer: document.querySelector('textarea')?.getAttribute('placeholder') === 'Message Penny',
  textareaDisabled: !!document.querySelector('textarea')?.disabled
})
""".strip(),
    )
    if not isinstance(payload, dict):
        raise ValueError("browser state was not an object")
    return BrowserState(
        url=str(payload.get("url", "")),
        text=str(payload.get("text", "")),
        sending=bool(payload.get("sending")),
        has_composer=bool(payload.get("hasComposer")),
        textarea_disabled=bool(payload.get("textareaDisabled")),
    )


def wait_for_frontend_ready(session_name: str) -> None:
    deadline = time.monotonic() + FRONTEND_READY_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        state = browser_state(session_name)
        if state.has_composer and not state.textarea_disabled:
            return
        time.sleep(POLL_SECONDS)
    raise TimeoutError("frontend composer did not become ready")


def route_id_from_url(url: str) -> str | None:
    marker = "/c/"
    if marker not in url:
        return None
    route = url.rsplit(marker, 1)[1].split("?", 1)[0].split("#", 1)[0]
    return route or None


def session_key_from_route_id(route_id: str) -> str:
    return f"agent:main:penny:{route_id}"


def load_openclaw_sessions() -> list[dict[str, Any]]:
    payload = json.loads(run_text(["openclaw", "sessions", "--json", "--limit", "all"], timeout=120))
    sessions = payload.get("sessions")
    if not isinstance(sessions, list):
        return []
    return [session for session in sessions if isinstance(session, dict)]


def find_session_file(session_key: str) -> Path | None:
    for _ in range(SESSION_POLL_LIMIT):
        session_file = find_session_file_once(session_key)
        if session_file:
            return session_file
        time.sleep(POLL_SECONDS)
    return None


def find_session_file_once(session_key: str) -> Path | None:
    for session in load_openclaw_sessions():
        if session.get("key") != session_key:
            continue
        session_id = session.get("sessionId")
        if isinstance(session_id, str) and session_id:
            session_file = SESSION_DIR / f"{session_id}.jsonl"
            if session_file.is_file():
                return session_file
    return None


def latest_assistant_stop_reason(session_file: Path) -> str | None:
    stop_reason: str | None = None
    with session_file.open(encoding="utf-8") as handle:
        for line in handle:
            event = json.loads(line)
            if event.get("type") != "message":
                continue
            message = event.get("message", {})
            if message.get("role") != "assistant":
                continue
            value = message.get("stopReason")
            stop_reason = value if isinstance(value, str) else None
    return stop_reason


def extract_last_assistant_text(session_file: Path) -> str:
    last_assistant = ""
    with session_file.open(encoding="utf-8") as handle:
        for line in handle:
            event = json.loads(line)
            if event.get("type") != "message":
                continue
            message = event.get("message", {})
            if message.get("role") != "assistant":
                continue
            chunks = [
                part.get("text", "")
                for part in message.get("content", [])
                if isinstance(part, dict) and part.get("type") == "text"
            ]
            text = "\n".join(chunk for chunk in chunks if isinstance(chunk, str))
            if text:
                last_assistant = text
    return last_assistant


def write_agent_json(agent_json: Path, final_text: str) -> None:
    write_json(agent_json, {"payloads": [{"text": final_text}], "meta": {"toolSummary": {"failures": 0}}})


def score_case(case: EvalCase, case_dir: Path, session_file: Path, agent_json: Path) -> int:
    result = subprocess.run(
        [
            sys.executable,
            str(EVALUATOR),
            "--scenario",
            scenario_for(case),
            "--session-file",
            str(session_file),
            "--agent-json",
            str(agent_json),
        ],
        cwd=REPO_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    (case_dir / "trace-score.txt").write_text(result.stdout, encoding="utf-8")
    return result.returncode


def run_case(case: EvalCase, run_dir: Path, browser_session: str, base_url: str) -> bool:
    case_dir = run_dir / CASE_DIR_NAME / case.case_id
    case_dir.mkdir(parents=True, exist_ok=True)

    browser_command(browser_session, "open", base_url, timeout=60)
    wait_for_frontend_ready(browser_session)
    browser_command(
        browser_session,
        "fill",
        'textarea[placeholder="Message Penny"]',
        case.prompt,
        timeout=60,
    )
    browser_command(browser_session, "click", 'button[aria-label="Send message"]', timeout=60)

    route_id: str | None = None
    session_file: Path | None = None
    seen_sending = False
    final_state: BrowserState | None = None
    deadline = time.monotonic() + RUN_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        state = browser_state(browser_session)
        final_state = state
        route_id = route_id or route_id_from_url(state.url)
        if route_id and not session_file:
            session_file = find_session_file_once(session_key_from_route_id(route_id))
        seen_sending = seen_sending or state.sending
        finished = session_file is not None and latest_assistant_stop_reason(session_file) == "stop"
        if route_id and seen_sending and not state.sending and finished:
            break
        time.sleep(POLL_SECONDS)
    else:
        (case_dir / "page-text.md").write_text(
            final_state.text if final_state else "",
            encoding="utf-8",
        )
        return write_case_manifest(case, case_dir, None, None, "timeout")

    if final_state:
        (case_dir / "page-text.md").write_text(final_state.text, encoding="utf-8")
    if not route_id:
        return write_case_manifest(case, case_dir, None, None, "missing_route_id")

    session_key = session_key_from_route_id(route_id)
    session_file = session_file or find_session_file(session_key)
    if not session_file:
        return write_case_manifest(case, case_dir, session_key, None, "missing_session_file")

    copied_session = case_dir / "session.jsonl"
    shutil.copy2(session_file, copied_session)
    final_text = extract_last_assistant_text(copied_session)
    agent_json = case_dir / "agent.json"
    write_agent_json(agent_json, final_text)
    trace_status = score_case(case, case_dir, copied_session, agent_json)
    return write_case_manifest(
        case,
        case_dir,
        session_key,
        trace_status,
        "ok" if trace_status == EXIT_OK else "score_failed",
    )


def write_case_manifest(
    case: EvalCase,
    case_dir: Path,
    session_key: str | None,
    trace_status: int | None,
    status: str,
) -> bool:
    write_json(
        case_dir / "case-manifest.json",
        {
            "case_id": case.case_id,
            "scenario": scenario_for(case),
            "status": status,
            "session_key": session_key,
            "trace_status": trace_status,
            "matrix_row": case.row,
        },
    )
    return status == "ok"


def build_run_manifest(run_id: str, matrix_path: Path, base_url: str) -> dict[str, Any]:
    return {
        "run_id": run_id,
        "created_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "repo_commit": run_text(["git", "rev-parse", "HEAD"]),
        "branch": run_text(["git", "branch", "--show-current"]),
        "matrix_path": str(matrix_path.relative_to(REPO_ROOT)),
        "surface": "web frontend via agent-browser",
        "base_url": base_url,
        "active_skills": load_active_skills(),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--matrix", type=Path, default=DEFAULT_MATRIX)
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--run-id", default=datetime.now().strftime("%Y%m%d-%H%M-frontend"))
    parser.add_argument("--case-id", default=None)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--browser-session", default="penny-frontend-human-eval-chrome")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    matrix_path = args.matrix if args.matrix.is_absolute() else REPO_ROOT / args.matrix
    output_root = args.output_root if args.output_root.is_absolute() else REPO_ROOT / args.output_root
    try:
        cases = load_cases(matrix_path)
        selected = select_cases(cases, args.case_id, args.limit)
        validate_required_skills(load_active_skills())
        validate_frontend(args.base_url)
        run_text(["agent-browser", "--version"])
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        print(f"frontend eval preflight failed: {error}", file=sys.stderr)
        return EXIT_USAGE

    if not selected:
        print("no cases matched selection", file=sys.stderr)
        return EXIT_USAGE

    if args.dry_run:
        print(f"run_id={args.run_id}")
        print(f"selected_cases={len(selected)}")
        for case in selected:
            print(f"{case.case_id}: {case.prompt}")
        return EXIT_OK

    run_dir = output_root / args.run_id
    write_json(run_dir / "run-manifest.json", build_run_manifest(args.run_id, matrix_path, args.base_url))
    failures = 0
    for case in selected:
        print(f"running {case.case_id}", flush=True)
        try:
            ok = run_case(case, run_dir, args.browser_session, args.base_url)
        except (OSError, ValueError, subprocess.CalledProcessError, TimeoutError) as error:
            case_dir = run_dir / CASE_DIR_NAME / case.case_id
            case_dir.mkdir(parents=True, exist_ok=True)
            write_case_manifest(case, case_dir, None, None, f"runner_error: {error}")
            ok = False
        if not ok:
            failures += 1
            print(f"case failed: {case.case_id}", file=sys.stderr, flush=True)
    return EXIT_RUN_FAILURE if failures else EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
