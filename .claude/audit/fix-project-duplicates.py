#!/usr/bin/env python3
"""
Fix duplicates within DMBAlmanacProjectFolder
Keep newer category structure, delete old ones
"""

import json
import shutil
from pathlib import Path
from datetime import datetime
from collections import defaultdict

root = Path('/Users/louisherman/ClaudeCodeProjects')
project_dir = root / 'DMBAlmanacProjectFolder/.claude'

# Parse current state
print("Parsing current state...")
import subprocess
result = subprocess.run(['python3', '.claude/audit/parse-toolkit.py'], capture_output=True, text=True)
print(result.stdout)

# Load coordination map
with open(root / '.claude/audit/coordination-map.json') as f:
    data = json.load(f)

# Create backup first
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
backup_dir = root / f'.claude_backup_{timestamp}'
print(f"\nCreating backup: {backup_dir}")
shutil.copytree(project_dir, backup_dir, ignore=shutil.ignore_patterns('audit'))
print(f"✓ Backup created\n")

# Find project-internal duplicates
# Pattern: same name in different categories within DMBAlmanacProjectFolder
project_agents = [a for a in data['agents'] if a['scope'] == 'project'
                 and 'DMBAlmanacProjectFolder' in a['relative_path']
                 and '.claude_backup' not in a['relative_path']]

# Group by name
by_name = defaultdict(list)
for agent in project_agents:
    by_name[agent['name']].append(agent)

# Find duplicates
duplicates = {name: instances for name, instances in by_name.items() if len(instances) > 1}

print(f"Found {len(duplicates)} agent names with duplicates\n")

# Category preference (keep newer structure, delete old)
# Based on what we see: 'analysis', 'generation', 'validation' are newer
# Old categories: 'analyzers', 'generators', 'validators', 'documentation'
OLD_CATEGORIES = {'analyzers', 'generators', 'validators', 'documentation', 'transformers',
                 'orchestrators', 'predictive', 'devops', 'efficiency', 'security',
                 'prefetching', 'zero-latency', 'integrators', 'accuracy', 'neural-routing',
                 'caching', 'guardians', 'reporters', 'amplification'}

NEW_CATEGORIES = {'analysis', 'generation', 'validation', 'coordination', 'compound',
                 'accuracy', 'ai-ml', 'data', 'orchestrators', 'swarms'}

deleted_count = 0
kept_count = 0

for name, instances in sorted(duplicates.items()):
    if len(instances) == 2:
        # Determine which to keep
        inst1, inst2 = instances
        cat1, cat2 = inst1['category'], inst2['category']

        to_delete = None
        if cat1 in OLD_CATEGORIES and cat2 in NEW_CATEGORIES:
            to_delete = inst1
        elif cat2 in OLD_CATEGORIES and cat1 in NEW_CATEGORIES:
            to_delete = inst2
        elif cat1 in OLD_CATEGORIES and cat2 in OLD_CATEGORIES:
            # Both old - keep alphabetically first
            to_delete = inst2 if cat1 < cat2 else inst1
        else:
            # Both new or unclear - keep first alphabetically
            to_delete = inst2 if cat1 < cat2 else inst1

        if to_delete:
            filepath = root / to_delete['relative_path']
            if filepath.exists():
                print(f"DELETE: {to_delete['category']}/{name}.md (keeping {instances[0 if to_delete == instances[1] else 1]['category']}/)")
                filepath.unlink()
                deleted_count += 1
            else:
                print(f"SKIP (not found): {to_delete['relative_path']}")

print(f"\n✓ Deleted {deleted_count} duplicate agents")

# Now apply model policy to remaining agents
print("\n" + "="*80)
print("Applying Model Policy")
print("="*80)

POLICY = {
    'analyzer': 'haiku',
    'indexer': 'haiku',
    'scanner': 'haiku',
    'mapper': 'haiku',
    'coverage': 'haiku',
    'architect': 'opus',
    'orchestrator': 'opus',
    'planner': 'opus',
    'lead': 'opus',
    'engineer': 'sonnet',
    'developer': 'sonnet',
    'refactorer': 'sonnet',
    'generator': 'sonnet',
    'builder': 'sonnet',
    'compiler': 'sonnet',
    'auditor': 'opus',
    'reviewer': 'opus',
    'security': 'opus',
    'compliance': 'opus',
    'safety': 'opus',
    'threat': 'opus',
    'qa': 'sonnet',
    'test': 'sonnet',
    'validator': 'sonnet',
    'checker': 'sonnet',
    'parallel': 'haiku',
    'swarm': 'sonnet',
    'worker': 'haiku',
    'partitioner': 'haiku',
    'aggregator': 'sonnet',
    'writer': 'sonnet',
    'documenter': 'sonnet',
    'changelog': 'sonnet',
}

def infer_model(agent_name: str) -> str:
    name_lower = agent_name.lower()
    for keyword, model in POLICY.items():
        if keyword in name_lower:
            return model
    return 'sonnet'

import re

model_changes = defaultdict(int)

for agent_file in project_dir.rglob('agents/**/*.md'):
    if not agent_file.exists():
        continue

    content = agent_file.read_text(encoding='utf-8')

    # Check if has frontmatter with model: default
    if re.search(r'^model:\s*default\s*$', content, re.MULTILINE):
        new_model = infer_model(agent_file.stem)

        new_content = re.sub(
            r'^model:\s*default\s*$',
            f'model: {new_model}',
            content,
            flags=re.MULTILINE
        )

        agent_file.write_text(new_content, encoding='utf-8')
        print(f"{agent_file.stem}: default → {new_model}")
        model_changes[new_model] += 1

print(f"\n✓ Model policy applied:")
print(f"  haiku: {model_changes['haiku']}")
print(f"  sonnet: {model_changes['sonnet']}")
print(f"  opus: {model_changes['opus']}")

print(f"\nBackup: {backup_dir}")
print("✓ Optimization complete")
