#!/usr/bin/env python3
"""
Checks which agents are reachable from user entry points.

Usage:
    python3 check-agent-reachability.py
    python3 check-agent-reachability.py --start user
    python3 check-agent-reachability.py --visualize
"""

import os
import re
import argparse
from pathlib import Path
from collections import defaultdict, deque
import json

AGENTS_DIR = Path(__file__).resolve().parent.parent / "agents"


def build_delegation_graph():
    """Build graph of agent delegations and reverse graph."""
    forward_graph = defaultdict(list)  # agent -> delegates to
    reverse_graph = defaultdict(list)  # agent -> receives from
    all_agents = set()

    for agent_file in AGENTS_DIR.rglob("*.md"):
        if agent_file.name in ['README.md', 'QUICK_REFERENCE.md']:
            continue

        agent_name = agent_file.stem
        all_agents.add(agent_name)

        with open(agent_file, 'r') as f:
            content = f.read()

        # Find receives_from
        receives_match = re.search(
            r'receives_from:(.*?)(?=\n\n|\ndelegates_to:|\n##|\Z)',
            content,
            re.DOTALL
        )
        if receives_match:
            sources = re.findall(r'-\s+(.+)', receives_match.group(1))
            for source in sources:
                source = source.strip()
                forward_graph[source].append(agent_name)
                reverse_graph[agent_name].append(source)

        # Find delegates_to
        delegates_match = re.search(
            r'delegates_to:(.*?)(?=\n\n|\n##|\Z)',
            content,
            re.DOTALL
        )
        if delegates_match:
            targets = re.findall(r'-\s+(.+)', delegates_match.group(1))
            for target in targets:
                target = target.strip()
                forward_graph[agent_name].append(target)
                reverse_graph[target].append(agent_name)

    return forward_graph, reverse_graph, all_agents


def find_reachable_agents(graph, start="user"):
    """BFS to find all reachable agents from start node."""
    visited = set()
    queue = deque([start])
    paths = {start: [start]}

    while queue:
        node = queue.popleft()
        if node in visited:
            continue
        visited.add(node)

        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                queue.append(neighbor)
                if neighbor not in paths:
                    paths[neighbor] = paths[node] + [neighbor]

    return visited, paths


def find_orphaned_agents(all_agents, reachable_from_user):
    """Find agents that are not reachable from user."""
    orphaned = all_agents - reachable_from_user
    # Remove system nodes
    orphaned = {a for a in orphaned if a not in ['user', 'system-architect', 'product-manager', 'security-engineer']}
    return orphaned


def categorize_agents(agents):
    """Categorize agents by directory."""
    categories = defaultdict(list)

    for agent in agents:
        for agent_file in AGENTS_DIR.rglob(f"{agent}.md"):
            category = agent_file.parent.name
            categories[category].append(agent)
            break

    return categories


def print_report(all_agents, reachable, orphaned, paths, visualize=False):
    """Print comprehensive reachability report."""

    print("=" * 80)
    print("AGENT REACHABILITY ANALYSIS")
    print("=" * 80)
    print()

    total_agents = len(all_agents)
    reachable_count = len(reachable - {'user', 'system-architect', 'product-manager', 'security-engineer'})
    orphaned_count = len(orphaned)

    print(f"📊 SUMMARY STATISTICS")
    print(f"   Total Agents:         {total_agents}")
    print(f"   Reachable from User:  {reachable_count} ({reachable_count/total_agents*100:.1f}%)")
    print(f"   Orphaned Agents:      {orphaned_count} ({orphaned_count/total_agents*100:.1f}%)")
    print()

    # Status
    if orphaned_count / total_agents > 0.5:
        status = "🔴 CRITICAL"
    elif orphaned_count / total_agents > 0.2:
        status = "🟡 WARNING"
    elif orphaned_count / total_agents > 0.1:
        status = "🟠 NEEDS ATTENTION"
    else:
        status = "🟢 GOOD"

    print(f"   Status: {status}")
    print()

    # Reachable agents by category
    print("✅ REACHABLE AGENTS BY CATEGORY")
    print("-" * 80)
    reachable_cats = categorize_agents(reachable - {'user', 'system-architect', 'product-manager', 'security-engineer'})
    for category in sorted(reachable_cats.keys()):
        agents = sorted(reachable_cats[category])
        print(f"\n{category.upper()} ({len(agents)} agents):")
        for agent in agents:
            # Show path depth
            path_len = len(paths.get(agent, [])) - 1
            print(f"  - {agent} (depth: {path_len})")

    print()
    print()

    # Orphaned agents by category
    print("❌ ORPHANED AGENTS BY CATEGORY")
    print("-" * 80)
    orphaned_cats = categorize_agents(orphaned)
    for category in sorted(orphaned_cats.keys()):
        agents = sorted(orphaned_cats[category])
        print(f"\n{category.upper()} ({len(agents)} agents):")
        for agent in agents:
            print(f"  - {agent}")

    print()
    print()

    # Sample paths
    if visualize and paths:
        print("🔗 SAMPLE DELEGATION PATHS")
        print("-" * 80)

        # Show paths for a few interesting agents
        interesting_agents = [
            '00-wasm-lead-orchestrator',
            'mcp-server-architect',
            'workflow-orchestrator'
        ]

        for agent in interesting_agents:
            if agent in paths:
                path = paths[agent]
                print(f"\n{agent}:")
                print(f"  Path: {' → '.join(path)}")
                print(f"  Depth: {len(path) - 1}")

    print()
    print("=" * 80)


def export_json(all_agents, reachable, orphaned, paths, output_file):
    """Export analysis results to JSON."""
    data = {
        "summary": {
            "total_agents": len(all_agents),
            "reachable_count": len(reachable - {'user', 'system-architect', 'product-manager', 'security-engineer'}),
            "orphaned_count": len(orphaned),
            "orphaned_percentage": len(orphaned) / len(all_agents) * 100
        },
        "reachable_agents": sorted(list(reachable - {'user', 'system-architect', 'product-manager', 'security-engineer'})),
        "orphaned_agents": sorted(list(orphaned)),
        "reachable_by_category": {
            cat: sorted(agents)
            for cat, agents in categorize_agents(reachable - {'user', 'system-architect', 'product-manager', 'security-engineer'}).items()
        },
        "orphaned_by_category": {
            cat: sorted(agents)
            for cat, agents in categorize_agents(orphaned).items()
        },
        "sample_paths": {
            agent: path
            for agent, path in list(paths.items())[:20]
        }
    }

    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"\n📄 Exported analysis to {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description="Check agent reachability from user entry points"
    )
    parser.add_argument(
        "--start",
        default="user",
        help="Starting node for reachability analysis (default: user)"
    )
    parser.add_argument(
        "--visualize",
        action="store_true",
        help="Show sample delegation paths"
    )
    parser.add_argument(
        "--export",
        help="Export results to JSON file"
    )

    args = parser.parse_args()

    # Build graphs
    print("🔍 Analyzing agent collaboration contracts...")
    forward_graph, reverse_graph, all_agents = build_delegation_graph()

    # Find reachable agents
    reachable, paths = find_reachable_agents(forward_graph, args.start)

    # Find orphaned agents
    orphaned = find_orphaned_agents(all_agents, reachable)

    # Print report
    print_report(all_agents, reachable, orphaned, paths, args.visualize)

    # Export if requested
    if args.export:
        export_json(all_agents, reachable, orphaned, paths, args.export)


if __name__ == "__main__":
    main()
