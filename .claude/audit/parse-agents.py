#!/usr/bin/env python3
"""
Parse all Claude Code agent files and build inventory.
Handles multiple agent definition formats.
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Any
import yaml

def parse_yaml_frontmatter(content: str) -> Optional[Dict[str, Any]]:
    """Extract YAML frontmatter from markdown file."""
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not match:
        return None

    try:
        data = yaml.safe_load(match.group(1))
        # Convert non-JSON-serializable types to strings
        if data:
            for key, value in data.items():
                if hasattr(value, 'isoformat'):  # datetime/date objects
                    data[key] = value.isoformat()
        return data
    except yaml.YAMLError:
        return None

def parse_markdown_metadata(content: str) -> Optional[Dict[str, Any]]:
    """Parse bold key-value pairs from plain markdown (project format)."""
    metadata = {}

    # Extract **ID**: `value`
    id_match = re.search(r'\*\*ID\*\*:\s*`([^`]+)`', content)
    if id_match:
        metadata['name'] = id_match.group(1)

    # Extract **Model**: value
    model_match = re.search(r'\*\*Model\*\*:\s*(.+)', content)
    if model_match:
        metadata['model'] = model_match.group(1).strip()

    # Extract **Role**: value (use as description)
    role_match = re.search(r'\*\*Role\*\*:\s*(.+)', content)
    if role_match:
        metadata['description'] = role_match.group(1).strip()

    # Extract title (first # heading)
    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    if title_match and 'name' not in metadata:
        # Use title as fallback name, convert to kebab-case
        title = title_match.group(1).strip()
        # Remove "Agent" suffix if present
        title = re.sub(r'\s+Agent$', '', title, flags=re.IGNORECASE)
        metadata['name'] = title.lower().replace(' ', '-')

    return metadata if metadata else None

def parse_agent_file(file_path: Path) -> Optional[Dict[str, Any]]:
    """Parse a single agent file and extract metadata."""
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception as e:
        return {
            'file_path': str(file_path),
            'error': f'Failed to read: {e}',
            'status': 'error'
        }

    # Try YAML frontmatter first
    metadata = parse_yaml_frontmatter(content)
    if metadata:
        metadata['format'] = 'yaml'
    else:
        # Try markdown metadata
        metadata = parse_markdown_metadata(content)
        if metadata:
            metadata['format'] = 'markdown'
        else:
            # Failed to parse
            return {
                'file_path': str(file_path),
                'error': 'No valid metadata found',
                'status': 'unparseable'
            }

    # Add file metadata
    metadata['file_path'] = str(file_path)
    metadata['file_size'] = file_path.stat().st_size

    # Determine scope
    if '/.claude/agents/' in str(file_path):
        parts = str(file_path).split('/.claude/agents/')
        if parts[0] == str(Path.home()):
            metadata['scope'] = 'user'
        else:
            metadata['scope'] = 'project'
            metadata['project_path'] = parts[0]

    # Extract subdirectory if in user scope
    if metadata.get('scope') == 'user':
        rel_path = file_path.relative_to(Path.home() / '.claude/agents')
        if rel_path.parent != Path('.'):
            metadata['subdirectory'] = str(rel_path.parent)

    return metadata

def main():
    # Find all agent files
    user_agents_dir = Path.home() / '.claude/agents'
    project_dirs = [
        Path('/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/.claude/agents')
    ]

    agents = []
    errors = []

    # Parse user agents
    if user_agents_dir.exists():
        for agent_file in user_agents_dir.rglob('*.md'):
            result = parse_agent_file(agent_file)
            if result:
                if 'error' in result:
                    errors.append(result)
                else:
                    agents.append(result)

    # Parse project agents
    for project_dir in project_dirs:
        if project_dir.exists():
            for agent_file in project_dir.glob('*.md'):
                result = parse_agent_file(agent_file)
                if result:
                    if 'error' in result:
                        errors.append(result)
                    else:
                        agents.append(result)

    # Build inventory
    inventory = {
        'generated_at': '2026-01-25',
        'total_files': len(agents) + len(errors),
        'parsed_successfully': len(agents),
        'parse_errors': len(errors),
        'agents': agents,
        'errors': errors,
        'summary': {
            'by_scope': {},
            'by_model': {},
            'by_format': {},
            'by_subdirectory': {}
        }
    }

    # Calculate summaries
    for agent in agents:
        scope = agent.get('scope', 'unknown')
        inventory['summary']['by_scope'][scope] = inventory['summary']['by_scope'].get(scope, 0) + 1

        model = agent.get('model', 'unknown')
        inventory['summary']['by_model'][model] = inventory['summary']['by_model'].get(model, 0) + 1

        fmt = agent.get('format', 'unknown')
        inventory['summary']['by_format'][fmt] = inventory['summary']['by_format'].get(fmt, 0) + 1

        if 'subdirectory' in agent:
            subdir = agent['subdirectory']
            inventory['summary']['by_subdirectory'][subdir] = inventory['summary']['by_subdirectory'].get(subdir, 0) + 1

    # Check for name collisions
    name_map = {}
    for agent in agents:
        name = agent.get('name')
        if name:
            if name not in name_map:
                name_map[name] = []
            name_map[name].append({
                'scope': agent.get('scope'),
                'file_path': agent.get('file_path')
            })

    collisions = {name: instances for name, instances in name_map.items() if len(instances) > 1}
    inventory['name_collisions'] = collisions
    inventory['collision_count'] = len(collisions)

    # Write inventory
    output_path = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/orphaned-agents-inventory.json')
    with open(output_path, 'w') as f:
        json.dump(inventory, f, indent=2)

    print(f"✅ Parsed {len(agents)} agents successfully")
    print(f"❌ {len(errors)} parse errors")
    print(f"⚠️  {len(collisions)} name collisions detected")
    print(f"\nInventory written to: {output_path}")

    # Print summary
    print("\n=== SUMMARY ===")
    print(f"\nBy Scope:")
    for scope, count in sorted(inventory['summary']['by_scope'].items()):
        print(f"  {scope}: {count}")

    print(f"\nBy Model:")
    for model, count in sorted(inventory['summary']['by_model'].items()):
        print(f"  {model}: {count}")

    print(f"\nBy Format:")
    for fmt, count in sorted(inventory['summary']['by_format'].items()):
        print(f"  {fmt}: {count}")

    if collisions:
        print(f"\n⚠️  NAME COLLISIONS ({len(collisions)}):")
        for name, instances in list(collisions.items())[:10]:
            print(f"\n  '{name}':")
            for inst in instances:
                print(f"    - {inst['scope']}: {inst['file_path']}")
        if len(collisions) > 10:
            print(f"\n  ... and {len(collisions) - 10} more")

if __name__ == '__main__':
    main()
