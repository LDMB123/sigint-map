---
name: map-js-to-native
description: Map JavaScript behavior to native HTML/CSS replacement pattern
trigger: /map-js-native
used_by: [ui-js-audit-specialist, modern-css-architect, semantic-html-engineer]
---

# Map JavaScript Behavior to Native HTML/CSS Replacement

Determine the optimal native replacement for a specific JavaScript pattern in SvelteKit applications.

## When to Use
- After identifying a JavaScript pattern to eliminate
- When designing the replacement implementation
- To validate feasibility before coding
- During bundle size optimization
- When improving accessibility

## Required Inputs
- JavaScript pattern description
- Current file location
- Required behavior (must-have vs nice-to-have)
- Accessibility requirements
- Browser support targets

## Step-by-Step Procedure

### 1. Identify Pattern Category

| JavaScript Pattern | Native Category | Svelte Context |
|-------------------|-----------------|----------------|
| Modal open/close state | `<dialog>` element | Replace `$state(isOpen)` |
| Popover/dropdown state | Popover API | Replace toggle state |
| Tooltip on hover | `popover="hint"` | Replace hover handlers |
| Accordion/collapse | `<details>/<summary>` | Replace expand state |
| Tab panels | CSS `:has()` + radio | Replace active tab state |
| Click outside close | Popover API light-dismiss | Remove event listeners |
| Focus trap | Native `<dialog>` | Remove focus management |
| ESC to close | Native `<dialog>` | Remove keydown handlers |
| Scroll animations | CSS `animation-timeline` | Remove scroll listeners |
| Intersection observer | CSS `animation-range` | Remove IntersectionObserver |
| Form validation | HTML5 validation | Remove custom validators |
| Debounced input | CSS `transition-behavior` | Remove debounce utils |

### 2. Check Browser Support

```typescript
// Feature detection for SvelteKit
export function checkNativeFeatureSupport() {
  if (typeof window === 'undefined') return {}; // SSR

  return {
    dialog: typeof HTMLDialogElement !== 'undefined',
    popover: 'popover' in document.createElement('div'),
    popoverHint: (() => {
      const el = document.createElement('div');
      el.setAttribute('popover', 'hint');
      return el.popover === 'hint';
    })(),
    invokerCommands: 'commandForElement' in document.createElement('button'),
    hasSelector: CSS.supports('selector(:has(*))'),
    containerQueries: CSS.supports('container-type: inline-size'),
    scrollTimeline: CSS.supports('animation-timeline: scroll()'),
    viewTransitions: 'startViewTransition' in document,
    exclusiveAccordion: (() => {
      const el = document.createElement('details');
      el.setAttribute('name', 'test');
      return el.name === 'test';
    })(),
  };
}
```

### 3. Design Replacement Pattern

#### For Modals/Dialogs

```svelte
<!-- Before: JavaScript-controlled -->
<script>
  let isOpen = $state(false);
</script>

<button onclick={() => isOpen = true}>Open Modal</button>

{#if isOpen}
  <div class="modal-overlay" onclick={() => isOpen = false}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <h2>Modal Title</h2>
      <button onclick={() => isOpen = false}>Close</button>
    </div>
  </div>
{/if}

<!-- After: Native dialog -->
<script>
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DialogTrigger from '$lib/components/ui/DialogTrigger.svelte';
</script>

<DialogTrigger dialogId="my-modal">Open Modal</DialogTrigger>

<Dialog id="my-modal">
  <h2>Modal Title</h2>
  <button commandfor="my-modal" command="close">Close</button>
</Dialog>
```

**Savings**: Removes ~50 lines of state management, focus trap, ESC handler, click-outside logic.

#### For Popovers

```svelte
<!-- Before: JavaScript state + click-outside -->
<script>
  let isOpen = $state(false);

  function handleClickOutside(event: MouseEvent) {
    // Complex logic here
  }
</script>

<button onclick={() => isOpen = !isOpen}>Toggle</button>

{#if isOpen}
  <div class="popover">Content</div>
{/if}

<!-- After: Native popover -->
<button popovertarget="my-popover">Toggle</button>

<div id="my-popover" popover="auto">
  Content with auto light-dismiss
</div>
```

**Savings**: Removes state, click handlers, click-outside logic, positioning logic.

#### For Tooltips

```svelte
<!-- Before: JavaScript hover handlers -->
<script>
  let showTooltip = $state(false);
</script>

<span
  onmouseenter={() => showTooltip = true}
  onmouseleave={() => showTooltip = false}
  onfocus={() => showTooltip = true}
  onblur={() => showTooltip = false}
>
  Hover me
  {#if showTooltip}
    <span class="tooltip">Tooltip text</span>
  {/if}
</span>

<!-- After: Native hint popover -->
<span popovertarget="tip" popovertargetaction="hover">
  Hover me
</span>
<div id="tip" popover="hint" role="tooltip">
  Tooltip text
</div>
```

**Savings**: Removes hover state, event handlers, focus management.

#### For Accordions

```svelte
<!-- Before: JavaScript expand/collapse -->
<script>
  let expanded = $state(false);
</script>

<button onclick={() => expanded = !expanded}>
  {expanded ? 'Collapse' : 'Expand'}
</button>

{#if expanded}
  <div transition:slide>Hidden content</div>
{/if}

<!-- After: Native details -->
<details>
  <summary>Click to expand</summary>
  <div>Hidden content</div>
</details>
```

**Savings**: Removes state, click handler, transition logic.

#### For Tab Panels (Pure CSS)

```svelte
<!-- Before: JavaScript tab state -->
<script>
  let activeTab = $state('tab1');
</script>

<div class="tabs">
  <button onclick={() => activeTab = 'tab1'}>Tab 1</button>
  <button onclick={() => activeTab = 'tab2'}>Tab 2</button>
</div>

{#if activeTab === 'tab1'}
  <div>Tab 1 content</div>
{:else if activeTab === 'tab2'}
  <div>Tab 2 content</div>
{/if}

<!-- After: CSS-only with :has() -->
<div class="tabs">
  <input type="radio" name="tabs" id="tab1" checked hidden />
  <input type="radio" name="tabs" id="tab2" hidden />

  <label for="tab1">Tab 1</label>
  <label for="tab2">Tab 2</label>

  <div class="panel" data-tab="tab1">Tab 1 content</div>
  <div class="panel" data-tab="tab2">Tab 2 content</div>
</div>

<style>
  .panel {
    display: none;
  }

  .tabs:has(#tab1:checked) [data-tab="tab1"],
  .tabs:has(#tab2:checked) [data-tab="tab2"] {
    display: block;
  }
</style>
```

**Savings**: Removes state and all click handlers.

### 4. Map Accessibility Requirements

| JavaScript Feature | Native Equivalent | Notes |
|-------------------|-------------------|-------|
| Focus trap | `<dialog>` modal mode | Automatic with `showModal()` |
| Focus restore | `<dialog>` automatic | Returns focus on close |
| ESC close | `<dialog>` native event | Built into dialog element |
| aria-expanded | Popover API auto-manages | Set automatically |
| aria-haspopup | Add manually if needed | Not auto-set |
| role="dialog" | `<dialog>` implicit | Native semantic |
| role="tooltip" | Add manually | For hint popovers |
| Keyboard navigation | Native form controls | Built-in for details/dialog |

### 5. Svelte-Specific Migration Patterns

#### Remove $state Reactivity

```svelte
<!-- Before -->
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>

<!-- After (if using native form) -->
<input type="number" name="count" value="0" />
<output>{/* Calculate with :has() or JS if needed */}</output>
```

#### Remove $effect Side Effects

```svelte
<!-- Before -->
<script>
  let searchTerm = $state('');

  $effect(() => {
    // Debounce search
    const timeout = setTimeout(() => {
      search(searchTerm);
    }, 300);
    return () => clearTimeout(timeout);
  });
</script>

<!-- After (with native form) -->
<form>
  <input
    type="search"
    name="q"
    oninput={(e) => {
      e.currentTarget.form?.requestSubmit();
    }}
  />
</form>
```

### 6. Document Migration Path

```markdown
## Migration: [Component Name]

### Before (JavaScript)
- File: `src/lib/components/[file].svelte`
- Lines: XX-YY
- Dependencies: $state, $effect, event handlers
- Bundle impact: ~X KB

### After (Native)
- Element: <dialog> / [popover] / <details>
- CSS: [new classes needed]
- ARIA: [attributes to add/remove]
- Bundle impact: ~Y KB

### Savings
- Lines of code: X → Y (Z% reduction)
- Bundle size: X KB → Y KB
- Runtime overhead: Removed state management

### Migration Steps
1. Replace element structure
2. Update CSS selectors
3. Remove JavaScript state management
4. Remove event handlers
5. Add native attributes
6. Verify accessibility
7. Test keyboard navigation
8. Update Playwright tests

### Testing
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Visual appearance matches
- [ ] Animation preserved (if needed)
- [ ] All consumers updated
```

## Expected Artifacts

| Artifact | Purpose |
|----------|---------|
| Migration design doc | How to implement the change |
| ARIA mapping | Before/after accessibility |
| CSS requirements | New styles needed |
| Bundle size analysis | Size savings estimate |

## Success Criteria
- Native replacement identified
- Browser support confirmed (Chrome 143+)
- Accessibility mapping complete
- Migration path documented
- Bundle size impact estimated
- All edge cases considered

## Browser Support Matrix

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| `<dialog>` | 37+ | 98+ | 15.4+ | 79+ |
| Popover API | 114+ | 125+ | 17+ | 114+ |
| `popover="hint"` | 143+ | - | - | 143+ |
| Invoker Commands | 143+ | - | - | 143+ |
| `:has()` | 105+ | 121+ | 15.4+ | 105+ |
| Container Queries | 105+ | 110+ | 16+ | 105+ |
| `details[name]` | 143+ | - | - | 143+ |

## References
- [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)
- [Dialog element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)
- [Details element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details)
- [CSS :has()](https://developer.mozilla.org/en-US/docs/Web/CSS/:has)
- [Invoker Commands](https://open-ui.org/components/invokers.explainer/)
