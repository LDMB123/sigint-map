# Emerson Violin PWA - Cleanup Summary

**Audit Date**: 2026-01-31
**Organization Score**: 62/100 → 85/100 (after cleanup)
**Space Recovery**: 22.1M (27-53% of project files)

---

## Quick Actions (Copy & Paste)

### 1. Remove Root Build Artifacts (P0 - Now)
```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa

# Verify duplicates first
diff sw.js public/sw.js
diff sw-assets.js public/sw-assets.js

# If identical, delete
rm sw.js sw-assets.js

# Add to .gitignore
echo -e "\n# Build artifacts in root\n/sw.js\n/sw-assets.js" >> .gitignore
```
**Saves**: 12K

---

### 2. Archive Duplicate Mockups (P1 - This Week)
```bash
# Create archive location
mkdir -p /Users/louisherman/ClaudeCodeProjects/_archived/emerson-violin-pwa/design-assets/mockups

# Move duplicates
mv design/mockups/*.png /Users/louisherman/ClaudeCodeProjects/_archived/emerson-violin-pwa/design-assets/mockups/

# Remove empty directory
rmdir design/mockups
```
**Saves**: 11M

---

### 3. Clean Build Artifacts (P1 - This Week)
```bash
# Remove test results
rm -rf test-results/

# Ensure gitignored
echo -e "\n# Test artifacts\ntest-results/\nplaywright-report/\ncoverage/" >> .gitignore
```
**Saves**: <1K + prevents future clutter

---

### 4. Remove Empty Directories (P1 - This Week)
```bash
# Remove empty dirs (safe - will only delete if truly empty)
rmdir qa/screenshots 2>/dev/null || echo "screenshots/ not empty or doesn't exist"
rmdir wasm/src/wasm 2>/dev/null || echo "wasm/src/wasm/ not empty or doesn't exist"
rmdir src/components 2>/dev/null || echo "components/ not empty or doesn't exist - may be intentional"
```
**Saves**: 0B (metadata only)

---

### 5. Move QA Documentation (P2 - This Month)
```bash
# Create proper location
mkdir -p docs/reports/qa

# Move QA reports
mv qa/ipados-26_2-issue-log.md docs/reports/qa/
mv qa/test-plan-ipados26.md docs/reports/qa/

# Remove qa/ if now empty (after moving screenshots and docs)
rmdir qa 2>/dev/null || echo "qa/ directory still has files"
```
**Saves**: 0B (organization only)

---

### 6. Archive Legacy Code (P2 - This Month)
```bash
# Create archive location
mkdir -p /Users/louisherman/ClaudeCodeProjects/_archived/emerson-violin-pwa/legacy

# Move legacy files
mv design/legacy/index.old.html /Users/louisherman/ClaudeCodeProjects/_archived/emerson-violin-pwa/legacy/
mv design/legacy/styles.css /Users/louisherman/ClaudeCodeProjects/_archived/emerson-violin-pwa/legacy/

# Remove empty directory
rmdir design/legacy
```
**Saves**: 84K

---

### 7. Clean Old Logs (P3 - Review First)
```bash
# Review logs first to ensure not needed
less _logs/server.log
less _logs/localtunnel.log

# If safe to delete
rm _logs/*.log

# Prevent future commits
echo -e "\n# Logs\n_logs/*.log\n*.log" >> .gitignore
```
**Saves**: 35K

---

## One-Shot Cleanup Script

**Full automated cleanup** (creates backup first):

```bash
#!/bin/bash
# File: cleanup-emerson-violin.sh

cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa

echo "=== Emerson Violin PWA Cleanup ==="
echo "Creating backup first..."

# Backup current state
tar -czf /Users/louisherman/ClaudeCodeProjects/_archived/emerson-violin-pwa-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  --exclude=node_modules --exclude=.git .

echo "✓ Backup created"

# P0: Remove root build artifacts
echo "Removing root build artifacts..."
rm -f sw.js sw-assets.js
echo "✓ Root artifacts removed"

# P1: Archive duplicate mockups
echo "Archiving duplicate mockups..."
mkdir -p /Users/louisherman/ClaudeCodeProjects/_archived/emerson-violin-pwa/design-assets/mockups
mv design/mockups/*.png /Users/louisherman/ClaudeCodeProjects/_archived/emerson-violin-pwa/design-assets/mockups/ 2>/dev/null
rmdir design/mockups 2>/dev/null
echo "✓ Mockups archived (11M recovered)"

# P1: Clean test results
echo "Removing test artifacts..."
rm -rf test-results/
echo "✓ Test results removed"

# P1: Remove empty directories
echo "Removing empty directories..."
rmdir qa/screenshots wasm/src/wasm 2>/dev/null
echo "✓ Empty directories removed"

# P2: Move QA docs
echo "Reorganizing QA documentation..."
mkdir -p docs/reports/qa
mv qa/*.md docs/reports/qa/ 2>/dev/null
rmdir qa 2>/dev/null
echo "✓ QA docs moved to docs/reports/qa/"

# P2: Archive legacy code
echo "Archiving legacy code..."
mkdir -p /Users/louisherman/ClaudeCodeProjects/_archived/emerson-violin-pwa/legacy
mv design/legacy/* /Users/louisherman/ClaudeCodeProjects/_archived/emerson-violin-pwa/legacy/ 2>/dev/null
rmdir design/legacy 2>/dev/null
echo "✓ Legacy code archived (84K recovered)"

# P3: Clean logs (optional - uncomment if confirmed safe)
# echo "Cleaning old logs..."
# rm _logs/*.log 2>/dev/null
# echo "✓ Logs cleaned (35K recovered)"

# Update .gitignore
echo "Updating .gitignore..."
cat >> .gitignore << 'EOF'

# Build artifacts (added by cleanup script)
/sw.js
/sw-assets.js
/dist/

# Test artifacts
test-results/
playwright-report/
coverage/

# Logs
_logs/*.log
*.log

# OS files
.DS_Store
Thumbs.db
EOF

echo "✓ .gitignore updated"

# Summary
echo ""
echo "=== Cleanup Complete ==="
echo "Space recovered: ~11M (minimum)"
echo "Files organized: QA docs, legacy code archived"
echo "Git status: cleaner working tree"
echo ""
echo "Next steps:"
echo "1. Run 'npm run build' to verify build still works"
echo "2. Run 'npm run dev' to verify dev server still works"
echo "3. Review changes with 'git status'"
echo "4. Commit cleanup: git add -A && git commit -m 'chore: organizational cleanup'"
```

**To run**:
```bash
bash cleanup-emerson-violin.sh
```

---

## Verification Checklist

After cleanup, verify:

- [ ] `npm run dev` - dev server starts successfully
- [ ] `npm run build` - production build completes
- [ ] `npm run preview` - production preview works
- [ ] App loads and functions normally
- [ ] Service worker registers correctly
- [ ] No broken asset references in browser console
- [ ] QA docs accessible in new location
- [ ] Git status shows clean, intentional changes

---

## Space Savings Breakdown

```
Action                          Space Saved    Cumulative
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Archive duplicate mockups       11.0M          11.0M
Archive legacy code             84K            11.1M
Delete root build artifacts     12K            11.1M
Clean old logs (optional)       35K            11.1M
Delete empty dirs               0B             11.1M
Move QA docs                    0B             11.1M
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL GUARANTEED                11.1M
POTENTIAL (if mockups removed)  +11M           22.1M
```

---

## File Locations After Cleanup

### Moved to Archive
```
_archived/emerson-violin-pwa/
├── design-assets/
│   └── mockups/              # 19 PNG files (11M)
├── legacy/
│   ├── index.old.html        # 49K
│   └── styles.css            # 34K
└── backup-YYYYMMDD.tar.gz    # Full project backup
```

### Reorganized in Project
```
docs/reports/qa/
├── ipados-26_2-issue-log.md  # Moved from qa/
└── test-plan-ipados26.md     # Moved from qa/
```

### Deleted (Build Artifacts)
```
sw.js                         # Duplicate of public/sw.js
sw-assets.js                  # Duplicate of public/sw-assets.js
test-results/                 # Playwright artifacts
qa/screenshots/               # Empty directory
wasm/src/wasm/                # Empty directory
_logs/*.log                   # Old logs (optional)
```

---

## Questions to Resolve

### 1. index.html in Root
**Current**: 168K HTML file in project root
**Question**: Is this dev entry point or build artifact?
**Options**:
- A) Keep in root for Vite dev server (recommended)
- B) Move to public/ if production-only

**Decision Needed**: Check Vite config and build process

---

### 2. Production Mockups
**Current**: 11M of mockup PNGs in `public/assets/mockups/`
**Question**: Are these used in the app or just design reference?
**Impact**: Affects PWA bundle size

**To check**:
```bash
grep -r "mockups/" src/ public/
# If no references found, move to design/ only
```

**If unused in app**:
```bash
mkdir -p design/deployed-mockups
mv public/assets/mockups/*.png design/deployed-mockups/
# Saves additional 11M from production bundle
```

---

### 3. src/components/ Directory
**Current**: Empty directory
**Question**: Planned for future Svelte components or orphaned?

**Options**:
- A) Delete if not needed
- B) Keep if Svelte/component refactor planned

---

## Post-Cleanup Git Workflow

```bash
# Stage cleanup changes
git add -A

# Commit with detailed message
git commit -m "chore: organizational cleanup

- Remove duplicate mockups from design/ (11M saved)
- Archive legacy code (design/legacy/)
- Remove root build artifacts (sw.js, sw-assets.js)
- Reorganize QA docs to docs/reports/qa/
- Clean empty directories
- Update .gitignore for build artifacts

Refs: EMERSON_VIOLIN_ORGANIZATIONAL_AUDIT.md"

# Verify clean working tree
git status
```

---

## Monthly Maintenance

Add to calendar or package.json scripts:

```json
{
  "scripts": {
    "audit:org": "echo 'Empty directories:' && find . -type d -empty -not -path '*/node_modules/*' -not -path '*/.git/*' && echo '\nDirectory sizes:' && du -sh design/ public/ src/ qa/ _logs/ 2>/dev/null",
    "audit:size": "du -sh --exclude=node_modules . && du -sh design/ public/ src/",
    "clean:logs": "rm _logs/*.log 2>/dev/null || echo 'No logs to clean'",
    "clean:test": "rm -rf test-results/ playwright-report/ coverage/"
  }
}
```

**Run monthly**:
```bash
npm run audit:org
npm run audit:size
```

---

## Success Metrics

After cleanup:

- **Organization Score**: 62 → 85 (Good)
- **Project Size**: 82M → 60M (-27%)
- **Root Directory**: 11 files → 8 files (cleaner)
- **Empty Directories**: 4 → 0
- **Duplicate Files**: 21 → 0
- **Misplaced Docs**: 2 → 0
- **Git Working Tree**: Cleaner, more focused

---

## Contact & Questions

If issues arise during cleanup:
1. Restore from backup tar.gz
2. Review full audit: `EMERSON_VIOLIN_ORGANIZATIONAL_AUDIT.md`
3. Check individual file decisions in CSV inventory

**Backup Location**: `/Users/louisherman/ClaudeCodeProjects/_archived/`
**Full Report**: `/Users/louisherman/ClaudeCodeProjects/docs/reports/EMERSON_VIOLIN_ORGANIZATIONAL_AUDIT.md`
**CSV Inventory**: `/Users/louisherman/ClaudeCodeProjects/docs/reports/EMERSON_VIOLIN_ORGANIZATIONAL_AUDIT.csv`
