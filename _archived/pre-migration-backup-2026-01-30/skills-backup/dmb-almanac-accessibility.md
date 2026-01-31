---
name: dmb-almanac-accessibility
version: 1.0.0
description: This document outlines accessibility requirements and best practices for using the DMB Almanac UI components. All compon
recommended_tier: haiku
author: Claude Code
created: 2026-01-25
updated: 2026-01-25
category: scraping
complexity: intermediate
tags:
  - scraping
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
migrated_from: projects/dmb-almanac/app/docs/analysis/uncategorized/ACCESSIBILITY_GUIDE.md
migration_date: 2026-01-25
---

# Accessibility Guide - DMB Almanac Components

This document outlines accessibility requirements and best practices for using the DMB Almanac UI components. All components target **WCAG 2.1 AA** compliance.


### Token Management

See [Token Optimization Skills](./token-optimization/README.md) for all automatic optimizations.

## Skill Coordination

**When to delegate:**
- Complex multi-file tasks → `/parallel-audit`
- Specialized domains → Category-specific experts
- Performance issues → `/perf-audit`

**Works well with:**
- Related skills in same category
- Debug and optimization tools

## Table of Contents

1. [ErrorBoundary](#errorboundary)
2. [Dropdown](#dropdown)
3. [Tooltip](#tooltip)
4. [Table](#table)
5. [Pagination](#pagination)
6. [UpdatePrompt](#updateprompt)
7. [Testing Checklist](#testing-checklist)

---

## ErrorBoundary

### Accessibility Features

- **Alert Role**: Component has `role="alert"` and `aria-live="assertive"` for immediate announcement of errors
- **Keyboard Support**: Button supports Enter, Space, and Focus navigation
- **Focus Visibility**: Clear focus indicator on "Try again" button
- **High Contrast Mode**: Properly styled for Windows High Contrast Mode

### Usage

```svelte
<ErrorBoundary onError={(e) => console.error(e)}>
  <MyComponent />
</ErrorBoundary>
```

### Screen Reader Announcement

- Error title and message are linked with `aria-describedby`
- Screen readers announce: "Something went wrong. [Error message]. Button: Try again and dismiss error"

### Requirements for Developers

- The error message should be clear and actionable
- Consider providing a link to support or documentation
- All error text must meet 4.5:1 color contrast ratio

---

## Dropdown

### Accessibility Features

- **Menu Pattern**: Implements WAI-ARIA menu pattern with `role="menu"`
- **Trigger Button**: Has `aria-haspopup="menu"` and `aria-expanded` attributes
- **Keyboard Navigation**:
  - Arrow Up/Down: Navigate between items
  - Enter/Space: Select focused item
  - Escape: Close menu and return focus to trigger
  - Home/End: Jump to first/last item
- **Focus Trap**: Focus remains within menu when open
- **Focus Return**: Focus returns to trigger button when menu closes

### Usage - Basic

```svelte
<Dropdown id="my-menu" label="Actions">
  <button role="menuitem" onclick={handleAction1}>Action 1</button>
  <button role="menuitem" onclick={handleAction2}>Action 2</button>
  <hr />
  <button role="menuitem" onclick={handleDelete}>Delete</button>
</Dropdown>
```

### Usage - With Custom Trigger

```svelte
<Dropdown id="settings" ariaLabel="Settings menu">
  {#snippet trigger()}
    <svg aria-hidden="true"><!-- Icon --></svg>
  {/snippet}
  <button role="menuitem">Preferences</button>
  <button role="menuitem">Help</button>
</Dropdown>
```

### Menu Item Requirements

Each dropdown item should be one of:
- `<button role="menuitem">` for clickable items
- `<a href="..." role="menuitem">` for navigation items
- Add `role="menuitem"` to any custom interactive element

### Screen Reader Announcement

Screen readers announce: "Actions, popup button, not expanded. Menu. Button. [Menu items]"

### Requirements for Developers

1. **Always add `role="menuitem"`** to menu items for proper ARIA semantics
2. **Label the dropdown** with `label` or `ariaLabel` prop
3. **Handle closeOnSelect** carefully - close menu after selection for better UX
4. **Separate menu items** with `<hr />` when grouping related actions
5. **Icon usage** - Mark icons as `aria-hidden="true"` to prevent duplicate announcements

---

## Tooltip

### Accessibility Features

- **Tooltip Role**: Has `role="tooltip"` for semantic identification
- **Described By**: Trigger button has `aria-describedby` linking to tooltip content
- **Keyboard Support**: Opens on Focus, can be closed with Escape (non-native popover API)
- **Hover and Focus**: Accessible via mouse and keyboard
- **Native Popover API**: Uses `popover="hint"` for modern browsers (no light-dismiss)

### Usage - Text Tooltip

```svelte
<Tooltip
  id="help-tooltip-1"
  content="This helps you understand the feature"
  position="top"
>
  <button aria-label="Help">?</button>
</Tooltip>
```

### Usage - Rich Content Tooltip

```svelte
<Tooltip
  id="email-tooltip"
  position="right"
>
  {#snippet trigger()}
    <svg aria-hidden="true"><!-- Icon --></svg>
  {/snippet}
  <strong>Email Required</strong>
  <p>We'll use this to send you updates.</p>
</Tooltip>
```

### Screen Reader Announcement

- Trigger button announces: "Help button, described by email-tooltip"
- Tooltip content is read when focus moves to trigger

### Requirements for Developers

1. **Always provide `aria-label`** on trigger if no visible text
2. **Use descriptive content** - Tooltips should clarify, not repeat visible text
3. **Position thoughtfully** - Avoid positioning behind other content
4. **Don't use for critical info** - Tooltips are supplementary; required info goes in labels
5. **Mobile consideration** - Tooltips on focus may not be visible on touch devices

### Anti-Patterns

- Do NOT use tooltip for required form instructions (use `<label>` instead)
- Do NOT include interactive elements inside tooltips
- Do NOT use for hover-only interactions without keyboard alternative

---

## Table

### Accessibility Features

- **Semantic Structure**: Uses `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`
- **Table Caption**: Optional caption for sighted and screen reader users
- **Column Headers**: All headers have `scope="col"`
- **Sortable Columns**: Have `role="button"`, `tabindex="0"`, and `aria-sort`
- **Keyboard Navigation**:
  - Tab: Move through table
  - Enter/Space on header: Toggle sort
  - Enter/Space on row: Trigger row action (if clickable)
- **Focus Management**: Proper focus styling for headers and rows

### Usage - Basic

```svelte
<Table
  data={shows}
  columns={[
    { key: 'date', header: 'Date', sortable: true },
    { key: 'venue', header: 'Venue', sortable: true },
    { key: 'city', header: 'City' }
  ]}
  caption="Dave Matthews Band Concert History"
/>
```

### Usage - With Row Actions

```svelte
<Table
  data={songs}
  columns={[
    { key: 'title', header: 'Song Title', width: '200px' },
    { key: 'plays', header: 'Times Played', align: 'right', sortable: true }
  ]}
  summary="Complete Dave Matthews Band setlist analysis"
  onRowClick={(row) => goto(`/songs/${row.id}`)}
/>
```

### Usage - Custom Rendering

```svelte
<Table
  data={albums}
  columns={[
    {
      key: 'release',
      header: 'Release Date',
      render: (row) => new Date(row.release).toLocaleDateString()
    },
    { key: 'tracks', header: 'Track Count', align: 'center' }
  ]}
>
  {#snippet rowSnippet(album)}
    <td>{album.title}</td>
    <td>{album.artist}</td>
    <td>{album.tracks}</td>
  {/snippet}
</Table>
```

### Caption and Summary

- **Caption** (`caption` prop): Visible text above table describing content
- **Summary** (`summary` prop): Screen reader only, provides context for data analysis

Use both when appropriate:
```svelte
<Table
  data={data}
  columns={columns}
  caption="2024 Concert Schedule"
  summary="Table showing all scheduled shows with dates, venues, and ticket availability"
/>
```

### Screen Reader Announcement

- Caption is read first: "2024 Concert Schedule"
- Table structure is announced: "Table with 4 rows and 3 columns"
- Column headers are read for context
- Row selection is announced: "Button. Select row"

### Requirements for Developers

1. **Always use `scope="col"`** on header cells (handled automatically)
2. **Mark sortable columns** with `sortable: true`
3. **Provide `caption`** for all data tables
4. **Use `summary`** for complex tables with analysis
5. **Test sort order changes** - Ensure aria-sort updates correctly
6. **Handle row selection** - Use `aria-selected` on rows (handled automatically)
7. **Text alignment** - Use semantic `align` prop: 'left', 'center', 'right'

### Anti-Patterns

- Do NOT use tables for layout
- Do NOT omit column headers
- Do NOT make table rows clickable without clear visual and ARIA indication
- Do NOT nest interactive elements without proper focus management

---

## Pagination

### Accessibility Features

- **Navigation Role**: Has `role="navigation"` with `aria-label="Pagination navigation"`
- **Current Page**: Active page button has `aria-current="page"`
- **Button Labels**: All buttons have descriptive `aria-label` attributes
- **Keyboard Navigation**: All buttons are keyboard accessible (Tab key)
- **Focus Visibility**: Clear focus indicators on all buttons
- **Disabled State**: Previous/First buttons disabled on page 1, Next/Last on final page

### Usage

```svelte
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={(page) => currentPage = page}
  showFirstLast={true}
  siblingCount={1}
/>
```

### Screen Reader Announcement

- Nav: "Navigation, pagination"
- Active button: "Button. Page 3, current page"
- Other buttons: "Button. Go to page 5"
- Navigation buttons: "Button. Go to next page. Disabled" (when at last page)

### Requirements for Developers

1. **Track current page** - Update `currentPage` prop when page changes
2. **Provide page count** - `totalPages` must be accurate
3. **Handle boundaries** - Component disables buttons at edges (handles automatically)
4. **Consider mobile** - `showFirstLast` can be toggled for space constraints
5. **Test with screen readers** - Verify aria-current updates when navigating

### Responsive Behavior

On screens < 400px (via container queries), page numbers are hidden, showing only navigation arrows. Screen reader users still get full page information via `aria-label`.

---

## UpdatePrompt

### Accessibility Features

- **Alert Dialog**: Uses `role="alertdialog"` for important system message
- **Focus Management**: Dialog auto-focuses when shown, focus returns when dismissed
- **Keyboard Support**:
  - Tab: Navigate between buttons
  - Escape: Dismiss dialog
  - Enter: Activate focused button
- **Aria Labeling**: Dialog has `aria-labelledby` (title) and `aria-describedby` (description)
- **Icon**: SVG icon is `aria-hidden="true"` to avoid redundant announcements

### Usage

```svelte
<UpdatePrompt />
```

The component is self-contained and auto-initializes when a service worker update is detected.

### Screen Reader Announcement

- When dialog opens: "Alert dialog. A new version of DMB Almanac is available! Your PWA has been updated in the background. Refresh to use the new features and improvements."
- Buttons: "Update Now. Update now to the latest version" / "Later. Dismiss update prompt and update later"

### Focus Management

1. Dialog opens with focus on "Update Now" button (primary action)
2. Tab cycles between "Update Now" and "Later" buttons
3. When dismissed (Escape or "Later"), focus would return to trigger (if there was one)

### Requirements for Developers

1. **Don't suppress dialogs** - Users should be notified of critical updates
2. **Service Worker setup** - Ensure SW is properly registered
3. **Test PWA flow** - Verify update detection and dialog display
4. **Mobile handling** - Dialog uses container queries for responsive sizing
5. **Color contrast** - All text meets 4.5:1 minimum contrast (handled automatically)

### Requirements for Service Workers

```javascript
// In your service worker:
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

---

## Testing Checklist

Use this checklist to verify accessibility before deployment:

### Automated Testing

- [ ] Run axe DevTools and address all issues
- [ ] Run Lighthouse accessibility audit
- [ ] Verify WCAG 2.1 AA score >= 85

### Keyboard Navigation

- [ ] Tab navigates through all interactive elements
- [ ] Tab order is logical and follows visual layout
- [ ] Focus is always visible (no outline: none)
- [ ] Can reach all functionality without mouse
- [ ] No keyboard traps (can always Tab away)
- [ ] Dropdowns work with Arrow keys
- [ ] Enter/Space activates buttons
- [ ] Escape closes dropdowns/modals

### Screen Reader (NVDA, VoiceOver, JAWS)

- [ ] All interactive elements are announced
- [ ] Form labels are associated with inputs
- [ ] Table headers are correctly marked (scope="col")
- [ ] Images have appropriate alt text or aria-hidden="true"
- [ ] Skip links work correctly
- [ ] Error messages are announced
- [ ] Dialog titles and descriptions are read

### Visual Accessibility

- [ ] Color contrast >= 4.5:1 for normal text (use WCAG Contrast Checker)
- [ ] Color contrast >= 3:1 for large text (18pt+ or 14pt+ bold)
- [ ] No information conveyed by color alone (use icons/text)
- [ ] Text resizable to 200% without loss of function
- [ ] Focus indicators are visible (not just subtle)
- [ ] Works in Windows High Contrast Mode

### Motion and Animation

- [ ] Animations respect `prefers-reduced-motion: reduce`
- [ ] No auto-playing videos or scrolling
- [ ] No flashing content (> 3 flashes per second)

### Form Accessibility

- [ ] All form fields have labels
- [ ] Error messages are clearly associated with fields
- [ ] Required fields are marked (aria-required)
- [ ] Form instructions are visible and linked to inputs
- [ ] Placeholder text is NOT used as label

### Component-Specific Checks

#### ErrorBoundary

- [ ] Error is announced to screen readers immediately
- [ ] Button is keyboard accessible
- [ ] Error text has sufficient contrast

#### Dropdown

- [ ] Menu items have role="menuitem"
- [ ] Arrow keys navigate items
- [ ] Escape closes menu
- [ ] Focus returns to trigger when closed
- [ ] Trigger has aria-haspopup and aria-expanded

#### Tooltip

- [ ] Trigger button has aria-describedby linking to tooltip
- [ ] Tooltip content is not interactive
- [ ] Works without mouse (focus activation)
- [ ] Doesn't block other content

#### Table

- [ ] Caption is visible above table
- [ ] Column headers have scope="col"
- [ ] Sortable headers have aria-sort
- [ ] Rows are focusable if clickable
- [ ] Data makes sense when read linearly

#### Pagination

- [ ] Active page has aria-current="page"
- [ ] All buttons have clear aria-labels
- [ ] Buttons disable appropriately at boundaries
- [ ] Works with arrow keys (if implemented)

#### UpdatePrompt

- [ ] Dialog is announced as alertdialog
- [ ] Title and description are read together
- [ ] Dialog closes with Escape
- [ ] Focus management works correctly

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Inclusive Components](https://inclusive-components.design/)
- [Web Accessibility by Google](https://www.udacity.com/course/web-accessibility--ud891)

## Tools

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WAVE](https://wave.webaim.org/)
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [macOS VoiceOver](https://www.apple.com/accessibility/voiceover/)
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## Contributing

When adding new components:

1. Start with semantic HTML (no div buttons)
2. Add ARIA only when semantic HTML is insufficient
3. Test with keyboard and screen reader
4. Include focus management
5. Support high contrast mode with `@media (forced-colors: active)`
6. Respect `prefers-reduced-motion` preference
7. Ensure 4.5:1 color contrast minimum
8. Document accessibility features in component JSDoc

Remember: **Accessibility is a feature, not an afterthought.**
