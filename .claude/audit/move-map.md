# Move Map: ClaudeCodeProjects File Organization

**Date**: 2026-01-25
**Status**: Ready for implementation after user approval
**Approach**: 6 incremental chunks with git commits and verification

---

## Chunk 1: Root Cleanup (LOW RISK)

### Objective
Consolidate 7 audit reports from root into docs/audits/2026-01-audit/

### Pre-requisites
- Git initialized
- On file-organization branch
- docs/audits/2026-01-audit/ directory created

### Move Operations

| # | From | To | Size | Reason |
|---|------|-----|------|--------|
| 1.1 | AGENT_VALIDATION_REPORT.md | docs/audits/2026-01-audit/ | 12K | Audit artifact |
| 1.2 | AUDIT_COMPLETION_REPORT.md | docs/audits/2026-01-audit/ | 16K | Audit artifact |
| 1.3 | AUDIT_DELIVERABLES_INDEX.md | docs/audits/2026-01-audit/ | 16K | Audit artifact |
| 1.4 | FINAL_AUDIT_SUMMARY.md | docs/audits/2026-01-audit/ | 12K | Audit artifact |
| 1.5 | ORPHAN_AGENTS_REPORT.md | docs/audits/2026-01-audit/ | 12K | Audit artifact |
| 1.6 | README_AUDIT_COMPLETE.md | docs/audits/2026-01-audit/ | 4K | Audit artifact |
| 1.7 | claude-code-audit-report.md | docs/audits/2026-01-audit/ | 20K | Audit artifact |

### Delete Operations

| # | File | Reason |
|---|------|--------|
| 1.8 | test-skill.md | Test artifact, no longer needed |

### Create Operations

| # | File | Purpose | Content Summary |
|---|------|---------|----------------|
| 1.9 | docs/audits/README.md | Navigation index | Lists all audit directories with dates |
| 1.10 | docs/audits/2026-01-audit/README.md | Audit report index | Describes 7 reports, links to each |

### Update Operations

| # | File | Change | Reason |
|---|------|--------|--------|
| 1.11 | README.md (root) | Add link to docs/audits/ | Point users to audit history |

### Commands

```bash
# Create directories
mkdir -p docs/audits/2026-01-audit

# Move files with git mv
git mv AGENT_VALIDATION_REPORT.md docs/audits/2026-01-audit/
git mv AUDIT_COMPLETION_REPORT.md docs/audits/2026-01-audit/
git mv AUDIT_DELIVERABLES_INDEX.md docs/audits/2026-01-audit/
git mv FINAL_AUDIT_SUMMARY.md docs/audits/2026-01-audit/
git mv ORPHAN_AGENTS_REPORT.md docs/audits/2026-01-audit/
git mv README_AUDIT_COMPLETE.md docs/audits/2026-01-audit/
git mv claude-code-audit-report.md docs/audits/2026-01-audit/

# Delete test artifact
git rm test-skill.md

# Create README files (using Write tool)
# Create docs/audits/README.md
# Create docs/audits/2026-01-audit/README.md

# Update root README.md (using Edit tool)

# Commit
git add .
git commit -m "Chunk 1: Consolidate audit reports into docs/audits/2026-01-audit/"
```

### Verification

```bash
# Check files moved
ls -la docs/audits/2026-01-audit/  # Should show 7 markdown files
wc -l docs/audits/2026-01-audit/*.md  # Should show file sizes
cat docs/audits/2026-01-audit/README.md  # Should have navigation

# Check root cleaned
ls *.md  # Should only show README.md
```

### Risk Assessment

**Risk Level**: LOW
- Standalone documentation files
- No code references these files
- No build/test dependencies

**Rollback**: `git reset --hard HEAD~1`

---

## Chunk 2: Backup Archival (LOW RISK)

### Objective
Archive 2 dated backup directories to archive/backups/2026-01-25_pre-reorganization/

### Move Operations

| # | From | To | Size | Reason |
|---|------|-----|------|--------|
| 2.1 | .claude_backup_20260125_015458/ | archive/backups/2026-01-25_pre-reorganization/ | 6.9MB | Dated backup |
| 2.2 | .claude_backup_skills_20260125_015831/ | archive/backups/2026-01-25_pre-reorganization/ | 284KB | Dated backup |

### Create Operations

| # | File | Purpose | Content Summary |
|---|------|---------|----------------|
| 2.3 | archive/backups/README.md | Backup inventory | Lists backups with dates, restoration instructions |

### Commands

```bash
# Create archive directory
mkdir -p archive/backups/2026-01-25_pre-reorganization

# Move backup directories
git mv .claude_backup_20260125_015458 archive/backups/2026-01-25_pre-reorganization/
git mv .claude_backup_skills_20260125_015831 archive/backups/2026-01-25_pre-reorganization/

# Create backup inventory README (using Write tool)

# Commit
git add .
git commit -m "Chunk 2: Archive dated backups to archive/backups/"
```

### Verification

```bash
# Check backups archived
ls archive/backups/2026-01-25_pre-reorganization/  # Should show 2 directories
du -sh archive/backups/  # Should show ~7.2MB

# Check root cleaned
ls -la | grep backup  # Should show nothing

# Verify backup README
cat archive/backups/README.md
```

### Risk Assessment

**Risk Level**: LOW
- Moving inactive backup directories
- No active references to these backups
- Restoration documented in README.md

**Rollback**: `git reset --hard HEAD~1`

---

## Chunk 3: Project Directory Restructure (MEDIUM RISK)

### Objective
Create projects/ directory and move DMBAlmanacProjectFolder/ and gemini-mcp-server/

### Move Operations

| # | From | To | Size | Reason |
|---|------|-----|------|--------|
| 3.1 | DMBAlmanacProjectFolder/ | projects/dmb-almanac/ | 2.0GB | Better naming, group projects |
| 3.2 | gemini-mcp-server/ | projects/gemini-mcp-server/ | 116KB | Group all projects together |

### Update Operations

| # | File | Change | Reason |
|---|------|--------|--------|
| 3.3 | .github/workflows/*.yml | Update any path references | Workflows may reference project paths |
| 3.4 | README.md (root) | Update project links | Point to new project/ structure |

### Commands

```bash
# Create projects directory
mkdir -p projects

# Move projects
git mv DMBAlmanacProjectFolder projects/dmb-almanac
git mv gemini-mcp-server projects/gemini-mcp-server

# Check for workflow path references
grep -r "DMBAlmanacProjectFolder\|gemini-mcp-server" .github/workflows/

# Update workflows if needed (using Edit tool)

# Update README.md (using Edit tool)

# Commit
git add .
git commit -m "Chunk 3: Restructure projects into projects/ directory"
```

### Verification

```bash
# Check projects moved
ls projects/  # Should show dmb-almanac/ and gemini-mcp-server/

# Verify DMB Almanac still works
cd projects/dmb-almanac/dmb-almanac-svelte/
npm run build  # Must succeed
npm run test   # Must pass (if tests exist)

# Verify Gemini MCP still works
cd ../../gemini-mcp-server/
npm run build  # Must succeed

# Return to root
cd ../..

# Check workflows pass (if CI configured)
```

### Risk Assessment

**Risk Level**: MEDIUM
- Large directory moves (2.0GB)
- CI/CD workflows may reference old paths
- Build scripts may have hardcoded paths

**Mitigation**:
- Grep all workflows for path references
- Test builds after move
- Document any script updates needed

**Rollback**: `git reset --hard HEAD~1`

---

## Chunk 4: DMB Internal Cleanup (HIGH RISK)

### Objective
Rename dmb-almanac-svelte/ to app/ and organize 107 markdown files into categorized subdirectories

### Sub-Chunk 4A: Rename dmb-almanac-svelte → app

| # | From | To | Size | Reason |
|---|------|-----|------|--------|
| 4A.1 | projects/dmb-almanac/dmb-almanac-svelte/ | projects/dmb-almanac/app/ | 1.9GB | Clearer, shorter name |

### Sub-Chunk 4B: Organize 107 Markdown Files

**Analysis Categories** (17 subdirectories):

| Category | File Pattern | Destination | Est. Count |
|----------|--------------|-------------|------------|
| Accessibility | A11Y_*.md | app/docs/analysis/accessibility/ | 10+ |
| Performance | PERFORMANCE_*.md | app/docs/analysis/performance/ | 15+ |
| WASM | WASM_*.md | app/docs/analysis/wasm/ | 8+ |
| Bundle | BUNDLE_*.md | app/docs/analysis/bundle/ | 5+ |
| CSS | CSS_*.md | app/docs/analysis/css/ | 8+ |
| Async | ASYNC_*.md | app/docs/analysis/async/ | 4+ |
| Error Handling | ERROR_*.md | app/docs/analysis/error-handling/ | 6+ |
| IndexedDB | INDEXEDDB_*.md | app/docs/analysis/indexeddb/ | 4+ |
| Memory | MEMORY_*.md | app/docs/analysis/memory/ | 3+ |
| PWA | PWA_*.md | app/docs/analysis/pwa/ | 12+ |
| Voice | VOICE_*.md | app/docs/analysis/voice/ | 2+ |
| WebGPU | WEBGPU_*.md | app/docs/analysis/webgpu/ | 2+ |
| Security | SECURITY_*.md | app/docs/analysis/security/ | 5+ |
| Offline | OFFLINE_*.md | app/docs/analysis/offline/ | 4+ |
| Network | NETWORK_*.md | app/docs/analysis/network/ | 3+ |
| Service Worker | SW_*.md | app/docs/analysis/service-worker/ | 6+ |
| Database | DB_*.md | app/docs/analysis/database/ | 3+ |
| Miscellaneous | Various | app/docs/analysis/misc/ | 10+ |

### Create Operations

| # | File | Purpose |
|---|------|---------|
| 4B.1 | app/docs/analysis/README.md | Navigation index for all analysis categories |

### Update Operations (Critical)

| # | File | Change | Reason |
|---|------|--------|--------|
| 4.1 | package.json | Update "name" field if it references "dmb-almanac-svelte" | Consistency |
| 4.2 | package.json | Check all script paths (unlikely to need changes) | Scripts use relative paths |
| 4.3 | tsconfig.json | Verify paths still work | TypeScript path aliases |
| 4.4 | svelte.config.js | Verify config still works | SvelteKit config |
| 4.5 | vite.config.ts | Verify config still works | Vite config |

### Commands

```bash
cd projects/dmb-almanac/

# Sub-chunk 4A: Rename dmb-almanac-svelte → app
git mv dmb-almanac-svelte app

# Sub-chunk 4B: Organize markdown files
cd ../../  # Back to root

# Create analysis subdirectories
mkdir -p projects/dmb-almanac/app/docs/analysis/{accessibility,performance,wasm,bundle,css,async,error-handling,indexeddb,memory,pwa,voice,webgpu,security,offline,network,service-worker,database,misc}

# Move files by category (using Bash with git mv)
# Accessibility
find projects/dmb-almanac/ -maxdepth 1 -name "A11Y_*.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/accessibility/ \;

# Performance
find projects/dmb-almanac/ -maxdepth 1 -name "PERFORMANCE_*.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/performance/ \;

# WASM
find projects/dmb-almanac/ -maxdepth 1 -name "WASM_*.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/wasm/ \;

# Bundle
find projects/dmb-almanac/ -maxdepth 1 -name "BUNDLE_*.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/bundle/ \;

# CSS
find projects/dmb-almanac/ -maxdepth 1 -name "CSS_*.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/css/ \;

# Async
find projects/dmb-almanac/ -maxdepth 1 -name "ASYNC_*.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/async/ \;

# Error Handling
find projects/dmb-almanac/ -maxdepth 1 -name "ERROR_*.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/error-handling/ \;

# IndexedDB
find projects/dmb-almanac/ -maxdepth 1 -name "INDEXEDDB_*.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/indexeddb/ \;

# Memory
find projects/dmb-almanac/ -maxdepth 1 -name "MEMORY_*.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/memory/ \;

# PWA
find projects/dmb-almanac/ -maxdepth 1 -name "PWA_*.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/pwa/ \;

# Voice
find projects/dmb-almanac/ -maxdepth 1 -name "VOICE_*.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/voice/ \;

# WebGPU
find projects/dmb-almanac/ -maxdepth 1 -name "WEBGPU_*.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/webgpu/ \;

# Security
find projects/dmb-almanac/ -maxdepth 1 -name "SECURITY_*.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/security/ \;

# Offline
find projects/dmb-almanac/ -maxdepth 1 -name "OFFLINE_*.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/offline/ \;

# Network
find projects/dmb-almanac/ -maxdepth 1 -name "NETWORK_*.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/network/ \;

# Service Worker
find projects/dmb-almanac/ -maxdepth 1 -name "SW_*.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/service-worker/ \;

# Database
find projects/dmb-almanac/ -maxdepth 1 -name "DB_*.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/database/ \;

# Move remaining markdown files to misc/
find projects/dmb-almanac/ -maxdepth 1 -name "*.md" ! -name "README.md" -exec git mv {} projects/dmb-almanac/app/docs/analysis/misc/ \;

# Create analysis README (using Write tool)

# Update package.json if needed (using Edit tool)

# Commit
git add .
git commit -m "Chunk 4: Rename dmb-almanac-svelte → app and organize 107 analysis files"
```

### Verification (CRITICAL)

```bash
cd projects/dmb-almanac/app/

# Check directory structure
ls docs/analysis/  # Should show 18 subdirectories

# Count files per category
for dir in docs/analysis/*/; do
  echo "$dir: $(ls $dir | wc -l) files"
done

# Verify no markdown files left at project root
cd ..
ls *.md  # Should be empty or only essential files

# CRITICAL: Build verification
cd app/
npm run build          # Must succeed
npm run test           # Must pass
npm run lint           # Must pass
npm run check          # TypeScript must pass
npm run wasm:build     # WASM build must succeed

# Check TypeScript paths still resolve
npm run check -- --watch &  # Run in background for 10 seconds
sleep 10
kill %1

# Verify dev server starts
timeout 30s npm run dev || true  # Should start without errors
```

### Risk Assessment

**Risk Level**: HIGH
- Renaming main app directory (1.9GB)
- Moving 107 files across 17 categories
- Potential import path breakage
- Build system may have hardcoded paths

**Mitigation**:
- Use git mv to preserve history
- Run full test suite after move
- Verify all build scripts
- Check TypeScript compilation
- Test WASM build pipeline

**Rollback**: `git reset --hard HEAD~1`

---

## Chunk 5: .claude/ Documentation Organization (LOW RISK)

### Objective
Organize 30+ markdown files at .claude/ root into subdirectories

### Proposed Structure

```
.claude/docs/
├── architecture/
│   ├── UAF_FRAMEWORK.md (from README.md)
│   ├── COORDINATION.md
│   └── DEPLOYMENT_STATUS.txt
├── reference/
│   ├── GLOBAL_INDEX.md
│   ├── AGENT_ECOSYSTEM_INDEX.md
│   ├── SKILL_CROSS_REFERENCES.md
│   ├── RUST_AGENT_ROSTER.md
│   ├── SVELTEKIT_AGENT_ROSTER.md
│   ├── WASM_AGENT_ROSTER.md
│   ├── RUST_SKILLS_LIBRARY.md
│   ├── SVELTEKIT_SKILLS_LIBRARY.md
│   ├── WASM_SKILLS_LIBRARY.md
│   ├── ULTIMATE_PERFORMANCE_INDEX.md
│   ├── EFFICIENCY_ACCURACY_INDEX.md
│   └── PERFORMANCE_AMPLIFICATION_INDEX.md
└── guides/
    ├── AGENT_TEMPLATE.md
    ├── SKILL_TEMPLATE.md
    ├── COMPLETION_REPORT.md
    ├── SWARM_DEPLOYMENT_REPORT.md
    ├── REMEDIATION_DASHBOARD.md
    ├── MODERNIZATION_AUDIT.md
    ├── MODERNIZATION_CHANGES.md
    ├── AUDIT_ARTIFACTS.txt
    └── AUDIT_SUMMARY.md
```

### Move Operations

**Architecture** (3 files):
| # | From | To |
|---|------|-----|
| 5.1 | .claude/README.md | .claude/docs/architecture/UAF_FRAMEWORK.md |
| 5.2 | .claude/COORDINATION.md | .claude/docs/architecture/ |
| 5.3 | .claude/DEPLOYMENT_STATUS.txt | .claude/docs/architecture/ |

**Reference** (12 files):
| # | From | To |
|---|------|-----|
| 5.4 | .claude/GLOBAL_INDEX.md | .claude/docs/reference/ |
| 5.5 | .claude/AGENT_ECOSYSTEM_INDEX.md | .claude/docs/reference/ |
| 5.6 | .claude/SKILL_CROSS_REFERENCES.md | .claude/docs/reference/ |
| 5.7 | .claude/RUST_AGENT_ROSTER.md | .claude/docs/reference/ |
| 5.8 | .claude/SVELTEKIT_AGENT_ROSTER.md | .claude/docs/reference/ |
| 5.9 | .claude/WASM_AGENT_ROSTER.md | .claude/docs/reference/ |
| 5.10 | .claude/RUST_SKILLS_LIBRARY.md | .claude/docs/reference/ |
| 5.11 | .claude/SVELTEKIT_SKILLS_LIBRARY.md | .claude/docs/reference/ |
| 5.12 | .claude/WASM_SKILLS_LIBRARY.md | .claude/docs/reference/ |
| 5.13 | .claude/ULTIMATE_PERFORMANCE_INDEX.md | .claude/docs/reference/ |
| 5.14 | .claude/EFFICIENCY_ACCURACY_INDEX.md | .claude/docs/reference/ |
| 5.15 | .claude/PERFORMANCE_AMPLIFICATION_INDEX.md | .claude/docs/reference/ |

**Guides** (9 files):
| # | From | To |
|---|------|-----|
| 5.16 | .claude/AGENT_TEMPLATE.md | .claude/docs/guides/ |
| 5.17 | .claude/SKILL_TEMPLATE.md | .claude/docs/guides/ |
| 5.18 | .claude/COMPLETION_REPORT.md | .claude/docs/guides/ |
| 5.19 | .claude/SWARM_DEPLOYMENT_REPORT.md | .claude/docs/guides/ |
| 5.20 | .claude/REMEDIATION_DASHBOARD.md | .claude/docs/guides/ |
| 5.21 | .claude/MODERNIZATION_AUDIT.md | .claude/docs/guides/ |
| 5.22 | .claude/MODERNIZATION_CHANGES.md | .claude/docs/guides/ |
| 5.23 | .claude/AUDIT_ARTIFACTS.txt | .claude/docs/guides/ |
| 5.24 | .claude/AUDIT_SUMMARY.md | .claude/docs/guides/ |

### Create Operations

| # | File | Purpose |
|---|------|---------|
| 5.25 | .claude/docs/README.md | Navigation index for all .claude/ documentation |
| 5.26 | .claude/README.md (new) | Brief UAF overview with links to docs/ |

### Update Operations

| # | File | Change | Reason |
|---|------|--------|--------|
| 5.27 | .claude/GLOBAL_INDEX.md (at new location) | Update relative paths if any | Path references may have changed |

### Commands

```bash
# Create subdirectories
mkdir -p .claude/docs/{architecture,reference,guides}

# Move architecture files
git mv .claude/README.md .claude/docs/architecture/UAF_FRAMEWORK.md
git mv .claude/COORDINATION.md .claude/docs/architecture/
git mv .claude/DEPLOYMENT_STATUS.txt .claude/docs/architecture/

# Move reference files
git mv .claude/GLOBAL_INDEX.md .claude/docs/reference/
git mv .claude/AGENT_ECOSYSTEM_INDEX.md .claude/docs/reference/
git mv .claude/SKILL_CROSS_REFERENCES.md .claude/docs/reference/
git mv .claude/RUST_AGENT_ROSTER.md .claude/docs/reference/
git mv .claude/SVELTEKIT_AGENT_ROSTER.md .claude/docs/reference/
git mv .claude/WASM_AGENT_ROSTER.md .claude/docs/reference/
git mv .claude/RUST_SKILLS_LIBRARY.md .claude/docs/reference/
git mv .claude/SVELTEKIT_SKILLS_LIBRARY.md .claude/docs/reference/
git mv .claude/WASM_SKILLS_LIBRARY.md .claude/docs/reference/
git mv .claude/ULTIMATE_PERFORMANCE_INDEX.md .claude/docs/reference/
git mv .claude/EFFICIENCY_ACCURACY_INDEX.md .claude/docs/reference/
git mv .claude/PERFORMANCE_AMPLIFICATION_INDEX.md .claude/docs/reference/

# Move guide files
git mv .claude/AGENT_TEMPLATE.md .claude/docs/guides/
git mv .claude/SKILL_TEMPLATE.md .claude/docs/guides/
git mv .claude/COMPLETION_REPORT.md .claude/docs/guides/
git mv .claude/SWARM_DEPLOYMENT_REPORT.md .claude/docs/guides/
git mv .claude/REMEDIATION_DASHBOARD.md .claude/docs/guides/
git mv .claude/MODERNIZATION_AUDIT.md .claude/docs/guides/
git mv .claude/MODERNIZATION_CHANGES.md .claude/docs/guides/
git mv .claude/AUDIT_ARTIFACTS.txt .claude/docs/guides/
git mv .claude/AUDIT_SUMMARY.md .claude/docs/guides/

# Create navigation README (using Write tool)
# Create new brief .claude/README.md (using Write tool)

# Commit
git add .
git commit -m "Chunk 5: Organize .claude/ documentation into subdirectories"
```

### Verification

```bash
# Check organization
ls .claude/docs/  # Should show architecture/, reference/, guides/
ls .claude/docs/architecture/  # Should show 3 files
ls .claude/docs/reference/  # Should show 12 files
ls .claude/docs/guides/  # Should show 9 files

# Check .claude/ root cleaned
ls .claude/*.md  # Should only show README.md

# Verify agent system still works (if CLI available)
# Test loading an agent definition
```

### Risk Assessment

**Risk Level**: LOW
- Moving documentation only
- No code dependencies
- Agent system should be unaffected
- Scripts may reference documentation paths (unlikely)

**Mitigation**:
- Check .claude/scripts/ for documentation references
- Test agent invocation after move

**Rollback**: `git reset --hard HEAD~1`

---

## Chunk 6: Agent Category Consolidation (MEDIUM RISK)

### Objective
Merge docs/ agent category into documentation/ and remove empty categories

### Move Operations (Agent Merge)

| # | From | To | Agents |
|---|------|-----|--------|
| 6.1 | .claude/agents/docs/*.yaml | .claude/agents/documentation/ | 3 files |

### Delete Operations (Empty Categories)

| # | Directory | Reason |
|---|-----------|--------|
| 6.2 | .claude/agents/rust/ | Empty (0 agents) |
| 6.3 | .claude/agents/sveltekit/ | Empty (0 agents) |
| 6.4 | .claude/agents/wasm/ | Empty (0 agents) |

### Update Operations (CRITICAL)

| # | File | Change | Reason |
|---|------|--------|--------|
| 6.5 | .claude/docs/reference/GLOBAL_INDEX.md | Update category count (50→46) | Remove 4 categories |
| 6.6 | .claude/docs/reference/GLOBAL_INDEX.md | Merge docs agents into documentation section | Show consolidated category |
| 6.7 | .claude/docs/reference/AGENT_ECOSYSTEM_INDEX.md | Update category listing | Reflect new structure |
| 6.8 | .claude/docs/reference/SKILL_CROSS_REFERENCES.md | Update agent category references | May reference docs/ category |

### Commands

```bash
# Move docs/ agents to documentation/
git mv .claude/agents/docs/*.yaml .claude/agents/documentation/

# Remove docs/ directory
git rm -r .claude/agents/docs/

# Remove empty categories
git rm -r .claude/agents/rust/
git rm -r .claude/agents/sveltekit/
git rm -r .claude/agents/wasm/

# Update index files (using Edit tool)
# - GLOBAL_INDEX.md: Change category count 50→46
# - AGENT_ECOSYSTEM_INDEX.md: Remove 4 categories, merge docs→documentation
# - SKILL_CROSS_REFERENCES.md: Update any docs/ references

# Commit
git add .
git commit -m "Chunk 6: Consolidate agent categories (merge docs→documentation, remove empty)"
```

### Verification

```bash
# Check agent category count
ls .claude/agents/ | wc -l  # Should show 46

# Check documentation category
ls .claude/agents/documentation/  # Should show 7 YAML files (4 + 3)

# Check empty categories removed
ls .claude/agents/ | grep -E "(rust|sveltekit|wasm)"  # Should return nothing

# Verify agent files have correct structure
for agent in .claude/agents/documentation/*.yaml; do
  echo "Checking $agent"
  cat "$agent" | head -20  # Show first 20 lines
done

# Test agent invocation (if CLI available)
# Try invoking an agent from documentation/ category
```

### Risk Assessment

**Risk Level**: MEDIUM
- Agent system may cache category locations
- Index files must be updated correctly
- Scripts may reference agent categories
- Claude Code may need to re-scan agents

**Mitigation**:
- Update all index files before committing
- Test agent invocation after move
- Keep .claude_backup_20260125_015458 as fallback
- Verify YAML files are valid

**Rollback**: `git reset --hard HEAD~1`

---

## Phase 4: Final Documentation & Guardrails

### Create docs/PROJECT_STRUCTURE.md

**Purpose**: Comprehensive guide to repository structure

**Contents**:
1. Directory tree with explanations
2. File placement rules
3. Where to add new agents/skills/projects
4. Common operations guide

### Create .gitignore

**Purpose**: Exclude build artifacts from version control

**Contents**:
```gitignore
# macOS
.DS_Store
.AppleDouble
.LSOverride

# Node
node_modules/
npm-debug.log
yarn-error.log

# Build artifacts
build/
dist/
.svelte-kit/
*.tsbuildinfo

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Testing
coverage/
.nyc_output/

# Temporary
*.tmp
*.temp
.cache/

# Logs
logs/
*.log

# WASM build artifacts (keep pkg/ for now)
# pkg/
```

### Create .claude/scripts/validate-structure.sh (Optional)

**Purpose**: Prevent future root clutter

**Contents**: See plan file for bash script

### Update README.md

**Changes**:
1. Add "Project Structure" section
2. Update project paths (DMBAlmanacProjectFolder → projects/dmb-almanac)
3. Add "Recent Audits" section linking to docs/audits/
4. Add "Documentation" section linking to docs/

---

## Summary of Changes

| Chunk | Risk | Files Moved | Directories Created | Tests Required |
|-------|------|-------------|---------------------|----------------|
| 1 | LOW | 7 → 1 location | 2 (docs/audits/) | None |
| 2 | LOW | 2 backups | 1 (archive/backups/) | None |
| 3 | MEDIUM | 2 projects | 1 (projects/) | Build verification |
| 4 | HIGH | 107 + rename | 18 (app/docs/analysis/) | Full build/test suite |
| 5 | LOW | 24 docs | 3 (.claude/docs/) | Agent invocation |
| 6 | MEDIUM | 3 agents | 0 | Agent invocation |

**Total**:
- Files moved/reorganized: 145+
- Directories created: 25
- Directories removed: 5 (2 backups + 3 empty agent categories + 1 renamed)
- Git commits: 6 (one per chunk)

---

## Verification Matrix

| Chunk | Verification Type | Commands | Expected Result |
|-------|------------------|----------|-----------------|
| 1 | File presence | ls docs/audits/2026-01-audit/ | 7 markdown files |
| 2 | Archive created | ls archive/backups/ | 1 subdirectory |
| 3 | Build success | cd projects/dmb-almanac/app/ && npm run build | Exit code 0 |
| 3 | MCP build | cd projects/gemini-mcp-server/ && npm run build | Exit code 0 |
| 4 | Build success | npm run build && npm run test && npm run lint | All pass |
| 4 | WASM build | npm run wasm:build | All 6 modules compile |
| 4 | Type check | npm run check | TypeScript passes |
| 5 | Doc organization | ls .claude/docs/ | 3 subdirectories |
| 6 | Agent count | ls .claude/agents/ \| wc -l | 46 categories |
| 6 | Category merge | ls .claude/agents/documentation/ | 7 YAML files |

---

*Move map created: 2026-01-25*
*Ready for implementation after user approval*
*Estimated total changes: 145+ files across 6 incremental chunks*
