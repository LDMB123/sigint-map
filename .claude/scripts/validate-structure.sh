#!/bin/bash
# Repository Structure Validation Script
# Ensures ClaudeCodeProjects maintains proper organization

set -e

cd "$(dirname "$0")/../.."
errors=0
warnings=0

echo "🔍 Validating repository structure..."
echo ""

# Check 1: No markdown files at root except README.md, LICENSE.md
echo "✓ Checking root directory..."
root_md=$(find . -maxdepth 1 -name "*.md" ! -name "README.md" ! -name "LICENSE.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$root_md" -gt 0 ]; then
  echo "  ❌ Found $root_md unexpected markdown files at root"
  find . -maxdepth 1 -name "*.md" ! -name "README.md" ! -name "LICENSE.md"
  ((errors++))
fi

# Check 2: No backup directories at root
backups=$(find . -maxdepth 1 -name "*backup*" -type d 2>/dev/null | wc -l | tr -d ' ')
if [ "$backups" -gt 0 ]; then
  echo "  ❌ Found $backups backup directories at root (should be in archive/)"
  find . -maxdepth 1 -name "*backup*" -type d
  ((errors++))
fi

# Check 3: Projects in projects/ directory
echo "✓ Checking project organization..."
if [ ! -d "projects/dmb-almanac" ]; then
  echo "  ❌ DMB Almanac not in projects/ directory"
  ((errors++))
fi
if [ ! -d "projects/gemini-mcp-server" ]; then
  echo "  ❌ Gemini MCP Server not in projects/ directory"
  ((errors++))
fi

# Check 4: No stale "dmb-almanac-svelte" references
echo "✓ Checking for stale path references..."
stale_refs=$(grep -r "dmb-almanac-svelte" projects/dmb-almanac/app/ \
  --exclude-dir=node_modules \
  --exclude-dir=.svelte-kit \
  --exclude-dir=build \
  --exclude-dir=target \
  --exclude="*.rlib" \
  --exclude="*.rmeta" \
  --exclude="*.d" \
  2>/dev/null | wc -l | tr -d ' ')
if [ "$stale_refs" -gt 0 ]; then
  echo "  ⚠️  Found $stale_refs stale 'dmb-almanac-svelte' references (may be in compiled artifacts)"
  ((warnings++))
fi

# Check 5: DMB Almanac app root is clean
echo "✓ Checking DMB Almanac app organization..."
app_md=$(find projects/dmb-almanac/app -maxdepth 1 -name "*.md" ! -name "README.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$app_md" -gt 0 ]; then
  echo "  ❌ Found $app_md markdown files at app root (should be in docs/analysis/)"
  ((errors++))
fi

# Check 6: Required directories exist
echo "✓ Checking required directories..."
required_dirs=(".claude/agents" ".claude/docs" "docs/audits" "projects" "archive")
for dir in "${required_dirs[@]}"; do
  if [ ! -d "$dir" ]; then
    echo "  ❌ Required directory missing: $dir"
    ((errors++))
  fi
done

# Check 7: package.json has correct name
echo "✓ Checking package.json..."
if grep -q '"name": "dmb-almanac-svelte"' projects/dmb-almanac/app/package.json 2>/dev/null; then
  echo "  ❌ package.json still uses old name 'dmb-almanac-svelte'"
  ((errors++))
fi

echo ""
echo "================================================"
if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
  echo "✅ Repository structure validated successfully"
  echo "================================================"
  exit 0
elif [ $errors -eq 0 ]; then
  echo "✅ Structure validation passed with $warnings warning(s)"
  echo "================================================"
  exit 0
else
  echo "❌ Structure validation failed"
  echo "   Errors: $errors"
  echo "   Warnings: $warnings"
  echo "================================================"
  exit 1
fi
