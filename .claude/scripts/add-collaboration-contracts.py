#!/usr/bin/env python3
"""
Adds collaboration contracts to agents based on team structure.

Usage:
    python3 add-collaboration-contracts.py --team rust --dry-run
    python3 add-collaboration-contracts.py --team sveltekit --apply
    python3 add-collaboration-contracts.py --all --apply
"""

import os
import re
import argparse
from pathlib import Path

AGENTS_DIR = Path(__file__).resolve().parent.parent / "agents"

# Define team structures and collaboration patterns
TEAM_STRUCTURES = {
    "rust": {
        "lead": "00-rust-lead-orchestrator",
        "lead_receives": ["user", "workflow-orchestrator"],
        "lead_delegates": ["01-rust-project-architect", "03-rust-migration-engineer"],
        "members": {
            "01-rust-project-architect": {
                "receives": ["00-rust-lead-orchestrator"],
                "delegates": ["02-rust-semantics-engineer", "04-rust-build-engineer"]
            },
            "02-rust-semantics-engineer": {
                "receives": ["01-rust-project-architect", "03-rust-migration-engineer"],
                "delegates": ["06-rust-safety-auditor"]
            },
            "03-rust-migration-engineer": {
                "receives": ["00-rust-lead-orchestrator"],
                "delegates": ["02-rust-semantics-engineer"]
            },
            "04-rust-build-engineer": {
                "receives": ["01-rust-project-architect"],
                "delegates": ["05-rust-async-specialist", "08-rust-qa-engineer"]
            },
            "05-rust-async-specialist": {
                "receives": ["04-rust-build-engineer"],
                "delegates": ["07-rust-performance-engineer"]
            },
            "06-rust-safety-auditor": {
                "receives": ["02-rust-semantics-engineer"],
                "delegates": ["08-rust-qa-engineer"]
            },
            "07-rust-performance-engineer": {
                "receives": ["05-rust-async-specialist"],
                "delegates": ["08-rust-qa-engineer"]
            },
            "08-rust-qa-engineer": {
                "receives": ["04-rust-build-engineer", "06-rust-safety-auditor", "07-rust-performance-engineer"],
                "delegates": ["09-rust-debugger", "11-rust-parallel-coordinator"]
            },
            "09-rust-debugger": {
                "receives": ["08-rust-qa-engineer"],
                "delegates": []
            },
            "10-rust-metaprogramming-engineer": {
                "receives": ["00-rust-lead-orchestrator"],
                "delegates": []
            },
            "11-rust-parallel-coordinator": {
                "receives": ["08-rust-qa-engineer"],
                "delegates": []
            },
            "12-rust-documentation-specialist": {
                "receives": ["00-rust-lead-orchestrator"],
                "delegates": []
            }
        }
    },
    "sveltekit": {
        "lead": "00-sveltekit-orchestrator",
        "lead_receives": ["user", "workflow-orchestrator"],
        "lead_delegates": ["01-sveltekit-engineer", "04-pwa-engineer"],
        "members": {
            "01-sveltekit-engineer": {
                "receives": ["00-sveltekit-orchestrator"],
                "delegates": ["02-svelte-component-engineer", "03-vite-sveltekit-engineer"]
            },
            "02-svelte-component-engineer": {
                "receives": ["01-sveltekit-engineer"],
                "delegates": ["11-semantic-html-engineer", "12-modern-css-architect"]
            },
            "03-vite-sveltekit-engineer": {
                "receives": ["01-sveltekit-engineer"],
                "delegates": ["07-performance-optimizer"]
            },
            "04-pwa-engineer": {
                "receives": ["00-sveltekit-orchestrator"],
                "delegates": ["05-local-first-engineer", "06-caching-specialist"]
            },
            "05-local-first-engineer": {
                "receives": ["04-pwa-engineer"],
                "delegates": []
            },
            "06-caching-specialist": {
                "receives": ["04-pwa-engineer"],
                "delegates": []
            },
            "07-performance-optimizer": {
                "receives": ["03-vite-sveltekit-engineer"],
                "delegates": ["08-sveltekit-qa-engineer"]
            },
            "08-sveltekit-qa-engineer": {
                "receives": ["07-performance-optimizer"],
                "delegates": ["09-typescript-eslint-steward", "13-ui-regression-debugger", "14-lint-regression-debugger"]
            },
            "09-typescript-eslint-steward": {
                "receives": ["08-sveltekit-qa-engineer"],
                "delegates": []
            },
            "10-parallel-coordinator": {
                "receives": ["00-sveltekit-orchestrator"],
                "delegates": []
            },
            "11-semantic-html-engineer": {
                "receives": ["02-svelte-component-engineer"],
                "delegates": []
            },
            "12-modern-css-architect": {
                "receives": ["02-svelte-component-engineer"],
                "delegates": []
            },
            "13-ui-regression-debugger": {
                "receives": ["08-sveltekit-qa-engineer"],
                "delegates": []
            },
            "14-lint-regression-debugger": {
                "receives": ["08-sveltekit-qa-engineer"],
                "delegates": []
            }
        }
    },
    "orchestrators": {
        "members": {
            "workflow-orchestrator": {
                "receives": ["user"],
                "delegates": ["testing-orchestrator", "deployment-orchestrator", "review-orchestrator"]
            },
            "testing-orchestrator": {
                "receives": ["workflow-orchestrator"],
                "delegates": []
            },
            "deployment-orchestrator": {
                "receives": ["workflow-orchestrator"],
                "delegates": []
            },
            "migration-orchestrator": {
                "receives": ["workflow-orchestrator"],
                "delegates": []
            },
            "review-orchestrator": {
                "receives": ["workflow-orchestrator"],
                "delegates": []
            },
            "pipeline-orchestrator": {
                "receives": ["workflow-orchestrator"],
                "delegates": []
            },
            "auto-scaling-orchestrator": {
                "receives": ["workflow-orchestrator"],
                "delegates": []
            },
            "cascading-orchestrator": {
                "receives": ["workflow-orchestrator"],
                "delegates": []
            }
        }
    },
    "analyzers": {
        "receives_from_orchestrator": "workflow-orchestrator",
        "members": [
            "architecture-analyzer",
            "complexity-analyzer",
            "coverage-analyzer",
            "dependency-analyzer",
            "performance-analyzer"
        ]
    },
    "debuggers": {
        "receives_from_orchestrator": "workflow-orchestrator",
        "members": [
            "build-debugger",
            "network-debugger",
            "performance-debugger",
            "runtime-debugger",
            "state-debugger"
        ]
    },
    "generators": {
        "receives_from_orchestrator": "workflow-orchestrator",
        "members": [
            "code-generator",
            "documentation-generator",
            "migration-generator",
            "scaffold-generator",
            "test-generator"
        ]
    },
    "guardians": {
        "receives_from_orchestrator": "review-orchestrator",
        "members": [
            "accessibility-guardian",
            "compliance-guardian",
            "performance-guardian",
            "quality-guardian",
            "security-guardian"
        ]
    },
    "validators": {
        "receives_from_orchestrator": "review-orchestrator",
        "members": [
            "config-validator",
            "dependency-validator",
            "schema-validator",
            "security-validator",
            "type-validator"
        ]
    }
}


def find_agent_file(agent_name):
    """Find the full path to an agent file."""
    for agent_file in AGENTS_DIR.rglob(f"{agent_name}.md"):
        return agent_file
    return None


def add_collaboration_contract(agent_file, receives_from, delegates_to=None, dry_run=True):
    """Add collaboration contract to agent markdown file."""

    with open(agent_file, 'r') as f:
        content = f.read()

    # Check if contract already exists
    if re.search(r'##\s+Collaboration', content):
        print(f"⚠️  Skipping {agent_file.name} - already has collaboration contract")
        return False

    # Build contract
    contract = "\n## Collaboration\n\n"
    contract += "receives_from:\n"
    for source in receives_from:
        contract += f"  - {source}\n"

    if delegates_to and len(delegates_to) > 0:
        contract += "\ndelegates_to:\n"
        for target in delegates_to:
            contract += f"  - {target}\n"

    # Insert after Scope Boundaries section or Mission section
    if '## Scope Boundaries' in content:
        content = re.sub(
            r'(## Scope Boundaries.*?(?=\n##|\Z))',
            r'\1' + '\n' + contract,
            content,
            flags=re.DOTALL
        )
    elif '## Mission' in content:
        content = re.sub(
            r'(## Mission.*?\n\n)',
            r'\1' + contract,
            content,
            flags=re.DOTALL
        )
    else:
        # Insert after frontmatter
        content = re.sub(
            r'(---.*?---\n\n)',
            r'\1' + contract,
            content,
            flags=re.DOTALL
        )

    if dry_run:
        print(f"📝 DRY RUN - Would add contract to {agent_file.name}")
        print(f"   Receives: {receives_from}")
        if delegates_to:
            print(f"   Delegates: {delegates_to}")
    else:
        with open(agent_file, 'w') as f:
            f.write(content)
        print(f"✅ Added contract to {agent_file.name}")
        print(f"   Receives: {receives_from}")
        if delegates_to:
            print(f"   Delegates: {delegates_to}")

    return True


def process_team(team_name, dry_run=True):
    """Process all agents in a team."""
    if team_name not in TEAM_STRUCTURES:
        print(f"❌ Unknown team: {team_name}")
        return

    team = TEAM_STRUCTURES[team_name]
    modified = 0

    # Process lead if exists
    if "lead" in team:
        lead_file = find_agent_file(team["lead"])
        if lead_file:
            if add_collaboration_contract(
                lead_file,
                team["lead_receives"],
                team.get("lead_delegates", []),
                dry_run
            ):
                modified += 1

    # Process members
    if "members" in team:
        if isinstance(team["members"], dict):
            # Dictionary-based members (with specific contracts)
            for agent_name, config in team["members"].items():
                agent_file = find_agent_file(agent_name)
                if agent_file:
                    if add_collaboration_contract(
                        agent_file,
                        config["receives"],
                        config.get("delegates", []),
                        dry_run
                    ):
                        modified += 1
        elif isinstance(team["members"], list):
            # List-based members (simple orchestrator pattern)
            orchestrator = team.get("receives_from_orchestrator", "workflow-orchestrator")
            for agent_name in team["members"]:
                agent_file = find_agent_file(agent_name)
                if agent_file:
                    if add_collaboration_contract(
                        agent_file,
                        [orchestrator],
                        [],
                        dry_run
                    ):
                        modified += 1

    print(f"\n{'DRY RUN: Would modify' if dry_run else 'Modified'} {modified} agents in {team_name} team\n")


def main():
    parser = argparse.ArgumentParser(
        description="Add collaboration contracts to orphaned agents"
    )
    parser.add_argument(
        "--team",
        choices=list(TEAM_STRUCTURES.keys()) + ["all"],
        help="Team to process"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Show what would be changed without modifying files (default)"
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually modify the files"
    )

    args = parser.parse_args()

    # Default to dry-run unless --apply is specified
    dry_run = not args.apply

    if dry_run:
        print("🔍 DRY RUN MODE - No files will be modified\n")
    else:
        print("⚠️  APPLY MODE - Files will be modified!\n")

    if args.team:
        if args.team == "all":
            for team_name in TEAM_STRUCTURES.keys():
                process_team(team_name, dry_run)
        else:
            process_team(args.team, dry_run)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
