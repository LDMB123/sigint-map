---
name: semantic-html-quick-fix
version: 1.0.0
description: **Focus**: Copy-paste ready code solutions with minimal changes
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: deployment
complexity: advanced
tags:
  - deployment
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: projects/dmb-almanac/app/docs/archive/misc/SEMANTIC_HTML_QUICK_FIX_GUIDE.md
migration_date: 2026-01-25
---

# Semantic HTML Quick Fix Guide - DMB Almanac

**Focus**: Copy-paste ready code solutions with minimal changes

---

## Fix #1: SVG Accessibility Simplification

### Badge Component (Badge.tsx:71)

**Current** (24 lines):
```tsx
<span
  ref={ref}
  className={`${styles.releasedBadge} ${className}`}
  title="Officially released"
  role="img"
  aria-label="Officially released recording"
  {...props}
>
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={styles.cdIcon}
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
  </svg>
</span>
```

**Simplified** (18 lines, 3 attributes removed):
```tsx
<span
  ref={ref}
  className={`${styles.releasedBadge} ${className}`}
  title="Officially released"
  {...props}
>
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={styles.cdIcon}
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
  </svg>
</span>
```

**Changes**:
- Remove `role="img"` - title + aria-hidden SVG sufficient
- Remove `aria-label` - title attribute covers it
- Keep `aria-hidden="true"` on SVG for screen readers

**Verification**: Badge still announces as "Officially released" via title attribute

---

### Setlist Segue Arrow (Setlist.tsx:88)

**Current** (5 lines):
```tsx
<span
  className={styles.segue}
  title="Segue into next song"
  aria-label="segues into next song"
  role="img"
>
  →
</span>
```

**Simplified** (3 lines, remove 2 attributes):
```tsx
<span
  className={styles.segue}
  title="Segues into next song"
  aria-hidden="true"
>
  →
</span>
```

**Alternative** (if context needed for screen readers):
```tsx
<span className={styles.segue} title="Segues into next song" aria-hidden="true">
  →
</span>
<span className="sr-only">segues into next song</span>
```

**Changes**:
- Remove `role="img"` - symbol with title is sufficient
- Remove `aria-label` - replace with `aria-hidden="true"`
- OR keep text accessible with sr-only span if symbol alone is unclear

---

### SVG Visualizations (GuestNetwork.tsx:400, RarityScorecard.tsx:426)

**Current** (4 lines):
```tsx
<svg
  ref={svgRef}
  className={styles.svg}
  role="img"
  aria-label="Guest musician collaboration network"
>
  <title>Guest Musician Network Graph</title>
  <desc>Force-directed graph showing guest musicians...</desc>
</svg>
```

**Simplified** (2 attributes removed):
```tsx
<svg
  ref={svgRef}
  className={styles.svg}
  aria-label="Guest musician collaboration network"
>
  <title>Guest Musician Network Graph</title>
  <desc>Force-directed graph showing guest musicians...</desc>
</svg>
```

**Or most minimal** (let `<title>`+`<desc>` do the work):
```tsx
<svg ref={svgRef} className={styles.svg}>
  <title>Guest Musician Network Graph</title>
  <desc>Force-directed graph showing guest musicians and their collaborations. Node size represents total appearances, edge thickness represents collaboration frequency. Nodes are colored by primary instrument type.</desc>
</svg>
```

**Changes**:
- Remove `role="img"` - SVG with `<title>` and `<desc>` is sufficient
- Keep `aria-label` only if it needs to differ from `<title>`
- Ensure `<desc>` is comprehensive (already is in RarityScorecard)

**Verification**: Both NVDA and VoiceOver read `<title>` and `<desc>` for SVG images

---

## Fix #2: Custom List Semantics

### Guests Grid (guests/page.tsx:66)

**Current** (10 lines):
```tsx
{/* biome-ignore lint/a11y/useSemanticElements: Custom grid layout... */}
<div className={styles.guestGrid} role="list" aria-label="Guest musicians list">
  {sortedGuests.map((guest, index) => (
    <Link
      key={guest.id}
      href={`/guests/${guest.slug}`}
      className={styles.guestLink}
      aria-label={`${guest.name}, ranked #${index + 1}...`}
      role="listitem"
    >
```

**Option A: Use semantic list** (if truly a list):
```tsx
<ul className={styles.guestGrid} aria-label="Guest musicians list">
  {sortedGuests.map((guest, index) => (
    <li key={guest.id}>
      <Link
        href={`/guests/${guest.slug}`}
        className={styles.guestLink}
        aria-label={`${guest.name}, ranked #${index + 1} with ${guest.totalAppearances || 0} appearances`}
      >
        {/* Card content */}
      </Link>
    </li>
  ))}
</ul>
```

**Option B: Use section with heading** (if not truly a list):
```tsx
<section aria-labelledby="guests-heading">
  <h2 id="guests-heading" className="sr-only">Guest Musicians</h2>
  <div className={styles.guestGrid}>
    {sortedGuests.map((guest, index) => (
      <Link
        key={guest.id}
        href={`/guests/${guest.slug}`}
        className={styles.guestLink}
        aria-label={`${guest.name}, ranked #${index + 1} with ${guest.totalAppearances || 0} appearances`}
      >
        {/* Card content */}
      </Link>
    ))}
  </div>
</section>
```

**CSS**: Both work with CSS Grid without changes:
```css
.guestGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

/* Remove list styling if using semantic list */
ul.guestGrid {
  list-style: none;
  padding: 0;
  margin: 0;
}
```

**Changes**:
- Remove `role="list"` and `role="listitem"`
- Remove linter ignore comment
- Choose semantic approach based on content

---

### Stats Year Chart (stats/page.tsx:135)

**Current** (8 lines):
```tsx
{/* biome-ignore lint/a11y/useSemanticElements: Custom visualization chart... */}
<div className={styles.yearChart} role="list" aria-labelledby="shows-by-year-heading">
  {recentYears.map((item) => (
    <div key={item.year} className={styles.yearRow} role="listitem">
      <Link href={`/tours/${item.year}`}...>
```

**Simplified** (use section + ol):
```tsx
<ol className={styles.yearChart} aria-labelledby="shows-by-year-heading">
  {recentYears.map((item) => (
    <li key={item.year} className={styles.yearRow}>
      <Link href={`/tours/${item.year}`} className={styles.yearLabel}>
        {item.year}
      </Link>
      <div className={styles.yearBar} role="presentation" aria-hidden="true">
        <div
          className={styles.yearFill}
          style={
            {
              "--progress": `${(item.count / maxShowCount) * 100}%`,
            } as React.CSSProperties
          }
        />
      </div>
    </li>
  ))}
</ol>
```

**CSS**:
```css
.yearChart {
  list-style: none;
  padding: 0;
  margin: 0;
}

.yearRow {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
}
```

**Changes**:
- Replace `<div role="list">` with `<ol>` (it IS an ordered list!)
- Replace `<div role="listitem">` with `<li>`
- Keep `role="presentation"` on non-semantic bar visualization

---

## Fix #3: Custom Button Element

### RarityScorecard Legend (RarityScorecard.tsx:354)

**Current** (12 lines):
```tsx
<div
  onMouseLeave={() => setHoveredSong(null)}
  onFocus={() => setHoveredSong(song.songId)}
  onBlur={() => setHoveredSong(null)}
  tabIndex={0}
  role="button"
  aria-label={`${song.title} - Rarity Score: ${Math.round(song.overallRarityScore)}`}
  className={styles.legendItem}
  onClick={() => handleSelectSong(song.songId)}
>
```

**Semantic** (11 lines, cleaner):
```tsx
<button
  type="button"
  onMouseLeave={() => setHoveredSong(null)}
  onFocus={() => setHoveredSong(song.songId)}
  onBlur={() => setHoveredSong(null)}
  aria-label={`${song.title} - Rarity Score: ${Math.round(song.overallRarityScore)}`}
  className={styles.legendItem}
  onClick={() => handleSelectSong(song.songId)}
>
```

**CSS** (reset button appearance):
```css
.legendItem {
  /* Remove button default styling */
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  background: transparent;
  transition: background-color 0.2s;
}

.legendItem:hover {
  background-color: var(--hover-bg);
}

/* Maintain visible focus indicator */
.legendItem:focus {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
}

/* Or use focus-visible for keyboard-only focus */
.legendItem:focus-visible {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
}
```

**Changes**:
- Replace `<div role="button" tabindex="0">` with `<button type="button">`
- Remove `role="button"` - no longer needed
- Remove `tabIndex={0}` - native button handles it
- Browser now handles:
  - Enter/Space key activation
  - Focus management
  - Screen reader announcements
  - Keyboard tab order

**No change to JS event handlers** - onClick still works

---

## Fix #4: Voice Input Live Region

### SearchInput (SearchInput.tsx:550)

**Current** (no live region for voice results):
```tsx
{showVoiceSearch && voiceSupported && (
  <button
    type="button"
    onClick={isListening ? stopListening : startListening}
    className={styles.voiceButton}
    aria-label={isListening ? "Stop voice search" : "Start voice search"}
    aria-pressed={isListening}
  >
    {/* icon */}
  </button>
)}
```

**Enhanced** (add live region):
```tsx
{showVoiceSearch && voiceSupported && (
  <>
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      className={styles.voiceButton}
      aria-label={isListening ? "Stop voice search" : "Start voice search"}
      aria-pressed={isListening}
    >
      {/* icon */}
    </button>

    {/* Add live region for voice recognition feedback */}
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {isListening && "Listening for voice input"}
      {voiceError && `Voice input error: ${voiceError}`}
    </div>
  </>
)}
```

**CSS** (sr-only class):
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

**JavaScript** (optional: more verbose feedback):
```tsx
const [voiceStatus, setVoiceStatus] = useState<string>("");

const startListening = () => {
  setIsListening(true);
  setVoiceStatus("Listening for voice input");
  recognition.start();
};

recognition.onresult = (event) => {
  const transcript = Array.from(event.results)
    .map(result => result[0].transcript)
    .join("");
  setVoiceStatus(`Recognized: ${transcript}`);
  inputRef.current?.focus();
};

recognition.onerror = (event) => {
  setVoiceStatus(`Voice input error: ${event.error}`);
  setIsListening(false);
};

// Then in JSX:
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {voiceStatus}
</div>
```

**Changes**:
- Add live region announcement
- Screen readers now hear "Listening..." when voice starts
- Screen readers announce recognized text immediately
- Better UX for voice users

---

## Fix #5: Navigation Landmarks

### Audit Header/Footer (layout.tsx)

**Current** (assumed):
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

**With Skip Link** (WCAG 2.4.1):
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Skip link - visible on focus */}
        <a href="#main-content" className={styles.skipLink}>
          Skip to main content
        </a>

        <Header />

        <main id="main-content">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
```

**CSS for Skip Link**:
```css
.skipLink {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px;
  background-color: var(--brand-color);
  color: white;
  text-decoration: none;
  z-index: 9999;
}

.skipLink:focus {
  top: 0;
}
```

### In Header Component

**Ensure navigation uses `<nav>`**:
```tsx
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><Link href="/songs">Songs</Link></li>
      <li><Link href="/shows">Shows</Link></li>
      <li><Link href="/venues">Venues</Link></li>
      <li><Link href="/guests">Guests</Link></li>
    </ul>
  </nav>
</header>
```

### In Footer Component

**Ensure semantic footer**:
```tsx
<footer>
  <nav aria-label="Footer navigation">
    <div>
      <h3 id="footer-browse">Browse</h3>
      <ul aria-labelledby="footer-browse">
        <li><Link href="/songs">Songs</Link></li>
        <li><Link href="/shows">Shows</Link></li>
      </ul>
    </div>

    <div>
      <h3 id="footer-discover">Discover</h3>
      <ul aria-labelledby="footer-discover">
        <li><Link href="/stats">Statistics</Link></li>
        <li><Link href="/tours">Tours</Link></li>
      </ul>
    </div>
  </nav>

  <div>
    <p>&copy; 2026 DMB Almanac</p>
  </div>
</footer>
```

**Changes**:
- Wrap header nav in `<nav>` element
- Use `<footer>` for footer, not `<div>`
- Add skip link at top of page
- Label multiple navs with `aria-label` to distinguish them

---

## Implementation Checklist

### Before Making Changes
- [ ] Create feature branch: `git checkout -b refactor/semantic-html-a11y`
- [ ] Run current tests: `npm test`
- [ ] Run axe audit: Lighthouse in DevTools
- [ ] Screenshot current state

### Phase 1: SVG Cleanup (15 min)
- [ ] Remove `role="img"` from Badge.tsx:71
- [ ] Remove `role="img"` from Setlist.tsx:88
- [ ] Simplify GuestNetwork.tsx:400
- [ ] Simplify RarityScorecard.tsx:426

**Test**:
```bash
npm run lint
npm run build
# Open DevTools > Accessibility tree, verify SVGs still labeled
```

### Phase 2: List Semantics (45 min)
- [ ] Replace div[role=list] in guests/page.tsx:66
- [ ] Replace div[role=list] in stats/page.tsx:135

**Test**:
```bash
npm run lint
npm run build
# Navigate with screen reader, verify list structure
```

### Phase 3: Button Element (45 min)
- [ ] Replace div[role=button] in RarityScorecard.tsx:354
- [ ] Update CSS in RarityScorecard.module.css

**Test**:
```bash
npm run lint
npm run build
# Keyboard test: Tab to button, press Enter/Space
```

### Phase 4: Live Region (30 min)
- [ ] Add live region to SearchInput.tsx:550

**Test**:
```bash
npm run lint
npm run build
# Voice search test: Listen for announcements
```

### Phase 5: Landmarks (20 min)
- [ ] Verify Header uses `<nav>`
- [ ] Verify Footer uses `<footer>`
- [ ] Add skip link to layout.tsx

**Test**:
```bash
npm run lint
npm run build
# DevTools > Accessibility panel, check landmark tree
```

### After All Changes
- [ ] Run full test suite: `npm test`
- [ ] Type check: `npx tsc --noEmit`
- [ ] Lint: `npm run lint`
- [ ] Manual accessibility audit with screen reader
- [ ] Keyboard navigation walkthrough
- [ ] Create PR with detailed changelog

---

## Testing Commands

```bash
# Quick accessibility check
npx axe-core --include="*" 2>/dev/null | grep "violations" -A 20

# Full TypeScript check
npx tsc --noEmit

# ESLint with accessibility rules
npm run lint

# Build and test
npm run build && npm run start

# Manual screen reader testing (macOS)
# Open page in Chrome, then enable VoiceOver:
# Cmd + F5, then use VO + arrows to navigate

# Manual keyboard testing
# Tab through all elements, Shift+Tab backwards
# Test all buttons: Enter/Space keys
# Test select dropdowns: Arrow keys
# Test modals: Tab focus trapped, Escape closes
```

---

## References

- WCAG 2.1 Semantic HTML: https://www.w3.org/WAI/tutorials/
- MDN HTML Semantics: https://developer.mozilla.org/en-US/docs/Glossary/semantics
- ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
- SVG Accessibility: https://www.w3.org/WAI/test-evaluate/

