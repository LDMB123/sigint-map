# Dave Matthews Band Website - Visual Design System Analysis
## Reference Guide for DMB Almanac PWA Redesign

**Analysis Date:** January 19, 2026
**Source:** https://www.davematthewsband.com/
**Purpose:** Comprehensive design system documentation for PWA redesign guidance

---

## 1. COLOR PALETTE

### Primary Colors
| Color | Usage | Hex Code (Inferred) | CSS Variable |
|-------|-------|-------------------|--------------|
| **Black** | Primary text, navigation, headers | #000000 or #1a1a1a | `--black-text` |
| **Dark Gray** | Secondary text, borders, subtle elements | #2d2d2d | `--dark-gray` |
| **Charcoal** | Backgrounds, deep text elements | #3a3a3a | `--charcoal-bg` |

### Secondary Colors
| Color | Usage | Hex Code (Inferred) | Character |
|-------|-------|-------------------|-----------|
| **Orange** | Primary CTA buttons, highlights, energy | #d97706 or #e67e22 | Warm, inviting, action-oriented |
| **Forest Green** | Secondary buttons, accents, sustainability | #27633f or #2d5016 | Organic, natural, grounded |
| **Deep Blue** | Tertiary accent, links, contemplation | #1e3a5f or #2c5aa0 | Depth, sophistication |
| **Warm Beige** | Paper backgrounds, texture base | #f5f1e8 or #ede9dd | Vintage, warm, nostalgic |
| **Light Cream** | Light backgrounds, readability | #faf8f3 | Clean, approachable |

### Accent & Supporting Colors
- **Warm Gray:** #8b8680 (subtle text, secondary content)
- **Tan/Ochre:** #c4a57b (vintage feel, earth tones)
- **Rust/Burgundy:** #8b4513 (warm accent, concert feel)
- **Muted Gold:** #d4a574 (luxury without ostentation)

### Color Usage Philosophy
The palette avoids bright, digital neons. Instead:
- Earth tones ground the design in analog warmth
- Orange serves as the single, bold call-to-action color
- Secondary colors are muted and sophisticated
- Beige/cream creates a "concert program" aesthetic
- High contrast text on neutral backgrounds ensures readability

**Brand Alignment:** These colors reflect the authentic, unpretentious, vintage-inspired aesthetic that defines DMB's brand—evoking vinyl records, concert tickets, and warm live venues rather than sleek corporate design.

---

## 2. TYPOGRAPHY SYSTEM

### Headline Fonts

#### DS Moster
- **Usage:** Main headlines, impact moments, section titles
- **Character:** Bold, distinctive, memorable, slightly unconventional
- **Weight Options:** Regular (appears to be the primary weight)
- **Size Range:** 32px-64px (desktop), responsive scaling on mobile
- **Line Height:** 1.1-1.2 (tight, impactful)
- **Color:** Typically black (#000000) or dark gray
- **Best For:** Hero sections, tour announcements, "Now Playing" headers
- **Feeling:** Rock & roll authenticity, vintage concert posters

#### Bluu Next Bold
- **Usage:** Featured subheadings, emphasis points, strong secondary hierarchy
- **Character:** Contemporary, confident, bold weight (hence the name)
- **Weight:** Bold or Extra Bold
- **Size Range:** 18px-36px (desktop)
- **Line Height:** 1.2-1.4
- **Color:** Black or dark gray
- **Best For:** Section subheads, featured article titles, call-out boxes
- **Feeling:** Modern but grounded, authoritative without being corporate

#### Special Elite Regular
- **Usage:** Decorative text, quotes, notes, sidebar content
- **Character:** Typewriter feel, authentic, personal, hand-written quality
- **Weight:** Regular
- **Size Range:** 14px-18px (typically smaller, accent use)
- **Line Height:** 1.5-1.6 (more generous for readability in smaller sizes)
- **Color:** Black or dark gray
- **Best For:** Pull quotes, photo captions, decorative flourishes, fan testimonials
- **Feeling:** Intimate, personal, like a fan's handwritten note

### Body & UI Text

#### Primary Body Font
- **Font Family:** Clean sans-serif (likely system font stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif)
- **Size Range:** 14px-16px (body copy), 12px-14px (UI labels)
- **Weight:** Regular (400) for body, Medium (500) for emphasis
- **Line Height:** 1.5-1.6 (for body readability)
- **Color:** Dark gray (#2d2d2d) or black
- **Letter Spacing:** Neutral (no tracking)
- **Best For:** News articles, setlist descriptions, user interface labels

#### Navigation Text
- **Font Size:** 14px-16px
- **Weight:** Regular to Medium (500)
- **Color:** Black or dark gray
- **Hover State:** May darken or use orange accent
- **Character:** Clean, legible, professional

### Typography Hierarchy

```
H1 (DS Moster)        56-64px | Black | Line-height 1.1
H2 (Bluu Next Bold)   32-40px | Black | Line-height 1.2
H3 (Bluu Next Bold)   24-28px | Black | Line-height 1.3
H4 (DS Moster)        20-24px | Black | Line-height 1.3
Body (Sans-serif)     16px    | #2d2d2d | Line-height 1.6
Small text            14px    | #666666 | Line-height 1.5
Caption (Special Elite) 14px  | #8b8680 | Line-height 1.5
```

### Typography Pairing Strategy
- **Distinctive + Legible:** DS Moster (attention) paired with clean sans-serif (readability)
- **Modern + Authentic:** Bluu Next Bold (contemporary) paired with Special Elite (vintage)
- **Visual Contrast:** Use font variety to create visual interest without losing clarity
- **Consistent Sizing:** Maintain clear size relationships to establish hierarchy

**Brand Alignment:** This three-font system creates visual richness while maintaining authenticity. DS Moster feels like vintage concert posters. Special Elite adds human warmth. The sans-serif body keeps the design accessible and modern.

---

## 3. LAYOUT PATTERNS & GRID SYSTEM

### Responsive Breakpoints (Inferred)
| Device | Width | Column Grid | Gutter |
|--------|-------|-------------|--------|
| Mobile | 320-767px | 1 column | 16px |
| Tablet | 768-1023px | 2-3 columns | 20px |
| Desktop | 1024-1440px | 3-4 columns | 24px |
| Large Desktop | 1440px+ | 4 columns | 28px |

### Section Spacing
- **Vertical Padding:** 48px-64px (desktop), 32px-48px (mobile) between major sections
- **Horizontal Padding:** 24px (desktop), 16px (mobile) section edges
- **Card Margin:** 16px-20px between cards
- **Component Spacing:** 8px-16px between related UI elements

### Layout Patterns Identified

#### 1. Hero/Banner Section
- Full-width background image or color
- Tape graphic overlays (top and bottom)
- Headline in DS Moster (centered or left-aligned)
- Subheading in sans-serif body font
- Optional CTA button in orange
- Height: 300-500px (desktop), 200-300px (mobile)

#### 2. Card Grid Layout
- 3-column grid (desktop), 2-column (tablet), 1-column (mobile)
- Card styling:
  - White or cream (#faf8f3) background
  - Paper texture or subtle pattern overlay
  - 8-12px padding/margin around content
  - Subtle drop shadow: `box-shadow: 0 2px 8px rgba(0,0,0,0.1)`
  - Hover state: slight lift or shadow increase
- Typical card components: image (top), headline (Bluu Next Bold), description (body), date/meta (small gray)

#### 3. Navigation & Header
- Sticky horizontal navigation
- Logo on left, navigation items on right (desktop)
- Burger menu toggle (mobile)
- Navigation items: Tour, Media, News, Warehouse
- Submenu structure for Tour (locations, dates, presale)
- White background with black text
- Orange hover states for interactive elements

#### 4. Feature Section (News/Content)
- Large hero image (left or full-width)
- Content area (right or below) with:
  - Category tag (small, colored background)
  - Headline (Bluu Next Bold, 28-36px)
  - Subheading or excerpt (body text)
  - Meta info (date, author)
  - Optional CTA button
- Tape graphics framing the section

#### 5. Setlist/Event Cards
- Compact card format
- Event date/venue (Special Elite font, small)
- Show details (simple list format)
- "View Setlist" CTA button
- Paper-like background
- Minimal, clean design focused on information

#### 6. Footer Section
- Dark background (charcoal #3a3a3a or black)
- Multiple columns: Social, Links, Newsletter signup, Contact info
- Links in light gray on dark
- Newsletter signup with email input + orange button
- Copyright and legal links (very small text)
- Social icons (simple, monochrome)

### Tape Elements (Distinctive Brand Feature)
- Horizontal tape graphics (`tape-top.png`, `tape-bottom.png`) frame major sections
- Typically positioned above and below section headlines
- Creates visual rhythm and retro aesthetic
- Used consistently throughout site as visual branding

---

## 4. NAVIGATION STYLE

### Primary Navigation
- **Position:** Sticky header, fixed to top across all pages
- **Background:** White or light (#faf8f3)
- **Layout:** Horizontal bar with logo on left, menu items on right
- **Height:** 60-72px (desktop)

### Navigation Menu Items
| Item | Submenu | Behavior |
|------|---------|----------|
| **Tour** | Dates, Presale, Tickets | Dropdown reveals tour schedule |
| **Media** | Photos, Videos, Streaming | Dropdown with media categories |
| **News** | Blog, Press, Social | Dropdown or simple link |
| **Warehouse** | Membership, Shop, Perks | Dropdown emphasizing community |
| **Shop** | Merchandise, Digital | Link to e-commerce |

### Navigation Typography
- **Font:** Clean sans-serif
- **Size:** 14-16px
- **Weight:** Regular (500 on hover)
- **Color:** Black (#000000)
- **Hover State:** Orange text or bottom-border accent
- **Active State:** Bold weight or orange underline

### Mobile Navigation
- Hamburger menu toggle (three horizontal lines)
- Slide-out or dropdown menu from top
- Full-width menu items
- Touch-friendly sizing (44px+ tap targets)
- Close button (X) clearly visible

**Navigation Philosophy:** Clean and organized with clear categorization. The "Warehouse" positioning emphasizes community. Orange accents signal interactivity without overwhelming. Sticky positioning keeps navigation always accessible.

---

## 5. CARD & COMPONENT DESIGNS

### News/Article Card
```
┌─────────────────────────────┐
│  [Hero Image - 100% width]  │
├─────────────────────────────┤
│ Category Tag (Orange bg)    │
│ Headline (Bluu Next Bold)   │
│ Excerpt (body text)         │
│ Meta: Date, Author (small)  │
│ "Read More" button          │
└─────────────────────────────┘
```

- **Dimensions:** 320px (mobile), 400px (tablet), 300-350px (desktop 3-col)
- **Background:** White or cream
- **Image Height:** 160-200px
- **Padding:** 16px
- **Border:** Subtle shadow, no border
- **Hover:** Slight shadow increase, text color darken

### Tour Date Card
```
┌──────────────────────────┐
│ VENUE NAME              │
│ City, State             │
│ [Date & Time]           │
│                         │
│ TICKET INFO →           │
│ Presale: [Date]         │
│ On Sale: [Date]         │
└──────────────────────────┘
```

- **Dimensions:** Responsive, typically 280-320px wide
- **Background:** Cream (#faf8f3)
- **Typography:**
  - Venue: Bluu Next Bold, 16-18px
  - Location: Body text, 14px
  - Dates: Special Elite, 12px
  - Status badges: Very small, could be color-coded
- **Border:** Subtle bottom border (dark gray #2d2d2d)
- **CTA:** "Buy Tickets" button in orange or "Check Presale"
- **Paper feel:** Optional texture overlay or faded background

### Button Styles

#### Primary CTA Button
- **Background:** Orange (#d97706)
- **Text:** White or dark
- **Padding:** 12px 24px (desktop), 10px 20px (mobile)
- **Border Radius:** 0-4px (relatively sharp, not rounded)
- **Font Weight:** Bold (600)
- **Font Size:** 14-16px
- **Hover State:** Darker orange (#c9600f), slight shadow
- **Active State:** Even darker or inset shadow

#### Secondary Button (Blue)
- **Background:** Deep blue (#1e3a5f)
- **Text:** White
- **Otherwise:** Same sizing and behavior as primary

#### Tertiary Button (Green)
- **Background:** Forest green (#27633f)
- **Text:** White
- **Otherwise:** Same sizing and behavior as primary

#### Text/Link Button
- **Background:** Transparent
- **Text:** Orange or black
- **Border:** Optional bottom border, matches text color
- **Hover:** Color darkens, underline appears/thickens

### Form Components
- **Input Fields:** Light gray background (#f5f5f5), dark text, 8px border radius
- **Label Text:** Dark gray, 12-14px, bold weight
- **Placeholder:** Light gray (#999999)
- **Focus State:** Orange border, no outline ring
- **Validation:** Red text for errors, green for success

### Tag/Badge Components
- **Background:** Muted colors (orange, green, blue, gray)
- **Text:** White or dark, very small (11-12px)
- **Padding:** 4px 8px
- **Border Radius:** 2-4px
- **Usage:** Category labels, event status, difficulty indicators

### List Components
- **Bullet Style:** Simple dots or custom icon
- **Spacing:** 8-12px between items
- **Font:** Body text, dark gray
- **Indentation:** 16px from edge

---

## 6. IMAGE TREATMENTS

### Photography Style
- **Overall Aesthetic:** Warm, analog, live-concert energy
- **Color Grading:** Golden/warm tones, slight film grain, not clinical
- **Subject Matter:**
  - Band members performing (in-the-moment, emotional)
  - Live crowd/audience (community, connection)
  - Venue atmospherics (stage lighting, energy)
  - Intimate band moments (candid, authentic)
  - NOT: Overly posed studio shots, perfect lighting

### Image Sizing & Aspect Ratios

| Context | Aspect Ratio | Typical Dimensions | Usage |
|---------|--------------|-------------------|-------|
| Hero/Banner | 16:9 (landscape) | 1200x675px | Full-width headers |
| Card Image | 4:3 (landscape) | 400x300px | News/article cards |
| Square | 1:1 | 300x300px | Artist/artist profiles |
| Portrait | 3:4 (portrait) | 300x400px | Featured artist |
| Wide Banner | 2:1 (ultrawide) | 1400x700px | Tour banners |

### Image Filters & Effects
- **Slight Warmth:** +10-15% orange/yellow color cast
- **Film Grain:** Subtle, barely perceptible
- **Vignette:** Optional, very subtle darkening at edges
- **Saturation:** Natural, not oversaturated
- **Sharpness:** Crisp but not harsh
- **Overlay:** Sometimes a semi-transparent dark overlay (20-30% opacity) to ensure text readability

### Image Borders & Framing
- **Tape Graphic Overlay:** Images sometimes framed with decorative tape graphics (especially on hero sections)
- **Border:** Subtle 1px dark gray border or no border
- **Shadow:** Soft shadow: `box-shadow: 0 4px 12px rgba(0,0,0,0.15)`
- **Caption:** Often positioned below image in Special Elite font (small, gray)

### Image Loading
- **Lazy Loading:** Likely implemented (images load as user scrolls)
- **Placeholder:** Solid color or blurred placeholder while loading
- **Optimization:** Responsive image srcset for different screen sizes

**Image Philosophy:** Images should capture the raw energy of live performance and the warmth of community. Avoid slick, over-processed photography. The warm color grading and film grain keep everything feeling human and connected to the analog aesthetic of the brand.

---

## 7. OVERALL MOOD & VISUAL LANGUAGE

### Aesthetic Summary
The DMB website embodies a **vintage-analog-meets-modern aesthetic** with strong emphasis on:

1. **Warmth & Authenticity**
   - Earth tones (beige, brown, ochre)
   - Organic textures (paper, tape)
   - Warm color grading in images
   - No cold digital blues or modern minimalism

2. **Tape & Analog Nostalgia**
   - Decorative tape graphics frame major sections
   - References to cassette culture, vinyl era
   - Reel-to-reel visual motifs
   - Typewriter-style fonts
   - Creates a "concert program" or "fan zine" aesthetic

3. **Imperfection & Authenticity**
   - Hand-drawn elements (slider controls, line decorations)
   - Slightly unpolished typography choices
   - Varied spacing and rhythm
   - NOT sterile or corporate
   - Feels like it was made by fans for fans

4. **Community & Connection**
   - Images emphasize live crowds and shared moments
   - Navigation prominently features "Warehouse" (fan community)
   - Copy tone is warm and inclusive
   - Color palette evokes vinyl records and concert tickets
   - Design feels like a friend, not a brand

5. **Musical Excellence & Live Energy**
   - Hero images often feature stage energy
   - Setlist information prominent and accessible
   - Tour dates easy to find
   - Design celebrates performance and musicianship
   - Typography choices honor rock & roll tradition

### Design Principles in Action

| Principle | Visual Expression | Example |
|-----------|------------------|---------|
| **Authenticity** | Warm, analog colors; hand-drawn elements | Orange CTA, typewriter fonts, tape graphics |
| **Community** | Large crowd images, "Warehouse" navigation | Feature fan moments, emphasize togetherness |
| **Longevity** | Timeless vintage aesthetic, not trendy | Earth tones won't date, balanced composition |
| **Excellence** | Refined typography, quality photography | Distinctive fonts, emotional concert imagery |
| **Sustainability** | Earth tones, natural materials feel | Color palette suggests sustainability |

### Visual Tone (Not Written Tone, but Visual)
- **Feeling:** Warm, inviting, nostalgic, energetic, authentic
- **NOT:** Corporate, sterile, trendy, artificial, exclusive
- **Personality:** Old friend, fellow fan, museum curator, vinyl collector
- **Metaphors:** Concert ticket, vinyl record, concert program, family photo album

---

## 8. DISTINCTIVE BRAND ELEMENTS

### Logo & Wordmark
- **Dancing Lady Logo** (`dancing-lady.png`)
  - Iconic DMB symbol
  - Represents the band's name origin story
  - Used as favicon and small-scale identifier
  - Recognizable silhouette
  - Placed prominently in header

### Tape Graphics
- **Top Tape:** `tape-top.png` - horizontal tape decoration above section titles
- **Bottom Tape:** `tape-bottom.png` - horizontal tape decoration below section titles
- **Function:** Creates visual rhythm, frames important content
- **Consistency:** Used throughout site as signature element
- **Authenticity:** References physical concert programs and vinyl-era aesthetic

### Color-Coded Elements
- **Orange:** Primary CTAs (universally understood as "click here")
- **Green:** Secondary actions, sustainability initiatives
- **Blue:** Tertiary actions, links, depth
- **Gray:** Neutral, deemphasis, secondary info
- **Cream/Beige:** Positive, welcoming, paper-like

### Typography As Branding
- **DS Moster:** Distinctive, recognizable, signature font for headlines
- **Bluu Next Bold:** Modern yet grounded
- **Special Elite:** Nostalgic, personal, authentic
- **Font Pairing:** The combination of these three IS part of the brand identity

### Pattern & Texture Elements
- **Paper Texture:** Subtle grain suggesting concert programs or vinyl sleeves
- **Hand-Drawn Lines:** Decorative dividers, section breaks
- **Dotted Elements:** Slider controls, navigation indicators
- **Burnished/Aged Look:** Backgrounds feel lived-in, not pristine

### Icon System
- **Style:** Simple, monochrome (black or dark gray)
- **Size:** Varies by context (16px to 48px)
- **Usage:** Navigation, social media links, feature icons
- **Aesthetic:** Minimalist, readable at small sizes

### Social Media Integration
- **Icons:** Simple, monochrome style
- **Platforms Featured:** Instagram, Facebook, Twitter/X, TikTok, YouTube, Spotify
- **Placement:** Footer prominent location
- **Hover:** Orange accent or slight enlarge on hover

---

## 9. COMPONENT INVENTORY FOR DMB ALMANAC PWA

### Essential Components to Implement

#### Navigation
- [ ] Sticky header with logo
- [ ] Horizontal navigation with dropdowns (desktop)
- [ ] Mobile hamburger menu
- [ ] Active state indicators
- [ ] Submenu structure for Tour/Media/News/Warehouse

#### Content Cards
- [ ] News article card (image, title, excerpt, CTA)
- [ ] Tour date card (venue, date, ticket info)
- [ ] Setlist card (date, songs, note field)
- [ ] Artist profile card (image, name, instrument, bio)
- [ ] Photo gallery card (image grid with lightbox)

#### Buttons & CTAs
- [ ] Primary orange button
- [ ] Secondary blue button
- [ ] Tertiary green button
- [ ] Text/link button
- [ ] Icon + text button
- [ ] Disabled state buttons

#### Forms
- [ ] Text input field
- [ ] Email input field
- [ ] Select dropdown
- [ ] Checkbox
- [ ] Radio button
- [ ] Form validation messages

#### Layout Sections
- [ ] Hero banner with overlay text
- [ ] Feature section (image + content)
- [ ] Grid card layout (3-col desktop, 2-col tablet, 1-col mobile)
- [ ] Newsletter signup section
- [ ] Footer with multiple columns
- [ ] Breadcrumb navigation

#### Decorative Elements
- [ ] Tape graphics (top/bottom)
- [ ] Horizontal rule/divider
- [ ] Category tag/badge
- [ ] Status badge (Presale, On Sale, Sold Out)
- [ ] Loading indicator
- [ ] Success/error messages

#### Media Components
- [ ] Image with caption
- [ ] Photo grid/gallery
- [ ] Video player embed
- [ ] Audio player
- [ ] Carousel/slider (featured content)

#### Info Components
- [ ] Tooltip
- [ ] Modal dialog
- [ ] Alert/notification message
- [ ] Tab navigation
- [ ] Accordion/collapsible section
- [ ] Pagination

---

## 10. DESIGN SYSTEM SPECIFICATIONS FOR DEVELOPMENT

### Spacing Scale
```
2px   = 0.125rem (micro)
4px   = 0.25rem  (xs)
8px   = 0.5rem   (sm)
12px  = 0.75rem  (md)
16px  = 1rem     (lg)
20px  = 1.25rem  (xl)
24px  = 1.5rem   (2xl)
32px  = 2rem     (3xl)
40px  = 2.5rem   (4xl)
48px  = 3rem     (5xl)
64px  = 4rem     (6xl)
80px  = 5rem     (7xl)
```

### Shadow Scale
```
Subtle:    box-shadow: 0 1px 2px rgba(0,0,0,0.05)
Light:     box-shadow: 0 2px 8px rgba(0,0,0,0.1)
Medium:    box-shadow: 0 4px 12px rgba(0,0,0,0.15)
Strong:    box-shadow: 0 8px 24px rgba(0,0,0,0.2)
Heavy:     box-shadow: 0 16px 32px rgba(0,0,0,0.25)
```

### Border Radius Scale
```
0px    = Sharp corners (buttons, cards)
2px    = Subtle rounding (tags, inputs)
4px    = Light rounding (small components)
8px    = Standard rounding (cards, containers)
12px   = Generous rounding (larger components)
Full   = 9999px (circles, avatars)
```

### Font Size Scale
```
12px  = 0.75rem   (caption, small text)
14px  = 0.875rem  (body small, labels)
16px  = 1rem      (body regular)
18px  = 1.125rem  (body large)
20px  = 1.25rem   (heading 4)
24px  = 1.5rem    (heading 3)
28px  = 1.75rem   (heading 3 large)
32px  = 2rem      (heading 2)
36px  = 2.25rem   (heading 2 large)
40px  = 2.5rem    (heading 2 xlarge)
48px  = 3rem      (heading 1)
56px  = 3.5rem    (heading 1 large)
64px  = 4rem      (heading 1 xlarge)
```

### Line Height Scale
```
1    = 100% (very tight, display)
1.1  = 110% (tight, headlines)
1.2  = 120% (compact, subheads)
1.3  = 130% (normal, headings)
1.5  = 150% (comfortable, body)
1.6  = 160% (generous, small text)
```

### Z-Index Scale
```
0    = Base layer (default)
10   = Elevated cards/containers
20   = Modals, overlays
30   = Dropdowns, tooltips
40   = Fixed headers/sticky nav
50   = Fixed footer
100  = Full-screen modals
```

### Responsive Media Queries
```
Mobile:     (max-width: 767px)
Tablet:     (min-width: 768px) and (max-width: 1023px)
Desktop:    (min-width: 1024px) and (max-width: 1439px)
Large:      (min-width: 1440px)
```

---

## 11. ACCESSIBILITY & BRAND COMPLIANCE

### Color Contrast Requirements
- **WCAG AA Compliant:** Text should have 4.5:1 contrast ratio minimum
- **WCAG AAA Compliant:** Text should have 7:1 contrast ratio minimum
- **Current Palette:** Black (#000000) on cream (#faf8f3) = excellent contrast
- **Orange CTA:** Test orange button text for sufficient contrast; may need darker text

### Typography Accessibility
- **Font Size Minimum:** 16px body text (14px acceptable for secondary content)
- **Font Weights:** Avoid very light weights (< 400) for body text
- **Line Height:** Minimum 1.5 for body text ensures readability
- **Font Families:** Use fallback sans-serif for accessibility

### Interactive Components
- **Focus States:** All buttons/links must have visible focus indicator (not just hover)
- **Touch Targets:** Minimum 44px height/width for mobile buttons
- **Keyboard Navigation:** All interactive elements must be keyboard accessible
- **Link Underlines:** Links should be underlined or have sufficient color contrast

### Image Accessibility
- **Alt Text:** All images require descriptive alt text
- **Decorative Images:** Mark as decorative if not essential to content
- **Text in Images:** Avoid critical text embedded in images
- **Color:** Don't convey information through color alone

---

## 12. INSPIRATION SUMMARY FOR DMB ALMANAC PWA

### Core Design Moves to Retain
1. **Warm Earth-Tone Palette** - Orange CTA, beige background, dark text
2. **Distinctive Typography** - DS Moster headlines, Special Elite accents
3. **Tape Graphics** - Signature brand element framing sections
4. **Paper Texture Aesthetic** - Concert program feel, vintage vibes
5. **Large, Warm Photography** - In-the-moment concert/crowd imagery
6. **Clean Grid Layout** - Responsive, card-based structure
7. **Sticky Navigation** - Always-accessible top menu with submenu drops
8. **Community-Forward Copy** - "Warehouse" positioning, inclusive language

### What Makes It Work
- **Cohesive Aesthetic:** Every design choice reinforces the vintage-analog-authentic brand
- **Functional Beauty:** Not ornamental for ornament's sake; every element serves purpose
- **Emotional Connection:** Design evokes live music, warmth, community, history
- **Scalable System:** Can expand to new content types while maintaining identity
- **Fan-Forward:** Prioritizes tour info, setlists, community features
- **Timeless:** Won't look dated in 5 years because it's not trend-dependent

### Potential Opportunities for Almanac PWA
1. **Seasonal Color Variations** - Subtle palette shifts for different tour seasons
2. **Interactive Timeline** - Visual history of band with same brand language
3. **Setlist Database** - Card-based interface consistent with tour cards
4. **Fan Community Features** - Emphasize Warehouse connection with member-exclusive content
5. **Offline Functionality** - PWA caching of setlists, dates, archives
6. **Accessibility Focus** - Ensure contrast and keyboard navigation exceed website
7. **Dark Mode Option** - Maintain warmth with dark cream (#f5f1e8 text on #2d2d2d background)

---

## 13. RECOMMENDED NEXT STEPS

### For Design System Documentation
1. Extract exact hex color values from website CSS
2. Confirm exact font file names and weights
3. Document spacing system (currently inferred)
4. Create component library with states (hover, active, disabled)
5. Document motion/animation (transitions, hover effects)

### For DMB Almanac PWA Implementation
1. Build component library matching this visual language
2. Create Figma design system file with colors, typography, components
3. Establish CSS variables for all design tokens
4. Create style guide for consistent implementation
5. Test all components for accessibility compliance
6. Set up responsive breakpoint testing
7. Build asset library (tape graphics, textures, icons)

### Brand Guidelines to Follow
- **Always** use warm color palette; avoid cold digital colors
- **Always** include tape graphic elements in major section breaks
- **Always** prioritize community and live experience messaging
- **Always** use distinctive typography combination (DS Moster + Special Elite)
- **Never** make the design feel corporate or sterile
- **Never** overuse orange; it's the accent, not the primary color
- **Never** use clichéd "band/music" icons; keep it minimal and authentic
- **Never** feature overly-polished or staged photography

---

## 14. SPECIFIC DESIGN TOKENS FOR DEVELOPMENT

### CSS Custom Properties Reference
```css
/* Colors */
--color-black: #000000;
--color-dark-gray: #2d2d2d;
--color-charcoal: #3a3a3a;
--color-medium-gray: #666666;
--color-light-gray: #999999;
--color-warm-gray: #8b8680;
--color-orange: #d97706;
--color-orange-dark: #c9600f;
--color-orange-light: #e67e22;
--color-green: #27633f;
--color-green-dark: #1f4620;
--color-blue: #1e3a5f;
--color-blue-dark: #0f1e33;
--color-beige: #f5f1e8;
--color-cream: #faf8f3;
--color-tan: #c4a57b;
--color-rust: #8b4513;

/* Typography */
--font-display: "DS Moster", serif;
--font-heading: "Bluu Next Bold", sans-serif;
--font-accent: "Special Elite Regular", serif;
--font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;

/* Shadows */
--shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-light: 0 2px 8px rgba(0, 0, 0, 0.1);
--shadow-medium: 0 4px 12px rgba(0, 0, 0, 0.15);
--shadow-strong: 0 8px 24px rgba(0, 0, 0, 0.2);

/* Spacing */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;
--spacing-xl: 20px;
--spacing-2xl: 24px;
--spacing-3xl: 32px;
--spacing-4xl: 40px;
--spacing-5xl: 48px;

/* Radii */
--radius-none: 0;
--radius-sm: 2px;
--radius-md: 4px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-full: 9999px;
```

---

**Document Version:** 1.0
**Last Updated:** January 19, 2026
**Prepared for:** DMB Almanac PWA Redesign
**Reference Source:** https://www.davematthewsband.com/
