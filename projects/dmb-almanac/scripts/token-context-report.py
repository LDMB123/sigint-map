#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
from collections import defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]

ACTIVE_PATTERNS = [
    "README.md",
    "CONTRIBUTING.md",
    "CONTEXT.md",
    "STATUS.md",
    "data/README.md",
    "e2e/README.md",
    "scripts/README.md",
    "docs/**/*.md",
]

ARCHIVE_PREFIXES = (
    "docs/reports/_archived/",
    "docs/reports/_full_audits/",
)

EXCLUDED_PREFIXES = (
    ".tmp/",
    "e2e/node_modules/",
    "rust/target/",
    "rust/static/pkg/",
)

PACK_PRIORITY = [
    "README.md",
    "CONTRIBUTING.md",
    "CONTEXT.md",
    "STATUS.md",
    "data/README.md",
    "e2e/README.md",
    "docs/README.md",
    "docs/INDEX.md",
    "docs/guides/DMB_START_HERE.md",
    "docs/guides/DEPLOYMENT_REFERENCE.md",
    "docs/guides/REPO_ORGANIZATION_POLICY.md",
    "docs/guides/QUALITY_ASSURANCE_STRATEGY.md",
    "scripts/README.md",
]


@dataclass
class Entry:
    path: str
    chars: int
    approx_tokens: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Generate token economy reports for repository context files. "
            "Token count is approximated as ceil(characters/4)."
        )
    )
    parser.add_argument(
        "--scope",
        choices=("active", "all-markdown"),
        default="active",
        help="active: curated docs and readmes; all-markdown: all markdown files excluding archives",
    )
    parser.add_argument(
        "--budget",
        type=int,
        default=12000,
        help="Approximate token budget for recommended context pack",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=20,
        help="Number of largest files to print",
    )
    parser.add_argument(
        "--json-output",
        type=Path,
        help="Optional output path for machine-readable JSON report",
    )
    return parser.parse_args()


def is_excluded(rel_path: str) -> bool:
    return any(rel_path.startswith(prefix) for prefix in ARCHIVE_PREFIXES + EXCLUDED_PREFIXES)


def gather_files(scope: str) -> list[Path]:
    files: set[Path] = set()
    if scope == "active":
        for pattern in ACTIVE_PATTERNS:
            files.update(ROOT.glob(pattern))
    else:
        files.update(ROOT.rglob("*.md"))

    result: list[Path] = []
    for path in files:
        if not path.is_file():
            continue
        rel = path.relative_to(ROOT).as_posix()
        if is_excluded(rel):
            continue
        result.append(path)
    return sorted(result)


def count_entry(path: Path) -> Entry:
    text = path.read_text(encoding="utf-8", errors="ignore")
    chars = len(text)
    approx_tokens = math.ceil(chars / 4)
    return Entry(path=path.relative_to(ROOT).as_posix(), chars=chars, approx_tokens=approx_tokens)


def summarize_by_area(entries: Iterable[Entry]) -> dict[str, int]:
    totals: dict[str, int] = defaultdict(int)
    for entry in entries:
        head = entry.path.split("/", 1)[0]
        totals[head] += entry.approx_tokens
    return dict(sorted(totals.items(), key=lambda item: item[0]))


def build_recommended_pack(entries_by_path: dict[str, Entry], budget: int) -> tuple[list[Entry], int]:
    pack: list[Entry] = []
    used = 0
    for rel_path in PACK_PRIORITY:
        entry = entries_by_path.get(rel_path)
        if entry is None:
            continue
        if used + entry.approx_tokens > budget:
            continue
        pack.append(entry)
        used += entry.approx_tokens
    return pack, used


def print_report(entries: list[Entry], top: int, budget: int) -> None:
    total_tokens = sum(entry.approx_tokens for entry in entries)
    total_chars = sum(entry.chars for entry in entries)
    entries_by_path = {entry.path: entry for entry in entries}
    pack, pack_tokens = build_recommended_pack(entries_by_path, budget)

    print("token-context-report")
    print(f"- files: {len(entries)}")
    print(f"- total_chars: {total_chars}")
    print(f"- total_approx_tokens: {total_tokens}")
    print(f"- budget: {budget}")
    print()

    print("top_files_by_tokens:")
    for entry in sorted(entries, key=lambda item: item.approx_tokens, reverse=True)[:top]:
        print(f"- {entry.path}: {entry.approx_tokens} tokens ({entry.chars} chars)")
    print()

    print("tokens_by_area:")
    for area, tokens in summarize_by_area(entries).items():
        print(f"- {area}: {tokens}")
    print()

    print("recommended_context_pack:")
    for entry in pack:
        print(f"- {entry.path}: {entry.approx_tokens}")
    print(f"- pack_total: {pack_tokens}")
    print(f"- budget_remaining: {budget - pack_tokens}")


def main() -> int:
    args = parse_args()
    files = gather_files(args.scope)
    entries = [count_entry(path) for path in files]
    print_report(entries, args.top, args.budget)

    if args.json_output:
        entries_by_path = {entry.path: entry for entry in entries}
        pack, pack_tokens = build_recommended_pack(entries_by_path, args.budget)
        payload = {
            "scope": args.scope,
            "files": len(entries),
            "total_chars": sum(entry.chars for entry in entries),
            "total_approx_tokens": sum(entry.approx_tokens for entry in entries),
            "budget": args.budget,
            "top_files_by_tokens": [asdict(entry) for entry in sorted(entries, key=lambda item: item.approx_tokens, reverse=True)[: args.top]],
            "tokens_by_area": summarize_by_area(entries),
            "recommended_context_pack": [asdict(entry) for entry in pack],
            "recommended_context_pack_total_tokens": pack_tokens,
            "recommended_context_pack_budget_remaining": args.budget - pack_tokens,
        }
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
