#!/usr/bin/env python3
"""
Build Coordination Map - Phase 1
Parses all Skills, Agents, Commands, and MCP tools to create a comprehensive coordination map.
"""

import json
import re
import yaml
from pathlib import Path
from typing import Dict, List, Any, Optional
from collections import defaultdict

class CoordinationMapBuilder:
    def __init__(self):
        self.agents = []
        self.skills = []
        self.commands = []
        self.mcp_tools = []
        self.stats = defaultdict(int)
        self.errors = []

    def extract_frontmatter(self, content: str) -> tuple[Optional[Dict], str]:
        """Extract YAML frontmatter from markdown content."""
        # Match frontmatter between --- markers
        match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', content, re.DOTALL)
        if not match:
            return None, content

        try:
            frontmatter = yaml.safe_load(match.group(1))
            body = match.group(2)
            # Convert non-serializable types to strings
            if frontmatter:
                frontmatter = self.make_json_serializable(frontmatter)
            return frontmatter, body
        except yaml.YAMLError as e:
            self.errors.append(f"YAML parse error: {e}")
            return None, content

    def make_json_serializable(self, obj):
        """Convert objects to JSON-serializable format."""
        from datetime import date, datetime

        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {k: self.make_json_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self.make_json_serializable(item) for item in obj]
        else:
            return obj

    def extract_description(self, body: str, max_chars: int = 200) -> str:
        """Extract first non-empty paragraph as description."""
        lines = body.strip().split('\n')
        description_lines = []

        for line in lines:
            line = line.strip()
            # Skip headers, empty lines
            if not line or line.startswith('#'):
                continue
            description_lines.append(line)
            if len(' '.join(description_lines)) > max_chars:
                break

        description = ' '.join(description_lines)[:max_chars]
        if len(description) == max_chars:
            description += '...'
        return description

    def parse_agent(self, file_path: Path, scope: str) -> Dict[str, Any]:
        """Parse an agent markdown file."""
        try:
            content = file_path.read_text(encoding='utf-8')
            frontmatter, body = self.extract_frontmatter(content)

            agent = {
                'name': file_path.stem,
                'scope': scope,
                'path': str(file_path),
                'type': 'agent',
                'frontmatter': frontmatter or {},
            }

            # Extract key frontmatter fields
            if frontmatter:
                agent['model'] = frontmatter.get('model', 'unknown')
                agent['tools'] = frontmatter.get('tools', [])
                agent['disallowedTools'] = frontmatter.get('disallowedTools', [])
                agent['skills'] = frontmatter.get('skills', [])
                agent['permissionMode'] = frontmatter.get('permissionMode', 'default')
                agent['description_fm'] = frontmatter.get('description', '')
            else:
                agent['model'] = 'unknown'
                agent['tools'] = []
                agent['disallowedTools'] = []
                agent['skills'] = []
                agent['permissionMode'] = 'default'
                agent['description_fm'] = ''

            # Extract description from body
            agent['description'] = self.extract_description(body)

            # Determine lane based on name patterns
            agent['lane'] = self.infer_lane(agent['name'], agent.get('description', ''))

            return agent

        except Exception as e:
            self.errors.append(f"Error parsing agent {file_path}: {e}")
            return None

    def parse_skill(self, file_path: Path, scope: str) -> Dict[str, Any]:
        """Parse a skill markdown file."""
        try:
            content = file_path.read_text(encoding='utf-8')
            frontmatter, body = self.extract_frontmatter(content)

            skill = {
                'name': file_path.stem,
                'scope': scope,
                'path': str(file_path),
                'type': 'skill',
                'frontmatter': frontmatter or {},
            }

            # Extract key frontmatter fields
            if frontmatter:
                skill['user_invocable'] = frontmatter.get('user-invocable', True)
                skill['disable_model_invocation'] = frontmatter.get('disable-model-invocation', False)
                skill['context'] = frontmatter.get('context', 'inline')
                skill['agent'] = frontmatter.get('agent', None)
                skill['model'] = frontmatter.get('model', 'inherit')
                skill['allowed_tools'] = frontmatter.get('allowed-tools', [])
                skill['manual_only'] = frontmatter.get('manual-only', False)
                skill['confirmation_required'] = frontmatter.get('confirmation-required', False)
            else:
                skill['user_invocable'] = True
                skill['disable_model_invocation'] = False
                skill['context'] = 'inline'
                skill['agent'] = None
                skill['model'] = 'inherit'
                skill['allowed_tools'] = []
                skill['manual_only'] = False
                skill['confirmation_required'] = False

            # Extract description
            skill['description'] = self.extract_description(body)

            # Determine lane
            skill['lane'] = self.infer_lane(skill['name'], skill.get('description', ''))

            # Side-effect risk
            skill['side_effect_risk'] = self.assess_side_effect_risk(skill)

            return skill

        except Exception as e:
            self.errors.append(f"Error parsing skill {file_path}: {e}")
            return None

    def parse_command(self, file_path: Path, scope: str) -> Dict[str, Any]:
        """Parse a legacy command markdown file."""
        try:
            content = file_path.read_text(encoding='utf-8')
            frontmatter, body = self.extract_frontmatter(content)

            command = {
                'name': file_path.stem,
                'scope': scope,
                'path': str(file_path),
                'type': 'command',
                'frontmatter': frontmatter or {},
                'description': self.extract_description(body),
                'migration_status': 'legacy',  # Needs skill migration
            }

            return command

        except Exception as e:
            self.errors.append(f"Error parsing command {file_path}: {e}")
            return None

    def infer_lane(self, name: str, description: str) -> str:
        """Infer capability lane from name/description."""
        name_lower = name.lower()
        desc_lower = description.lower()
        combined = f"{name_lower} {desc_lower}"

        # Lane 1: Explore & Index
        if any(kw in combined for kw in ['analyzer', 'indexer', 'scanner', 'mapper', 'explore', 'finder', 'search']):
            return 'explore-index'

        # Lane 2: Design & Plan
        if any(kw in combined for kw in ['architect', 'orchestrator', 'planner', 'design', 'plan', 'strategy']):
            return 'design-plan'

        # Lane 3: Implement
        if any(kw in combined for kw in ['engineer', 'developer', 'generator', 'refactor', 'implement', 'builder']):
            return 'implement'

        # Lane 4: Review & Security
        if any(kw in combined for kw in ['reviewer', 'auditor', 'security', 'compliance', 'review', 'audit']):
            return 'review-security'

        # Lane 5: QA & Verify
        if any(kw in combined for kw in ['qa', 'test', 'validator', 'verify', 'coverage', 'e2e']):
            return 'qa-verify'

        # Lane 6: Release & Ops
        if any(kw in combined for kw in ['deploy', 'release', 'commit', 'publish', 'ops']):
            return 'release-ops'

        return 'unknown'

    def assess_side_effect_risk(self, skill: Dict) -> str:
        """Assess side-effect risk level."""
        if skill.get('manual_only') or skill.get('confirmation_required'):
            return 'high'

        name_lower = skill['name'].lower()
        if any(kw in name_lower for kw in ['commit', 'deploy', 'release', 'delete', 'drop', 'migrate']):
            return 'high'

        if skill.get('context') == 'fork':
            return 'medium'

        return 'low'

    def scan_directory(self, base_path: Path, scope: str, file_type: str):
        """Recursively scan directory for markdown files."""
        if not base_path.exists():
            return

        for md_file in base_path.rglob('*.md'):
            # Skip documentation and templates
            if any(skip in str(md_file) for skip in ['README', 'TEMPLATE', 'INDEX', 'docs/', 'audit/']):
                continue

            if file_type == 'agent':
                agent = self.parse_agent(md_file, scope)
                if agent:
                    self.agents.append(agent)
                    self.stats['agents'] += 1

            elif file_type == 'skill':
                skill = self.parse_skill(md_file, scope)
                if skill:
                    self.skills.append(skill)
                    self.stats['skills'] += 1

            elif file_type == 'command':
                command = self.parse_command(md_file, scope)
                if command:
                    self.commands.append(command)
                    self.stats['commands'] += 1

    def scan_all_components(self):
        """Scan all user and project level components."""
        user_claude = Path.home() / '.claude'
        project_claude = Path('/Users/louisherman/ClaudeCodeProjects/.claude')

        # User-level agents
        print("Scanning user-level agents...")
        self.scan_directory(user_claude / 'agents', 'user', 'agent')

        # User-level skills
        print("Scanning user-level skills...")
        self.scan_directory(user_claude / 'skills', 'user', 'skill')

        # User-level commands (legacy)
        print("Scanning user-level commands...")
        self.scan_directory(user_claude / 'commands', 'user', 'command')

        # Project-level agents
        print("Scanning project-level agents...")
        self.scan_directory(project_claude / 'agents', 'project', 'agent')

        # Project-level skills
        print("Scanning project-level skills...")
        self.scan_directory(project_claude / 'skills', 'project', 'skill')

        # Project-level commands
        print("Scanning project-level commands...")
        self.scan_directory(project_claude / 'commands', 'project', 'command')

    def analyze_model_usage(self) -> Dict[str, int]:
        """Analyze model tier usage across agents."""
        model_counts = defaultdict(int)
        for agent in self.agents:
            model = agent.get('model', 'unknown')
            model_counts[model] += 1
        return dict(model_counts)

    def detect_duplicates(self) -> Dict[str, List[str]]:
        """Detect duplicate names across scopes."""
        name_to_paths = defaultdict(list)

        for component in self.agents + self.skills + self.commands:
            name = component['name']
            path = component['path']
            name_to_paths[name].append(path)

        # Return only duplicates
        return {name: paths for name, paths in name_to_paths.items() if len(paths) > 1}

    def detect_shadowing(self) -> List[Dict]:
        """Detect project-level components shadowing user-level."""
        shadowing = []

        user_names = {c['name'] for c in self.agents + self.skills + self.commands if c['scope'] == 'user'}
        project_components = [c for c in self.agents + self.skills + self.commands if c['scope'] == 'project']

        for component in project_components:
            if component['name'] in user_names:
                shadowing.append({
                    'name': component['name'],
                    'type': component['type'],
                    'project_path': component['path'],
                })

        return shadowing

    def find_broken_delegations(self) -> List[Dict]:
        """Find skills/agents that reference non-existent agents."""
        broken = []
        agent_names = {a['name'] for a in self.agents}

        # Check skills with context: fork
        for skill in self.skills:
            if skill.get('agent'):
                agent_ref = skill['agent']
                if agent_ref not in agent_names:
                    broken.append({
                        'skill': skill['name'],
                        'references': agent_ref,
                        'path': skill['path'],
                        'issue': 'Agent not found'
                    })

        # Check agents that preload skills
        skill_names = {s['name'] for s in self.skills}
        for agent in self.agents:
            for skill_ref in agent.get('skills', []):
                if skill_ref not in skill_names:
                    broken.append({
                        'agent': agent['name'],
                        'references': skill_ref,
                        'path': agent['path'],
                        'issue': 'Skill not found'
                    })

        return broken

    def build_map(self) -> Dict[str, Any]:
        """Build the complete coordination map."""
        return {
            'metadata': {
                'generated': '2026-01-25',
                'total_components': len(self.agents) + len(self.skills) + len(self.commands),
                'agents': len(self.agents),
                'skills': len(self.skills),
                'commands': len(self.commands),
                'mcp_tools': len(self.mcp_tools),
            },
            'agents': self.agents,
            'skills': self.skills,
            'commands': self.commands,
            'mcp_tools': self.mcp_tools,
            'analysis': {
                'model_usage': self.analyze_model_usage(),
                'duplicates': self.detect_duplicates(),
                'shadowing': self.detect_shadowing(),
                'broken_delegations': self.find_broken_delegations(),
            },
            'errors': self.errors,
        }

    def generate_markdown_report(self, coordination_map: Dict) -> str:
        """Generate human-readable markdown report."""
        md = ["# Coordination Map - Phase 1 Inventory\n"]
        md.append(f"**Generated**: {coordination_map['metadata']['generated']}\n")
        md.append("---\n\n")

        # Summary
        md.append("## Summary\n\n")
        meta = coordination_map['metadata']
        md.append(f"- **Total Components**: {meta['total_components']}\n")
        md.append(f"- **Agents**: {meta['agents']}\n")
        md.append(f"- **Skills**: {meta['skills']}\n")
        md.append(f"- **Legacy Commands**: {meta['commands']}\n")
        md.append(f"- **MCP Tools**: {meta['mcp_tools']}\n\n")

        # Model usage
        md.append("## Model Usage Analysis\n\n")
        model_usage = coordination_map['analysis']['model_usage']
        for model, count in sorted(model_usage.items(), key=lambda x: -x[1]):
            md.append(f"- `{model}`: {count} agents\n")
        md.append("\n")

        # Duplicates
        md.append("## Duplicate Names\n\n")
        duplicates = coordination_map['analysis']['duplicates']
        if duplicates:
            for name, paths in sorted(duplicates.items()):
                md.append(f"### `{name}` ({len(paths)} instances)\n")
                for path in paths:
                    md.append(f"- {path}\n")
                md.append("\n")
        else:
            md.append("✅ No duplicates found.\n\n")

        # Shadowing
        md.append("## Shadowing (Project → User)\n\n")
        shadowing = coordination_map['analysis']['shadowing']
        if shadowing:
            for item in shadowing:
                md.append(f"- `{item['name']}` ({item['type']}): {item['project_path']}\n")
            md.append("\n")
        else:
            md.append("✅ No shadowing detected.\n\n")

        # Broken delegations
        md.append("## Broken Delegations\n\n")
        broken = coordination_map['analysis']['broken_delegations']
        if broken:
            for item in broken:
                if 'skill' in item:
                    md.append(f"- Skill `{item['skill']}` references agent `{item['references']}` (not found)\n")
                elif 'agent' in item:
                    md.append(f"- Agent `{item['agent']}` preloads skill `{item['references']}` (not found)\n")
            md.append("\n")
        else:
            md.append("✅ No broken delegations found.\n\n")

        # Lane distribution
        md.append("## Lane Distribution\n\n")
        lane_counts = defaultdict(int)
        for component in coordination_map['agents'] + coordination_map['skills']:
            lane_counts[component.get('lane', 'unknown')] += 1

        for lane, count in sorted(lane_counts.items(), key=lambda x: -x[1]):
            md.append(f"- **{lane}**: {count} components\n")
        md.append("\n")

        # Errors
        if coordination_map['errors']:
            md.append("## Parsing Errors\n\n")
            for error in coordination_map['errors'][:20]:  # Limit to first 20
                md.append(f"- {error}\n")
            if len(coordination_map['errors']) > 20:
                md.append(f"\n... and {len(coordination_map['errors']) - 20} more errors\n")
            md.append("\n")

        return ''.join(md)


def main():
    print("=" * 60)
    print("Phase 1: Building Coordination Map")
    print("=" * 60)

    builder = CoordinationMapBuilder()

    # Scan all components
    builder.scan_all_components()

    # Build map
    print("\nBuilding coordination map...")
    coordination_map = builder.build_map()

    # Save JSON
    json_path = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/coordination-map.json')
    with open(json_path, 'w') as f:
        json.dump(coordination_map, f, indent=2)
    print(f"✅ Saved: {json_path}")

    # Generate markdown report
    print("\nGenerating markdown report...")
    md_report = builder.generate_markdown_report(coordination_map)
    md_path = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/coordination-map.md')
    with open(md_path, 'w') as f:
        f.write(md_report)
    print(f"✅ Saved: {md_path}")

    # Print summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Total components: {coordination_map['metadata']['total_components']}")
    print(f"  - Agents: {coordination_map['metadata']['agents']}")
    print(f"  - Skills: {coordination_map['metadata']['skills']}")
    print(f"  - Commands: {coordination_map['metadata']['commands']}")
    print(f"\nDuplicates: {len(coordination_map['analysis']['duplicates'])}")
    print(f"Shadowing: {len(coordination_map['analysis']['shadowing'])}")
    print(f"Broken delegations: {len(coordination_map['analysis']['broken_delegations'])}")
    print(f"Parsing errors: {len(coordination_map['errors'])}")
    print("\n✅ Phase 1 complete!")


if __name__ == '__main__':
    main()
