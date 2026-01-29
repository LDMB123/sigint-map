---
skill: implement-dialog-migration
description: Migrate to Native HTML Dialog
---

# Migrate to Native HTML Dialog

## Usage

```
/implement-dialog-migration [component-path-or-pattern]
```

Migrate custom modal/dialog implementations to the native HTML `<dialog>` element, eliminating JavaScript dependencies while improving accessibility.

## Instructions

You are an expert frontend architect specializing in modern HTML standards and progressive enhancement. Your task is to identify and migrate custom dialog/modal implementations to the native `<dialog>` element.

### Analysis Phase

1. Search the codebase for dialog/modal patterns:
   - Custom modal components with overlay backgrounds
   - Bootstrap/jQuery modal implementations
   - React portals used for modals
   - CSS-based modal hacks (checkbox toggles, :target)
   - JavaScript focus trap implementations

2. Identify associated concerns:
   - Scroll locking mechanisms
   - Click-outside-to-close handlers
   - Escape key handlers
   - Focus management code
   - Z-index stacking context management
   - Backdrop/overlay styling

### Migration Pattern

**Before (Custom Implementation):**

```html
<!-- HTML -->
<div class="modal-overlay" id="modal-overlay" hidden>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <h2 id="modal-title">Confirm Action</h2>
    <p>Are you sure you want to proceed?</p>
    <button class="close-btn">Cancel</button>
    <button class="confirm-btn">Confirm</button>
  </div>
</div>

<!-- JavaScript -->
<script>
const overlay = document.getElementById('modal-overlay');
const modal = overlay.querySelector('.modal');
let previousFocus = null;

function openModal() {
  previousFocus = document.activeElement;
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  modal.querySelector('button').focus();
  trapFocus(modal);
}

function closeModal() {
  overlay.hidden = true;
  document.body.style.overflow = '';
  previousFocus?.focus();
}

// Focus trap, escape handler, click-outside handler...
</script>
```

```css
/* CSS */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
}
```

**After (Native Dialog):**

```html
<!-- HTML -->
<dialog id="confirm-dialog" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Action</h2>
  <p>Are you sure you want to proceed?</p>
  <form method="dialog">
    <button value="cancel">Cancel</button>
    <button value="confirm">Confirm</button>
  </form>
</dialog>

<!-- JavaScript -->
<script>
const dialog = document.getElementById('confirm-dialog');

function openDialog() {
  dialog.showModal(); // Opens as modal with backdrop
}

dialog.addEventListener('close', () => {
  console.log('Result:', dialog.returnValue); // "cancel" or "confirm"
});

// Optional: close on backdrop click
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close();
});
</script>
```

```css
/* CSS */
dialog {
  border: none;
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
}
dialog::backdrop {
  background: rgba(0, 0, 0, 0.5);
}
dialog[open] {
  animation: fade-in 200ms ease-out;
}
@keyframes fade-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

### Accessibility Benefits

- **Automatic focus management**: Focus moves to dialog on open, returns on close
- **Built-in focus trapping**: Tab cycles within dialog when modal
- **Escape key handling**: Closes modal automatically
- **Inert background**: Content behind modal becomes inert (not focusable/clickable)
- **Screen reader announcements**: Proper modal semantics without ARIA workarounds
- **Top layer rendering**: No z-index battles, renders above all content

### Key APIs

| Method/Property | Description |
|-----------------|-------------|
| `dialog.show()` | Opens non-modal (no backdrop, no inert) |
| `dialog.showModal()` | Opens modal with backdrop and focus trap |
| `dialog.close(returnValue)` | Closes dialog, sets returnValue |
| `dialog.returnValue` | Value from close() or button value |
| `dialog.open` | Boolean attribute/property |
| `::backdrop` | Pseudo-element for modal backdrop |

### Migration Checklist

- [ ] Replace modal container with `<dialog>` element
- [ ] Remove manual focus trap code
- [ ] Remove scroll lock code (handled by browser)
- [ ] Remove escape key handler
- [ ] Replace overlay div with `::backdrop` pseudo-element
- [ ] Update open/close logic to use native methods
- [ ] Use `<form method="dialog">` for close buttons
- [ ] Remove z-index management code
- [ ] Update CSS to target dialog and ::backdrop
- [ ] Test with screen readers (VoiceOver, NVDA)
- [ ] Test keyboard navigation

### Response Format

```markdown
## Dialog Migration Analysis

### Components Identified
- [List of files/components with custom modal implementations]

### Code Removed
- [JavaScript utilities eliminated]
- [CSS removed]
- [Estimated lines of code reduction]

### Migration Applied
- [File]: [Description of changes]

### Breaking Changes
- [Any API changes to component props/methods]

### Testing Recommendations
- [Specific accessibility tests to run]
```
