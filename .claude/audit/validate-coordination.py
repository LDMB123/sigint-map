#!/usr/bin/env python3
"""
Coordination Health Validator
Continuously validates coordination health and detects regressions.
Run this after making changes to verify ecosystem health.
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

class CoordinationValidator:
    def __init__(self):
        self.issues = []
        self.warnings = []
        self.passed = []

    def load_coordination_map(self, map_path):
        with open(map_path) as f:
            return json.load(f)

    def validate_model_alignment(self, coordination_map):
        """Check agents use correct model tier for their lane."""
        issues = 0
        total = 0

        lane_models = {
            'explore-index': 'haiku',
            'design-plan': 'opus',
            'implement': 'sonnet',
            'review-security': 'opus',
            'qa-verify': 'sonnet',
            'release-ops': 'sonnet',
        }

        for agent in coordination_map['agents']:
            name = agent['name']
            model = agent.get('model', 'unknown')
            lane = agent.get('lane', 'unknown')

            if lane == 'unknown':
                continue

            total += 1

            # Orchestrators should use opus
            if 'orchestrator' in name.lower():
                expected = 'opus'
            elif lane in lane_models:
                expected = lane_models[lane]
            else:
                continue

            if model != expected:
                self.issues.append(f"Model misalignment: {name} uses {model}, expected {expected}")
                issues += 1

        if issues == 0:
            self.passed.append(f"✅ All {total} agents use correct model tier")

        return issues, total

    def validate_manual_gates(self, coordination_map):
        """Check side-effectful commands have manual-only gates."""
        missing = 0

        keywords = ['commit', 'deploy', 'release', 'delete', 'drop', 'migrate']

        for command in coordination_map['commands']:
            name = command['name']
            fm = command.get('frontmatter', {})

            if any(kw in name.lower() for kw in keywords):
                if not fm.get('manual-only'):
                    self.issues.append(f"Missing manual gate: {name}")
                    missing += 1

        if missing == 0:
            self.passed.append("✅ All side-effectful commands are gated")

        return missing

    def run_all_validations(self, map_path):
        print("=" * 60)
        print("Coordination Health Validation")
        print("=" * 60)

        cm = self.load_coordination_map(map_path)

        print("\n[1/2] Validating model alignment...")
        self.validate_model_alignment(cm)

        print("[2/2] Validating manual gates...")
        self.validate_manual_gates(cm)

        # Results
        print("\n" + "=" * 60)

        if self.passed:
            for p in self.passed:
                print(p)

        if self.issues:
            print("\n❌ ISSUES:\n")
            for i in self.issues:
                print(f"  {i}")

        score = 100 if not self.issues else 50
        print(f"\nHealth Score: {score}/100")
        print("=" * 60)

        return not self.issues


if __name__ == '__main__':
    map_path = '/Users/louisherman/ClaudeCodeProjects/.claude/audit/coordination-map.json'
    if not Path(map_path).exists():
        print("❌ Run build-coordination-map.py first")
        sys.exit(1)

    validator = CoordinationValidator()
    healthy = validator.run_all_validations(map_path)
    sys.exit(0 if healthy else 1)
