#!/bin/bash
# Fix script: Remove invalid tools from agent frontmatter
# Removes WebSearch and WebFetch from all agents

set -e

AGENTS_DIR="/Users/louisherman/.claude/agents"
BACKUP_DIR="/Users/louisherman/ClaudeCodeProjects/_archived/agent-fixes-2026-01-31"

echo "Agent Invalid Tools Fix Script"
echo "==============================="
echo ""

# Create backup
mkdir -p "$BACKUP_DIR"
echo "Creating backup to: $BACKUP_DIR"
tar -czf "$BACKUP_DIR/agents-before-tool-fix.tar.gz" "$AGENTS_DIR"

# Find all agents with invalid tools
echo ""
echo "Finding agents with WebSearch/WebFetch..."
AFFECTED_AGENTS=$(grep -rl "  - WebSearch\|  - WebFetch" "$AGENTS_DIR" | grep "\.md$" || true)
AGENT_COUNT=$(echo "$AFFECTED_AGENTS" | grep -c "." || echo "0")

echo "Found $AGENT_COUNT agents to fix"
echo ""

if [ "$AGENT_COUNT" -eq 0 ]; then
    echo "No agents need fixing!"
    exit 0
fi

# Fix each agent
for agent in $AFFECTED_AGENTS; do
    echo "Fixing: $agent"
    # Remove WebSearch and WebFetch lines (macOS sed syntax)
    sed -i '' '/^  - WebSearch$/d; /^  - WebFetch$/d' "$agent"
done

echo ""
echo "Fix complete!"
echo ""
echo "Verification:"
REMAINING=$(grep -rl "  - WebSearch\|  - WebFetch" "$AGENTS_DIR" | grep "\.md$" | wc -l || echo "0")
echo "Agents still with invalid tools: $REMAINING"

if [ "$REMAINING" -eq 0 ]; then
    echo "✓ All invalid tools removed successfully"
else
    echo "✗ Some agents still have issues - manual review needed"
fi
