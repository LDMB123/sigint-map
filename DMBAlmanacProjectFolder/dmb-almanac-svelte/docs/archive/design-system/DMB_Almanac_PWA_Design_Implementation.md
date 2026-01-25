# DMB Almanac PWA - Design Implementation Guide
## How to Apply DMB Brand Design System

**Purpose:** Translate the DMB website visual language into the Almanac PWA
**Target Audience:** UI/UX Designers, Frontend Developers, Design QA
**Reference:** davematthewsband.com visual design system

---

## SECTION 1: CORE DESIGN DECISIONS FOR ALMANAC

### 1.1 Why This Matters for Almanac

The Almanac PWA is a deeper dive into DMB history, setlists, and fan community. The design should feel like:
- A personal music journal/scrapbook
- A concert program you'd collect
- A vinyl record liner notes experience
- A place where fans belong

**NOT like:**
- A corporate database
- A sterile music information site
- A mobile app trying to be trendy
- A corporate tour ticketing system

### 1.2 Key Differentiators from Main Website

| Aspect | Main Website | Almanac PWA |
|--------|-----|---------|
| **Purpose** | Current info, tour dates, shop | Historical deep-dive, personal journeys |
| **Timeline** | Present-focused | Past + present, chronological |
| **User Behavior** | Quick scan, transactional | Deep browsing, discovery, collection |
| **Visual Rhythm** | Horizontal flow | Vertical scrolling, timeline feel |
| **Interaction** | Click to external links | In-app exploration, offline access |
| **Emotion** | Current excitement | Nostalgia, reflection, connection |

### 1.3 Design Implications

**Almanac should:**
- Use warmer color grading (more sepia/vintage feel than main site)
- Emphasize timeline/chronological visual hierarchy
- Create "artifact" feeling (like looking at old concert programs)
- Use more Special Elite font for nostalgic captions
- Feature archival photography (not always current-tour energy)
- Encourage "lingering" with comfortable spacing and readable text
- Include pagination/navigation that feels like flipping through a book

---

## SECTION 2: COLOR PALETTE APPLICATION

### 2.1 Primary Color Usage

**Background/Canvas:**
```
Main Background:     #faf8f3 (cream) - default section bg
Secondary Background: #f5f1e8 (beige) - alternate sections for rhythm
Tertiary Background:  #ede9dd (lighter cream) - cards, containers
Text on Cream:       #000000 (black) or #2d2d2d (dark gray)
```

**Example Layout:**
```
┌─────────────────────────────┐
│  Header (white or cream)    │
├─────────────────────────────┤
│  Section 1 (cream #faf8f3)  │  ← Main background
│  ├─ Card (white)            │
│  ├─ Card (white)            │
│  └─ Card (white)            │
├─────────────────────────────┤
│  Section 2 (beige #f5f1e8)  │  ← Alternate for contrast
│  └─ Content                 │
└─────────────────────────────┘
```

### 2.2 Call-to-Action Color

**Orange is SACRED. Use it sparingly.**

```
Primary Action Button:  #d97706 (orange)
Hover/Active:           #c9600f (darker orange)
Disabled:               #ccc (neutral gray)
Text on Orange:         White or #000000 (test contrast)
```

**Where Orange Appears:**
- "View Setlist" buttons
- "Read More" text links
- "Play Audio" buttons
- "See Photos" CTAs
- Navigation hover states
- Active/current indicators

**Where Orange DOESN'T Appear:**
- Section backgrounds
- Category tags (use muted colors instead)
- Decorative elements
- Text emphasis (use bold weight instead)

### 2.3 Status & Secondary Colors

For non-critical information, use muted variants:

**Status Badges:**
```
Presale:     #27633f (forest green) - growing/upcoming
On Sale:     #1e3a5f (deep blue) - current, active
Sold Out:    #8b8680 (warm gray) - neutral, past
Cancelled:   #a0a0a0 (light gray) - inactive
```

**Category Tags:**
```
Tour Date:      #1e3a5f (blue)
Setlist:        #27633f (green)
Interview:      #8b4513 (rust)
Photo Gallery:  #c4a57b (tan)
Quote/Story:    #d4a574 (muted gold)
```

### 2.4 Text Color Hierarchy

```
Headlines:      #000000 (pure black, maximum contrast)
Body Text:      #2d2d2d (dark gray, high contrast)
Secondary Info: #666666 (medium gray, readable but lighter)
Disabled Text:  #999999 (light gray, de-emphasized)
Links:          #d97706 (orange) with underline
Visited Links:  #8b4513 (rust) to show visited state
```

**Contrast Checklist:**
- [ ] All body text 14px+ has minimum 4.5:1 contrast (WCAG AA)
- [ ] Orange text has sufficient contrast against backgrounds
- [ ] No light gray on cream; too low contrast
- [ ] Dark gray on white/cream passes all accessibility tests

---

## SECTION 3: TYPOGRAPHY IMPLEMENTATION

### 3.1 Font Installation & Loading

**CSS Font-Face Declarations:**
```css
@font-face {
  font-family: "DS Moster";
  src: url("/fonts/ds-moster/DMosterFont.woff2") format("woff2"),
       url("/fonts/ds-moster/DMosterFont.woff") format("woff");
  font-weight: 400;
  font-style: normal;
  font-display: swap; /* Show fallback while loading */
}

@font-face {
  font-family: "Bluu Next Bold";
  src: url("/fonts/bluu-next/BluuNextBold.woff2") format("woff2"),
       url("/fonts/bluu-next/BluuNextBold.woff") format("woff");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Special Elite";
  src: url("/fonts/special-elite/SpecialElite.woff2") format("woff2"),
       url("/fonts/special-elite/SpecialElite.woff") format("woff");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

### 3.2 Hierarchy Rules

**For Headlines (DS Moster):**
```css
h1 {
  font-family: "DS Moster", serif;
  font-size: 56px; /* desktop */
  font-size: clamp(32px, 6vw, 64px); /* responsive */
  line-height: 1.1;
  font-weight: 400;
  color: #000000;
  margin-bottom: 24px;
  letter-spacing: -0.02em; /* slightly tight */
}

@media (max-width: 767px) {
  h1 {
    font-size: 32px;
    margin-bottom: 16px;
  }
}
```

**For Subheads (Bluu Next Bold):**
```css
h2 {
  font-family: "Bluu Next Bold", sans-serif;
  font-size: 32px; /* desktop */
  font-size: clamp(24px, 4vw, 40px); /* responsive */
  line-height: 1.2;
  font-weight: 700;
  color: #000000;
  margin-bottom: 20px;
  letter-spacing: 0; /* neutral */
}

h3 {
  font-family: "Bluu Next Bold", sans-serif;
  font-size: 24px;
  line-height: 1.3;
  font-weight: 700;
  color: #000000;
  margin-bottom: 16px;
}
```

**For Accent Text (Special Elite):**
```css
.caption, .quote, .note {
  font-family: "Special Elite", serif;
  font-size: 14px;
  line-height: 1.6;
  color: #8b8680;
  font-style: normal;
  font-weight: 400;
}

.quote {
  color: #000000;
  font-size: 16px;
  line-height: 1.6;
  border-left: 4px solid #d97706;
  padding-left: 16px;
  margin: 24px 0;
}
```

**For Body Text (Clean Sans):**
```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #2d2d2d;
  font-weight: 400;
}

p {
  margin-bottom: 16px;
}

small, .small-text {
  font-size: 14px;
  line-height: 1.5;
  color: #666666;
}
```

### 3.3 Responsive Font Sizing Strategy

Use `clamp()` for fluid typography:

```css
/* Scales proportionally between breakpoints */
h1 { font-size: clamp(32px, 6vw, 64px); }
h2 { font-size: clamp(24px, 4vw, 40px); }
h3 { font-size: clamp(18px, 3vw, 28px); }
body { font-size: 16px; } /* fixed, accessible */
```

**Rationale:**
- Headlines scale with viewport for visual interest
- Body text stays fixed at 16px minimum for readability
- No need for separate breakpoint CSS for font sizing

---

## SECTION 4: COMPONENT SPECIFICATIONS

### 4.1 Setlist Card Component

**Purpose:** Display a single concert setlist with venue, date, and songs

**Visual Design:**
```
┌──────────────────────────────────────┐
│  VENUE NAME                   [Year]  │  ← Bluu Bold, dark
│  City, State                          │  ← Body text, gray
├──────────────────────────────────────┤
│  [Date in Special Elite]              │  ← Nostalgic feel
│                                       │
│  Set I:                               │  ← Bold label
│    1. Song Title                      │
│    2. Song Title                      │
│    3. Song Title                      │
│                                       │
│  Intermission                         │  ← Italicized
│                                       │
│  Set II:                              │
│    1. Song Title                      │
│    2. Song Title                      │
│                                       │
│  Encore:                              │
│    1. Song Title                      │
│                                       │
│  Notes: [fan-contributed text if any] │  ← Special Elite, small
│                                       │
│                   [View Full] [Share] │  ← Orange CTA buttons
└──────────────────────────────────────┘

Card Background:  #faf8f3 (cream)
Card Padding:     16px (mobile), 20px (desktop)
Card Margin:      12px between cards
Card Shadow:      0 2px 8px rgba(0,0,0,0.1)
Card Radius:      4px
Width:            280px (mobile), 320px (tablet), 300px (desktop 3-col)
```

**HTML/CSS Example:**
```html
<article class="setlist-card">
  <header class="setlist-header">
    <h2 class="setlist-venue">Riverside Amphitheater</h2>
    <span class="setlist-year">2015</span>
    <p class="setlist-location">Riverside, CA</p>
  </header>

  <div class="setlist-date">
    May 15, 2015
  </div>

  <div class="setlist-content">
    <div class="set">
      <h3>Set I</h3>
      <ol>
        <li>All Along The Watchtower</li>
        <li>Don't Drink The Water</li>
        <li>Pantala Naga Pampa</li>
      </ol>
    </div>

    <p class="intermission">Intermission</p>

    <div class="set">
      <h3>Set II</h3>
      <ol>
        <li>Ants Marching</li>
        <li>Seven</li>
      </ol>
    </div>

    <div class="set">
      <h3>Encore</h3>
      <ol>
        <li>Two Step</li>
      </ol>
    </div>
  </div>

  <footer class="setlist-footer">
    <p class="setlist-notes">
      Incredible energy tonight. The crowd sang along on Watchtower.
    </p>
    <div class="setlist-actions">
      <a href="#" class="btn btn-orange">View Full</a>
      <button class="btn btn-text">Share</button>
    </div>
  </footer>
</article>
```

```css
.setlist-card {
  background-color: #faf8f3;
  border-radius: 4px;
  padding: 16px;
  margin: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: box-shadow 0.2s ease;
}

.setlist-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.setlist-header {
  border-bottom: 1px solid #e0d8cc;
  padding-bottom: 12px;
  margin-bottom: 12px;
}

.setlist-venue {
  font-family: "Bluu Next Bold", sans-serif;
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.setlist-year {
  font-size: 12px;
  color: #999999;
  font-weight: 500;
}

.setlist-location {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

.setlist-date {
  font-family: "Special Elite", serif;
  font-size: 13px;
  color: #8b8680;
  margin-bottom: 12px;
}

.setlist-content {
  margin-bottom: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: #2d2d2d;
}

.setlist-content .set h3 {
  font-family: "Bluu Next Bold", sans-serif;
  font-size: 13px;
  font-weight: 700;
  margin: 12px 0 6px 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.setlist-content ol {
  margin: 0;
  padding-left: 20px;
}

.setlist-content li {
  margin-bottom: 3px;
}

.intermission {
  font-style: italic;
  color: #999999;
  margin: 8px 0;
  font-size: 13px;
}

.setlist-footer {
  border-top: 1px solid #e0d8cc;
  padding-top: 12px;
}

.setlist-notes {
  font-family: "Special Elite", serif;
  font-size: 13px;
  color: #8b8680;
  line-height: 1.5;
  margin: 0 0 12px 0;
  font-style: italic;
}

.setlist-actions {
  display: flex;
  gap: 8px;
}
```

### 4.2 Tour Timeline Component

**Purpose:** Visual chronological display of tour history

**Design:**
```
2024 Tour
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  June 12–14
  Red Rocks Amphitheatre, Morrison, CO
  ○ [3 nights shown as dots]
    [Preview Photos] [Buy Tickets]

  July 20
  Alpine Valley Music Theatre, East Troy, WI
  ○
    [View Setlist] [Buy Tickets]

  August 2–3
  Blossom Music Center, Cuyahoga Falls, OH
  ○ [2 nights]
    [View Setlist] [Buy Tickets]

────────────────────────────────────────

2023 Tour
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [similar structure]
```

**Visual Elements:**
- Year as section header (DS Moster, 28px)
- Horizontal line divider (gray, 1px)
- Date range (Bluu Bold, 16px)
- Venue name (Bluu Bold, 14px)
- Location (body text, gray)
- Venue indicator dot (can be filled for played, outlined for upcoming)
- CTA buttons below each venue group

### 4.3 Interview/Feature Card

**Purpose:** Long-form content preview

```
┌──────────────────────────────────────┐
│  [Hero Image - 4:3 aspect]           │
├──────────────────────────────────────┤
│  INTERVIEW  [Published: Jan 2025]    │  ← Tag + meta
│                                      │
│  "The Dave I Know Today"             │  ← Headline (Bluu Bold)
│  A conversation with longtime        │
│  collaborator [name] about growth,   │  ← Excerpt
│  creativity, and staying true...     │
│                                      │
│                    [Read Full →]     │  ← Orange text CTA
└──────────────────────────────────────┘
```

### 4.4 Photo Gallery Grid

**Purpose:** Display concert photos in gallery format

**Layout:**
```
┌─────────────┬─────────────┬─────────────┐
│   Photo 1   │   Photo 2   │   Photo 3   │
│  (1:1)      │  (1:1)      │  (1:1)      │
├─────────────┼─────────────┼─────────────┤
│   Photo 4   │   Photo 5   │   Photo 6   │
│  (1:1)      │  (1:1)      │  (1:1)      │
└─────────────┴─────────────┴─────────────┘

Grid Columns:     3 (desktop), 2 (tablet), 1 (mobile)
Image Aspect:     1:1 (square)
Gap Between:      12px (mobile), 16px (tablet), 20px (desktop)
Hover Effect:     Slight zoom (105%) + shadow increase
Click Behavior:   Open lightbox or expanded view
Caption Position: Overlay on hover or below image
```

---

## SECTION 5: NAVIGATION PATTERNS

### 5.1 Top Navigation (Header)

**Desktop Layout:**
```
┌──────────────────────────────────────────────┐
│  [Logo] [Home] [Setlists] [Tours] [History] │  ← Menu items
│                               [Search] [≡]   │  ← Right side
└──────────────────────────────────────────────┘
```

**Navigation Items for Almanac:**
- **Home** - Dashboard/recent activity
- **Setlists** - Browse by year/venue
- **Tours** - Chronological tour archive
- **History** - Timeline, milestones
- **Statistics** - Show count, setlist stats
- **Search** - Global search across content

**HTML Structure:**
```html
<nav class="main-nav" aria-label="Main navigation">
  <div class="nav-container">
    <a href="/" class="nav-logo">
      <img src="/logo.svg" alt="DMB Almanac Home">
    </a>

    <ul class="nav-menu">
      <li><a href="/" class="nav-link">Home</a></li>
      <li>
        <a href="/setlists" class="nav-link">Setlists</a>
        <ul class="nav-submenu">
          <li><a href="/setlists/by-year">By Year</a></li>
          <li><a href="/setlists/by-venue">By Venue</a></li>
          <li><a href="/setlists/by-song">By Song</a></li>
        </ul>
      </li>
      <li><a href="/tours" class="nav-link">Tours</a></li>
      <li><a href="/history" class="nav-link">History</a></li>
      <li><a href="/stats" class="nav-link">Stats</a></li>
    </ul>

    <div class="nav-right">
      <button class="nav-search" aria-label="Search">
        <svg><!-- search icon --></svg>
      </button>
      <button class="nav-menu-toggle" aria-label="Toggle menu">
        <svg><!-- hamburger icon --></svg>
      </button>
    </div>
  </div>
</nav>
```

**CSS Styling:**
```css
.main-nav {
  position: sticky;
  top: 0;
  background-color: white;
  border-bottom: 1px solid #e0d8cc;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  z-index: 40;
}

.nav-container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
}

.nav-logo {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.nav-logo img {
  height: 36px;
  width: auto;
}

.nav-menu {
  display: flex;
  gap: 32px;
  margin: 0;
  padding: 0;
  list-style: none;
  flex: 1;
  justify-content: center;
}

.nav-link {
  color: #000000;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  padding: 6px 0;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: #d97706;
  border-bottom-color: #d97706;
}

.nav-link.active {
  color: #d97706;
  border-bottom-color: #d97706;
  font-weight: 600;
}

/* Dropdown menus */
.nav-submenu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  background-color: white;
  list-style: none;
  padding: 8px 0;
  margin: 0;
  min-width: 160px;
  border: 1px solid #e0d8cc;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.nav-menu li:hover .nav-submenu {
  display: block;
}

.nav-submenu a {
  display: block;
  padding: 12px 20px;
  color: #000000;
  text-decoration: none;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.nav-submenu a:hover {
  background-color: #f5f1e8;
  color: #d97706;
}

/* Mobile menu toggle */
.nav-menu-toggle {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
}

@media (max-width: 1023px) {
  .nav-menu {
    display: none;
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    flex-direction: column;
    gap: 0;
    background-color: white;
    border-bottom: 1px solid #e0d8cc;
  }

  .nav-menu.active {
    display: flex;
  }

  .nav-menu-toggle {
    display: block;
  }
}
```

### 5.2 Breadcrumb Navigation

For deeper pages, show navigation path:

```
Home / Setlists / 2020 / Red Rocks
```

**CSS:**
```css
.breadcrumb {
  font-size: 12px;
  color: #666666;
  padding: 12px 24px;
  background-color: #f5f1e8;
}

.breadcrumb a {
  color: #d97706;
  text-decoration: none;
}

.breadcrumb a:hover {
  text-decoration: underline;
}

.breadcrumb span {
  margin: 0 4px;
  color: #999999;
}
```

---

## SECTION 6: INTERACTIVE PATTERNS

### 6.1 Button States

**All buttons must have clear states:**

```css
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* Primary Orange CTA */
.btn-orange {
  background-color: #d97706;
  color: white;
}

.btn-orange:hover {
  background-color: #c9600f;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.2);
}

.btn-orange:active {
  background-color: #b8520e;
  transform: translateY(1px);
}

.btn-orange:focus {
  outline: 2px solid #d97706;
  outline-offset: 2px;
}

.btn-orange:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.6;
}

/* Secondary Blue */
.btn-blue {
  background-color: #1e3a5f;
  color: white;
}

.btn-blue:hover {
  background-color: #0f1e33;
  box-shadow: 0 4px 12px rgba(30, 58, 95, 0.2);
}

/* Text Button (Link-like) */
.btn-text {
  background-color: transparent;
  color: #d97706;
  padding: 8px 0;
  border-bottom: 1px solid transparent;
}

.btn-text:hover {
  border-bottom-color: #d97706;
}

.btn-text:focus {
  outline: 2px solid #d97706;
  outline-offset: 2px;
}
```

### 6.2 Form Inputs

```css
input[type="text"],
input[type="email"],
input[type="search"],
select,
textarea {
  width: 100%;
  max-width: 500px;
  padding: 12px;
  font-size: 16px;
  font-family: inherit;
  border: 1px solid #d0c7bc;
  border-radius: 4px;
  background-color: white;
  color: #2d2d2d;
  transition: border-color 0.2s ease;
}

input::placeholder {
  color: #999999;
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #d97706;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.1);
}

/* Search input */
.search-input {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #d0c7bc;
  border-radius: 4px;
  background-color: white;
  gap: 8px;
}

.search-input input {
  border: none;
  flex: 1;
  padding: 0;
}

.search-input button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}
```

### 6.3 Hover & Interactive Effects

**Minimal but meaningful:**

```css
/* Card hover: subtle shadow increase */
.card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: box-shadow 0.2s ease;
}

/* Link hover: orange underline */
a {
  color: #d97706;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s ease;
}

a:hover {
  border-bottom-color: #d97706;
}

/* Button hover: darker + shadow */
button:hover {
  filter: brightness(0.95);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* Image hover: subtle zoom */
.photo-grid img:hover {
  transform: scale(1.02);
  transition: transform 0.2s ease;
}
```

---

## SECTION 7: LAYOUT TEMPLATES

### 7.1 Homepage Template

```
┌──────────────────────────────────────────┐
│          Navigation Bar (sticky)         │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  Hero: "The Dave Matthews Band Almanac"  │  ← DS Moster, 56px
│  [Tape graphic top]                      │
│  Explore the complete history of DMB...  │  ← Body text
│  [Search] or [Browse]                    │  ← CTA buttons
│  [Tape graphic bottom]                   │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  Recent Setlists (Bluu Bold 24px)        │  ← Section header
│  ├─ [Setlist Card] [Setlist Card]        │  ← 3-column grid
│  └─ [Setlist Card]                       │
│  [View All →]                            │  ← Text CTA
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  Upcoming Tours & Dates                  │  ← Section header
│  ├─ [Tour Card] [Tour Card]              │
│  └─ [Tour Card]                          │
│  [See Full Schedule →]                   │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  Timeline (This Year in DMB History)     │
│  1995 - First show together              │
│  2000 - Breakthrough year...             │
│  2015 - Warehouse Founded...             │
│  [Explore Timeline →]                    │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  Footer                                  │
│  [Links] [Social] [Newsletter] [Contact] │
└──────────────────────────────────────────┘
```

### 7.2 Setlists Page Template

```
┌──────────────────────────────────────────┐
│  Setlists                                │  ← Page title (DS Moster)
│  Filter by: [Year ▼] [Venue ▼] [Song ▼] │  ← Dropdowns
│  [Search: ___________]                   │  ← Search input
└──────────────────────────────────────────┘

[2024]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌──────────────────────────────────────────┐
│  [Setlist Card] [Setlist Card]           │  ← 3-column grid
│  [Setlist Card]                          │
└──────────────────────────────────────────┘

[2023]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌──────────────────────────────────────────┐
│  [Setlist Card] [Setlist Card]           │
│  [Setlist Card] [Setlist Card]           │
│  [Setlist Card] [Setlist Card]           │
│  [More ↓]                                │  ← Load more button
└──────────────────────────────────────────┘

[Pagination: 1 2 3 ... 42]
```

---

## SECTION 8: DARK MODE OPTION (Future)

If implementing dark mode, maintain warmth:

```css
@media (prefers-color-scheme: dark) {
  body {
    background-color: #2d2d2d; /* charcoal, not pure black */
    color: #f5f1e8; /* cream text, not white */
  }

  .card {
    background-color: #3a3a3a; /* slightly lighter */
    border-color: #555555;
  }

  /* Keep orange CTA brightness */
  .btn-orange {
    background-color: #e67e22; /* slightly lighter orange in dark mode */
  }
}
```

---

## SECTION 9: PERFORMANCE & OPTIMIZATION

### 9.1 Image Optimization

**Use responsive images:**
```html
<img
  src="/images/setlist-card-600.jpg"
  srcset="
    /images/setlist-card-300.jpg 300w,
    /images/setlist-card-600.jpg 600w,
    /images/setlist-card-1200.jpg 1200w
  "
  sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
  alt="Red Rocks Amphitheatre concert"
/>
```

**Format for web:**
- Use WebP with JPG fallback
- Compress to < 100KB per card image
- Use lazy loading for below-fold images

### 9.2 Font Loading Strategy

```css
@font-face {
  font-family: "DS Moster";
  src: url("/fonts/ds-moster.woff2") format("woff2");
  font-display: swap; /* Show fallback immediately */
  font-weight: 400;
}
```

**Fallback strategy:**
- DS Moster → fallback to Georgia (serif)
- Bluu Next Bold → fallback to Arial Bold (sans-serif)
- Special Elite → fallback to Courier New (monospace)
- Body → system font stack already specified

### 9.3 CSS Architecture

**Use CSS custom properties:**
```css
:root {
  /* Colors */
  --color-black: #000000;
  --color-cream: #faf8f3;
  --color-orange: #d97706;

  /* Typography */
  --font-display: "DS Moster", Georgia, serif;
  --font-heading: "Bluu Next Bold", Arial, sans-serif;

  /* Spacing */
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;

  /* Shadows */
  --shadow-light: 0 2px 8px rgba(0,0,0,0.1);
  --shadow-medium: 0 4px 12px rgba(0,0,0,0.15);
}
```

---

## SECTION 10: ACCESSIBILITY CHECKLIST

### Before Launch:
- [ ] All text has minimum 16px size (14px acceptable with leading)
- [ ] All text has 4.5:1 contrast ratio (WCAG AA minimum)
- [ ] All buttons/links have visible focus state
- [ ] Form labels are associated with inputs (for/id attributes)
- [ ] Images have descriptive alt text
- [ ] Color doesn't convey information alone (use labels too)
- [ ] All interactive elements keyboard-navigable (Tab through)
- [ ] Mobile buttons minimum 44px tap target
- [ ] No flash/strobe effects (if any animation)
- [ ] Heading hierarchy is logical (h1 → h2 → h3, no skipping)

### Testing Tools:
- Chrome DevTools Lighthouse (Accessibility tab)
- WAVE (WebAIM contrast checker)
- Axe DevTools (automated accessibility testing)
- Manual keyboard navigation (Tab through page)
- Screen reader testing (NVDA, JAWS, or VoiceOver)

---

## SECTION 11: COMPONENT CHECKLIST

Create these before implementation:

### Navigation Components
- [ ] Logo + wordmark
- [ ] Main navigation menu
- [ ] Dropdown menus
- [ ] Mobile hamburger toggle
- [ ] Search bar with icon
- [ ] Breadcrumb navigation

### Content Cards
- [ ] Setlist card (full design + states)
- [ ] Tour date card
- [ ] Feature/interview card
- [ ] Photo gallery card
- [ ] Statistics card

### Form Components
- [ ] Text input (normal, focus, disabled)
- [ ] Email input
- [ ] Search input with icon
- [ ] Select dropdown
- [ ] Checkbox
- [ ] Form validation messages (error, success)

### Button Styles
- [ ] Primary orange button (hover, active, disabled, focus)
- [ ] Secondary blue button
- [ ] Tertiary green button
- [ ] Text/link button
- [ ] Icon button
- [ ] Button with icon + text

### Layout Components
- [ ] Hero banner with tape graphics
- [ ] Feature section (image + text)
- [ ] Grid card layout (3-col, 2-col, 1-col responsive)
- [ ] Timeline/vertical list
- [ ] Footer with columns
- [ ] Modal dialog
- [ ] Alert message box

### Decorative Components
- [ ] Tape graphics (top, bottom)
- [ ] Horizontal divider line
- [ ] Category tag/badge
- [ ] Status badge (presale, on sale, sold out)
- [ ] Loading spinner
- [ ] Empty state illustration

### Media Components
- [ ] Image with caption
- [ ] Photo grid (responsive, lightbox)
- [ ] Video player embed
- [ ] Audio player (setlist songs)
- [ ] Carousel/slider

---

## FINAL RECOMMENDATIONS

### Design System Maintenance
1. Create Figma file with all components
2. Document all design tokens (colors, spacing, typography)
3. Build Storybook or component library documentation
4. Establish CSS variable naming conventions
5. Create QA checklist for visual consistency

### Development Guidelines
1. Use semantic HTML (nav, article, section, aside, footer)
2. Implement CSS custom properties for theming
3. Follow mobile-first responsive design approach
4. Test on real devices, not just browser emulation
5. Optimize images and fonts for web performance
6. Ensure keyboard navigation works throughout
7. Test color contrast on actual backgrounds

### Brand Consistency
1. Use this guide as source of truth
2. All new features should follow established patterns
3. New colors must be added to palette (not random hex)
4. New fonts require approval and fallback specification
5. Review all designs against "Brand Guardrails" section
6. Don't deviate for "creative reasons" without discussing

---

**Document Version:** 1.0
**Last Updated:** January 19, 2026
**Prepared For:** DMB Almanac PWA Design & Development Teams
**Reference:** davematthewsband.com + Brand Identity Guidelines
