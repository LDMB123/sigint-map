#!/usr/bin/env bash
# Agent Routing Coverage Audit
# Identifies orphaned agents not in route table

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AGENTS_DIR="$PROJECT_ROOT/.claude/agents"
ROUTE_TABLE="$PROJECT_ROOT/.claude/config/route-table.json"
OUTPUT_DIR="$PROJECT_ROOT/.claude/audit"
OUTPUT_FILE="$OUTPUT_DIR/agent-routing-$(date +%Y%m%d-%H%M%S).json"

mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}=== Agent Routing Coverage Audit ===${NC}"
echo ""

# Extract all agent IDs from YAML files
echo -e "${YELLOW}Scanning agent definitions...${NC}"
agent_ids=$(find "$AGENTS_DIR" -name "*.yaml" -type f -exec grep -h "^  id:" {} \; 2>/dev/null | sed 's/.*id: *//' | sort -u)
total_agents=$(echo "$agent_ids" | grep -c . || echo "0")

echo -e "${GREEN}Found $total_agents agents in YAML files${NC}"
echo ""

# Extract routed agents from route table
echo -e "${YELLOW}Checking route table...${NC}"

if [ ! -f "$ROUTE_TABLE" ]; then
  echo -e "${RED}Error: Route table not found at $ROUTE_TABLE${NC}"
  exit 1
fi

# Get agents from routes (hex key routes)
routed_semantic=$(jq -r '
  .routes // {} |
  to_entries[] |
  .value.agent // empty
' "$ROUTE_TABLE" 2>/dev/null | sort -u || echo "")

# Get agents from category routes if they exist
routed_category=$(jq -r '
  .category_routes // {} |
  .. | .agent? // empty
' "$ROUTE_TABLE" 2>/dev/null | sort -u || echo "")

# Combine and deduplicate
routed_agents=$(echo -e "$routed_semantic\n$routed_category" | sort -u | grep -v '^$')
total_routed=$(echo "$routed_agents" | grep -c . || echo "0")

echo -e "${GREEN}Found $total_routed agents in route table${NC}"
echo ""

# Find orphaned agents (in YAML but not routed)
echo -e "${YELLOW}Identifying orphaned agents...${NC}"
orphaned=$(comm -23 <(echo "$agent_ids") <(echo "$routed_agents") || echo "")
orphan_count=$(echo "$orphaned" | grep -c . || echo "0")

# Find phantom routes (routed but no YAML)
phantoms=$(comm -13 <(echo "$agent_ids") <(echo "$routed_agents") || echo "")
phantom_count=$(echo "$phantoms" | grep -c . || echo "0")

# Calculate coverage
if [ "$total_agents" -gt 0 ]; then
  coverage=$((total_routed * 100 / total_agents))
else
  coverage=0
fi

echo -e "${BLUE}Coverage Analysis:${NC}"
echo -e "  Total agents: $total_agents"
echo -e "  Routed agents: $total_routed"
echo -e "  Orphaned agents: ${YELLOW}$orphan_count${NC}"
echo -e "  Phantom routes: ${RED}$phantom_count${NC}"
echo -e "  Coverage rate: ${GREEN}${coverage}%${NC}"
echo ""

# Categorize orphaned agents by functional category
echo -e "${YELLOW}Categorizing orphaned agents...${NC}"

declare -A orphan_by_category

while IFS= read -r agent_id; do
  [ -z "$agent_id" ] && continue

  # Find the YAML file containing this agent
  agent_file=$(find "$AGENTS_DIR" -name "*.yaml" -type f -exec grep -l "^  id: *$agent_id" {} \; | head -1)

  if [ -n "$agent_file" ]; then
    # Extract functional category
    category=$(grep "^  functional_category:" "$agent_file" | head -1 | sed 's/.*functional_category: *//' || echo "unknown")

    # Extract model tier
    tier=$(grep "^  model_tier:" "$agent_file" | head -1 | sed 's/.*model_tier: *//' || echo "unknown")

    # Track by category
    if [ -n "$category" ]; then
      orphan_by_category[$category]=$((${orphan_by_category[$category]:-0} + 1))
    fi

    echo "  ${agent_id} ($category, $tier)"
  fi
done <<< "$orphaned"

echo ""

# Generate JSON report
echo -e "${YELLOW}Generating JSON report...${NC}"

# Build orphaned agents array with metadata
if [ "$orphan_count" -gt 0 ]; then
  orphaned_json="["
  first=true
  while IFS= read -r agent_id; do
    [ -z "$agent_id" ] && continue

    agent_file=$(find "$AGENTS_DIR" -name "*.yaml" -type f -exec grep -l "^  id: *$agent_id" {} \; | head -1)

    if [ -n "$agent_file" ]; then
      category=$(grep "^  functional_category:" "$agent_file" | head -1 | sed 's/.*functional_category: *//' || echo "unknown")
      tier=$(grep "^  model_tier:" "$agent_file" | head -1 | sed 's/.*model_tier: *//' || echo "unknown")
      name=$(grep "^  name:" "$agent_file" | head -1 | sed 's/.*name: *//' || echo "")

      if [ "$first" = true ]; then
        first=false
      else
        orphaned_json+=","
      fi

      orphaned_json+=$(cat <<EOF

    {
      "id": "$agent_id",
      "name": "$name",
      "category": "$category",
      "tier": "$tier",
      "file": "${agent_file#$PROJECT_ROOT/}"
    }
EOF
)
    fi
  done <<< "$orphaned"

  orphaned_json+="
  ]"
else
  orphaned_json="[]"
fi

# Build phantoms array
phantoms_json="["
first=true
while IFS= read -r agent_id; do
  [ -z "$agent_id" ] && continue

  if [ "$first" = true ]; then
    first=false
  else
    phantoms_json+=","
  fi

  phantoms_json+="
    \"$agent_id\""
done <<< "$phantoms"

phantoms_json+="
  ]"

# Build category summary
if [ "${#orphan_by_category[@]}" -gt 0 ]; then
  categories_json="{"
  first=true
  for category in "${!orphan_by_category[@]}"; do
    if [ "$first" = true ]; then
      first=false
    else
      categories_json+=","
    fi
    categories_json+="
    \"$category\": ${orphan_by_category[$category]}"
  done
  categories_json+="
  }"
else
  categories_json="{}"
fi

# Build final report
report=$(cat <<EOF
{
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "summary": {
    "total_agents": $total_agents,
    "routed_agents": $total_routed,
    "orphaned_agents": $orphan_count,
    "phantom_routes": $phantom_count,
    "coverage_rate": $coverage
  },
  "orphaned_by_category": $categories_json,
  "orphaned_agents": $orphaned_json,
  "phantom_routes": $phantoms_json
}
EOF
)

echo "$report" | jq '.' > "$OUTPUT_FILE"

echo ""
echo -e "${GREEN}✓ Audit complete${NC}"
echo ""
echo -e "${BLUE}Orphaned agents by category:${NC}"
for category in $(echo "$categories_json" | jq -r 'keys[]' 2>/dev/null | sort); do
  count=$(echo "$categories_json" | jq -r ".\"$category\"")
  echo -e "  ${category}: ${count} agents"
done

echo ""
if [ "$phantom_count" -gt 0 ]; then
  echo -e "${RED}⚠ Warning: $phantom_count phantom routes detected${NC}"
  echo -e "${RED}  These routes point to non-existent agents:${NC}"
  echo "$phantoms" | while read -r phantom; do
    [ -n "$phantom" ] && echo -e "    - $phantom"
  done
  echo ""
fi

echo -e "${GREEN}Full report saved to: $OUTPUT_FILE${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Add category-based routing for orphaned agents"
echo -e "  2. Update route table with missing agents"
echo -e "  3. Remove phantom routes (if any)"
echo -e "  4. Test routing for all 63 agents"
