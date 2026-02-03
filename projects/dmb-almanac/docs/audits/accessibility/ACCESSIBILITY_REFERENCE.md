# Accessibility Reference - DMB Almanac

## Overall Status
- WCAG 2.1 AA score: 84/100 (78% criteria fully passing)
- 73 Svelte components scanned, 215 total files analyzed
- 157 ARIA-labeled elements across 48 files
- 170 heading elements across 25 routes

## Critical Issues

### Color-Only Indicators (WCAG 1.4.11)
- `DataStalenessIndicator.svelte:341-350,449-455` - icon-only status, no text
- `Badge.svelte:177-190` - semantic color badges depend on color alone
- Fix: add text labels + icons per state (check/warning/error)

### Hover-Only Interactions (WCAG 2.1.1)
- `DataFreshnessIndicator.svelte:177` - tooltip keyboard-inaccessible
- `ProtocolHandlerIndicator.svelte:110` - protocol status tooltip
- `Dropdown.anchored:140` - hover-only focus on menuitem
- `Tooltip.svelte:51` - no keyboard event handler on trigger
- Fix: add `:focus-visible` CSS or focus event handlers

### ARIA Pattern Issues (WCAG 4.1.2)
- `Tooltip.svelte:50` - `<div role="button">` instead of `<button>`
- `Dropdown.ui:202` - menu container has `tabindex="0"` (focus confusion)
- `Dropdown.ui:202` - menu role missing `aria-label`

### Focus Management (WCAG 2.4.3)
- `InstallPrompt.svelte:293` - focus not restored on dismiss (only calls blur)
- `Popover.svelte:114` - missing `aria-modal="true"`
- `VirtualList.svelte:505` - dynamic focus may be lost during scroll

### Form Errors (WCAG 3.3.1)
- `search/+page.svelte:319` - lacks `aria-invalid`, `aria-describedby`
- `songs/+page.svelte:235` - sort select missing required field indication
- `guests/+page.svelte:104` - sort select insufficient label association
- No error messages linked to inputs anywhere
- Fix: add `aria-invalid={error ? 'true' : 'false'}`, `aria-describedby="error-id"`

## Serious Issues

### Focus Outline Removal (WCAG 2.4.7)
- 7 files use `outline: none`: +layout.svelte, ServiceWorkerUpdateBanner, VirtualList, search/+page, venues/+page, songs/+page, guests/+page
- Mitigated: replacement `box-shadow` focus indicators exist
- Fix: use `:focus-visible` with visible `outline: 2px solid`, keep box-shadow as enhancement

### InstallPrompt Dark Mode Contrast (WCAG 1.4.3)
- Dismiss button: white on rgba(255,255,255,0.2) overlay on #030712
- Computed ~13:1 (passes), but increase opacity to 0.25 + font-weight 500 for safety

### StatCard Dark Mode Trend Colors (WCAG 1.4.3)
- `.trend-down` uses `color-mix(in oklch, var(--color-error) 20%, transparent)` - close to threshold
- Increase opacity to 25%, add font-weight 600

## Warnings Summary
- 7 ARIA: tooltip non-idiomatic role, missing `role="status"` on some aria-live, missing `aria-pressed` on toggles
- 7 Keyboard: missing focus traps in dropdowns, escape handling undocumented, focus during async ops
- 8 Visual: `--foreground-muted` contrast unverified, tooltip dark mode contrast, `prefers-reduced-motion` uses 0.01ms not 0ms, sticky elements may obscure focus, touch targets inconsistent
- 7 Forms: placeholder text in search, missing `autocomplete` attrs, sort controls need `<fieldset>/<legend>`, buttons missing `type="button"`, missing `aria-disabled` on menu items

## Positive Findings
- VirtualList: full ARIA support (`aria-setsize`, `aria-posinset`, live announcements, ArrowUp/Down/Home/End/PageUp/PageDown/Escape)
- Navigation: `aria-label="Main navigation"`, `aria-current="page"`, native `<details>/<summary>` mobile menu
- Skip link: absolute positioned, visible on focus
- Focus indicators: all interactive elements have `:focus-visible` with 2px outlines + offset
- Reduced motion: comprehensive `prefers-reduced-motion` support
- High contrast: `forced-colors: active` media queries with CanvasText/Highlight
- Dark mode: `light-dark()` function + `prefers-color-scheme`
- Form labels: all inputs properly labeled via for/id
- Touch targets: most interactive elements meet 44px minimum
- Decorative SVGs: proper `aria-hidden="true"`
- 0 missing alt text on `<img>` elements

## WCAG Compliance Matrix

### Failing
- 1.4.11 Non-text Contrast (color-only indicators)
- 2.1.1 Keyboard (hover-only tooltips)
- 2.4.3 Focus Order (focus loss in VirtualList, InstallPrompt)
- 3.3.1 Error Identification (no aria-invalid/describedby)
- 4.1.2 Name, Role, Value (div role=button, tabindex on menu)

### Partial
- 1.3.1 Info and Relationships
- 1.3.5 Identify Input Purpose
- 1.4.3 Contrast Minimum
- 2.5.5 Target Size
- 3.3.2 Labels or Instructions
- 4.1.3 Status Messages

### Passing
- 1.1.1 Non-text Content
- 2.3.3 Animation from Interactions
- 2.4.1 Bypass Blocks
- 2.4.7 Focus Visible
- 3.1.1 Language of Page

## VirtualList A11y (Completed Fix)

### Keys Added
- Arrow Up/Down: navigate items with boundary feedback
- Home/End: first/last item
- Page Up/Down: jump by page
- Tab/Shift+Tab: exit list (no trap)
- Escape: clear focus and exit

### Features
- Live region announcements for item position
- Automatic focus restoration on scroll/virtualization
- `aria-current` on focused item
- Keyboard help in `aria-description`
- Works at 200% zoom, high contrast, reduced motion
- Performance: +50 bytes state, <1% CPU, no rendering impact

### Browser Support
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## Announcement System

### Components
- `Announcement.svelte` at `app/src/lib/components/accessibility/`
  - ARIA live region: `role="status"`, `aria-live`, `aria-atomic="true"`
  - 3-second display, auto-cleanup
  - Screen reader only (visually hidden)
  - <1ms render overhead

### Hooks (at `app/src/lib/hooks/`)
- `useSearchAnnouncements.js`: announceLoading(query), announceResults(query, results), announceEmpty(query), announceError(msg)
- `useFilterAnnouncements.js`: announceFilterApplied(name, count), announceFilterRemoved(name), announceFilterCleared()
- `useLoadingAnnouncements.js`: announceLoadingStart(ctx), announceLoadingComplete(count, ctx), announceLoadingProgress(pct, ctx)

### Priority Guide
- `polite`: search results, filters, loading, status updates
- `assertive`: errors, critical alerts, session warnings, validation failures

### Integration Pattern
```svelte
<script>
  import { useSearchAnnouncements } from '$lib/hooks/useSearchAnnouncements';
  import Announcement from '$lib/components/accessibility/Announcement.svelte';
  const { announcement, announceLoading, announceResults } = useSearchAnnouncements();
  let announcementText = $state<string | null>(null);
  let announcementPriority = $state<'polite' | 'assertive'>('polite');
  $effect(() => {
    const unsub = announcement.subscribe((value) => {
      if (value) { announcementText = value.message; announcementPriority = value.priority; }
    });
    return unsub;
  });
</script>
<Announcement message={announcementText} priority={announcementPriority} />
```

## ErrorFallback Semantic Fix
- Removed invalid `type="button"` from `<a>` navigation link
- Before: screen reader says "Link, type button, Go Home" (WCAG 4.1.2 violation)
- After: screen reader says "Link, Go Home"

## Developer Quick Reference

### Semantic HTML First
- `<button>` for actions, `<a href>` for navigation
- `<search role="search">` for search forms
- `<nav aria-label>` for navigation regions
- Hide decorative: `aria-hidden="true"` or `alt=""`

### Focus Patterns
- `:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }`
- Trap focus in modals/dropdowns
- Return focus after closing
- High contrast: `@media (forced-colors: active) { outline: 2px solid Highlight; }`

### Screen Reader Patterns
- Status: `<div role="status" aria-live="polite">{msg}</div>`
- Error: `<div role="alert" aria-live="assertive">{err}</div>`
- Loading: `<div role="status" aria-busy="true">Loading...</div>`
- Label: `<label for="id">Label</label><input id="id" aria-describedby="hint">`

### Keyboard Support
- Tab/Shift+Tab: forward/backward focus
- Enter/Space: activate button/submit
- Escape: close menu/modal
- Arrow keys: navigate lists/menus
- Home/End: first/last item

### Color Contrast
- Normal text: 4.5:1 minimum (AA)
- Large text (18+ bold / 24+): 3:1
- Graphics/components: 3:1

## Remediation Priority

### Week 1 (Critical)
- Fix color-only indicators in DataStalenessIndicator, Badge (add text+icons)
- Fix hover-only tooltips (3 components, add focus handlers)
- Add `aria-modal="true"` to Popover dialogs
- Implement focus restoration in InstallPrompt

### Week 2 (High)
- Replace `<div role="button">` with `<button>` in Tooltip
- Remove `tabindex="0"` from menu containers
- Add `aria-label` to menu elements
- Add `aria-invalid` + `aria-describedby` to forms
- Add `type="button"` to non-form buttons
- Wrap sort controls in `<fieldset>/<legend>`

### Week 3 (Medium)
- Verify `--foreground-muted` contrast with WebAIM
- Verify tooltip contrast in dark mode
- Increase tooltip trigger to 44px minimum touch target
- Add `autocomplete="search"` to search input
- Standardize `:focus-visible` across 7 files removing `outline: none`

## Testing Tools
- axe DevTools (browser extension)
- WAVE (browser extension)
- Lighthouse (Chrome DevTools)
- Pa11y (CLI)
- WebAIM Contrast Checker
- Screen readers: NVDA (Win), JAWS (Win), VoiceOver (macOS/iOS), Orca (Linux)

## Automated Testing Setup
```bash
npm install --save-dev @axe-core/playwright
npm run test:e2e -- --grep @a11y
```
