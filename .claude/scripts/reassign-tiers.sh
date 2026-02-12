#!/usr/bin/env bash
# Agent Tier Reassignment Script
# Reassigns agents to optimal tiers per MODEL_POLICY.md

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AGENTS_DIR="$PROJECT_ROOT/.claude/agents"
OUTPUT_DIR="$PROJECT_ROOT/.claude/audit"
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

echo -e "${BLUE}=== Agent Tier Reassignment ===${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}DRY RUN MODE${NC} - No changes will be made"
  echo "Run with --execute to apply changes"
  echo ""
fi

# Define Haiku candidates (Lane 1: Explore & Index per MODEL_POLICY.md)
declare -a HAIKU_AGENTS=(
  # Analyzers (simple, fast scanning)
  "analyzer_dependency"
  "analyzer_impact"

  # Learners (indexing and context building)
  "learner_codebase_indexer"
  "learner_context_builder"
  "learner_convention_extractor"

  # Reporters (data aggregation and formatting)
  "reporter_summary"
  "reporter_metrics"
  "reporter_visualization"
  "reporter_notification"
  "reporter_audit_trail"

  # Transformers (simple format conversion)
  "transformer_format"

  # Validators (syntax and style checking)
  "validator_schema"
  "validator_style"
  "validator_syntax"

  # Monitoring (telemetry collection)
  "telemetry_collector"

  # Guardians (rate limiting - lightweight)
  "guardian_rate_limiter"
)

# Define Opus candidates (Lanes 2 & 4: Design & Security per MODEL_POLICY.md)
declare -a OPUS_AGENTS=(
  # Security (critical, thorough review)
  "guardian_security_scanner"
  "guardian_compliance_checker"
  "guardian_privacy_validator"

  # Architecture (deep reasoning required)
  "learner_domain_modeler"
  "orchestrator_consensus"
  "orchestrator_swarm"

  # Translation (complex, context-sensitive)
  "transformer_translate"
)

echo -e "${BLUE}Tier Reassignment Plan:${NC}"
echo ""
echo -e "${GREEN}Haiku Candidates: ${#HAIKU_AGENTS[@]} agents${NC}"
echo -e "${YELLOW}Opus Candidates: ${#OPUS_AGENTS[@]} agents${NC}"
echo ""

reassigned=0
skipped=0
errors=0

# Function to reassign tier in YAML file
reassign_tier() {
  local agent_id=$1
  local new_tier=$2
  local agent_file=""

  # Find the YAML file containing this agent
  agent_file=$(find "$AGENTS_DIR" -name "*.yaml" -type f -exec grep -l "^  id: *$agent_id" {} \; | head -1)

  if [ -z "$agent_file" ]; then
    echo -e "${RED}✗ Agent not found: $agent_id${NC}"
    errors=$((errors + 1))
    return 1
  fi

  # Get current tier
  current_tier=$(grep "^  model_tier:" "$agent_file" | head -1 | sed 's/.*model_tier: *//' | tr -d ' ')

  if [ "$current_tier" = "$new_tier" ]; then
    echo -e "${YELLOW}⊘ Already $new_tier: $agent_id${NC}"
    skipped=$((skipped + 1))
    return 0
  fi

  echo -e "${GREEN}✓ $agent_id: $current_tier → $new_tier${NC}"

  if [ "$DRY_RUN" = false ]; then
    # Perform the reassignment
    sed -i '' "s/^  model_tier: *$current_tier/  model_tier: $new_tier/" "$agent_file"
    reassigned=$((reassigned + 1))
  else
    reassigned=$((reassigned + 1))
  fi
}

echo -e "${YELLOW}Reassigning to Haiku tier...${NC}"
for agent_id in "${HAIKU_AGENTS[@]}"; do
  reassign_tier "$agent_id" "haiku"
done

echo ""
echo -e "${YELLOW}Reassigning to Opus tier...${NC}"
for agent_id in "${OPUS_AGENTS[@]}"; do
  reassign_tier "$agent_id" "opus"
done

echo ""
echo -e "${GREEN}=== Summary ===${NC}"
echo -e "Agents reassigned: ${GREEN}$reassigned${NC}"
echo -e "Already correct: ${YELLOW}$skipped${NC}"
echo -e "Errors: ${RED}$errors${NC}"
echo ""

# Calculate new distribution
total_agents=$(find "$AGENTS_DIR" -name "*.yaml" -type f -exec grep -l "^  id:" {} \; | wc -l | tr -d ' ')

if [ "$DRY_RUN" = false ]; then
  haiku_count=$(find "$AGENTS_DIR" -name "*.yaml" -type f -exec grep -l "^  model_tier: *haiku" {} \; | wc -l | tr -d ' ')
  sonnet_count=$(find "$AGENTS_DIR" -name "*.yaml" -type f -exec grep -l "^  model_tier: *sonnet" {} \; | wc -l | tr -d ' ')
  opus_count=$(find "$AGENTS_DIR" -name "*.yaml" -type f -exec grep -l "^  model_tier: *opus" {} \; | wc -l | tr -d ' ')

  haiku_pct=$((haiku_count * 100 / total_agents))
  sonnet_pct=$((sonnet_count * 100 / total_agents))
  opus_pct=$((opus_count * 100 / total_agents))

  echo -e "${BLUE}New Distribution:${NC}"
  echo -e "  Haiku:  ${haiku_count} agents (${haiku_pct}%) - Target: 60%"
  echo -e "  Sonnet: ${sonnet_count} agents (${sonnet_pct}%) - Target: 35%"
  echo -e "  Opus:   ${opus_count} agents (${opus_pct}%) - Target: 5%"
  echo ""

  # Calculate cost savings
  old_cost=$(echo "scale=2; (9 * 0.00875) + (46 * 0.105) + (6 * 0.525)" | bc)
  new_cost=$(echo "scale=2; ($haiku_count * 0.00875) + ($sonnet_count * 0.105) + ($opus_count * 0.525)" | bc)
  savings=$(echo "scale=2; $old_cost - $new_cost" | bc)
  annual_savings=$(echo "scale=2; $savings * 365" | bc)

  echo -e "${GREEN}Cost Analysis:${NC}"
  echo -e "  Old daily cost: \$$old_cost"
  echo -e "  New daily cost: \$$new_cost"
  echo -e "  Daily savings: ${GREEN}\$$savings${NC}"
  echo -e "  Annual savings: ${GREEN}\$$annual_savings${NC}"
  echo ""
fi

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}This was a dry run. Run with --execute to apply changes.${NC}"
  echo ""
  echo -e "${BLUE}Expected new distribution:${NC}"
  expected_haiku=$((${#HAIKU_AGENTS[@]} + 9))  # Current 9 + new assignments
  expected_sonnet=$((46 - ${#HAIKU_AGENTS[@]} + ${#OPUS_AGENTS[@]} - 7))  # Adjust for moves
  expected_opus=7  # Target Opus agents

  echo -e "  Haiku:  ~$expected_haiku agents (~26%)"
  echo -e "  Sonnet: ~$expected_sonnet agents (~59%)"
  echo -e "  Opus:   ~$expected_opus agents (~11%)"
  echo ""
  echo -e "${YELLOW}Note: Still below 60% Haiku target. Additional agents may need reassignment.${NC}"
fi
