# Imagen Project Compression Index
**Updated:** 2026-02-04
**Total Compression:** 330K → 28K tokens (91.5% reduction)

---

## Quick Reference Guide

### Session Start (Load These First)
1. `../docs/SESSION-MASTER-2026-02-02.md` (13KB, 3.9K tokens) - Authoritative session state
2. `docs/PHYSICS-METHODOLOGY.ref.md` (2.1KB, 600 tokens) - Physics formulas
3. `docs/BOUNDARY-FINDINGS.ref.md` (2.3KB, 650 tokens) - Safety boundaries

**Total session load:** 17.4KB, ~5.1K tokens (was 63.8K tokens)

---

## Compression Inventory

### Reports (Consolidated)
**Before:** 4 files, 92KB, 27K tokens
**After:** 1 file, 4.2KB, 1.2K tokens
**File:** `reports/TOKEN-OPTIMIZATION-CONSOLIDATED.compressed.md`
**Savings:** 96% (25.8K tokens)

**Contents:**
- Session documentation explosion analysis
- Compressed file duplicate identification
- Script proliferation findings
- Prompt file organization strategy

### Physics Documentation
**Before:** 23KB, 7K tokens
**After:** 2.1KB, 600 tokens
**File:** `docs/PHYSICS-METHODOLOGY.ref.md`
**Savings:** 91% (6.4K tokens)

**Preserved:**
- Component effectiveness matrix
- Physics shield levels (V4-V12)
- Key formulas (Airy disc, Beer-Lambert, Kubelka-Munk)
- Validated capabilities list
- Allocation strategy

### Boundary Findings
**Before:** 20KB, 6K tokens
**After:** 2.3KB, 650 tokens
**File:** `docs/BOUNDARY-FINDINGS.ref.md`
**Savings:** 89% (5.35K tokens)

**Preserved:**
- All safe/blocked boundaries
- Test counts and success rates
- Critical combinations
- Physics shield effectiveness data

### Concept Batch Documentation
**Already compressed (from previous session):**
- ULTRA-REAL-concepts-31-60.compressed.yaml (8KB)
- ULTRA-MICROSTRUCTURE-concepts-31-60.compressed.yaml (9.1KB)
- ULTRA-MICROSTRUCTURE-concepts-91-120.compressed.yaml (1.8KB)
- ULTRA-MICROSTRUCTURE-concepts-121-150.compressed.yaml (0.8KB)
- OPTIMIZED-concepts-31-60.compressed.yaml (0.8KB)

**Compression:** 95-99% per file, template-based reconstruction

---

## File Organization Strategy

### Active (Load Regularly)
Location: Project root `docs/`
- SESSION-MASTER-2026-02-02.md (authoritative)
- KNOWLEDGE_BASE.md (physics quick ref)
- EXPERIMENTS_INDEX.md (tracking)

### Compressed References (Load as Needed)
Location: `_compressed/`
- All reports (consolidated)
- Physics methodology (reference)
- Boundary findings (reference)
- Concept batches (YAML)
- Generation logs (YAML)

### Archive (History Only)
Location: `docs/_archived/`
- Old session snapshots (SESSION-*.md)
- Historical planning docs
- Outdated reports
- Superseded findings

---

## Usage Patterns

### Pattern 1: Cold Start (New Session)
**Load:**
1. SESSION-MASTER-2026-02-02.md (3.9K tokens)
2. PHYSICS-METHODOLOGY.ref.md (600 tokens)
3. BOUNDARY-FINDINGS.ref.md (650 tokens)

**Total:** 5.1K tokens
**Benefit:** Full context, 92% token savings vs loading all docs

### Pattern 2: Concept Generation
**Load:**
1. Session master (3.9K)
2. Physics ref (600)
3. Specific concept batch YAML if needed (0.8-9KB)

**Total:** 5.3-13.6K tokens
**Benefit:** All generation context, 85-91% savings

### Pattern 3: Debugging/Analysis
**Load:**
1. Session master (3.9K)
2. Boundary findings ref (650)
3. Relevant generation log YAML (0.3-6.4KB)

**Total:** 4.9-10.9K tokens
**Benefit:** Full debug context, 87-94% savings

### Pattern 4: Planning New Series
**Load:**
1. Session master (3.9K)
2. All compressed refs (1.2K + 600 + 650 = 2.45K)
3. Concept batch for reference (0.8-9KB)

**Total:** 7.2-15.3K tokens
**Benefit:** Complete planning context, 82-90% savings

---

## Decompression Instructions

### Reports
**If need full detail:**
```bash
# Read original reports
cat docs/reports/TOKEN_OPTIMIZATION_COMPREHENSIVE_2026-02-03.md
cat docs/reports/TOKEN-OPTIMIZATION-AGENT-REPORT-2026-02-03.md
cat docs/reports/DETAILED-FILE-ANALYSIS.md
```

### Physics Methodology
**If need examples/proofs:**
```bash
cat docs/FIRST-PRINCIPLES-PHYSICS-METHODOLOGY.md
```

### Boundary Findings
**If need detailed test matrix:**
```bash
cat docs/BOUNDARY-FINDINGS-REPORT.md
```

### Concept Batches
**Template expansion (programmatic):**
```javascript
// Load compressed YAML
const batch = loadYAML('_compressed/docs/ULTRA-MICROSTRUCTURE-concepts-31-60.compressed.yaml');

// Expand template for concept
function expandConcept(id) {
  const concept = batch.concepts[`concept_${id}`];
  const template = batch.prompt_template;
  return template
    .replace('{bar}', concept.bar)
    .replace('{outfit}', concept.outfit)
    .replace('{iso}', concept.camera.iso)
    // ... etc
}
```

---

## Compression Metrics Summary

| Category | Original | Compressed | Savings | Method |
|----------|----------|------------|---------|--------|
| Session context | 29.8K | 3.9K | 87% | Authority pattern |
| Reports | 27K | 1.2K | 96% | Consolidation |
| Physics docs | 7K | 0.6K | 91% | Reference |
| Boundary findings | 6K | 0.65K | 89% | Summary |
| Concept batches | 184K | 20K | 89% | Template extraction |
| **TOTAL** | **253.8K** | **26.35K** | **89.6%** | **Hybrid** |

---

## Maintenance

### When to Recompress
- New session state file created → Update session reference
- Major physics breakthrough → Update physics ref
- New boundary findings → Merge into boundary ref
- Large report generated → Add to consolidated reports

### Validation Checklist
- [ ] All key formulas preserved
- [ ] Success rates and test counts accurate
- [ ] Reference paths point to existing files
- [ ] Compression ratio > 85%
- [ ] Zero critical information loss

---

## Previous Compression Work (Session 2026-01-31)

**Already compressed:**
- Concept documentation (5 files, 95.7% compression)
- Generation logs (3 files, 94-99% compression)
- Project map (1 file)
- Session state YAML (861 bytes)

**See:** `_compressed/README.md` for details on previous compression work

---

## Token Budget Impact

**Before optimization:**
- Typical session load: 63.8K tokens
- With concept batches: 184-247K tokens
- Risk: Token limit exhaustion

**After optimization:**
- Essential session load: 5.1K tokens (92% reduction)
- With concept batch: 14-15K tokens (85-94% reduction)
- Benefit: 10-15 full sessions per token budget vs 1-2 sessions
