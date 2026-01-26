#!/usr/bin/env bash
# Agent Consolidation Script
# Consolidates duplicate agents and converts markdown agents to YAML

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="/Users/louisherman/ClaudeCodeProjects"
ROOT_AGENTS="$PROJECT_ROOT/.claude/agents"
DMB_AGENTS="$PROJECT_ROOT/projects/dmb-almanac/.claude/agents"
TEMPLATE="$PROJECT_ROOT/.claude/templates/agents/agent_template.yaml"

DRY_RUN=true

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --execute)
      DRY_RUN=false
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--execute]"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}=== Agent Consolidation ===${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}DRY RUN MODE${NC} - No changes will be made"
  echo "Run with --execute to apply changes"
  echo ""
fi

# Phase 1: Delete duplicate agents from dmb-almanac
echo -e "${BLUE}Phase 1: Remove Duplicate Agents from dmb-almanac${NC}"
echo "Strategy: Keep root as authoritative, remove dmb-almanac duplicates"
echo ""

duplicate_count=0
deleted_count=0

# List of all duplicate agents (50 total from audit)
duplicates=(
  "analyzers/static.yaml"
  "analyzers/semantic.yaml"
  "analyzers/performance.yaml"
  "analyzers/dependency.yaml"
  "analyzers/impact.yaml"
  "debuggers/build.yaml"
  "debuggers/error_diagnosis.yaml"
  "debuggers/integration.yaml"
  "debuggers/performance.yaml"
  "debuggers/test_failure.yaml"
  "generators/code.yaml"
  "generators/config.yaml"
  "generators/data.yaml"
  "generators/documentation.yaml"
  "generators/test.yaml"
  "guardians/compliance_checker.yaml"
  "guardians/privacy_validator.yaml"
  "guardians/rate_limiter.yaml"
  "guardians/secret_detector.yaml"
  "guardians/security_scanner.yaml"
  "integrators/adapter.yaml"
  "integrators/api_client.yaml"
  "integrators/database.yaml"
  "integrators/message_queue.yaml"
  "integrators/third_party.yaml"
  "learners/codebase_indexer.yaml"
  "learners/context_builder.yaml"
  "learners/convention_extractor.yaml"
  "learners/domain_modeler.yaml"
  "learners/pattern_miner.yaml"
  "orchestrators/consensus.yaml"
  "orchestrators/delegation.yaml"
  "orchestrators/pipeline.yaml"
  "orchestrators/swarm.yaml"
  "orchestrators/workflow.yaml"
  "reporters/audit_trail.yaml"
  "reporters/metrics.yaml"
  "reporters/notification.yaml"
  "reporters/summary.yaml"
  "reporters/visualization.yaml"
  "transformers/format.yaml"
  "transformers/migrate.yaml"
  "transformers/optimize.yaml"
  "transformers/refactor.yaml"
  "transformers/translate.yaml"
  "validators/schema.yaml"
  "validators/security.yaml"
  "validators/style.yaml"
  "validators/syntax.yaml"
  "validators/test.yaml"
)

for agent_path in "${duplicates[@]}"; do
  dmb_file="$DMB_AGENTS/$agent_path"

  if [ -f "$dmb_file" ]; then
    echo -e "${YELLOW}✓ Removing duplicate: $agent_path${NC}"

    if [ "$DRY_RUN" = false ]; then
      rm "$dmb_file"
      deleted_count=$((deleted_count + 1))
    fi
    duplicate_count=$((duplicate_count + 1))
  fi
done

echo ""
echo -e "${GREEN}Duplicates removed: $duplicate_count${NC}"
echo ""

# Phase 2: Convert markdown agents to YAML
echo -e "${BLUE}Phase 2: Convert Markdown Agents to YAML${NC}"
echo ""

md_agents=(
  "self-improving/recursive-optimizer"
  "self-improving/feedback-loop-optimizer"
  "self-improving/meta-learner"
  "quantum-parallel/wave-function-optimizer"
  "quantum-parallel/massive-parallel-coordinator"
  "quantum-parallel/superposition-executor"
)

converted_count=0

for md_path in "${md_agents[@]}"; do
  category=$(dirname "$md_path")
  agent_name=$(basename "$md_path")
  md_file="$ROOT_AGENTS/$category/$agent_name.md"
  yaml_file="$ROOT_AGENTS/$category/$agent_name.yaml"

  if [ ! -f "$md_file" ]; then
    echo -e "${RED}✗ Markdown file not found: $md_path${NC}"
    continue
  fi

  if [ -f "$yaml_file" ]; then
    echo -e "${YELLOW}⊘ YAML already exists: $agent_name${NC}"
    continue
  fi

  # Extract description from markdown
  description=$(grep -v '^#' "$md_file" | grep -v '^```' | grep -v '^$' | head -1 | sed 's/^[*-] //' | cut -c1-120)

  if [ -z "$description" ]; then
    description="Advanced optimization agent"
  fi

  # Determine tier based on category
  if [[ "$category" == "quantum-parallel" ]]; then
    tier="opus"
  elif [[ "$category" == "self-improving" ]]; then
    tier="sonnet"
  else
    tier="sonnet"
  fi

  # Generate agent ID
  agent_id=$(echo "$agent_name" | sed 's/-/_/g')

  echo -e "${GREEN}✓ Converting: $agent_name → $agent_id${NC}"

  if [ "$DRY_RUN" = false ]; then
    # Create YAML file from template
    cat > "$yaml_file" <<EOF
agent:
  id: $agent_id
  name: $(echo "$agent_name" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1')
  version: 1.0.0
  description: $description

  model_tier: $tier

  category: $category
  tags:
    - optimization
    - advanced
    - $(echo "$category" | sed 's/-/ /g')

  capabilities:
    - Advanced optimization strategies
    - Performance improvement
    - System-level enhancements

  collaboration:
    works_with:
      - orchestrators
      - analyzers
    delegates_to: []
    escalates_to: []

  parallel_capable: true
  can_be_parallelized: false

  # Converted from markdown on $(date +%Y-%m-%d)
  migrated_from: $md_path.md
EOF

    # Append original markdown as documentation
    echo "" >> "$yaml_file"
    echo "# Documentation" >> "$yaml_file"
    echo "" >> "$yaml_file"
    cat "$md_file" >> "$yaml_file"

    converted_count=$((converted_count + 1))
  fi
done

echo ""
echo -e "${GREEN}Markdown agents converted: ${#md_agents[@]}${NC}"
echo ""

# Phase 3: Clean up empty directories
echo -e "${BLUE}Phase 3: Clean Up Empty Directories${NC}"
echo ""

if [ "$DRY_RUN" = false ]; then
  # Remove empty directories in dmb-almanac
  find "$DMB_AGENTS" -type d -empty -delete 2>/dev/null || true
  echo -e "${GREEN}✓ Empty directories removed${NC}"
else
  echo -e "${YELLOW}Would remove empty directories in dmb-almanac${NC}"
fi

echo ""

# Summary
echo -e "${GREEN}=== Summary ===${NC}"
echo -e "Duplicate agents removed: ${GREEN}$duplicate_count${NC}"
echo -e "Markdown agents converted: ${GREEN}${#md_agents[@]}${NC}"
echo ""

if [ "$DRY_RUN" = false ]; then
  echo -e "${BLUE}Final Agent Count:${NC}"
  total_agents=$(find "$ROOT_AGENTS" -name "*.yaml" ! -path "*template*" ! -path "*agent-api-spec*" -type f | wc -l | tr -d ' ')
  echo -e "  Root .claude/agents: ${GREEN}$total_agents${NC} agents"

  dmb_remaining=$(find "$DMB_AGENTS" -name "*.yaml" -type f 2>/dev/null | wc -l | tr -d ' ')
  echo -e "  DMB .claude/agents:  ${GREEN}$dmb_remaining${NC} agents"
  echo ""

  if [ "$dmb_remaining" -gt 0 ]; then
    echo -e "${YELLOW}Note: $dmb_remaining agents remain in dmb-almanac (project-specific)${NC}"
  else
    echo -e "${GREEN}✓ All agents consolidated to root${NC}"
  fi
else
  echo -e "${YELLOW}This was a dry run. Run with --execute to apply changes.${NC}"
fi

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Update route table with new agents (markdown conversions)"
echo "2. Run tier reassignment script for cost optimization"
echo "3. Verify all agents are invokable"
echo ""
