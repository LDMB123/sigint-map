# Virtual List Accessibility - Usage Guide

## Overview

The improved `VirtualList` component now provides full WCAG 2.1 Level AA keyboard and screen reader accessibility. This guide explains the new features and how to use them effectively.

---

## What's New: Accessibility Improvements

### 1. Keyboard Navigation
- **Arrow Up/Down**: Navigate between items with automatic boundary announcements
- **Home/End**: Jump to first/last item instantly
- **Page Up/Down**: Navigate by visible page count
- **Tab/Shift+Tab**: Exit the list without being trapped (no keyboard trap)
- **Escape**: Clear focus and exit the list
- **Announcements**: Navigation status automatically announced to screen readers

### 2. Screen Reader Support
- Live region announcements for navigation actions
- Boundary feedback ("Beginning of list", "End of list")
- Item position tracking (e.g., "Item 5 of 100")
- List initialization message on load
- aria-description with keyboard shortcut documentation
- aria-current="true" on focused item

### 3. Focus Management
- Focus automatically restored when virtualized items re-enter viewport
- No focus loss on scroll
- Focus order logical and predictable
- Focus indicator always visible and not clipped

### 4. High Contrast & Accessibility
- Works in Windows High Contrast Mode
- Focus indicator visible in forced-colors media query
- 200% zoom support without loss of functionality

---

## Basic Usage

### Simple Example: Show Archive

```svelte
<script lang="ts">
  import VirtualList from '$lib/components/ui/VirtualList.svelte';
  import type { DexieShow } from '$db/dexie/schema';

  let shows: DexieShow[] = [];

  function getItemHeight(show: DexieShow, index: number): number {
    return 130; // Fixed height in pixels
  }
</script>

<VirtualList
  items={shows}
  itemHeight={getItemHeight}
  overscan={5}
  estimateSize={130}
  aria-label="Show archive list"
>
  {#snippet children({ item: show, index })}
    <div class="show-card">
      <h3>{show.venue?.name}</h3>
      <p>{new Date(show.date).toLocaleDateString()}</p>
    </div>
  {/snippet}
</VirtualList>
```

---

## Advanced Usage

### Dynamic Item Heights

```svelte
<script lang="ts">
  import VirtualList from '$lib/components/ui/VirtualList.svelte';

  interface Item {
    id: string;
    title: string;
    description: string;
    expanded: boolean;
  }

  let items: Item[] = [];

  // Height changes based on expanded state
  function getItemHeight(item: Item, index: number): number {
    return item.expanded ? 200 : 80;
  }
</script>

<VirtualList
  items={items}
  itemHeight={getItemHeight}
  overscan={3}
  estimateSize={80}
  aria-label="Expandable items list"
  aria-description="Use arrow keys to navigate. Press Escape to exit. Items can be expanded and collapsed."
>
  {#snippet children({ item })}
    <button onclick={() => item.expanded = !item.expanded} class="item">
      <h4>{item.title}</h4>
      {#if item.expanded}
        <p>{item.description}</p>
      {/if}
    </button>
  {/snippet}
</VirtualList>
```

---

## Props

### Required Props

| Prop | Type | Description |
|------|------|---|
| `items` | `T[]` | Array of items to virtualize |
| `itemHeight` | `number \| (item: T, index: number) => number` | Height of each item in pixels (fixed or dynamic) |
| `children` | `Snippet` | Render function for each item |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|---|
| `overscan` | `number` | `3` | Number of items to render outside viewport for smooth scrolling |
| `estimateSize` | `number` | `100` | Estimated item height for initial render |
| `class` | `string` | `''` | Additional CSS classes |
| `role` | `string` | `'list'` | ARIA role (usually "list") |
| `aria-label` | `string` | - | Label for the list (required for unlabeled lists) |
| `aria-description` | `string` | Auto | Description of keyboard shortcuts (auto-generated if not provided) |

---

## Keyboard Shortcuts

Users can navigate your virtual list with these keyboard shortcuts:

| Key | Action |
|-----|--------|
| Arrow Up | Move to previous item, announce boundary at start |
| Arrow Down | Move to next item, announce boundary at end |
| Home | Jump to first item |
| End | Jump to last item |
| Page Up | Jump up by visible page count |
| Page Down | Jump down by visible page count |
| Escape | Clear focus and exit list |
| Tab | Move focus to next element (exits list if at last item) |
| Shift+Tab | Move focus to previous element (exits list if at first item) |

---

## Screen Reader Experience

### NVDA (Windows)
1. Navigate to list with Tab
2. NVDA announces: "List with 1000 items"
3. Press Down Arrow: "Item 1 of 1000, selected"
4. Continue navigating, boundary announcements at start/end

### VoiceOver (macOS/iOS)
1. Swipe to list
2. Double-tap to enter
3. VoiceOver reads: "List, 1000 items"
4. Use Up/Down arrows to navigate
5. Boundary feedback provided

### JAWS (Windows)
1. Tab to list
2. JAWS announces: "List with 1000 items"
3. Use arrow keys to navigate through items
4. Position announced as you navigate

---

## Accessibility Checklist

### Before Using VirtualList

- [ ] Provide `aria-label` describing the list purpose
  - Example: `aria-label="Show archive"`
  - Example: `aria-label="Song catalog"`

- [ ] Optional: Provide `aria-description` for custom shortcuts
  - If not provided, auto-generated description is used
  - Example: `aria-description="Use arrow keys to browse shows. Press J to jump to year 2000."`

- [ ] Ensure item content is accessible
  - Item buttons should have text labels
  - Don't rely on color alone in items
  - Maintain 4.5:1 color contrast

### During Development

- [ ] Test keyboard navigation:
  ```bash
  # Arrow keys work in all directions
  # Home/End jump to bounds
  # Tab/Escape don't trap focus
  # Focus moves smoothly on scroll
  ```

- [ ] Test with NVDA:
  ```
  1. Open NVDA
  2. Tab to list
  3. Press Down Arrow multiple times
  4. Listen for announcements
  5. Press Home to jump to start
  6. Press End to jump to end
  ```

- [ ] Test at 200% zoom:
  ```
  # All items visible
  # No horizontal scroll
  # Keyboard navigation works
  # Focus indicator visible
  ```

- [ ] Test in High Contrast Mode:
  ```
  # Windows > Settings > Ease of Access > Display > High Contrast
  # Focus indicator visible in selected color
  # Text readable
  ```

---

## Common Patterns

### Pattern 1: Filtered List with Keyboard Navigation

```svelte
<script lang="ts">
  import VirtualList from '$lib/components/ui/VirtualList.svelte';

  interface Item {
    id: string;
    title: string;
    filtered: boolean;
  }

  let items: Item[] = [];
  let searchTerm = '';

  let filteredItems = $derived(
    items.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  function handleSearch(term: string) {
    searchTerm = term;
    // Clear virtual list focus when filtering
    // User must re-enter the list to navigate
  }
</script>

<div>
  <input
    type="search"
    placeholder="Search..."
    value={searchTerm}
    onchange={(e) => handleSearch(e.target.value)}
    aria-label="Search items"
  />

  <VirtualList
    items={filteredItems}
    itemHeight={60}
    overscan={5}
    aria-label="Filtered items list"
  >
    {#snippet children({ item })}
      <button class="item-button">
        {item.title}
      </button>
    {/snippet}
  </VirtualList>
</div>
```

### Pattern 2: List with Selection

```svelte
<script lang="ts">
  import VirtualList from '$lib/components/ui/VirtualList.svelte';

  interface Item {
    id: string;
    title: string;
  }

  let items: Item[] = [];
  let selectedId: string | null = null;

  function toggleSelection(item: Item) {
    selectedId = selectedId === item.id ? null : item.id;
  }
</script>

<VirtualList
  items={items}
  itemHeight={50}
  overscan={5}
  aria-label="Selectable items list"
>
  {#snippet children({ item })}
    <button
      class="item-button"
      class:selected={selectedId === item.id}
      onclick={() => toggleSelection(item)}
      aria-pressed={selectedId === item.id}
      aria-label={`${item.title}${selectedId === item.id ? ', selected' : ''}`}
    >
      {item.title}
    </button>
  {/snippet}
</VirtualList>
```

### Pattern 3: List with Navigation

```svelte
<script lang="ts">
  import VirtualList from '$lib/components/ui/VirtualList.svelte';
  import { goto } from '$app/navigation';

  interface Item {
    id: string;
    title: string;
    href: string;
  }

  let items: Item[] = [];

  async function handleItemClick(item: Item) {
    await goto(item.href);
  }
</script>

<VirtualList
  items={items}
  itemHeight={70}
  overscan={5}
  aria-label="Navigation list"
>
  {#snippet children({ item })}
    <button
      onclick={() => handleItemClick(item)}
      class="nav-item"
      aria-label={`Go to ${item.title}`}
    >
      {item.title}
    </button>
  {/snippet}
</VirtualList>
```

---

## Performance Considerations

### Item Height Calculation

**Fixed Heights** (Recommended for most cases):
```typescript
itemHeight={100} // All items are 100px
```
- Best performance
- O(1) offset calculations
- Minimal memory usage

**Dynamic Heights** (Use when necessary):
```typescript
function getItemHeight(item: Item, index: number): number {
  return item.expanded ? 200 : 80;
}

itemHeight={getItemHeight}
```
- Slightly slower (O(n) binary search)
- Automatic caching of measured heights
- Good for expandable items

### Overscan Setting

- Default: `3` (render 3 items above/below viewport)
- Increase to `5-10` for smoother scrolling on slow devices
- Decrease to `1-2` for better memory usage

### estimateSize Setting

- Used for initial render before heights are measured
- Should be close to actual height for best results
- Default: `100px`

---

## Testing & Validation

### Automated Testing
```typescript
// Example test with Vitest
describe('VirtualList', () => {
  it('should support keyboard navigation', () => {
    // Test arrow keys move focus
    // Test Home/End work
    // Test Tab/Escape exit list
  });

  it('should have correct ARIA attributes', () => {
    // Test role="list"
    // Test role="listitem" on items
    // Test aria-setsize/aria-posinset
  });

  it('should restore focus on virtualization', () => {
    // Focus item 50
    // Scroll it out of viewport
    // Scroll back
    // Focus should be restored
  });
});
```

### Manual Testing

1. **Keyboard Only**:
   - Tab to list
   - Navigate with arrow keys
   - Verify smooth scrolling
   - Tab away from list

2. **Screen Reader**:
   - Run NVDA/VoiceOver/JAWS
   - Tab to list
   - Navigate and listen
   - Verify announcements

3. **Visual**:
   - Focus indicator visible
   - No focus clipping
   - Works at 200% zoom
   - High contrast mode works

---

## Migration from Old VirtualList

If upgrading from the old component:

### Before
```svelte
<VirtualList
  items={items}
  itemHeight={100}
  aria-label="List"
>
  {#snippet children({ item })}
    <div>{item.title}</div>
  {/snippet}
</VirtualList>
```

### After (Same, but now accessible!)
```svelte
<VirtualList
  items={items}
  itemHeight={100}
  aria-label="List of items"
  aria-description="Use arrow keys to navigate items in this list"
>
  {#snippet children({ item })}
    <div>{item.title}</div>
  {/snippet}
</VirtualList>
```

**Breaking Changes**: None! The component is backward compatible.

**New Features**:
- Automatic keyboard navigation
- Screen reader announcements
- Focus restoration on scroll
- Tab trap prevention
- Escape key support
- aria-current on focused item

---

## Troubleshooting

### Issue: Focus not visible on items
**Solution**: Check that focus-visible is not being globally disabled. Verify `outline: none` is not in global styles for `:focus`.

### Issue: Screen reader not announcing items
**Solution**: Ensure you have `aria-label` on the VirtualList and that screen reader is running in browse mode (not focus mode).

### Issue: Focus jumps when scrolling
**Solution**: This is expected - focus is being managed. If focus is lost entirely, it's likely a bug. Report with reproduction steps.

### Issue: Items lose focus on re-render
**Solution**: This is fixed in the new version. If still occurring, ensure you're using the latest component.

### Issue: Can't exit list with Tab
**Solution**: If at the last item and Tab is pressed, focus should move to the next element. If stuck, press Escape to clear focus.

---

## Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | Full ✓ |
| Firefox | 88+ | Full ✓ |
| Safari | 14+ | Full ✓ |
| Edge | 90+ | Full ✓ |
| Opera | 76+ | Full ✓ |

---

## Questions?

For accessibility questions or issues:
1. Check this guide
2. Review the audit document
3. Test with a screen reader
4. Open an issue on GitHub with:
   - Browser + version
   - Screen reader + version (if applicable)
   - Steps to reproduce
   - Expected vs actual behavior

---

## Related Documentation

- [VirtualList Component Code](./app/src/lib/components/ui/VirtualList.svelte)
- [Accessibility Audit](./VIRTUAL_LIST_A11Y_AUDIT.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
