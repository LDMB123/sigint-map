---
name: native-dialog
description: Implement native <dialog> element for modal and non-modal dialogs
trigger: /dialog
used_by: [semantic-html-engineer, full-stack-developer, senior-frontend-engineer]
tags: [html5, accessibility, modal, dialog, chromium]
---

# Native HTML Dialog Element (Chrome 117+)

Implement native `<dialog>` element for modal dialogs with automatic focus trapping, backdrop, smooth animations, and keyboard handling. **Chromium 2025 standard - no dependencies needed.**

## When to Use

- Modal dialogs requiring user interaction before continuing
- Confirm/alert dialogs for critical actions
- Form dialogs (login, settings, create items)
- Non-modal dialogs (alerts, notifications that don't block interaction)
- Replacing custom modal implementations (Radix, Headless UI)

**DO NOT USE FOR:**
- Simple tooltips (use `popover` attribute instead)
- Dropdown menus (use `<details>` or `popover`)
- Page-level overlays that aren't interactive dialogs

## Browser Support

**Chromium 2025 Baseline:**
- Chrome 117+ (with smooth animations via `@starting-style`)
- Edge 117+

**Legacy Support (if needed):**
- Chrome 37+ (basic modal support without animations)
- Safari 15.4+
- Firefox 98+

**Recommendation:** For Chromium 143+ projects, always use Chrome 117+ which includes full animation support via `@starting-style`.

## Required Inputs

- Dialog content (title, description, actions)
- Trigger mechanism (button, event)
- Close handler callback
- Accessibility labels (aria-labelledby, aria-describedby)

## Implementation

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Native Dialog Example</title>
  <style>
    /* Dialog Base Styles */
    dialog {
      border: none;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      padding: 24px;
      max-width: 500px;
      width: 90vw;
    }

    /* Entry/Exit Animation (Chrome 117+) */
    dialog {
      opacity: 1;
      transform: translateY(0);
      transition:
        opacity 300ms ease-out,
        transform 300ms ease-out,
        overlay 300ms ease-out allow-discrete,
        display 300ms ease-out allow-discrete;
    }

    /* Starting state for entry animation */
    @starting-style {
      dialog[open] {
        opacity: 0;
        transform: translateY(20px);
      }
    }

    /* Exit state */
    dialog:not([open]) {
      opacity: 0;
      transform: translateY(20px);
    }

    /* Backdrop Styling */
    dialog::backdrop {
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      transition:
        background-color 300ms ease-out,
        backdrop-filter 300ms ease-out,
        overlay 300ms allow-discrete;
    }

    @starting-style {
      dialog[open]::backdrop {
        background-color: rgba(0, 0, 0, 0);
        backdrop-filter: blur(0);
      }
    }

    /* Respect reduced motion preference */
    @media (prefers-reduced-motion: reduce) {
      dialog,
      dialog::backdrop {
        transition: none;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      dialog {
        background: #1a1a1a;
        color: #f0f0f0;
      }
      dialog::backdrop {
        background-color: rgba(0, 0, 0, 0.75);
      }
    }

    /* Dialog content layout */
    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .dialog-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }

    .dialog-description {
      margin: 0;
      color: #666;
      line-height: 1.5;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 12px;
    }

    button {
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background-color: #2563eb;
      color: white;
    }

    .btn-primary:hover {
      background-color: #1d4ed8;
    }

    .btn-secondary {
      background-color: #f3f4f6;
      color: #1f2937;
    }

    .btn-secondary:hover {
      background-color: #e5e7eb;
    }
  </style>
</head>
<body>
  <h1>Native Dialog Example</h1>
  <button id="open-dialog-btn" class="btn-primary">Open Dialog</button>

  <!-- Dialog Element -->
  <dialog id="my-dialog" aria-labelledby="dialog-title" aria-describedby="dialog-description">
    <div class="dialog-content">
      <h2 id="dialog-title" class="dialog-title">Confirm Action</h2>
      <p id="dialog-description" class="dialog-description">
        Are you sure you want to proceed with this action? This cannot be undone.
      </p>
      <div class="dialog-actions">
        <button type="button" id="cancel-btn" class="btn-secondary">Cancel</button>
        <button type="button" id="confirm-btn" class="btn-primary">Confirm</button>
      </div>
    </div>
  </dialog>

  <script>
    const dialog = document.getElementById('my-dialog');
    const openBtn = document.getElementById('open-dialog-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const confirmBtn = document.getElementById('confirm-btn');

    // Open dialog as modal (blocks page interaction)
    openBtn.addEventListener('click', () => {
      dialog.showModal();
    });

    // Close on cancel
    cancelBtn.addEventListener('click', () => {
      dialog.close('cancelled');
    });

    // Close on confirm
    confirmBtn.addEventListener('click', () => {
      dialog.close('confirmed');
    });

    // Listen for close event to get return value
    dialog.addEventListener('close', () => {
      console.log('Dialog closed with return value:', dialog.returnValue);
    });

    // Optional: Close on backdrop click
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.close('backdrop-click');
      }
    });
  </script>
</body>
</html>
```

### React Implementation

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onClose?: (returnValue?: string) => void;
  className?: string;
  modal?: boolean;
}

export function Dialog({
  children,
  open = false,
  onClose,
  className,
  modal = true
}: DialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  // Sync open state with dialog element
  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (modal) {
        dialog.showModal();
      } else {
        dialog.show();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, modal]);

  // Listen for native close event
  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose?.(dialog.returnValue);
    };

    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  // Optional: Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      dialogRef.current?.close("backdrop-click");
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={cn(
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm",
        "rounded-lg border-none shadow-xl p-6",
        "max-w-lg w-[90vw]",
        "open:animate-in open:fade-in open:zoom-in-95",
        className
      )}
    >
      {children}
    </dialog>
  );
}

interface DialogTriggerProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function DialogTrigger({ children, onClick, className }: DialogTriggerProps) {
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogContent({ children, className }: DialogContentProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {children}
    </div>
  );
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogHeader({ children, className }: DialogHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {children}
    </div>
  );
}

interface DialogTitleProps {
  children: React.ReactNode;
  id: string;
  className?: string;
}

export function DialogTitle({ children, id, className }: DialogTitleProps) {
  return (
    <h2 id={id} className={cn("text-xl font-semibold", className)}>
      {children}
    </h2>
  );
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  id: string;
  className?: string;
}

export function DialogDescription({ children, id, className }: DialogDescriptionProps) {
  return (
    <p id={id} className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  );
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={cn("flex justify-end gap-3 mt-4", className)}>
      {children}
    </div>
  );
}

// Usage Example
export function DialogExample() {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleClose = (returnValue?: string) => {
    console.log('Dialog closed with:', returnValue);
    setIsOpen(false);
  };

  return (
    <>
      <DialogTrigger onClick={() => setIsOpen(true)}>
        Open Dialog
      </DialogTrigger>

      <Dialog open={isOpen} onClose={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle id="dialog-title">Confirm Action</DialogTitle>
            <DialogDescription id="dialog-description">
              Are you sure you want to proceed? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => handleClose("cancelled")}>Cancel</button>
            <button onClick={() => handleClose("confirmed")}>Confirm</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### Svelte 5 Implementation

```svelte
<script lang="ts">
  interface DialogProps {
    children?: import('svelte').Snippet;
    open?: boolean;
    onClose?: (returnValue?: string) => void;
    modal?: boolean;
    class?: string;
  }

  let {
    children,
    open = $bindable(false),
    onClose,
    modal = true,
    class: className = ''
  }: DialogProps = $props();

  let dialogRef: HTMLDialogElement | null = $state(null);

  // Sync open state with dialog element
  $effect(() => {
    if (!dialogRef) return;

    if (open) {
      if (modal) {
        dialogRef.showModal();
      } else {
        dialogRef.show();
      }
    } else if (dialogRef.open) {
      dialogRef.close();
    }
  });

  function handleClose() {
    onClose?.(dialogRef?.returnValue);
    open = false;
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === dialogRef) {
      dialogRef?.close('backdrop-click');
    }
  }
</script>

<dialog
  bind:this={dialogRef}
  onclose={handleClose}
  onclick={handleBackdropClick}
  class="dialog {className}"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  {@render children?.()}
</dialog>

<style>
  :global(dialog.dialog) {
    border: none;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    padding: 24px;
    max-width: 500px;
    width: 90vw;
    opacity: 1;
    transform: translateY(0);
    transition:
      opacity 300ms ease-out,
      transform 300ms ease-out,
      overlay 300ms ease-out allow-discrete,
      display 300ms ease-out allow-discrete;
  }

  @starting-style {
    :global(dialog.dialog[open]) {
      opacity: 0;
      transform: translateY(20px);
    }
  }

  :global(dialog.dialog:not([open])) {
    opacity: 0;
    transform: translateY(20px);
  }

  :global(dialog.dialog::backdrop) {
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    transition:
      background-color 300ms ease-out,
      backdrop-filter 300ms ease-out,
      overlay 300ms allow-discrete;
  }

  @starting-style {
    :global(dialog.dialog[open]::backdrop) {
      background-color: rgba(0, 0, 0, 0);
      backdrop-filter: blur(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(dialog.dialog),
    :global(dialog.dialog::backdrop) {
      transition: none;
    }
  }
</style>

<!-- Usage Example -->
<script lang="ts">
  let showDialog = $state(false);

  function handleDialogClose(returnValue?: string) {
    console.log('Closed with:', returnValue);
  }
</script>

<button onclick={() => showDialog = true}>Open Dialog</button>

<Dialog bind:open={showDialog} onClose={handleDialogClose}>
  <div class="dialog-content">
    <h2 id="dialog-title" class="dialog-title">Confirm Action</h2>
    <p id="dialog-description" class="dialog-description">
      Are you sure you want to proceed?
    </p>
    <div class="dialog-actions">
      <button onclick={() => showDialog = false}>Cancel</button>
      <button onclick={() => showDialog = false}>Confirm</button>
    </div>
  </div>
</Dialog>
```

## Key Features

### Automatic Focus Management
- Focus automatically moves to first focusable element in dialog
- Tab key traps focus within dialog (cannot tab to page behind)
- Focus returns to trigger element when dialog closes
- No JavaScript required for focus trap

### Automatic Keyboard Handling
- **ESC key**: Closes dialog automatically
- **Tab key**: Cycles focus within dialog only
- No manual event listeners needed

### Backdrop Handling
- `::backdrop` pseudo-element creates overlay automatically
- Can be styled with CSS (color, blur, etc.)
- Click on backdrop can close dialog (requires JS listener)

### Return Values
- Forms with `method="dialog"` automatically close and set `returnValue`
- Access return value via `dialog.returnValue` or close event

```html
<dialog>
  <form method="dialog">
    <input type="text" name="username" />
    <button type="submit" value="save">Save</button>
    <button type="submit" value="cancel">Cancel</button>
  </form>
</dialog>

<script>
  dialog.addEventListener('close', () => {
    console.log(dialog.returnValue); // "save" or "cancel"
  });
</script>
```

## Common Patterns

### Confirm Dialog

```html
<dialog id="confirm-dialog">
  <form method="dialog">
    <h2>Delete Item?</h2>
    <p>This action cannot be undone.</p>
    <div>
      <button type="submit" value="cancel">Cancel</button>
      <button type="submit" value="confirm" autofocus>Delete</button>
    </div>
  </form>
</dialog>
```

### Form Dialog with Validation

```html
<dialog id="form-dialog">
  <form method="dialog" onsubmit="return validateForm(event)">
    <h2>Create Account</h2>
    <label>
      Email:
      <input type="email" name="email" required />
    </label>
    <label>
      Password:
      <input type="password" name="password" required minlength="8" />
    </label>
    <div>
      <button type="button" onclick="this.closest('dialog').close()">Cancel</button>
      <button type="submit">Create Account</button>
    </div>
  </form>
</dialog>
```

### Non-Modal Dialog (Alert)

```javascript
// Non-modal: doesn't block page interaction
dialog.show(); // Instead of showModal()

// Modal: blocks page interaction
dialog.showModal();
```

## Accessibility Checklist

- [ ] Use `aria-labelledby` pointing to dialog title
- [ ] Use `aria-describedby` pointing to main content
- [ ] Ensure first focusable element has `autofocus` or focus it programmatically
- [ ] Test ESC key closes dialog
- [ ] Test Tab key traps focus within dialog
- [ ] Test focus returns to trigger on close
- [ ] Ensure backdrop is visually distinct from page content
- [ ] Test with screen reader (should announce dialog role)

## Browser Compatibility Notes

- **Chrome 37+**: Basic `<dialog>` support
- **Chrome 117+**: `@starting-style` for smooth animations
- **Safari 15.4+**: Full support
- **Firefox 98+**: Full support

## Migration from Custom Modals

**Before (Custom Modal):**
```javascript
// Manual focus trap, backdrop, ESC handling
const modal = createModal({
  backdrop: true,
  closeOnEscape: true,
  trapFocus: true
});
```

**After (Native Dialog):**
```javascript
// All features built-in
dialog.showModal();
```

**Complexity Reduction:**
- No focus trap library needed
- No manual ESC key listener
- No backdrop overlay div
- No z-index management
- No scroll locking logic

## Performance Considerations

- Dialog animations run on GPU (transform/opacity)
- Backdrop blur uses Metal GPU on Apple Silicon
- `@starting-style` enables smooth entry/exit without JavaScript
- Use `allow-discrete` for transitioning discrete properties (display, overlay)

## Expected Output

A fully accessible modal dialog with:
- Automatic focus trap
- Keyboard navigation (Tab, ESC)
- Backdrop overlay
- Smooth animations
- Return value handling
- Screen reader support
- Zero custom accessibility JavaScript

## Success Criteria

- [ ] Dialog opens with `showModal()` or `show()`
- [ ] Focus traps within dialog when modal
- [ ] ESC key closes dialog
- [ ] Backdrop styled with `::backdrop`
- [ ] Animations smooth (300ms transition)
- [ ] Return value captured on close
- [ ] Accessible to keyboard and screen reader users
- [ ] Reduced motion respected
- [ ] Works in all modern browsers

## References

- [MDN: `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)
- [MDN: `::backdrop`](https://developer.mozilla.org/en-US/docs/Web/CSS/::backdrop)
- [Chrome: `@starting-style`](https://developer.chrome.com/docs/css-ui/animate-to-height-auto)
- [WCAG 2.1: Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
