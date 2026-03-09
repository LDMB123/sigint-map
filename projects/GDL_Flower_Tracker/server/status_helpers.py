from __future__ import annotations


def source_kind(source: str | None) -> str | None:
    if not source:
        return None

    normalized = str(source).strip().lower()
    if not normalized:
        return None
    if normalized in {"seed", "bootstrap"}:
        return "seed"
    if normalized.startswith("refresh"):
        return "refresh"
    if "scrape" in normalized:
        return "scrape"
    if normalized == "sync":
        return "sync"
    return "job"
