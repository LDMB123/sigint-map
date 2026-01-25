#!/usr/bin/env python3
"""
PHASE 5: Subagent Validator
Continuous validation of agent ecosystem health.
Run this periodically to detect orphaned agents.
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple
import yaml
import re

class AgentValidator:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.info = []

    def validate(self) -> Tuple[bool, List[str], List[str], List[str]]:
        """Run all validations. Returns (success, errors, warnings, info)."""
        print("🔍 Validating Claude Code agent ecosystem...\n")

        # Run checks
        self._check_agent_files()
        self._check_name_collisions()
        self._check_dangling_references()
        self._check_model_consistency()
        self._check_yaml_validity()

        # Print results
        self._print_results()

        return (len(self.errors) == 0, self.errors, self.warnings, self.info)

    def _check_agent_files(self):
        """Verify all agent files are parseable."""
        user_agents = Path.home() / '.claude/agents'
        project_agents = Path('/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/.claude/agents')

        total = 0
        failed = 0

        for base_dir in [user_agents, project_agents]:
            if not base_dir.exists():
                continue

            for agent_file in base_dir.rglob('*.md'):
                total += 1
                try:
                    content = agent_file.read_text(encoding='utf-8')

                    # Check for YAML frontmatter
                    yaml_match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
                    if yaml_match:
                        # Validate YAML
                        yaml.safe_load(yaml_match.group(1))
                    else:
                        # Check for markdown metadata
                        if '**ID**:' not in content and '# ' not in content:
                            self.errors.append(f"No metadata found in {agent_file}")
                            failed += 1

                except Exception as e:
                    self.errors.append(f"Failed to parse {agent_file}: {e}")
                    failed += 1

        if failed == 0:
            self.info.append(f"✅ All {total} agent files are parseable")
        else:
            self.errors.append(f"❌ {failed}/{total} agent files failed to parse")

    def _check_name_collisions(self):
        """Check for name collisions across scopes."""
        # Load inventory
        inventory_path = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/orphaned-agents-inventory.json')
        if not inventory_path.exists():
            self.warnings.append("⚠️  No inventory file found - run parse-agents.py first")
            return

        with open(inventory_path) as f:
            inventory = json.load(f)

        collisions = inventory.get('name_collisions', {})
        if len(collisions) == 0:
            self.info.append("✅ No name collisions detected")
        else:
            for name, instances in collisions.items():
                self.errors.append(f"❌ Name collision: '{name}' exists in {len(instances)} scopes")

    def _check_dangling_references(self):
        """Check for agents referenced but don't exist."""
        results_path = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/orphan-detection-results.json')
        if not results_path.exists():
            self.warnings.append("⚠️  No orphan detection results - run orphan-detector.py first")
            return

        with open(results_path) as f:
            results = json.load(f)

        dangling = results['findings']['dangling_references']
        if len(dangling) == 0:
            self.info.append("✅ No dangling agent references")
        else:
            for ref in dangling:
                self.warnings.append(f"⚠️  Dangling reference: '{ref['name']}' (referenced {ref['reference_count']}x)")

    def _check_model_consistency(self):
        """Check for model naming inconsistencies."""
        inventory_path = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/orphaned-agents-inventory.json')
        if not inventory_path.exists():
            return

        with open(inventory_path) as f:
            inventory = json.load(f)

        # Check for non-standard model names
        models = inventory['summary']['by_model']
        standard_models = {'haiku', 'sonnet', 'opus', 'gemini-3-pro', 'gemini-2-flash', 'gemini-2-flash-thinking'}

        non_standard = [m for m in models.keys() if m not in standard_models and m != 'unknown']

        if len(non_standard) == 0 and models.get('unknown', 0) == 0:
            self.info.append("✅ All agents use standard model names")
        else:
            if 'unknown' in models:
                self.warnings.append(f"⚠️  {models['unknown']} agent(s) have no model specified")
            for model in non_standard:
                self.warnings.append(f"⚠️  Non-standard model name: '{model}' ({models[model]} agents)")

    def _check_yaml_validity(self):
        """Check YAML frontmatter structure."""
        required_fields = ['name', 'description', 'model']

        user_agents = Path.home() / '.claude/agents'
        missing_count = 0

        for agent_file in user_agents.rglob('*.md'):
            try:
                content = agent_file.read_text(encoding='utf-8')
                yaml_match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)

                if yaml_match:
                    metadata = yaml.safe_load(yaml_match.group(1))
                    if metadata:
                        for field in required_fields:
                            if field not in metadata:
                                self.warnings.append(f"⚠️  Missing '{field}' in {agent_file.name}")
                                missing_count += 1
                                break

            except Exception:
                pass  # Already caught in _check_agent_files

        if missing_count == 0:
            self.info.append("✅ All YAML frontmatter has required fields")

    def _print_results(self):
        """Print validation results."""
        print("\n" + "="*60)
        print("VALIDATION RESULTS")
        print("="*60 + "\n")

        if self.errors:
            print("❌ ERRORS:")
            for error in self.errors:
                print(f"   {error}")
            print()

        if self.warnings:
            print("⚠️  WARNINGS:")
            for warning in self.warnings:
                print(f"   {warning}")
            print()

        if self.info:
            print("ℹ️  INFO:")
            for info_msg in self.info:
                print(f"   {info_msg}")
            print()

        # Summary
        print("="*60)
        print(f"Summary: {len(self.errors)} errors, {len(self.warnings)} warnings")
        print("="*60)

def main():
    validator = AgentValidator()
    success, errors, warnings, info = validator.validate()

    if not success:
        print("\n❌ Validation FAILED")
        sys.exit(1)
    elif warnings:
        print("\n⚠️  Validation PASSED with warnings")
        sys.exit(0)
    else:
        print("\n✅ Validation PASSED")
        sys.exit(0)

if __name__ == '__main__':
    main()
