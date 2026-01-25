#!/bin/bash
# Real-time status monitor for background swarm agents

echo "========================================"
echo "SWARM AGENT STATUS MONITOR"
echo "========================================"
echo ""

AGENTS=(
    "a4b4d7b:Collaboration Contracts"
    "a94ba77:Telemetry Integration"
    "af82217:Test Suite Deployment"
    "a767c6f:Reference Fixes"
    "a12ba2e:Documentation"
    "ad3729d:OpenAPI Specifications"
)

for agent_info in "${AGENTS[@]}"; do
    IFS=':' read -r agent_id agent_name <<< "$agent_info"
    output_file="/private/tmp/claude/-Users-louisherman-ClaudeCodeProjects/tasks/${agent_id}.output"
    
    echo "Agent: $agent_name ($agent_id)"
    echo "-------------------------------------------"
    
    if [ -f "$output_file" ]; then
        size=$(du -h "$output_file" | cut -f1)
        lines=$(wc -l < "$output_file")
        echo "Status: RUNNING"
        echo "Output: $size ($lines lines)"
        
        # Show last activity
        last_activity=$(tail -1 "$output_file" 2>/dev/null | grep -o '"timestamp":"[^"]*"' | tail -1 | cut -d'"' -f4)
        if [ -n "$last_activity" ]; then
            echo "Last Activity: $last_activity"
        fi
        
        # Check for completion markers
        if tail -100 "$output_file" | grep -q "COMPLETE\|SUCCESS\|DONE"; then
            echo "⚠️  May be complete - check output"
        fi
    else
        echo "Status: NOT FOUND"
    fi
    echo ""
done

echo "========================================"
echo "To view agent output:"
echo "  tail -f /private/tmp/claude/-Users-louisherman-ClaudeCodeProjects/tasks/{agent_id}.output"
echo ""
echo "To check specific agent:"
echo "  bash /path/to/this/script | grep -A 5 '{agent_name}'"
echo "========================================"
