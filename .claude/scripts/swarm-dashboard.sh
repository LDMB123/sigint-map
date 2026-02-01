#!/bin/bash
# Real-time swarm agent dashboard

clear
echo "╔════════════════════════════════════════════════════════════════════════════════╗"
echo "║              UNIVERSAL AGENT FRAMEWORK - SWARM OPERATIONS DASHBOARD            ║"
echo "╚════════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Define all active agents
declare -A AGENTS=(
    ["a4b4d7b"]="P0: Collaboration Contracts (86 agents)"
    ["a94ba77"]="P0: Telemetry Integration"
    ["af82217"]="P1: Test Suite Deployment"
    ["a767c6f"]="P1: Broken Reference Fixes"
    ["a358a17"]="P1: Error Handling (230+ agents)"
    ["a1a8330"]="P1: Input Validation (Integrators)"
    ["a12ba2e"]="P2: Documentation (15 READMEs + guides)"
    ["ad3729d"]="P2: OpenAPI Specifications (8 specs)"
    ["a04b5e4"]="P2: Batch Processing (200+ agents)"
    ["a53986f"]="P2: Cost Models (200+ agents)"
    ["a3ceebe"]="P2: Logging Standardization (200+ agents)"
    ["a515eed"]="P2: Performance Optimization (261 agents)"
    ["a5eb180"]="P2: Workflow Guides (8 workflows)"
    ["a524f98"]="P2: Capability Matrix & Indexes"
)

TOTAL_AGENTS=${#AGENTS[@]}
RUNNING=0
COMPLETED=0
FAILED=0

echo "📊 SWARM STATUS: $TOTAL_AGENTS agents deployed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for agent_id in "${!AGENTS[@]}"; do
    task="${AGENTS[$agent_id]}"
    output_file="/private/tmp/claude/-Users-louisherman-ClaudeCodeProjects/tasks/${agent_id}.output"

    if [ -f "$output_file" ]; then
        size=$(du -h "$output_file" | cut -f1 | tr -d ' ')
        lines=$(wc -l < "$output_file" 2>/dev/null || echo "0")

        # Check for completion/error markers
        if tail -100 "$output_file" 2>/dev/null | grep -qi "error\|failed\|exception"; then
            status="❌ ERROR"
            FAILED=$((FAILED + 1))
        elif tail -100 "$output_file" 2>/dev/null | grep -qi "complete\|success\|done\|finished"; then
            status="✅ COMPLETE"
            COMPLETED=$((COMPLETED + 1))
        else
            status="🔄 RUNNING"
            RUNNING=$((RUNNING + 1))
        fi

        printf "%-12s %-50s %s\n" "$status" "$task" "($size, $lines lines)"
    else
        printf "%-12s %-50s %s\n" "⚠️  MISSING" "$task" "(output not found)"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📈 PROGRESS SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PERCENT_COMPLETE=$((COMPLETED * 100 / TOTAL_AGENTS))
echo "  ✅ Completed: $COMPLETED/$TOTAL_AGENTS ($PERCENT_COMPLETE%)"
echo "  🔄 Running:   $RUNNING/$TOTAL_AGENTS"
echo "  ❌ Failed:    $FAILED/$TOTAL_AGENTS"
echo ""

# Progress bar
BAR_LENGTH=70
FILLED=$((COMPLETED * BAR_LENGTH / TOTAL_AGENTS))
EMPTY=$((BAR_LENGTH - FILLED))

printf "  ["
for ((i=0; i<FILLED; i++)); do printf "█"; done
for ((i=0; i<EMPTY; i++)); do printf "░"; done
printf "] %d%%\n" "$PERCENT_COMPLETE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 NEXT STEPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $COMPLETED -eq $TOTAL_AGENTS ]; then
    echo "  🎉 ALL AGENTS COMPLETE!"
    echo "  → Run: bash /Users/louisherman/ClaudeCodeProjects/.claude/scripts/comprehensive-validation.sh"
    echo "  → Then: bash /Users/louisherman/ClaudeCodeProjects/.claude/scripts/generate-completion-report.sh"
elif [ $FAILED -gt 0 ]; then
    echo "  ⚠️  Some agents failed - investigate errors"
    echo "  → Check output files for failed agents"
    echo "  → Review error messages"
    echo "  → Retry or manually fix issues"
else
    echo "  ⏳ Agents still running - estimated completion in 10-30 minutes"
    echo "  → Monitor: watch -n 30 bash $0"
    echo "  → Check specific agent: tail -f /private/tmp/claude/-Users-louisherman-ClaudeCodeProjects/tasks/{agent_id}.output"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Last updated: $(date)"
