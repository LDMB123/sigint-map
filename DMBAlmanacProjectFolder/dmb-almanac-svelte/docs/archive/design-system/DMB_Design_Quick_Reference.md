# DMB Design System - Quick Reference Guide
## For DMB Almanac PWA Redesign

---

## ONE-PAGE DESIGN PALETTE

### Colors at a Glance
```
PRIMARY TEXT:    #000000 (Black)
SECONDARY TEXT:  #2d2d2d (Dark Gray)
BACKGROUND:      #faf8f3 (Cream)
ACCENT BG:       #f5f1e8 (Beige)

CTA BUTTON:      #d97706 (Orange) ← THE BRAND ORANGE
CTA HOVER:       #c9600f (Dark Orange)

SECONDARY BTN:   #27633f (Forest Green)
TERTIARY BTN:    #1e3a5f (Deep Blue)
MUTED TEXT:      #8b8680 (Warm Gray)
```

**Visual Context:** Earth tones evoke vinyl records and concert programs. Orange is the ONLY bold action color—everything else is muted, sophisticated, authentic.

---

## FONTS (The Trinity)

### Headlines: DS Moster
- **Weight:** Regular
- **Sizes:** 32px–64px
- **Character:** Bold, distinctive, memorable
- **Feel:** Vintage concert posters
- **Use:** Hero sections, main headlines, impact moments

### Subheads: Bluu Next Bold
- **Weight:** Bold/Extra Bold
- **Sizes:** 18px–36px
- **Character:** Modern, confident, authoritative
- **Feel:** Contemporary but grounded
- **Use:** Section subheadings, feature titles, emphasis

### Accent Text: Special Elite Regular
- **Weight:** Regular
- **Sizes:** 14px–18px (small, decorative)
- **Character:** Typewriter feel, personal, handwritten
- **Feel:** Intimate, authentic, fan-written
- **Use:** Quotes, captions, decorative flourishes, callouts

### Body: Clean Sans-Serif
- **Font Stack:** -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif
- **Sizes:** 14px–16px (body), 12px–14px (UI)
- **Weight:** Regular (400), Medium (500) for emphasis
- **Line Height:** 1.5–1.6
- **Character:** Clean, legible, modern
- **Feel:** Accessibility + sophistication
- **Use:** All body copy, labels, navigation

---

## HIERARCHY QUICK CHART

```
H1: DS Moster, 56–64px, Line-height 1.1, Black
H2: Bluu Next Bold, 32–40px, Line-height 1.2, Black
H3: Bluu Next Bold, 24–28px, Line-height 1.3, Black
H4: DS Moster, 20–24px, Line-height 1.3, Black
Body: Sans-serif, 16px, Line-height 1.6, #2d2d2d
Small: Sans-serif, 14px, Line-height 1.5, #666666
Caption: Special Elite, 14px, Line-height 1.5, #8b8680
```

---

## BUTTON STYLES

### Primary CTA (Orange)
```
Background:  #d97706
Text:        White
Padding:     12px 24px (desktop), 10px 20px (mobile)
Radius:      0–4px (relatively sharp)
Weight:      Bold (600)
Size:        14–16px
Hover:       #c9600f (darker orange) + slight shadow
```

### Secondary (Blue)
```
Background:  #1e3a5f
Text:        White
[Otherwise same as primary]
```

### Tertiary (Green)
```
Background:  #27633f
Text:        White
[Otherwise same as primary]
```

### Text Button
```
Background:  Transparent
Text:        #d97706 (orange) or #000000 (black)
Border:      Optional bottom border, matches text
Hover:       Darken color, add/thicken underline
```

---

## SPACING SCALE

```
2px   = Micro spacing
4px   = Extra small
8px   = Small
12px  = Medium
16px  = Large (DEFAULT for most spacing)
20px  = Extra large
24px  = Large (2x default)
32px  = Extra large (2x default)
48px  = Section spacing (3x default)
64px  = Major section spacing (4x default)
```

**Section Vertical Padding:** 48px–64px (desktop), 32px–48px (mobile)

---

## LAYOUT GRID

| Device | Width | Columns | Gutter |
|--------|-------|---------|--------|
| Mobile | 320–767px | 1 col | 16px |
| Tablet | 768–1023px | 2–3 col | 20px |
| Desktop | 1024–1440px | 3–4 col | 24px |
| Large | 1440px+ | 4 col | 28px |

**Card Width (Desktop 3-col):** 300–350px
**Card Width (Tablet 2-col):** 340–400px
**Card Width (Mobile):** Full width minus padding

---

## CARD LAYOUT TEMPLATE

```
┌──────────────────────────┐
│  Image (4:3 ratio)       │ ← Hero image
├──────────────────────────┤
│ [Category Tag - orange]  │ ← Small, colored background
│                          │
│ Headline (Bluu Bold)     │ ← 18–28px, bold
│                          │
│ Excerpt (body text)      │ ← 14–16px, readable
│                          │
│ Meta Info (small gray)   │ ← Date, author, 12px
│                          │
│ [Read More →] button     │ ← Text button in orange
└──────────────────────────┘

Card Background: #faf8f3 (cream)
Card Shadow: 0 2px 8px rgba(0,0,0,0.1)
Card Padding: 16px
Card Border Radius: 8px
Hover: Shadow increases slightly
```

---

## COMPONENT CHECKLIST

### Navigation
- [ ] Sticky header (60–72px height)
- [ ] Logo left, menu right
- [ ] Horizontal menu: Tour, Media, News, Warehouse, Shop
- [ ] Dropdown submenus
- [ ] Mobile hamburger + slide-out menu
- [ ] Orange hover state on menu items

### Cards
- [ ] News/Article card (image, title, excerpt, date)
- [ ] Tour date card (venue, city, date, ticket button)
- [ ] Setlist card (date, songs, setlist link)
- [ ] Artist card (image, name, instrument, bio)

### Buttons
- [ ] Primary orange CTA
- [ ] Secondary blue button
- [ ] Tertiary green button
- [ ] Text button with link styling
- [ ] Disabled states for all

### Forms
- [ ] Text input (light gray bg, dark text, orange focus)
- [ ] Email input (same as text)
- [ ] Select dropdown
- [ ] Checkbox
- [ ] Form validation (red error, green success)

### Sections
- [ ] Hero banner with tape graphics (top/bottom)
- [ ] Feature section (image + content side-by-side)
- [ ] Grid layout (responsive cards)
- [ ] Footer (multiple columns, dark background)
- [ ] Newsletter signup box

### Decorative
- [ ] Tape graphics (`tape-top.png`, `tape-bottom.png`)
- [ ] Horizontal divider line (dark gray, thin)
- [ ] Category tag (colored background, white text)
- [ ] Badge/status (presale, on sale, sold out)

---

## BRAND VOICE IN DESIGN

### Visual Tone Checklist
- [ ] **Warm, not cold:** Earth tones, golden light, analog feel
- [ ] **Authentic, not polished:** Visible texture, hand-drawn elements, imperfect spacing
- [ ] **Community-focused:** Large imagery of crowds, fans, togetherness
- [ ] **Live & present:** In-the-moment photography, not staged perfection
- [ ] **Accessible:** High contrast, readable fonts, generous spacing
- [ ] **Distinctive:** Tape graphics, typography combo unique to DMB
- [ ] **Timeless:** Vintage aesthetic won't age poorly in 5 years

### Colors That Feel DMB
✓ Orange (energy, warmth, CTA)
✓ Earth tones (grounding, organic)
✓ Black (sophisticated, contrast)
✓ Cream/Beige (vintage, welcoming)
✓ Forest Green (nature, sustainability)

### Colors That DON'T Feel DMB
✗ Bright neon colors
✗ Clinical grays or corporate blues
✗ Artificial "web safety" colors
✗ Harsh whites (#ffffff) without warmth
✗ Multiple competing accent colors

---

## SHADOWS & DEPTH

```
Subtle (cards, light components):
  box-shadow: 0 2px 8px rgba(0,0,0,0.1)

Medium (larger cards, overlays):
  box-shadow: 0 4px 12px rgba(0,0,0,0.15)

Strong (modals, fixed elements):
  box-shadow: 0 8px 24px rgba(0,0,0,0.2)
```

**Philosophy:** Shadows are subtle, supporting the flat aesthetic. Not dramatic or harsh. Communicate elevation gently.

---

## RESPONSIVE BREAKPOINTS

```css
Mobile:    max-width: 767px
Tablet:    min-width: 768px AND max-width: 1023px
Desktop:   min-width: 1024px AND max-width: 1439px
Large:     min-width: 1440px
```

### Responsive Behavior
| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Nav | Hamburger | Hamburger | Horizontal |
| Card Grid | 1 col | 2 col | 3–4 col |
| Hero Height | 200–300px | 300–400px | 400–500px |
| Section Padding | 24px | 32px | 48px |
| Font Size | 95% of desktop | 100% of desktop | 100% |

---

## IMAGE ASPECT RATIOS & USAGE

| Use Case | Ratio | Size | Notes |
|----------|-------|------|-------|
| Hero Banner | 16:9 | 1200×675px | Full-width background |
| Card Image | 4:3 | 400×300px | News/article cards |
| Square Feature | 1:1 | 300×300px | Artist profiles |
| Portrait | 3:4 | 300×400px | Featured artists |
| Wide Banner | 2:1 | 1400×700px | Tour promotions |

### Image Style Guidelines
- **Warmth:** +10–15% orange/yellow color cast
- **Grain:** Subtle film grain, barely perceptible
- **Saturation:** Natural, not oversaturated
- **Subject:** In-the-moment concert/crowd, not posed perfection
- **Vignette:** Optional, subtle edge darkening
- **Overlay:** Semi-transparent dark (20–30%) when text overlays

---

## ACCESSIBILITY ESSENTIALS

### Color Contrast
- **Black on cream:** 21:1 ratio (excellent)
- **Orange button:** Test text contrast (may need darker text or white background)
- **Dark gray on cream:** 10:1 ratio (excellent)
- **Light gray on cream:** May fail AA; use sparingly or increase size

### Type Accessibility
- **Minimum body size:** 16px (14px acceptable for secondary)
- **Minimum line height:** 1.5 for body text
- **Font weight:** Avoid < 400 for body text
- **Fallback fonts:** Always include sans-serif system fonts

### Interactive Accessibility
- **Focus visible:** All buttons/links need clear focus state (not just hover)
- **Touch targets:** 44px minimum for mobile buttons
- **Keyboard nav:** Tab through all interactive elements
- **Link underlines:** Links should be underlined or have color contrast > 3:1

---

## DISTINCTIVE DMB BRAND ELEMENTS

### Tape Graphics
- Horizontal decorative graphics frame section headlines
- SVG or PNG assets: `tape-top.png`, `tape-bottom.png`
- Creates visual rhythm and retro aesthetic
- Used consistently across site as signature element
- Reinforces analog, vinyl-era brand identity

### Typography Trinity
- **DS Moster** (distinctive headlines) + **Bluu Next Bold** (modern subheads) + **Special Elite** (personal accents)
- This combination is uniquely recognizable as DMB
- Creates visual interest without chaos
- Balances authenticity (vintage fonts) with accessibility (clean sans-serif body)

### Color System
- **One bold action color (orange)** vs. muted secondaries
- No competing accent colors
- Earth tones create warmth, not coldness
- Palette is recognizable and consistent across touchpoints

### Paper/Texture Aesthetic
- Cards feel like concert programs or fan zines
- Subtle grain, worn edges, lived-in quality
- Backgrounds are cream/beige, not white
- Creates "analog warmth" without being ostentatious

---

## DESIGN TOKENS (For Developers)

```scss
// Colors
$color-black: #000000;
$color-dark-gray: #2d2d2d;
$color-orange: #d97706;
$color-green: #27633f;
$color-blue: #1e3a5f;
$color-cream: #faf8f3;

// Typography
$font-display: "DS Moster", serif;
$font-heading: "Bluu Next Bold", sans-serif;
$font-accent: "Special Elite Regular", serif;
$font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

// Spacing
$spacing-base: 8px;
$spacing-sm: 12px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 48px;

// Shadows
$shadow-light: 0 2px 8px rgba(0,0,0,0.1);
$shadow-medium: 0 4px 12px rgba(0,0,0,0.15);

// Radius
$radius-none: 0;
$radius-sm: 4px;
$radius-md: 8px;
```

---

## WHAT MAKES DMB DESIGN WORK

1. **Cohesion:** Every choice reinforces the same aesthetic (warm, authentic, community-focused)
2. **Distinctiveness:** Tape graphics, font combo, color palette are uniquely DMB
3. **Functionality:** Beauty serves purpose; no ornament for ornament's sake
4. **Emotion:** Design evokes live music, warmth, belonging, history
5. **Scalability:** System works for new content types while maintaining identity
6. **Accessibility:** Readable, high-contrast, keyboard-navigable
7. **Timelessness:** Vintage aesthetic + quality craftsmanship won't age poorly

---

## DO'S AND DON'TS

### DO
✓ Use warm earth tones and cream backgrounds
✓ Feature orange for CTAs only (not for decoration)
✓ Include tape graphics in major section breaks
✓ Use all three fonts together (creates distinctiveness)
✓ Show live concert imagery with crowd energy
✓ Maintain community/Warehouse positioning
✓ Use generous, clear spacing
✓ Test for WCAG AA color contrast
✓ Keep design feeling like a fan made it

### DON'T
✗ Use corporate marketing language in copy
✗ Over-polish; remove visible texture and warmth
✗ Use multiple competing accent colors
✗ Feature overly-posed or staged photography
✗ Make text too small or low-contrast
✗ Forget the "Warehouse" community value
✗ Use generic band/music clichés (generic music note icons, etc.)
✗ Make design feel slick or corporate
✗ Ignore accessibility in pursuit of beauty

---

**Version:** 1.0
**Updated:** January 19, 2026
**Purpose:** Quick reference for DMB Almanac PWA designers and developers
**Source:** davematthewsband.com brand analysis
