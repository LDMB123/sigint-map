#!/usr/bin/env python3
"""
PHASE 2: Orphan Detection
Classify agents into orphan categories based on inventory analysis.
"""

import json
from pathlib import Path
from typing import Dict, List, Set
from collections import defaultdict

def load_inventory():
    path = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/orphaned-agents-inventory.json')
    with open(path) as f:
        return json.load(f)

def load_settings():
    """Load settings to check for deny rules."""
    try:
        path = Path.home() / '.claude/settings.json'
        with open(path) as f:
            return json.load(f)
    except:
        return {}

def detect_shadowed(inventory: dict) -> List[dict]:
    """Detect name collisions where one agent shadows another."""
    collisions = inventory.get('name_collisions', {})
    shadowed = []

    for name, instances in collisions.items():
        # Project scope wins over user scope
        project_instances = [i for i in instances if i['scope'] == 'project']
        user_instances = [i for i in instances if i['scope'] == 'user']

        if project_instances and user_instances:
            for user_inst in user_instances:
                shadowed.append({
                    'name': name,
                    'file_path': user_inst['file_path'],
                    'scope': 'user',
                    'shadowed_by': project_instances[0]['file_path'],
                    'reason': 'Project-scoped agent with same name takes precedence'
                })

    return shadowed

def detect_disabled(inventory: dict, settings: dict) -> List[dict]:
    """Detect agents disabled by permission rules."""
    disabled = []
    deny_rules = settings.get('permissions', {}).get('deny', [])

    # Check for Task(<agent-name>) deny rules
    task_denies = [rule for rule in deny_rules if rule.startswith('Task(')]

    for agent in inventory['agents']:
        name = agent.get('name')
        if not name:
            continue

        # Check if this agent is explicitly denied
        for rule in task_denies:
            if f'Task({name})' in rule or f'Task({name}*)' in rule:
                disabled.append({
                    'name': name,
                    'file_path': agent['file_path'],
                    'scope': agent.get('scope'),
                    'reason': f'Blocked by permission rule: {rule}'
                })
                break

    return disabled

def detect_dangling_references(inventory: dict) -> List[dict]:
    """Detect agents referenced but don't exist."""
    existing_names = {a.get('name') for a in inventory['agents'] if a.get('name')}
    all_referenced = set()
    references_by_agent = defaultdict(list)

    for agent in inventory['agents']:
        name = agent.get('name')
        collab = agent.get('collaboration', {})

        if isinstance(collab, dict):
            # Collect all referenced agents
            for delegate in collab.get('delegates_to', []):
                if isinstance(delegate, dict):
                    for target in delegate.keys():
                        all_referenced.add(target)
                        references_by_agent[target].append(name)

            for source in collab.get('receives_from', []):
                if isinstance(source, dict):
                    for sender in source.keys():
                        all_referenced.add(sender)
                        references_by_agent[sender].append(name)

    # Find dangling references (excluding pseudo-agents)
    pseudo_agents = {'user', 'system'}
    dangling = all_referenced - existing_names - pseudo_agents

    result = []
    for ref in sorted(dangling):
        result.append({
            'name': ref,
            'referenced_by': references_by_agent[ref],
            'reference_count': len(references_by_agent[ref]),
            'reason': 'Agent referenced in collaboration metadata but file does not exist'
        })

    return result

def detect_model_issues(inventory: dict) -> List[dict]:
    """Detect agents with model naming issues."""
    issues = []

    for agent in inventory['agents']:
        model = agent.get('model', 'unknown')

        # Check for non-standard model names
        if model == 'unknown':
            issues.append({
                'name': agent.get('name'),
                'file_path': agent['file_path'],
                'issue': 'missing_model',
                'reason': 'No model specified in frontmatter'
            })
        elif model == 'Gemini 3 Pro':
            issues.append({
                'name': agent.get('name'),
                'file_path': agent['file_path'],
                'issue': 'inconsistent_naming',
                'current': 'Gemini 3 Pro',
                'suggested': 'gemini-3-pro',
                'reason': 'Capitalized model name may not match standard aliases'
            })

    return issues

def detect_unreachable(inventory: dict) -> List[dict]:
    """Detect agents that are never referenced anywhere."""
    # Build set of all referenced agents
    referenced = set()

    for agent in inventory['agents']:
        collab = agent.get('collaboration', {})

        if isinstance(collab, dict):
            for delegate in collab.get('delegates_to', []):
                if isinstance(delegate, dict):
                    referenced.update(delegate.keys())

            for source in collab.get('receives_from', []):
                if isinstance(source, dict):
                    referenced.update(source.keys())

    # Find agents that exist but are never referenced
    unreachable = []

    for agent in inventory['agents']:
        name = agent.get('name')
        if not name:
            continue

        # Skip if referenced
        if name in referenced:
            continue

        # Skip if has collaboration metadata (likely a leaf/entry point)
        if agent.get('collaboration'):
            continue

        # Skip orchestrators and top-level agents (entry points)
        if any(keyword in name.lower() for keyword in ['orchestrator', 'lead', 'chief', 'head']):
            continue

        unreachable.append({
            'name': name,
            'file_path': agent['file_path'],
            'scope': agent.get('scope'),
            'reason': 'Not referenced in any collaboration metadata and has no collaborations defined'
        })

    return unreachable

def analyze_format_issues(inventory: dict) -> List[dict]:
    """Detect format inconsistencies."""
    issues = []

    # Project agents should have consistent format
    project_agents = [a for a in inventory['agents'] if a.get('scope') == 'project']

    for agent in project_agents:
        if agent.get('format') == 'yaml':
            issues.append({
                'name': agent.get('name'),
                'file_path': agent['file_path'],
                'issue': 'format_inconsistency',
                'reason': 'Project agent uses YAML frontmatter instead of plain markdown (unlike others)'
            })

    return issues

def main():
    print("Starting PHASE 2: Orphan Detection\n")

    inventory = load_inventory()
    settings = load_settings()

    # Run all detection checks
    print("Running detection checks...")

    shadowed = detect_shadowed(inventory)
    print(f"✓ Shadowed agents: {len(shadowed)}")

    disabled = detect_disabled(inventory, settings)
    print(f"✓ Disabled agents: {len(disabled)}")

    dangling = detect_dangling_references(inventory)
    print(f"✓ Dangling references: {len(dangling)}")

    model_issues = detect_model_issues(inventory)
    print(f"✓ Model issues: {len(model_issues)}")

    unreachable = detect_unreachable(inventory)
    print(f"✓ Unreachable agents: {len(unreachable)}")

    format_issues = analyze_format_issues(inventory)
    print(f"✓ Format issues: {len(format_issues)}")

    # Build orphan report
    orphan_report = {
        'generated_at': '2026-01-25',
        'summary': {
            'total_agents': len(inventory['agents']),
            'shadowed': len(shadowed),
            'disabled': len(disabled),
            'dangling_references': len(dangling),
            'model_issues': len(model_issues),
            'unreachable': len(unreachable),
            'format_issues': len(format_issues),
            'total_issues': len(shadowed) + len(disabled) + len(dangling) + len(model_issues) + len(unreachable) + len(format_issues)
        },
        'findings': {
            'shadowed': shadowed,
            'disabled': disabled,
            'dangling_references': dangling,
            'model_issues': model_issues,
            'unreachable': unreachable,
            'format_issues': format_issues
        }
    }

    # Write report
    output_path = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/orphan-detection-results.json')
    with open(output_path, 'w') as f:
        json.dump(orphan_report, f, indent=2)

    print(f"\n✅ Orphan detection complete!")
    print(f"📊 Total issues found: {orphan_report['summary']['total_issues']}")
    print(f"\nResults written to: {output_path}")

    # Print summary
    print("\n=== ORPHAN DETECTION SUMMARY ===")
    for category, count in orphan_report['summary'].items():
        if category not in ['total_agents', 'total_issues']:
            print(f"{category:20s}: {count}")
    print(f"{'='*40}")
    print(f"{'TOTAL ISSUES':20s}: {orphan_report['summary']['total_issues']}")

if __name__ == '__main__':
    main()
