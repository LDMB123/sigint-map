# Imagen Project Token Optimization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce session context from ~80K to ~47K tokens (41% reduction) and total project from 1.28M to ~1.05M tokens (18% reduction)

**Architecture:** Delete redundant files, consolidate prompts into template+data system, reorganize scripts into categorized folders

**Tech Stack:** Node.js, Bash, JSON

---

## Phase 1: Delete Redundant Optimization Reports (Quick Win)

### Task 1.1: Remove Root-Level Redundant Files

**Files:**
- Delete: `projects/imagen-experiments/TOKEN-OPTIMIZATION-START-HERE.md`
- Delete: `projects/imagen-experiments/OPTIMIZATION-QUICK-REFERENCE.md`
- Delete: `projects/imagen-experiments/DEEP_ANALYSIS_RESULTS.md`
- Delete: `projects/imagen-experiments/COMPRESSION_EXECUTIVE_SUMMARY.txt`
- Keep: `projects/imagen-experiments/TOKEN-OPTIMIZATION-AGENT-REPORT-2026-02-03.md` (authoritative)

**Step 1: Verify files exist**
```bash
ls -la projects/imagen-experiments/TOKEN-OPTIMIZATION-START-HERE.md \
       projects/imagen-experiments/OPTIMIZATION-QUICK-REFERENCE.md \
       projects/imagen-experiments/DEEP_ANALYSIS_RESULTS.md \
       projects/imagen-experiments/COMPRESSION_EXECUTIVE_SUMMARY.txt 2>/dev/null
```

**Step 2: Delete redundant files**
```bash
rm -f projects/imagen-experiments/TOKEN-OPTIMIZATION-START-HERE.md \
      projects/imagen-experiments/OPTIMIZATION-QUICK-REFERENCE.md \
      projects/imagen-experiments/DEEP_ANALYSIS_RESULTS.md \
      projects/imagen-experiments/COMPRESSION_EXECUTIVE_SUMMARY.txt
```

**Step 3: Verify deletion**
```bash
ls projects/imagen-experiments/*.md projects/imagen-experiments/*.txt 2>/dev/null | head -20
```

**Savings:** ~6K tokens

---

## Phase 2: Delete Archived Session Snapshots

### Task 2.1: Remove Session Snapshot Files

**Files to Delete:**
- `docs/_archived/SESSION-RECOVERY-2026-02-01.md`
- `docs/_archived/SESSION-CONTEXT-MASTER-COMPRESSED-2026-02-01.md`
- `docs/_archived/SESSION-2026-02-01-V10-V11-COMPRESSED.md`
- `docs/_archived/SESSION-STATE-COMPRESSED.md`
- `docs/_archived/SESSION-CONTEXT-COMPRESSED.md`
- `docs/_archived/SESSION-2026-02-01-IMAGEN-GENERATION.md`
- `docs/_archived/SESSION-2026-02-01-COMPRESSED.md`
- `docs/_archived/SESSION-COMPRESSED-KNOWLEDGE.md`

**Keep:** `docs/SESSION-MASTER-2026-02-02.md` (authoritative)

**Step 1: Delete session snapshots**
```bash
cd projects/imagen-experiments
rm -f docs/_archived/SESSION-RECOVERY-2026-02-01.md \
      docs/_archived/SESSION-CONTEXT-MASTER-COMPRESSED-2026-02-01.md \
      docs/_archived/SESSION-2026-02-01-V10-V11-COMPRESSED.md \
      docs/_archived/SESSION-STATE-COMPRESSED.md \
      docs/_archived/SESSION-CONTEXT-COMPRESSED.md \
      docs/_archived/SESSION-2026-02-01-IMAGEN-GENERATION.md \
      docs/_archived/SESSION-2026-02-01-COMPRESSED.md \
      docs/_archived/SESSION-COMPRESSED-KNOWLEDGE.md
```

**Savings:** ~25K tokens

---

## Phase 3: Delete Orphaned Compressed Files

### Task 3.1: Remove Orphaned Compressed Docs

**Files to Delete:**
- `docs/_archived/PHYSICS-DOCS-COMPRESSED.md`
- `docs/_archived/MISC-DOCS-COMPRESSED.md`
- `docs/_archived/NASHVILLE-DOCS-COMPRESSED.md`
- `docs/_archived/DOCS-COMPRESSED-INDEX.md`
- `docs/_archived/OPTIMIZATION-SUMMARY-2026-02-01.md`
- `docs/_archived/OPTIMIZATION_INDEX.md`
- `docs/plans/PLANS-COMPRESSED-INDEX.md`
- `docs/_archived/COMPRESSED_CONCEPTS_INDEX.md`
- `docs/_archived/NASHVILLE-COMPRESSED.md`
- `docs/_archived/VEGAS-PROJECT-COMPRESSED.md`

**Step 1: Delete orphaned compressed files**
```bash
cd projects/imagen-experiments
rm -f docs/_archived/PHYSICS-DOCS-COMPRESSED.md \
      docs/_archived/MISC-DOCS-COMPRESSED.md \
      docs/_archived/NASHVILLE-DOCS-COMPRESSED.md \
      docs/_archived/DOCS-COMPRESSED-INDEX.md \
      docs/_archived/OPTIMIZATION-SUMMARY-2026-02-01.md \
      docs/_archived/OPTIMIZATION_INDEX.md \
      docs/plans/PLANS-COMPRESSED-INDEX.md \
      docs/_archived/COMPRESSED_CONCEPTS_INDEX.md \
      docs/_archived/NASHVILLE-COMPRESSED.md \
      docs/_archived/VEGAS-PROJECT-COMPRESSED.md
```

### Task 3.2: Remove Additional Archived Cruft

**Step 1: Remove bounty/submission files (historical, not needed)**
```bash
rm -f docs/_archived/BOUNTY-SUBMISSIONS.md \
      docs/_archived/BOUNTY-SUBMISSIONS-FINAL.md \
      docs/_archived/FINAL-BOUNTY-REPORT.md \
      docs/_archived/ACTUAL-DISCOVERIES.md
```

**Step 2: Remove duplicate Nashville tracking files**
```bash
rm -f docs/_archived/NASHVILLE-GENERATION-TRACKER.md \
      docs/_archived/NASHVILLE-GENERATION-EXECUTION.md \
      docs/_archived/NASHVILLE-HONKY-TONK-VALIDATION.md \
      docs/_archived/NASHVILLE-PREPARATION-COMPLETE.md \
      docs/_archived/NASHVILLE-READY-FOR-EXECUTION.md
```

**Step 3: Remove miscellaneous obsolete files**
```bash
rm -f docs/_archived/ULTIMATE-SESSION-BREAKTHROUGH.md \
      docs/_archived/SKILL-VALIDATION-TEST.md \
      docs/_archived/INFERENCE-PHYSICS-THEORY.md \
      docs/_archived/GROUNDBREAKING-20-CONCEPTS.md \
      docs/_archived/COMPOUND-SCALING-LAW.md \
      docs/_archived/EXECUTIVE-SUMMARY.md \
      docs/_archived/SULTRY-VEGAS-FINAL-181-210.md
```

**Savings:** ~35K tokens

---

## Phase 4: Create Prompt Template System

### Task 4.1: Create Prompt Template Module

**Files:**
- Create: `scripts/lib/prompt-builder.js`

**Step 1: Create prompt template module**

```javascript
/**
 * Prompt Template Builder for Imagen Generation
 * Consolidates 60 dive-bar concepts into template + data
 */

const BASE_PHOTOGRAPHY = {
  camera: 'Canon EOS R5',
  lens: '85mm f/1.2',
  iso: 4000,
  aperture: 'f/1.8',
  lighting: 'dramatic neon bar lighting with warm amber undertones'
};

const BASE_STYLE = {
  mood: 'authentic dive bar atmosphere',
  composition: 'intimate portrait framing',
  focus: 'shallow depth of field on subject',
  background: 'bokeh blur of bar elements'
};

/**
 * Build a complete prompt from concept data
 * @param {Object} concept - Concept parameters
 * @returns {string} Complete generation prompt
 */
function buildPrompt(concept) {
  const { venue, colors, style, attire, pose, details } = concept;

  return `Professional fashion photography in ${venue}. ${style} aesthetic.

Subject: Woman in ${attire}, ${colors.join(' and ')} tones.
Pose: ${pose}
${details ? `Details: ${details}` : ''}

Photography: ${BASE_PHOTOGRAPHY.camera}, ${BASE_PHOTOGRAPHY.lens}, ISO ${BASE_PHOTOGRAPHY.iso}, ${BASE_PHOTOGRAPHY.aperture}
Lighting: ${BASE_PHOTOGRAPHY.lighting}
Mood: ${BASE_STYLE.mood}
Composition: ${BASE_STYLE.composition}, ${BASE_STYLE.focus}
Background: ${BASE_STYLE.background}`;
}

/**
 * Build batch of prompts from concepts array
 * @param {Array} concepts - Array of concept objects
 * @returns {Array} Array of prompt strings
 */
function buildBatch(concepts) {
  return concepts.map((concept, index) => ({
    id: index + 1,
    prompt: buildPrompt(concept),
    metadata: {
      venue: concept.venue,
      style: concept.style,
      colors: concept.colors
    }
  }));
}

module.exports = { buildPrompt, buildBatch, BASE_PHOTOGRAPHY, BASE_STYLE };
```

### Task 4.2: Create Concepts Data File

**Files:**
- Create: `prompts/concepts.json`

**Step 1: Extract concepts to JSON (sample structure)**

```json
{
  "version": "1.0",
  "totalConcepts": 60,
  "concepts": [
    {
      "id": 1,
      "venue": "Rusty Nail Saloon",
      "colors": ["deep red", "black"],
      "style": "edgy rocker",
      "attire": "leather jacket over lace top",
      "pose": "leaning against bar, confident gaze",
      "details": "neon beer signs in background"
    },
    {
      "id": 2,
      "venue": "Blue Moon Tavern",
      "colors": ["electric blue", "silver"],
      "style": "retro glamour",
      "attire": "sequined mini dress",
      "pose": "seated at bar stool, legs crossed",
      "details": "vintage jukebox lighting"
    }
  ]
}
```

### Task 4.3: Archive Original Prompt Files

**Step 1: Create archive directory and move originals**
```bash
mkdir -p projects/imagen-experiments/prompts/_archived
mv projects/imagen-experiments/prompts/dive-bar-concepts-*.md \
   projects/imagen-experiments/prompts/_archived/
mv projects/imagen-experiments/prompts/all-30-prompts.txt \
   projects/imagen-experiments/prompts/_archived/
```

**Savings:** ~125K tokens (80% reduction in prompts)

---

## Phase 5: Reorganize Scripts into Categorized Folders

### Task 5.1: Create Script Directory Structure

**Step 1: Create categorized directories**
```bash
cd projects/imagen-experiments/scripts
mkdir -p vegas nashville batch experiments
```

### Task 5.2: Move Vegas Scripts

**Step 1: Move vegas-v*.js files**
```bash
mv vegas-v*.js vegas/
mv vegas-pool-*.js vegas/
```

### Task 5.3: Move Nashville Scripts

**Step 1: Move nashville-*.js files**
```bash
mv nashville-*.js nashville/
```

### Task 5.4: Move Batch Scripts

**Step 1: Move shell batch scripts**
```bash
mv *.sh batch/
```

### Task 5.5: Move Experimental Scripts

**Step 1: Move remaining experimental scripts**
```bash
mv nanobanana-*.js experiments/
mv *-direct.js experiments/
```

---

## Phase 6: Update CLAUDE.md

### Task 6.1: Update Project Guide

**Files:**
- Modify: `projects/imagen-experiments/CLAUDE.md`

**Step 1: Update with new structure**

```markdown
# Imagen Experiments

AI image generation experiments with Google Imagen, Veo, and other generative AI tools.

## Project Structure

```
imagen-experiments/
├── scripts/
│   ├── lib/              # Shared modules
│   │   ├── physics-engine.js
│   │   ├── grounding.js
│   │   └── prompt-builder.js
│   ├── vegas/            # Vegas series (v4-v29)
│   ├── nashville/        # Nashville concepts
│   ├── batch/            # Shell batch runners
│   └── experiments/      # Experimental scripts
├── prompts/
│   ├── concepts.json     # All 60 concepts as data
│   ├── template.js       # Prompt templates
│   └── _archived/        # Original markdown prompts
├── docs/
│   ├── SESSION-MASTER-2026-02-02.md  # Authoritative session state
│   ├── KNOWLEDGE_BASE.md
│   └── _archived/        # Historical only
└── assets/               # Reference images
```

## Quick Start

1. Session state: `docs/SESSION-MASTER-2026-02-02.md`
2. Prompt system: `scripts/lib/prompt-builder.js` + `prompts/concepts.json`
3. Physics engine: `scripts/lib/physics-engine.js`

## Token Optimization

- Session context: ~47K tokens (optimized from 80K)
- Prompts: Template system (reduced 80%)
- See: `TOKEN-OPTIMIZATION-AGENT-REPORT-2026-02-03.md`
```

---

## Phase 7: Final Verification

### Task 7.1: Verify Token Reduction

**Step 1: Count remaining files**
```bash
cd projects/imagen-experiments
echo "=== Documentation ===" && find docs -name "*.md" | wc -l
echo "=== Archived Docs ===" && find docs/_archived -name "*.md" 2>/dev/null | wc -l
echo "=== Scripts ===" && find scripts -name "*.js" | wc -l
echo "=== Prompts ===" && find prompts -name "*.json" -o -name "*.js" | wc -l
```

### Task 7.2: Commit Changes

**Step 1: Stage and commit**
```bash
git add -A
git commit -m "refactor: Token optimization - 41% session reduction

- Delete redundant optimization reports (6K tokens)
- Remove archived session snapshots (25K tokens)
- Clean orphaned compressed files (35K tokens)
- Create prompt template system (125K tokens saved)
- Reorganize scripts into categorized folders
- Update CLAUDE.md with new structure

Total savings: ~191K tokens per session
Session context: 80K → 47K tokens (41% reduction)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| Phase | Action | Token Savings |
|-------|--------|---------------|
| 1 | Delete redundant reports | 6K |
| 2 | Delete session snapshots | 25K |
| 3 | Delete orphaned files | 35K |
| 4 | Prompt template system | 125K |
| 5 | Reorganize scripts | Organization |
| 6 | Update CLAUDE.md | Clarity |
| **Total** | | **191K tokens** |
