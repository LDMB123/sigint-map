#!/bin/bash
# Validate agent collaboration contracts

AGENTS_DIR="${1:-.claude/agents}"
ERRORS=0

echo "=== Agent Coordination Contract Validator ==="
echo "Scanning: $AGENTS_DIR"
echo ""

# Check for formal contracts
echo "📋 Checking for collaboration contracts..."
MISSING_COUNT=0
for agent_file in $(find "$AGENTS_DIR" -name "*.md" -not -name "README.md" -not -name "QUICK_REFERENCE.md"); do
  if ! grep -q "collaboration-contracts:" "$agent_file"; then
    MISSING_COUNT=$((MISSING_COUNT + 1))
  fi
done

if [ $MISSING_COUNT -eq 0 ]; then
  echo "✅ All agents have collaboration contracts"
else
  echo "⚠️  $MISSING_COUNT agents missing formal contracts"
  echo "   (This is expected - framework not yet migrated to formal contracts)"
fi

# Validate bidirectional consistency
echo ""
echo "🔄 Validating bidirectional consistency..."
python3 "$(dirname "$0")/validate-bidirectional.py" "$AGENTS_DIR"
BID_ERRORS=$?
ERRORS=$((ERRORS + BID_ERRORS))

# Check for circular dependencies
echo ""
echo "🔁 Checking for circular dependencies..."
python3 "$(dirname "$0")/detect-cycles.py" "$AGENTS_DIR"
CYCLE_ERRORS=$?
ERRORS=$((ERRORS + CYCLE_ERRORS))

# Validate Sonnet concurrency limits
echo ""
echo "⚡ Validating Sonnet concurrency limits..."
CONCURRENCY_WARNINGS=0
for orchestrator in $(find "$AGENTS_DIR" -path "*/orchestrators/*.md" -o -path "*/swarms/*.md"); do
  if grep -q "tier: sonnet" "$orchestrator" 2>/dev/null; then
    if grep -q "Promise.all" "$orchestrator" && ! grep -q "CONCURRENCY_LIMIT\|Semaphore\|semaphore" "$orchestrator"; then
      echo "⚠️  Missing concurrency limit: $(basename "$orchestrator")"
      CONCURRENCY_WARNINGS=$((CONCURRENCY_WARNINGS + 1))
    fi
  fi
done

if [ $CONCURRENCY_WARNINGS -eq 0 ]; then
  echo "✅ All Sonnet coordinators have concurrency guards (or don't need them)"
else
  echo "⚠️  $CONCURRENCY_WARNINGS Sonnet coordinators missing concurrency limits"
  echo "   (Non-blocking warning - add Semaphore for >30 parallel tasks)"
fi

# Summary
echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ All critical validations passed"
  echo "   Warnings: $((MISSING_COUNT + CONCURRENCY_WARNINGS)) (non-blocking)"
  exit 0
else
  echo "❌ Found $ERRORS critical errors"
  echo "   Warnings: $((MISSING_COUNT + CONCURRENCY_WARNINGS)) (non-blocking)"
  exit 1
fi
