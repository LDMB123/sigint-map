# Token Optimization - Phase 17+ Discovery Report

Generated: 2026-01-31
Scope: Complete workspace scan beyond Phase 16
Model: Haiku 4.5
Token Budget: 200,000 (analysis complete)

## Key Metrics

**Files Analyzed**: 300+ configuration, documentation, and data files
**Opportunities Identified**: 18 distinct optimization targets
**Compressible Content**: 420+ KB (1.05M tokens)
**Recovery Potential**: 350-450K additional tokens
**Implementation Effort**: 8-10 hours across 4 phases

---

## Critical Findings (Immediate Action Required)

### 1. raw-results.json - 856 KB Validation Test Data

**Location**: `/Users/louisherman/ClaudeCodeProjects/.claude/validation/raw-results.json`
**Current Size**: 856 KB (30,161 lines)
**Token Impact**: 214,000 tokens
**Compression Target**: 85-90% (182-193K tokens savings)
**Priority**: CRITICAL (highest ratio)

Content: 1,500 simulation results with repetitive structure. Not accessed in active development.

Action Items:
- Create compressed index version with 10% representative samples
- Archive full file to `_archived/validation-raw-results-backup.json`
- Create reference summary: `raw-results-summary.json`

### 2. Agent Prompt Bloat - dmbalmanac-scraper.md

**Location**: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/dmbalmanac-scraper.md`
**Current Size**: 34 KB (1,163 lines)
**Token Impact**: 8,500 tokens
**Compression Target**: 70-75% (5,950-6,375 tokens savings)

Analysis:
- YAML frontmatter: keep as-is (18 lines)
- Intro/responsibilities: compress 60% (lines 20-100)
- Infrastructure: move to reference file (lines 101-500)
- Code examples: keep critical paths (lines 501-700)
- Historical notes: archive (lines 700+)

Target: 34 KB → 10 KB

### 3. dmbalmanac-site-expert.md Agent Prompt

**Location**: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/dmbalmanac-site-expert.md`
**Current Size**: 26 KB (789 lines)
**Token Impact**: 6,500 tokens
**Compression Target**: 65-70% (4,225-4,550 tokens savings)

Action: Extract URL patterns and data model docs to separate reference files
Target: 26 KB → 8 KB

### 4. Uncompressed .txt Files - 156 Files, 1.8 MB

**Location**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/docs/` (and subdirectories)
**Total Count**: 156 unique .txt files
**Total Size**: ~2.1 MB
**Compressed So Far**: ~300 KB (14% achieved)
**Remaining**: ~1.8 MB (450,000 tokens)
**Compression Target**: 80% reduction (360,000 tokens savings)

Top 10 Files Needing Compression:
1. setlist-sample.txt - 59 KB (archive entirely - test data)
2. SUMMARY_Design_System.txt - 24 KB → 4 KB
3. REACT_DEBUG_DASHBOARD.txt - 22 KB (archive or compress)
4. SYNC_SERVICE_FLOW_DIAGRAMS.txt - 21 KB → 4 KB
5. BUNDLE_OPTIMIZATION_EXECUTIVE_SUMMARY.txt - 21 KB → 3 KB
6. D3_BUNDLE_COMPARISON.txt - 20 KB → 4 KB
7. BUNDLE_VISUAL_BREAKDOWN.txt - 19 KB → 3 KB
8. WASM_AUDIT_DELIVERABLES.txt - 19 KB → 3 KB
9. SYNC_SERVICE_ISSUES_SUMMARY.txt - 18 KB → 3 KB
10. ANALYSIS_OVERVIEW.txt - 17 KB → 3 KB

---

## High-Priority Findings

### 5. workflow-patterns.json Config

**Location**: `/Users/louisherman/ClaudeCodeProjects/.claude/config/workflow-patterns.json`
**Size**: 68 KB
**Token Impact**: 17,000 tokens
**Target Compression**: 40-50% (6,800-8,500 tokens)

Strategy: Remove inactive patterns, compress metadata

### 6. Documentation Reports - 148 KB

**Location**: `/Users/louisherman/ClaudeCodeProjects/docs/reports/`
**Total Size**: 148 KB (5 large .md files)
**Token Impact**: 37,000 tokens
**Target Compression**: 60-70% (22,200-25,900 tokens)

Files:
- architecture-evolution.md - 32 KB
- BEST_PRACTICES_REVIEW.md - 32 KB
- performance-tokens.md - 28 KB
- performance-redundancy.md - 28 KB
- functional-quality-testing.md - 28 KB

### 7. .txt Summaries in docs/reports/ - 15 Files

**Total Size**: 280 KB
**Token Impact**: 70,000 tokens
**Target Compression**: 70-75% (49-52.5K tokens)

### 8. skills-index.md - 104 KB

**Location**: `/Users/louisherman/ClaudeCodeProjects/.claude/audit/skills-audit/skills-index.md`
**Token Impact**: 26,000 tokens
**Target Compression**: 75-80% (19.5-20.8K tokens)

Issue: Index file with repetitive structure

### 9. Other Agent Prompts Compression

- dexie-specialist.md: 12 KB → 4 KB (750 tokens)
- svelte5-specialist.md: 10 KB → 3 KB (700 tokens)
- sveltekit-specialist.md: 6.2 KB → 2 KB (500 tokens)

### 10. Archived Files Management

**Location**: `_archived/` (75+ files)
**Issue**: Should not be read in active sessions

Examples:
- `_archived/additional_cleanup_2026-01-30/dmb-root-txt/` - 12+ files
- `_archived/deep_scan_cleanup_2026-01-30/` - 25+ files
- `_archived/abandoned-projects-2026-01-31/` - 40+ files

Action: Create index, never read directly

---

## Data Files (Do Not Compress - Production Data)

**Location**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/static/data/`

- setlist-entries.json: 21 MB
- venue-top-songs.json: 4.3 MB
- shows.json: 2.1 MB
- show-details.json: 1.3 MB
- songs.json: 1.1 MB
- guests.json: 424 KB
- Others: 2+ MB

Status: Runtime data - use reference pointers only, never read into session

---

## Organization Issues

### Documentation Outside docs/

- `projects/imagen-experiments/prompts/dive-bar-concepts-*.md` (6 files)
- `projects/emerson-violin-pwa/qa/*.md` (2 files)

Action: Consolidate to docs/ subdirectories

---

## Compression Prioritization Table

| Priority | Target | Size | Tokens | Effort | Savings | Ratio |
|----------|--------|------|--------|--------|---------|-------|
| 1 | raw-results.json | 856 KB | 214K | 20min | 182K | 9,100/min |
| 2 | .txt bulk (156 files) | 1.8 MB | 450K | 120min | 360K | 3,000/min |
| 3 | dmbalmanac-scraper.md | 34 KB | 8.5K | 45min | 5.95K | 132/min |
| 4 | docs/reports/*.md | 148 KB | 37K | 60min | 22.2K | 370/min |
| 5 | workflow-patterns.json | 68 KB | 17K | 15min | 6.8K | 453/min |
| 6 | dmbalmanac-site-expert.md | 26 KB | 6.5K | 40min | 4.2K | 106/min |
| 7 | skills-index.md | 104 KB | 26K | 45min | 19.5K | 433/min |
| 8 | Other agents (3 files) | 28 KB | 7K | 60min | 3K | 50/min |

---

## Implementation Phases

### Phase 17.1: Quick Wins (1-2 hours)
Effort: 40 minutes | Savings: 37.5K tokens

1. Archive setlist-sample.txt (5 min → 14.75K tokens)
2. Compress workflow-patterns.json (15 min → 6.8K tokens)
3. Quick-win .txt compression (20 min → 16K tokens)

### Phase 17.2: Large-Scale Compression (4-5 hours)
Effort: 300 minutes | Savings: 180K tokens

1. Process all 156 .txt files (120 min → 360K tokens potential)
2. Compress agent prompts (60 min → 10.5K tokens)
3. Compress documentation reports (60 min → 25.9K tokens)

### Phase 17.3: Structural Cleanup (2-3 hours)
Effort: 150 minutes | Savings: 46K tokens

1. Compress skills-index.md (45 min → 20.8K tokens)
2. Move scattered documentation (30 min → 2K tokens)
3. Create archive indices (45 min → 1K tokens)
4. raw-results.json conversion (30 min → 182K tokens)

### Phase 17.4: Validation (1 hour)
Effort: 60 minutes | Savings: Verification

1. Verify compression integrity
2. Test agent functionality
3. Validate references
4. Update documentation

---

## Token Budget Impact Analysis

**Current State**:
- Budget: 200,000 tokens
- Already used (session): ~50,000 tokens
- Available: 150,000 tokens

**Post Phase 17.1**:
- Additional freed: 37,500 tokens
- New available: 187,500 tokens

**Post Phase 17.2**:
- Additional freed: 180,000 tokens
- New available: 367,500 tokens

**Post Phase 17.3**:
- Additional freed: 46,000 tokens + 182,000 tokens (raw-results)
- New available: 595,500 tokens

**Projected Final** (all phases):
- Total freed: 445,500 tokens (3.6x multiplier)
- Expected available: 595,500+ tokens
- Runway extension: From 3 hours to 10+ hours per session

---

## Specific Compression Examples

### Example 1: raw-results.json

Before: 30,161 lines of simulation data
After: 200 lines (5% samples + index)
Ratio: 856 KB → 90 KB (89% reduction)

### Example 2: BUNDLE_OPTIMIZATION_EXECUTIVE_SUMMARY.txt

Before: 21 KB plaintext with paragraph descriptions
After: 3-4 KB YAML with structured summary
Ratio: 86% reduction

### Example 3: dmbalmanac-scraper.md

Before: 1,163 lines covering history, infrastructure, code
After: 350 lines focusing on core responsibilities
Ratio: 70% reduction

---

## Validation Checklist

Before implementation:
- [ ] Back up all original files
- [ ] Verify no critical information loss in compression
- [ ] Test agent functionality with compressed prompts
- [ ] Ensure no broken file paths/references
- [ ] Validate documentation accessibility
- [ ] Confirm production data untouched
- [ ] Create compression manifest
- [ ] Document all changes

---

## Maintenance Plan

**Quarterly**: Audit for new uncompressed files
**With Updates**: Compress new reports/data immediately
**Agent Changes**: Keep prompts under 10 KB each
**Config Files**: Keep JSON/YAML under 50 KB
**Documentation**: Archive >50 KB after 30 days

---

## Files and Directories Referenced

Critical files to compress:
- `/Users/louisherman/ClaudeCodeProjects/.claude/validation/raw-results.json`
- `/Users/louisherman/ClaudeCodeProjects/.claude/agents/dmbalmanac-scraper.md`
- `/Users/louisherman/ClaudeCodeProjects/.claude/agents/dmbalmanac-site-expert.md`
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/docs/` (all .txt subdirectories)
- `/Users/louisherman/ClaudeCodeProjects/.claude/config/workflow-patterns.json`
- `/Users/louisherman/ClaudeCodeProjects/docs/reports/` (5 large .md files)
- `/Users/louisherman/ClaudeCodeProjects/.claude/audit/skills-audit/skills-index.md`

Do not compress:
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/static/data/` (production data)
- `node_modules/` directories
- `.git/` directories

Archive references:
- `_archived/` (75+ obsolete files, create index)
- Move setlist-sample.txt to test-data subdirectory
- Move old validation runs to validation-archive

---

## Expected Outcomes

After completing all 4 phases:
- 420+ KB compressed to ~100 KB (76% reduction)
- 1.05M tokens → 180K tokens (83% reduction)
- Session runtime: 3 hours → 10+ hours
- Code organization: improved structure
- Maintainability: clearer file purposes

---

## Next Steps

1. Review this report (1 author review)
2. Back up critical files (validation + archives)
3. Implement Phase 17.1 (Quick Wins)
4. Commit with message: "Phase 17.1: Token optimization - quick wins"
5. Proceed with Phases 17.2-17.4 as scheduled

