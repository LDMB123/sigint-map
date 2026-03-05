# File Organization Issues - DMB Almanac

**Date**: 2026-02-12
**Scope**: Project-wide file duplication and organization analysis

---

## Critical: Data File Duplication

### Issue: 3x Data Storage Across Locations

**Impact**: ~120MB of duplicated data files consuming disk space and git history

#### Affected Files

**Large Data Files** (21MB each, 3 copies = 63MB):
- `./rust/static/data/setlist-entries.json`
- `./rust/data/raw/setlist-entries.json`
- `./data/static-data/setlist-entries.json`

**Bundle Files** (19MB each, 3 copies = 57MB):
- `./rust/static/data/bundle.json`
- `./rust/data/raw/bundle.json`
- `./data/static-data/bundle.json`

**Other Duplicates** (4-5MB each):
- `venue-top-songs.json` (3 copies, 13MB total)
- `shows.json` (3 copies, 6.3MB total)
- `show-details.json` (3 copies, 3.9MB total)
- `venues.json`, `songs.json`, `curated-list-items.json` (3 copies each)

**Total Duplication**: ~120MB across all data files

---

## Root Cause Analysis

### Three Data Locations

1. **`data/static-data/`** - Legacy location (pre-Rust)
2. **`rust/data/raw/`** - Rust pipeline input/intermediate
3. **`rust/static/data/`** - Rust app output/serving

### Why Duplication Exists

**Likely**: Migration in progress from JS app → Rust app
- Old JS app used `data/static-data/`
- Rust pipeline generates `rust/data/raw/` + `rust/static/data/`
- Legacy not yet cleaned up

---

## Recommendations

### Option 1: Single Source of Truth (RECOMMENDED)

**Keep only**: `rust/static/data/` (serving directory)

**Remove**:
- `data/static-data/` → Archive or delete (legacy)
- `rust/data/raw/` → Use `.gitignore` (build artifacts)

**Rationale**:
- Rust-first strategy (per CLAUDE.md)
- Build process generates `raw/` → can be gitignored
- Only served files (`static/`) need version control

### Option 2: Symlinks (Alternative)

**Keep**:
- `rust/static/data/` (canonical)
- Create symlinks:
  - `data/static-data/` → `../rust/static/data/`
  - `rust/data/raw/` → `.gitignore` + pipeline generates

**Rationale**:
- Backward compatibility if legacy paths referenced
- Clear canonical location
- No duplication in git

### Option 3: Git LFS + .gitignore

**If data files change frequently**:
- Move large JSON to Git LFS
- `.gitignore` generated copies
- Keep only canonical source

---

## Compression Wins: Documentation

### Successfully Compressed (3 files)

**Before**: 108KB (3,536 lines)
**After**: 13.8KB (471 lines)
**Savings**: 94KB (87% reduction)

| File | Original | Compressed | Reduction |
|------|----------|------------|-----------|
| `ACCESSIBILITY_AUDIT_2026-02-03.md` | 43KB (1414 lines) | 3.2KB (96 lines) | 92.5% |
| `PWA_AUDIT_2026-02-03.md` | 41KB (1339 lines) | 4.9KB (188 lines) | 88.0% |
| `MEMORY_MANAGEMENT_AUDIT.md` | 24KB (783 lines) | 5.6KB (187 lines) | 76.5% |

**Compressed files**: `docs/reports/_full_audits/*_COMPRESSED.md`

**Action**:
- Use compressed versions for Claude context
- Keep full audits for reference only
- Update `docs/INDEX.md` to reference compressed versions

---

## Already Well-Organized

### Documentation Structure ✅

**Good patterns**:
- `docs/guides/` - Deployment, testing, accessibility, CSS
- `docs/reports/` - Roadmap, performance, security
- `docs/audits/` - Domain references (chromium, database, security)
- `docs/migration/` - Rust-first milestones
- `docs/reports/_archived/` - Historical files properly archived

**Existing summaries** (no compression needed):
- `ACCESSIBILITY_AUDIT_SUMMARY.md` (15 lines) - stub for Rust app
- `PWA_AUDIT_SUMMARY.md` (36 lines) - already concise
- `MEMORY_AUDIT_SUMMARY.md` (390 lines) - appropriate detail

**Well-structured references**:
- `MEMORY_LEAK_SOURCES.md` - file:line references (not verbose)
- `CODEX_CACHE_WARMING_STRATEGY.md` - dense, actionable content
- `SCRAPING_REFERENCE.md` - appropriate detail for reference

---

## Action Plan

### Immediate (This Sprint)

1. **Choose data deduplication strategy** (recommend Option 1)
2. **Update `.gitignore`** if choosing to ignore `rust/data/raw/`
3. **Update `docs/INDEX.md`** to reference compressed audit files
4. **Validate no broken references** after cleanup

### Short-term (Next Sprint)

5. **Document canonical data locations** in CLAUDE.md
6. **Add script** to verify data file integrity (checksums)
7. **CI check** to prevent data duplication (fail if detected)

### Before Implementing

- **Verify**: No code references legacy `data/static-data/` paths
- **Test**: Rust app works with only `rust/static/data/`
- **Backup**: Archive before deletion (just in case)

---

## Estimated Impact

**Disk Space Savings**: ~120MB (80MB from git history with repack)
**Git Clone Time**: -15-20 seconds (fewer large files)
**Context Window**: +94KB from compressed audits
**Maintenance**: Clearer data flow, single source of truth

---

**Next Steps**: Choose deduplication strategy and implement in coordination with data pipeline maintainer.
