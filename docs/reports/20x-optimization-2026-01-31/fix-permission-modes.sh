#!/bin/bash
# Fix script: Normalize permission modes to valid values
# Maps custom modes to standard: permissive, strict, ask, auto

set -e

AGENTS_DIR="/Users/louisherman/.claude/agents"
BACKUP_DIR="/Users/louisherman/ClaudeCodeProjects/_archived/agent-fixes-2026-01-31"

echo "Agent Permission Mode Fix Script"
echo "================================="
echo ""

# Create backup
mkdir -p "$BACKUP_DIR"
echo "Creating backup to: $BACKUP_DIR"
tar -czf "$BACKUP_DIR/agents-before-permission-fix.tar.gz" "$AGENTS_DIR"

# Permission mode mappings
declare -A MODE_MAP=(
    ["acceptEdits"]="permissive"
    ["default"]="auto"
    ["plan"]="ask"
    ["review"]="ask"
    ["code"]="permissive"
    ["acceptAll"]="permissive"
    ["confirmation"]="ask"
    ["manual"]="ask"
    ["interactive"]="ask"
    ["autonomous"]="permissive"
    ["supervised"]="strict"
    ["readOnly"]="strict"
)

echo "Permission mode mappings:"
for old_mode in "${!MODE_MAP[@]}"; do
    echo "  $old_mode -> ${MODE_MAP[$old_mode]}"
done
echo ""

# Count current invalid modes
echo "Checking for invalid permission modes..."
TOTAL_FIXED=0

for old_mode in "${!MODE_MAP[@]}"; do
    new_mode="${MODE_MAP[$old_mode]}"
    
    # Find and count
    COUNT=$(grep -r "permissionMode: $old_mode" "$AGENTS_DIR" --include="*.md" | wc -l || echo "0")
    
    if [ "$COUNT" -gt 0 ]; then
        echo "  Found $COUNT agents with permissionMode: $old_mode"
        
        # Fix (macOS-compatible find)
        find "$AGENTS_DIR" -name "*.md" -type f -exec sed -i '' "s/permissionMode: $old_mode/permissionMode: $new_mode/g" {} +
        
        TOTAL_FIXED=$((TOTAL_FIXED + COUNT))
    fi
done

echo ""
echo "Fix complete!"
echo "Total agents fixed: $TOTAL_FIXED"
echo ""

# Verify
echo "Verification - checking for remaining invalid modes..."
INVALID_REMAINING=0

for old_mode in "${!MODE_MAP[@]}"; do
    REMAINING=$(grep -r "permissionMode: $old_mode" "$AGENTS_DIR" --include="*.md" | wc -l || echo "0")
    if [ "$REMAINING" -gt 0 ]; then
        echo "  ✗ Still found $REMAINING agents with: $old_mode"
        INVALID_REMAINING=$((INVALID_REMAINING + REMAINING))
    fi
done

if [ "$INVALID_REMAINING" -eq 0 ]; then
    echo "✓ All known invalid permission modes fixed"
else
    echo "✗ $INVALID_REMAINING agents still have issues - manual review needed"
fi
