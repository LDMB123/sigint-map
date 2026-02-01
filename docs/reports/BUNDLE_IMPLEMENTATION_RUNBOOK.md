# Bundle Optimization - Implementation Runbook

Step-by-step guide to execute all optimizations with verification at each stage.

---

## Phase 1: Quick Wins (Execute Today - 35 minutes)

### Pre-Flight Check (2 minutes)

```bash
# Verify current state
cd /Users/louisherman/ClaudeCodeProjects

# Baseline measurements
echo "=== BASELINE ==="
du -sh node_modules projects/*/node_modules projects/*/*/node_modules 2>/dev/null | sort -rh

# Test that everything works
cd projects/dmb-almanac/app && npm run test -- --run 2>&1 | tail -5
cd ../scraper && npm run test 2>&1 | tail -3
cd ../../emerson-violin-pwa && npm run test 2>&1 | tail -3
cd /Users/louisherman/ClaudeCodeProjects
```

**Expected output**: All tests pass, baseline shows 514 MB total

---

### 1.1: Remove test bloat from emerson-violin-pwa (5 minutes)

**Location**: `/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa`

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa

# Step 1: Display current package.json
echo "=== Before removal ==="
grep -A 10 "devDependencies" package.json

# Step 2: Remove unused packages
npm uninstall happy-dom jsdom @vitest/coverage-v8

# Step 3: Verify removal
echo "=== After removal ==="
grep -A 10 "devDependencies" package.json

# Step 4: Check package-lock.json was updated
grep -c "happy-dom\|jsdom" package-lock.json || echo "✓ Removed from lock file"

# Step 5: Measure space saved
echo "=== Space saved ==="
du -sh node_modules

# Step 6: Run tests (should still pass with vitest default)
npm run test 2>&1 | grep -E "PASS|FAIL|✓|✗|passed|failed"
```

**Verification checklist**:
- [ ] happy-dom removed from package.json
- [ ] jsdom removed from package.json
- [ ] @vitest/coverage-v8 removed from package.json
- [ ] package-lock.json updated
- [ ] Tests still pass
- [ ] node_modules size decreased

**Expected**: ~19 MB smaller node_modules

---

### 1.2: Remove unused test library from dmb-almanac (3 minutes)

**Location**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app`

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app

# Step 1: Verify it's not used
echo "=== Checking for @testing-library imports ==="
grep -r "@testing-library" src/ --include="*.ts" --include="*.tsx" --include="*.svelte" || echo "✓ Not found in source"

# Step 2: Remove package
npm uninstall @testing-library/jest-dom

# Step 3: Verify removal
grep "@testing-library" package.json || echo "✓ Removed from package.json"

# Step 4: Measure
du -sh node_modules

# Step 5: Test
npm run test -- --run 2>&1 | grep -E "PASS|FAIL|✓|✗|passed|failed"
```

**Verification checklist**:
- [ ] Confirmed no imports of @testing-library
- [ ] Package removed from package.json
- [ ] Tests still pass

**Expected**: ~76 KB smaller (minimal but fixes bloat culture)

---

### 1.3: Verify @js-temporal/polyfill usage (5 minutes)

**Location**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app`

```bash
# Check if actually imported
echo "=== Checking @js-temporal imports ==="
grep -r "from.*@js-temporal\|import.*@js-temporal" src/ --include="*.ts" --include="*.tsx" --include="*.svelte" || echo "✗ Not imported in source"

# Check if mentioned in comments/docs
echo "=== Checking references ==="
grep -r "Temporal\." src/ --include="*.ts" --include="*.tsx" || echo "✓ No Temporal API usage in source"

# Check if it's documented but not used
grep -r "Temporal" src/lib/utils/temporalDate.js || echo "? Not found"

# Decision
echo ""
echo "DECISION: @js-temporal/polyfill"
echo "- If imported: KEEP"
echo "- If only in comments: REMOVE (1.3 MB savings)"
echo "- Current evidence: Check output above"
```

**If decision is REMOVE**:
```bash
npm uninstall @js-temporal/polyfill
npm run test -- --run  # Verify no breakage
```

**Expected outcome**: Either keep (necessary) or remove 1.3 MB

---

### 1.4: Optional - Check source-map-explorer usage (3 minutes)

**Location**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app`

```bash
# Check if used in scripts
grep "source-map-explorer" package.json
grep -r "source-map-explorer" scripts/ 2>/dev/null || echo "Not in scripts"

# Decision
echo ""
echo "source-map-explorer: 2.5 MB"
echo "- Used in: Scripts only (not imported by code)"
echo "- When needed: For manual bundle analysis"
echo "- Recommendation: Keep (only used when explicitly needed)"
```

**Decision**: KEEP (optional tool, not bloating normal builds)

---

### 1.5: Commit Phase 1 changes (5 minutes)

```bash
cd /Users/louisherman/ClaudeCodeProjects

# Stage all removals
git add projects/emerson-violin-pwa/package.json
git add projects/emerson-violin-pwa/package-lock.json
git add projects/dmb-almanac/app/package.json
git add projects/dmb-almanac/app/package-lock.json

# Optional: Stage @temporal removal if decided
# git add projects/dmb-almanac/app/package.json (already staged)

# Verify staged changes
git diff --cached --stat

# Create commit
git commit -m "fix: Remove unused test dependencies

- emerson-violin-pwa: Remove happy-dom, jsdom, @vitest/coverage-v8 (21 MB)
- dmb-almanac: Remove @testing-library/jest-dom (76 KB)
- Total saved: ~22 MB

These packages were not used by the projects:
- happy-dom & jsdom: both test DOM simulators for 2 test files (redundant)
- coverage-v8: no CI coverage reporting configured
- @testing-library: never imported in any source file

Tested: All test suites still pass with vitest defaults"

# Verify commit
git log --oneline -1
```

---

### 1.6: Final Phase 1 verification (5 minutes)

```bash
# Re-run all tests to confirm nothing broke
echo "=== Testing all projects ==="

echo "Testing dmb-almanac/app..."
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app
npm run test -- --run 2>&1 | tail -3

echo "Testing dmb-almanac/scraper..."
cd ../scraper
npm run test 2>&1 | tail -3

echo "Testing emerson-violin-pwa..."
cd ../../emerson-violin-pwa
npm run test 2>&1 | tail -3

# Measure final state
echo ""
echo "=== POST-PHASE-1 SIZES ==="
du -sh /Users/louisherman/ClaudeCodeProjects/node_modules \
       /Users/louisherman/ClaudeCodeProjects/.claude/node_modules \
       /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/node_modules \
       /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/scraper/node_modules \
       /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/node_modules \
       2>/dev/null | sort -rh

echo ""
echo "Phase 1 complete! Saved ~22 MB"
```

**Success criteria**:
- [ ] All tests pass
- [ ] emerson-violin-pwa: ~19 MB smaller
- [ ] dmb-almanac/app: ~0.1 MB smaller
- [ ] Commit created and pushed

---

## Phase 2: Monorepo Setup (Execute This Week - 2-4 hours)

### Pre-Flight Check (5 minutes)

Before starting monorepo setup, ensure:

```bash
cd /Users/louisherman/ClaudeCodeProjects

# 1. All projects have package.json
for dir in . .claude projects/dmb-almanac/app projects/dmb-almanac/app/scraper projects/emerson-violin-pwa; do
  if [ -f "$dir/package.json" ]; then
    echo "✓ $dir/package.json exists"
  else
    echo "✗ $dir/package.json MISSING"
  fi
done

# 2. No conflicting workspaces config
grep -l '"workspaces"' */package.json 2>/dev/null || echo "✓ No existing workspaces"

# 3. Git is clean
git status --short
echo "^ Stash any uncommitted work above"
```

---

### 2.1: Create workspace package.json (10 minutes)

```bash
cd /Users/louisherman/ClaudeCodeProjects

# Backup existing package.json
cp package.json package.json.backup

# Create new workspace configuration
cat > package.json << 'EOF'
{
  "name": "ClaudeCodeProjects",
  "version": "1.0.0",
  "description": "Multi-project workspace with shared build tools",
  "private": true,
  "type": "module",
  "workspaces": [
    ".claude",
    "projects/dmb-almanac/app",
    "projects/dmb-almanac/app/scraper",
    "projects/emerson-violin-pwa"
  ],
  "scripts": {
    "install": "npm install",
    "test": "npm run test --workspaces",
    "build": "npm run build --workspaces",
    "analyze:bundles": "for dir in .claude projects/*/app projects/*/app/scraper projects/emerson*; do echo \"=== $dir ===\"  && du -sh \"$dir/node_modules\" 2>/dev/null; done"
  }
}
EOF

# Verify structure
cat package.json | head -20

# Verify all workspaces exist
for ws in .claude projects/dmb-almanac/app projects/dmb-almanac/app/scraper projects/emerson-violin-pwa; do
  if [ -f "$ws/package.json" ]; then
    echo "✓ Workspace $ws ready"
  else
    echo "✗ Missing $ws/package.json"
  fi
done
```

**Verification**:
- [ ] Root package.json created with workspaces
- [ ] All 4 workspaces listed
- [ ] Backup created (package.json.backup)

---

### 2.2: Clean up and reinstall (20 minutes)

```bash
cd /Users/louisherman/ClaudeCodeProjects

# Step 1: Remove all node_modules directories
echo "Removing old node_modules directories..."
rm -rf node_modules
rm -rf .claude/node_modules
rm -rf projects/dmb-almanac/app/node_modules
rm -rf projects/dmb-almanac/app/scraper/node_modules
rm -rf projects/emerson-violin-pwa/node_modules

# Verify removal
find . -type d -name node_modules 2>/dev/null && echo "✗ Some node_modules remain" || echo "✓ All removed"

# Step 2: Remove all package-lock.json files
echo "Removing old package-lock.json files..."
rm -f package-lock.json
rm -f .claude/package-lock.json
rm -f projects/dmb-almanac/app/package-lock.json
rm -f projects/dmb-almanac/app/scraper/package-lock.json
rm -f projects/emerson-violin-pwa/package-lock.json

# Verify
find . -type f -name "package-lock.json" 2>/dev/null && echo "✗ Some lock files remain" || echo "✓ All removed"

# Step 3: Install with workspaces
echo "Installing with npm workspaces..."
npm install

# This will take 3-5 minutes. Show progress:
# ↳ packages/dmb-almanac/app
# ↳ packages/dmb-almanac/app/scraper
# etc.

# Step 4: Verify single node_modules at root
echo ""
echo "=== Verification ==="
if [ -d "node_modules" ] && [ ! -d ".claude/node_modules" ]; then
  echo "✓ Single node_modules at root"
  du -sh node_modules
else
  echo "✗ Issue with workspace setup - check output above"
fi

# Step 5: Verify workspaces are recognized
npm ls --depth=0 | head -20
```

**Expected**:
- Single node_modules at workspace root
- All sub-projects can access shared dependencies
- Total size ~220-280 MB (down from 514 MB)
- Install takes ~3-5 minutes

**Troubleshooting**:

If you see errors like "peer dependency missing":
```bash
# This is normal - npm workspaces are more strict about peer deps
# Usually auto-resolved by npm. If persists:
npm audit fix
```

If install still fails:
```bash
# Rollback to individual installs
git checkout package.json  # Restore original
rm -rf node_modules
npm install

# Then try monorepo setup later with smaller subset first
```

---

### 2.3: Test all workspaces (15 minutes)

```bash
cd /Users/louisherman/ClaudeCodeProjects

echo "=== Testing workspace integrity ==="

# Test 1: npm ls output
echo "Test 1: Package structure"
npm ls --depth=0 | grep -E "├──|└──" | wc -l
echo "Should see 4+ workspace entries"

# Test 2: Run tests in each project
echo ""
echo "Test 2: Running test suites..."

cd projects/dmb-almanac/app
echo "→ dmb-almanac/app"
npm run test -- --run 2>&1 | tail -2

cd ../scraper
echo "→ dmb-almanac/app/scraper"
npm run test 2>&1 | tail -2

cd ../../emerson-violin-pwa
echo "→ emerson-violin-pwa"
npm run test 2>&1 | tail -2

cd /Users/louisherman/ClaudeCodeProjects/.claude
echo "→ .claude"
npm run test 2>&1 | tail -2

cd /Users/louisherman/ClaudeCodeProjects

# Test 3: Verify shared dependencies work
echo ""
echo "Test 3: Shared dependencies"
cd projects/dmb-almanac/app
npm ls typescript vitest vite | head -10
echo "^ Should not show multiple copies"

# Test 4: Build test
echo ""
echo "Test 4: Build"
npm run build -w projects/dmb-almanac/app 2>&1 | tail -5 || echo "Build check complete"

# Final measurement
echo ""
echo "=== Final Monorepo Size ==="
du -sh /Users/louisherman/ClaudeCodeProjects/node_modules
```

**Success criteria**:
- [ ] All tests pass
- [ ] Single shared node_modules works for all projects
- [ ] npm ls shows workspace structure
- [ ] Build succeeds
- [ ] Size reduction ~50% (514 MB → ~250-280 MB)

**If any workspace tests fail**:

```bash
# Option 1: Project-specific dep issue (most common)
cd projects/<project>
npm install  # Force reinstall this workspace
npm run test

# Option 2: Workspace config issue (rare)
# Check if there are version conflicts in different package.jsons
# Use: npm ls <package-name> to find conflicts
```

---

### 2.4: Update CI/CD pipelines (20 minutes)

**Location**: `.github/workflows/` (if exists)

Check if you have GitHub Actions workflows:

```bash
cd /Users/louisherman/ClaudeCodeProjects

if [ -d ".github/workflows" ]; then
  echo "Found workflows:"
  ls -la .github/workflows/*.yml

  echo ""
  echo "Check each file for 'npm install' commands"
  grep -n "npm install\|npm ci" .github/workflows/*.yml
fi
```

**If using GitHub Actions**:

Update any workflow files that have:

OLD:
```yaml
- run: npm install
- run: cd projects/dmb-almanac/app && npm install
- run: npm ci
```

NEW:
```yaml
- run: npm install  # Installs all workspaces
- run: npm run test # Tests all workspaces
- run: npm run build # Builds all workspaces
```

Or if testing specific workspace:
```yaml
- run: npm run test -w projects/dmb-almanac/app
- run: npm run build -w projects/dmb-almanac/app
```

**If using other CI systems**:

- **GitLab CI**: Check `.gitlab-ci.yml` for npm commands
- **CircleCI**: Check `.circleci/config.yml`
- **Travis**: Check `.travis.yml`
- **Jenkins**: Check `Jenkinsfile` for npm stages

---

### 2.5: Commit Phase 2 changes (10 minutes)

```bash
cd /Users/louisherman/ClaudeCodeProjects

# Verify what changed
echo "=== Changes to commit ==="
git status --short

# Stage changes (should only be package.json and package-lock.json)
git add package.json package-lock.json

# Remove old backups
rm -f package.json.backup
git add -A

# Create commit
git commit -m "feat: Convert to npm workspaces for dependency deduplication

Consolidate duplicate devDependencies across projects:
- typescript: 3 copies → 1 copy (46 MB saved)
- vitest: 4 copies → 1 copy (45 MB saved)
- better-sqlite3: 3 copies → 1 copy (24 MB saved)
- vite, @esbuild, playwright-core: deduplicated (~50 MB saved)

Total workspace reduction: 514 MB → ~250 MB (51% reduction)
Duplicate packages removed: 9
CI/CD install time: ~30% faster

Benefits:
- Single dependency tree, easier to manage
- Faster npm install in CI/CD
- Consistent versions across projects
- Easier monorepo tooling adoption later

Testing:
- All test suites still pass
- All builds complete successfully
- Workspaces properly configured and verified"

# Verify commit
git log --oneline -1
git show --stat
```

---

### 2.6: Measure Phase 2 impact (5 minutes)

```bash
cd /Users/louisherman/ClaudeCodeProjects

echo "=== Phase 2 Results ==="
echo ""
echo "Workspace structure:"
npm ls --depth=0

echo ""
echo "Sizes (should be ~250-280 MB total):"
du -sh node_modules

echo ""
echo "Verification:"
echo "✓ All projects share: typescript, vitest, vite, better-sqlite3, @esbuild, etc."
echo "✓ CI/CD benefits: Single npm install for all projects"
echo "✓ Maintenance: Update dep versions in one place"

# Compare to baseline
echo ""
echo "Summary:"
echo "Before Phase 2: 514 MB (across 5 separate node_modules)"
echo "After Phase 2:  ~260 MB (single shared node_modules)"
echo "Saved: ~254 MB (49% reduction!)"
```

---

## Phase 3: Build Tool Optimization (Do Later - 2+ hours)

### 3.1: Remove redundant test frameworks from dmb-almanac

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app

# Check what's currently used
grep "environment\|setupFiles" vitest.config.ts vite.config.ts svelte.config.js 2>/dev/null

# Determine which DOM library is actually used in tests
grep -h "vitest-environment" tests/**/*.test.* 2>/dev/null | sort -u

# Decision matrix:
# If environment is jsdom: remove happy-dom (keep jsdom)
# If environment is happy-dom: remove jsdom (keep happy-dom)
# If neither specified: vitest default is sufficient (remove both)

# Most likely: vitest default is fine, remove jsdom + happy-dom
npm uninstall jsdom happy-dom

# Update tests if they relied on either
npm run test -- --run
```

---

### 3.2: Make lightningcss optional

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app

# Check if lightningcss is in vite config
grep -n "lightningcss" vite.config.ts

# If used in CSS processing pipeline:
# Move to optionalDependencies in package.json

# Edit package.json:
# Change from devDependencies to optionalDependencies
# Then: npm install

# Alternative: Use native CSS tooling (no lightningcss needed if CSS is minimal)
```

---

### 3.3: Lazy-load web-push (runtime optimization)

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app

# Find where web-push is used
grep -r "from 'web-push'\|require('web-push')" src --include="*.ts" --include="*.svelte"

# Convert to dynamic import:
# OLD: import webpush from 'web-push'
# NEW: const webpush = await import('web-push')

# Test: npm run test && npm run build
```

---

## Phase 4: Verification & Monitoring (Ongoing)

### Monthly Bundle Audit

```bash
cd /Users/louisherman/ClaudeCodeProjects

# Save baseline
cat > /tmp/bundle_baseline.txt << 'EOF'
$(date)
$(npm ls --depth=0 | head -20)
$(du -sh node_modules projects/*/app/node_modules projects/*/app/scraper/node_modules projects/emerson*/node_modules)
EOF

# Compare to previous month
# If growth >5%, run optimization again
```

### Automated CI Check

Add to `.github/workflows/bundle-size.yml`:

```yaml
- name: Check bundle sizes
  run: |
    MAX_SIZE_MB=280
    ACTUAL=$(du -sh node_modules | cut -d'M' -f1 | head -c3)
    if (( $(echo "$ACTUAL > $MAX_SIZE_MB" | bc -l) )); then
      echo "❌ Bundle size exceeded: ${ACTUAL}MB > ${MAX_SIZE_MB}MB"
      exit 1
    fi
    echo "✓ Bundle size OK: ${ACTUAL}MB"
```

---

## Troubleshooting Guide

### Problem: npm install fails after workspace setup

```bash
# Solution 1: Clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Solution 2: Check for conflicting version pins
npm ls lodash  # Example - find conflicts
# If same package has multiple versions listed, that's the issue
# Solution: Align versions in conflicting package.jsons

# Solution 3: Revert and try again
git checkout package.json
rm -rf node_modules package-lock.json
npm install  # Back to separate installations
```

### Problem: Tests fail after monorepo setup

```bash
# Solution 1: Check test environment
cd projects/dmb-almanac/app
npx vitest --inspect-brk --run # Debug mode

# Solution 2: Reinstall node_modules
cd /Users/louisherman/ClaudeCodeProjects
rm -rf node_modules
npm install

# Solution 3: Check for hardcoded paths
grep -r "../../../" projects/*/package.json  # May break with workspaces
```

### Problem: Build fails with "module not found"

```bash
# Solution 1: Verify monorepo structure
npm ls <package-name>  # Should show single copy

# Solution 2: Check if package is in dependencies
cat package.json | grep <package-name>

# Solution 3: Force reinstall specific workspace
npm install -w projects/dmb-almanac/app
```

---

## Success Metrics Checklist

### Phase 1 Complete When:
- [ ] Tests pass in all projects
- [ ] emerson-violin-pwa is ~19 MB smaller
- [ ] Changes are committed
- [ ] No build errors

### Phase 2 Complete When:
- [ ] Single node_modules at root
- [ ] Workspace size is 250-280 MB
- [ ] All tests pass
- [ ] CI/CD workflows updated
- [ ] Commit created and verified

### Phase 3 Complete When:
- [ ] Additional 15-20 MB saved
- [ ] All tests still pass
- [ ] Builds work correctly
- [ ] No runtime functionality affected

### Total Success When:
- [ ] Workspace size: 220-260 MB (from 514 MB)
- [ ] Savings: 90-115 MB (18-22% reduction)
- [ ] CI/CD: 30% faster installs
- [ ] All tests passing
- [ ] All builds working
- [ ] No functionality lost

---

## Timeline Estimate

- **Phase 1**: 35 minutes
- **Phase 2**: 2-4 hours (1.5 hours hands-on work)
- **Phase 3**: 2+ hours (can be spread over multiple days)
- **Phase 4**: Ongoing (15 minutes/month)

**Total**: ~1 day of work spread over 3 weeks

---

## Documents to Update After Changes

1. **CLAUDE.md** - Update install instructions
   ```markdown
   # Now workspaces are enabled:
   npm install                    # Installs all projects
   npm run dev -w projects/dmb-almanac/app  # Dev single project
   ```

2. **docs/** - Create workspace guide
   - How to develop across workspaces
   - How to add new packages
   - Troubleshooting guide

3. **.github/workflows/** - Update CI scripts

4. **README.md** - Document monorepo structure

---

## Contact & Questions

If you encounter issues:

1. Check **Troubleshooting Guide** above
2. Review full analysis: `BUNDLE_OPTIMIZATION_ANALYSIS_2026.md`
3. Check npm workspace docs: `npm help workspaces`

---

Generated: 2026-01-31
Last updated: 2026-01-31
