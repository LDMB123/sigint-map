# Phase 14: Project Deep Dives - Execution Plan

**Date:** 2026-01-31
**Target:** 5-7 optimizations (project-specific cleanup)
**Estimated Recovery:** 5-10 MB disk + 50K tokens
**Status:** PLANNING

---

## Project Status Overview

### ✅ Emerson Violin PWA - COMPLETE (Phase 11)
- **Recovered:** 373 MB (npm prune removed 81 packages)
- **Before:** 572 MB total (490 MB node_modules)
- **After:** 199 MB total (117 MB node_modules)
- **Status:** DONE - Brought forward from Phase 14 to Phase 11

### 🔍 Imagen Experiments - TO ANALYZE
- **Size:** 8.6 MB
- **Status:** Active Python/bash project for Google Imagen API
- **Potential opportunities:**
  1. Large reference images: 3.2 MB + 2.7 MB = 5.9 MB
  2. Log files: 128 KB
  3. Generated script files: 360 KB
  4. Documentation compression: ~500 KB

### ✅ DMB Almanac - COMPLETE (Phases 1-13)
- **Status:** Extensively optimized throughout MEGA plan
- **No further opportunities:** Already compressed, archived, cleaned

---

## Imagen Project Analysis

### Current State
```
Total: 8.6 MB
├── assets/
│   ├── reference_image.jpeg: 3.2 MB
│   ├── reference_woman.jpeg: 2.7 MB
│   └── pool_woman_original.jpg: 34 bytes (0-byte permission issue)
├── docs/: ~600 KB (concept documentation)
├── scripts/: ~700 KB (generation scripts)
├── _logs/: 128 KB (log files)
└── src/: Python code
```

### Largest Files
1. reference_image.jpeg: 3.2 MB
2. reference_woman.jpeg: 2.7 MB
3. GEN-PHYSICS-31-60.sh: 360 KB
4. ULTRA-REAL-concepts-31-60.md: 128 KB
5. ULTRA-MICROSTRUCTURE-concepts-31-60.md: 104 KB

---

## Phase 14 Strategy

### Optimization 1-2: Reference Image Analysis
**Target:** assets/reference_image.jpeg (3.2 MB), reference_woman.jpeg (2.7 MB)

**Options:**
1. **Keep as-is** - These are reference images for Imagen API
2. **Compress** - Reduce quality/size if not actively used
3. **Archive** - Move to _archived if superseded
4. **External** - Move to external storage, document URLs

**Decision criteria:**
- Are these actively used in scripts?
- Are they input references or output examples?
- Can they be regenerated?

**Recommended:** Check usage, then decide

---

### Optimization 3: Log File Cleanup
**Target:** _logs/*.log (128 KB total)

**Candidates:**
- optimized-61-80.log: 68 KB
- physics-81-90.log: 48 KB
- optimized-31-60.log: 8 KB
- optimized-81-90.log: 4 KB

**Action:** Safe to delete (build logs, regenerated on next run)
**Recovery:** 128 KB disk

---

### Optimization 4: Script Compression
**Target:** scripts/GEN-*.sh files (~700 KB total)

**Analysis needed:**
- Are these generated or hand-written?
- Do they follow patterns that could be compressed?
- Are there duplicates?

**Potential:** Reference-based compression if many similar files

---

### Optimization 5: Documentation Compression
**Target:** docs/ULTRA-MICROSTRUCTURE-*.md, docs/OPTIMIZED-*.md (~600 KB)

**Strategy:** Token-optimized compression
- Batch similar concept files
- Create ultra-compressed references
- Preserve essential prompts/results

**Recovery potential:** 400-500 KB disk + 30-50K tokens

---

### Optimization 6-7: Opportunistic
**Check for:**
- Python cache files (__pycache__, *.pyc)
- Temporary files
- Duplicate scripts
- Old experiment outputs

---

## Execution Plan

### Step 1: Analyze Reference Images
```bash
# Check if images are referenced in scripts
grep -r "reference_image\|reference_woman" scripts/ docs/

# Check file metadata
file assets/*.jpeg
```

**Decide:** Keep, compress, archive, or externalize

---

### Step 2: Clean Log Files
```bash
# Delete log files (safe - regenerated)
rm -f _logs/*.log
```

**Recovery:** ~128 KB

---

### Step 3: Analyze Scripts
```bash
# Check for patterns/duplication
wc -l scripts/GEN-*.sh
diff scripts/GEN-PHYSICS-31-60.sh scripts/GEN-OPTIMIZED-31-60.sh
```

**Determine:** Compression opportunity or keep as-is

---

### Step 4: Compress Documentation
```bash
# Batch compress concept files
# Create reference index for ULTRA-MICROSTRUCTURE series
# Create reference index for OPTIMIZED series
```

**Recovery:** 400-500 KB + 30-50K tokens

---

### Step 5: Python Cache Check
```bash
find . -type d -name "__pycache__" -o -name "*.pyc"
```

**Clean if found**

---

### Step 6: Verify & Measure
```bash
du -sh .
# Compare before/after
```

---

## Conservative Estimate

**If we only do safe operations:**
- Log file deletion: 128 KB
- Documentation compression: 300 KB + 30K tokens
- Python cache cleanup: 0-50 KB
- **Total:** ~500 KB + 30K tokens

---

## Aggressive Estimate

**If we also handle images:**
- Reference image compression/archival: 5.9 MB
- Log files: 128 KB
- Documentation: 400 KB + 50K tokens
- Scripts: 200 KB (if compressible)
- **Total:** ~6.6 MB + 50K tokens

---

## Decision Points

### Reference Images (5.9 MB)
**Question:** Are these actively used or can they be moved?

**Check:**
1. Usage in scripts
2. Last access time
3. Are they inputs or outputs?

**Options:**
- Keep (if actively used)
- Archive (if superseded)
- Compress (if quality not critical)
- Externalize (Git LFS or external storage)

---

## Risk Assessment

**LOW RISK:**
- ✅ Log file deletion (regenerated)
- ✅ Python cache deletion (regenerated)
- ✅ Documentation compression (reference-based)

**MEDIUM RISK:**
- ⚠️ Script compression (verify not breaking)
- ⚠️ Image compression (quality loss)

**HIGH RISK:**
- ❌ Deleting reference images (may be needed)

**Approach:** Start with low-risk, assess medium-risk case-by-case

---

## Success Criteria

- [ ] Imagen project analyzed
- [ ] Log files cleaned (128 KB)
- [ ] Reference images assessed (keep/compress/archive decision)
- [ ] Documentation compressed (if >300 KB opportunity)
- [ ] Python cache cleaned (if present)
- [ ] All operations documented
- [ ] Project still functional

**Minimum target:** 500 KB + 30K tokens
**Stretch target:** 6 MB + 50K tokens (if images handled)

---

## Other Projects

### Already Optimized
- ✅ DMB Almanac (Phases 1-13)
- ✅ Emerson (Phase 11)

### Workspace Root
- Already at 100/100 organization
- No scattered files
- All docs in proper locations

**Conclusion:** Imagen is the only remaining project needing deep dive

---

## Next Steps

1. Analyze reference image usage
2. Execute low-risk cleanups (logs, cache)
3. Assess documentation compression opportunity
4. Make image decision based on usage
5. Document results
6. Proceed to Phase 15 (Final Sweep)

---

**Created:** 2026-01-31
**Phase:** 14 of 15 (MEGA Optimization)
**Prerequisite:** Phases 1-13 complete (4.299M tokens + 502 MB)
**Primary target:** Imagen experiments (8.6 MB)
**Next:** Execute Imagen analysis and cleanup
