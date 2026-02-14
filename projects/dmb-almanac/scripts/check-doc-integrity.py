#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATTERNS = [
    "README.md",
    "CONTEXT.md",
    "STATUS.md",
    "CONTRIBUTING.md",
    "data/README.md",
    "e2e/README.md",
    "docs/README.md",
    "docs/INDEX.md",
    "docs/*/README.md",
    "docs/audits/*/README.md",
    "docs/guides/DMB_START_HERE.md",
    "docs/guides/DEPLOYMENT_REFERENCE.md",
    "docs/guides/REPO_ORGANIZATION_POLICY.md",
    "docs/guides/QUALITY_ASSURANCE_STRATEGY.md",
    "docs/ops/CUTOVER_RUNBOOK.md",
    "docs/ops/ROLLBACK_RUNBOOK.md",
    "scripts/README.md",
]

REQUIRED_SECTION_READMES = [
    "docs/api/README.md",
    "docs/audits/README.md",
    "docs/gpu/README.md",
    "docs/guides/README.md",
    "docs/migration/README.md",
    "docs/ops/README.md",
    "docs/quick-references/README.md",
    "docs/references/README.md",
    "docs/reports/README.md",
    "docs/scraping/README.md",
    "docs/wasm/README.md",
]

MD_LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
INLINE_CODE_RE = re.compile(r"`([^`\n]+)`")
SCRIPTS_README_PATH_RE = re.compile(r"(scripts/[A-Za-z0-9._-]+)")

PATH_PREFIXES = (
    "README.md",
    "CONTEXT.md",
    "STATUS.md",
    "CONTRIBUTING.md",
    ".github/",
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
    if path in ("README.md", "CONTEXT.md", "STATUS.md", "CONTRIBUTING.md"):
        return ROOT / path
    if path.endswith("/"):
        return ROOT / path
    if path.endswith(".md"):
        return ROOT / path
    if path.startswith(("scripts/", ".github/workflows/")):
        return ROOT / path
    return None


def check_required_section_readmes() -> list[str]:
    errors: list[str] = []
    for rel_path in REQUIRED_SECTION_READMES:
        if not (ROOT / rel_path).is_file():
            errors.append(f"required-doc-missing: `{rel_path}`")
    return errors


def check_section_readme_links() -> list[str]:
    errors: list[str] = []
    docs_home = (ROOT / "docs/README.md").read_text(encoding="utf-8")
    docs_index = (ROOT / "docs/INDEX.md").read_text(encoding="utf-8")
    for rel_path in REQUIRED_SECTION_READMES:
        if rel_path not in docs_home:
            errors.append(f"docs-home-missing-link: `{rel_path}`")
        if rel_path not in docs_index:
            errors.append(f"docs-index-missing-link: `{rel_path}`")
    return errors


def check_scripts_readme_coverage() -> list[str]:
    errors: list[str] = []
    scripts_dir = ROOT / "scripts"
    scripts_readme = scripts_dir / "README.md"
    readme_text = scripts_readme.read_text(encoding="utf-8")
    referenced = set(SCRIPTS_README_PATH_RE.findall(readme_text))

    on_disk_scripts = sorted(
        str(path.relative_to(ROOT).as_posix())
        for path in scripts_dir.iterdir()
        if path.is_file() and path.name != "README.md"
    )

    for rel_path in on_disk_scripts:
        if rel_path not in referenced:
            errors.append(f"scripts-readme-missing-entry: `{rel_path}`")

    for rel_path in sorted(referenced):
        if rel_path == "scripts/README.md":
            continue
        if not (ROOT / rel_path).exists():
            errors.append(f"scripts-readme-stale-entry: `{rel_path}`")

    return errors


def main() -> int:
    missing_refs: list[tuple[Path, str, str]] = []
    structural_errors: list[str] = []
    docs = gather_docs()

    for doc in docs:
        text = doc.read_text(encoding="utf-8")

        for match in MD_LINK_RE.finditer(text):
            raw_target = normalize_target(match.group(1))
            resolved = resolve_markdown_link(doc, raw_target)
            if resolved is None:
                continue
            if not resolved.exists():
                missing_refs.append((doc, raw_target, "markdown-link"))

        for match in INLINE_CODE_RE.finditer(text):
            raw_token = match.group(1).strip()
            resolved = resolve_inline_path(raw_token)
            if resolved is None:
                continue
            if not resolved.exists():
                missing_refs.append((doc, raw_token, "inline-path"))

    structural_errors.extend(check_required_section_readmes())
    structural_errors.extend(check_section_readme_links())
    structural_errors.extend(check_scripts_readme_coverage())

    if missing_refs or structural_errors:
        print("doc-integrity: issues detected")
        for doc, ref, kind in missing_refs:
            print(f"- {doc.relative_to(ROOT)} [{kind}]: `{ref}`")
        for issue in structural_errors:
            print(f"- {issue}")
        return 1

    print(f"doc-integrity: ok ({len(docs)} files checked)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
