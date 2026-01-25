# Accessibility Patterns Index - DMB Almanac

**Quick reference**: Exact file locations and line numbers for all accessibility patterns found in the audit.

---

## Pattern Inventory by Category

### ARIA Patterns (Already Correct - No Changes Needed)

#### 1. Form Labels with aria-describedby
- **File**: `/Users/louisherman/Documents/dmb-almanac/components/search/SearchInput/SearchInput.tsx`
- **Lines**: 432-434 (label), 453-471 (input)
- **Pattern**: Semantic `<label htmlFor>` + `aria-describedby` + `aria-activedescendant`
- **Status**: ✅ WCAG 2.1 AA compliant
- **Assessment**: Excellent combobox pattern for search with dropdown

#### 2. Status Announcements with aria-live
- **File**: `/Users/louisherman/Documents/dmb-almanac/components/search/SearchInput/SearchInput.tsx`
- **Line**: 550 (voice feedback)
- **Pattern**: `<div role="status" aria-live="polite">`
- **Status**: ✅ WCAG 2.1 AA compliant
- **Assessment**: Correct use of aria-live for dynamic updates

- **File**: `/Users/louisherman/Documents/dmb-almanac/components/pwa/DownloadForOffline.tsx`
- **Line**: 363 (progress text)
- **Pattern**: `aria-live="polite" aria-atomic="true"`
- **Status**: ✅ Correct - announces entire progress block

- **File**: `/Users/louisherman/Documents/dmb-almanac/app/layout.tsx`
- **Line**: 206
- **Pattern**: `aria-live="polite"`
- **Status**: ✅ Correct usage

- **File**: `/Users/louisherman/Documents/dmb-almanac/components/pwa/ServiceWorkerProvider.tsx`
- **Line**: 243
- **Pattern**: `<div role="status" aria-live="polite">`
- **Status**: ✅ Offline indicator announcement

- **File**: `/Users/louisherman/Documents/dmb-almanac/app/search/page.tsx`
- **Lines**: 236, 261
- **Pattern**: `role="status" aria-live="polite"`
- **Status**: ✅ Search results announcements

#### 3. Native Dialog Elements
- **File**: `/Users/louisherman/Documents/dmb-almanac/components/pwa/IOSInstallGuide.tsx`
- **Lines**: 76-81
- **Pattern**: Native `<dialog>` element with `aria-labelledby`
- **Status**: ✅ WCAG 2.1 AAA compliant (best practice)
- **Code**: `<dialog ref={dialogRef} aria-labelledby="ios-install-title" onClose={handleDialogClose}>`

- **File**: `/Users/louisherman/Documents/dmb-almanac/components/pwa/InstallPrompt.tsx`
- **Line**: 320
- **Pattern**: Native `<dialog>` element
- **Status**: ✅ Correct implementation

- **File**: `/Users/louisherman/Documents/dmb-almanac/components/pwa/UpdatePrompt.tsx`
- **Line**: 34 (showModal call)
- **Status**: ✅ Proper dialog management

#### 4. Native Focus Management
- **File**: `/Users/louisherman/Documents/dmb-almanac/app/search/page.tsx`
- **Line**: 62
- **Pattern**: `autoFocus` prop on SearchInput
- **Status**: ✅ Native autoFocus (correct)

- **File**: `/Users/louisherman/Documents/dmb-almanac/components/search/SearchInput/SearchInput.tsx`
- **Line**: 334
- **Pattern**: `inputRef.current?.focus()` after user action
- **Status**: ✅ Correct programmatic focus (only after user initiates)

- **File**: `/Users/louisherman/Documents/dmb-almanac/app/search/SearchResultsTabs.tsx`
- **Line**: 76
- **Pattern**: `tabRefs.current[newIndex]?.focus()` for tab navigation
- **Status**: ✅ Proper focus management for keyboard navigation

#### 5. aria-pressed for Toggle Buttons
- **File**: `/Users/louisherman/Documents/dmb-almanac/components/ui/FavoriteButton/FavoriteButton.tsx`
- **Line**: 216
- **Pattern**: `aria-pressed={isFavorited}`
- **Status**: ✅ Correct for toggle buttons

- **File**: `/Users/louisherman/Documents/dmb-almanac/components/search/SearchInput/SearchInput.tsx`
- **Line**: 519
- **Pattern**: `aria-pressed={isListening}` on voice button
- **Status**: ✅ Announces button state correctly

- **File**: `/Users/louisherman/Documents/dmb-almanac/app/my-shows/page.tsx`
- **Line**: 57
- **Pattern**: `aria-pressed={star <= (rating ?? 0)}` for rating toggle
- **Status**: ✅ State announcement

#### 6. aria-expanded for Disclosure/Combobox
- **File**: `/Users/louisherman/Documents/dmb-almanac/components/search/SearchInput/SearchInput.tsx`
- **Line**: 468
- **Pattern**: `aria-expanded={showSuggestions && (displaySuggestions.length > 0 || query.length < 2)}`
- **Status**: ✅ Combobox dropdown state (note: biome lint override at line 452)
- **Note**: Override is appropriate because `aria-expanded` is valid on combobox role=none input

#### 7. aria-labelledby for Section Headers
**Multiple files use this pattern correctly** - sections labeled by heading IDs:
- `/Users/louisherman/Documents/dmb-almanac/app/search/page.tsx` (lines 66, 92, 122)
- `/Users/louisherman/Documents/dmb-almanac/app/stats/page.tsx` (lines 112, 135, 170, 193, 216, 236)
- `/Users/louisherman/Documents/dmb-almanac/app/search/SearchResultsTabs.tsx` (lines 242, 249, 282, 314, 352, 367, 382)
- `/Users/louisherman/Documents/dmb-almanac/app/discography/page.tsx` (line 223)
- `/Users/louisherman/Documents/dmb-almanac/app/venues/page.tsx` (lines 90, 104)
- `/Users/louisherman/Documents/dmb-almanac/app/shows/[showId]/page.tsx`
- `/Users/louisherman/Documents/dmb-almanac/components/pwa/IOSInstallGuide.tsx` (line 79)
- `/Users/louisherman/Documents/dmb-almanac/components/pwa/InstallPromptBanner.tsx` (line 113)
- `/Users/louisherman/Documents/dmb-almanac/components/pwa/InstallPrompt.tsx` (line 320)
- `/Users/louisherman/Documents/dmb-almanac/components/pwa/UpdatePrompt.tsx` (line 58)
- `/Users/louisherman/Documents/dmb-almanac/components/layout/Footer/Footer.tsx` (lines 62, 78, 94)

**Status**: ✅ **Excellent pattern - used consistently throughout application**
**Assessment**: Proper use of `aria-labelledby` to associate sections with headings

---

### Patterns Requiring Optimization

#### 1. SVG role="img" (Remove Redundant Attributes)

**Badge - Released Recording Indicator**
- **File**: `/Users/louisherman/Documents/dmb-almanac/components/ui/Badge/Badge.tsx`
- **Lines**: 67-96
- **Current**: `<span role="img" aria-label="...">` wrapping SVG
- **Issue**: Redundant `role="img"` - title attribute + SVG sufficient
- **Fix**: Remove `role="img"` and `aria-label` attributes
- **WCAG**: 1.1.1 Non-text Content
- **Effort**: 1 minute

**Setlist Segue Arrow**
- **File**: `/Users/louisherman/Documents/dmb-almanac/components/shows/Setlist/Setlist.tsx`
- **Lines**: 85-91
- **Current**: `<span role="img" aria-label="segues into next song">`
- **Issue**: Symbol with title sufficient, `role="img"` redundant
- **Fix**: Replace `role="img"` with `aria-hidden="true"`
- **WCAG**: 1.1.1 Non-text Content
- **Effort**: 1 minute

**Guest Network Visualization**
- **File**: `/Users/louisherman/Documents/dmb-almanac/components/visualizations/GuestNetwork.tsx`
- **Lines**: 397-409
- **Current**: `<svg role="img" aria-label="...">`
- **Issue**: SVG with `<title>` and `<desc>` is sufficient
- **Fix**: Keep `aria-label` or remove and rely on `<title>`+`<desc>`
- **WCAG**: 1.1.1 Non-text Content
- **Effort**: 1 minute

**Rarity Scorecard Radar Chart**
- **File**: `/Users/louisherman/Documents/dmb-almanac/components/visualizations/RarityScorecard.tsx`
- **Lines**: 421-435
- **Current**: `<svg role="img" aria-label="...">`
- **Issue**: SVG with `<title>` and `<desc>` provides full description
- **Fix**: Keep `aria-label` OR remove and rely on `<title>`+`<desc>`
- **WCAG**: 1.1.1 Non-text Content
- **Effort**: 1 minute

---

#### 2. Custom List Semantics (Replace with Semantic HTML)

**Guests Grid with Custom Role**
- **File**: `/Users/louisherman/Documents/dmb-almanac/app/guests/page.tsx`
- **Lines**: 65-74
- **Current**: `<div role="list">` with `<Link role="listitem">`
- **Issue**: CSS Grid layout using role="list", but not truly a semantic list
- **Context**: Ranked guest musicians displayed in grid layout
- **Fix Option A**: Use `<ul>` + `<li>` (works with CSS Grid)
- **Fix Option B**: Use `<section aria-labelledby>` (better semantics for grid)
- **WCAG**: 1.3.1 Info and Relationships
- **Effort**: 15 minutes (includes CSS verification)

**Shows by Year Chart**
- **File**: `/Users/louisherman/Documents/dmb-almanac/app/stats/page.tsx`
- **Lines**: 134-149
- **Current**: `<div role="list">` with `<div role="listitem">`
- **Issue**: Chart visualization with years - IS a list (ordered chronologically)
- **Context**: Horizontal bar chart showing show count by year
- **Fix**: Use `<ol>` (ordered list) instead of div[role=list]
- **WCAG**: 1.3.1 Info and Relationships
- **Effort**: 15 minutes (CSS Grid compatible with `<ol>`)
- **Note**: Biome lint suppress at line 134 explains reasoning

---

#### 3. Custom Button with tabindex and role

**Rarity Scorecard Legend Items**
- **File**: `/Users/louisherman/Documents/dmb-almanac/components/visualizations/RarityScorecard.tsx`
- **Lines**: 340-365
- **Current**: `<div tabIndex={0} role="button" aria-label="...">`
- **Issue**: Custom div button when native `<button>` available
- **Context**: Legend items showing song rarity scores - clickable to filter chart
- **Handlers**:
  - `onMouseLeave`, `onFocus`, `onBlur` (hover state management)
  - `onClick` (select song)
- **Fix**: Replace with `<button type="button">`
- **Benefits**:
  - Keyboard Enter/Space handled automatically
  - Focus management automatic
  - Screen reader announces as button
  - Remove tabIndex, role attributes
- **WCAG**: 2.1.1 Keyboard, 4.1.2 Name Role Value
- **Effort**: 20 minutes (includes CSS reset)
- **CSS Impact**: Need `all: unset;` on button to maintain design

---

#### 4. Voice Input Screen Reader Feedback

**Voice Search Button & Live Region**
- **File**: `/Users/louisherman/Documents/dmb-almanac/components/search/SearchInput/SearchInput.tsx`
- **Lines**: 513-550
- **Current**:
  ```tsx
  <button aria-label={...} aria-pressed={isListening} />
  <div className={styles.voiceFeedback} role="status" aria-live="polite">
  ```
- **Issue**: Voice recognition results not announced to screen readers
- **Context**: Web Speech API integration for voice search (Chrome 143+)
- **Fix**: Populate live region with recognition state + results
  ```tsx
  <div role="status" aria-live="polite">
    {isListening && "Listening for voice input"}
    {voiceError && `Voice input error: ${voiceError}`}
  </div>
  ```
- **WCAG**: 4.1.3 Status Messages
- **Effort**: 10 minutes
- **Testing**: Manual voice input with screen reader

---

#### 5. Navigation Landmarks Verification

**Root Layout**
- **File**: `/Users/louisherman/Documents/dmb-almanac/app/layout.tsx`
- **Lines**: 1-250+ (not fully read)
- **Need to verify**:
  1. Header component uses `<nav>` with `aria-label`
  2. Main content in `<main>` element
  3. Footer uses `<footer>` element
  4. Multiple `<nav>` elements have distinct `aria-label` values
- **Skip Link**: Check if implemented (WCAG 2.4.1)
- **WCAG**: 2.4.1 Bypass Blocks, 1.3.1 Info and Relationships
- **Effort**: 20 minutes (audit + implementation)

**Header Component**
- **File**: `/Users/louisherman/Documents/dmb-almanac/components/layout/Header/Header.tsx`
- **Need to verify**: Uses `<nav>` with `aria-label="Main navigation"`

**Footer Component**
- **File**: `/Users/louisherman/Documents/dmb-almanac/components/layout/Footer/Footer.tsx`
- **Lines**: 62, 78, 94 (found nav with aria-labelledby)
- **Status**: ✅ Multiple navs with `aria-labelledby` for section labels
- **Assessment**: Good pattern for multiple footer navigation sections

---

## Pattern Frequency Analysis

### Patterns by Frequency

**High Usage (Good Maintainability)**:
- `aria-labelledby` - Used 30+ times (excellent)
- `aria-hidden="true"` - Used 168+ times (good for decorative content)
- `role="status" aria-live="polite"` - Used 6+ times (consistent pattern)

**Moderate Usage (Worth Standardizing)**:
- `aria-label` - Used throughout for descriptive labels
- `role="presentation"` - Used for non-semantic layout elements

**Single Instances (Need Review)**:
- `role="button"` on div - 1 instance (RarityScorecard)
- `role="img"` - 4 instances (Badge, Setlist, visualizations)
- `role="list"` on div - 2 instances (Guests, Stats)

---

## WCAG Coverage Summary

### Fully Compliant Patterns

| Criterion | Pattern | Files | Status |
|-----------|---------|-------|--------|
| 1.3.1 Info and Relationships | Semantic labels, aria-labelledby | 30+ files | ✅ |
| 2.1.1 Keyboard | Native inputs, autoFocus, focus management | SearchInput, Dialogs | ✅ |
| 2.4.1 Bypass Blocks | Skip links (verify presence) | layout.tsx | ⚠️ Need verify |
| 2.5.1 Pointer Alternatives | Button handlers, click + keyboard | Throughout | ✅ |
| 3.3.2 Labels or Instructions | Form labels, aria-describedby | SearchInput | ✅ |
| 4.1.2 Name Role Value | Semantic HTML, ARIA correctly used | Throughout | ✅ |
| 4.1.3 Status Messages | aria-live regions | 6+ instances | ✅ |

### Optimization Opportunities (Still Compliant)

| Criterion | Current | Optimized |
|-----------|---------|-----------|
| 1.1.1 Non-text Content | role="img" on SVG | Use <title>+<desc> only |
| 1.3.1 Info and Relationships | role="list" on div | Use <ul>+<li> or <section> |
| 2.1.1 Keyboard | div[role=button] with tabindex | Use <button> element |
| 4.1.3 Status Messages | aria-live="polite" | Add voice feedback announcement |

---

## Implementation Dependencies

### Independent Changes (No Dependencies)
1. SVG role="img" cleanup - 4 files
2. Voice input live region - 1 file

### Minor Dependencies
3. Custom button → semantic button - RarityScorecard only
4. Navigation landmark verification - layout.tsx + Header/Footer

### Moderate Dependencies
5. List semantics - May require CSS verification for Grid layouts

---

## File Change Summary

```
Files requiring changes: 9
Lines requiring changes: ~40
Estimated effort: 3 hours total

PRIORITY ORDER:
1. SVG cleanup (5 min each × 4 = 20 min) - Very low risk
2. Voice input live region (10 min) - Low risk
3. List semantics (45 min) - Low risk, CSS impact unknown
4. Button element (45 min) - Low risk, CSS impact expected
5. Landmark verification (20 min) - Zero risk, audit only
```

---

## Cross-Reference Guide

**By File**:
- Badge.tsx: SVG role="img" cleanup
- Setlist.tsx: SVG role="img" cleanup
- GuestNetwork.tsx: SVG role="img" cleanup
- RarityScorecard.tsx: SVG role="img" cleanup + button element
- guests/page.tsx: List semantics
- stats/page.tsx: List semantics
- SearchInput.tsx: Voice input live region + form labels (excellent)
- IOSInstallGuide.tsx: Native dialog (excellent)
- layout.tsx: Landmark verification

**By WCAG Criterion**:
- 1.1.1: SVG accessibility (4 files)
- 1.3.1: Semantic HTML, labelledby (9 files)
- 2.1.1: Keyboard, button element (3 files)
- 2.4.1: Landmarks, skip link (1 file)
- 4.1.3: Status messages, voice feedback (2 files)

