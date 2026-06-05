#!/usr/bin/env python3
"""Tests for Penny trace scoring helpers."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from evaluate_penny_trace import loanlike_match, parse_tool_sequence, strip_ruled_out_sections


def tool_message(*parts: dict[str, object]) -> str:
    return json.dumps({"type": "message", "message": {"role": "assistant", "content": list(parts)}})


def tool_call(name: str, arguments: dict[str, object]) -> dict[str, object]:
    return {"type": "toolCall", "name": name, "arguments": arguments}


class ParseToolSequenceTest(unittest.TestCase):
    def test_ignores_non_http_official_source_reads(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            session_path = Path(temp_dir) / "session.jsonl"
            session_path.write_text(
                "\n".join(
                    [
                        tool_message(
                            tool_call(
                                "read_official_source",
                                {"url": "~/Projects/penny-go/workspace/skills/penny-funding/SKILL.md"},
                            ),
                            tool_call("search_corpus", {"jurisdiction": "british-columbia"}),
                            tool_call(
                                "read_official_source",
                                {"url": "https://www2.gov.bc.ca/example-program"},
                            ),
                        )
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            self.assertEqual(
                parse_tool_sequence(session_path),
                ["search_corpus", "read_official_source"],
            )


class LoanScopeTest(unittest.TestCase):
    def test_loan_language_is_allowed_inside_ruled_out_section(self) -> None:
        response = "\n".join(
            [
                "## What's Ruled Out",
                "",
                "- Futurpreneur is a loan, so skip it.",
                "",
                "## What's Open",
                "",
                "Vancouver Island North Tourism Events & Experiences Fund is conditional.",
            ]
        )

        self.assertIsNone(loanlike_match(response))

    def test_loan_language_still_fails_outside_ruled_out_section(self) -> None:
        response = "\n".join(
            [
                "## What's Open",
                "",
                "Futurpreneur is a useful loan for this startup.",
            ]
        )

        self.assertIsNotNone(loanlike_match(response))

    def test_strip_ruled_out_sections_keeps_later_sections(self) -> None:
        response = "\n".join(
            [
                "## What's Ruled Out",
                "### Futurpreneur",
                "Loan details.",
                "## Next Steps",
                "Register the business.",
            ]
        )

        stripped = strip_ruled_out_sections(response)
        self.assertNotIn("Loan details", stripped)
        self.assertIn("Register the business", stripped)


if __name__ == "__main__":
    unittest.main()
