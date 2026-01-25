# DMB Brand Alignment Checklist
## For Reviewing DMB Almanac PWA Design Decisions

**Purpose:** Ensure every design element reinforces DMB brand identity and values
**Use Case:** Design review meetings, QA sign-off, stakeholder approval
**Frequency:** Check before each design phase (wireframes, high-fidelity, implementation)

---

## PART 1: CORE BRAND VALUES CHECK

Before approving any design, ask: Does this reinforce our core values?

### Authenticity - Is it Real & Unpolished?
- [ ] Uses organic, warm colors (not sterile corporate palette)
- [ ] Features candid photography (not overly-posed or staged)
- [ ] Design feels human-made, not machine-generated
- [ ] Imperfections visible (texture, hand-drawn elements, tape graphics)
- [ ] No corporate jargon in copy (feels like fans talking to fans)
- [ ] Components have personality, not generic defaults
- [ ] Texture visible in backgrounds (not flat, solid colors)
- [ ] Typography combination is distinctive (not safe, bland choices)

**Red Flags:**
- Photography that looks like stock photo library
- Copy that uses marketing buzzwords ("leverage," "synergy," "exclusive")
- Design that looks like every other music site
- Overprocessed images, too-perfect aesthetic
- Sterile white backgrounds, clinical color choices

---

### Community - Does It Celebrate Togetherness?
- [ ] "Warehouse" prominently featured (fan club first)
- [ ] Imagery includes crowds, shared moments, concert energy
- [ ] Copy emphasizes family/belonging, not exclusivity
- [ ] Fan voices/reviews visible in content
- [ ] Community features (sharing, commenting, fan contributions)
- [ ] Setlists show fan notes/memories alongside official data
- [ ] Design encourages lingering and exploring (not quick transactional clicks)
- [ ] No artificial scarcity or FOMO tactics

**Red Flags:**
- Features that emphasize paying/upgrading over belonging
- "VIP" or "exclusive" language (unless clearly ironic)
- Design that treats the band as separate from fans
- Absence of fan contributions or community content
- Layout that rushes users through (not inviting slow browsing)

---

### Live Experience - Does It Capture Concert Magic?
- [ ] Setlist information accessible and prominent
- [ ] Tour dates easy to find (multiple pathways to tickets)
- [ ] Tour archives searchable (by venue, year, tour name)
- [ ] Setlist data supports deep dive (songs, notes, context)
- [ ] Photography emphasizes stage energy and crowd connection
- [ ] Design captures moment/present-ness (not sterile records)
- [ ] Audio/video integration for listening to setlists
- [ ] Timeline/history respects the "moment" of each show

**Red Flags:**
- Setlist data buried under other content
- Poor search/filtering for tour information
- Photos that don't capture concert energy
- Static, lifeless layout (no sense of movement/rhythm)
- Missing context about shows or venues

---

### Giving Back - Does It Honor the Mission?
- [ ] Bama Works Foundation visible but not exploitative
- [ ] "$65M+ raised" mentioned in appropriate contexts
- [ ] Design doesn't make charity feel transactional
- [ ] Community service message integrated naturally
- [ ] Environmental/sustainability hints in aesthetic (earth tones)
- [ ] Copy focuses on impact, not guilt-tripping
- [ ] Features that highlight purpose beyond profit

**Red Flags:**
- Charity messaging only visible in footer
- "Donate now" push (feels transactional)
- Sustainability claims without backing them up
- Charity presented as marketing angle, not core value
- Missing connection between band's mission and design

---

### Musical Excellence - Does It Respect the Artistry?
- [ ] Setlists treated as important data (not afterthought)
- [ ] Audio quality honored (good audio players, quality recordings)
- [ ] Performance history celebrated (archives, statistics)
- [ ] Song information includes history/stories
- [ ] Virtuosity acknowledged (musician info, instrument details)
- [ ] Improvisation/jamming honored (setlist notes, extended versions)
- [ ] 30+ years of catalog respected (not focused only on recent)

**Red Flags:**
- Minimal setlist information ("songs played: yes")
- Audio quality compromised by compression
- Design treats songs as generic data points
- No context about musicianship or artistry
- Recent tours dominate; historical archives neglected

---

### Sustainability - Does the Aesthetic Feel Responsible?
- [ ] Earth tones used (connects to environmental values)
- [ ] Minimal animation/effects (reduces energy consumption)
- [ ] Efficient image optimization (web performance)
- [ ] Design philosophy respects user's data/bandwidth
- [ ] Environmental initiatives visible (if applicable)
- [ ] Organic, natural imagery (not artificial/plastic)
- [ ] Typography choices feel timeless (won't need redesign in 1 year)

**Red Flags:**
- Heavy animations, video autoplays (energy inefficient)
- Large unoptimized images
- Trendy design that will need refresh in 6 months
- Plastic-y, artificial aesthetic
- No mention of environmental values

---

### Longevity - Will This Age Well?
- [ ] Vintage aesthetic (won't look dated in 5 years)
- [ ] Color palette timeless (earth tones don't trend or fade)
- [ ] Typography classic (DS Moster, Special Elite feel "forever")
- [ ] Design system expandable (not overly specific)
- [ ] 30+ years of band history honored equally
- [ ] Architecture supports future growth
- [ ] No trendy effects or animations that feel dated now

**Red Flags:**
- Using current design trends (glassmorphism, neumorphism, etc.)
- Color palette heavily dependent on 2020s palette trends
- Design that only works for current content (breaks with expansion)
- Overly specific to current band lineup or era
- Heavy reliance on animations that feel gimmicky

---

## PART 2: VISUAL IDENTITY CHECK

### Color Palette
- [ ] Primary background is cream (#faf8f3) or beige (#f5f1e8)
- [ ] Text is black (#000000) or dark gray (#2d2d2d) on light backgrounds
- [ ] Orange (#d97706) used ONLY for CTAs (very sparing)
- [ ] Secondary actions use blue (#1e3a5f) or green (#27633f)
- [ ] No bright, neon, or digital-feeling colors
- [ ] Color palette evokes vinyl records and concert programs
- [ ] All text has 4.5:1 contrast ratio minimum (WCAG AA)
- [ ] Orange CTA has sufficient text contrast
- [ ] No color used to convey information alone (always labeled)
- [ ] Color scheme consistent across all pages

**Hex Code Verification:**
- [ ] Black text: #000000 ✓
- [ ] Dark gray: #2d2d2d ✓
- [ ] Cream background: #faf8f3 ✓
- [ ] Beige accent: #f5f1e8 ✓
- [ ] Orange CTA: #d97706 ✓
- [ ] Orange hover: #c9600f ✓
- [ ] Green: #27633f ✓
- [ ] Blue: #1e3a5f ✓

---

### Typography
- [ ] Headlines use **DS Moster** (distinctive, memorable)
- [ ] Subheads use **Bluu Next Bold** (modern, authoritative)
- [ ] Accent text uses **Special Elite** (nostalgic, personal)
- [ ] Body text uses clean sans-serif (readable, modern)
- [ ] Font hierarchy is clear and logical
- [ ] All fonts have proper fallbacks
- [ ] Minimum body text size 16px (14px for secondary)
- [ ] Line height minimum 1.5 for readability
- [ ] Bold weight used for emphasis, not color changes
- [ ] Typography creates visual interest without chaos

**Font Stack Verification:**
- [ ] DS Moster fallback: Georgia, serif ✓
- [ ] Bluu Next Bold fallback: Arial, sans-serif ✓
- [ ] Special Elite fallback: Courier New, monospace ✓
- [ ] Body font stack: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif ✓

---

### Layout & Spacing
- [ ] Grid system uses 16px base unit (8, 16, 24, 32, 48, 64px)
- [ ] Cards have consistent padding (16px mobile, 20px+ desktop)
- [ ] Spacing between sections is 48–64px (major breaks)
- [ ] Mobile breakpoint: 320–767px ✓
- [ ] Tablet breakpoint: 768–1023px ✓
- [ ] Desktop breakpoint: 1024–1440px ✓
- [ ] Large desktop: 1440px+ ✓
- [ ] Responsive columns: 1 (mobile), 2 (tablet), 3 (desktop)
- [ ] Section padding: 24px mobile, 48px desktop
- [ ] No content wider than 1440px (max-width set)

---

### Distinctive Brand Elements
- [ ] **Tape graphics** visible (top/bottom section frames)
- [ ] Tape graphics used consistently throughout
- [ ] **Dancing lady logo** appears prominently
- [ ] Font combination (DS + Bluu + Special Elite) applied
- [ ] **Paper texture aesthetic** subtle but present
- [ ] Hand-drawn or imperfect elements visible
- [ ] **Warm color grading** in images (golden, not clinical)
- [ ] **No other sites look like this** (distinctiveness check)
- [ ] Brand elements feel earned, not slapped on

---

### Image Treatment
- [ ] Photography is candid (in-the-moment, not posed)
- [ ] Concert/crowd imagery prominent
- [ ] Color grading warm (golden, film-like)
- [ ] Subtle film grain or texture visible
- [ ] Images respect aspect ratios (4:3 for cards, 16:9 for hero)
- [ ] Image optimization done (< 100KB for cards, < 300KB for hero)
- [ ] Caption font is Special Elite (small, nostalgic)
- [ ] Alt text descriptive for accessibility
- [ ] Images load responsively (srcset for different screens)

---

## PART 3: COMPONENT QUALITY CHECK

### Navigation
- [ ] Header is sticky (stays visible while scrolling)
- [ ] Logo clearly visible and clickable
- [ ] Navigation items: Tour, Media, News, Warehouse, Search ✓
- [ ] Dropdown menus work on desktop
- [ ] Mobile hamburger menu functional
- [ ] Active page indicator visible (orange underline)
- [ ] Keyboard navigation works (Tab through menu)
- [ ] Focus states visible on all menu items
- [ ] Search functionality accessible
- [ ] Navigation accessible to screen readers

---

### Cards/Content Containers
- [ ] Background is cream or white
- [ ] Shadow: 0 2px 8px rgba(0,0,0,0.1) ✓
- [ ] Padding: 16px consistent
- [ ] Margin between cards: 12–16px
- [ ] Border radius: 4px (minimal, not rounded)
- [ ] Hover state: shadow increases to medium ✓
- [ ] Content hierarchy clear (image → headline → text → CTA)
- [ ] Image aspect ratio correct for use
- [ ] Call-to-action visible and orange
- [ ] Responsive width (300px desktop, 100% mobile)

---

### Buttons
- [ ] Primary button: orange (#d97706) ✓
- [ ] Primary button text: white or dark (contrast checked)
- [ ] Secondary button: blue (#1e3a5f) ✓
- [ ] Tertiary button: green (#27633f) ✓
- [ ] Text button: transparent with orange text
- [ ] Padding: 12px 24px (desktop), 10px 20px (mobile)
- [ ] Font weight: 600 (bold)
- [ ] Border radius: 0–4px (relatively sharp)
- [ ] Hover state: darker color + shadow
- [ ] Focus state: outline visible (2px solid)
- [ ] Active/pressed state: darker, slightly inset
- [ ] Disabled state: gray, reduced opacity
- [ ] Minimum touch target: 44px (mobile)
- [ ] All buttons keyboard accessible (Tab + Enter)

---

### Forms
- [ ] Input background: white or light gray
- [ ] Input border: 1px solid #d0c7bc
- [ ] Focus state: orange border + subtle shadow
- [ ] Placeholder text: light gray (#999999)
- [ ] Labels associated with inputs (for/id)
- [ ] Error messages: red (#d32f2f or similar)
- [ ] Success messages: green (#4caf50 or similar)
- [ ] Required fields marked with * or label text
- [ ] Input font size: minimum 16px (prevents zoom on iOS)
- [ ] Form validation feedback clear and immediate

---

### Images
- [ ] Hero images: 16:9 aspect ratio ✓
- [ ] Card images: 4:3 aspect ratio ✓
- [ ] Portrait images: 3:4 aspect ratio ✓
- [ ] Gallery images: 1:1 aspect ratio ✓
- [ ] All images optimized for web (< 300KB)
- [ ] WebP with JPG fallback provided
- [ ] Responsive srcset for different screen sizes
- [ ] Lazy loading implemented for below-fold
- [ ] Alt text present and descriptive
- [ ] Decorative images marked as such

---

## PART 4: VOICE & MESSAGING CHECK

### Tone of Voice
- [ ] Copy sounds like a fan, not a marketer
- [ ] Language is warm and welcoming
- [ ] No corporate jargon (no "synergy," "leverage," "content")
- [ ] Enthusiasm genuine, not forced
- [ ] Inclusivity emphasized throughout
- [ ] Playfulness present but substantive
- [ ] Appreciation/gratitude expressed to fans
- [ ] Band's values reflected in words

**Words That Should Appear:**
- Family, community, together
- Live, moment, night, show
- Journey, road, years
- Grateful, thanks, appreciation
- Real, authentic, true
- Music, jam, groove

**Words That Should NOT Appear:**
- Exclusive, VIP, elite
- Brand, synergy, leverage
- Content, engagement, metrics
- Disrupting, revolutionary
- Influencer, viral

---

### Community Language
- [ ] "Warehouse" language emphasizes membership, belonging
- [ ] Fan contributions celebrated (not just band content)
- [ ] Setlist notes from fans visible
- [ ] Community stories featured
- [ ] No artificial scarcity or FOMO tactics
- [ ] Appreciation for fans' 30-year loyalty expressed
- [ ] Access (to setlists, info) treated as gift, not premium feature

---

## PART 5: ACCESSIBILITY VERIFICATION

### Visual Accessibility
- [ ] Black text on cream: 21:1 contrast ✓
- [ ] Dark gray on cream: 10:1 contrast ✓
- [ ] Orange on white: 8:1 contrast ✓
- [ ] All text elements pass WCAG AA minimum (4.5:1)
- [ ] All interactive elements distinguishable by shape, not color alone
- [ ] No color is only means of conveying information

### Interaction Accessibility
- [ ] All buttons have visible focus state (outline or border)
- [ ] All links underlined or have color contrast > 3:1
- [ ] Keyboard navigation works (Tab through page)
- [ ] No keyboard traps (can always Tab forward/backward)
- [ ] Forms labeled properly (label + input association)
- [ ] Error messages associated with form fields
- [ ] Focus order logical (top to bottom)

### Content Accessibility
- [ ] Heading hierarchy logical (no skipped levels)
- [ ] Images have descriptive alt text
- [ ] Videos have captions (if applicable)
- [ ] Decorative images have empty alt="" or aria-hidden
- [ ] Page structure uses semantic HTML (nav, article, section)
- [ ] Skip links present (skip to main content)
- [ ] Language attribute set (lang="en")

### Testing Confirmation
- [ ] Tested with Chrome DevTools Lighthouse
- [ ] Tested with WAVE accessibility checker
- [ ] Keyboard navigation tested manually
- [ ] Tested with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Color contrast verified with Contrast Checker tool
- [ ] Mobile touch targets verified (44px minimum)

---

## PART 6: MOBILE RESPONSIVENESS

### Mobile Design
- [ ] Works on 320px width (iPhone 5)
- [ ] Works on 375px width (iPhone 6/7/8)
- [ ] Works on 414px width (iPhone XR/11)
- [ ] Works on 768px width (iPad)
- [ ] Touch targets minimum 44px (buttons, links, form inputs)
- [ ] No horizontal scroll required
- [ ] Images scale properly without distortion
- [ ] Text size doesn't require pinch-zoom
- [ ] Form inputs minimum 16px font (prevents iOS auto-zoom)
- [ ] Mobile menu functional and accessible

### Tablet Responsiveness
- [ ] Layout adapts properly at 768px breakpoint
- [ ] 2-column grid displays correctly
- [ ] Spacing adjusts for tablet form factor
- [ ] Navigation works (either horizontal or toggle)
- [ ] Touch targets appropriate for tablet use
- [ ] Landscape orientation works correctly

### Desktop Responsiveness
- [ ] Layout optimal at 1024px+ (3+ column)
- [ ] Horizontal navigation displays fully
- [ ] Hover states work (not applicable on mobile)
- [ ] Maximum width set to 1440px (content doesn't stretch too wide)
- [ ] Sidebar content properly positioned

---

## PART 7: PERFORMANCE CHECK

### Image Optimization
- [ ] Card images: 300–600px wide, < 100KB ✓
- [ ] Hero images: 1200px wide, < 300KB ✓
- [ ] WebP format with JPG fallback
- [ ] Responsive srcset implemented
- [ ] Lazy loading for below-fold images
- [ ] Alt text present on all images
- [ ] Decorative images use background-image CSS (not img tags)

### Font Optimization
- [ ] Fonts loaded with font-display: swap
- [ ] WOFF2 format provided (modern browsers)
- [ ] WOFF format provided (fallback)
- [ ] Font weights limited (400, 600, 700 only)
- [ ] Fallback fonts specified for all custom fonts
- [ ] Font files < 50KB each

### Overall Performance
- [ ] Lighthouse Performance score: 80+
- [ ] Lighthouse Accessibility score: 90+
- [ ] Page load time: < 3 seconds on 4G
- [ ] CSS minified and optimized
- [ ] JavaScript minified
- [ ] Unused CSS removed
- [ ] Caching headers set properly (for PWA)

---

## PART 8: DESIGN SYSTEM CONSISTENCY

### Design Tokens
- [ ] All colors use hex values from approved palette
- [ ] All spacing uses 8px base unit increments
- [ ] All shadows use predefined scale (subtle, light, medium, strong)
- [ ] All border radius consistent (0, 4px, 8px)
- [ ] All font sizes from established scale
- [ ] All line heights appropriate for font size/use

### Component Consistency
- [ ] All buttons follow same style rules
- [ ] All cards follow same padding/shadow/radius
- [ ] All forms use consistent input styling
- [ ] All navigation consistent across pages
- [ ] All typography styling applied uniformly
- [ ] No custom one-off styles (everything reusable)

### CSS Architecture
- [ ] CSS custom properties used for colors
- [ ] CSS custom properties used for spacing
- [ ] CSS custom properties used for typography
- [ ] Consistent class naming convention
- [ ] Utility classes follow logical naming
- [ ] Component classes follow BEM or similar
- [ ] No inline styles in HTML
- [ ] No !important declarations (except justified overrides)

---

## PART 9: BRAND GUARDRAILS VERIFICATION

### DO - Are We Doing These?
- [ ] Celebrating community and shared experience ✓
- [ ] Using warm, organic, analog-inspired aesthetics ✓
- [ ] Speaking like a fan, not a marketer ✓
- [ ] Honoring history while staying current ✓
- [ ] Connecting commerce to giving back ✓
- [ ] Making fans feel like family ✓

### DON'T - Are We Avoiding These?
- [ ] Corporate marketing language ✓ (not present)
- [ ] Over-polish that removes soul ✓ (not present)
- [ ] Forgetting live experience is central ✓ (featured)
- [ ] Ignoring charitable mission ✓ (honored)
- [ ] Artificial scarcity/FOMO tactics ✓ (not present)
- [ ] Speaking down to fans ✓ (not present)

---

## PART 10: SIGN-OFF CHECKLIST

### Designer Sign-Off
- [ ] Design adheres to all visual brand guidelines
- [ ] All brand elements properly applied
- [ ] Accessibility requirements met
- [ ] Responsive design tested on multiple devices
- [ ] Component states (hover, focus, active, disabled) defined
- [ ] Design system documented
- [ ] Design exported for developer handoff
- [ ] Approved by design lead

### Developer Sign-Off
- [ ] Design implemented pixel-accurate (within reasonable bounds)
- [ ] All states and interactions functional
- [ ] Accessibility tested (keyboard, screen reader)
- [ ] Performance optimized (Lighthouse 80+)
- [ ] Responsive tested on real devices
- [ ] Cross-browser tested (Chrome, Firefox, Safari, Edge)
- [ ] PWA functionality working (offline mode, caching)
- [ ] Approved by tech lead

### Brand/Marketing Sign-Off
- [ ] Design reinforces brand identity
- [ ] Messaging aligns with brand voice
- [ ] Community values reflected
- [ ] No dilution of brand authenticity
- [ ] Setlist/tour/content prioritization correct
- [ ] Warehouse positioning prominent
- [ ] Historical respect evident
- [ ] Approved by brand strategist

### Stakeholder Sign-Off
- [ ] Meets project requirements
- [ ] Aligns with business objectives
- [ ] Ready for user testing
- [ ] Ready for launch
- [ ] Approved by project stakeholder

---

## SCORING RUBRIC

Use this to score design alignment (0–10 scale):

### 9–10: DMB Approved
- Hits all brand pillars
- Distinctive and authentic
- Every element serves purpose
- Would be proud to show Dave himself
- Reinforces brand identity strongly

### 7–8: On Brand
- Hits most major brand pillars
- Clearly DMB visual language
- Minor tweaks might strengthen
- Would be comfortable presenting
- Good brand reinforcement

### 5–6: Acceptable But Needs Work
- Hits some brand pillars
- Generic in some areas
- Could be any band's site
- Requires revision before launch
- Needs stronger brand connection

### 3–4: Off Brand
- Missing key visual elements
- Generic or corporate feel
- Violates brand guidelines
- Significant redesign needed
- Doesn't feel like DMB

### 1–2: Completely Off Brand
- Looks nothing like DMB
- Contradicts brand values
- Start over
- Not acceptable for launch
- Needs complete rethinking

---

## FINAL QUESTION

Before approving any design, answer this question honestly:

**"Would a longtime DMB fan look at this and immediately recognize it as part of the DMB universe, or would they think it was built by a generic music streaming service?"**

If the answer is the latter, send it back for revision.

---

**Document Version:** 1.0
**Last Updated:** January 19, 2026
**Prepared For:** DMB Brand Guardians, Design Teams, QA Reviewers
**Reference:** DMB Brand DNA + Visual Design System Analysis
