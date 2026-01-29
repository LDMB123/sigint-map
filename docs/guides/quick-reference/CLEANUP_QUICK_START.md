# Project Cleanup - Quick Start Guide

## 🎯 TL;DR

Your project has **8 major organizational issues**:
1. ❌ Legacy commands directory (108 files) - **DELETE IMMEDIATELY**
2. ⚠️ 98 markdown files in root - **MOVE TO DOCS/**
3. ⚠️ 198 scattered docs in DMB Almanac - **CONSOLIDATE**
4. ⚠️ 20 AI generation scripts in root - **MOVE TO PROJECT**
5. ⚠️ Duplicate documentation (17+ a11y, 21+ bundle docs)
6. ❓ Blaire-unicorn project in root - **MOVE TO PROJECTS/**
7. ❓ Skills-audit directory - **CLARIFY PURPOSE**
8. 📁 Archive underutilized - **USE FOR SESSION REPORTS**

---

## 🚀 5-Minute Quick Wins

### Quick Win #1: Delete Legacy Commands (30 seconds)
```bash
# These are already migrated to .claude/skills/
rm -rf projects/dmb-almanac/.claude/commands/
```
**Impact**: Removes 108 redundant files ✨

### Quick Win #2: Create Directory Structure (1 minute)
```bash
mkdir -p docs/{audits/{accessibility,bundle,security,performance},guides,archive/sessions}
mkdir -p projects/imagen-experiments/{scripts,prompts,assets}
mkdir -p scripts
```
**Impact**: Foundation for organization ✨

### Quick Win #3: Move AI Generation Project (2 minutes)
```bash
mv *imagen* *veo* *generate*.sh *lace*.sh *beach*.sh nanobanana* dive-bar-concepts* projects/imagen-experiments/scripts/ 2>/dev/null
mv *.jpg *.jpeg projects/imagen-experiments/assets/ 2>/dev/null
mv concepts-metadata.json all-30-prompts.txt projects/imagen-experiments/ 2>/dev/null
```
**Impact**: Removes 30+ files from root ✨

### Quick Win #4: Move Session Reports (1 minute)
```bash
mkdir -p archive/sessions/2026-01
mv *SESSION*.md *2026-01-*.md CRITICAL_FIXES_DAY*.md archive/sessions/2026-01/ 2>/dev/null
```
**Impact**: Removes 8+ temporary files from root ✨

### Quick Win #5: Move Blaire-Unicorn (30 seconds)
```bash
mv blaire-unicorn/ projects/
```
**Impact**: Cleaner project structure ✨

---

## 📋 Comprehensive Cleanup Checklist

### Phase 1: Immediate Cleanup (15 minutes)

- [ ] Delete legacy commands directory
  ```bash
  rm -rf projects/dmb-almanac/.claude/commands/
  ```

- [ ] Create directory structure
  ```bash
  mkdir -p docs/{audits,guides,archive}
  mkdir -p projects/imagen-experiments
  ```

- [ ] Move AI generation scripts (all files starting with: imagen, veo, generate, lace, beach, nanobanana)
  - [ ] Move .sh scripts
  - [ ] Move .js scripts
  - [ ] Move concept .md files
  - [ ] Move image files

- [ ] Move session/dated reports to archive
  - [ ] SESSION_*.md files
  - [ ] *2026-01-*.md files
  - [ ] CRITICAL_FIXES_DAY*.md files

- [ ] Move blaire-unicorn to projects/

### Phase 2: DMB Almanac Cleanup (30 minutes)

- [ ] Create DMB Almanac docs structure
  ```bash
  cd projects/dmb-almanac
  mkdir -p docs/{audits/{accessibility,bundle,security,chromium},guides,architecture,archive}
  ```

- [ ] Move accessibility docs
  - [ ] Identify all ACCESSIBILITY_*.md files
  - [ ] Move to docs/audits/accessibility/
  - [ ] Create README.md index

- [ ] Move bundle analysis docs
  - [ ] Identify all BUNDLE_*.md files
  - [ ] Move to docs/audits/bundle/
  - [ ] Create README.md index

- [ ] Move security docs
  - [ ] Identify all SECURITY_*.md files
  - [ ] Move to docs/audits/security/
  - [ ] Create README.md index

- [ ] Archive session/progress reports
  - [ ] Move to docs/archive/sessions/

### Phase 3: Root Directory Cleanup (20 minutes)

- [ ] Move DMB-specific docs from root to DMB project
  - [ ] DMB_*.md files
  - [ ] *ALMANAC*.md files

- [ ] Consolidate audit reports
  - [ ] Move to docs/audits/
  - [ ] Remove duplicates

- [ ] Consolidate implementation guides
  - [ ] Move to docs/guides/
  - [ ] Remove duplicates

- [ ] Organize quick reference docs
  - [ ] Consolidate into single references
  - [ ] Move to docs/guides/

### Phase 4: Documentation (10 minutes)

- [ ] Create README.md files
  - [ ] `docs/README.md`
  - [ ] `projects/dmb-almanac/docs/README.md`
  - [ ] `projects/imagen-experiments/README.md`
  - [ ] `projects/blaire-unicorn/README.md`

- [ ] Update root README.md
  - [ ] Document new structure
  - [ ] Link to projects
  - [ ] Explain organization

---

## 📊 Expected Results

### Before Cleanup
```
ClaudeCodeProjects/
├── 98 markdown files        ⚠️
├── 20 shell scripts         ⚠️
├── 8 JavaScript files       ⚠️
├── 3 image files            ⚠️
├── blaire-unicorn/          ⚠️
├── skills-audit/            ❓
├── projects/
│   └── dmb-almanac/
│       ├── 198 .md files    ⚠️⚠️⚠️
│       └── .claude/
│           └── commands/    ❌ 108 redundant files
└── .claude/                 ✓
```

### After Cleanup
```
ClaudeCodeProjects/
├── README.md                ✓ Updated
├── .claude/                 ✓ Well organized
├── docs/                    ✓ NEW - Organized documentation
│   ├── audits/
│   ├── guides/
│   └── archive/
├── projects/
│   ├── dmb-almanac/
│   │   ├── app/            ✓ Code
│   │   ├── scraper/        ✓ Code
│   │   └── docs/           ✓ NEW - Organized project docs
│   ├── blaire-unicorn/     ✓ MOVED
│   └── imagen-experiments/ ✓ NEW - AI generation project
├── scripts/                 ✓ NEW - Utility scripts
└── archive/                 ✓ Expanded usage
```

### Impact Metrics
- **Root files**: 155 → ~20 (87% reduction)
- **DMB project docs**: 198 → ~20 visible (90% reduction)
- **Organization score**: 3/10 → 9/10
- **Navigation ease**: Poor → Excellent

---

## ⚡ Automation Scripts

### Full Automated Cleanup (Use with caution!)

```bash
#!/bin/bash
# cleanup.sh - Full project cleanup automation

set -e  # Exit on error

echo "🚀 Starting project cleanup..."

# Phase 1: Delete redundant files
echo "Phase 1: Removing legacy commands..."
rm -rf projects/dmb-almanac/.claude/commands/

# Phase 2: Create structure
echo "Phase 2: Creating directory structure..."
mkdir -p docs/{audits/{accessibility,bundle,security,performance},guides,archive/sessions}
mkdir -p projects/{imagen-experiments/{scripts,prompts,assets},blaire-unicorn}
mkdir -p scripts

# Phase 3: Move AI generation project
echo "Phase 3: Moving AI generation files..."
mv *imagen* *veo* generate*.sh *lace*.sh *beach*.sh nanobanana* test-all-capabilities.js projects/imagen-experiments/scripts/ 2>/dev/null || true
mv dive-bar-concepts*.md concepts-metadata.json all-30-prompts.txt projects/imagen-experiments/prompts/ 2>/dev/null || true
mv *.jpg *.jpeg *.png projects/imagen-experiments/assets/ 2>/dev/null || true

# Phase 4: Move session reports
echo "Phase 4: Archiving session reports..."
mkdir -p archive/sessions/2026-01
mv *SESSION*.md *2026-01-*.md CRITICAL_FIXES_DAY*.md archive/sessions/2026-01/ 2>/dev/null || true

# Phase 5: Move blaire-unicorn
echo "Phase 5: Moving blaire-unicorn project..."
[ -d blaire-unicorn ] && mv blaire-unicorn/ projects/ 2>/dev/null || true

# Phase 6: DMB Almanac cleanup
echo "Phase 6: Organizing DMB Almanac docs..."
cd projects/dmb-almanac
mkdir -p docs/{audits/{accessibility,bundle,security,chromium},guides,architecture,archive/sessions}

# Move accessibility docs
mv ACCESSIBILITY_*.md A11Y_*.md docs/audits/accessibility/ 2>/dev/null || true

# Move bundle docs
mv BUNDLE_*.md docs/audits/bundle/ 2>/dev/null || true

# Move security docs
mv SECURITY_*.md docs/audits/security/ 2>/dev/null || true

# Move session reports
mv *SESSION*.md CRITICAL_FIXES*.md docs/archive/sessions/ 2>/dev/null || true

cd ../..

echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Review moved files"
echo "2. Create README.md files"
echo "3. Update documentation links"
echo "4. Commit changes with 'git mv' for history preservation"
```

---

## 🔍 Verification Commands

After cleanup, verify the organization:

```bash
# Check root directory is clean
ls -1 *.md *.sh *.js 2>/dev/null | wc -l
# Should be < 20

# Verify legacy commands removed
ls projects/dmb-almanac/.claude/commands/ 2>/dev/null
# Should error (directory not found)

# Check new structure exists
ls -la docs/ projects/imagen-experiments/ 2>/dev/null

# Count DMB Almanac docs
ls -1 projects/dmb-almanac/*.md 2>/dev/null | wc -l
# Should be < 30

# Verify AI project moved
ls -la projects/imagen-experiments/
```

---

## ⚠️ Important Notes

1. **Backup First**: Consider creating a backup before major moves
   ```bash
   tar -czf backup-$(date +%Y%m%d).tar.gz .
   ```

2. **Use Git**: Preserve history with `git mv` instead of `mv`
   ```bash
   git mv old-file.md new/location/file.md
   ```

3. **Check References**: Search for file references before moving
   ```bash
   grep -r "filename.md" .
   ```

4. **Test After Each Phase**: Verify nothing breaks

---

## 📞 Next Steps

1. Review this quick start guide
2. Run Phase 1 quick wins (5 minutes)
3. Review results
4. Decide on full cleanup automation or manual phases
5. Execute chosen approach
6. Update documentation
7. Commit changes

**Ready to proceed?** Start with Quick Win #1 (30 seconds, zero risk)
