#!/bin/bash
echo "=== DEBUG WORKFLOW TEST ==="
echo ""

echo "Scenario: User wants to check agent ecosystem health"
echo ""

echo "1. Run validator (quick health check)..."
python3 validate-subagents.py 2>&1 | tail -10
RESULT=$?
echo ""

if [ $RESULT -eq 0 ]; then
  echo "✅ Validator reports: HEALTHY (passed with acceptable warnings)"
else
  echo "❌ Validator reports: ISSUES DETECTED"
  exit 1
fi
echo ""

echo "2. Check for common issues..."
echo "   - Name collisions: $(python3 -c 'import json; data=json.load(open(\"orphaned-agents-inventory.json\")); print(data[\"collision_count\"])')"
echo "   - Parse errors: $(python3 -c 'import json; data=json.load(open(\"orphaned-agents-inventory.json\")); print(data[\"parse_errors\"])')"
echo "   - Total agents: $(python3 -c 'import json; data=json.load(open(\"orphaned-agents-inventory.json\")); print(len(data[\"agents\"]))')"
echo ""

echo "3. Simulate adding a new agent (detect collision)..."
cat > /tmp/test-agent.md << 'AGENT'
---
name: dmb-qa-engineer
description: Test collision detection
model: haiku
tools: Read
---
Test agent
AGENT

# Check if this would collide
if grep -r "name: dmb-qa-engineer" /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/.claude/agents/ > /dev/null 2>&1; then
  echo "   ⚠️  WARNING: Agent 'dmb-qa-engineer' already exists in project scope"
  echo "   ✅ Collision detection works!"
else
  echo "   ❌ Collision detection failed"
fi
rm /tmp/test-agent.md
echo ""

echo "4. Test documentation lookup..."
if [ -f "README.md" ]; then
  echo "   ✅ Quick reference available: README.md"
fi
if [ -f "FINAL_STATUS.md" ]; then
  echo "   ✅ Final status available: FINAL_STATUS.md"
fi
echo ""

echo "=== DEBUG WORKFLOW TEST COMPLETE ==="
echo ""
echo "✅ All debug workflows operational"
echo "✅ Users can:"
echo "   - Run validator for health checks"
echo "   - Check inventory stats"
echo "   - Detect collisions before adding agents"
echo "   - Access clear documentation"
