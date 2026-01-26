#!/usr/bin/env bash
# Comprehensive Agent Audit - Find ALL agents across entire project
# Identifies duplicates, markdown-only agents, and creates consolidation plan

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="/Users/louisherman/ClaudeCodeProjects"
OUTPUT_DIR="$PROJECT_ROOT/.claude/audit"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_FILE="$OUTPUT_DIR/agent-comprehensive-audit-$TIMESTAMP.json"

mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}=== Comprehensive Agent Audit ===${NC}"
echo ""

# Track all agent locations
declare -A root_yaml_agents
declare -A dmb_yaml_agents
declare -A markdown_agents
declare -A global_agents

# 1. Find all YAML agents in root .claude/agents
echo -e "${CYAN}Scanning root .claude/agents directory...${NC}"
root_count=0
while IFS= read -r file; do
  # Extract agent ID from YAML
  agent_id=$(grep '^  id:' "$file" 2>/dev/null | head -1 | sed 's/.*id: *//' || basename "$file" .yaml)
  root_yaml_agents[$agent_id]=$file
  root_count=$((root_count + 1))
done < <(find "$PROJECT_ROOT/.claude/agents" -name "*.yaml" ! -path "*agent-api-spec.yaml" ! -path "*template*" -type f)

echo -e "  Found: ${GREEN}$root_count${NC} YAML agents"

# 2. Find all YAML agents in dmb-almanac project
echo -e "${CYAN}Scanning dmb-almanac .claude/agents directory...${NC}"
dmb_count=0
if [ -d "$PROJECT_ROOT/projects/dmb-almanac/.claude/agents" ]; then
  while IFS= read -r file; do
    agent_id=$(grep '^  id:' "$file" 2>/dev/null | head -1 | sed 's/.*id: *//' || basename "$file" .yaml)
    dmb_yaml_agents[$agent_id]=$file
    dmb_count=$((dmb_count + 1))
  done < <(find "$PROJECT_ROOT/projects/dmb-almanac/.claude/agents" -name "*.yaml" -type f)
fi
echo -e "  Found: ${GREEN}$dmb_count${NC} YAML agents"

# 3. Find markdown-only agents
echo -e "${CYAN}Scanning for markdown agent files...${NC}"
md_count=0
while IFS= read -r file; do
  agent_name=$(basename "$file" .md)
  markdown_agents[$agent_name]=$file
  md_count=$((md_count + 1))
done < <(find "$PROJECT_ROOT/.claude/agents" -name "*.md" ! -name "INDEX.md" ! -name "README.md" ! -name "ARCHITECTURE.md" -type f)
echo -e "  Found: ${GREEN}$md_count${NC} markdown agents"

# 4. Check for global agents in user home
echo -e "${CYAN}Checking for global agents in ~/.claude...${NC}"
global_count=0
if [ -d ~/.claude/agents ]; then
  while IFS= read -r file; do
    agent_id=$(grep '^  id:' "$file" 2>/dev/null | head -1 | sed 's/.*id: *//' || basename "$file" .yaml)
    global_agents[$agent_id]=$file
    global_count=$((global_count + 1))
  done < <(find ~/.claude/agents -name "*.yaml" -type f 2>/dev/null || true)
fi
echo -e "  Found: ${GREEN}$global_count${NC} global agents"

echo ""
echo -e "${BLUE}=== Analysis ===${NC}"
echo ""

# Identify duplicates between root and dmb-almanac
echo -e "${YELLOW}Duplicate Agents (exist in both root and dmb-almanac):${NC}"
duplicate_count=0
duplicate_agents=()
for agent_id in "${!root_yaml_agents[@]}"; do
  if [[ -v dmb_yaml_agents[$agent_id] ]]; then
    echo -e "  ${YELLOW}•${NC} $agent_id"
    echo -e "    Root:   ${root_yaml_agents[$agent_id]}"
    echo -e "    DMB:    ${dmb_yaml_agents[$agent_id]}"
    duplicate_agents+=("$agent_id")
    duplicate_count=$((duplicate_count + 1))
  fi
done

if [ "$duplicate_count" -eq 0 ]; then
  echo -e "  ${GREEN}None found${NC}"
fi
echo ""

# Identify root-only agents
echo -e "${CYAN}Root-Only Agents (not in dmb-almanac):${NC}"
root_only_count=0
root_only_agents=()
for agent_id in "${!root_yaml_agents[@]}"; do
  if [[ ! -v dmb_yaml_agents[$agent_id] ]]; then
    echo -e "  ${CYAN}•${NC} $agent_id"
    root_only_agents+=("$agent_id")
    root_only_count=$((root_only_count + 1))
  fi
done
echo ""

# Identify dmb-only agents
echo -e "${CYAN}DMB-Only Agents (not in root):${NC}"
dmb_only_count=0
dmb_only_agents=()
for agent_id in "${!dmb_yaml_agents[@]}"; do
  if [[ ! -v root_yaml_agents[$agent_id] ]]; then
    echo -e "  ${CYAN}•${NC} $agent_id"
    dmb_only_agents+=("$agent_id")
    dmb_only_count=$((dmb_only_count + 1))
  fi
done
echo ""

# Markdown-only agents
echo -e "${YELLOW}Markdown-Only Agents (no YAML equivalent):${NC}"
if [ "$md_count" -gt 0 ]; then
  for agent_name in "${!markdown_agents[@]}"; do
    echo -e "  ${YELLOW}•${NC} $agent_name"
    echo -e "    File: ${markdown_agents[$agent_name]}"
  done
else
  echo -e "  ${GREEN}None found${NC}"
fi
echo ""

# Global agents
if [ "$global_count" -gt 0 ]; then
  echo -e "${CYAN}Global Agents (in ~/.claude):${NC}"
  for agent_id in "${!global_agents[@]}"; do
    echo -e "  ${CYAN}•${NC} $agent_id"
    echo -e "    File: ${global_agents[$agent_id]}"
  done
  echo ""
fi

# Summary
echo -e "${GREEN}=== Summary ===${NC}"
echo -e "Total YAML agents (root):        ${GREEN}$root_count${NC}"
echo -e "Total YAML agents (dmb-almanac): ${GREEN}$dmb_count${NC}"
echo -e "Total markdown agents:            ${GREEN}$md_count${NC}"
echo -e "Total global agents:              ${GREEN}$global_count${NC}"
echo ""
echo -e "Duplicate agents:                 ${YELLOW}$duplicate_count${NC}"
echo -e "Root-only agents:                 ${CYAN}$root_only_count${NC}"
echo -e "DMB-only agents:                  ${CYAN}$dmb_only_count${NC}"
echo ""

# Calculate unique agent count
unique_count=$((root_only_count + duplicate_count + dmb_only_count))
echo -e "${BLUE}Unique Agent Count: ${GREEN}$unique_count${NC}"
echo ""

# Generate JSON report
cat > "$OUTPUT_FILE" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "summary": {
    "root_yaml_count": $root_count,
    "dmb_yaml_count": $dmb_count,
    "markdown_count": $md_count,
    "global_count": $global_count,
    "duplicate_count": $duplicate_count,
    "root_only_count": $root_only_count,
    "dmb_only_count": $dmb_only_count,
    "unique_agent_count": $unique_count
  },
  "duplicates": [
EOF

# Add duplicate agents to JSON
first=true
for agent_id in "${duplicate_agents[@]}"; do
  if [ "$first" = true ]; then
    first=false
  else
    echo "," >> "$OUTPUT_FILE"
  fi
  cat >> "$OUTPUT_FILE" <<EOF
    {
      "agent_id": "$agent_id",
      "root_path": "${root_yaml_agents[$agent_id]}",
      "dmb_path": "${dmb_yaml_agents[$agent_id]}"
    }
EOF
done

cat >> "$OUTPUT_FILE" <<EOF

  ],
  "root_only": [
EOF

# Add root-only agents to JSON
first=true
for agent_id in "${root_only_agents[@]}"; do
  if [ "$first" = true ]; then
    first=false
  else
    echo "," >> "$OUTPUT_FILE"
  fi
  cat >> "$OUTPUT_FILE" <<EOF
    {
      "agent_id": "$agent_id",
      "path": "${root_yaml_agents[$agent_id]}"
    }
EOF
done

cat >> "$OUTPUT_FILE" <<EOF

  ],
  "dmb_only": [
EOF

# Add dmb-only agents to JSON
first=true
for agent_id in "${dmb_only_agents[@]}"; do
  if [ "$first" = true ]; then
    first=false
  else
    echo "," >> "$OUTPUT_FILE"
  fi
  cat >> "$OUTPUT_FILE" <<EOF
    {
      "agent_id": "$agent_id",
      "path": "${dmb_yaml_agents[$agent_id]}"
    }
EOF
done

cat >> "$OUTPUT_FILE" <<EOF

  ],
  "markdown_only": [
EOF

# Add markdown-only agents to JSON
first=true
for agent_name in "${!markdown_agents[@]}"; do
  if [ "$first" = true ]; then
    first=false
  else
    echo "," >> "$OUTPUT_FILE"
  fi
  cat >> "$OUTPUT_FILE" <<EOF
    {
      "agent_name": "$agent_name",
      "path": "${markdown_agents[$agent_name]}"
    }
EOF
done

cat >> "$OUTPUT_FILE" <<EOF

  ]
}
EOF

echo -e "${GREEN}✓ Report saved: $OUTPUT_FILE${NC}"
echo ""

# Recommendations
echo -e "${BLUE}=== Recommendations ===${NC}"
echo ""

if [ "$duplicate_count" -gt 0 ]; then
  echo -e "${YELLOW}1. Consolidate Duplicate Agents${NC}"
  echo -e "   $duplicate_count agents exist in both locations"
  echo -e "   Options:"
  echo -e "   a) Keep root as authoritative, delete dmb-almanac copies"
  echo -e "   b) Keep dmb-almanac as project-specific, delete root copies"
  echo -e "   c) Merge and determine which should be project-specific vs global"
  echo ""
fi

if [ "$md_count" -gt 0 ]; then
  echo -e "${YELLOW}2. Convert Markdown Agents to YAML${NC}"
  echo -e "   $md_count markdown-only agents found"
  echo -e "   These should be converted to proper YAML format for invocability"
  echo -e "   Categories: self-improving, quantum-parallel"
  echo ""
fi

if [ "$dmb_only_count" -gt 0 ]; then
  echo -e "${YELLOW}3. Evaluate DMB-Specific Agents${NC}"
  echo -e "   $dmb_only_count agents only exist in dmb-almanac project"
  echo -e "   Determine if these should be:"
  echo -e "   - Moved to root (general-purpose)"
  echo -e "   - Kept in project (dmb-specific)"
  echo ""
fi

echo -e "${GREEN}Next Steps:${NC}"
echo -e "1. Review JSON report: $OUTPUT_FILE"
echo -e "2. Decide consolidation strategy (root vs project-specific)"
echo -e "3. Run consolidation script (to be created)"
echo -e "4. Update route table with all unique agents"
echo ""
