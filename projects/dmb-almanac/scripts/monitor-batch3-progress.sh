#!/bin/bash
# BATCH 3 Progress Monitor
# Tracks conversion progress and detects completion

set -e

PROJECT_ROOT="/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac"
cd "$PROJECT_ROOT"

echo "======================================"
echo "BATCH 3 Progress Monitor"
echo "======================================"
echo ""

# Count TypeScript files remaining by category
echo "=== REMAINING TYPESCRIPT FILES ==="
echo ""

DB_TS_COUNT=$(find app/src/lib/db -name "*.ts" -type f 2>/dev/null | wc -l | xargs)
ROUTES_TS_COUNT=$(find app/src/routes -name "*.ts" -type f 2>/dev/null | wc -l | xargs)
WASM_TS_COUNT=$(find app/src/lib/wasm -name "*.ts" -type f 2>/dev/null | wc -l | xargs)

echo "Database Layer:  $DB_TS_COUNT .ts files remaining"
echo "Routes Layer:    $ROUTES_TS_COUNT .ts files remaining"
echo "WASM Layer:      $WASM_TS_COUNT .ts files remaining"
echo ""

# Count JavaScript files created
echo "=== NEW JAVASCRIPT FILES ==="
echo ""

DB_JS_COUNT=$(find app/src/lib/db -name "*.js" -type f 2>/dev/null | wc -l | xargs)
ROUTES_JS_COUNT=$(find app/src/routes -name "*.js" -type f 2>/dev/null | wc -l | xargs)
WASM_JS_COUNT=$(find app/src/lib/wasm -name "*.js" -type f 2>/dev/null | wc -l | xargs)

echo "Database Layer:  $DB_JS_COUNT .js files created"
echo "Routes Layer:    $ROUTES_JS_COUNT .js files created"
echo "WASM Layer:      $WASM_JS_COUNT .js files created"
echo ""

# Check for duplicate files (both .ts and .js)
echo "=== DUPLICATE FILES CHECK ==="
echo ""

DUPLICATES=$(find app/src/routes -name "+*.ts" -o -name "+*.js" | \
  sed 's/\.[^.]*$//' | sort | uniq -d | wc -l | xargs)

if [ "$DUPLICATES" -gt 0 ]; then
  echo "⚠️  WARNING: $DUPLICATES duplicate files detected"
  echo "    (Both .ts and .js versions exist)"
  echo ""
  echo "    Duplicate locations:"
  find app/src/routes -name "+*.ts" -o -name "+*.js" | \
    sed 's/\.[^.]*$//' | sort | uniq -d | head -10
  echo ""
else
  echo "✅ No duplicate files detected"
  echo ""
fi

# Calculate progress
TOTAL_TARGET=50  # Approximate target for BATCH 3
TOTAL_CONVERTED=$((DB_JS_COUNT + ROUTES_JS_COUNT + WASM_JS_COUNT))
PROGRESS=$((TOTAL_CONVERTED * 100 / TOTAL_TARGET))

echo "=== OVERALL PROGRESS ==="
echo ""
echo "Files Converted: $TOTAL_CONVERTED / ~$TOTAL_TARGET"
echo "Progress:        $PROGRESS%"
echo ""

# Check git status
echo "=== GIT STATUS ==="
echo ""

STAGED_DELETIONS=$(git status --porcelain | grep "^D " | wc -l | xargs)
NEW_FILES=$(git status --porcelain | grep "^??" | wc -l | xargs)
MODIFIED=$(git status --porcelain | grep "^ M" | wc -l | xargs)

echo "Staged deletions: $STAGED_DELETIONS files"
echo "New files:        $NEW_FILES files"
echo "Modified:         $MODIFIED files"
echo ""

# Build status
echo "=== BUILD STATUS ==="
echo ""

if npm run build --silent 2>&1 | grep -q "error during build"; then
  echo "❌ Build FAILING"
  echo ""
  echo "Common issues:"
  echo "  1. Duplicate files (both .ts and .js exist)"
  echo "  2. Import path errors"
  echo "  3. Type errors"
  echo ""
  echo "Run 'npm run build' for details"
else
  echo "✅ Build PASSING"
  BUILD_TIME=$(npm run build 2>&1 | grep "built in" | sed 's/.*built in \([0-9.]*\)s.*/\1/')
  if [ -n "$BUILD_TIME" ]; then
    echo "Build time: ${BUILD_TIME}s"
  fi
fi
echo ""

# Check for completion signals
echo "=== COMPLETION STATUS ==="
echo ""

if [ "$DB_TS_COUNT" -le 8 ] && [ "$ROUTES_TS_COUNT" -eq 0 ] && [ "$WASM_TS_COUNT" -le 8 ]; then
  echo "🎉 BATCH 3 APPEARS COMPLETE!"
  echo ""
  echo "Next steps:"
  echo "  1. Clean up duplicate files (if any)"
  echo "  2. Run final build verification"
  echo "  3. Generate summary documentation"
  echo "  4. Commit changes"
  echo ""
else
  echo "⏳ BATCH 3 still in progress..."
  echo ""
  echo "Waiting for:"
  if [ "$DB_TS_COUNT" -gt 8 ]; then
    echo "  - Database layer: $((DB_TS_COUNT - 8)) files remaining"
  fi
  if [ "$ROUTES_TS_COUNT" -gt 0 ]; then
    echo "  - Routes layer: $ROUTES_TS_COUNT files remaining"
  fi
  if [ "$WASM_TS_COUNT" -gt 8 ]; then
    echo "  - WASM layer: $((WASM_TS_COUNT - 8)) files remaining (8 will be kept)"
  fi
  echo ""
fi

echo "======================================"
echo "Monitor run complete: $(date)"
echo "======================================"
