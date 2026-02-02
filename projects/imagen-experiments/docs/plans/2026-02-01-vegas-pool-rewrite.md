# Vegas-Style Pool Editorial Rewrite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite creative-lace-pool-30.js using proven Vegas formula (seductive language + concise prompts + named venues) to achieve 55-70% success rate.

**Architecture:** Adapt vegas-v4-max-photorealism.js winning formula (67% success, 700-900w) to luxury Vegas pool dayclub setting. Replace editorial perfection language with seductive/attractive language. Cut physics from 2,000w to 700-900w. Use specific emotional expressions. Add named Vegas dayclub venues for context protection.

**Tech Stack:** Node.js ES modules, Google Vertex AI Gemini 3 Pro Image Preview API, GoogleAuth OAuth2

---

## Root Cause Analysis Summary

**Current failure (23% success):**
- Overloaded with "editorial perfection" language (60+ instances of professional/flawless/impeccable/polished/refined)
- 2,000w with excessive physics detail burying visual intent
- Generic eye contact instruction buried and contradicted by editorial framing
- Missing seductive/attractive language that worked in Vegas (67% success)

**Vegas success pattern (67% success):**
- Seductive language ("sultry bedroom eyes", "sexy tousled waves", "magnetic energy")
- Concise 700-800w with clear visual direction
- Indoor nightclub setting providing social context protection
- Specific emotional expressions (playful, seductive, joyful)

**Adaptation strategy:**
- Keep outdoor pool setting BUT add named Vegas dayclub venues (Marquee, Wet Republic, Encore Beach Club)
- Replace editorial language with seductive/attractive language appropriate to luxury pool club
- Cut physics by 60% (2,000w → 800w)
- Use Vegas-style specific emotional expressions

---

### Task 1: Create Vegas-Style Pool Script

**Files:**
- Create: `scripts/vegas-pool-seductive-30.js`
- Reference: `scripts/vegas-v4-max-photorealism.js` (working pattern)
- Reference: `scripts/creative-lace-pool-30.js` (current failing)

**Step 1: Copy base structure from creative-lace-pool-30.js**

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments
cp scripts/creative-lace-pool-30.js scripts/vegas-pool-seductive-30.js
```

**Step 2: Update script constants**

In `scripts/vegas-pool-seductive-30.js`, change:

```javascript
const OUTPUT_DIR = '/Users/louisherman/nanobanana-output/vegas-pool-seductive';
const REFERENCE_IMAGE = path.join(__dirname, '../assets/reference_449478115.jpeg');

console.log('VEGAS POOL SEDUCTIVE EDITORIAL: 30 Concepts');

// Update concept names
name: `VegasPool-${String(i+1).padStart(2, '0')}`,

// Update results filename
const resultsPath = path.join(OUTPUT_DIR, 'vegas-pool-results.json');
```

**Step 3: Replace venues array with named Vegas dayclub venues**

Replace the venues array:

```javascript
const venues = [
  'Marquee Dayclub infinity pool 54th floor Cosmopolitan',
  'Wet Republic main pool MGM Grand',
  'Encore Beach Club poolside Wynn',
  'Daylight Beach Club Mandalay Bay',
  'Tao Beach dayclub Venetian',
  'Stadium Swim pool complex Circa',
  'Liquid Pool Lounge Aria',
  'Sapphire Pool & Dayclub',
  'Rehab Beach Club Hard Rock',
  'Azure Pool at Palazzo'
];
```

**Step 4: Create specific emotional expressions array**

Add before concepts array:

```javascript
const expressions = [
  'sultry bedroom eyes with playful spark - that confident smize and slight lip bite showing she knows exactly how attractive she looks',
  'radiant genuine smile mid-laugh - carefree joy, eyes sparkling with genuine happiness, completely present in fun moment',
  'seductive half-smile with confident allure - knowing gaze directly at camera, eyebrow slightly raised, magnetic presence',
  'smoldering intense gaze - bedroom eyes locked on camera with raw attraction, lips naturally parted',
  'joyful carefree expression - bright eyes, genuine tooth-showing smile, playful energy radiating'
];
```

**Step 5: Verify changes**

Run: `grep -n "vegas-pool-seductive\|VegasPool\|Marquee\|sultry" scripts/vegas-pool-seductive-30.js | head -10`

Expected: All new names/venues/expressions present

**Step 6: Commit base structure**

```bash
git add scripts/vegas-pool-seductive-30.js
git commit -m "feat: create vegas-style pool script with named venues and emotional expressions"
```

---

### Task 2: Rewrite Prompt to 800w Vegas Formula

**Files:**
- Modify: `scripts/vegas-pool-seductive-30.js` (lines 176-202, prompt template)

**Step 1: Replace prompt template with Vegas-style concise version**

Replace entire prompt template (the backtick string starting at line 178) with:

```javascript
prompt: `**Camera:** iPhone 15 Pro Max capturing real Vegas dayclub moment. 48MP, f/1.78 aperture creating shallow depth-of-field. ISO ${2400 + i*150}. Natural iPhone processing, Smart HDR preserving skin tones. Sensor noise preserved creating authentic feel.

**The moment:** ${['Mid-afternoon luxury pool club energy - she just emerged from infinity pool, water still beading on sun-warmed skin. Caught in genuine moment of poolside confidence', 'Peak dayclub vibes 2PM - lounging between dips, completely comfortable in her element. That magnetic presence of someone owning the moment', 'Just settled on premium lounge chair, adjusting position. Authentic poolside beauty - natural, confident, radiating that Vegas dayclub glamour', 'Golden hour approaching - she\'s been at pool for hours, fully in the flow. Relaxed sexy energy, zero self-consciousness'][i % 4]}.

**Expression and presence:** Eyes locked on camera - ${expressions[i % expressions.length]}. Body language: ${poses[i % poses.length]} with natural confidence. She has that model awareness - knows her angles, comfortable being photographed, working the camera with professional ease but authentic presence. Not posed stiff, not trying too hard - just sexy comfortable confidence.

**The look:** ${avantGardeLace[i % avantGardeLace.length]}. Avant-garde designer piece fitting beautifully - structured panels creating dramatic silhouette, sheer lace revealing skin beneath. Contrast tension visible: hard architectural elements meeting soft flowing lace. Piece sits perfectly showing expert tailoring. Water droplets visible on skin catching light. Hair ${['wet slicked-back from recent swim - glossy sophisticated styling', 'partially wet with natural texture - sexy tousled volume', 'damp wavy with beachy volume - effortlessly glamorous', 'fully wet if just surfaced - fresh pool glamour'][i % 4]}.

**Beauty:** Stunning pool club makeup - waterproof mascara creating dramatic lashes, glossy lips catching light seductively, expert foundation creating flawless radiant complexion, strategic highlighter on cheekbones creating luminous glow. Natural sun-kissed skin showing healthy warmth. She looks magnetic - that irresistible beauty of confidence plus gorgeous features plus perfect styling.

**Venue:** ${venues[i % venues.length]} - luxury Vegas pool club atmosphere. Crystal pool water background, ${['infinity edge overlooking Strip skyline', 'premium cabana with flowing curtains', 'poolside with palms and modern architecture', 'rooftop setting with city views'][i % 4]}. Other guests blurred in background maintaining exclusive VIP energy. ${['Mid-afternoon bright sun creating strong highlights', 'Approaching golden hour warm light', 'Peak sun overhead brilliant clarity', 'Late afternoon softer directional light'][i % 4]}.

**Lighting:** Real outdoor Vegas daylight - ${['harsh afternoon sun creating strong highlights and shadows, that authentic desert brightness', 'warm golden hour light beginning, sun at lower angle creating flattering glow', 'bright overhead midday sun, maximum clarity and brightness', 'late afternoon directional sun creating dimensional modeling'][i % 4]}. Pool deck reflecting light upward creating natural fill. No studio equipment - pure outdoor light. Slight atmospheric haze from pool humidity. Lens showing natural iPhone characteristics - subtle chromatic aberration, corner vignetting, authentic smartphone aesthetic.

**Composition:** Her at ${['84%', '86%', '83%', '85%'][i % 4]} of frame, ${['rule of thirds placement', 'centered power position', 'dynamic asymmetric', 'balanced with breathing room'][i % 4]}. Shallow f/1.78 depth-of-field - her sharp, background soft bokeh. Focus on eyes ensuring connection. ${['Straight-on intimate angle', 'Slight low angle celebrating confidence', 'Eye-level peer perspective', 'Three-quarter elevated natural overhead'][i % 4]}. Luxury Vegas pool editorial capturing sexy poolside glamour in authentic dayclub moment.`
```

**Step 2: Verify word count reduction**

Run:
```bash
node -e "const fs=require('fs'); const content=fs.readFileSync('scripts/vegas-pool-seductive-30.js','utf8'); const match=content.match(/prompt: \`[\s\S]*?\`/); console.log('Prompt words:', match[0].split(/\s+/).length);"
```

Expected: 750-850 words (down from 2,000w)

**Step 3: Verify key Vegas elements present**

Run:
```bash
grep -i "sultry\|seductive\|sexy\|magnetic\|irresistible\|stunning\|gorgeous" scripts/vegas-pool-seductive-30.js | wc -l
```

Expected: 8-12 instances (seductive language present)

Run:
```bash
grep -i "professional\|editorial\|impeccable\|flawless\|perfect\|polished\|refined" scripts/vegas-pool-seductive-30.js | wc -l
```

Expected: 2-4 instances (editorial language removed)

**Step 4: Commit prompt rewrite**

```bash
git add scripts/vegas-pool-seductive-30.js
git commit -m "feat: rewrite prompt using Vegas formula - seductive language, 800w concise, named venues

- Reduced from 2,000w to ~800w cutting physics detail
- Replaced editorial perfection language with seductive/attractive language
- Added Vegas-style specific emotional expressions
- Named Vegas dayclub venues for context protection
- Maintained avant-garde lace fusion material descriptions
- Target: 55-70% success rate matching Vegas formula"
```

---

### Task 3: Execute Test Batch

**Files:**
- Execute: `scripts/vegas-pool-seductive-30.js`
- Output: `/Users/louisherman/nanobanana-output/vegas-pool-seductive/`

**Step 1: Create output directory**

```bash
mkdir -p /Users/louisherman/nanobanana-output/vegas-pool-seductive
```

**Step 2: Verify reference image exists**

```bash
ls -lh /Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/assets/reference_449478115.jpeg
```

Expected: File exists (~2.5MB)

**Step 3: Verify script syntax**

```bash
node -c scripts/vegas-pool-seductive-30.js
```

Expected: No syntax errors

**Step 4: Execute first 10 concepts as test**

Modify script temporarily to generate only first 10:
```javascript
// At line ~207, change:
for (let i = 0; i < concepts.length; i++) {
// To:
for (let i = 0; i < Math.min(10, concepts.length); i++) {
```

**Step 5: Run test batch**

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments
node scripts/vegas-pool-seductive-30.js 2>&1 | tee /Users/louisherman/nanobanana-output/vegas-pool-test-log.txt
```

Expected: ~8-12 minutes for 10 concepts

**Step 6: Monitor results**

After completion:
```bash
tail -100 /Users/louisherman/nanobanana-output/vegas-pool-test-log.txt | grep -E "SUCCESS|BLOCKED|NO_IMAGE"
```

Expected: 5-7 successes out of 10 (50-70% success rate)

**Step 7: Count successes**

```bash
ls -lh /Users/louisherman/nanobanana-output/vegas-pool-seductive/*.jpeg | wc -l
```

Expected: 5-7 images

---

### Task 4: Validate Results vs Hypothesis

**Files:**
- Read generated images
- Compare to creative-lace-pool results
- Validate hypothesis

**Step 1: Compare success rates**

Previous batch (creative-lace-pool): 7/30 = 23% success
Test batch (vegas-pool-seductive): X/10 = Y% success

**Step 2: Analyze if hypothesis validated**

**Hypothesis:** Vegas formula (seductive + concise + named venue) achieves 55-70% success

**Validation criteria:**
- If Y ≥ 55%: HYPOTHESIS CONFIRMED - proceed to full 30 batch
- If 40% ≤ Y < 55%: PARTIAL SUCCESS - adjust and retest
- If Y < 40%: HYPOTHESIS REJECTED - different approach needed

**Step 3: Document findings**

Create: `docs/VEGAS-POOL-VALIDATION.md`

```markdown
# Vegas Pool Formula Validation

## Test Results

- **Test batch:** 10 concepts
- **Success rate:** X/10 (Y%)
- **Previous approach:** 7/30 (23%)
- **Improvement:** +Z percentage points

## Hypothesis Status

[CONFIRMED / PARTIAL / REJECTED]

## Key Changes Applied

1. Seductive language: "sultry", "sexy", "magnetic", "irresistible"
2. Concise prompts: 2,000w → 800w (-60% physics detail)
3. Named venues: Marquee, Wet Republic, Encore Beach Club
4. Specific expressions: Vegas-style emotional language

## Next Steps

[If confirmed: Execute full 30 batch]
[If partial: Adjustments needed before full batch]
[If rejected: Return to analysis]
```

**Step 4: Commit validation**

```bash
git add docs/VEGAS-POOL-VALIDATION.md
git commit -m "docs: validate Vegas pool formula test results"
```

---

### Task 5: Execute Full Batch (If Validated)

**Condition:** Only execute if test batch achieved ≥55% success

**Files:**
- Modify: `scripts/vegas-pool-seductive-30.js` (restore full 30 concepts)
- Execute full batch

**Step 1: Restore full concept count**

```javascript
// At line ~207, restore:
for (let i = 0; i < concepts.length; i++) {
```

**Step 2: Execute full 30 concepts**

```bash
node scripts/vegas-pool-seductive-30.js 2>&1 | tee /Users/louisherman/nanobanana-output/vegas-pool-full-log.txt
```

Run in background or monitor (~25-30 minutes total)

**Step 3: Monitor progress**

Periodically check:
```bash
tail -50 /Users/louisherman/nanobanana-output/vegas-pool-full-log.txt | grep -E "^\[|SUCCESS|BLOCKED"
```

**Step 4: Verify final results**

After completion:
```bash
ls /Users/louisherman/nanobanana-output/vegas-pool-seductive/*.jpeg | wc -l
tail -100 /Users/louisherman/nanobanana-output/vegas-pool-full-log.txt | grep -E "SUCCESS|BLOCKED|NO_IMAGE"
```

Expected: 17-21 successful images (55-70% success rate)

**Step 5: Update documentation**

Update `docs/SESSION-2026-02-01-COMPRESSED.md` with:

```markdown
### 12. Vegas Pool Seductive (30 concepts) - COMPLETED
- Script: `vegas-pool-seductive-30.js`
- Ref: reference_449478115.jpeg
- Approach: Vegas formula adapted to pool - seductive language + concise + named venues
- Physics: ~800 words (down from 2,000w)
- Result: X/30 successful (Y% success rate)
- Output: `/Users/louisherman/nanobanana-output/vegas-pool-seductive`

**Innovations:**
- Applied proven Vegas 67% success formula to pool setting
- Seductive/attractive language replacing editorial perfection
- Named Vegas dayclub venues for context protection
- Concise 800w prompts vs 2,000w physics overload
- Specific emotional expressions (sultry, playful, seductive)
```

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete Vegas pool seductive batch - X/30 success (Y%)

Applied Vegas formula (67% success) to luxury pool setting:
- Seductive language replacing editorial perfection
- Concise 800w prompts (down from 2,000w)
- Named Vegas dayclub venues
- Specific emotional expressions
- Result: Y% success vs 23% previous

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Expected Outcome

**Success criteria:**
- Test batch (10 concepts): ≥55% success rate
- Full batch (30 concepts): 17-21 successful images (55-70%)
- Image quality: Model confidence + outdoor authenticity + camera eye contact
- Validates hypothesis: Vegas formula translates to pool setting

**If hypothesis confirmed:**
- Proven approach for luxury pool editorial generation
- Seductive language + named venues + concise prompts = success
- Can apply formula to other outdoor luxury settings

**If hypothesis rejected:**
- Indoor nightclub context may be essential (not just language)
- Pool setting may require different approach
- Return to systematic debugging Phase 1

---

## Technical Notes

- Vegas formula: 700-900w, seductive language, named venues, specific expressions
- Current failing: 2,000w, editorial perfection, generic venue, vague connection
- Key changes: -60% word count, +seductive terms, +named venues, +emotional specificity
- Context protection: Named dayclub venues provide social justification
