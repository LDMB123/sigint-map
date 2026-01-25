---
name: map-js-to-native
description: Map JS behavior to native HTML/CSS replacement pattern
trigger: /map-js-native
used_by: [ui-js-audit-specialist, modern-css-architect, semantic-html-engineer]
---

# Map JS Behavior to Native HTML/CSS Replacement

Determine the optimal native replacement for a specific JS pattern.

## When to Use
- After identifying a JS pattern to eliminate
- When designing the replacement implementation
- To validate feasibility before coding

## Required Inputs
- JS pattern description
- Current file location
- Required behavior (must-have vs nice-to-have)
- Accessibility requirements

## Step-by-Step Procedure

### 1. Identify Pattern Category

| JS Pattern | Native Category |
|------------|-----------------|
| Modal open/close | `<dialog>` element |
| Popover/dropdown | Popover API |
| Tooltip/hint | `popover="hint"` |
| Accordion/collapse | `<details>/<summary>` |
| Tab panels | CSS `:has()` + radio |
| Click outside close | Popover API light-dismiss |
| Focus trap | Native `<dialog>` |
| ESC to close | Native `<dialog>` |
| Scroll animations | CSS `animation-timeline` |

### 2. Check Chromium 143 Support

```javascript
// Feature detection patterns
const features = {
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
};
```

### 3. Design Replacement Pattern

#### For Modals/Dialogs
```html
<!-- Before: JS-controlled -->
<div class="modal" data-open={isOpen}>

<!-- After: Native dialog -->
<dialog id="my-dialog">
  <h2>Title</h2>
  <p>Content</p>
  <button onclick="this.closest('dialog').close()">Close</button>
</dialog>
<button popovertarget="my-dialog" popovertargetaction="show-modal">Open</button>
```

#### For Popovers
```html
<!-- Before: JS state + click-outside -->
<div className={isOpen ? 'visible' : 'hidden'}>

<!-- After: Native popover -->
<button popovertarget="my-popover">Toggle</button>
<div id="my-popover" popover="auto">
  Content with auto light-dismiss
</div>
```

#### For Tooltips
```html
<!-- Before: JS hover handlers -->
<span onMouseEnter={show} onMouseLeave={hide}>

<!-- After: Native hint popover -->
<span popovertarget="tip" popovertargetaction="interest">
  Hover me
</span>
<div id="tip" popover="hint" role="tooltip">
  Tooltip content
</div>
```

#### For Accordions
```html
<!-- Before: JS expand/collapse -->
<div onClick={() => setExpanded(!expanded)}>

<!-- After: Native details -->
<details>
  <summary>Click to expand</summary>
  <div>Hidden content</div>
</details>
```

### 4. Map Accessibility Requirements

| JS Feature | Native Equivalent |
|------------|-------------------|
| Focus trap | `<dialog>` modal mode |
| Focus restore | `<dialog>` automatic |
| ESC close | `<dialog>` native event |
| aria-expanded | Popover API auto-manages |
| aria-haspopup | Add manually if needed |
| role="dialog" | `<dialog>` implicit |
| role="tooltip" | Add manually |

### 5. Document Migration Path

```markdown
## Migration: [Component Name]

### Before (JS)
- File: `src/components/ui/[file].tsx`
- Lines: XX-YY
- Dependencies: useState, useEffect, useCallback

### After (Native)
- Element: <dialog> / [popover] / <details>
- CSS: [new classes needed]
- ARIA: [attributes to add/remove]

### Migration Steps
1. Replace element structure
2. Update CSS selectors
3. Remove JS state management
4. Verify accessibility
5. Test keyboard navigation
```

## Expected Artifacts

| Artifact | Purpose |
|----------|---------|
| Migration design doc | How to implement the change |
| ARIA mapping | Before/after accessibility |
| CSS requirements | New styles needed |

## Success Criteria
- Native replacement identified
- Chromium 143 support confirmed
- Accessibility mapping complete
- Migration path documented
