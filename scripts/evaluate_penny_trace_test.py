#!/usr/bin/env python3
"""Tests for Penny trace scoring helpers."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from evaluate_penny_trace import parse_tool_sequence


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


if __name__ == "__main__":
    unittest.main()
