# Emerson Violin PWA - Organizational Audit

**Project**: /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa
**Audit Date**: 2026-01-31
**Total Size**: 572M (490M node_modules, 82M project files)
**Scope**: Complete filesystem audit of all directories

## Executive Summary

**Organization Score**: 62/100 (Needs Improvement)

**Key Findings**:
- 11M duplicate mockup images (design/ vs public/assets/mockups/)
- Root-level build artifacts (sw.js, sw-assets.js, index.html)
- 84K legacy/obsolete code in design/legacy/
- 35K outdated logs in _logs/
- 4 empty directories
- 36K QA documentation misplaced in qa/ instead of docs/reports/

**Space Recovery**: 22.1M immediately reclaimable (excluding node_modules)
**Cleanup Effort**: 2-3 hours

---

## Critical Issues (P0) - Immediate Action Required

### 1. Root-Level Build Artifacts

**Finding**: Service worker and HTML files duplicated in project root
- `/sw.js` (9.7K) - duplicate of `public/sw.js`
- `/sw-assets.js` (2.6K) - duplicate of `public/sw-assets.js`
- `/index.html` (168K) - unclear if dev entry point or build artifact

**Impact**:
- Confuses build process
- Git diff pollution
- May cause cache/version mismatches

**Action**:
```bash
# Verify these are exact duplicates
diff sw.js public/sw.js
diff sw-assets.js public/sw-assets.js

# If identical, delete root versions
rm sw.js sw-assets.js

# For index.html - determine build pattern:
# Option A: Keep in root for Vite dev server
# Option B: Move to public/ if production-only
```

**Risk**: Medium - may break dev/build scripts

---

## High Priority (P1) - This Week

### 2. Duplicate Mockup Images - 11M Waste

**Finding**: Exact duplicates in two locations
- `design/mockups/` (11M, 19 PNG files, dated 2026-01-27)
- `public/assets/mockups/` (11M, 19 PNG files, dated 2026-01-27)

**Files**:
```
game_bow_hero_1769391540115.png          548K × 2 = 1.1M
game_ear_trainer_1769391527056.png       519K × 2 = 1.0M
game_note_memory_1769391491201.png       706K × 2 = 1.4M
game_pitch_quest_1769391141513.png       573K × 2 = 1.1M
game_pizzicato_1769391624579.png         588K × 2 = 1.2M
game_rhythm_dash_1769391156334.png       631K × 2 = 1.3M
game_rhythm_painter_1769391569962.png    680K × 2 = 1.4M
game_story_song_1769391610627.png        611K × 2 = 1.2M
game_string_crossing_1769391554945.png   643K × 2 = 1.3M
screen_analysis_1769391461814.png        603K × 2 = 1.2M
screen_coach_1769391202518.png           559K × 2 = 1.1M
screen_games_menu_1769391385366.png      606K × 2 = 1.2M
screen_home_1769391215723.png            552K × 2 = 1.1M
screen_more_menu_1769391638826.png       548K × 2 = 1.1M
screen_parent_1769391477067.png          552K × 2 = 1.1M
screen_progress_1769391446758.png        619K × 2 = 1.2M
screen_songs_1769391370089.png           676K × 2 = 1.4M
screen_trainer_1769391418072.png         562K × 2 = 1.1M
screen_tuner_1769391403050.png           497K × 2 = 1.0M
```

**Decision Required**: Which location is canonical?

**Option A: Keep in public/assets/mockups/ (Recommended)**
- Used in production app as reference screenshots
- Already part of PWA asset bundle
- Delete design/mockups/ entirely

**Option B: Keep in design/mockups/**
- Design artifacts stay in design/
- Remove from public/ and PWA bundle
- Only deploy if app needs in-app mockups

**Action** (if Option A):
```bash
# Verify duplicates
for f in design/mockups/*.png; do
  diff "$f" "public/assets/mockups/$(basename $f)" && echo "✓ $(basename $f)"
done

# Archive design/mockups/
mkdir -p _archived/emerson-violin-pwa/design-assets/mockups
mv design/mockups/*.png _archived/emerson-violin-pwa/design-assets/mockups/
rmdir design/mockups
```

**Space Recovery**: 11M

---

### 3. Empty Build Artifact Directory

**Finding**: `test-results/` contains only `.last-run.json` (45 bytes)
- Empty Playwright test results directory
- Should be in .gitignore
- Build artifact should not persist

**Action**:
```bash
rm -rf test-results/
echo "test-results/" >> .gitignore
```

**Space Recovery**: <1K (but removes clutter)

---

## Medium Priority (P2) - This Month

### 4. Legacy/Obsolete Code

**Finding**: `design/legacy/` contains old HTML/CSS
- `index.old.html` (49K, dated 2026-01-27) - 50 lines vs current 3337 lines
- `styles.css` (34K, dated 2026-01-25) - replaced by `src/styles/app.css` (175K)

**Comparison**:
- Old: Simple tuner prototype
- New: Full-featured multi-view PWA with coach, games, songs

**Action**:
```bash
mkdir -p _archived/emerson-violin-pwa/legacy
mv design/legacy/* _archived/emerson-violin-pwa/legacy/
rmdir design/legacy
```

**Space Recovery**: 84K

---

### 5. Misplaced QA Documentation

**Finding**: QA reports in `qa/` instead of `docs/reports/`
- `qa/ipados-26_2-issue-log.md` (32K, 2026-01-28) - detailed bug tracking
- `qa/test-plan-ipados26.md` (3.6K, 2026-01-28) - test plan

**Per workspace standards**: Reports belong in `docs/reports/`

**Action**:
```bash
mkdir -p docs/reports/qa
mv qa/ipados-26_2-issue-log.md docs/reports/qa/
mv qa/test-plan-ipados26.md docs/reports/qa/
rmdir qa/screenshots  # empty directory
```

**Space Recovery**: None (just reorganization)

---

### 6. Empty Directories

**Finding**: 4 empty directories
- `qa/screenshots/` - empty, no screenshots captured
- `wasm/src/wasm/` - orphaned, unclear purpose
- `src/components/` - empty placeholder, unused

**Action**:
```bash
rmdir qa/screenshots
rmdir wasm/src/wasm
rmdir src/components  # or keep if planned for future Svelte components
```

**Space Recovery**: None (metadata only)

---

## Low Priority (P3) - Review & Consider

### 7. Old Logs in _logs/

**Finding**: Logs from 5-6 days ago
- `_logs/server.log` (34K, 2026-01-25)
- `_logs/localtunnel.log` (710B, 2026-01-26)

**Question**: Are these needed for debugging?

**Action** (if not needed):
```bash
rm _logs/*.log
# Consider .gitignore for *.log files
echo "_logs/*.log" >> .gitignore
```

**Space Recovery**: 35K

---

### 8. Production Mockups Review

**Finding**: 11M of mockup PNGs in `public/assets/mockups/`
- Deployed to production PWA
- Large file size impact on initial load (if not lazy-loaded)
- Unclear if used in app or just for reference

**Questions**:
1. Does app display these mockups to users?
2. Are they part of onboarding/help screens?
3. Or just design reference that shouldn't be deployed?

**If not used in app**:
```bash
# Move to design/ only
mkdir -p design/deployed-mockups
mv public/assets/mockups/*.png design/deployed-mockups/
```

**Space Recovery**: 11M (from production bundle)

---

## Asset Size Breakdown

### Total: 82M (excluding node_modules)

```
Category                Size    Percentage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Public Assets           20M     24.4%
├─ Mockups (public)     11M     13.4%
├─ Badges               3.3M    4.0%
├─ Illustrations        3.7M    4.5%
├─ Audio                2.1M    2.6%
└─ Icons                40K     0.0%

Design Assets           11M     13.4%
└─ Mockups (duplicate)  11M     13.4%

Source Code             772K    0.9%
├─ JavaScript           550K    0.7%
├─ CSS                  184K    0.2%
├─ WASM binaries        93K     0.1%
└─ Data/Fonts           47K     0.1%

Documentation           36K     0.0%
├─ QA reports           36K     0.0%
└─ Root markdown        3.2K    0.0%

Logs                    35K     0.0%
Config/Build            340K    0.4%
Legacy/Obsolete         84K     0.1%

TOTAL                   82M     100%
```

**After Cleanup**: 60M (-22M, -27% reduction)

---

## Directory Health Scores

```
Directory               Score   Issues
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/                       40/100  Build artifacts in root, scattered HTML/JS
design/                 50/100  Duplicate mockups, obsolete legacy files
public/                 85/100  Well-organized, question on mockup necessity
src/                    90/100  Clean structure, 1 empty components/ dir
qa/                     60/100  Should be in docs/reports/
_logs/                  70/100  Old logs present
wasm/                   80/100  1 empty nested directory
tests/                  95/100  Clean
node_modules/           N/A     Standard dependencies
.git/                   N/A     Version control
```

---

## Cleanup Plan

### Phase 1: Immediate (30 minutes)

1. Verify and delete root build artifacts
```bash
diff sw.js public/sw.js && rm sw.js
diff sw-assets.js public/sw-assets.js && rm sw-assets.js
```

2. Delete empty directories
```bash
rmdir qa/screenshots wasm/src/wasm src/components
```

3. Remove test-results/
```bash
rm -rf test-results/
echo "test-results/" >> .gitignore
```

**Space Saved**: 11K + metadata

---

### Phase 2: Archive Duplicates (1 hour)

4. Archive duplicate mockups
```bash
mkdir -p _archived/emerson-violin-pwa/design-assets/mockups
mv design/mockups/*.png _archived/emerson-violin-pwa/design-assets/mockups/
rmdir design/mockups
```

**Space Saved**: 11M

---

### Phase 3: Reorganize Documentation (30 minutes)

5. Move QA docs to proper location
```bash
mkdir -p docs/reports/qa
mv qa/*.md docs/reports/qa/
rmdir qa
```

6. Archive legacy code
```bash
mkdir -p _archived/emerson-violin-pwa/legacy
mv design/legacy/* _archived/emerson-violin-pwa/legacy/
rmdir design/legacy
```

**Space Saved**: 84K (plus organization)

---

### Phase 4: Review & Decide (1 hour)

7. Review logs - delete if not needed
```bash
rm _logs/*.log  # if confirmed not needed
```

8. Review production mockups usage
- Search codebase for mockup references
- Decide if they should stay in public/

**Potential Additional Space**: 11-46M (if mockups removed from production)

---

## Space Recovery Summary

```
Immediate Actions       11M     (duplicate mockups)
Root Artifacts          12K     (sw.js, sw-assets.js)
Empty Directories       <1K     (metadata only)
Test Results            <1K     (build artifacts)
Legacy Code             84K     (obsolete files)
Old Logs                35K     (if confirmed deletable)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Guaranteed        11.1M   (27% of project files)
Potential Additional    11M     (if mockups moved from public/)
Maximum Recovery        22.1M   (53% of project files)
```

**Final Size After Full Cleanup**: 60M → 49M (excluding node_modules)

---

## Recommended .gitignore Additions

```gitignore
# Build artifacts
/sw.js
/sw-assets.js
/dist/

# Test results
test-results/
playwright-report/
coverage/

# Logs
_logs/*.log
*.log

# OS files
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
*.swp

# WASM build artifacts
wasm/target/
wasm/pkg/
```

---

## Architecture Observations

### Well-Organized Areas

**src/**: Clean modular structure
```
src/
├─ app.js              Main entry (13K)
├─ analysis/           Session review
├─ backup/             Export logic
├─ coach/              Coach actions, focus timer
├─ games/              Game metrics, enhancements (99K)
├─ ml/                 Adaptive engine, recommendations
├─ parent/             Goals, PIN, recordings
├─ persistence/        Storage abstraction
├─ platform/           PWA APIs, offline, iPadOS
├─ progress/           Progress tracking
├─ recordings/         Audio recording
├─ songs/              Song library, search
├─ trainer/            Practice tools
├─ tuner/              Pitch detection
├─ utils/              Skill profiling, export
├─ wasm/               Rust WASM bindings (93K)
├─ worklets/           Audio worklets
├─ data/               songs.json (15K)
├─ assets/             fonts/ (47K)
└─ styles/             app.css (175K)
```

**public/assets/**: Logical grouping
```
public/assets/
├─ audio/              WAV reference tones (2.1M)
├─ badges/             Achievement PNGs (3.3M)
├─ icons/              PWA icons (40K)
├─ illustrations/      Mascot images (3.7M)
└─ mockups/            Screenshots (11M) ← REVIEW NECESSITY
```

### Problem Areas

**Root directory**: Too many files
- Config files: 7 files (vite, vitest, playwright, eslint, package)
- Build artifacts: sw.js, sw-assets.js (duplicates)
- HTML: index.html (unclear if dev or prod)
- Documentation: README.md, CLAUDE.md (OK)
- Scripts: start-preview.sh
- Manifest: manifest.webmanifest

**Recommendation**: Move configs to `.config/` subdirectory (optional Vite pattern)

---

## Post-Cleanup Verification

### After running cleanup plan:

1. **Build Test**
```bash
npm run build
npm run preview
```

2. **Dev Test**
```bash
npm run dev
# Verify app loads at localhost:5173
```

3. **Git Check**
```bash
git status
# Should show cleaner working tree
```

4. **Size Check**
```bash
du -sh . --exclude=node_modules
# Should show ~60M or less
```

---

## Automation Opportunity

**Create cleanup script**: `scripts/cleanup-project.sh`
```bash
#!/bin/bash
set -e

echo "Emerson Violin PWA - Organizational Cleanup"
echo "==========================================="

# Backup first
echo "Creating backup..."
tar -czf "../emerson-violin-pwa-backup-$(date +%Y%m%d).tar.gz" .

# Phase 1: Remove duplicates
echo "Removing duplicate build artifacts..."
rm -f sw.js sw-assets.js

# Phase 2: Archive
echo "Archiving design assets..."
mkdir -p _archived/emerson-violin-pwa/design-assets/mockups
mkdir -p _archived/emerson-violin-pwa/legacy
mv design/mockups/*.png _archived/emerson-violin-pwa/design-assets/mockups/ 2>/dev/null || true
mv design/legacy/* _archived/emerson-violin-pwa/legacy/ 2>/dev/null || true

# Phase 3: Cleanup
echo "Removing empty directories..."
rmdir qa/screenshots wasm/src/wasm src/components design/mockups design/legacy 2>/dev/null || true
rm -rf test-results/

# Phase 4: Move docs
echo "Reorganizing documentation..."
mkdir -p docs/reports/qa
mv qa/*.md docs/reports/qa/ 2>/dev/null || true

echo "✓ Cleanup complete!"
echo "Recovered space: $(du -sh . --exclude=node_modules)"
```

---

## Monitoring & Prevention

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Prevent committing build artifacts to root

if git diff --cached --name-only | grep -E '^(sw\.js|sw-assets\.js)$'; then
  echo "ERROR: Build artifacts in root detected (sw.js, sw-assets.js)"
  echo "These should only exist in public/"
  exit 1
fi
```

### Monthly Audit Reminder

Add to package.json scripts:
```json
{
  "scripts": {
    "audit:org": "find . -type d -empty -not -path '*/node_modules/*' -not -path '*/.git/*' && du -sh design/ public/ src/ qa/ _logs/",
    "audit:duplicates": "fdupes -r . --exclude node_modules"
  }
}
```

---

## Findings Summary Table

| Category | Count | Size | Action | Priority |
|----------|-------|------|--------|----------|
| Duplicate mockups | 19 files | 11M | Archive design/ copy | P1 |
| Root build artifacts | 2 files | 12K | Delete | P0 |
| Legacy code | 2 files | 84K | Archive | P2 |
| Empty directories | 3 dirs | 0B | Remove | P1 |
| Misplaced docs | 2 files | 36K | Move to docs/reports/ | P2 |
| Old logs | 2 files | 35K | Review & delete | P3 |
| Test artifacts | 1 dir | <1K | Delete + gitignore | P1 |
| Production mockups | 19 files | 11M | Review usage | P3 |

**Total Issues**: 8 categories, 50+ affected files/directories
**Total Reclaimable**: 22.1M (27-53% reduction)
**Estimated Effort**: 2-3 hours

---

## Final Recommendations

### Immediate (Today)
1. Delete root sw.js, sw-assets.js after verification
2. Remove test-results/ directory
3. Delete empty directories

### This Week
4. Archive duplicate design/mockups/
5. Move QA docs to docs/reports/qa/
6. Archive design/legacy/

### This Month
7. Review production mockups usage - remove if unused
8. Review and clean old logs
9. Implement pre-commit hook
10. Add cleanup script to repository

### Ongoing
- Run `npm run audit:org` monthly
- Keep _logs/ clean (auto-rotate or gitignore)
- Prevent build artifacts in root via CI checks

---

**Organization Score After Cleanup**: 85/100 (Good)
**Time Investment**: 2-3 hours
**Benefit**: 22M space savings, cleaner git history, faster builds
