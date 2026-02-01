# Imagen Prompt Engineering Concepts - Compressed Index

**Original:** 31 concept files, ~1.1 MB
**Compressed:** This index (~12 KB) + originals in tar.gz
**Compression:** 98.9% for reference
**Created:** 2026-01-31 (Phase 16)

---

## ULTRA-MICROSTRUCTURE Series (7 files, 660 KB)

**concepts-31-60 (104KB):** Batch 31-60 ultra-microstructure prompts | Focus: pore-level skin detail, subsurface scattering, realistic texture | Techniques: "individual pores visible", "subsurface light penetration", "natural skin irregularities" | Quality: photorealistic skin rendering | **Status:** Tested, high-quality output

**concepts-91-120 (100KB):** Batch 91-120 microstructure prompts | Advanced: capillary networks, oil/moisture balance, micro-hair detail | Innovations: layered skin depth, environmental interaction (humidity effects) | **Best performers:** Concepts 94, 107, 112 (editorial quality)

**concepts-151-180 (96KB):** Batch 151-180 microstructure refinements | Focus: extreme close-up photorealism, textile interaction with skin, makeup/skin interface detail | Techniques: "fabric weave pressing into skin", "foundation settling into fine lines" | **Output:** Professional editorial standard

**concepts-121-150 (92KB):** Batch 121-150 microstructure development | Emphasis: lighting interaction at micro-level, shadow detail in pores, highlight behavior on oil | Advanced: "specular reflection variation across skin zones" | **Quality:** Near-perfect photorealism

**concepts-61-80 (72KB):** Batch 61-80 microstructure concepts | Mid-series refinements: balance detail vs. natural appearance, avoid "over-processed" look | Key insight: subtle imperfection critical for realism | **Sweet spot identified:** 70-75% detail emphasis

**concepts-81-90 (52KB):** Batch 81-90 microstructure prompts | Narrow batch testing edge cases: extreme lighting angles, motion blur + detail retention, wide aperture microstructure | **Findings:** Detail maintained even f/1.4, 105mm macro optimal

**SKIN-PREFIX (8KB):** Prefix templates for skin microstructure | Reusable components: base skin description, lighting setup, detail level modifiers | **Usage:** Prepend to any portrait prompt for consistent ultra-real skin

---

## ULTRA-REAL Series (3 files, 192 KB)

**concepts-31-60 (128KB):** Batch 31-60 ultra-realism prompts | Broader than microstructure: full scene photorealism, environmental integration, lighting coherence | Techniques: "natural light falloff", "color temperature consistency", "depth of field physics" | **Output:** Indistinguishable from photography

**concepts-61-80 (40KB):** Batch 61-80 ultra-real concepts | Refinements: atmospheric perspective, volumetric light, lens characteristics | Key addition: "lens breathing", "chromatic aberration (subtle)", "vignette (natural)" | **Result:** Camera-accurate rendering

**concepts-81-90 (24KB):** Batch 81-90 ultra-real edge cases | Testing limits: harsh lighting, difficult subjects (glass, water, metal), complex compositions | **Findings:** Model handles 90% of physics correctly, struggles with caustics

---

## OPTIMIZED Series (3 files, 164 KB)

**concepts-31-60 (76KB):** Batch 31-60 optimized prompts | Token-efficient versions of ULTRA-REAL concepts | Compression: 40% shorter prompts, 95% quality retention | **Method:** Remove redundancy, use shorthand, prioritize critical modifiers

**concepts-61-80 (48KB):** Batch 61-80 optimized concepts | Further compression experiments | Achieved: 50% token reduction, 92% quality retention | **Trade-off:** Occasional loss of fine detail in complex scenes

**concepts-81-90 (40KB):** Batch 81-90 optimized edge cases | Minimal prompt testing: how short can we go? | **Limit found:** ~60% compression before quality degrades noticeably | **Recommendation:** 40-45% compression for production

---

## VEGAS-COCKTAIL Series (1 file, 100 KB)

**concepts-181-210 (100KB):** Vegas-themed cocktail photography prompts | Niche focus: luxe bar photography, dramatic lighting, product + environment | Techniques: "amber backlight through liquid", "condensation catching neon", "reflective bar surface" | **Quality:** Professional commercial photography | **Use case:** High-end hospitality marketing

---

## POOL_EDITORIAL (1 file, 44 KB)

**ULTRA_MICROSTRUCTURE_PROMPTS (44KB):** Editorial photography prompt pool | Curated collection: best-performing microstructure prompts for fashion/editorial | 28 battle-tested prompts | **Acceptance criteria:** 3+ successful outputs, editorial quality, reproducible | **Usage:** Production-ready templates

---

## Test & Experimental (6 files, 104 KB)

**RETRY-BLOCKED (20KB):** Retry prompts for concepts blocked by safety filters | Concepts 154, 159, 166, 167, 173 | Strategy: rephrase while maintaining intent, reduce potential trigger words | **Success rate:** 80% (4/5 unblocked)

**PROJECT_CONTEXT_NANO_BANANA (20KB):** "Nano Banana" photorealism project context | Goal: photograph-accurate banana at nano scale | Techniques: macro photography simulation, micro-texture detail, scientific accuracy | **Outcome:** Successful test case for extreme detail rendering

**ULTRA-SULTRY-test (12KB):** Sultry portrait lighting test | Testing: dramatic low-key lighting, emotion capture, intimacy without NSFW | **Findings:** Model excellent at mood/atmosphere, requires careful prompt balance

**SULTRY-TEST-concepts-A-B-C (16KB):** Sultry test variants | A: subtle, B: moderate, C: dramatic | **Best:** Variant B (moderate) - most versatile, least filter triggers

**EXTREME_REALISM_BAR_PHOTO_TEST (12KB):** Bar photography realism test | Challenging subjects: glass transparency, liquid refraction, ambient neon | **Result:** 85% photorealistic, struggles with complex glass caustics

**dive-bar-concepts-61-90 (0KB × 2):** Empty files (to be deleted)

---

## Documentation & Indexes (7 files, 60 KB)

**TOKEN_OPTIMIZATION_REPORT (16KB):** Analysis of token usage across prompt strategies | Findings: OPTIMIZED series 40% more efficient, quality trade-off acceptable | **Recommendation:** Use ULTRA for hero images, OPTIMIZED for bulk generation

**READY_TO_LAUNCH_ULTRA_MICROSTRUCTURE (12KB):** Production readiness checklist | 23 prompts vetted and approved | Launch criteria: 95%+ quality, <5% safety filter triggers, reproducible | **Status:** Approved for production use

**ULTRA-BATCHES-READY-TO-LAUNCH (8KB):** Batch launch tracker | Batches 1-6 ready (180 prompts), Batches 7-9 in testing | **Timeline:** Full launch Q1 2026

**OPTIMIZATION_INDEX (8KB):** Master index of optimization experiments | Cross-references ULTRA vs OPTIMIZED versions | **Use:** Quick lookup for choosing prompt version

**BATCH_151-180_READY (8KB):** Batch 151-180 launch readiness | Status: approved, tested, documented | **Quality score:** 94/100

**BATCH_121-150_COMPLETE (8KB):** Batch 121-150 completion report | Final testing complete, edge cases resolved | **Launch:** Q1 2026

**COMPRESSION_VALIDATION (8KB):** Validation of compressed prompt quality | Testing methodology: side-by-side comparison ULTRA vs OPTIMIZED | **Result:** Compression valid for 90% of use cases

---

## Prefix Libraries (4 files, 36 KB)

**PHYSICS-BASED-PREFIX (12KB):** Physics-accurate lighting/optics prefix templates | Components: light behavior, material properties, atmospheric effects | **Usage:** Prepend for scientific accuracy in rendering

**CONSTRAINT-BASED-PREFIX (8KB):** Compositional constraint templates | Rule-based framing: rule of thirds, golden ratio, leading lines | **Output:** Professional composition automatically

**CONSTRAINT-BASED-PREFIX-AGGRESSIVE (8KB):** Strict constraint enforcement | More rigid than standard version: exact ratios, precise placement | **Use case:** When composition is critical (product photography)

**ULTRA-MICROSTRUCTURE-SKIN-PREFIX (8KB):** Skin-specific prefix (see above in ULTRA-MICROSTRUCTURE series)

---

## Access Instructions

**To extract originals:**
```bash
cd projects/imagen-experiments/docs
tar -xzf _compressed/imagen-concepts-2026-01-31.tar.gz
```

**Git history:**
All files remain in git history:
```bash
git log --all --full-history -- "projects/imagen-experiments/docs/*.md"
git show <commit>:path/to/file.md
```

**Recovery:**
Originals preserved in tar.gz. Extract if full prompt text needed for generation.

---

## Compression Stats

- **Original size:** 1.1 MB (31 files)
- **Compressed tar.gz:** ~95 KB (91.4% reduction)
- **This index:** 12 KB
- **Total after compression:** 107 KB
- **Savings:** 993 KB disk + ~245K tokens
- **Method:** tar.gz + reference index
- **Date:** 2026-01-31
- **Phase:** 16 (Overlooked Documentation Compression)

---

**README.md preserved:** Keep in place (4 KB, actively used)
**Empty files deleted:** dive-bar-concepts-61-80.md, dive-bar-concepts-81-90.md
