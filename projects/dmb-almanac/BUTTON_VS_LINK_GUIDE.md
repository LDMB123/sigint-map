# Semantic HTML: Button vs Link Quick Reference

## Decision Tree

```
┌─ Does it navigate to a new URL? ────────────────────────┐
│                                                          │
├─ YES → Use <a href="/path">Text</a>                    │
│                                                          │
└─ NO → Does it perform an action?                       │
        ├─ YES → Use <button type="button">Text</button>  │
        └─ NO → Maybe not interactive? Don't use either!  │
```

---

## Pattern Comparison

### Pattern 1: Navigation ✅ DO THIS

```svelte
<!-- Navigate to new page/URL -->
<a href="/tours/2024">2024 Tour</a>
<a href="/shows/12345">Show Details</a>
<a href="/search?q=phish">Search Results</a>

<!-- Active navigation indicator -->
<a href="/tours" aria-current={$page.url.pathname === '/tours' ? 'page' : undefined}>
  Tours
</a>
```

**Why**:
- URL appears in address bar
- Works with browser history (back button)
- Proper semantic role for screen readers
- Keyboard: Tab + Enter to follow

---

### Pattern 2: Actions ✅ DO THIS

```svelte
<!-- Form submission -->
<button type="submit">Save Changes</button>

<!-- Action handler -->
<button type="button" onclick={handleDelete}>
  Delete
</button>

<!-- Toggle/state change -->
<button type="button" onclick={() => open = !open}>
  {open ? 'Close' : 'Open'}
</button>

<!-- Dialog actions -->
<button type="button" onclick={handleConfirm}>Confirm</button>
<button type="button" onclick={handleCancel}>Cancel</button>
```

**Why**:
- Semantic role clearly indicates action, not navigation
- Keyboard: Tab + Space or Enter to activate
- Screen readers announce it as button
- No URL change expected

---

### Pattern 3: Navigation via JavaScript ❌ AVOID

```svelte
<!-- DON'T DO THIS -->
<button type="button" onclick={() => goto('/tours')}>
  Tours
</button>

<!-- DO THIS INSTEAD -->
<a href="/tours">Tours</a>
```

**Why not**:
- Confuses users and screen readers (looks like button but navigates)
- Breaks browser history expectations
- Not accessible to all input methods
- SvelteKit has built-in routing - use it!

---

### Pattern 4: Link Styled Like Button ✅ OK (CSS only)

```svelte
<!-- Semantic HTML -->
<a href="/" class="button-style">Go Home</a>

<!-- CSS makes it look like button -->
<style>
  a.button-style {
    display: inline-flex;
    padding: 0.5rem 1rem;
    background: var(--color-primary-500);
    color: white;
    border-radius: 0.5rem;
    text-decoration: none;
  }
  a.button-style:hover {
    background: var(--color-primary-600);
  }
</style>
```

**Why**:
- Navigation to new URL (link)
- Visual appearance like button (CSS)
- Semantically correct (link role)
- Screen readers know it's a link
- **This is what DMB Almanac now does correctly! ✅**

---

## Real Examples from DMB Almanac

### ✅ GOOD: Navigation in Header

```svelte
<!-- Header.svelte -->
<nav class="nav" aria-label="Main navigation">
  {#each navigation as item}
    <a
      href={item.href}
      class="navLink"
      aria-current={isActive(item.href) ? 'page' : undefined}
    >
      {item.label}
    </a>
  {/each}
</nav>
```

**Why good**:
- Each item is a link to a page
- `aria-current="page"` indicates active page
- Keyboard accessible (Tab + Enter)
- Screen reader: "Link, Tours" or "Tours, current page"

---

### ✅ GOOD: PWA Action Buttons

```svelte
<!-- UpdatePrompt.svelte -->
<button
  type="button"
  onclick={handleUpdate}
  class="update-btn"
>
  Update Now
</button>

<button
  type="button"
  onclick={handleDismiss}
  class="dismiss-btn"
>
  Later
</button>
```

**Why good**:
- `type="button"` explicit
- `onclick` handler for action
- Screen reader: "Button, Update Now"
- Keyboard: Tab + Space to activate

---

### ✅ FIXED: Error Fallback Link

```svelte
<!-- Before (WRONG) -->
<a href="/" class="home-button" type="button">
  Go Home
</a>

<!-- After (CORRECT) -->
<a href="/" class="home-button">
  Go Home
</a>
```

**What changed**:
- Removed invalid `type="button"` attribute
- Still styled like button via CSS
- Now properly announces as link
- Screen reader: "Link, Go Home" (clear!)

---

## Anti-Patterns: What NOT to Do

### ❌ DO NOT: type="button" on anchors

```svelte
<!-- WRONG - Invalid HTML -->
<a href="/" type="button">Home</a>

<!-- RIGHT - Use proper semantics -->
<a href="/">Home</a>
```

**Why**: `<a>` tags don't support `type` attribute. Confuses screen readers.

---

### ❌ DO NOT: onClick navigation for page changes

```svelte
<!-- WRONG - Looks like action button -->
<button type="button" onclick={() => goto('/tours')}>
  Tours
</button>

<!-- RIGHT - Use link for page navigation -->
<a href="/tours">Tours</a>
```

**Why**: Users expect links for navigation, buttons for actions. This breaks that expectation.

---

### ❌ DO NOT: Links without href

```svelte
<!-- WRONG - Not semantic -->
<a onclick={handleClick}>Action</a>

<!-- RIGHT - Use button for actions -->
<button type="button" onclick={handleClick}>
  Action
</button>
```

**Why**: Link without href confuses users and screen readers.

---

### ❌ DO NOT: DIVs as buttons

```svelte
<!-- WRONG - Not semantic -->
<div role="button" onclick={handleClick}>
  Click Me
</div>

<!-- RIGHT - Use semantic button -->
<button type="button" onclick={handleClick}>
  Click Me
</button>
```

**Why**: `<button>` is simpler, more accessible, has better keyboard support.

---

## Keyboard Behavior

### Links (`<a href>`)
| Key | Behavior |
|-----|----------|
| Tab | Focuses link |
| Enter | Follows link |
| Space | No effect (browser ignores) |
| Shift+Tab | Backwards focus |

### Buttons (`<button>`)
| Key | Behavior |
|-----|----------|
| Tab | Focuses button |
| Enter | Activates button |
| Space | Activates button |
| Shift+Tab | Backwards focus |

---

## Screen Reader Announcements

### Link
```
NVDA (Windows):       "Link, Tours"
JAWS:                 "Tours, link"
VoiceOver (macOS):    "Tours, link"
VoiceOver (iOS):      "Tours, link, 2 of 10"
```

### Button
```
NVDA (Windows):       "Button, Update"
JAWS:                 "Update, button"
VoiceOver (macOS):    "Update, button"
VoiceOver (iOS):      "Update, button, 1 of 2"
```

---

## Visual Styling: CSS First Approach

You can style links to look like buttons with CSS:

```svelte
<a href="/submit" class="btn btn-primary">Submit</a>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    text-decoration: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 200ms;
  }

  .btn-primary {
    background: var(--color-primary-500);
    color: white;
  }

  .btn-primary:hover {
    background: var(--color-primary-600);
    text-decoration: none;
  }

  .btn-primary:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }

  .btn-primary:active {
    transform: scale(0.98);
  }
</style>
```

This looks and feels like a button, but semantically it's a link!

---

## Focus Indicators: Always Required

```css
/* Required for keyboard navigation */
a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

/* High Contrast Mode support */
@media (forced-colors: active) {
  a:focus-visible,
  button:focus-visible {
    outline: 2px solid Highlight;
  }
}
```

**Never do**:
```css
/* DON'T REMOVE FOCUS INDICATORS! */
button { outline: none; } /* BAD */
a { outline: none; } /* BAD */
```

---

## Component Template Suggestions

### Reusable Navigation Component

```svelte
<!-- NavLink.svelte -->
<script>
  import { page } from '$app/stores';

  export let href;
  export let label;
  export let activeClass = 'active';
</script>

<a
  {href}
  class={$page.url.pathname === href ? activeClass : ''}
  aria-current={$page.url.pathname === href ? 'page' : undefined}
>
  {label}
</a>

<style>
  a {
    text-decoration: none;
    color: var(--color-primary-500);
    transition: color 200ms;
  }

  a:hover {
    color: var(--color-primary-600);
  }

  a:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }

  a.active {
    font-weight: 600;
    color: var(--color-primary-700);
    border-bottom: 2px solid currentColor;
  }
</style>
```

### Reusable Action Button Component

```svelte
<!-- ActionButton.svelte -->
<script>
  export let type = 'button';
  export let onclick = null;
  export let disabled = false;
  export let ariaLabel = null;
</script>

<button {type} {onclick} {disabled} aria-label={ariaLabel}>
  <slot />
</button>

<style>
  button {
    padding: 0.5rem 1rem;
    background: var(--color-primary-500);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 200ms;
  }

  button:hover:not(:disabled) {
    background: var(--color-primary-600);
  }

  button:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
```

---

## Testing Checklist

### Code Review
- [ ] Navigation uses `<a href>`
- [ ] Actions use `<button type="button">`
- [ ] No `type="button"` on `<a>` tags
- [ ] Focus indicators visible
- [ ] Active nav has `aria-current="page"`
- [ ] Icon-only buttons have `aria-label`

### Manual Testing
- [ ] Can reach all interactive elements with Tab key
- [ ] Can activate buttons with Space/Enter
- [ ] Can follow links with Enter
- [ ] Focus indicator clearly visible
- [ ] Tested with screen reader (NVDA/VoiceOver)

### Automated Testing
- [ ] ESLint plugin: jsx-a11y/anchor-is-valid
- [ ] No `type` attribute on `<a>` tags
- [ ] All buttons have explicit `type`
- [ ] Focus indicators present

---

## Additional Resources

### WCAG Success Criteria
- **4.1.2 Name, Role, Value (Level A)**: Semantic HTML ensures correct role
- **2.1.1 Keyboard (Level A)**: Both links and buttons keyboard accessible
- **2.4.7 Focus Visible (Level AA)**: Always provide visible focus indicator

### Further Reading
- [MDN: <a> element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a)
- [MDN: <button> element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button)
- [WebAIM: Semantic HTML](https://webaim.org/articles/screenreader_testing/)
- [ARIA Authoring Practices: Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/)

---

## Questions?

If you're ever unsure:
1. Does it navigate? → `<a href>`
2. Does it perform an action? → `<button type="button">`
3. Not sure? → Default to semantic element, not ARIA

**Remember**: Semantic HTML first, ARIA only when needed!
