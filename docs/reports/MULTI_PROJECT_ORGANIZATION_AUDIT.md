# Multi-Project Organization Audit

**Date**: 2026-01-31
**Scope**: 5 projects (imagen-experiments, blaire-unicorn, gemini-mcp-server, google-image-api-direct, stitch-vertex-mcp)
**Total Size**: 51.5 MB (43 MB in node_modules)

## Executive Summary

**Overall Health**: Mixed - 2 well-organized, 1 requires cleanup, 2 minimal projects with issues

**Critical Issues**:
- 6 root-level reports in imagen-experiments (should be in docs/reports/)
- 2 empty files (imagen-experiments/docs/)
- 1 duplicate/backup package.json (google-image-api-direct)
- Build artifacts uncommitted (gemini-mcp-server/dist/)
- No source code in 2 projects (only node_modules)

**Space Recovery Potential**: 40 MB (mostly node_modules from inactive projects)

---

## Project 1: imagen-experiments

**Size**: 8.5 MB
**Files**: 111
**Organization Score**: 65/100 (Moderate Issues)

### Finding Inventory

**Root Directory Issues** (7 files scattered):
- `/BATCH_121-150_COMPLETE.md` (4.9 KB) - batch completion report
- `/BATCH_151-180_READY.md` (6.7 KB) - batch status report
- `/COMPRESSION_VALIDATION.md` (6.7 KB) - validation report
- `/OPTIMIZATION_INDEX.md` (7.7 KB) - optimization tracking
- `/TOKEN_OPTIMIZATION_REPORT.md` (14 KB) - optimization report
- `/COMPRESSION_EXECUTIVE_SUMMARY.txt` (8.9 KB) - summary report
- `/LAUNCH_COMMANDS.sh` (2.7 KB) - executable script in root

**Empty Files** (2):
- `/docs/dive-bar-concepts-61-80.md` (0 bytes)
- `/docs/dive-bar-concepts-81-90.md` (0 bytes)

**Documentation Bloat**:
- `/docs/` - 978 KB across 23 markdown files (concept/prompt archives)
- `/scripts/` - 1.2 MB with 51 files (40 shell scripts, 11 JS)
- `/prompts/` - 157 KB across 8 files (working prompts)
- `/_logs/` - 128 KB across 4 log files
- `/_compressed/` - 64 KB (compression artifacts)

**Organization Issues**:
- 6 reports in root instead of `docs/reports/`
- Prompts split between `/prompts/` and `/docs/` directories
- No clear distinction between active vs archived scripts
- Scripts have inconsistent naming (FINAL-, FIXED-, GEN-, GENERATE-, etc.)

### Cleanup Recommendations

**Immediate** (relocate scattered reports):
```
docs/reports/batch-121-150-complete.md         ← BATCH_121-150_COMPLETE.md
docs/reports/batch-151-180-ready.md            ← BATCH_151-180_READY.md
docs/reports/compression-validation.md         ← COMPRESSION_VALIDATION.md
docs/reports/optimization-index.md             ← OPTIMIZATION_INDEX.md
docs/reports/token-optimization-report.md      ← TOKEN_OPTIMIZATION_REPORT.md
docs/reports/compression-executive-summary.txt ← COMPRESSION_EXECUTIVE_SUMMARY.txt
scripts/launch-commands.sh                      ← LAUNCH_COMMANDS.sh
```

**Short-term** (cleanup dead files):
```bash
# Remove empty files
rm docs/dive-bar-concepts-61-80.md
rm docs/dive-bar-concepts-81-90.md
```

**Long-term** (reduce bloat):
- Archive old batch scripts to `_archived/scripts-2025-01/`
- Consolidate prompts into single directory
- Create `scripts/README.md` explaining active vs deprecated scripts
- Consider compressing old logs to `.gz` format
- Move concept archives to `docs/archive/concepts/`

### Space Recovery Potential

- Archiving old scripts: ~600 KB
- Removing empty files: negligible
- Compressing logs: ~90 KB (70% reduction)
- **Total**: ~700 KB recoverable (8% of project size)

---

## Project 2: blaire-unicorn

**Size**: 2.9 MB
**Files**: 17
**Organization Score**: 95/100 (Well-Organized)

### Finding Inventory

**Source Files** (10):
- `/index.html` - main entry
- `/sw.js` - service worker
- `/manifest.json` - PWA manifest
- `/src/app.js` - app logic
- `/src/game/*.js` - 4 game modules
- `/styles/*.css` - 3 stylesheets

**Assets**:
- `/assets/` - 5 files (images, icons)

**Documentation**:
- `/README.md` - single file (482 bytes)

**No Issues Found**:
- No scattered documentation
- No build artifacts in source
- No backup files
- Clean directory structure
- Follows workspace standards (≤3 markdown in root)

### Cleanup Recommendations

**None required** - exemplary organization

### Space Recovery Potential

**None** - all files are active source code

---

## Project 3: gemini-mcp-server

**Size**: 188 KB
**Files**: 28
**Organization Score**: 75/100 (Minor Issues)

### Finding Inventory

**Source Files** (8):
- `/src/*.ts` - 8 TypeScript source files
- `/tsconfig.json` - TypeScript config
- `/package.json`, `/package-lock.json` - npm manifests

**Build Artifacts** (24 files):
- `/dist/` - contains compiled JS/d.ts files
- Should be in `.gitignore` and rebuilt on install

**Documentation**:
- `/README.md` - single file (1.6 KB)

**Organization Issues**:
- `/dist/` directory committed to repo (build artifacts should be gitignored)
- No CLAUDE.md (minor - optional for small projects)

### Cleanup Recommendations

**Immediate**:
```bash
# Add to .gitignore
echo "dist/" >> .gitignore

# Remove from git (keep locally)
git rm -r --cached dist/
```

**Short-term**:
- Add build instructions to README
- Consider adding CLAUDE.md if this becomes active project

### Space Recovery Potential

- Removing `/dist/` from repo: ~24 KB (won't delete locally)
- **Total**: 24 KB (13% of project size in git)

---

## Project 4: google-image-api-direct

**Size**: 17 MB (17 MB node_modules)
**Files**: 3 (excluding node_modules)
**Organization Score**: 40/100 (Incomplete/Abandoned)

### Finding Inventory

**Source Files** (0):
- No actual source code files
- Only package manifests

**Package Files** (3):
- `/package.json` (347 bytes)
- `/package-lock.json` (29 KB)
- `/package 2.json` (65 bytes) - **DUPLICATE/BACKUP FILE**

**Dependencies**:
- `/node_modules/` - 17 MB, 61 packages
- Only dependency: `google-auth-library@^10.5.0`

**Critical Issues**:
- No source code (project appears abandoned)
- Duplicate package file (`package 2.json`)
- No README or documentation
- Large node_modules for non-existent project

### Cleanup Recommendations

**Immediate Decision Required**:

**Option A - Archive entire project**:
```bash
# If project is abandoned
mv google-image-api-direct ../../_archived/google-image-api-direct-2025-01/
```

**Option B - Clean and document**:
```bash
# If project will be revived
rm "package 2.json"
rm -rf node_modules/
# Add README.md explaining project status
```

**Recommended**: Archive entire project (17 MB recovery)

### Space Recovery Potential

- **Full archival**: 17 MB (100% of project)
- **Cleanup only**: 17 MB node_modules + 65 bytes duplicate = ~17 MB

---

## Project 5: stitch-vertex-mcp

**Size**: 23 MB (23 MB node_modules)
**Files**: 3 (excluding node_modules)
**Organization Score**: 50/100 (Minimal/Incomplete)

### Finding Inventory

**Source Files** (1):
- `/index.js` (3.7 KB executable)

**Package Files** (2):
- `/package.json` (292 bytes)
- `/package-lock.json` (40 KB)

**Dependencies**:
- `/node_modules/` - 23 MB, 94 packages
- Express server with CORS

**Issues**:
- No README or documentation
- No CLAUDE.md
- Single source file (minimal implementation)
- Large dependencies for small codebase
- No indication if active or prototype

### Cleanup Recommendations

**Immediate**:
```bash
# Add minimal documentation
cat > README.md << 'EOF'
# Stitch Vertex MCP

Express-based MCP server for Vertex AI integration.

## Status
[Document current status: active/prototype/archived]

## Usage
[Add usage instructions]
EOF
```

**Decision Required**:
- If active: Add CLAUDE.md, document purpose
- If prototype: Move to `_archived/` (23 MB recovery)
- If abandoned: Delete entirely

### Space Recovery Potential

- **If archived**: 23 MB (100% of project)
- **If active**: Keep as-is, add docs only

---

## Combined Inventory Summary

### Total Files by Type

| Type | Count | Size | Notes |
|------|-------|------|-------|
| Markdown (docs) | 36 | 1.0 MB | Mostly imagen-experiments |
| Shell scripts | 41 | 1.2 MB | imagen-experiments only |
| JavaScript | 19 | ~50 KB | Split across 3 projects |
| TypeScript | 8 | ~30 KB | gemini-mcp-server only |
| HTML/CSS | 4 | ~15 KB | blaire-unicorn only |
| Build artifacts | 24 | ~24 KB | gemini-mcp-server/dist |
| Logs | 4 | 128 KB | imagen-experiments only |
| Empty files | 2 | 0 bytes | Should delete |
| Duplicate files | 1 | 65 bytes | package 2.json |
| node_modules | ~500+ | 40 MB | 2 projects with no source |

### Space Distribution

```
Total: 51.5 MB
├── node_modules (2 projects): 40 MB (78%)
├── imagen-experiments (active): 8.5 MB (16%)
├── blaire-unicorn (active): 2.9 MB (6%)
└── gemini-mcp-server: 188 KB (<1%)
```

### Projects by Organization Quality

**Tier 1 - Excellent** (90-100):
- blaire-unicorn (95/100) - clean, follows standards

**Tier 2 - Good** (70-89):
- gemini-mcp-server (75/100) - build artifacts in repo

**Tier 3 - Moderate** (50-69):
- imagen-experiments (65/100) - scattered reports, bloat
- stitch-vertex-mcp (50/100) - minimal docs, unclear status

**Tier 4 - Poor** (0-49):
- google-image-api-direct (40/100) - no source, abandoned

---

## Consolidated Cleanup Plan

### Phase 1: Critical Fixes (15 minutes)

**imagen-experiments**:
```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments

# Create reports directory if needed
mkdir -p docs/reports

# Move scattered reports
mv BATCH_121-150_COMPLETE.md docs/reports/batch-121-150-complete.md
mv BATCH_151-180_READY.md docs/reports/batch-151-180-ready.md
mv COMPRESSION_VALIDATION.md docs/reports/compression-validation.md
mv OPTIMIZATION_INDEX.md docs/reports/optimization-index.md
mv TOKEN_OPTIMIZATION_REPORT.md docs/reports/token-optimization-report.md
mv COMPRESSION_EXECUTIVE_SUMMARY.txt docs/reports/compression-executive-summary.txt
mv LAUNCH_COMMANDS.sh scripts/launch-commands.sh

# Remove empty files
rm docs/dive-bar-concepts-61-80.md docs/dive-bar-concepts-81-90.md
```

**google-image-api-direct**:
```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/google-image-api-direct

# Remove duplicate file
rm "package 2.json"
```

**gemini-mcp-server**:
```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/gemini-mcp-server

# Gitignore build artifacts
echo "dist/" >> .gitignore
git rm -r --cached dist/ 2>/dev/null || true
```

### Phase 2: Project Triage (30 minutes)

**Decision: Archive or Document?**

For `google-image-api-direct`:
```bash
# If abandoned (recommended):
mv /Users/louisherman/ClaudeCodeProjects/projects/google-image-api-direct \
   /Users/louisherman/ClaudeCodeProjects/_archived/google-image-api-direct-2025-01/
```

For `stitch-vertex-mcp`:
```bash
# If abandoned:
mv /Users/louisherman/ClaudeCodeProjects/projects/stitch-vertex-mcp \
   /Users/louisherman/ClaudeCodeProjects/_archived/stitch-vertex-mcp-2025-01/

# If active - add README:
cd /Users/louisherman/ClaudeCodeProjects/projects/stitch-vertex-mcp
# Create README.md with project documentation
```

### Phase 3: Long-term Maintenance (1-2 hours)

**imagen-experiments** optimization:
```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments

# Archive old scripts (identify which are deprecated first)
mkdir -p _archived/scripts-2025-01
# Move deprecated scripts

# Consolidate prompts
mkdir -p docs/archive/prompts-archive
# Consider moving old prompt batches

# Compress old logs
gzip _logs/*.log

# Create scripts README
cat > scripts/README.md << 'EOF'
# Scripts Directory

## Active Scripts
[List currently used scripts]

## Archived
See _archived/scripts-2025-01/ for deprecated scripts
EOF
```

---

## Space Recovery Summary

| Project | Action | Recovery | Priority |
|---------|--------|----------|----------|
| google-image-api-direct | Archive entire project | 17 MB | High |
| stitch-vertex-mcp | Archive if abandoned | 23 MB | High |
| imagen-experiments | Archive old scripts | 700 KB | Medium |
| gemini-mcp-server | Remove dist from git | 24 KB | Low |
| blaire-unicorn | None | 0 | N/A |

**Maximum Recovery**: 40.7 MB (79% of total project space)
**Minimum Recovery** (conservative): 17 MB (33% of total)

---

## Per-Project Organization Scores

### Scoring Criteria
- Documentation placement (25 pts)
- No scattered files (25 pts)
- Active source code (25 pts)
- No build artifacts/bloat (15 pts)
- Clear project purpose (10 pts)

### Results

| Project | Score | Grade | Status |
|---------|-------|-------|--------|
| blaire-unicorn | 95/100 | A | Exemplary |
| gemini-mcp-server | 75/100 | C+ | Minor fixes needed |
| imagen-experiments | 65/100 | D | Cleanup required |
| stitch-vertex-mcp | 50/100 | F | Needs triage |
| google-image-api-direct | 40/100 | F | Recommend archival |

### Overall Workspace Score: 65/100 (D)

**Key Issues Dragging Score**:
- 40% of projects (2/5) appear abandoned with only node_modules
- 40 MB (78%) of space is node_modules with minimal/no source
- Scattered reports in imagen-experiments root
- No clear documentation strategy for stitch-vertex-mcp

---

## Recommendations by Priority

### P0 - Critical (Do Now)
1. Move 6 reports from imagen-experiments root to `docs/reports/`
2. Delete 2 empty files in imagen-experiments
3. Remove duplicate `package 2.json` from google-image-api-direct
4. Decide: Archive google-image-api-direct? (appears abandoned)

### P1 - High (This Week)
5. Add .gitignore for gemini-mcp-server/dist/
6. Decide: Archive stitch-vertex-mcp? (minimal docs, unclear status)
7. Add README to stitch-vertex-mcp if keeping active

### P2 - Medium (This Month)
8. Archive deprecated scripts in imagen-experiments
9. Consolidate prompts directory structure
10. Create scripts/README.md for imagen-experiments
11. Compress old logs in imagen-experiments

### P3 - Low (Nice to Have)
12. Move concept archives to docs/archive/
13. Consider adding CLAUDE.md to small projects if they become active
14. Standardize script naming conventions

---

## Maintenance Strategy

### Prevention
- Enforce 3-markdown-max in project roots via pre-commit hook
- Add .gitignore templates for common build artifacts
- Create project status tracking (active/prototype/archived)
- Document archival criteria

### Monitoring
- Monthly audit of project roots for scattered files
- Quarterly review of node_modules without source code
- Bi-annual cleanup of old logs/scripts

### Automation Opportunities
- Script to detect abandoned projects (no source, only deps)
- Auto-compress logs older than 30 days
- Report generator for scattered markdown files

---

## Files Requiring Immediate Action

### Delete
```
/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/docs/dive-bar-concepts-61-80.md
/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/docs/dive-bar-concepts-81-90.md
/Users/louisherman/ClaudeCodeProjects/projects/google-image-api-direct/package 2.json
```

### Relocate
```
/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/BATCH_121-150_COMPLETE.md
  → docs/reports/batch-121-150-complete.md
/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/BATCH_151-180_READY.md
  → docs/reports/batch-151-180-ready.md
/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/COMPRESSION_VALIDATION.md
  → docs/reports/compression-validation.md
/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/OPTIMIZATION_INDEX.md
  → docs/reports/optimization-index.md
/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/TOKEN_OPTIMIZATION_REPORT.md
  → docs/reports/token-optimization-report.md
/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/COMPRESSION_EXECUTIVE_SUMMARY.txt
  → docs/reports/compression-executive-summary.txt
/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/LAUNCH_COMMANDS.sh
  → scripts/launch-commands.sh
```

### Archive Candidates (Triage Required)
```
/Users/louisherman/ClaudeCodeProjects/projects/google-image-api-direct/
  → _archived/google-image-api-direct-2025-01/ (17 MB)
/Users/louisherman/ClaudeCodeProjects/projects/stitch-vertex-mcp/
  → _archived/stitch-vertex-mcp-2025-01/ (23 MB)
```

---

## Conclusion

**Workspace Health**: Moderate - significant cleanup opportunity

**Key Findings**:
- 2 exemplary projects (blaire-unicorn)
- 1 active project needing cleanup (imagen-experiments)
- 2 potentially abandoned projects consuming 40 MB (78% of space)

**Next Steps**:
1. Execute Phase 1 cleanup (15 min) - immediate file hygiene
2. Triage abandoned projects (30 min) - archive or document
3. Schedule Phase 3 optimization (2 hrs) - long-term maintenance

**Impact**: Proper cleanup will recover 40+ MB and improve workspace organization score from 65/100 to 85+/100.
