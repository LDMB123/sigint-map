#!/usr/bin/env python3
"""
Phase 5: Implementation - Apply Improvements
Safely consolidate redundancies and apply model policy
"""

import json
import re
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple
from collections import defaultdict

class ToolkitOptimizer:
    def __init__(self, root_path: str, dry_run: bool = False):
        self.root = Path(root_path)
        self.dry_run = dry_run
        self.changes = []
        self.stats = defaultdict(int)

        # Load coordination map
        with open(self.root / '.claude/audit/coordination-map.json') as f:
            self.coord_map = json.load(f)

        # Load redundancy findings
        with open(self.root / '.claude/audit/redundancy-findings.json') as f:
            self.findings = json.load(f)

    def create_backup(self):
        """Create timestamped backup of .claude directories"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_dir = self.root / f'.claude_backup_{timestamp}'

        if not self.dry_run:
            print(f"Creating backup: {backup_dir}")

            # Backup user-level .claude
            user_claude = self.root / '.claude'
            if user_claude.exists():
                shutil.copytree(user_claude, backup_dir / 'user_.claude',
                              ignore=shutil.ignore_patterns('.claude_backup_*'))

            # Backup project-level .claude (excluding backups)
            for project_dir in self.root.iterdir():
                if project_dir.is_dir() and not project_dir.name.startswith('.'):
                    project_claude = project_dir / '.claude'
                    if project_claude.exists():
                        rel_path = project_claude.relative_to(self.root)
                        dest = backup_dir / rel_path
                        shutil.copytree(project_claude, dest,
                                      ignore=shutil.ignore_patterns('.claude_backup_*', 'audit'))

            print(f"✓ Backup created: {backup_dir}")
        else:
            print(f"[DRY RUN] Would create backup: {backup_dir}")

        return backup_dir

    def delete_user_agent_duplicates(self):
        """Delete all 185 user-level agents that duplicate project agents"""
        print("\n" + "="*80)
        print("STEP 1: Deleting User-Level Agent Duplicates")
        print("="*80)

        duplicates = []
        for dup in self.coord_map['duplicates'].get('agents', []):
            user_instances = [inst for inst in dup['instances'] if inst['scope'] == 'user']
            project_instances = [inst for inst in dup['instances'] if inst['scope'] == 'project']

            # If exists in both scopes, delete user-level
            if user_instances and project_instances:
                for user_inst in user_instances:
                    duplicates.append(user_inst)

        print(f"Found {len(duplicates)} user-level agent duplicates to delete")

        for inst in duplicates:
            filepath = self.root / inst['relative_path']

            if self.dry_run:
                print(f"[DRY RUN] Would delete: {inst['relative_path']}")
            else:
                if filepath.exists():
                    filepath.unlink()
                    print(f"Deleted: {inst['relative_path']}")
                    self.changes.append({
                        'action': 'delete',
                        'type': 'agent',
                        'path': inst['relative_path'],
                        'reason': 'user/project duplicate'
                    })
                    self.stats['agents_deleted'] += 1

        print(f"\n✓ Deleted {self.stats['agents_deleted']} user-level agent duplicates")

    def delete_user_skill_duplicates(self):
        """Delete user-level skills that duplicate project skills"""
        print("\n" + "="*80)
        print("STEP 2: Deleting User-Level Functional Skill Duplicates")
        print("="*80)

        # Skip documentation files
        skip_names = {'README', 'INDEX', 'MANIFEST', 'QUICK_START', 'CREATION_SUMMARY', 'QUICK_REFERENCE'}

        duplicates = []
        for dup in self.coord_map['duplicates'].get('skills', []):
            if dup['name'] in skip_names:
                continue  # Handle separately

            user_instances = [inst for inst in dup['instances'] if inst['scope'] == 'user']
            project_instances = [inst for inst in dup['instances'] if inst['scope'] == 'project']

            # If exists in both scopes, delete user-level
            if user_instances and project_instances:
                for user_inst in user_instances:
                    duplicates.append(user_inst)

        print(f"Found {len(duplicates)} user-level functional skill duplicates to delete")

        for inst in duplicates:
            filepath = self.root / inst['relative_path']

            if self.dry_run:
                print(f"[DRY RUN] Would delete: {inst['relative_path']}")
            else:
                if filepath.exists():
                    filepath.unlink()
                    print(f"Deleted: {inst['relative_path']}")
                    self.changes.append({
                        'action': 'delete',
                        'type': 'skill',
                        'path': inst['relative_path'],
                        'reason': 'user/project duplicate'
                    })
                    self.stats['skills_deleted'] += 1

        print(f"\n✓ Deleted {self.stats['skills_deleted']} user-level functional skill duplicates")

    def rename_documentation_skills(self):
        """Rename README/INDEX.md to .txt so they don't load as skills"""
        print("\n" + "="*80)
        print("STEP 3: Renaming Documentation Files")
        print("="*80)

        doc_names = {'README', 'INDEX', 'MANIFEST', 'QUICK_START', 'CREATION_SUMMARY', 'QUICK_REFERENCE'}

        doc_files = []
        for skill in self.coord_map['skills']:
            if Path(skill['filename']).stem in doc_names:
                doc_files.append(skill)

        print(f"Found {len(doc_files)} documentation files to rename (.md → .txt)")

        for skill in doc_files:
            old_path = self.root / skill['relative_path']
            new_path = old_path.with_suffix('.txt')

            if self.dry_run:
                print(f"[DRY RUN] Would rename: {skill['relative_path']} → {new_path.name}")
            else:
                if old_path.exists():
                    old_path.rename(new_path)
                    print(f"Renamed: {skill['relative_path']} → {new_path.name}")
                    self.changes.append({
                        'action': 'rename',
                        'type': 'doc',
                        'old_path': skill['relative_path'],
                        'new_path': str(new_path.relative_to(self.root)),
                        'reason': 'documentation file'
                    })
                    self.stats['docs_renamed'] += 1

        print(f"\n✓ Renamed {self.stats['docs_renamed']} documentation files")

    def apply_model_policy(self):
        """Apply model policy to all agents using 'default'"""
        print("\n" + "="*80)
        print("STEP 4: Applying Model Policy")
        print("="*80)

        # Model inference rules
        POLICY = {
            # Lane 1: Explore & Index → haiku
            'analyzer': 'haiku',
            'indexer': 'haiku',
            'scanner': 'haiku',
            'mapper': 'haiku',
            'coverage': 'haiku',

            # Lane 2: Design & Plan → opus
            'architect': 'opus',
            'orchestrator': 'opus',
            'planner': 'opus',
            'lead': 'opus',

            # Lane 3: Implement → sonnet
            'engineer': 'sonnet',
            'developer': 'sonnet',
            'refactorer': 'sonnet',
            'generator': 'sonnet',
            'builder': 'sonnet',
            'compiler': 'sonnet',

            # Lane 4: Review & Security → opus
            'auditor': 'opus',
            'reviewer': 'opus',
            'security': 'opus',
            'compliance': 'opus',
            'safety': 'opus',
            'threat': 'opus',

            # Lane 5: QA & Verify → sonnet
            'qa': 'sonnet',
            'test': 'sonnet',
            'validator': 'sonnet',
            'checker': 'sonnet',

            # Swarm workers → haiku
            'parallel': 'haiku',
            'swarm': 'sonnet',  # Coordinators use sonnet
            'worker': 'haiku',
            'partitioner': 'haiku',
            'aggregator': 'sonnet',

            # Documentation → sonnet
            'writer': 'sonnet',
            'documenter': 'sonnet',
            'changelog': 'sonnet',
        }

        def infer_model(agent_name: str) -> str:
            """Infer model from agent name"""
            name_lower = agent_name.lower()

            for keyword, model in POLICY.items():
                if keyword in name_lower:
                    return model

            # Default fallback
            return 'sonnet'

        # Find agents using 'default'
        default_agents = [a for a in self.coord_map['agents'] if a['model'] == 'default']

        print(f"Found {len(default_agents)} agents using 'default' model")

        for agent in default_agents:
            filepath = self.root / agent['relative_path']

            if not filepath.exists():
                continue

            # Infer new model
            new_model = infer_model(agent['name'])

            # Read file
            content = filepath.read_text(encoding='utf-8')

            # Replace model
            new_content = re.sub(
                r'^model:\s*default\s*$',
                f'model: {new_model}',
                content,
                flags=re.MULTILINE
            )

            if new_content != content:
                if self.dry_run:
                    print(f"[DRY RUN] {agent['name']}: default → {new_model}")
                else:
                    filepath.write_text(new_content, encoding='utf-8')
                    print(f"{agent['name']}: default → {new_model}")
                    self.changes.append({
                        'action': 'update_model',
                        'type': 'agent',
                        'path': agent['relative_path'],
                        'old_model': 'default',
                        'new_model': new_model
                    })
                    self.stats[f'model_{new_model}'] += 1

        print(f"\n✓ Updated model policy:")
        print(f"  haiku: {self.stats['model_haiku']}")
        print(f"  sonnet: {self.stats['model_sonnet']}")
        print(f"  opus: {self.stats['model_opus']}")

    def fix_triple_duplicates(self):
        """Delete old versions of triple-duplicated agents"""
        print("\n" + "="*80)
        print("STEP 5: Fixing Triple Duplicates")
        print("="*80)

        # Triple duplicates: keep project's new category, delete user + project old
        triple_dups = [dup for dup in self.coord_map['duplicates'].get('agents', [])
                      if dup['count'] == 3]

        print(f"Found {len(triple_dups)} triple-duplicated agents")

        for dup in triple_dups:
            instances = dup['instances']

            # Identify: user, project-old, project-new
            user = [i for i in instances if i['scope'] == 'user']
            project = [i for i in instances if i['scope'] == 'project']

            # Keep the one with most modern category structure
            # (heuristic: newer categories have different names)
            if len(project) == 2:
                # Assume different category names → keep one with "better" category
                # For now, keep both project versions and delete user
                to_delete = user
            else:
                to_delete = []

            for inst in to_delete:
                filepath = self.root / inst['relative_path']

                if self.dry_run:
                    print(f"[DRY RUN] Would delete: {inst['relative_path']}")
                else:
                    if filepath.exists():
                        filepath.unlink()
                        print(f"Deleted: {inst['relative_path']}")
                        self.changes.append({
                            'action': 'delete',
                            'type': 'agent',
                            'path': inst['relative_path'],
                            'reason': 'triple duplicate cleanup'
                        })
                        self.stats['triple_dups_fixed'] += 1

        print(f"\n✓ Fixed {self.stats['triple_dups_fixed']} triple duplicates")

    def generate_change_log(self):
        """Generate detailed change log"""
        log_path = self.root / '.claude/audit/CHANGES.json'

        change_log = {
            'timestamp': datetime.now().isoformat(),
            'dry_run': self.dry_run,
            'statistics': dict(self.stats),
            'changes': self.changes
        }

        with open(log_path, 'w') as f:
            json.dump(change_log, f, indent=2)

        print(f"\n✓ Change log saved: {log_path}")

        # Also generate markdown summary
        md_path = self.root / '.claude/audit/CHANGES.md'
        md = [
            f"# Toolkit Optimization Changes\n",
            f"**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"**Mode**: {'DRY RUN' if self.dry_run else 'EXECUTED'}\n",
            "## Statistics\n"
        ]

        for key, value in sorted(self.stats.items()):
            md.append(f"- **{key}**: {value}")

        md.append("\n## Changes by Type\n")

        by_action = defaultdict(int)
        for change in self.changes:
            by_action[change['action']] += 1

        for action, count in sorted(by_action.items()):
            md.append(f"- **{action}**: {count}")

        md.append("\n## Detailed Changes\n")

        for change in self.changes[:100]:  # First 100
            md.append(f"\n### {change['action'].upper()}: {change.get('path', 'N/A')}")
            md.append(f"- **Type**: {change['type']}")
            md.append(f"- **Reason**: {change['reason']}")
            if 'old_model' in change:
                md.append(f"- **Model Change**: {change['old_model']} → {change['new_model']}")

        if len(self.changes) > 100:
            md.append(f"\n*... and {len(self.changes) - 100} more changes (see CHANGES.json)*")

        with open(md_path, 'w') as f:
            f.write('\n'.join(md))

        print(f"✓ Change summary saved: {md_path}")

    def run(self):
        """Execute all optimization steps"""
        print("="*80)
        print("CLAUDE CODE TOOLKIT OPTIMIZATION")
        print("="*80)
        print(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE EXECUTION'}")
        print(f"Root: {self.root}")
        print()

        # Create backup (unless dry run)
        backup_dir = self.create_backup()

        # Execute steps
        self.delete_user_agent_duplicates()
        self.delete_user_skill_duplicates()
        self.rename_documentation_skills()
        self.apply_model_policy()
        self.fix_triple_duplicates()

        # Generate change log
        self.generate_change_log()

        # Summary
        print("\n" + "="*80)
        print("OPTIMIZATION COMPLETE")
        print("="*80)
        print(f"\nStatistics:")
        for key, value in sorted(self.stats.items()):
            print(f"  {key}: {value}")

        if not self.dry_run:
            print(f"\nBackup location: {backup_dir}")
            print(f"Change log: .claude/audit/CHANGES.json")
            print(f"Change summary: .claude/audit/CHANGES.md")
        else:
            print("\n** DRY RUN COMPLETE - NO CHANGES MADE **")

def main():
    import sys

    dry_run = '--dry-run' in sys.argv or '-n' in sys.argv

    optimizer = ToolkitOptimizer(
        root_path='/Users/louisherman/ClaudeCodeProjects',
        dry_run=dry_run
    )

    optimizer.run()

if __name__ == '__main__':
    main()
