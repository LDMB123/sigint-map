#!/usr/bin/env python3
"""Lightweight repo secret scan for CI.

This is intentionally conservative and focused on high-signal patterns so the
release gate catches obvious mistakes without requiring a separate SaaS tool.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED_PARTS = {
    ".git",
    ".venv",
    ".pytest_cache",
    "__pycache__",
    "node_modules",
    ".next",
    "out",
    ".tmp-data",
}
EXCLUDED_FILES = {
    ".env.example",
    "frontend/package-lock.json",
}

PATTERNS = {
    "private-key": re.compile(r"-----BEGIN (?:RSA|EC|OPENSSH|DSA|PRIVATE KEY)-----"),
    "aws-access-key": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "github-token": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"),
    "slack-token": re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"),
    "openai-key": re.compile(r"\bsk-[A-Za-z0-9]{20,}\b"),
    "generic-bearer": re.compile(r"Authorization:\s*Bearer\s+[A-Za-z0-9._-]{20,}", re.IGNORECASE),
}


def should_scan(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    if any(part in EXCLUDED_PARTS for part in rel.parts):
        return False
    if rel.as_posix() in EXCLUDED_FILES:
        return False
    return path.is_file()


def main() -> int:
    findings: list[str] = []
    for path in ROOT.rglob("*"):
        if not should_scan(path):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for name, pattern in PATTERNS.items():
            for match in pattern.finditer(text):
                line = text.count("\n", 0, match.start()) + 1
                findings.append(f"{path.relative_to(ROOT)}:{line}: potential {name}")

    if findings:
        print("Potential secrets detected:", file=sys.stderr)
        for finding in findings:
            print(f"  {finding}", file=sys.stderr)
        return 1

    print("No high-signal secret patterns detected.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
