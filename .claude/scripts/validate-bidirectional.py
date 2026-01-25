#!/usr/bin/env python3
"""
Validate bidirectional consistency in agent collaboration contracts.
If A delegates to B, then B should declare receives-from A.
"""

import sys
import re
from pathlib import Path
from collections import defaultdict

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False

def extract_frontmatter(content):
    """Extract YAML frontmatter from markdown."""
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if match and HAS_YAML:
        try:
            return yaml.safe_load(match.group(1))
        except yaml.YAMLError:
            return {}
    return {}

def extract_collaboration_contracts(content):
    """Extract collaboration contracts from markdown (YAML or prose)."""
    frontmatter = extract_frontmatter(content)

    # Try YAML frontmatter first
    if 'collaboration-contracts' in frontmatter:
        return frontmatter['collaboration-contracts']

    # Fallback: parse from markdown body (not implemented yet)
    return {
        'receives-from': [],
        'delegates-to': [],
        'escalates-to': [],
        'collaborates-with': []
    }

def validate_bidirectional(agents_dir):
    """Validate bidirectional consistency."""
    agents = {}

    # Load all agents
    for agent_file in Path(agents_dir).rglob('*.md'):
        if agent_file.name in ['README.md', 'QUICK_REFERENCE.md']:
            continue

        with open(agent_file, 'r') as f:
            content = f.read()

        agent_name = agent_file.stem
        contracts = extract_collaboration_contracts(content)
        agents[agent_name] = contracts

    errors = []

    # Check bidirectional consistency
    for agent_a, contracts_a in agents.items():
        for agent_b in contracts_a.get('delegates-to', []):
            if agent_b in agents:
                contracts_b = agents[agent_b]
                if agent_a not in contracts_b.get('receives-from', []):
                    errors.append({
                        'type': 'missing_receive',
                        'from': agent_a,
                        'to': agent_b,
                        'message': f"{agent_a} delegates to {agent_b}, but {agent_b} doesn't declare receives-from {agent_a}"
                    })

    # Report errors
    if errors:
        print(f"Found {len(errors)} bidirectional inconsistencies:")
        for error in errors:
            print(f"  ❌ {error['message']}")
        return len(errors)
    else:
        print("✅ All bidirectional contracts are consistent")
        return 0

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: validate-bidirectional.py <agents_dir>")
        sys.exit(1)

    agents_dir = sys.argv[1]
    error_count = validate_bidirectional(agents_dir)
    sys.exit(min(error_count, 127))  # Exit code capped at 127
