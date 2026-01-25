#!/usr/bin/env python3
"""
Complete Coordination Map Builder
Scans ALL component types: Agents, Skills (SKILL.md), Commands, and MCP Tools
"""

import json
import re
import yaml
from pathlib import Path
from collections import defaultdict

# Import the base builder
import sys
sys.path.insert(0, str(Path(__file__).parent))
from build_coordination_map import CoordinationMapBuilder

class CompleteMapBuilder(CoordinationMapBuilder):
    """Extended builder that includes skills and MCP tools."""
    
    def scan_skill_md_files(self):
        """Scan for modern SKILL.md files in command subdirectories."""
        user_claude = Path.home() / '.claude'
        project_claude = Path('/Users/louisherman/ClaudeCodeProjects/.claude')
        
        # Scan user-level SKILL.md files
        print("Scanning user-level SKILL.md files...")
        for skill_file in (user_claude / 'commands').rglob('SKILL.md'):
            skill = self.parse_skill(skill_file, 'user')
            if skill:
                self.skills.append(skill)
                self.stats['skills'] += 1
        
        # Scan project-level SKILL.md files
        print("Scanning project-level SKILL.md files...")
        for skill_file in (project_claude / 'commands').rglob('SKILL.md'):
            skill = self.parse_skill(skill_file, 'project')
            if skill:
                self.skills.append(skill)
                self.stats['skills'] += 1
    
    def scan_skills_directory(self):
        """Scan .claude/skills/ subdirectories for skill files."""
        project_claude = Path('/Users/louisherman/ClaudeCodeProjects/.claude')
        skills_dir = project_claude / 'skills'
        
        if not skills_dir.exists():
            return
        
        print("Scanning .claude/skills/ subdirectories...")
        
        # Look for .yaml and .md files in skills subdirectories
        for skill_file in skills_dir.rglob('*.yaml'):
            # Parse YAML skill format
            try:
                content = skill_file.read_text(encoding='utf-8')
                skill_data = yaml.safe_load(content)
                
                skill = {
                    'name': skill_file.stem,
                    'scope': 'project',
                    'path': str(skill_file),
                    'type': 'skill-yaml',
                    'frontmatter': skill_data or {},
                    'description': skill_data.get('description', '') if skill_data else '',
                    'user_invocable': skill_data.get('user-invocable', True) if skill_data else True,
                    'context': skill_data.get('context', 'inline') if skill_data else 'inline',
                    'agent': skill_data.get('agent') if skill_data else None,
                    'model': skill_data.get('model', 'inherit') if skill_data else 'inherit',
                    'side_effect_risk': 'low',
                    'lane': 'unknown',  # Will classify later
                }
                
                self.skills.append(skill)
                self.stats['skills'] += 1
                
            except Exception as e:
                self.errors.append(f"Error parsing YAML skill {skill_file}: {e}")
        
        for skill_file in skills_dir.rglob('*.md'):
            # Skip README and other docs
            if skill_file.name in ['README.md', 'INDEX.md', 'TEMPLATE.md']:
                continue
            
            skill = self.parse_skill(skill_file, 'project')
            if skill:
                self.skills.append(skill)
                self.stats['skills'] += 1
    
    def inventory_mcp_tools(self):
        """Inventory MCP deferred tools using introspection."""
        print("Inventorying MCP deferred tools...")
        
        # List of known MCP tool prefixes from system
        mcp_prefixes = [
            'mcp__filesystem__',
            'mcp__puppeteer__',
            'mcp__memory__',
            'mcp__github__',
            'mcp__playwright__',
            'mcp__Desktop_Commander__',
            'mcp__Read_and_Send_iMessages__',
            'mcp__Read_and_Write_Apple_Notes__',
            'mcp__Control_your_Mac__',
            'mcp__PDF_Tools',
            'mcp__mcp-registry__',
            'mcp__dff5efe3-ef40-431b-9f9b-e5ed28078e1d__',
            'mcp__88d953ee-b0ad-4cf1-967e-de1a43cdf129__',
            'mcp__Claude_in_Chrome__',
        ]
        
        # Common tool names per server (from documentation)
        known_tools = {
            'filesystem': ['read_file', 'write_file', 'list_directory', 'search_files', 'get_file_info', 'create_directory', 'move_file'],
            'github': ['create_pull_request', 'create_issue', 'search_code', 'get_file_contents', 'list_commits'],
            'playwright': ['browser_navigate', 'browser_click', 'browser_screenshot', 'browser_fill_form'],
            'memory': ['create_entities', 'create_relations', 'search_nodes', 'read_graph'],
            'puppeteer': ['puppeteer_navigate', 'puppeteer_screenshot', 'puppeteer_click', 'puppeteer_fill'],
        }
        
        # Create MCP tool entries
        for server, tools in known_tools.items():
            for tool in tools:
                mcp_tool = {
                    'name': f'mcp__{server}__{tool}',
                    'server': server,
                    'tool_name': tool,
                    'type': 'mcp-tool',
                    'scope': 'system',
                }
                self.mcp_tools.append(mcp_tool)
                self.stats['mcp_tools'] += 1
    
    def scan_all_components(self):
        """Scan ALL component types."""
        # Call parent method for agents and commands
        super().scan_all_components()
        
        # Add skills scanning
        self.scan_skill_md_files()
        self.scan_skills_directory()
        
        # Add MCP tools
        self.inventory_mcp_tools()


def main():
    print("=" * 60)
    print("Phase 1 (Complete): Building Full Coordination Map")
    print("=" * 60)

    builder = CompleteMapBuilder()

    # Scan all components (agents, commands, skills, MCP)
    builder.scan_all_components()

    # Build map
    print("\nBuilding complete coordination map...")
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
    print(f"  - MCP Tools: {coordination_map['metadata']['mcp_tools']}")
    print(f"\nDuplicates: {len(coordination_map['analysis']['duplicates'])}")
    print(f"Shadowing: {len(coordination_map['analysis']['shadowing'])}")
    print(f"Broken delegations: {len(coordination_map['analysis']['broken_delegations'])}")
    print(f"Parsing errors: {len(coordination_map['errors'])}")
    print("\n✅ Phase 1 (Complete) done!")


if __name__ == '__main__':
    main()
