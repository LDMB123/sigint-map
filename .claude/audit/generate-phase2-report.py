#!/usr/bin/env python3
"""
Generate human-readable Phase 2 report from orphan detection results.
"""

import json
from pathlib import Path

def load_results():
    path = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/orphan-detection-results.json')
    with open(path) as f:
        return json.load(f)

def main():
    results = load_results()

    lines = [
        "# Phase 2: Orphan Detection Results",
        f"**Generated**: {results['generated_at']}",
        "",
        "---",
        "",
        "## Executive Summary",
        "",
        f"**Total Agents Analyzed**: {results['summary']['total_agents']}",
        f"**Total Issues Found**: {results['summary']['total_issues']}",
        "",
        "| Issue Category | Count | Severity |",
        "|----------------|-------|----------|",
        f"| Shadowed | {results['summary']['shadowed']} | 🔴 Critical |",
        f"| Disabled | {results['summary']['disabled']} | 🟡 Warning |",
        f"| Dangling References | {results['summary']['dangling_references']} | 🟡 Warning |",
        f"| Model Issues | {results['summary']['model_issues']} | 🟡 Warning |",
        f"| Unreachable | {results['summary']['unreachable']} | 🟢 Info |",
        f"| Format Issues | {results['summary']['format_issues']} | 🟢 Info |",
        "",
        "---",
        "",
        "## 1. Shadowed Agents (Critical)",
        "",
        f"**Count**: {results['summary']['shadowed']}",
        "",
        "These agents exist in multiple scopes. The project-scoped version will override the user-scoped version.",
        ""
    ]

    for item in results['findings']['shadowed']:
        lines.extend([
            f"### `{item['name']}`",
            f"- **Shadowed File**: `{item['file_path']}`",
            f"- **Shadowed By**: `{item['shadowed_by']}`",
            f"- **Reason**: {item['reason']}",
            ""
        ])

    lines.extend([
        "---",
        "",
        "## 2. Disabled Agents (Warning)",
        "",
        f"**Count**: {results['summary']['disabled']}",
        ""
    ])

    if results['summary']['disabled'] == 0:
        lines.append("✅ No agents are explicitly disabled by permission rules.")
    else:
        for item in results['findings']['disabled']:
            lines.extend([
                f"### `{item['name']}`",
                f"- **File**: `{item['file_path']}`",
                f"- **Reason**: {item['reason']}",
                ""
            ])

    lines.extend([
        "",
        "---",
        "",
        "## 3. Dangling References (Warning)",
        "",
        f"**Count**: {results['summary']['dangling_references']}",
        "",
        "These agent names are referenced in `collaboration` metadata but don't exist in the filesystem.",
        ""
    ])

    for item in sorted(results['findings']['dangling_references'], key=lambda x: x['reference_count'], reverse=True):
        lines.extend([
            f"### `{item['name']}`",
            f"- **Referenced by**: {item['reference_count']} agent(s)",
            f"- **Agents**: {', '.join(f'`{a}`' for a in item['referenced_by'][:5])}",
        ])
        if len(item['referenced_by']) > 5:
            lines.append(f"  - _(and {len(item['referenced_by']) - 5} more)_")
        lines.append("")

    lines.extend([
        "---",
        "",
        "## 4. Model Issues (Warning)",
        "",
        f"**Count**: {results['summary']['model_issues']}",
        "",
        "Agents with missing or inconsistent model naming.",
        ""
    ])

    # Group by issue type
    missing = [i for i in results['findings']['model_issues'] if i['issue'] == 'missing_model']
    inconsistent = [i for i in results['findings']['model_issues'] if i['issue'] == 'inconsistent_naming']

    if missing:
        lines.extend([
            "### Missing Model Field",
            ""
        ])
        for item in missing:
            lines.append(f"- `{item['name']}` — {item['file_path']}")
        lines.append("")

    if inconsistent:
        lines.extend([
            "### Inconsistent Model Naming",
            ""
        ])
        for item in inconsistent:
            lines.append(f"- `{item['name']}` — Current: `{item['current']}`, Suggested: `{item['suggested']}`")
        lines.append("")

    lines.extend([
        "---",
        "",
        "## 5. Unreachable Agents (Info)",
        "",
        f"**Count**: {results['summary']['unreachable']}",
        "",
        "These agents are not referenced in any `collaboration` metadata and have no collaborations defined themselves.",
        "",
        "**Note**: This doesn't mean they're broken—they may be invoked directly by users or documented elsewhere.",
        "",
        "### Top 20 Unreachable Agents",
        ""
    ])

    for item in results['findings']['unreachable'][:20]:
        lines.append(f"- `{item['name']}` ({item['scope']}) — {item['file_path']}")

    if len(results['findings']['unreachable']) > 20:
        lines.append(f"\n_(... and {len(results['findings']['unreachable']) - 20} more. See JSON for full list.)_")

    lines.extend([
        "",
        "---",
        "",
        "## 6. Format Issues (Info)",
        "",
        f"**Count**: {results['summary']['format_issues']}",
        ""
    ])

    if results['summary']['format_issues'] == 0:
        lines.append("✅ No format inconsistencies detected.")
    else:
        for item in results['findings']['format_issues']:
            lines.extend([
                f"### `{item['name']}`",
                f"- **File**: `{item['file_path']}`",
                f"- **Issue**: {item['reason']}",
                ""
            ])

    lines.extend([
        "---",
        "",
        "## Next Steps",
        "",
        "Proceeding to **PHASE 3: Fix Plan** with the following priorities:",
        "",
        "1. **High Priority**:",
        "   - Resolve 2 shadowed agents (name collisions)",
        "   - Fix or remove 14 dangling references",
        "",
        "2. **Medium Priority**:",
        "   - Normalize 12 agents with model naming issues",
        "   - Fix 4 format inconsistencies",
        "",
        "3. **Low Priority (Informational)**:",
        "   - Document 252 unreachable agents (may be intentionally standalone)",
        "",
        "---",
        "",
        f"_Full details in `orphan-detection-results.json`_",
        ""
    ])

    # Write report
    output_path = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/phase2-orphan-detection-report.md')
    output_path.write_text('\n'.join(lines))

    print(f"✅ Phase 2 report generated: {output_path}")

if __name__ == '__main__':
    main()
