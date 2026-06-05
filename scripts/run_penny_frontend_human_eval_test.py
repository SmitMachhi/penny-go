#!/usr/bin/env python3
"""Tests for Penny frontend human eval runner helpers."""

from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

SCRIPT_PATH = Path(__file__).with_name("run_penny_frontend_human_eval.py")


def load_runner_module():
    spec = importlib.util.spec_from_file_location("run_penny_frontend_human_eval", SCRIPT_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("could not load run_penny_frontend_human_eval.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class FrontendRunnerTextTest(unittest.TestCase):
    def setUp(self) -> None:
        self.runner = load_runner_module()

    def test_choose_agent_response_prefers_visible_text(self) -> None:
        self.assertEqual(
            self.runner.choose_agent_response_text(" visible answer ", "raw session answer"),
            "visible answer",
        )

    def test_choose_agent_response_falls_back_to_session_text(self) -> None:
        self.assertEqual(
            self.runner.choose_agent_response_text("  ", "raw session answer"),
            "raw session answer",
        )


if __name__ == "__main__":
    unittest.main()
