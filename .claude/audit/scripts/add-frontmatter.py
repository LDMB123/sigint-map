#!/usr/bin/env python3
"""Add frontmatter to legacy commands that don't have it."""

import re
from pathlib import Path

def add_frontmatter_if_missing(file_path, frontmatter_dict):
    """Add frontmatter to file if it doesn't exist."""
    path = Path(file_path)
    if not path.exists():
        print(f"  ⚠️  File not found: {file_path}")
        return False

    content = path.read_text(encoding='utf-8')
    
    # Check if frontmatter exists
    if content.startswith('---\n'):
        # Update existing frontmatter
        match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', content, re.DOTALL)
        if match:
            fm = match.group(1)
            body = match.group(2)
            
            lines = fm.split('\n')
            for key, value in frontmatter_dict.items():
                found = False
                for i, line in enumerate(lines):
                    if line.startswith(f'{key}:'):
                        lines[i] = f'{key}: {value}'
                        found = True
                        break
                if not found:
                    lines.append(f'{key}: {value}')
            
            new_content = '---\n' + '\n'.join(lines) + '\n---\n' + body
        else:
            return False
    else:
        # Add new frontmatter
        fm_lines = ['---']
        for key, value in frontmatter_dict.items():
            fm_lines.append(f'{key}: {value}')
        fm_lines.append('---\n')
        
        new_content = '\n'.join(fm_lines) + content
    
    path.write_text(new_content, encoding='utf-8')
    return True

# Commands that need manual-only gates
commands = [
    '/Users/louisherman/.claude/commands/migrate.md',
    '/Users/louisherman/.claude/commands/cloud-deploy.md',
    '/Users/louisherman/.claude/commands/dexie-migrate.md',
    '/Users/louisherman/.claude/commands/k8s-deploy.md',
    '/Users/louisherman/.claude/commands/verify-before-commit.md',
]

print("Adding frontmatter with manual-only gates...")
for cmd_path in commands:
    if add_frontmatter_if_missing(cmd_path, {'manual-only': 'true'}):
        print(f"  ✅ {Path(cmd_path).stem}")

print("\n✅ Done!")
