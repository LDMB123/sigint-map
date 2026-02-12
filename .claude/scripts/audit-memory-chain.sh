#!/bin/bash
# Memory Chain Auditor
# Walks directory tree and reports all CLAUDE.md files with sizes

set -euo pipefail

echo "=== Memory Chain Auditor ==="
echo ""

WARN=0
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "Scanning for CLAUDE.md files under $ROOT..."
echo ""

while IFS= read -r -d '' file; do
    size=$(wc -c < "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo "?")
    rel="${file#$ROOT/}"

    if [ "$size" -gt 4096 ] 2>/dev/null; then
        echo "  WARN: $rel (${size}B — over 4KB)"
        WARN=$((WARN + 1))
    else
        echo "  OK:   $rel (${size}B)"
    fi
done < <(find "$ROOT" -name "CLAUDE.md" -not -path "*/_archived/*" -not -path "*/node_modules/*" -print0 2>/dev/null)

echo ""

# Check for user-level CLAUDE.md
if [ -f "$HOME/CLAUDE.md" ]; then
    size=$(wc -c < "$HOME/CLAUDE.md" 2>/dev/null || echo "?")
    echo "  INFO: ~/CLAUDE.md exists (${size}B)"
fi

echo ""
echo "=== Results ==="
echo "  Warnings (>4KB): $WARN"

if [ $WARN -gt 0 ]; then
    echo "  STATUS: WARN"
    exit 0
else
    echo "  STATUS: PASS"
    exit 0
fi
