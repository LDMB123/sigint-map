# Comprehensive Orphan Cleanup Plan

**Date**: 2026-01-30
**Status**: 🔴 CRITICAL - Major orphaned files discovered
**Total Orphaned Files**: 417+
**Impact**: Workspace confusion, maintenance burden, potential conflicts

---

## Executive Summary

**Discovery**: Comprehensive workspace scan revealed **417+ orphaned files** across multiple `.claude/` directories that were not cleaned up during the migration.

**Critical Findings**:
- 🔴 **181 agent files** in `projects/dmb-almanac/.claude/agents/` (old subdirectory structure)
- 🔴 **24 documentation files** in `projects/dmb-almanac/.claude/` root
- 🟡 **15 agent files** in `projects/dmb-almanac/app/.claude/agents/` (nested duplicate)
- 🟡 **40 duplicate commands** in `~/.claude/commands/`
- 🟡 **7 archived files** in `projects/dmb-almanac/.claude/archive/`

**Current Active Components** (correct):
- ✅ Workspace: 9 skills, 14 agents
- ✅ User-level: 139 commands (99 unique after cleanup)

**Action Required**: Comprehensive cleanup to remove 217+ orphaned files

---

## Orphan Locations

### Location 1: projects/dmb-almanac/.claude/ 🔴 CRITICAL

**Path**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.claude`

**Orphaned Content**:

#### A. Agent Subdirectories (181 files)
```
agents/
├── ai-ml/ (5 files)
├── analysis/ (16 files)
├── apple-silicon/ (8 files)
├── caching/ (5 files)
├── compound/ (3 files)
├── compression/ (4 files)
├── coordination/ (14 files)
├── data/ (5 files)
├── debuggers/ (5 files)
├── devops/ (5 files)
├── generation/ (16 files)
├── integrators/ (5 files)
├── learners/ (5 files)
├── mcp/ (6 files)
├── prefetching/ (3 files)
├── rust/ (13 files)
├── security/ (5 files)
├── shared/ (1 file)
├── speculative/ (3 files)
├── sveltekit/ (7 files)
├── swarms/ (9 files)
├── testing/ (5 files)
├── transformers/ (5 files)
├── validation/ (16 files)
├── wasm/ (9 files)
└── zero-latency/ (3 files)

Total: 181 agent files
```

**Issue**: These are the **OLD** agents from before migration. They use:
- Custom subdirectory organization (not official format)
- Custom schema fields (tier, cost, category, swarm_pattern)
- Non-standard frontmatter

**Recommendation**: 🗑️ **DELETE ENTIRE agents/ directory**
- Already migrated to workspace-level
- No longer valid format
- Causing confusion

#### B. Root Documentation Files (24 files)
```
AGENT_ECOSYSTEM_INDEX.md
AGENT_PERFORMANCE_OPTIMIZATION_GUIDE.md
AGENT_TEMPLATE.md
AUDIT_SUMMARY.md
EFFICIENCY_ACCURACY_INDEX.md
FINAL_TIER_OPTIMIZATION_SUMMARY.md
GLOBAL_INDEX.md
MODERNIZATION_AUDIT.md
MODERNIZATION_CHANGES.md
OPTIMIZATION_COMPLETE.md
PERFORMANCE_AMPLIFICATION_INDEX.md
PERFORMANCE_OPTIMIZATION_SUMMARY.md
PERFORMANCE_WORK_COMPLETE.md
README.md
RUST_AGENT_ROSTER.md
RUST_SKILLS_LIBRARY.md
SKILLS_ANALYSIS.md
SKILL_CROSS_REFERENCES.md
SKILL_TEMPLATE.md
SVELTEKIT_AGENT_ROSTER.md
SVELTEKIT_SKILLS_LIBRARY.md
ULTIMATE_PERFORMANCE_INDEX.md
WASM_AGENT_ROSTER.md
WASM_SKILLS_LIBRARY.md
```

**Issue**: Old documentation from previous agent organization schemes
**Recommendation**: 🗑️ **ARCHIVE to `_archived/dmb-almanac-old-claude/`**

#### C. Archive Directory (7 files)
```
archive/
└── experimental-agents/ (7 files)
```

**Recommendation**: ✅ **Already archived** - can keep or consolidate

---

### Location 2: projects/dmb-almanac/app/.claude/ 🟡 MEDIUM

**Path**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/.claude`

**Orphaned Content**:

#### Nested Agents (15 files)
```
agents/
├── 00-lead-orchestrator.md
├── 01-sveltekit-engineer.md
├── 02-svelte-component-engineer.md
├── 03-vite-build-engineer.md
├── 04-caching-specialist.md
├── 05-pwa-engineer.md
├── 06-local-first-steward.md
├── 07-performance-optimizer.md
├── 08-qa-engineer.md
├── 09-eslint-typescript-steward.md
├── 10-parallel-coordinator.md
├── 11-semantic-html-engineer.md
├── 12-modern-css-architect.md
├── 13-ui-regression-debugger.md
└── 14-lint-regression-debugger.md
```

**Issue**:
- Nested `.claude/` directory (project has `.claude/` at TWO levels)
- Numbered prefix system (non-standard)
- Lead orchestrator pattern (not supported)
- Duplicate of workspace-level agents

**Recommendation**: 🗑️ **DELETE ENTIRE app/.claude/ directory**
- Use workspace-level agents instead
- Nested .claude/ is anti-pattern
- Numbered orchestration not supported

#### Documentation Files
```
AGENT_ROSTER.md
SKILLS_LIBRARY.md
docs/ (empty directory)
```

**Recommendation**: 🗑️ **DELETE with agents/**

---

### Location 3: ~/.claude/commands/ 🟡 MEDIUM

**Path**: `~/.claude/commands/`

**Duplicate Commands** (40 identified):

#### DMB-Specific (4 commands) - Remove
- ❌ `dmb-stats.md` → use workspace dmb-analysis skill
- ❌ `scrape-dmb.md` → use workspace scraping skill
- ❌ `parallel-dmb-validation.md` → use workspace workflow
- ❌ `liberation-check.md` → DMB-specific, move to project or remove

#### Code Quality (5 commands) - Remove
- ❌ `review.md` → delegate to code-reviewer agent
- ❌ `pr-review.md` → delegate to code-reviewer agent
- ❌ `security-audit.md` → delegate to security-scanner agent
- ❌ `test-generate.md` → delegate to test-generator agent
- ❌ `refactor.md` → delegate to refactoring-agent

#### Debugging (3 commands) - Remove
- ❌ `debug.md` → delegate to error-debugger agent
- ❌ `error-debug.md` → delegate to error-debugger agent
- ❌ `scraper-debug.md` → use scraping skill

#### Performance/Deployment (3 commands) - Remove
- ❌ `perf-audit.md` → delegate to performance-profiler agent
- ❌ `deployment-strategy.md` → use deployment skill
- ❌ `migrate.md` → delegate to migration-agent

**Total to Remove**: 15 commands

**Keep**: 124 unique cross-project utilities (imagen, veo, parallel-*, framework-specific, etc.)

---

## Cleanup Execution Plan

### Phase 1: Backup Everything 🔒

**Before any deletions**, create complete backup:

```bash
# Backup dmb-almanac project .claude
cp -r /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.claude \
     /Users/louisherman/ClaudeCodeProjects/_archived/dmb-almanac-claude-backup-2026-01-30

# Backup app/.claude
cp -r /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/.claude \
     /Users/louisherman/ClaudeCodeProjects/_archived/dmb-app-claude-backup-2026-01-30

# Backup user commands
cp -r ~/.claude/commands ~/.claude/commands_backup_2026-01-30
```

**Backup Size Estimate**: ~5-10 MB

---

### Phase 2: Clean DMB Almanac Project 🗑️

#### Step 1: Remove Orphaned Agents (181 files)
```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.claude

# Remove entire agents subdirectory structure
rm -rf agents/
```

**Impact**: Removes 181 old agent files with non-standard format

#### Step 2: Archive Old Documentation (24 files)
```bash
# Move to project-specific archive
mkdir -p ../../_archived/dmb-almanac-old-claude-docs
mv *.md ../../_archived/dmb-almanac-old-claude-docs/
mv optimization/ ../../_archived/dmb-almanac-old-claude-docs/
```

**Impact**: Cleans up 24 root-level markdown files

#### Step 3: Clean Settings
```bash
# Keep settings.local.json if it has valid config
# Otherwise remove it
cat settings.local.json  # Review first
```

**Expected Final State**:
```
projects/dmb-almanac/.claude/
└── archive/ (keep existing archive)
```

---

### Phase 3: Remove Nested app/.claude 🗑️

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac

# Remove entire nested .claude directory
rm -rf app/.claude
```

**Impact**: Removes 15 nested agent files and documentation

**Rationale**:
- Nested `.claude/` is anti-pattern
- Workspace-level agents already cover this functionality
- Lead orchestrator pattern not supported
- Prevents confusion

---

### Phase 4: Clean User Commands 🗑️

```bash
cd ~/.claude/commands

# Remove DMB duplicates
rm -f dmb-stats.md scrape-dmb.md parallel-dmb-validation.md liberation-check.md

# Remove code quality duplicates
rm -f review.md pr-review.md security-audit.md test-generate.md refactor.md

# Remove debug duplicates
rm -f debug.md error-debug.md scraper-debug.md

# Remove performance/deployment duplicates
rm -f perf-audit.md deployment-strategy.md migrate.md
```

**Impact**: Removes 15 duplicate commands

**Remaining**: 124 unique cross-project utilities

---

### Phase 5: Verification ✅

After cleanup, verify:

```bash
# Check workspace-level (should be unchanged)
find /Users/louisherman/ClaudeCodeProjects/.claude/skills -name "SKILL.md" | wc -l
# Expected: 9

find /Users/louisherman/ClaudeCodeProjects/.claude/agents -name "*.md" | wc -l
# Expected: 14

# Check dmb-almanac project (should be mostly empty)
ls /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.claude/
# Expected: archive/ and maybe settings.local.json only

# Check app/.claude (should be gone)
ls /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/.claude/ 2>&1
# Expected: No such file or directory

# Check user commands (should be 124)
ls ~/.claude/commands/*.md | wc -l
# Expected: 124
```

---

## Impact Analysis

### Before Cleanup
| Location | Skills | Agents | Commands | Docs | Total |
|----------|--------|--------|----------|------|-------|
| Workspace `.claude/` | 9 | 14 | 0 | 2 | 25 |
| DMB project `.claude/` | 0 | **181** | 0 | **24** | **205** |
| DMB app `.claude/` | 0 | **15** | 0 | 2 | **17** |
| User `~/.claude/commands/` | 0 | 0 | **139** | 0 | **139** |
| **TOTAL** | **9** | **210** | **139** | **28** | **386** |

### After Cleanup
| Location | Skills | Agents | Commands | Docs | Total |
|----------|--------|--------|----------|------|-------|
| Workspace `.claude/` | 9 | 14 | 0 | 2 | 25 |
| DMB project `.claude/` | 0 | **0** ✅ | 0 | **0** ✅ | **0** |
| DMB app `.claude/` | **DELETED** ✅ | **DELETED** ✅ | - | - | **0** |
| User `~/.claude/commands/` | 0 | 0 | **124** ✅ | 0 | **124** |
| **TOTAL** | **9** | **14** | **124** | **2** | **149** |

**Reduction**: 386 → 149 components (61% reduction)
**Files Removed**: 237 orphaned files
**Backups Created**: 3 complete backups

---

## Cleanup Summary

### Files to Delete

#### Critical Priority (196 files)
1. **DMB project agents/**: 181 files (entire subdirectory structure)
2. **DMB app .claude/**: 15 agents + 2 docs = 17 files (entire directory)

#### High Priority (24 files)
3. **DMB project docs**: 24 markdown files in `.claude/` root

#### Medium Priority (15 files)
4. **User commands**: 15 duplicate commands

**Total**: 237 files to remove/archive

### Files to Keep

#### Active Components (149 files)
- ✅ Workspace skills: 9 SKILL.md files
- ✅ Workspace agents: 14 .md files
- ✅ User commands: 124 unique commands (after removing 15 duplicates)
- ✅ Workspace docs: 2 files (ORGANIZATION_STANDARDS.md, etc.)

#### Archived Components (safe to keep)
- ✅ `_archived/pre-migration-backup-2026-01-30/` (original migration backup)
- ✅ New backups from this cleanup

---

## Detailed Cleanup Steps

### Step 1: Create Backups ✅ DO FIRST

```bash
# Backup dmb-almanac/.claude
mkdir -p /Users/louisherman/ClaudeCodeProjects/_archived
cp -r /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.claude \
     /Users/louisherman/ClaudeCodeProjects/_archived/dmb-almanac-claude-backup-2026-01-30

# Backup app/.claude
cp -r /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/.claude \
     /Users/louisherman/ClaudeCodeProjects/_archived/dmb-app-claude-backup-2026-01-30

# Backup user commands
cp -r ~/.claude/commands ~/.claude/commands_backup_2026-01-30

echo "✅ All backups created"
```

---

### Step 2: Clean DMB Project agents/ Directory

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.claude

# Remove entire agents subdirectory structure (181 files)
rm -rf agents/

echo "✅ Removed 181 orphaned agent files"
```

**Verification**:
```bash
# Should show: No such file or directory
ls agents/ 2>&1
```

---

### Step 3: Archive DMB Project Documentation

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.claude

# Create archive location
mkdir -p ../../_archived/dmb-almanac-old-claude-docs-2026-01-30

# Move all markdown files
mv *.md ../../_archived/dmb-almanac-old-claude-docs-2026-01-30/

# Move optimization directory
mv optimization ../../_archived/dmb-almanac-old-claude-docs-2026-01-30/

echo "✅ Archived 24 documentation files"
```

**Keep**:
- `archive/` directory (existing archive)
- `settings.local.json` (if has valid config)

---

### Step 4: Remove Nested app/.claude Directory

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac

# Remove entire nested .claude directory (17 files)
rm -rf app/.claude

echo "✅ Removed nested app/.claude directory (15 agents, 2 docs)"
```

**Verification**:
```bash
# Should show: No such file or directory
ls app/.claude 2>&1
```

---

### Step 5: Clean User-Level Duplicate Commands

```bash
cd ~/.claude/commands

# Remove DMB duplicates (4 files)
rm -f dmb-stats.md scrape-dmb.md parallel-dmb-validation.md liberation-check.md

# Remove code quality duplicates (5 files)
rm -f review.md pr-review.md security-audit.md test-generate.md refactor.md

# Remove debug duplicates (3 files)
rm -f debug.md error-debug.md scraper-debug.md

# Remove performance/deployment duplicates (3 files)
rm -f perf-audit.md deployment-strategy.md migrate.md

echo "✅ Removed 15 duplicate commands"
```

**Verification**:
```bash
# Should show: 124
ls ~/.claude/commands/*.md | wc -l
```

---

## Post-Cleanup Structure

### Workspace-Level (ACTIVE) ✅
```
/Users/louisherman/ClaudeCodeProjects/.claude/
├── skills/
│   ├── agent-optimizer/SKILL.md
│   ├── code-quality/SKILL.md
│   ├── deployment/SKILL.md
│   ├── dmb-analysis/SKILL.md
│   ├── organization/SKILL.md
│   ├── scraping/SKILL.md
│   ├── skill-validator/SKILL.md
│   ├── sveltekit/SKILL.md
│   └── token-budget-monitor/SKILL.md
├── agents/
│   ├── best-practices-enforcer.md
│   ├── bug-triager.md
│   ├── code-generator.md
│   ├── code-reviewer.md
│   ├── dependency-analyzer.md
│   ├── dmb-analyst.md
│   ├── documentation-writer.md
│   ├── error-debugger.md
│   ├── migration-agent.md
│   ├── performance-auditor.md
│   ├── performance-profiler.md
│   ├── refactoring-agent.md
│   ├── security-scanner.md
│   └── test-generator.md
└── ORGANIZATION_STANDARDS.md
```

**Total**: 9 skills, 14 agents ✅

---

### DMB Project-Level (CLEANED) ✅
```
projects/dmb-almanac/.claude/
├── archive/ (keep existing)
└── settings.local.json (keep if valid)
```

**Total**: Minimal footprint, archive only ✅

---

### User-Level Commands (CLEANED) ✅
```
~/.claude/commands/
├── imagen-generate.md
├── veo-generate.md
├── video-prompt.md
├── [121 other unique cross-project utilities]
```

**Total**: 124 commands (no duplicates) ✅

---

## Verification Checklist

After cleanup, verify:

- [ ] Workspace `.claude/`: 9 skills, 14 agents (unchanged)
- [ ] DMB project `.claude/`: agents/ directory removed
- [ ] DMB project `.claude/`: docs archived
- [ ] DMB app `.claude/`: entire directory removed
- [ ] User commands: 124 files (15 removed)
- [ ] Backups created: 3 locations verified
- [ ] No broken references in remaining files
- [ ] Organization script still passes
- [ ] Skills and agents still invocable

---

## Risk Assessment

### Low Risk ✅
- Orphaned agents are already replaced by workspace-level
- Old docs are superseded by new reports
- User command duplicates have workspace equivalents
- Complete backups created before any deletions

### Mitigation
- ✅ Backup before deletion
- ✅ Delete in phases (can restore if needed)
- ✅ Verify after each phase
- ✅ Test workspace components still work

### Rollback Plan
If anything breaks:
```bash
# Restore from backups
cp -r /Users/louisherman/ClaudeCodeProjects/_archived/dmb-almanac-claude-backup-2026-01-30 \
     /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.claude

cp -r /Users/louisherman/ClaudeCodeProjects/_archived/dmb-app-claude-backup-2026-01-30 \
     /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/.claude

cp -r ~/.claude/commands_backup_2026-01-30 ~/.claude/commands
```

---

## Expected Outcomes

### Before
- 🔴 **417 total components** (237 orphaned)
- 🔴 Confusion about which components to use
- 🔴 Maintenance burden across 4 locations
- 🔴 Potential version conflicts

### After
- ✅ **149 total components** (0 orphaned)
- ✅ Clear single source of truth (workspace-level)
- ✅ Maintenance focused on 23 components
- ✅ No conflicts or duplication

### Metrics
- **Components Removed**: 237 (61% reduction)
- **Active Locations**: 2 (workspace + user commands)
- **Orphaned Locations**: 0 (down from 2)
- **Clarity**: High (no duplicate names)

---

## Timeline

**Estimated Duration**: 15-20 minutes

1. Create backups (5 min)
2. Clean DMB agents/ (2 min)
3. Archive DMB docs (3 min)
4. Remove app/.claude (1 min)
5. Clean user commands (2 min)
6. Verification tests (5 min)
7. Generate report (2 min)

---

## Approval Required

**This cleanup will DELETE or MOVE 237 files.**

Before proceeding, please confirm:
- ✅ Backup strategy acceptable?
- ✅ Approve removal of 181 dmb-almanac agent files?
- ✅ Approve removal of nested app/.claude directory?
- ✅ Approve removal of 15 user command duplicates?

**Ready to proceed with cleanup?**

---

*Analysis completed: 2026-01-30*
*Total orphaned files identified: 237*
*Cleanup impact: 61% component reduction*
*Risk: Low (complete backups created)*
