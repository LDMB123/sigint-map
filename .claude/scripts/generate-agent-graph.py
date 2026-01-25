#!/usr/bin/env python3
"""
Generate Mermaid graph visualization of agent coordination.
"""

import sys
import re
from pathlib import Path
from collections import defaultdict

def extract_integration_points(content):
    """Extract agent references from integration points."""
    agents_found = re.findall(r'\*\*([^*]+)\*\*', content)
    return agents_found

def extract_category(filepath, agents_dir):
    """Extract agent category from path."""
    relative = filepath.relative_to(agents_dir)
    if len(relative.parts) > 1:
        return relative.parts[0]
    return 'root'

def generate_mermaid_graph(agents_dir, max_nodes=50, output_file=None):
    """Generate Mermaid graph syntax."""
    agents_dir = Path(agents_dir)

    # Collect all agents and their references
    agent_data = {}
    category_counts = defaultdict(int)

    for agent_file in agents_dir.rglob('*.md'):
        if agent_file.name in ['README.md', 'QUICK_REFERENCE.md']:
            continue

        with open(agent_file, 'r') as f:
            content = f.read()

        agent_name = agent_file.stem
        category = extract_category(agent_file, agents_dir)
        references = extract_integration_points(content)

        agent_data[agent_name] = {
            'category': category,
            'references': references,
            'file': str(agent_file)
        }
        category_counts[category] += 1

    # Calculate reference counts (for prioritization)
    reference_counts = defaultdict(int)
    for agent_name, data in agent_data.items():
        for ref in data['references']:
            reference_counts[ref] += 1

    # Select top agents by reference count
    top_agents = sorted(
        agent_data.keys(),
        key=lambda a: reference_counts.get(a, 0) + len(agent_data[a]['references']),
        reverse=True
    )[:max_nodes]

    # Category colors
    category_colors = {
        'orchestrators': '#ff6b6b',
        'swarms': '#ffeaa7',
        'analyzers': '#4ecdc4',
        'validators': '#45b7d1',
        'generators': '#96ceb4',
        'learners': '#dfe6e9',
        'guardians': '#74b9ff',
        'caching': '#a29bfe',
        'efficiency': '#fd79a8',
        'rust': '#fab1a0',
        'sveltekit': '#00b894',
        'wasm': '#fdcb6e',
    }

    # Generate Mermaid syntax
    lines = ['graph TD', '']

    # Add nodes
    for agent_name in top_agents:
        data = agent_data[agent_name]
        category = data['category']
        color = category_colors.get(category, '#b2bec3')

        node_id = agent_name.replace('-', '_').replace('.', '_')
        label = agent_name[:30]  # Truncate long names

        lines.append(f'    {node_id}["{label}"]')
        lines.append(f'    style {node_id} fill:{color},stroke:#333,stroke-width:2px')

    lines.append('')

    # Add edges (only between top agents)
    edge_count = 0
    for agent_name in top_agents:
        data = agent_data[agent_name]
        node_id = agent_name.replace('-', '_').replace('.', '_')

        for ref in data['references']:
            # Normalize reference name
            ref_normalized = ref.lower().replace(' ', '-').replace('_', '-')

            # Find matching agent
            for candidate in top_agents:
                if ref_normalized in candidate.lower():
                    target_id = candidate.replace('-', '_').replace('.', '_')
                    lines.append(f'    {node_id} -.->|uses| {target_id}')
                    edge_count += 1
                    break

    lines.append('')
    lines.append(f'    %% Graph stats: {len(top_agents)} nodes, {edge_count} edges')

    mermaid_code = '\n'.join(lines)

    # Output
    if output_file:
        with open(output_file, 'w') as f:
            f.write('```mermaid\n')
            f.write(mermaid_code)
            f.write('\n```\n')
        print(f"✅ Mermaid graph written to {output_file}")
    else:
        print(mermaid_code)

    # Print stats
    print(f"\nGraph Statistics:", file=sys.stderr)
    print(f"  Total agents: {len(agent_data)}", file=sys.stderr)
    print(f"  Nodes in graph: {len(top_agents)}", file=sys.stderr)
    print(f"  Edges in graph: {edge_count}", file=sys.stderr)
    print(f"  Categories: {len(category_counts)}", file=sys.stderr)

    # Print top referenced agents
    print(f"\nTop 10 Referenced Agents:", file=sys.stderr)
    for i, (agent, count) in enumerate(sorted(reference_counts.items(), key=lambda x: -x[1])[:10], 1):
        print(f"  {i}. {agent}: {count} references", file=sys.stderr)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: generate-agent-graph.py <agents_dir> [output_file] [max_nodes]")
        sys.exit(1)

    agents_dir = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    max_nodes = int(sys.argv[3]) if len(sys.argv) > 3 else 50

    generate_mermaid_graph(agents_dir, max_nodes, output_file)
