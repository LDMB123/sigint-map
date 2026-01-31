# DMB Almanac Accessibility Reference

## Component Quick Reference

### ErrorBoundary
```svelte
<ErrorBoundary onError={(e) => console.error(e)}>
  <MyComponent />
</ErrorBoundary>
```
- Key: `role="alert"`, `aria-live="assertive"`, `aria-describedby`
- Screen Reader: "Alert. Something went wrong. [Error details]"

### Dropdown
```svelte
<Dropdown id="menu" label="Actions">
  <button role="menuitem" onclick={handleAction1}>Action 1</button>
</Dropdown>
```
- Key: `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`
- Keyboard: Tab, Space/Enter to open, Arrow keys to navigate, Escape to close

### Table
```svelte
<Table data={shows} columns={columns} caption="2024 Concert Schedule" />
```
- Key: `role="table"`, `aria-label`, `scope="col"`, `aria-sort`

### Pagination
```svelte
<Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => page = p} />
```
- Key: `aria-current="page"` on current page

## Keyboard Shortcuts

| Component | Key | Action |
|-----------|-----|--------|
| All | Tab / Shift+Tab | Navigate forward/backward |
| Button | Enter, Space | Activate |
| Dropdown | Space, Enter | Toggle menu |
| Dropdown | Arrow Down/Up | Next/previous item |
| Dropdown | Home/End | First/last item |
| Dropdown | Escape | Close, return focus |
| Table | Enter, Space | Sort (header) or select (row) |
| Tooltip | Escape | Close tooltip |
| Modal | Escape | Dismiss dialog |

## WCAG AA Color Contrast Minimums
- Normal text: 4.5:1
- Large text (18pt+ or 14pt+ bold): 3:1
- Graphical objects: 3:1

## Focus Styles
```css
.element:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
@media (forced-colors: active) {
  .element:focus-visible { outline: 3px solid Highlight; }
}
```

## Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
```
