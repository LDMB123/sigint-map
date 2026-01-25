# Component Accessibility Checklist

Quick reference for verifying accessibility of DMB Almanac components.

## ErrorBoundary Component

**File**: `src/lib/components/ui/ErrorBoundary.svelte`

### Implementation Checklist

- [x] Has `role="alert"` on error container
- [x] Has `aria-live="assertive"` for immediate announcement
- [x] Error title and message linked with `aria-describedby`
- [x] Button has `aria-label="Try again and dismiss error"`
- [x] Button has `type="button"` attribute
- [x] Focus visible on button (outline + box-shadow)
- [x] Supports Enter, Space, and mouse click
- [x] Works in Windows High Contrast Mode

### Testing

```javascript
// Manual testing:
1. Trigger an error in console: throw new Error("Test error")
2. Tab to "Try again" button
3. Press Enter - error should dismiss
4. With screen reader, error should be announced immediately
```

---

## Dropdown Component

**File**: `src/lib/components/ui/Dropdown.svelte`

### Implementation Checklist

- [x] Trigger button has `aria-haspopup="menu"`
- [x] Trigger button has `aria-expanded` (true/false)
- [x] Trigger button has `aria-controls` linking to menu
- [x] Menu has `role="menu"`
- [x] Menu items have `role="menuitem"` (required in slot content)
- [x] Keyboard support:
  - [x] Arrow Down: Next item
  - [x] Arrow Up: Previous item
  - [x] Home: First item
  - [x] End: Last item
  - [x] Enter/Space: Activate item
  - [x] Escape: Close menu, return focus to trigger
- [x] Focus visible on all interactive elements
- [x] Works in Windows High Contrast Mode

### Using the Dropdown Safely

```svelte
<Dropdown id="actions-menu" label="Actions" ariaLabel="Show available actions">
  <!-- CORRECT: Each item has role="menuitem" -->
  <button role="menuitem" onclick={handleEdit}>Edit</button>
  <button role="menuitem" onclick={handleDelete}>Delete</button>
  <hr />
  <button role="menuitem" onclick={handleArchive}>Archive</button>

  <!-- INCORRECT: Missing role="menuitem" -->
  <!-- <button onclick={handleEdit}>Edit</button> -->
</Dropdown>
```

### Testing

```javascript
// Keyboard navigation:
1. Tab to trigger button
2. Press Space or Enter to open menu
3. Arrow Down/Up to navigate items
4. Press Enter to select
5. Menu should close, focus returns to trigger

// Screen reader:
1. Trigger announces: "Actions button, popup menu, not expanded"
2. Arrow Down to first item: "Edit menuitem"
3. Press Enter: Item executes, menu closes
4. Focus returns to trigger button
```

---

## Tooltip Component

**File**: `src/lib/components/ui/Tooltip.svelte`

### Implementation Checklist

- [x] Trigger button has `aria-describedby` linking to tooltip
- [x] Tooltip has `role="tooltip"`
- [x] Tooltip has unique `id` (matches aria-describedby)
- [x] Works on keyboard focus (not just hover)
- [x] Works with Escape key to close
- [x] Trigger button has `aria-label` if no visible text
- [x] Focus visible on trigger button
- [x] Works in Windows High Contrast Mode

### Using Tooltips Correctly

```svelte
<!-- CORRECT: Supplementary help information -->
<Tooltip
  id="password-hint"
  content="Minimum 8 characters, 1 uppercase, 1 number"
  position="right"
>
  <button aria-label="Password requirements">?</button>
</Tooltip>

<!-- INCORRECT: Required form instruction in tooltip -->
<!-- <Tooltip content="This field is required"> -->
<!--   <input> -->
<!-- </Tooltip> -->
<!-- Instead, put required info in associated label -->
```

### Testing

```javascript
// Keyboard access:
1. Tab to trigger button
2. Tooltip should appear
3. Tab away - tooltip disappears
4. Press Escape - tooltip disappears

// Screen reader:
1. Trigger announces: "Password requirements button, described by password-hint"
2. Tooltip content is available in page structure
```

---

## Table Component

**File**: `src/lib/components/ui/Table.svelte`

### Implementation Checklist

- [x] Has `<table>` element
- [x] Has `<thead>` and `<tbody>`
- [x] All headers in `<th>` with `scope="col"`
- [x] Optional `<caption>` at top of table
- [x] Sortable columns have:
  - [x] `role="button"`
  - [x] `tabindex="0"`
  - [x] `aria-sort="none|ascending|descending"`
- [x] Clickable rows have:
  - [x] `role="button"`
  - [x] `tabindex="0"`
  - [x] Keyboard support (Enter/Space)
- [x] Focus visible on headers and rows
- [x] Works in Windows High Contrast Mode

### Using Tables Correctly

```svelte
<!-- CORRECT: Full accessible table -->
<Table
  data={shows}
  columns={[
    { key: 'date', header: 'Date', sortable: true, width: '100px' },
    { key: 'venue', header: 'Venue', sortable: true },
    { key: 'city', header: 'City', sortable: true }
  ]}
  caption="Dave Matthews Band Concert History"
  summary="Complete list of all concerts with dates and venues"
  onRowClick={(show) => goto(`/shows/${show.id}`)}
/>

<!-- Accessing table data for screen readers:
   1. Caption: "Dave Matthews Band Concert History"
   2. Table description: "Complete list of all concerts with dates and venues"
   3. Column headers: "Date. Venue. City."
   4. Each row is a button: "Button. Select row"
-->
```

### Table Caption vs Summary

```svelte
<!-- caption: Visible to all users, helps everyone understand table purpose -->
<Table caption="2024 Concert Schedule" />

<!-- summary: Screen reader only, provides analysis context -->
<Table summary="Statistical breakdown of venue types and attendance trends" />

<!-- Both: Use together for complex data tables -->
<Table
  caption="Attendance Analysis"
  summary="Shows attendance patterns across venue types and seasons"
/>
```

### Testing

```javascript
// Keyboard navigation:
1. Tab to first header - should have focus visible
2. Press Enter on sortable header - sort should activate
3. Tab through table - focus visible on each element
4. On clickable row, press Enter - row action executes

// Screen reader:
1. Caption read first
2. Table structure announced
3. Column headers announced per row
4. Clickable rows announced as buttons
```

---

## Pagination Component

**File**: `src/lib/components/ui/Pagination.svelte`

### Implementation Checklist

- [x] Has `<nav>` with `role="navigation"`
- [x] Nav has `aria-label="Pagination navigation"`
- [x] All buttons have descriptive `aria-label`
- [x] Active page button has `aria-current="page"`
- [x] Buttons disabled appropriately at boundaries
- [x] Keyboard accessible: Tab through buttons
- [x] Focus visible on all buttons
- [x] SVG icons have `aria-hidden="true"`
- [x] Works in Windows High Contrast Mode

### Using Pagination

```svelte
<Pagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={(newPage) => page = newPage}
  showFirstLast={true}
  siblingCount={1}
/>
```

### Screen Reader Experience

```
Navigation, Pagination
  Button. Go to first page
  Button. Go to previous page. Disabled. (on page 1)
  Button. Page 1. Current page.
  Button. Page 2.
  Button. Go to next page
  Button. Go to last page
```

### Testing

```javascript
// Keyboard navigation:
1. Tab to pagination nav
2. Tab through all buttons - each gets focus
3. Page 1: First and Previous buttons should be disabled
4. Page N: Next and Last buttons should be disabled
5. Press Enter on page button - navigate to page

// Screen reader:
1. Page 3 button announces: "Button. Page 3, current page"
2. Disabled buttons announce: "Disabled"
3. Nav announces: "Navigation, pagination"
```

---

## UpdatePrompt Component

**File**: `src/lib/components/pwa/UpdatePrompt.svelte`

### Implementation Checklist

- [x] Has `role="alertdialog"`
- [x] Has `aria-labelledby` linking to title
- [x] Has `aria-describedby` linking to description
- [x] Dialog auto-focuses first button
- [x] Keyboard support:
  - [x] Tab cycles between buttons
  - [x] Escape dismisses dialog
  - [x] Enter activates focused button
- [x] Focus visible on buttons
- [x] Icons have `aria-hidden="true"`
- [x] Works in Windows High Contrast Mode
- [x] Responsive: Mobile-friendly button layout

### Screen Reader Experience

```
Alert Dialog
  A new version of DMB Almanac is available!
  Your PWA has been updated in the background. Refresh to use the new features and improvements.
  Button. Update Now. Update now to the latest version.
  Button. Later. Dismiss update prompt and update later.
```

### Focus Management

1. Dialog shows -> Focus on "Update Now" button
2. User presses Tab -> Focus moves to "Later" button
3. User presses Tab -> Focus cycles back to "Update Now"
4. User presses Escape -> Dialog closes (focus would return to last element if there was one)

### Testing

```javascript
// Trigger update detection (development):
1. Modify service worker file
2. Reload page
3. Dialog should appear with focus on "Update Now"

// Keyboard navigation:
1. Tab - focus moves to "Later"
2. Tab - focus moves back to "Update Now" (cycling)
3. Escape - dialog should close

// Screen reader:
1. Dialog announced: "Alert dialog. A new version..."
2. Full title and description read
3. Buttons announced with full aria-labels
```

---

## Quick Reference: Props for Accessibility

### ErrorBoundary

- `onError`: Callback when error occurs (for logging)
- `fallback`: Custom error UI (receives error object)
- `children`: Content to render when no error

### Dropdown

- `id`: Required - unique identifier for menu
- `label`: Button label (default: 'Menu')
- `ariaLabel`: Custom aria-label for button
- `variant`: Button style variant
- `trigger`: Custom trigger button content
- `closeOnClickOutside`: Default true
- `closeOnSelect`: Default true (recommended)

### Tooltip

- `id`: Required - unique identifier
- `content`: Text content (string or snippet)
- `position`: 'top' | 'bottom' | 'left' | 'right'
- `ariaLabel`: Custom aria-label for trigger
- `trigger`: Custom trigger content
- `noKeyboard`: Disable Escape key (default false)

### Table

- `data`: Array of row objects
- `columns`: Column configuration array
- `caption`: Visible table title
- `summary`: Screen reader description
- `keyField`: Key for item identity (default: 'id')
- `onRowClick`: Row selection handler
- `striped`: Alternate row colors
- `hoverable`: Highlight on hover
- `compact`: Reduced padding

### Pagination

- `currentPage`: Current page number
- `totalPages`: Total number of pages
- `onPageChange`: Page change handler
- `showFirstLast`: Show first/last buttons
- `siblingCount`: Pages to show around current

### UpdatePrompt

- No props - self-contained
- Works with service worker automatically

---

## Common Mistakes and Fixes

### Mistake 1: Missing role="menuitem" in Dropdown

```svelte
<!-- WRONG -->
<Dropdown id="menu">
  <button onclick={action}>Do Something</button>
</Dropdown>

<!-- RIGHT -->
<Dropdown id="menu">
  <button role="menuitem" onclick={action}>Do Something</button>
</Dropdown>
```

### Mistake 2: Using Tooltip for Required Info

```svelte
<!-- WRONG - Users might miss tooltip -->
<Tooltip content="Email is required">
  <input type="email" />
</Tooltip>

<!-- RIGHT - Label is always visible -->
<label for="email">
  Email address
  <span aria-label="required">*</span>
</label>
<input id="email" type="email" required />
```

### Mistake 3: Table without Caption

```svelte
<!-- WRONG - No context for table data -->
<Table data={shows} columns={columns} />

<!-- RIGHT - Caption provides context -->
<Table
  data={shows}
  columns={columns}
  caption="All Scheduled Concerts"
/>
```

### Mistake 4: No Focus Visible Indicator

```svelte
<!-- The components already handle this, but don't remove focus styles -->

/* WRONG in your CSS */
button:focus {
  outline: none; /* Never do this! */
}

/* RIGHT - Keep or enhance focus indicator */
button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

## Testing With Screen Readers

### NVDA (Windows)

```
1. Download from nvaccess.org
2. Start NVDA
3. Navigate with Arrow keys
4. Use Insert+F7 for Elements List
5. Use Insert+Down Arrow to read element
```

### VoiceOver (macOS)

```
1. Enable: System Settings > Accessibility > VoiceOver
2. Control+Option + Right Arrow: Next element
3. Control+Option + Left Arrow: Previous element
4. Control+Option + Space: Activate element
5. Control+Option + U: Web Rotor (elements list)
```

### JAWS (Windows - Paid)

```
1. Press Insert+F1 for help
2. Arrow keys: Navigate
3. Enter/Space: Activate
4. Insert+Down Arrow: Read current element
5. T: Jump to next table
```

---

## Resources

- **Testing Tools**: axe DevTools, Lighthouse, WAVE, Pa11y
- **Guidelines**: WCAG 2.1 AA, WAI-ARIA APG
- **Documentation**: See ACCESSIBILITY_GUIDE.md for detailed component docs

**Last Updated**: 2025-01-22
