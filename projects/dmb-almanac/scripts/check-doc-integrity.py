#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATTERNS = [
    "README.md",
    "CONTRIBUTING.md",
    "docs/README.md",
    "docs/INDEX.md",
    "docs/guides/DMB_START_HERE.md",
    "docs/guides/DEPLOYMENT_REFERENCE.md",
    "docs/guides/REPO_ORGANIZATION_POLICY.md",
    "docs/ops/CUTOVER_RUNBOOK.md",
    "docs/ops/ROLLBACK_RUNBOOK.md",
    "scripts/README.md",
]

MD_LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
INLINE_CODE_RE = re.compile(r"`([^`\n]+)`")

PATH_PREFIXES = (
    "README.md",
    "CONTRIBUTING.md",
    "docs/",
    "scripts/",
    "rust/",
    "data/",
    "e2e/",
)

OPTIONAL_GENERATED_PREFIXES = (
    "rust/target/",
    "rust/static/pkg/",
    "rust/static/data/",
    "rust/data/raw/",
    "e2e/playwright-report/",
    "e2e/test-results/",
)


def gather_docs() -> list[Path]:
    files: set[Path] = set()
    for pattern in DOC_PATTERNS:
        files.update(ROOT.glob(pattern))
    return sorted(path for path in files if path.is_file())


def normalize_target(raw: str) -> str:
    target = raw.strip()
    if target.startswith("<") and target.endswith(">"):
        target = target[1:-1]
    if " " in target:
        target = target.split(" ", 1)[0]
    return target


def resolve_markdown_link(source: Path, target: str) -> Path | None:
    if target.startswith(("http://", "https://", "mailto:", "tel:", "#")):
        return None
    if "#" in target:
        target = target.split("#", 1)[0]
    if not target:
        return None
    if target.startswith("/"):
        return ROOT / target.lstrip("/")
    return (source.parent / target).resolve()


def resolve_inline_path(token: str) -> Path | None:
    if " " in token or token.startswith(("http://", "https://")):
        return None
    if any(char in token for char in ("*", "?", "[", "]", "{", "}")):
        return None
    path = token.rstrip(".,)")
    if ":" in path:
        path = path.split(":", 1)[0]
    if not path.startswith(PATH_PREFIXES):
        return None
    if path.startswith(OPTIONAL_GENERATED_PREFIXES):
        return None
    if path in ("README.md", "CONTRIBUTING.md"):
        return ROOT / path
    if path.endswith("/"):
        return ROOT / path
    if path.endswith(".md"):
        return ROOT / path
    if path.startswith(("scripts/", ".github/workflows/")):
        return ROOT / path
    return None


def main() -> int:
    missing: list[tuple[Path, str, str]] = []
    docs = gather_docs()

    for doc in docs:
        text = doc.read_text(encoding="utf-8")

        for match in MD_LINK_RE.finditer(text):
            raw_target = normalize_target(match.group(1))
            resolved = resolve_markdown_link(doc, raw_target)
            if resolved is None:
                continue
            if not resolved.exists():
                missing.append((doc, raw_target, "markdown-link"))

        for match in INLINE_CODE_RE.finditer(text):
            raw_token = match.group(1).strip()
            resolved = resolve_inline_path(raw_token)
            if resolved is None:
                continue
            if not resolved.exists():
                missing.append((doc, raw_token, "inline-path"))

    if missing:
        print("doc-integrity: missing references detected")
        for doc, ref, kind in missing:
            print(f"- {doc.relative_to(ROOT)} [{kind}]: `{ref}`")
        return 1

    print(f"doc-integrity: ok ({len(docs)} files checked)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
