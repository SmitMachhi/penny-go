#!/usr/bin/env python3
"""Read an official HTTPS URL via Crawl4AI; JSON stdin/stdout."""

from __future__ import annotations

import asyncio
import ipaddress
import json
import re
import socket
import sys
from datetime import UTC, datetime
from typing import Final
from urllib.parse import urlparse

_MAX_SOURCE_CHARS: Final[int] = 50_000
_TRUNCATION_MARKER: Final[str] = "\n\n[PENNY_TRUNCATED_MAX_SOURCE_CHARS]\n"


def main() -> None:
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        _emit(False, {}, f"invalid_json stdin: {exc}")
        sys.exit(1)
    url = payload.get("url")
    if not isinstance(url, str) or not url.strip():
        _emit(False, {}, "missing_url")
        sys.exit(1)
    resolved = urlparse(url)
    hostname_err = resolve_hostname_https_url(resolved.geturl())
    if hostname_err:
        _emit(False, {"url": url}, hostname_err)
        sys.exit(0)
    try:
        out = asyncio.run(fetch_url_markdown(url))
    except KeyboardInterrupt:
        raise
    except Exception as exc:  # noqa: BLE001 — surface to caller JSON
        _emit(False, {"url": url}, f"crawl_failed: {exc}")
        sys.exit(0)
    print(json.dumps(out, ensure_ascii=False))


def resolve_hostname_https_url(original_url: str) -> str | None:
    """Return error string or None if allowed."""
    parsed = urlparse(original_url)
    if parsed.scheme.lower() != "https":
        return "only_https"
    hostname = parsed.hostname
    if not hostname:
        return "missing_hostname"
    lowered_host = hostname.lower()
    blocked_hosts_re = r"^(localhost|127\.0\.0\.1|::1|\[::1\])$"
    if re.match(blocked_hosts_re, lowered_host):
        return "blocked_hostname"
    if lowered_host.endswith(".local") or lowered_host.endswith(".localhost"):
        return "blocked_hostname"
    ip_like = lowered_host.startswith("[") and lowered_host.endswith("]")
    ip_raw = lowered_host[1:-1] if ip_like else lowered_host
    try:
        addr = ipaddress.ip_address(ip_raw)
    except ValueError:
        return _resolve_dns_block(hostname)
    if addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved:
        return "blocked_ip"
    return None


def _resolve_dns_block(hostname: str) -> str | None:
    try:
        infos = socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
    except OSError as exc:
        return f"dns_error: {exc}"
    if not infos:
        return "dns_empty"
    for info in infos:
        sockaddr = info[4]
        if not sockaddr:
            continue
        ip_str = sockaddr[0]
        try:
            addr = ipaddress.ip_address(ip_str)
        except ValueError:
            continue
        if addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved:
            return "blocked_resolved_ip"
    return None


def _emit(success: bool, extra: dict[str, object], error: str) -> None:
    payload: dict[str, object] = {
        **extra,
        "success": success,
        "error": error,
    }
    print(json.dumps(payload, ensure_ascii=False))


def _markdown_as_string(raw: object | None) -> str:
    if raw is None:
        return ""

    if isinstance(raw, str):
        return raw
    raw_markdown = getattr(raw, "raw_markdown", None)
    if isinstance(raw_markdown, str) and raw_markdown:
        return raw_markdown
    fit_md = getattr(raw, "fit_markdown", None)
    if isinstance(fit_md, str) and fit_md:
        return fit_md
    return str(raw)


async def fetch_url_markdown(url: str) -> dict[str, object]:
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig
    from crawl4ai.processors.pdf import PDFContentScrapingStrategy

    fetched_at = datetime.now(UTC).isoformat()
    normalized = urlparse(url)._replace(fragment="").geturl()

    path_only = urlparse(normalized).path.lower()

    stripped_path = path_only.rstrip("/")

    pdf_branch = stripped_path.endswith(".pdf")
    browser_config = BrowserConfig(headless=True, verbose=False)
    if pdf_branch:
        run_cfg = CrawlerRunConfig(
            scraping_strategy=PDFContentScrapingStrategy(),
            cache_mode=CacheMode.BYPASS,
        )
    else:
        run_cfg = CrawlerRunConfig(cache_mode=CacheMode.BYPASS)

    async with AsyncWebCrawler(config=browser_config) as crawler:
        result = await crawler.arun(url=normalized, config=run_cfg)

    if not getattr(result, "success", False):
        return {
            "success": False,
            "url": normalized,
            "error": getattr(result, "error_message", "crawl_unsuccessful"),
            "fetched_at": fetched_at,
        }

    raw_md = getattr(result, "markdown", None)
    markdown_text = _markdown_as_string(raw_md)
    cleaned = getattr(result, "cleaned_html", None)

    truncate_note = ""

    normalized_markdown_str = markdown_text or (
        str(cleaned) if cleaned else ""
    )
    truncated = normalized_markdown_str
    char_count_original = len(truncated)

    if char_count_original > _MAX_SOURCE_CHARS:
        truncated = (
            truncated[:_MAX_SOURCE_CHARS] + _TRUNCATION_MARKER
        )
        truncate_note = "truncated"

    return {
        "success": True,
        "url": normalized,
        "markdown": truncated,
        "fetched_at": fetched_at,
        "content_type": "pdf" if pdf_branch else "html",
        "char_count": len(truncated),
        "char_count_original": char_count_original,
        "truncate_note": truncate_note,
    }



if __name__ == "__main__":
    main()
