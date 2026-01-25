#!/usr/bin/env python3
"""
Phase 4: Apply Coordination Fixes
Systematically applies all coordination improvements identified in Phase 2.
"""

import json
import re
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

class CoordinationFixer:
    def __init__(self, coordination_map_path: str, dry_run: bool = False):
        with open(coordination_map_path) as f:
            self.map = json.load(f)

        self.dry_run = dry_run
        self.changes = []
        self.errors = []
        self.backup_dir = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/backups')

        # Create backup directory
        if not dry_run:
            self.backup_dir.mkdir(exist_ok=True)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            self.backup_subdir = self.backup_dir / f'backup_{timestamp}'
            self.backup_subdir.mkdir(exist_ok=True)

    def backup_file(self, file_path: str):
        """Backup a file before modification."""
        if self.dry_run:
            return

        src = Path(file_path)
        if not src.exists():
            return

        # Preserve directory structure in backup
        rel_path = src.relative_to('/')
        backup_path = self.backup_subdir / rel_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)

        shutil.copy2(src, backup_path)

    def update_frontmatter(self, file_path: str, updates: Dict[str, Any]) -> bool:
        """Update frontmatter fields in a markdown file."""
        try:
            path = Path(file_path)
            if not path.exists():
                self.errors.append(f"File not found: {file_path}")
                return False

            content = path.read_text(encoding='utf-8')

            # Extract frontmatter
            match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', content, re.DOTALL)
            if not match:
                # No frontmatter - add it
                frontmatter_lines = ['---']
                for key, value in updates.items():
                    frontmatter_lines.append(f'{key}: {value}')
                frontmatter_lines.append('---\n')
                new_content = '\n'.join(frontmatter_lines) + content
            else:
                frontmatter_text = match.group(1)
                body = match.group(2)

                # Update frontmatter
                lines = frontmatter_text.split('\n')
                updated_lines = []
                keys_updated = set()

                for line in lines:
                    # Check if this line contains a key we want to update
                    updated = False
                    for key, value in updates.items():
                        if line.startswith(f'{key}:'):
                            updated_lines.append(f'{key}: {value}')
                            keys_updated.add(key)
                            updated = True
                            break

                    if not updated:
                        updated_lines.append(line)

                # Add any keys that weren't already in frontmatter
                for key, value in updates.items():
                    if key not in keys_updated:
                        updated_lines.append(f'{key}: {value}')

                new_content = '---\n' + '\n'.join(updated_lines) + '\n---\n' + body

            # Backup and write
            self.backup_file(file_path)

            if not self.dry_run:
                path.write_text(new_content, encoding='utf-8')

            return True

        except Exception as e:
            self.errors.append(f"Error updating {file_path}: {e}")
            return False

    def fix_manual_only_gates(self, commands_needing_gates: List[str]) -> int:
        """Add manual-only: true to side-effectful commands."""
        fixed = 0

        for command in self.map['commands']:
            name = command['name']
            path = command['path']

            # Check if this command needs a manual gate
            if name in commands_needing_gates:
                if self.update_frontmatter(path, {'manual-only': 'true'}):
                    self.changes.append(f"Added manual-only gate to {name}")
                    fixed += 1

        return fixed

    def fix_model_misalignments(self) -> int:
        """Fix model tier misalignments based on lane assignments."""
        fixed = 0

        # Lane to model mapping from MODEL_POLICY.md
        lane_models = {
            'explore-index': 'haiku',
            'design-plan': 'opus',
            'implement': 'sonnet',
            'review-security': 'opus',
            'qa-verify': 'sonnet',
            'release-ops': 'sonnet',
        }

        for agent in self.map['agents']:
            name = agent['name']
            path = agent['path']
            current_model = agent.get('model', 'unknown')
            lane = agent.get('lane', 'unknown')

            # Special case: orchestrators should use opus
            if 'orchestrator' in name.lower():
                expected_model = 'opus'
            elif lane in lane_models:
                expected_model = lane_models[lane]
            else:
                continue  # Skip unknown lanes

            # Check if misaligned
            if current_model != expected_model and current_model != 'unknown':
                if self.update_frontmatter(path, {'model': expected_model}):
                    self.changes.append(f"Updated {name}: {current_model} → {expected_model} (lane: {lane})")
                    fixed += 1

        return fixed

    def remove_shadowing_duplicates(self, duplicates_to_remove: List[str]) -> int:
        """Remove project-level duplicates that shadow user-level commands."""
        removed = 0

        for command in self.map['commands']:
            path = command['path']

            if path in duplicates_to_remove:
                self.backup_file(path)

                if not self.dry_run:
                    Path(path).unlink()

                self.changes.append(f"Removed shadowing duplicate: {path}")
                removed += 1

        return removed

    def consolidate_dmb_guest_specialists(self) -> bool:
        """Consolidate two DMB guest specialist agents into one."""
        # Find the two agents
        dmb_guest = None
        guest_appearance = None

        for agent in self.map['agents']:
            if agent['name'] == 'dmb-guest-specialist':
                dmb_guest = agent
            elif agent['name'] == 'guest-appearance-specialist':
                guest_appearance = agent

        if not dmb_guest or not guest_appearance:
            self.errors.append("Could not find both DMB guest specialist agents")
            return False

        # Keep dmb-guest-specialist (in root), remove guest-appearance-specialist (in subdirectory)
        self.backup_file(guest_appearance['path'])

        if not self.dry_run:
            Path(guest_appearance['path']).unlink()

        self.changes.append(f"Consolidated DMB guest specialists: kept {dmb_guest['name']}, removed {guest_appearance['name']}")
        return True

    def move_architecture_file(self) -> bool:
        """Move ARCHITECTURE.md out of agents directory."""
        # Find ARCHITECTURE in agents
        arch_file = None

        for agent in self.map['agents']:
            if agent['name'] == 'ARCHITECTURE':
                arch_file = agent['path']
                break

        if not arch_file:
            self.errors.append("Could not find ARCHITECTURE.md in agents directory")
            return False

        # Move to docs directory
        src = Path(arch_file)
        dest = src.parent.parent / 'docs' / 'ARCHITECTURE.md'

        self.backup_file(arch_file)

        if not self.dry_run:
            dest.parent.mkdir(exist_ok=True)
            shutil.move(src, dest)

        self.changes.append(f"Moved ARCHITECTURE.md from agents/ to docs/")
        return True

    def generate_report(self) -> str:
        """Generate summary report of changes."""
        report = ["# Phase 4: Coordination Fixes Applied\n\n"]
        report.append(f"**Execution Mode**: {'DRY RUN' if self.dry_run else 'LIVE'}\n")
        report.append(f"**Timestamp**: {datetime.now().isoformat()}\n\n")

        report.append("## Changes Applied\n\n")
        for change in self.changes:
            report.append(f"- {change}\n")

        report.append(f"\n**Total Changes**: {len(self.changes)}\n\n")

        if self.errors:
            report.append("## Errors\n\n")
            for error in self.errors:
                report.append(f"- ❌ {error}\n")
            report.append(f"\n**Total Errors**: {len(self.errors)}\n\n")

        if not self.dry_run:
            report.append(f"## Backup Location\n\n")
            report.append(f"All modified files backed up to: `{self.backup_subdir}`\n\n")

        return ''.join(report)


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Apply coordination fixes')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without applying')
    parser.add_argument('--live', action='store_true', help='Apply changes (default is dry-run)')
    args = parser.parse_args()

    # Default to dry-run unless --live is specified
    dry_run = not args.live

    print("=" * 60)
    print(f"Phase 4: Apply Coordination Fixes ({'DRY RUN' if dry_run else 'LIVE'})")
    print("=" * 60)

    map_path = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/coordination-map.json')

    if not map_path.exists():
        print(f"❌ Coordination map not found: {map_path}")
        return

    fixer = CoordinationFixer(str(map_path), dry_run=dry_run)

    # Priority 1: Add manual-only gates
    print("\n[1/6] Adding manual-only gates to side-effectful commands...")
    commands_needing_gates = [
        'commit', 'release-manager', 'pr-review', 'deployment-strategy',
        'git-workflow', 'git-cleanup', 'git-rollback-plan'
    ]
    gates_added = fixer.fix_manual_only_gates(commands_needing_gates)
    print(f"  ✅ Added {gates_added} manual-only gates")

    # Priority 2: Fix model misalignments
    print("\n[2/6] Fixing model tier misalignments...")
    models_fixed = fixer.fix_model_misalignments()
    print(f"  ✅ Fixed {models_fixed} model misalignments")

    # Priority 3: Remove shadowing duplicates
    print("\n[3/6] Removing shadowing duplicates...")
    duplicates_to_remove = [
        '/Users/louisherman/ClaudeCodeProjects/.claude/commands/app-slim.md',
        '/Users/louisherman/ClaudeCodeProjects/.claude/commands/code-simplifier.md',
        '/Users/louisherman/ClaudeCodeProjects/.claude/commands/debug.md',
        '/Users/louisherman/ClaudeCodeProjects/.claude/commands/migrate.md',
        '/Users/louisherman/ClaudeCodeProjects/.claude/commands/parallel-audit.md',
        '/Users/louisherman/ClaudeCodeProjects/.claude/commands/parallel-bundle-analysis.md',
        '/Users/louisherman/ClaudeCodeProjects/.claude/commands/parallel-chromium-audit.md',
        '/Users/louisherman/ClaudeCodeProjects/.claude/commands/parallel-css-audit.md',
        '/Users/louisherman/ClaudeCodeProjects/.claude/commands/parallel-database.md',
        '/Users/louisherman/ClaudeCodeProjects/.claude/commands/parallel-indexeddb-audit.md',
        '/Users/louisherman/ClaudeCodeProjects/.claude/commands/parallel-js-audit.md',
        '/Users/louisherman/ClaudeCodeProjects/.claude/commands/parallel-pwa.md',
        '/Users/louisherman/ClaudeCodeProjects/.claude/commands/parallel-security.md',
        '/Users/louisherman/ClaudeCodeProjects/.claude/commands/perf-audit.md',
        '/Users/louisherman/ClaudeCodeProjects/.claude/commands/type-fix.md',
    ]
    duplicates_removed = fixer.remove_shadowing_duplicates(duplicates_to_remove)
    print(f"  ✅ Removed {duplicates_removed} shadowing duplicates")

    # Priority 4: Consolidate DMB guest specialists
    print("\n[4/6] Consolidating DMB guest specialists...")
    if fixer.consolidate_dmb_guest_specialists():
        print(f"  ✅ Consolidated DMB guest specialists")
    else:
        print(f"  ⚠️ Could not consolidate (see errors)")

    # Priority 5: Move ARCHITECTURE.md
    print("\n[5/6] Moving ARCHITECTURE.md out of agents directory...")
    if fixer.move_architecture_file():
        print(f"  ✅ Moved ARCHITECTURE.md to docs/")
    else:
        print(f"  ⚠️ Could not move (see errors)")

    # Priority 6: Generate report
    print("\n[6/6] Generating summary report...")
    report = fixer.generate_report()

    report_path = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/phase4-fixes-applied.md')
    with open(report_path, 'w') as f:
        f.write(report)

    print(f"  ✅ Report saved to: {report_path}")

    # Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Mode: {'DRY RUN (no changes made)' if dry_run else 'LIVE (changes applied)'}")
    print(f"Total changes: {len(fixer.changes)}")
    print(f"Total errors: {len(fixer.errors)}")

    if not dry_run:
        print(f"\nBackup location: {fixer.backup_subdir}")

    print("\n✅ Phase 4 complete!")

    if dry_run:
        print("\nTo apply these changes, run with --live flag:")
        print("  python3 phase4-apply-fixes.py --live")


if __name__ == '__main__':
    main()
