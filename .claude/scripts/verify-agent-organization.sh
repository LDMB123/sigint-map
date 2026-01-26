#!/usr/bin/env bash
# Exhaustive Agent Organization Verification
# Leaves no stone unturned - checks EVERY aspect of agent organization

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

PROJECT_ROOT="/Users/louisherman/ClaudeCodeProjects"
ROOT_AGENTS="$PROJECT_ROOT/.claude/agents"
ROUTE_TABLE="$PROJECT_ROOT/.claude/config/route-table.json"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  EXHAUSTIVE AGENT ORGANIZATION VERIFICATION               ║${NC}"
echo -e "${BLUE}║  Leaving no stone unturned                                ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Track all issues
declare -a issues
declare -a warnings
declare -a successes

# ============================================================================
# CHECK 1: Find ALL YAML files that could be agents
# ============================================================================
echo -e "${CYAN}[CHECK 1] Scanning for ALL YAML files in project...${NC}"

all_yaml_files=$(find "$PROJECT_ROOT" -type f \( -name "*.yaml" -o -name "*.yml" \) ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null)
yaml_count=$(echo "$all_yaml_files" | wc -l | tr -d ' ')

echo -e "  Found: ${BLUE}$yaml_count${NC} YAML files"

# Identify agent files
agent_files=$(echo "$all_yaml_files" | grep -i agent || true)
agent_file_count=$(echo "$agent_files" | grep -v '^$' | wc -l | tr -d ' ')

echo -e "  Agent-related: ${BLUE}$agent_file_count${NC} files"
echo ""

# ============================================================================
# CHECK 2: Verify root .claude/agents structure
# ============================================================================
echo -e "${CYAN}[CHECK 2] Verifying root .claude/agents structure...${NC}"

root_yaml_count=$(find "$ROOT_AGENTS" -name "*.yaml" ! -name "*template*" ! -name "*api-spec*" -type f | wc -l | tr -d ' ')
echo -e "  Root agents: ${GREEN}$root_yaml_count${NC} YAML files"

# Check each root agent has valid structure
bad_agents=0
good_agents=0

while IFS= read -r agent_file; do
  # Check for required fields
  has_id=$(grep -c '^  id:' "$agent_file" || true)
  has_name=$(grep -c '^  name:' "$agent_file" || true)
  has_tier=$(grep -c '^  model_tier:' "$agent_file" || true)

  if [ "$has_id" -eq 0 ] || [ "$has_name" -eq 0 ] || [ "$has_tier" -eq 0 ]; then
    issues+=("INVALID STRUCTURE: $agent_file (missing id, name, or model_tier)")
    bad_agents=$((bad_agents + 1))
  else
    good_agents=$((good_agents + 1))
  fi
done < <(find "$ROOT_AGENTS" -name "*.yaml" ! -name "*template*" ! -name "*api-spec*" -type f)

if [ "$bad_agents" -eq 0 ]; then
  successes+=("All $good_agents root agents have valid YAML structure")
  echo -e "  ${GREEN}✓ All root agents have valid structure${NC}"
else
  echo -e "  ${RED}✗ $bad_agents agents have invalid structure${NC}"
fi
echo ""

# ============================================================================
# CHECK 3: Check for duplicate agents ANYWHERE in project
# ============================================================================
echo -e "${CYAN}[CHECK 3] Scanning for duplicate agents across entire project...${NC}"

# Get all agent IDs from root
declare -A root_agent_ids

while IFS= read -r agent_file; do
  agent_id=$(grep '^  id:' "$agent_file" 2>/dev/null | head -1 | sed 's/.*id: *//' || true)
  if [ -n "$agent_id" ]; then
    root_agent_ids[$agent_id]=$agent_file
  fi
done < <(find "$ROOT_AGENTS" -name "*.yaml" ! -name "*template*" ! -name "*api-spec*" -type f)

# Search for any other agent files with same IDs
duplicates_found=0

for agent_id in "${!root_agent_ids[@]}"; do
  # Search entire project for this agent ID
  other_locations=$(find "$PROJECT_ROOT" -name "*.yaml" ! -path "$ROOT_AGENTS/*" -type f -exec grep -l "^  id: *$agent_id" {} \; 2>/dev/null || true)

  if [ -n "$other_locations" ]; then
    issues+=("DUPLICATE AGENT: $agent_id exists in multiple locations")
    echo -e "  ${RED}✗ Duplicate: $agent_id${NC}"
    echo "$other_locations" | while read -r dup_file; do
      echo -e "    - $dup_file"
    done
    duplicates_found=$((duplicates_found + 1))
  fi
done

if [ "$duplicates_found" -eq 0 ]; then
  successes+=("No duplicate agents found across entire project")
  echo -e "  ${GREEN}✓ No duplicates found${NC}"
else
  echo -e "  ${RED}✗ Found $duplicates_found duplicate agents${NC}"
fi
echo ""

# ============================================================================
# CHECK 4: Verify ALL root agents are in route table
# ============================================================================
echo -e "${CYAN}[CHECK 4] Verifying ALL root agents are routable...${NC}"

# Extract all routable agents from route table
routed_agents=$(jq -r '
  ((.routes // {} | to_entries[] | .value.agent // empty),
   (.category_routes // {} | to_entries[] | .value | to_entries[] | .value.agent // empty))
' "$ROUTE_TABLE" 2>/dev/null | sort -u)

orphaned_agents=0

for agent_id in "${!root_agent_ids[@]}"; do
  if ! echo "$routed_agents" | grep -q "^$agent_id$"; then
    issues+=("ORPHANED AGENT: $agent_id not in route table")
    echo -e "  ${RED}✗ Orphaned: $agent_id${NC}"
    orphaned_agents=$((orphaned_agents + 1))
  fi
done

if [ "$orphaned_agents" -eq 0 ]; then
  successes+=("All ${#root_agent_ids[@]} agents are routable")
  echo -e "  ${GREEN}✓ All ${#root_agent_ids[@]} agents are routable${NC}"
else
  echo -e "  ${RED}✗ Found $orphaned_agents orphaned agents${NC}"
fi
echo ""

# ============================================================================
# CHECK 5: Check for phantom routes (routes pointing to non-existent agents)
# ============================================================================
echo -e "${CYAN}[CHECK 5] Checking for phantom routes...${NC}"

phantom_count=0

while IFS= read -r routed_agent; do
  if [[ ! -v root_agent_ids[$routed_agent] ]]; then
    warnings+=("PHANTOM ROUTE: $routed_agent in route table but no agent file exists")
    echo -e "  ${YELLOW}⚠ Phantom route: $routed_agent${NC}"
    phantom_count=$((phantom_count + 1))
  fi
done <<< "$routed_agents"

if [ "$phantom_count" -eq 0 ]; then
  successes+=("No phantom routes found")
  echo -e "  ${GREEN}✓ No phantom routes${NC}"
else
  echo -e "  ${YELLOW}⚠ Found $phantom_count phantom routes (routes without agent files)${NC}"
fi
echo ""

# ============================================================================
# CHECK 6: Verify no markdown-only agents remain
# ============================================================================
echo -e "${CYAN}[CHECK 6] Checking for markdown-only agents...${NC}"

md_agents=$(find "$ROOT_AGENTS" -name "*.md" ! -name "INDEX.md" ! -name "README.md" ! -name "ARCHITECTURE.md" -type f 2>/dev/null || true)
md_count=$(echo "$md_agents" | grep -v '^$' | wc -l | tr -d ' ')

if [ "$md_count" -eq 0 ]; then
  successes+=("No markdown-only agents found")
  echo -e "  ${GREEN}✓ No markdown-only agents${NC}"
else
  while IFS= read -r md_file; do
    agent_name=$(basename "$md_file" .md)
    yaml_file="${md_file%.md}.yaml"

    if [ ! -f "$yaml_file" ]; then
      issues+=("MARKDOWN-ONLY AGENT: $agent_name has no YAML equivalent")
      echo -e "  ${RED}✗ Markdown-only: $agent_name${NC}"
      echo -e "    File: $md_file"
    fi
  done <<< "$md_agents"
fi
echo ""

# ============================================================================
# CHECK 7: Verify model tier distribution
# ============================================================================
echo -e "${CYAN}[CHECK 7] Analyzing model tier distribution...${NC}"

haiku_count=0
sonnet_count=0
opus_count=0
unknown_count=0

for agent_id in "${!root_agent_ids[@]}"; do
  agent_file="${root_agent_ids[$agent_id]}"
  tier=$(grep '^  model_tier:' "$agent_file" 2>/dev/null | head -1 | sed 's/.*model_tier: *//' | tr -d ' ')

  case "$tier" in
    haiku)
      haiku_count=$((haiku_count + 1))
      ;;
    sonnet)
      sonnet_count=$((sonnet_count + 1))
      ;;
    opus)
      opus_count=$((opus_count + 1))
      ;;
    *)
      unknown_count=$((unknown_count + 1))
      issues+=("UNKNOWN TIER: $agent_id has tier '$tier'")
      ;;
  esac
done

total_agents=${#root_agent_ids[@]}
haiku_pct=$((haiku_count * 100 / total_agents))
sonnet_pct=$((sonnet_count * 100 / total_agents))
opus_pct=$((opus_count * 100 / total_agents))

echo -e "  Haiku:  ${GREEN}$haiku_count${NC} agents (${haiku_pct}%)"
echo -e "  Sonnet: ${BLUE}$sonnet_count${NC} agents (${sonnet_pct}%)"
echo -e "  Opus:   ${MAGENTA}$opus_count${NC} agents (${opus_pct}%)"

if [ "$unknown_count" -gt 0 ]; then
  echo -e "  ${RED}Unknown: $unknown_count agents${NC}"
fi

successes+=("Tier distribution: $haiku_pct% Haiku, $sonnet_pct% Sonnet, $opus_pct% Opus")
echo ""

# ============================================================================
# CHECK 8: Check for agents outside .claude/agents
# ============================================================================
echo -e "${CYAN}[CHECK 8] Checking for agents outside root .claude/agents...${NC}"

outside_agents=$(find "$PROJECT_ROOT" -name "*.yaml" -type f ! -path "$ROOT_AGENTS/*" ! -path "*/node_modules/*" ! -path "*/.git/*" -exec grep -l '^agent:' {} \; 2>/dev/null || true)
outside_count=$(echo "$outside_agents" | grep -v '^$' | wc -l | tr -d ' ')

if [ "$outside_count" -eq 0 ]; then
  successes+=("No agents found outside root .claude/agents directory")
  echo -e "  ${GREEN}✓ No agents outside root directory${NC}"
else
  echo -e "  ${YELLOW}⚠ Found $outside_count agents outside root${NC}"
  echo "$outside_agents" | while IFS= read -r outside_file; do
    warnings+=("MISPLACED AGENT: $outside_file")
    echo -e "    - $outside_file"
  done
fi
echo ""

# ============================================================================
# CHECK 9: Verify agent category structure
# ============================================================================
echo -e "${CYAN}[CHECK 9] Verifying agent category organization...${NC}"

categories=$(find "$ROOT_AGENTS" -mindepth 1 -maxdepth 1 -type d ! -name "shared" ! -name "templates" ! -name "documentation" 2>/dev/null || true)
category_count=$(echo "$categories" | grep -v '^$' | wc -l | tr -d ' ')

echo -e "  Categories: ${BLUE}$category_count${NC}"

empty_categories=0

while IFS= read -r category_dir; do
  category_name=$(basename "$category_dir")
  agent_count=$(find "$category_dir" -name "*.yaml" -type f | wc -l | tr -d ' ')

  if [ "$agent_count" -eq 0 ]; then
    warnings+=("EMPTY CATEGORY: $category_name has no agents")
    echo -e "  ${YELLOW}⚠ Empty: $category_name${NC}"
    empty_categories=$((empty_categories + 1))
  else
    echo -e "  ${GREEN}✓ $category_name: $agent_count agents${NC}"
  fi
done <<< "$categories"

if [ "$empty_categories" -eq 0 ]; then
  successes+=("All $category_count categories have agents")
fi
echo ""

# ============================================================================
# CHECK 10: Verify consistent agent naming
# ============================================================================
echo -e "${CYAN}[CHECK 10] Verifying agent ID/filename consistency...${NC}"

naming_issues=0

for agent_id in "${!root_agent_ids[@]}"; do
  agent_file="${root_agent_ids[$agent_id]}"
  filename=$(basename "$agent_file" .yaml)

  # Convert agent_id to expected filename format
  expected_filename=$(echo "$agent_id" | sed 's/_/-/g')

  # Also check reverse: filename to ID
  filename_to_id=$(echo "$filename" | sed 's/-/_/g')

  if [ "$filename" != "$expected_filename" ] && [ "$agent_id" != "$filename_to_id" ]; then
    warnings+=("NAMING INCONSISTENCY: Agent ID '$agent_id' in file '$filename.yaml'")
    echo -e "  ${YELLOW}⚠ ID/filename mismatch: $agent_id vs $filename${NC}"
    naming_issues=$((naming_issues + 1))
  fi
done

if [ "$naming_issues" -eq 0 ]; then
  successes+=("All agent IDs match filenames")
  echo -e "  ${GREEN}✓ All agent IDs match filenames${NC}"
else
  echo -e "  ${YELLOW}⚠ Found $naming_issues naming inconsistencies${NC}"
fi
echo ""

# ============================================================================
# FINAL REPORT
# ============================================================================
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  VERIFICATION SUMMARY                                     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✓ Successes: ${#successes[@]}${NC}"
for success in "${successes[@]}"; do
  echo -e "  ${GREEN}✓${NC} $success"
done
echo ""

if [ "${#warnings[@]}" -gt 0 ]; then
  echo -e "${YELLOW}⚠ Warnings: ${#warnings[@]}${NC}"
  for warning in "${warnings[@]}"; do
    echo -e "  ${YELLOW}⚠${NC} $warning"
  done
  echo ""
fi

if [ "${#issues[@]}" -gt 0 ]; then
  echo -e "${RED}✗ Issues: ${#issues[@]}${NC}"
  for issue in "${issues[@]}"; do
    echo -e "  ${RED}✗${NC} $issue"
  done
  echo ""
fi

# Overall status
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
if [ "${#issues[@]}" -eq 0 ]; then
  echo -e "${GREEN}✓ ORGANIZATION VERIFIED: All agents properly organized${NC}"
  echo -e "${GREEN}✓ Total agents: $total_agents${NC}"
  echo -e "${GREEN}✓ All routable: 100%${NC}"
  echo -e "${GREEN}✓ No duplicates${NC}"
  exit 0
else
  echo -e "${RED}✗ ORGANIZATION INCOMPLETE: ${#issues[@]} critical issues found${NC}"
  echo -e "${YELLOW}  Please review and fix issues above${NC}"
  exit 1
fi
