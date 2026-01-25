#!/usr/bin/env python3
"""
Claude Code Toolkit Parser
Parses all agents and skills to build coordination map
"""

import json
import os
import re
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Any, Optional

class ToolkitParser:
    def __init__(self, root_path: str):
        self.root = Path(root_path)
        self.agents = []
        self.skills = []
        self.duplicates = defaultdict(list)
        self.stats = defaultdict(int)

    def parse_frontmatter(self, content: str) -> Dict[str, Any]:
        """Extract YAML frontmatter from markdown file"""
        frontmatter = {}
        if content.startswith('---'):
            parts = content.split('---', 2)
            if len(parts) >= 3:
                fm_text = parts[1]
                # Simple YAML parsing (good enough for our needs)
                for line in fm_text.split('\n'):
                    line = line.strip()
                    if ':' in line and not line.startswith('#'):
                        key, value = line.split(':', 1)
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        # Handle lists
                        if value.startswith('[') and value.endswith(']'):
                            value = [v.strip().strip('"').strip("'") for v in value[1:-1].split(',')]
                        frontmatter[key] = value
        return frontmatter

    def extract_description(self, content: str) -> str:
        """Extract first meaningful paragraph as description"""
        # Remove frontmatter
        if content.startswith('---'):
            parts = content.split('---', 2)
            if len(parts) >= 3:
                content = parts[2]

        # Get first heading or paragraph
        lines = content.strip().split('\n')
        description = ""
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#'):
                description = line
                break
            elif line.startswith('# '):
                description = line[2:].strip()
                break

        return description[:200] if description else "No description"

    def parse_agent(self, filepath: Path) -> Dict[str, Any]:
        """Parse agent definition file"""
        try:
            content = filepath.read_text(encoding='utf-8')
            frontmatter = self.parse_frontmatter(content)

            # Determine scope based on path
            path_str = str(filepath)
            if '/.claude/agents/' in path_str:
                # Extract scope from path
                rel_path = filepath.relative_to(self.root)
                parts = list(rel_path.parts)
                if parts[0] == '.claude':
                    scope = 'user'
                else:
                    scope = 'project'
            else:
                scope = 'unknown'

            agent = {
                'name': filepath.stem,
                'filename': filepath.name,
                'filepath': str(filepath),
                'relative_path': str(filepath.relative_to(self.root)),
                'scope': scope,
                'category': filepath.parent.name if filepath.parent.name != 'agents' else 'general',
                'model': frontmatter.get('model', 'default'),
                'tools': frontmatter.get('tools', []),
                'skills': frontmatter.get('skills', []),
                'description': self.extract_description(content),
                'size_bytes': len(content),
                'has_frontmatter': bool(frontmatter)
            }

            return agent
        except Exception as e:
            print(f"Error parsing agent {filepath}: {e}")
            return None

    def parse_skill(self, filepath: Path) -> Dict[str, Any]:
        """Parse skill definition file"""
        try:
            content = filepath.read_text(encoding='utf-8')
            frontmatter = self.parse_frontmatter(content)

            # Determine scope
            path_str = str(filepath)
            rel_path = filepath.relative_to(self.root)
            parts = list(rel_path.parts)
            if parts[0] == '.claude':
                scope = 'user'
            else:
                scope = 'project'

            # Extract category from path
            category_parts = []
            for part in parts:
                if part == '.claude' or part == 'skills':
                    continue
                if part.endswith('.md'):
                    break
                category_parts.append(part)

            skill = {
                'name': filepath.stem,
                'filename': filepath.name,
                'filepath': str(filepath),
                'relative_path': str(filepath.relative_to(self.root)),
                'scope': scope,
                'category': '/'.join(category_parts) if category_parts else 'general',
                'model': frontmatter.get('model', 'inherit'),
                'context': frontmatter.get('context', 'inline'),
                'agent': frontmatter.get('agent', None),
                'tools': frontmatter.get('tools', []),
                'description': self.extract_description(content),
                'size_bytes': len(content),
                'has_frontmatter': bool(frontmatter),
                'invocation': f"/{filepath.stem}"
            }

            return skill
        except Exception as e:
            print(f"Error parsing skill {filepath}: {e}")
            return None

    def find_duplicates(self):
        """Find duplicate names across scopes"""
        # Check agents
        agent_names = defaultdict(list)
        for agent in self.agents:
            agent_names[agent['name']].append(agent)

        for name, instances in agent_names.items():
            if len(instances) > 1:
                self.duplicates['agents'].append({
                    'name': name,
                    'count': len(instances),
                    'instances': instances
                })

        # Check skills
        skill_names = defaultdict(list)
        for skill in self.skills:
            skill_names[skill['name']].append(skill)

        for name, instances in skill_names.items():
            if len(instances) > 1:
                self.duplicates['skills'].append({
                    'name': name,
                    'count': len(instances),
                    'instances': instances
                })

    def calculate_stats(self):
        """Calculate statistics"""
        self.stats['total_agents'] = len(self.agents)
        self.stats['total_skills'] = len(self.skills)

        # Agent stats
        agent_scopes = defaultdict(int)
        agent_models = defaultdict(int)
        agent_categories = defaultdict(int)

        for agent in self.agents:
            agent_scopes[agent['scope']] += 1
            agent_models[agent['model']] += 1
            agent_categories[agent['category']] += 1

        self.stats['agent_scopes'] = dict(agent_scopes)
        self.stats['agent_models'] = dict(agent_models)
        self.stats['agent_categories'] = dict(agent_categories)

        # Skill stats
        skill_scopes = defaultdict(int)
        skill_models = defaultdict(int)
        skill_categories = defaultdict(int)
        skill_contexts = defaultdict(int)

        for skill in self.skills:
            skill_scopes[skill['scope']] += 1
            skill_models[skill['model']] += 1
            skill_categories[skill['category']] += 1
            skill_contexts[skill['context']] += 1

        self.stats['skill_scopes'] = dict(skill_scopes)
        self.stats['skill_models'] = dict(skill_models)
        self.stats['skill_categories'] = dict(skill_categories)
        self.stats['skill_contexts'] = dict(skill_contexts)

        # Duplicate stats
        self.stats['duplicate_agent_names'] = len(self.duplicates.get('agents', []))
        self.stats['duplicate_skill_names'] = len(self.duplicates.get('skills', []))

    def parse_all(self):
        """Parse all agents and skills"""
        print("Parsing agents...")
        agent_files = list(self.root.rglob('**/.claude/agents/**/*.md'))
        for filepath in agent_files:
            agent = self.parse_agent(filepath)
            if agent:
                self.agents.append(agent)

        print(f"Found {len(self.agents)} agents")

        print("Parsing skills...")
        skill_files = list(self.root.rglob('**/.claude/skills/**/*.md'))
        for filepath in skill_files:
            skill = self.parse_skill(filepath)
            if skill:
                self.skills.append(skill)

        print(f"Found {len(self.skills)} skills")

        print("Finding duplicates...")
        self.find_duplicates()

        print("Calculating statistics...")
        self.calculate_stats()

    def generate_json(self) -> Dict[str, Any]:
        """Generate JSON coordination map"""
        return {
            'metadata': {
                'generated_at': '2026-01-25',
                'root_path': str(self.root),
                'parser_version': '1.0'
            },
            'statistics': dict(self.stats),
            'agents': self.agents,
            'skills': self.skills,
            'duplicates': dict(self.duplicates)
        }

    def generate_markdown(self) -> str:
        """Generate human-readable markdown report"""
        md = []
        md.append("# Claude Code Coordination Map\n")
        md.append(f"**Generated**: 2026-01-25\n")
        md.append(f"**Root**: `{self.root}`\n")
        md.append("\n---\n")

        # Statistics
        md.append("\n## Statistics\n")
        md.append(f"- **Total Agents**: {self.stats['total_agents']}")
        md.append(f"- **Total Skills**: {self.stats['total_skills']}")
        md.append(f"- **Duplicate Agent Names**: {self.stats['duplicate_agent_names']}")
        md.append(f"- **Duplicate Skill Names**: {self.stats['duplicate_skill_names']}")
        md.append("\n")

        # Agent breakdown
        md.append("### Agent Distribution\n")
        md.append("\n**By Scope**:")
        for scope, count in self.stats.get('agent_scopes', {}).items():
            md.append(f"- {scope}: {count}")

        md.append("\n**By Model**:")
        for model, count in self.stats.get('agent_models', {}).items():
            md.append(f"- {model}: {count}")

        md.append("\n**By Category** (top 10):")
        categories = sorted(self.stats.get('agent_categories', {}).items(), key=lambda x: x[1], reverse=True)[:10]
        for cat, count in categories:
            md.append(f"- {cat}: {count}")

        md.append("\n")

        # Skill breakdown
        md.append("### Skill Distribution\n")
        md.append("\n**By Scope**:")
        for scope, count in self.stats.get('skill_scopes', {}).items():
            md.append(f"- {scope}: {count}")

        md.append("\n**By Model**:")
        for model, count in self.stats.get('skill_models', {}).items():
            md.append(f"- {model}: {count}")

        md.append("\n**By Context**:")
        for context, count in self.stats.get('skill_contexts', {}).items():
            md.append(f"- {context}: {count}")

        md.append("\n**By Category** (top 10):")
        categories = sorted(self.stats.get('skill_categories', {}).items(), key=lambda x: x[1], reverse=True)[:10]
        for cat, count in categories:
            md.append(f"- {cat}: {count}")

        md.append("\n")

        # Duplicates
        if self.duplicates.get('agents') or self.duplicates.get('skills'):
            md.append("\n## Duplicates Detected\n")

            if self.duplicates.get('agents'):
                md.append(f"\n### Duplicate Agent Names ({len(self.duplicates['agents'])})\n")
                for dup in self.duplicates['agents'][:10]:
                    md.append(f"\n#### `{dup['name']}` ({dup['count']} instances)")
                    for inst in dup['instances']:
                        md.append(f"- {inst['scope']}: `{inst['relative_path']}`")

            if self.duplicates.get('skills'):
                md.append(f"\n### Duplicate Skill Names ({len(self.duplicates['skills'])})\n")
                for dup in self.duplicates['skills'][:20]:
                    md.append(f"\n#### `{dup['name']}` ({dup['count']} instances)")
                    for inst in dup['instances']:
                        md.append(f"- {inst['scope']}: `{inst['relative_path']}`")

        md.append("\n")

        # Agent listing (sample)
        md.append("\n## Agent Listing (Sample)\n")
        md.append("\n| Name | Scope | Category | Model | Description |")
        md.append("|------|-------|----------|-------|-------------|")
        for agent in sorted(self.agents, key=lambda x: (x['scope'], x['category'], x['name']))[:50]:
            name = agent['name'][:30]
            scope = agent['scope']
            cat = agent['category'][:20]
            model = agent['model']
            desc = agent['description'][:50]
            md.append(f"| {name} | {scope} | {cat} | {model} | {desc} |")

        md.append(f"\n*Showing 50 of {len(self.agents)} agents*\n")

        # Skill listing (sample)
        md.append("\n## Skill Listing (Sample)\n")
        md.append("\n| Name | Scope | Category | Model | Context | Description |")
        md.append("|------|-------|----------|-------|---------|-------------|")
        for skill in sorted(self.skills, key=lambda x: (x['scope'], x['category'], x['name']))[:50]:
            name = skill['name'][:30]
            scope = skill['scope']
            cat = skill['category'][:20]
            model = skill['model']
            context = skill['context']
            desc = skill['description'][:50]
            md.append(f"| {name} | {scope} | {cat} | {model} | {context} | {desc} |")

        md.append(f"\n*Showing 50 of {len(self.skills)} skills*\n")

        return '\n'.join(md)

def main():
    root = Path('/Users/louisherman/ClaudeCodeProjects')
    parser = ToolkitParser(root)
    parser.parse_all()

    # Generate outputs
    print("\nGenerating coordination map...")

    # JSON
    json_output = parser.generate_json()
    json_path = root / '.claude' / 'audit' / 'coordination-map.json'
    with open(json_path, 'w') as f:
        json.dump(json_output, f, indent=2)
    print(f"JSON map: {json_path}")

    # Markdown
    md_output = parser.generate_markdown()
    md_path = root / '.claude' / 'audit' / 'coordination-map.md'
    with open(md_path, 'w') as f:
        f.write(md_output)
    print(f"Markdown map: {md_path}")

    print("\n✓ Coordination map generation complete")

if __name__ == '__main__':
    main()
