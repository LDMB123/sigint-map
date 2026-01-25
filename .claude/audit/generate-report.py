#!/usr/bin/env python3
"""
Generate human-readable markdown report from agent inventory.
"""

import json
from pathlib import Path
from collections import defaultdict

def load_inventory():
    path = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/orphaned-agents-inventory.json')
    with open(path) as f:
        return json.load(f)

def generate_collision_report(inventory):
    """Generate name collision section."""
    collisions = inventory.get('name_collisions', {})
    if not collisions:
        return "✅ **No name collisions detected**\n"

    lines = [f"⚠️  **{len(collisions)} Name Collisions Detected**\n"]
    lines.append("These agents have the same `name` across different scopes (user/project). Claude Code will load only ONE based on precedence rules (usually project > user).\n")

    for name, instances in collisions.items():
        lines.append(f"\n### `{name}`")
        for inst in instances:
            lines.append(f"- **{inst['scope']}**: `{inst['file_path']}`")

    return "\n".join(lines)

def generate_model_distribution(inventory):
    """Generate model distribution table."""
    models = inventory['summary']['by_model']
    total = sum(models.values())

    lines = ["| Model | Count | % of Total |", "|-------|-------|------------|"]
    for model, count in sorted(models.items(), key=lambda x: x[1], reverse=True):
        pct = (count / total * 100) if total > 0 else 0
        lines.append(f"| {model} | {count} | {pct:.1f}% |")

    return "\n".join(lines)

def generate_subdirectory_breakdown(inventory):
    """Generate subdirectory organization table."""
    subdirs = inventory['summary'].get('by_subdirectory', {})
    if not subdirs:
        return "_No subdirectory organization detected._"

    lines = ["| Subdirectory | Agent Count |", "|--------------|-------------|"]
    for subdir, count in sorted(subdirs.items(), key=lambda x: x[1], reverse=True):
        lines.append(f"| `{subdir}` | {count} |")

    return "\n".join(lines)

def analyze_collaboration_graph(inventory):
    """Build collaboration dependency graph."""
    delegates_to = defaultdict(set)
    receives_from = defaultdict(set)
    all_referenced_agents = set()

    for agent in inventory['agents']:
        name = agent.get('name')
        collab = agent.get('collaboration', {})

        if isinstance(collab, dict):
            # Parse delegates_to
            for delegate in collab.get('delegates_to', []):
                if isinstance(delegate, dict):
                    for target, desc in delegate.items():
                        delegates_to[name].add(target)
                        all_referenced_agents.add(target)

            # Parse receives_from
            for source in collab.get('receives_from', []):
                if isinstance(source, dict):
                    for sender, desc in source.items():
                        receives_from[name].add(sender)
                        all_referenced_agents.add(sender)

    # Find agents that exist in the filesystem
    existing_agents = {agent['name'] for agent in inventory['agents'] if agent.get('name')}

    # Find referenced but non-existent agents (dangling references)
    dangling = all_referenced_agents - existing_agents
    # Filter out 'user' which is a special pseudo-agent
    dangling = {ref for ref in dangling if ref != 'user'}

    return {
        'delegates_to': dict(delegates_to),
        'receives_from': dict(receives_from),
        'all_referenced': all_referenced_agents,
        'dangling_references': dangling
    }

def main():
    inventory = load_inventory()
    collab_graph = analyze_collaboration_graph(inventory)

    # Build markdown report
    lines = [
        "# Agent Inventory Report",
        f"**Generated**: {inventory['generated_at']}",
        "",
        "---",
        "",
        "## Executive Summary",
        "",
        f"- **Total Agent Files**: {inventory['total_files']}",
        f"- **Successfully Parsed**: {inventory['parsed_successfully']}",
        f"- **Parse Errors**: {inventory['parse_errors']}",
        f"- **Name Collisions**: {inventory['collision_count']}",
        f"- **Dangling Agent References**: {len(collab_graph['dangling_references'])}",
        "",
        "### Agents by Scope",
        "",
        "| Scope | Count |",
        "|-------|-------|",
    ]

    for scope, count in sorted(inventory['summary']['by_scope'].items()):
        lines.append(f"| {scope} | {count} |")

    lines.extend([
        "",
        "---",
        "",
        "## Model Distribution",
        "",
        generate_model_distribution(inventory),
        "",
        "### ⚠️  Model Naming Issues Detected",
        "",
        "The inventory shows multiple model naming conventions:",
        "- `haiku` (341 agents)",
        "- `sonnet` (108 agents)",
        "- `opus` (5 agents)",
        "- `Gemini 3 Pro` (11 agents) - **Capitalized, project agents**",
        "- `gemini-3-pro` (4 agents) - **Kebab-case**",
        "- `unknown` (1 agent)",
        "",
        "**Action Required**: Verify that Claude Code correctly interprets all model name variations.",
        "",
        "---",
        "",
        "## Format Distribution",
        "",
        "| Format | Count |",
        "|--------|-------|",
    ])

    for fmt, count in sorted(inventory['summary']['by_format'].items()):
        lines.append(f"| {fmt} | {count} |")

    lines.extend([
        "",
        "**Format Notes**:",
        "- **yaml** (458): YAML frontmatter with `name`, `description`, `model`, etc.",
        "- **markdown** (12): Plain markdown with bold key-value pairs (project agents)",
        "",
        "---",
        "",
        "## Subdirectory Organization (User Agents)",
        "",
        generate_subdirectory_breakdown(inventory),
        "",
        "---",
        "",
        "## Name Collisions",
        "",
        generate_collision_report(inventory),
        "",
        "---",
        "",
        "## Collaboration Graph Analysis",
        "",
        f"**Total agents with collaboration metadata**: {sum(1 for a in inventory['agents'] if a.get('collaboration'))}",
        "",
        f"**Agents referenced in collaboration**: {len(collab_graph['all_referenced']) - 1}",  # -1 for 'user'
        "",
        f"**Dangling references** (referenced but don't exist): **{len(collab_graph['dangling_references'])}**",
        "",
    ])

    if collab_graph['dangling_references']:
        lines.append("### ⚠️  Dangling Agent References")
        lines.append("")
        lines.append("These agents are referenced in `collaboration` sections but don't exist in the filesystem:")
        lines.append("")
        for ref in sorted(collab_graph['dangling_references'])[:20]:
            lines.append(f"- `{ref}`")
        if len(collab_graph['dangling_references']) > 20:
            lines.append(f"- _(... and {len(collab_graph['dangling_references']) - 20} more)_")
        lines.append("")

    lines.extend([
        "---",
        "",
        "## Top 20 Most Referenced Agents",
        "",
        "Agents that are most frequently delegated to:",
        "",
        "| Agent | Times Referenced |",
        "|-------|------------------|",
    ])

    # Count how many times each agent is referenced
    ref_counts = defaultdict(int)
    for agent in inventory['agents']:
        collab = agent.get('collaboration', {})
        if isinstance(collab, dict):
            for delegate in collab.get('delegates_to', []):
                if isinstance(delegate, dict):
                    for target in delegate.keys():
                        ref_counts[target] += 1
            for source in collab.get('receives_from', []):
                if isinstance(source, dict):
                    for sender in source.keys():
                        ref_counts[sender] += 1

    for agent, count in sorted(ref_counts.items(), key=lambda x: x[1], reverse=True)[:20]:
        if agent != 'user':
            lines.append(f"| `{agent}` | {count} |")

    lines.extend([
        "",
        "---",
        "",
        "## Next Steps: Orphan Detection",
        "",
        "The following checks are required to identify orphaned agents:",
        "",
        "1. **Not Loaded**: Compare filesystem inventory with `/agents` command output",
        "2. **Shadowed**: The 2 name collisions need resolution",
        "3. **Disabled**: Check settings for `Task(<agent-name>)` deny rules",
        "4. **Broken**: Run delegation smoke tests",
        "5. **Dangling References**: Fix or remove the {0} dangling agent references".format(len(collab_graph['dangling_references'])),
        "6. **Unreachable**: Identify agents never referenced anywhere",
        "",
        "---",
        "",
        "## Detailed Agent List",
        "",
        "_See `orphaned-agents-inventory.json` for full details on all 470 agents._",
        ""
    ])

    # Write report
    output_path = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/agent-inventory-summary.md')
    output_path.write_text('\n'.join(lines))

    print(f"✅ Report generated: {output_path}")
    print(f"\n📊 Key Findings:")
    print(f"   - {inventory['collision_count']} name collisions")
    print(f"   - {len(collab_graph['dangling_references'])} dangling references")
    print(f"   - {sum(1 for a in inventory['agents'] if a.get('collaboration'))} agents with collaboration metadata")

if __name__ == '__main__':
    main()
