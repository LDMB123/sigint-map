---
title: Focus Management for Interactive Components
category: accessibility
description: Proper focus handling patterns for modals, SPAs, dynamic content
tags: [focus, keyboard, modal, spa, aria, keyboard-trap]
---

# Focus Management Skill

## When to Use

- Implementing modal dialogs or overlay components
- Single Page Application (SPA) navigation patterns
- Dynamic content that appears/disappears (dropdowns, tooltips)
- Custom interactive components (tabs, accordions, carousels)
- After opening a dialog, drawer, or menu
- Preventing keyboard traps where focus can escape

## Required Inputs

- **Component type**: Modal, drawer, menu, tab panel, accordion
- **Trigger element**: What opens the component (button, link)
- **Focusable elements**: All interactive elements within component
- **Escape behavior**: Should Escape key close component?
- **Focus return requirement**: Where should focus go on close?

## Steps

### Step 1: Identify Focus Boundary

Determine which elements can receive focus:

```
Modal boundary:
├── First focusable element (usually a button or close button)
├── Middle focusable elements (inputs, links, buttons)
└── Last focusable element
```

List all focusable elements in component:
- Form inputs (`<input>`, `<select>`, `<textarea>`)
- Buttons (`<button>`, `<a href>`)
- Custom interactive elements with `tabindex="0"`
- Never: disabled elements, hidden elements, role="presentation"

### Step 2: Store Reference to Trigger Element

```javascript
// Store element that triggered the component
let triggerElement = null;

function openModal(event) {
  triggerElement = event.currentTarget;  // Save for focus return
  modal.showModal();
}
```

### Step 3: Move Focus on Open

When component opens, focus first element:

```javascript
function openModal() {
  modal.showModal();

  // Find first focusable element
  const firstFocusable = modal.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (firstFocusable) {
    firstFocusable.focus();
  }
}
```

Or use `autofocus` attribute:

```html
<dialog>
  <h2>Modal Title</h2>
  <button autofocus>Close</button>
</dialog>
```

### Step 4: Trap Focus Within Component (If Needed)

Listen for Tab key and cycle focus within component:

```javascript
function handleKeydown(event) {
  if (event.key !== 'Tab') return;

  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  // If Shift+Tab on first element, go to last
  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  }

  // If Tab on last element, go to first
  if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

modal.addEventListener('keydown', handleKeydown);
```

**Note**: Native `<dialog>` with `.showModal()` handles this automatically!

### Step 5: Handle Escape Key

Close component when Escape is pressed:

```javascript
function handleEscape(event) {
  if (event.key === 'Escape') {
    closeModal();
  }
}

modal.addEventListener('keydown', handleEscape);
```

**Note**: Native `<dialog>` closes automatically with Escape!

### Step 6: Return Focus on Close

When component closes, return focus to trigger:

```javascript
function closeModal() {
  modal.close();  // or hide if not native dialog

  // Return focus to trigger element
  if (triggerElement) {
    triggerElement.focus();
  }
}
```

### Step 7: Add ARIA Attributes

Mark the component as modal:

```html
<!-- Native dialog (preferred) -->
<dialog aria-labelledby="modal-title" aria-modal="true">
  <h2 id="modal-title">Modal Title</h2>
  <!-- content -->
</dialog>

<!-- Custom modal (if not using dialog) -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <h2 id="modal-title">Modal Title</h2>
  <!-- content -->
</div>
```

### Step 8: Test Focus Behavior

Verify with keyboard only:

```
Steps:
1. Tab to trigger button
2. Press Enter or Space
3. Modal opens and focus moves to first element
4. Tab through all elements - focus cycles within modal
5. Shift+Tab through elements - backward cycling works
6. Press Escape - modal closes, focus returns to button
7. Verify no elements outside modal can be focused
```

## Expected Output

- Component opens and focus automatically moves to first element
- Tab key cycles through elements within component only
- Shift+Tab cycles backward
- Escape key closes component
- Focus returns to trigger element on close
- No keyboard traps
- Screen reader announces modal opening
- All changes logged to console for verification

## Code Examples by Framework

### React (Using Hook)

```jsx
function Modal({ isOpen, onClose, children }) {
  const triggerRef = useRef(null);
  const modalRef = useRef(null);

  // Store trigger element when needed
  const handleOpen = (e) => {
    triggerRef.current = e.currentTarget;
  };

  // Focus first element on open
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstButton = modalRef.current.querySelector('button');
      firstButton?.focus();
    }
  }, [isOpen]);

  // Return focus on close
  const handleClose = () => {
    onClose();
    triggerRef.current?.focus();
  };

  return (
    <>
      <button onClick={handleOpen}>Open Modal</button>

      {isOpen && (
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onKeyDown={(e) => e.key === 'Escape' && handleClose()}
        >
          <h2 id="modal-title">Modal Title</h2>
          {children}
          <button onClick={handleClose}>Close</button>
        </div>
      )}
    </>
  );
}
```

### Svelte (Using Runes)

```svelte
<script>
  import { onMount } from 'svelte';

  let { isOpen = false } = $props();
  let dialogElement = $state(null);
  let triggerElement = $state(null);

  onMount(() => {
    if (isOpen && dialogElement) {
      triggerElement = document.activeElement;
      dialogElement.showModal();

      const firstButton = dialogElement.querySelector('button');
      firstButton?.focus();
    }
  });

  function handleClose() {
    if (dialogElement) {
      dialogElement.close();
    }
    triggerElement?.focus();
    isOpen = false;
  }
</script>

<dialog
  bind:this={dialogElement}
  aria-modal="true"
  aria-labelledby="modal-title"
  onkeydown={(e) => e.key === 'Escape' && handleClose()}
>
  <h2 id="modal-title">Modal Title</h2>
  <slot />
  <button onclick={handleClose}>Close</button>
</dialog>
```

### Vanilla JavaScript

```javascript
class AccessibleModal {
  constructor(triggerSelector, modalSelector) {
    this.trigger = document.querySelector(triggerSelector);
    this.modal = document.querySelector(modalSelector);
    this.previousActiveElement = null;

    this.trigger?.addEventListener('click', () => this.open());
    this.modal?.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  open() {
    this.previousActiveElement = document.activeElement;
    this.modal.showModal();

    const firstFocusable = this.modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }

  close() {
    this.modal.close();
    this.previousActiveElement?.focus();
  }

  handleKeyDown(event) {
    if (event.key === 'Escape') {
      this.close();
    }
  }
}

// Usage
new AccessibleModal('[data-modal-trigger]', '[data-modal]');
```

## Common Mistakes to Avoid

- **Not storing trigger element**: User loses orientation after close
- **Forgetting focus trap**: User tabs outside modal to page beneath
- **Not handling Escape key**: Users expect this behavior
- **Focusing wrong element**: Focus first input, not title
- **Not using aria-modal**: Screen readers don't know it's modal
- **Trapping focus on static content**: Allow focus to move naturally within modal

## ARIA Attributes

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `aria-modal="true"` | boolean | Marks element as modal |
| `aria-labelledby` | id | Links to heading/title |
| `aria-describedby` | id | Links to description |
| `aria-hidden="true"` | boolean | Hides background content from screen readers |
| `role="dialog"` | dialog | Identifies as dialog (if not native `<dialog>`) |

## Testing Checklist

- [ ] Modal opens with keyboard trigger
- [ ] Focus moves to first element on open
- [ ] Tab key cycles forward through all elements
- [ ] Shift+Tab cycles backward through all elements
- [ ] Tab from last element goes to first element
- [ ] Shift+Tab from first element goes to last element
- [ ] Escape key closes modal
- [ ] Focus returns to trigger button after close
- [ ] No elements behind modal can be focused
- [ ] Screen reader announces "dialog" role
- [ ] Screen reader reads aria-labelledby heading
- [ ] No keyboard traps (can always escape with Escape key)

## Success Criteria

- User can open/close modal with keyboard only
- Focus never leaves modal while open
- Focus predictably returns on close
- Screen readers understand modal context
- WCAG 2.1 AA: 2.4.3 Focus Order
- WCAG 2.1 AA: 2.1.1 Keyboard accessibility
