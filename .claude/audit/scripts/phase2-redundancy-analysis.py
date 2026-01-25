#!/usr/bin/env python3
"""
Phase 2: Redundancy & Coordination Audit
Analyzes coordination-map.json to find redundancies, conflicts, and optimization opportunities.
"""

import json
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Any

class RedundancyAnalyzer:
    def __init__(self, coordination_map_path: str):
        with open(coordination_map_path) as f:
            self.map = json.load(f)

        self.agents = self.map['agents']
        self.skills = self.map['skills']
        self.commands = self.map['commands']

        # Lane definitions from COORDINATION.md
        self.lanes = {
            'explore-index': {
                'keywords': ['analyzer', 'indexer', 'scanner', 'mapper', 'explore', 'finder', 'search'],
                'model': 'haiku',
                'description': 'Read-only intelligence, fast scanning'
            },
            'design-plan': {
                'keywords': ['architect', 'orchestrator', 'planner', 'design', 'plan', 'strategy'],
                'model': 'opus',
                'description': 'Architecture decisions, deep reasoning'
            },
            'implement': {
                'keywords': ['engineer', 'developer', 'generator', 'refactor', 'implement', 'builder'],
                'model': 'sonnet',
                'description': 'Code changes, implementation'
            },
            'review-security': {
                'keywords': ['reviewer', 'auditor', 'security', 'compliance', 'review', 'audit'],
                'model': 'opus',
                'description': 'Quality assurance, security review'
            },
            'qa-verify': {
                'keywords': ['qa', 'test', 'validator', 'verify', 'coverage', 'e2e'],
                'model': 'sonnet',
                'description': 'Testing, validation'
            },
            'release-ops': {
                'keywords': ['deploy', 'release', 'commit', 'publish', 'ops'],
                'model': 'sonnet',
                'description': 'Side-effectful operations (manual-only)'
            }
        }

    def analyze_model_misalignment(self) -> List[Dict]:
        """Find agents using wrong model tier for their lane."""
        misaligned = []

        for agent in self.agents:
            lane = agent.get('lane', 'unknown')
            current_model = agent.get('model', 'unknown')

            if lane in self.lanes:
                expected_model = self.lanes[lane]['model']

                # Special case: orchestrators should use opus even if in implement lane
                if 'orchestrator' in agent['name'].lower():
                    expected_model = 'opus'

                if current_model not in [expected_model, 'unknown']:
                    misaligned.append({
                        'agent': agent['name'],
                        'lane': lane,
                        'current_model': current_model,
                        'expected_model': expected_model,
                        'path': agent['path'],
                        'reason': f"Lane {lane} should use {expected_model}"
                    })

        return misaligned

    def find_description_overlaps(self) -> List[Dict]:
        """Find agents with similar descriptions (potential redundancy)."""
        overlaps = []

        # Create description fingerprints
        descriptions = {}
        for agent in self.agents:
            desc = agent.get('description', '').lower()
            if not desc:
                continue

            # Extract key phrases (first 100 chars)
            fingerprint = desc[:100]

            if fingerprint not in descriptions:
                descriptions[fingerprint] = []
            descriptions[fingerprint].append(agent)

        # Find duplicates
        for fingerprint, agents_list in descriptions.items():
            if len(agents_list) > 1:
                overlaps.append({
                    'description_snippet': fingerprint[:80] + '...',
                    'count': len(agents_list),
                    'agents': [{'name': a['name'], 'path': a['path']} for a in agents_list]
                })

        return sorted(overlaps, key=lambda x: -x['count'])

    def find_naming_patterns(self) -> Dict[str, List[str]]:
        """Group agents by naming patterns to find potential role overlap."""
        patterns = defaultdict(list)

        for agent in self.agents:
            name = agent['name']

            # Extract suffix (last part after last hyphen)
            parts = name.split('-')
            if len(parts) > 1:
                suffix = parts[-1]
                patterns[suffix].append(name)

            # Extract prefix (first part)
            prefix = parts[0]
            patterns[f"prefix:{prefix}"].append(name)

        # Return only patterns with 3+ agents
        return {k: v for k, v in patterns.items() if len(v) >= 3}

    def analyze_lane_distribution(self) -> Dict[str, Dict]:
        """Analyze distribution of components across lanes."""
        lane_stats = defaultdict(lambda: {
            'agents': 0,
            'commands': 0,
            'total': 0,
            'model_distribution': defaultdict(int),
            'examples': []
        })

        for agent in self.agents:
            lane = agent.get('lane', 'unknown')
            lane_stats[lane]['agents'] += 1
            lane_stats[lane]['total'] += 1
            lane_stats[lane]['model_distribution'][agent.get('model', 'unknown')] += 1

            if len(lane_stats[lane]['examples']) < 5:
                lane_stats[lane]['examples'].append(agent['name'])

        for command in self.commands:
            lane = command.get('lane', 'unknown')
            lane_stats[lane]['commands'] += 1
            lane_stats[lane]['total'] += 1

        return dict(lane_stats)

    def find_missing_manual_gates(self) -> List[Dict]:
        """Find release-ops commands missing manual-only gates."""
        missing_gates = []

        for command in self.commands:
            lane = command.get('lane', 'unknown')
            name = command['name']

            # Check if it's a side-effectful operation
            if lane == 'release-ops' or any(kw in name.lower() for kw in ['commit', 'deploy', 'release', 'delete', 'drop', 'migrate']):
                # Should have manual-only gate
                frontmatter = command.get('frontmatter', {})
                if not frontmatter.get('manual-only') and not frontmatter.get('confirmation-required'):
                    missing_gates.append({
                        'command': name,
                        'path': command['path'],
                        'lane': lane,
                        'risk': 'high',
                        'recommendation': 'Add manual-only: true to frontmatter'
                    })

        return missing_gates

    def find_consolidation_opportunities(self) -> List[Dict]:
        """Find groups of similar agents that could be consolidated."""
        opportunities = []

        # Group by lane and similar naming
        lane_groups = defaultdict(lambda: defaultdict(list))

        for agent in self.agents:
            lane = agent.get('lane', 'unknown')
            name = agent['name']

            # Extract base name (without suffixes like -v2, -new, etc.)
            base_name = name.replace('-v2', '').replace('-new', '').replace('-old', '')

            lane_groups[lane][base_name].append(agent)

        # Find consolidation candidates
        for lane, groups in lane_groups.items():
            for base_name, agents_list in groups.items():
                if len(agents_list) >= 2:
                    # Check if they're actually different or just duplicates
                    models = {a.get('model') for a in agents_list}

                    opportunities.append({
                        'lane': lane,
                        'base_name': base_name,
                        'count': len(agents_list),
                        'agents': [a['name'] for a in agents_list],
                        'models': list(models),
                        'recommendation': 'Consolidate into single agent' if len(models) == 1 else 'Review for differences'
                    })

        return sorted(opportunities, key=lambda x: -x['count'])[:20]

    def generate_phase2_report(self) -> str:
        """Generate comprehensive Phase 2 findings."""
        report = ["# Phase 2: Redundancy & Coordination Audit\n\n"]
        report.append("---\n\n")

        # Model misalignment
        report.append("## Model Tier Misalignment\n\n")
        misaligned = self.analyze_model_misalignment()
        if misaligned:
            report.append(f"Found {len(misaligned)} agents using incorrect model tier for their lane.\n\n")
            for item in misaligned[:20]:
                report.append(f"### `{item['agent']}` - {item['lane']}\n")
                report.append(f"- **Current**: {item['current_model']}\n")
                report.append(f"- **Expected**: {item['expected_model']}\n")
                report.append(f"- **Path**: {item['path']}\n")
                report.append(f"- **Reason**: {item['reason']}\n\n")

            if len(misaligned) > 20:
                report.append(f"... and {len(misaligned) - 20} more misaligned agents\n\n")
        else:
            report.append("✅ No model tier misalignment found.\n\n")

        # Description overlaps
        report.append("## Description Overlaps (Potential Redundancy)\n\n")
        overlaps = self.find_description_overlaps()
        if overlaps:
            report.append(f"Found {len(overlaps)} groups of agents with similar descriptions.\n\n")
            for item in overlaps[:10]:
                report.append(f"### {item['count']} agents with similar description\n")
                report.append(f"**Description**: \"{item['description_snippet']}\"\n\n")
                report.append("**Agents**:\n")
                for agent in item['agents']:
                    report.append(f"- `{agent['name']}` - {agent['path']}\n")
                report.append("\n")
        else:
            report.append("✅ No significant description overlaps found.\n\n")

        # Naming patterns
        report.append("## Naming Patterns (Role Groups)\n\n")
        patterns = self.find_naming_patterns()
        if patterns:
            for pattern, names in sorted(patterns.items(), key=lambda x: -len(x[1]))[:15]:
                report.append(f"### Pattern: `{pattern}` ({len(names)} agents)\n")
                report.append(f"{', '.join(sorted(names)[:10])}\n\n")
        else:
            report.append("No significant naming patterns found.\n\n")

        # Lane distribution
        report.append("## Lane Distribution Analysis\n\n")
        lane_stats = self.analyze_lane_distribution()
        for lane, stats in sorted(lane_stats.items(), key=lambda x: -x[1]['total']):
            report.append(f"### {lane.upper()} ({stats['total']} components)\n")
            report.append(f"- **Agents**: {stats['agents']}\n")
            report.append(f"- **Commands**: {stats['commands']}\n")

            if lane in self.lanes:
                expected_model = self.lanes[lane]['model']
                report.append(f"- **Expected Model**: `{expected_model}`\n")

            report.append(f"- **Model Distribution**: {dict(stats['model_distribution'])}\n")
            report.append(f"- **Examples**: {', '.join(stats['examples'])}\n\n")

        # Missing manual gates
        report.append("## Missing Manual-Only Gates\n\n")
        missing_gates = self.find_missing_manual_gates()
        if missing_gates:
            report.append(f"Found {len(missing_gates)} side-effectful commands without manual-only gates.\n\n")
            for item in missing_gates[:20]:
                report.append(f"- **{item['command']}** (Lane: {item['lane']}, Risk: {item['risk']})\n")
                report.append(f"  - Path: {item['path']}\n")
                report.append(f"  - Recommendation: {item['recommendation']}\n\n")
        else:
            report.append("✅ All side-effectful commands have proper gates.\n\n")

        # Consolidation opportunities
        report.append("## Top Consolidation Opportunities\n\n")
        opportunities = self.find_consolidation_opportunities()
        if opportunities:
            for item in opportunities[:15]:
                report.append(f"### `{item['base_name']}` - {item['lane']}\n")
                report.append(f"- **Count**: {item['count']} similar agents\n")
                report.append(f"- **Agents**: {', '.join(item['agents'])}\n")
                report.append(f"- **Models**: {', '.join(item['models'])}\n")
                report.append(f"- **Recommendation**: {item['recommendation']}\n\n")
        else:
            report.append("No obvious consolidation opportunities found.\n\n")

        return ''.join(report)


def main():
    print("=" * 60)
    print("Phase 2: Redundancy & Coordination Audit")
    print("=" * 60)

    map_path = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/coordination-map.json')

    if not map_path.exists():
        print(f"❌ Coordination map not found: {map_path}")
        print("Run phase1-build-coordination-map.py first.")
        return

    analyzer = RedundancyAnalyzer(str(map_path))

    # Generate report
    print("\nAnalyzing redundancy patterns...")
    report = analyzer.generate_phase2_report()

    # Save report
    report_path = Path('/Users/louisherman/ClaudeCodeProjects/.claude/audit/phase2-redundancy-report.md')
    with open(report_path, 'w') as f:
        f.write(report)

    print(f"✅ Saved: {report_path}")

    # Print summary stats
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)

    misaligned = analyzer.analyze_model_misalignment()
    overlaps = analyzer.find_description_overlaps()
    missing_gates = analyzer.find_missing_manual_gates()
    opportunities = analyzer.find_consolidation_opportunities()

    print(f"Model misalignments: {len(misaligned)}")
    print(f"Description overlaps: {len(overlaps)}")
    print(f"Missing manual gates: {len(missing_gates)}")
    print(f"Consolidation opportunities: {len(opportunities)}")
    print("\n✅ Phase 2 complete!")


if __name__ == '__main__':
    main()
