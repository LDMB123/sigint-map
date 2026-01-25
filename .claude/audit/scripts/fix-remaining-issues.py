#!/usr/bin/env python3
"""Fix remaining coordination issues identified by validation."""

import re
from pathlib import Path

def update_frontmatter(file_path, updates):
    """Update frontmatter in a markdown file."""
    path = Path(file_path)
    if not path.exists():
        return False

    content = path.read_text(encoding='utf-8')
    
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', content, re.DOTALL)
    if not match:
        return False
    
    fm = match.group(1)
    body = match.group(2)
    
    lines = fm.split('\n')
    updated_lines = []
    keys_updated = set()
    
    for line in lines:
        updated = False
        for key, value in updates.items():
            if line.startswith(f'{key}:'):
                updated_lines.append(f'{key}: {value}')
                keys_updated.add(key)
                updated = True
                break
        if not updated:
            updated_lines.append(line)
    
    for key, value in updates.items():
        if key not in keys_updated:
            updated_lines.append(f'{key}: {value}')
    
    new_content = '---\n' + '\n'.join(updated_lines) + '\n---\n' + body
    path.write_text(new_content, encoding='utf-8')
    return True

# Fix unknown model agents
print("Fixing unknown model agents...")
update_frontmatter('/Users/louisherman/ClaudeCodeProjects/.claude/agents/self-improving/recursive-optimizer.md', {'model': 'opus'})
update_frontmatter('/Users/louisherman/ClaudeCodeProjects/.claude/agents/self-improving/feedback-loop-optimizer.md', {'model': 'sonnet'})

# Add missing manual gates
print("Adding missing manual gates...")
commands = [
    ('migrate', '/Users/louisherman/.claude/commands/migrate.md'),
    ('cloud-deploy', '/Users/louisherman/.claude/commands/cloud-deploy.md'),
    ('dexie-migrate', '/Users/louisherman/.claude/commands/dexie-migrate.md'),
    ('k8s-deploy', '/Users/louisherman/.claude/commands/k8s-deploy.md'),
    ('verify-before-commit', '/Users/louisherman/.claude/commands/verify-before-commit.md'),
]

for name, path in commands:
    if Path(path).exists():
        update_frontmatter(path, {'manual-only': 'true'})
        print(f"  ✅ Added manual gate to {name}")

print("\n✅ All fixes applied!")
