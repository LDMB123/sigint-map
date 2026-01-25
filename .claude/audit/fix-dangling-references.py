#!/usr/bin/env python3
"""
Fix dangling references in collaboration metadata.
"""

import json
import re
from pathlib import Path
from typing import Dict, List

def load_orphan_results():
    path = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/orphan-detection-results.json')
    with open(path) as f:
        return json.load(f)

def get_dangling_refs():
    """Get list of dangling reference names."""
    results = load_orphan_results()
    return [ref['name'] for ref in results['findings']['dangling_references']]

def fix_agent_file(file_path: Path, dangling_refs: List[str]) -> bool:
    """Remove dangling references from an agent file. Returns True if changes were made."""
    try:
        content = file_path.read_text(encoding='utf-8')
        original_content = content

        # Extract YAML frontmatter
        match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)$', content, re.DOTALL)
        if not match:
            return False  # No YAML frontmatter

        yaml_section = match.group(1)
        rest = match.group(2)

        # Check if this file has collaboration section
        if 'collaboration:' not in yaml_section:
            return False

        # For each dangling ref, remove it from collaboration section
        for ref in dangling_refs:
            # Remove from delegates_to
            pattern1 = re.compile(rf'^\s*-\s*\{{\s*{re.escape(ref)}\s*:.*?\}}\s*$', re.MULTILINE)
            yaml_section = pattern1.sub('', yaml_section)

            # Remove from receives_from
            pattern2 = re.compile(rf'^\s*-\s*\{{\s*{re.escape(ref)}\s*:.*?\}}\s*$', re.MULTILINE)
            yaml_section = pattern2.sub('', yaml_section)

            # Remove from returns_to
            pattern3 = re.compile(rf'^\s*-\s*\{{\s*{re.escape(ref)}\s*:.*?\}}\s*$', re.MULTILINE)
            yaml_section = pattern3.sub('', yaml_section)

        # Rebuild content
        new_content = f"---\n{yaml_section}\n---\n{rest}"

        if new_content != original_content:
            file_path.write_text(new_content, encoding='utf-8')
            return True

        return False

    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    print("Fixing dangling references in agent files...")

    dangling_refs = get_dangling_refs()
    print(f"\nDangling references to remove: {len(dangling_refs)}")
    for ref in dangling_refs:
        print(f"  - {ref}")

    # Find all user agent files
    agents_dir = Path.home() / '.claude/agents'
    agent_files = list(agents_dir.rglob('*.md'))

    print(f"\nScanning {len(agent_files)} agent files...")

    changed_count = 0
    for agent_file in agent_files:
        if fix_agent_file(agent_file, dangling_refs):
            changed_count += 1
            print(f"  ✓ Fixed {agent_file.relative_to(agents_dir)}")

    print(f"\n✅ Fixed {changed_count} agent files")
    print("\nRe-running orphan detector to verify...")

if __name__ == '__main__':
    main()
