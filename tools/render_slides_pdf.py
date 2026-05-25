#!/usr/bin/env python3
"""Render a local HTML slideshow file to PDF using Playwright."""

from __future__ import annotations

import json
import sys
from pathlib import Path

PDF_MARGIN_MM = 12


def emit(payload: dict[str, object]) -> None:
    print(json.dumps(payload))


def main() -> int:
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        emit({"success": False, "error": "invalid_json_input"})
        return 1

    html_path_raw = payload.get("htmlPath")
    pdf_path_raw = payload.get("pdfPath")
    if not isinstance(html_path_raw, str) or not isinstance(pdf_path_raw, str):
        emit({"success": False, "error": "htmlPath_and_pdfPath_required"})
        return 1

    html_path = Path(html_path_raw).resolve()
    pdf_path = Path(pdf_path_raw).resolve()

    if not html_path.is_file():
        emit({"success": False, "error": "html_file_missing"})
        return 1

    pdf_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        emit({"success": False, "error": "playwright_not_installed"})
        return 1

    file_url = html_path.as_uri()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1280, "height": 720})
            page.goto(file_url, wait_until="networkidle")
            page.pdf(
                path=str(pdf_path),
                format="A4",
                print_background=True,
                margin={
                    "top": f"{PDF_MARGIN_MM}mm",
                    "right": f"{PDF_MARGIN_MM}mm",
                    "bottom": f"{PDF_MARGIN_MM}mm",
                    "left": f"{PDF_MARGIN_MM}mm",
                },
            )
            browser.close()
    except Exception as error:  # noqa: BLE001 - surface subprocess failure to caller
        emit({"success": False, "error": f"playwright_pdf_failed: {error}"})
        return 1

    if not pdf_path.is_file() or pdf_path.stat().st_size == 0:
        emit({"success": False, "error": "pdf_empty"})
        return 1

    emit({"success": True, "pdfPath": str(pdf_path)})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
