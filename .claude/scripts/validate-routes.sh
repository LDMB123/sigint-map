#!/bin/bash
# Route Table Validation Script
# Validates that all agents referenced in route-table.json actually exist
# Usage: .claude/scripts/validate-routes.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ROUTE_TABLE="$PROJECT_ROOT/.claude/config/route-table.json"
AGENTS_DIR="$PROJECT_ROOT/.claude/agents"
PLUGIN_DIR="$HOME/.claude/plugins/cache/claude-plugins-official"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Route Table Validation ===${NC}"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ Error: jq is required but not installed${NC}"
    echo "Install with: brew install jq"
    exit 1
fi

# Check if route table exists
if [ ! -f "$ROUTE_TABLE" ]; then
    echo -e "${RED}❌ Error: Route table not found at $ROUTE_TABLE${NC}"
    exit 1
fi

echo -e "${BLUE}Route Table:${NC} $ROUTE_TABLE"
echo -e "${BLUE}Agents Directory:${NC} $AGENTS_DIR"
echo -e "${BLUE}Plugin Directory:${NC} $PLUGIN_DIR"
echo ""

# Extract all unique agent names from route table
echo -e "${BLUE}Extracting agent names from route table...${NC}"
AGENTS=$(jq -r '
  [
    (.routes // {} | to_entries[].value.agent),
    (.category_routes // {} | .. | objects | select(has("agent")) | .agent),
    (.default_route // {} | .agent)
  ] | unique | .[]
' "$ROUTE_TABLE" 2>/dev/null)

if [ -z "$AGENTS" ]; then
    echo -e "${RED}❌ Error: Could not extract agents from route table${NC}"
    exit 1
fi

TOTAL_AGENTS=$(echo "$AGENTS" | wc -l | tr -d ' ')
echo -e "${GREEN}Found $TOTAL_AGENTS unique agents referenced in route table${NC}"
echo ""

# Validate each agent
ERRORS=0
WARNINGS=0
SUCCESS=0

echo -e "${BLUE}Validating agents...${NC}"
echo ""

while IFS= read -r agent; do
    # Skip empty lines
    [ -z "$agent" ] && continue

    if [[ "$agent" == *":"* ]]; then
        # Plugin agent format: plugin-name:agent-name
        PLUGIN="${agent%%:*}"
        AGENT_NAME="${agent#*:}"

        # Check if plugin exists
        if [ -d "$PLUGIN_DIR/$PLUGIN" ]; then
            echo -e "${GREEN}✅ Plugin agent:${NC} $agent"
            ((SUCCESS++))
        else
            echo -e "${RED}❌ Plugin not found:${NC} $agent (plugin: $PLUGIN)"
            ((ERRORS++))
        fi
    else
        # Project agent - check if .md file exists
        AGENT_FILE="$AGENTS_DIR/$agent.md"

        if [ -f "$AGENT_FILE" ]; then
            echo -e "${GREEN}✅ Project agent:${NC} $agent"
            ((SUCCESS++))
        elif [ -f "$AGENT_FILE.deprecated" ]; then
            echo -e "${RED}❌ DEPRECATED agent:${NC} $agent (file: $agent.md.deprecated)"
            echo -e "   ${YELLOW}→ This agent has been deprecated and should not be in route table${NC}"
            ((ERRORS++))
        else
            echo -e "${RED}❌ Agent not found:${NC} $agent (expected: $AGENT_FILE)"
            ((ERRORS++))
        fi
    fi
done <<< "$AGENTS"

echo ""
echo -e "${BLUE}=== Validation Summary ===${NC}"
echo ""
echo -e "${GREEN}✅ Valid agents: $SUCCESS${NC}"
echo -e "${RED}❌ Errors: $ERRORS${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo ""

# Additional checks
echo -e "${BLUE}=== Additional Checks ===${NC}"
echo ""

# Check for orphaned agent files (agents not in route table)
echo -e "${BLUE}Checking for orphaned agent files...${NC}"
ORPHANED=0

for agent_file in "$AGENTS_DIR"/*.md; do
    # Skip if no files found
    [ -e "$agent_file" ] || continue

    # Skip deprecated files
    [[ "$agent_file" == *.deprecated ]] && continue

    AGENT_NAME=$(basename "$agent_file" .md)

    # Check if this agent is in the route table
    if ! echo "$AGENTS" | grep -q "^${AGENT_NAME}$"; then
        echo -e "${YELLOW}⚠️  Orphaned agent:${NC} $AGENT_NAME (not referenced in route table)"
        ((ORPHANED++))
    fi
done

if [ $ORPHANED -eq 0 ]; then
    echo -e "${GREEN}✅ No orphaned agents found${NC}"
else
    echo -e "${YELLOW}⚠️  Found $ORPHANED orphaned agent(s)${NC}"
    echo "   Note: Orphaned agents exist but are not referenced in route table"
fi

echo ""

# Check route table JSON validity
echo -e "${BLUE}Checking route table JSON validity...${NC}"
if jq empty "$ROUTE_TABLE" 2>/dev/null; then
    echo -e "${GREEN}✅ Route table JSON is valid${NC}"
else
    echo -e "${RED}❌ Route table JSON is invalid${NC}"
    ((ERRORS++))
fi

echo ""

# Final result
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}=== ✅ ALL VALIDATIONS PASSED ===${NC}"
    exit 0
else
    echo -e "${RED}=== ❌ VALIDATION FAILED WITH $ERRORS ERROR(S) ===${NC}"
    echo ""
    echo "Please fix the errors above and run this script again."
    exit 1
fi
