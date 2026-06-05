#!/usr/bin/env python3
"""Tests for Penny behavioral eval runner helpers."""

from __future__ import annotations

import importlib.util
import json
import sys
import unittest
from pathlib import Path

SCRIPT_PATH = Path(__file__).with_name("run_penny_behavioral_eval.py")


def load_runner_module():
    spec = importlib.util.spec_from_file_location("run_penny_behavioral_eval", SCRIPT_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("could not load run_penny_behavioral_eval.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class RunnerConfigTest(unittest.TestCase):
    def setUp(self) -> None:
        self.runner = load_runner_module()

    def test_parse_active_skills_config_accepts_string_list(self) -> None:
        raw = json.dumps(["penny-funding", "penny-artifacts"])
        self.assertEqual(
            self.runner.parse_active_skills_config(raw),
            ["penny-funding", "penny-artifacts"],
        )

    def test_validate_required_skills_rejects_missing_penny_skill(self) -> None:
        with self.assertRaisesRegex(ValueError, "penny-artifacts"):
            self.runner.validate_required_skills(["penny-funding"])

    def test_validate_required_skills_accepts_full_penny_stack(self) -> None:
        self.runner.validate_required_skills(
            [
                "penny-consultation-modes",
                "penny-funding",
                "penny-artifacts",
                "stop-slop",
            ]
        )


if __name__ == "__main__":
    unittest.main()
