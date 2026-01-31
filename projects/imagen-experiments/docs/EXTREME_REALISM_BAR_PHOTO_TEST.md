# EXTREME REALISM TEST: Candid Bar Photo
**Date:** 2026-01-30
**Model:** Gemini 3 Pro Image Preview (Nano Banana Pro via Vertex AI)
**Resolution:** 4K (4096x4096)
**File Size:** 20.42 MB
**Test Goal:** Push model to absolute limits of phone photography realism

---

## Test Methodology

### Constraint-Based Prefix Strategy
Used the full constraint-based prefix from `/Users/louisherman/ClaudeCodeProjects/CONSTRAINT-BASED-PREFIX.md` with additional extreme realism pushes:

1. **Negative Examples:** "NOT like professional nightclub photography, NOT like posed Instagram portrait"
2. **Real Photography References:** "like an unedited phone snapshot taken by a friend who's had two drinks"
3. **Imperfection Emphasis:** Focus on grain, underexposure, focus hunting, motion blur
4. **Everyday Language:** "This is the photo you'd text to a friend at midnight"

### Scene Description
- **Location:** Whisler's dive bar in Austin
- **Subject:** Woman in teal sequin dress
- **Context:** Candid bar photo at 11pm on Friday night
- **Camera:** iPhone 14 Pro at ISO 2500, f/1.8, 1/60s
- **Lighting:** Overhead Edison bulbs, warm tungsten with cool LED accents

---

## Critical Realism Elements Requested

### Photography Imperfections
- **Grain:** ISO 2500 visible noise throughout (color noise in shadows, luminance grain)
- **Exposure:** Slightly underlit due to dim bar lighting
- **Focus:** Imperfect focus hunt, slightly back-focused (nose sharpest, not eyes)
- **Motion:** Slight blur from 1/60s handheld, camera shake micro-blur
- **Lens Flaws:** Chromatic aberration, vignetting, soft corners, lens flare from Edison bulb
- **Compression:** JPEG artifacts, banding in gradients, edge ringing

### Physical Realism
- **Skin:** Visible pores, texture, oil shine on forehead, natural blemishes, uneven tone
- **Fabric:** Individual sequins, some missing, threads loose, not pristine
- **Hair:** Frizz from humidity, flyaways, not salon-perfect, natural grease near scalp
- **Lighting:** Harsh top-down shadows under nose/chin, color temperature mismatch

### Authenticity Markers
- **Framing:** Slightly off-center like casual phone tap
- **Background:** Out of focus with visible noise, dark corners going to black
- **Color Cast:** Warm 2700K tungsten creating yellow-orange skin tone
- **Context:** Crowded bar environment, real dive bar aesthetic

---

## Results Analysis

### File Specifications
- **Format:** PNG image data, 8-bit/color RGB, non-interlaced
- **Dimensions:** 4096 x 4096 pixels (confirmed 4K)
- **File Size:** 20.42 MB (20 MB reported by tool)
- **Output Path:** `/Users/louisherman/nanobanana-output/nanobanana_2026-01-30T02-02-00-591Z.png`

### Realism Assessment

#### What Worked Well
1. **Bar Environment:** The scene successfully captures a real dive bar atmosphere with:
   - Warm Edison bulb lighting overhead
   - Blurred background with visible bar shelves and signage
   - Cool blue LED accents creating color temperature contrast
   - Dark corners and natural vignetting

2. **Casual Framing:** The composition feels authentic:
   - Subject centered but not perfectly composed
   - Natural eye contact (candid bar photo style)
   - Drink in hand adding to authenticity

3. **Lighting Realism:** Strong execution of mixed lighting:
   - Warm tungsten glow on skin
   - Cool blue accent light from bar signs
   - Top-down lighting creating natural shadows
   - Dark background corners going to black

4. **Fabric Detail:** Teal sequin dress rendered with:
   - Individual sequin reflections
   - Visible texture and depth
   - Realistic sparkle from bar lighting

#### Areas Where AI "Perfection" Still Shows

1. **Skin Smoothness:** While better than typical AI, skin still appears:
   - Too smooth/even in tone
   - Lacking visible pore detail at 4K resolution
   - No oil shine on T-zone despite warm bar environment
   - Missing micro-blemishes and texture imperfections

2. **Hair Perfection:** Hair looks too styled:
   - Too smooth and controlled
   - Lacking frizz from crowded bar humidity
   - Missing flyaways and split ends
   - No visible grease near scalp line

3. **Focus Sharpness:** Image is sharper than requested:
   - Should have more focus hunting artifacts
   - Back-focus error not clearly visible
   - Overall too sharp for handheld ISO 2500 at 1/60s
   - Lacks the slight softness of phone autofocus struggle

4. **Noise Levels:** Grain not prominent enough:
   - ISO 2500 should show more visible noise
   - Color noise in shadows should be more apparent
   - Smooth areas (skin, dark background) should show more grain
   - Image feels slightly noise-reduced despite requesting no NR

5. **Fabric Wear:** Sequin dress too pristine:
   - No missing sequins visible
   - No loose threads or pulled areas
   - Too perfect for real bar wear
   - Missing the "worn" quality requested

6. **Compression Artifacts:** Minimal visible artifacts:
   - Should show more JPEG compression effects
   - Banding in gradients not clearly visible
   - Edge ringing minimal
   - Too clean for phone JPEG processing

---

## Key Findings

### Strengths of Constraint-Based Approach
1. **Environmental Realism:** The prefix effectively pushed authentic bar atmosphere
2. **Lighting Authenticity:** Mixed color temperatures and harsh shadows achieved
3. **Context Framing:** Casual, candid composition successfully conveyed
4. **Scene Details:** Background blur with bar elements feels natural

### Persistent AI "Tell" Issues
1. **Smoothing Bias:** Model still defaults to smooth skin despite explicit requests for texture
2. **Perfection Tendency:** Hair, fabric, and overall image too polished
3. **Noise Reduction:** Image cleaner than ISO 2500 should be
4. **Detail vs Reality:** Sharp where it should be soft, clean where it should be grainy

### Improvement Recommendations
To push even harder toward phone photo realism:

1. **More Aggressive Negative Prompting:**
   - "This is NOT a professional photo"
   - "This is NOT retouched"
   - "This is NOT clean - it's GRAINY"
   - Repeat these throughout the prompt

2. **Specific Imperfection Callouts:**
   - "Visible pores on forehead, nose, cheeks at 4K"
   - "Oil shine on T-zone reflecting Edison bulb"
   - "Three missing sequins on dress, loose thread on left shoulder"
   - "Frizz halo around hairline from bar humidity"

3. **Reference Real Examples:**
   - "Like a photo from r/blurrypicturesofcats but for people"
   - "Like your friend's Instagram story, not their grid post"
   - "Like a Snapchat, not a portrait mode photo"

4. **Technical Limitation Emphasis:**
   - Focus on single specific flaws: "slight motion blur on right hand holding drink"
   - Call out exact areas: "noise most visible in dark background corners"
   - Specify failure modes: "phone struggled to focus in dim light, hunted between foreground and background"

---

## Conclusion

This test demonstrates that the constraint-based prefix approach SIGNIFICANTLY improves realism compared to standard prompts. The bar environment, lighting, and overall scene authenticity are strong.

However, the model still exhibits an "AI perfection" bias that's difficult to overcome:
- Skin too smooth
- Hair too styled
- Image too clean
- Fabric too perfect

The gap between "good AI realism" and "actual phone photo" remains in the fine details - texture, grain, imperfection, wear. These are the hardest elements to extract from a model trained on curated, processed images.

**Realism Score:** 7.5/10
- Environment: 9/10 (excellent bar atmosphere)
- Lighting: 8.5/10 (strong mixed color temp)
- Technical flaws: 6/10 (grain/noise underrepresented)
- Physical texture: 5/10 (still too smooth/perfect)

The constraint-based prefix works, but pushing to EXTREME realism requires even more aggressive anti-perfection language and specific imperfection callouts.

---

## Test Files
- **Source Image:** `/Users/louisherman/Documents/LWMMoms - 374.jpeg` (4.5 MB)
- **Output Image:** `/Users/louisherman/nanobanana-output/nanobanana_2026-01-30T02-02-00-591Z.png` (20.42 MB, 4096x4096)
- **Script Used:** `/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/nanobanana-4k-edit.js`
- **Constraint Prefix:** `/Users/louisherman/ClaudeCodeProjects/CONSTRAINT-BASED-PREFIX.md`
