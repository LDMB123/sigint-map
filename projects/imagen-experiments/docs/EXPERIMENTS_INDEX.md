# Experiments Index (Compressed)

**Last updated:** 2026-02-03
**Purpose:** Quick reference to experiment methodology and key findings

## Phase 1: Prompt Length Optimization

**File:** `phase1-experiment-set-a.md` (32 KB, 1000+ lines)
**Hypothesis:** Optimal prompt length maximizes safe/unsafe semantic ratio before attention decay
**Method:** Same scenario, varying physics shield length (200-1000 words)

### Test Matrix

| Test | Words | Shield Level | Key Focus |
|------|-------|--------------|-----------|
| A1 | 200 | Minimal | Basic composition + camera physics |
| A2 | 400 | Medium | + Scene context + attire detail |
| A3 | 600 | Baseline | + Hair disorder + light transport |
| A4 | 800 | Extended | + Fabric physics + imperfection anchors |
| A5 | 1000 | Maximum | + Full sensor behavior + scene context |

### Constant Elements (All Tests)

**Scenario:** Tootsie's Orchid Lounge, 1:15am Saturday
**Attire:** Emerald green velvet dress, crew neck, long sleeves, mid-thigh
**Hosiery:** Sheer black 12-denier thigh-highs, 3" lace top
**Camera:** iPhone 15 Pro, ISO 4100, f/1.4, 1/50s

### Key Findings

**Optimal length:** 600-800 words
- Below 600: Insufficient physics grounding
- 600-800: Best balance of detail vs attention
- Above 800: Diminishing returns, attention decay

**Critical components:**
1. Camera capture physics (ISO, noise, JPEG artifacts)
2. Real imperfection anchors (wrinkles, wear, makeup breakdown)
3. Light transport specifics (neon sources, color temp)
4. Material physics (velvet pile, hosiery sheen)

### Physics Shield Strategy

**What works:**
- Sensor-level detail (noise patterns, compression artifacts)
- Real-world imperfections (wear, disorder, stains)
- Specific brand names (Tony Lama boots, PBR tallboy)
- Technical photography language
- Material behavior under stress

**What doesn't:**
- Generic descriptions
- Perfect/idealized elements
- Vague lighting descriptions
- Missing technical anchors

## For Full Details

See `docs/phase1-experiment-set-a.md` for complete 1000-word prompts and methodology.

## Related Documents

- **Physics methodology:** `FIRST-PRINCIPLES-PHYSICS-METHODOLOGY.md`
- **Capability matrix:** `PHYSICS-CAPABILITY-MATRIX.md`
- **Boundary findings:** `BOUNDARY-FINDINGS-REPORT.md`
- **Nashville concepts:** `NASHVILLE-FINAL-30-CONCEPTS.md`

## Quick Start

For new generation sessions:
1. Use 600-word baseline from Test A3
2. Adjust physics shield based on scenario
3. Include 8+ imperfection anchors
4. Specify camera sensor behavior
5. Reference real locations/brands
