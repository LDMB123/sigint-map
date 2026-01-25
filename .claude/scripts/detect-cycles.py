#!/usr/bin/env python3
"""
Detect circular dependencies in agent delegation graph.
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
    """Extract collaboration contracts from markdown."""
    frontmatter = extract_frontmatter(content)

    if 'collaboration-contracts' in frontmatter:
        return frontmatter['collaboration-contracts']

    return {
        'delegates-to': []
    }

def has_cycle(graph, start, end, visited=None):
    """Check if there's a path from start to end."""
    if visited is None:
        visited = set()

    if start == end:
        return True

    if start in visited:
        return False

    visited.add(start)

    for neighbor in graph.get(start, []):
        if has_cycle(graph, neighbor, end, visited.copy()):
            return True

    return False

def find_cycles(agents_dir):
    """Find circular dependencies in delegation graph."""
    graph = defaultdict(list)
    agents = set()

    # Build delegation graph
    for agent_file in Path(agents_dir).rglob('*.md'):
        if agent_file.name in ['README.md', 'QUICK_REFERENCE.md']:
            continue

        with open(agent_file, 'r') as f:
            content = f.read()

        agent_name = agent_file.stem
        agents.add(agent_name)

        contracts = extract_collaboration_contracts(content)
        for target in contracts.get('delegates-to', []):
            graph[agent_name].append(target)

    # Detect cycles
    cycles = []
    for agent_a in agents:
        for agent_b in graph[agent_a]:
            if agent_b in agents and has_cycle(graph, agent_b, agent_a):
                cycle = (agent_a, agent_b)
                # Avoid duplicates (a→b and b→a are same cycle)
                reverse_cycle = (agent_b, agent_a)
                if cycle not in cycles and reverse_cycle not in cycles:
                    cycles.append(cycle)

    # Report cycles
    if cycles:
        print(f"Found {len(cycles)} circular dependencies:")
        for cycle in cycles:
            print(f"  ❌ {cycle[0]} ↔ {cycle[1]}")
        return len(cycles)
    else:
        print("✅ No circular dependencies detected")
        return 0

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: detect-cycles.py <agents_dir>")
        sys.exit(1)

    agents_dir = sys.argv[1]
    cycle_count = find_cycles(agents_dir)
    sys.exit(min(cycle_count, 127))
