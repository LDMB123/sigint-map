#!/bin/bash
# Cost Optimization Cleanup Script
# Executes immediate, low-risk cleanup actions
# Based on: docs/reports/COST_OPTIMIZATION_ANALYSIS.md

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}COST OPTIMIZATION CLEANUP${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

TOTAL_SAVINGS=0

# Helper function to calculate size
get_size_mb() {
  if [ -e "$1" ]; then
    du -sm "$1" 2>/dev/null | awk '{print $1}'
  else
    echo "0"
  fi
}

# 1. Clean archived node_modules
echo -e "${YELLOW}[1/5] Cleaning archived node_modules...${NC}"
ARCHIVED_NM_SIZE=$(get_size_mb "_archived/abandoned-projects-2026-01-31")
if [ -d "_archived/abandoned-projects-2026-01-31" ]; then
  find _archived/abandoned-projects-2026-01-31 -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
  NEW_SIZE=$(get_size_mb "_archived/abandoned-projects-2026-01-31")
  SAVED=$((ARCHIVED_NM_SIZE - NEW_SIZE))
  TOTAL_SAVINGS=$((TOTAL_SAVINGS + SAVED))
  echo -e "${GREEN}✓ Cleaned archived node_modules: ${SAVED} MB saved${NC}"
else
  echo -e "${YELLOW}⚠ No archived projects found${NC}"
fi
echo ""

# 2. Clean test artifacts
echo -e "${YELLOW}[2/5] Cleaning test artifacts...${NC}"
TEST_ARTIFACTS=(
  "projects/dmb-almanac/app/coverage"
  "projects/dmb-almanac/app/test-results"
  "projects/dmb-almanac/app/playwright-report"
  "projects/emerson-violin-pwa/test-results"
)

TEST_SAVINGS=0
for artifact in "${TEST_ARTIFACTS[@]}"; do
  if [ -d "$artifact" ]; then
    SIZE=$(get_size_mb "$artifact")
    rm -rf "$artifact"
    TEST_SAVINGS=$((TEST_SAVINGS + SIZE))
    echo -e "${GREEN}✓ Removed $artifact (${SIZE} MB)${NC}"
  fi
done

TOTAL_SAVINGS=$((TOTAL_SAVINGS + TEST_SAVINGS))
echo -e "${GREEN}✓ Test artifacts cleaned: ${TEST_SAVINGS} MB saved${NC}"
echo ""

# 3. Update .gitignore with missing patterns
echo -e "${YELLOW}[3/5] Updating .gitignore...${NC}"
GITIGNORE_ADDITIONS=$(cat <<'EOF'

# Cost optimization additions (2026-01-31)
# Build outputs
**/dist/

# Archived projects
_archived/**/node_modules/

# Test outputs
**/test-output/
**/playwright-report/
EOF
)

if ! grep -q "Cost optimization additions" .gitignore 2>/dev/null; then
  echo "$GITIGNORE_ADDITIONS" >> .gitignore
  echo -e "${GREEN}✓ Updated .gitignore with missing patterns${NC}"
else
  echo -e "${YELLOW}⚠ .gitignore already updated${NC}"
fi
echo ""

# 4. Remove emerson-violin-pwa/dist from git (if tracked)
echo -e "${YELLOW}[4/5] Checking emerson-violin-pwa/dist in git...${NC}"
if git ls-files "projects/emerson-violin-pwa/dist/" | grep -q .; then
  DIST_SIZE=$(get_size_mb "projects/emerson-violin-pwa/dist")
  git rm -r --cached projects/emerson-violin-pwa/dist/ 2>/dev/null || true
  echo -e "${GREEN}✓ Removed dist/ from git tracking (${DIST_SIZE} MB)${NC}"
  echo -e "${BLUE}  Note: Changes staged but not committed. Run 'git commit' to save.${NC}"
  TOTAL_SAVINGS=$((TOTAL_SAVINGS + DIST_SIZE))
else
  echo -e "${GREEN}✓ dist/ not tracked in git${NC}"
fi
echo ""

# 5. Create test cleanup automation script
echo -e "${YELLOW}[5/5] Creating test cleanup automation...${NC}"
cat > .claude/scripts/cleanup-test-artifacts.sh << 'EOF'
#!/bin/bash
# Cleanup test artifacts workspace-wide
# Run weekly or before commits

echo "Cleaning test artifacts..."

find . -type d \( \
  -name "coverage" -o \
  -name "test-results" -o \
  -name "playwright-report" -o \
  -name ".vitest-cache" \
\) -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true

echo "✓ Test artifacts cleaned"
EOF

chmod +x .claude/scripts/cleanup-test-artifacts.sh
echo -e "${GREEN}✓ Created .claude/scripts/cleanup-test-artifacts.sh${NC}"
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CLEANUP SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Total Storage Saved: ${GREEN}${TOTAL_SAVINGS} MB${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Review git status for staged changes (if any)"
echo "2. Commit .gitignore updates: git commit -m 'chore: Cost optimization cleanup'"
echo "3. Review docs/reports/COST_OPTIMIZATION_ANALYSIS.md for additional optimizations"
echo "4. Consider git history cleanup for 280+ MB savings (requires team coordination)"
echo ""
echo -e "${GREEN}✓ Immediate cleanup complete${NC}"
echo ""
