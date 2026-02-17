from __future__ import annotations

import json
import sys
from typing import Dict, List


def _clean_text(text: str) -> str:
    return " ".join(text.split()) if text else ""


def duckduckgo_search(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    try:
        try:
            from ddgs import DDGS
        except Exception:
            from duckduckgo_search import DDGS
    except Exception:
        return []

    results: List[Dict[str, str]] = []
    try:
        with DDGS() as ddgs:
            for item in ddgs.text(query, max_results=max_results):
                title = _clean_text(item.get("title", ""))
                snippet = _clean_text(item.get("body", ""))
                url = item.get("href") or item.get("url") or ""
                if title or snippet or url:
                    results.append({"title": title, "snippet": snippet, "url": url})
    except Exception:
        return []
    return results


def build_retrieved_context(
    query: str,
    max_results: int = 3,
    max_snippet_chars: int = 280,
) -> tuple[str, int]:
    results = duckduckgo_search(query, max_results=max_results)
    if not results:
        return "", 0

    lines = ["Retrieved Context:"]
    for idx, item in enumerate(results, start=1):
        title = item.get("title") or f"Result {idx}"
        snippet = item.get("snippet", "")
        url = item.get("url", "")
        if snippet and len(snippet) > max_snippet_chars:
            snippet = snippet[: max_snippet_chars - 3] + "..."
        lines.append(f"[{idx}] {title}")
        if snippet:
            lines.append(snippet)
        if url:
            lines.append(f"Source: {url}")
    return "\n".join(lines), len(results)

if __name__ == "__main__":
    action = sys.argv[1]
    query = sys.argv[2]
    max_results = int(sys.argv[3]) if len(sys.argv) > 3 else 5
    max_snippet_chars = int(sys.argv[4]) if len(sys.argv) > 4 else 280

    if action == "duckduckgo_search":
        results = duckduckgo_search(query, max_results)
        print(json.dumps(results))
    elif action == "build_retrieved_context":
        context, count = build_retrieved_context(query, max_results, max_snippet_chars)
        print(json.dumps({"context": context, "count": count}))
