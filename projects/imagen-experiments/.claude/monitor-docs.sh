#!/bin/bash
# Documentation growth monitor for Imagen Experiments token optimization
# Run quarterly or before major generation sessions

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== Imagen Experiments Documentation Monitor ==="
echo "Date: $(date +%Y-%m-%d)"
echo ""

# Count markdown files
MD_COUNT=$(find docs -name "*.md" -type f | grep -v "_archived" | wc -l | tr -d ' ')
echo "Active markdown files: $MD_COUNT"

ARCHIVED_COUNT=$(find docs/_archived -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
echo "Archived markdown files: $ARCHIVED_COUNT"

# Check sizes of key files
echo ""
echo "=== Key File Sizes ==="
for file in \
  "docs/phase1-experiment-set-a.md" \
  "docs/FIRST-PRINCIPLES-PHYSICS-METHODOLOGY.md" \
  "docs/BOUNDARY-FINDINGS-REPORT.md" \
  "docs/SESSION-MASTER-2026-02-02.md" \
  "docs/KNOWLEDGE_BASE.md" \
  "docs/EXPERIMENTS_INDEX.md" \
  "CLAUDE.md"
do
  if [ -f "$file" ]; then
    size=$(du -h "$file" | cut -f1)
    lines=$(wc -l < "$file" | tr -d ' ')
    printf "%-55s %8s (%5s lines)\n" "$file" "$size" "$lines"
  fi
done

# Check for session documentation growth
echo ""
echo "=== Session Documentation Status ==="
SESSION_FILES=$(find docs -maxdepth 1 -name "SESSION*.md" -type f | wc -l | tr -d ' ')
echo "Active session files: $SESSION_FILES"

if [ $SESSION_FILES -gt 2 ]; then
  echo "⚠️  Multiple session files detected - consider archiving old sessions"
  find docs -maxdepth 1 -name "SESSION*.md" -type f -exec basename {} \;
fi

# Check for generation scripts
echo ""
echo "=== Generation Scripts ==="
SCRIPT_COUNT=$(find scripts -name "*.js" -type f | wc -l | tr -d ' ')
echo "Total scripts: $SCRIPT_COUNT"

VEGAS_SCRIPTS=$(find scripts -name "vegas-*.js" -type f | wc -l | tr -d ' ')
echo "Vegas series scripts: $VEGAS_SCRIPTS"

if [ $VEGAS_SCRIPTS -gt 30 ]; then
  echo "⚠️  Large number of Vegas scripts - consider refactoring common code"
fi

# Estimate token usage
echo ""
echo "=== Token Estimate ==="
TOTAL_CHARS=$(find docs -name "*.md" -type f | grep -v "_archived" | xargs cat | wc -c | tr -d ' ')
ESTIMATED_TOKENS=$((TOTAL_CHARS / 4))
echo "Total chars in docs: $TOTAL_CHARS"
echo "Estimated tokens: ~$ESTIMATED_TOKENS"

# Token budget check
if [ $ESTIMATED_TOKENS -gt 220000 ]; then
  echo "⚠️  Documentation exceeds 220k token threshold - compression required"
elif [ $ESTIMATED_TOKENS -gt 180000 ]; then
  echo "⚠️  Documentation approaching warning threshold - review recommended"
else
  echo "✅ Documentation token usage within budget"
fi

# Check for compressed indexes
echo ""
echo "=== Compression Status ==="
if [ -f "docs/KNOWLEDGE_BASE.md" ]; then
  KB_UPDATE=$(stat -f "%Sm" -t "%Y-%m-%d" "docs/KNOWLEDGE_BASE.md")
  echo "Knowledge base last updated: $KB_UPDATE"
else
  echo "⚠️  KNOWLEDGE_BASE.md not found - create compressed index"
fi

if [ -f "docs/EXPERIMENTS_INDEX.md" ]; then
  EXP_UPDATE=$(stat -f "%Sm" -t "%Y-%m-%d" "docs/EXPERIMENTS_INDEX.md")
  echo "Experiments index last updated: $EXP_UPDATE"
else
  echo "⚠️  EXPERIMENTS_INDEX.md not found - create compressed index"
fi

echo ""
echo "=== Recommendations ==="
if [ $SESSION_FILES -gt 2 ] || [ $ESTIMATED_TOKENS -gt 180000 ] || [ $VEGAS_SCRIPTS -gt 30 ]; then
  echo "- Archive old session documentation"
  echo "- Update compressed indexes if source files changed"
  echo "- Consider extracting common code from Vegas scripts"
else
  echo "✅ No action needed - documentation is well-optimized"
fi

echo ""
echo "=== Next Monitor Run ==="
NEXT_DATE=$(date -v+3m +%Y-%m-%d)
echo "Recommended: $NEXT_DATE (3 months)"
