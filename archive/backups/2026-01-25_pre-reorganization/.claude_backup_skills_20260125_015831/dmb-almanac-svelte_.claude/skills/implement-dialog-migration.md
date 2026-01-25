---
name: implement-dialog-migration
description: Migrate a modal component to native <dialog> element
trigger: /dialog-migrate
used_by: [semantic-html-engineer, modern-css-architect]
---

# Implement Dialog Modal Migration

Convert a React modal component to use native `<dialog>` element with minimal JS.

## When to Use
- Migrating Radix Dialog to native
- Migrating custom modal implementation
- Simplifying modal state management

## Required Inputs
- Source component file path
- Current props/API to preserve
- Accessibility requirements
- Animation requirements

## Step-by-Step Procedure

### 1. Analyze Current Implementation

```bash
# Find current dialog usage
grep -rn "Dialog\|Modal" src/components/ --include="*.tsx" | head -20

# Check for controlled state
grep -n "open.*useState\|isOpen" src/components/ui/dialog.tsx
```

### 2. Create Native Dialog Structure

```tsx
// Native dialog component
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DialogProps {
  id: string
  children: React.ReactNode
  className?: string
  onClose?: () => void
}

function Dialog({ id, children, className, onClose }: DialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null)

  // Listen for native close event
  React.useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleClose = () => onClose?.()
    dialog.addEventListener("close", handleClose)
    return () => dialog.removeEventListener("close", handleClose)
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      id={id}
      className={cn(
        "fixed inset-0 m-auto p-6 rounded-lg shadow-xl",
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm",
        "open:animate-in open:fade-in open:zoom-in-95",
        className
      )}
    >
      {children}
    </dialog>
  )
}
```

### 3. Create Trigger Using Invoker Commands

```tsx
// Trigger button - zero JS for open action
function DialogTrigger({
  dialogId,
  children,
  ...props
}: { dialogId: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      commandfor={dialogId}
      command="show-modal"
      {...props}
    >
      {children}
    </button>
  )
}
```

### 4. Add CSS for Animations

```css
/* In globals.css or component CSS */
dialog {
  /* Entry animation */
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 150ms, transform 150ms, display 150ms allow-discrete;
}

dialog[open] {
  opacity: 1;
  transform: scale(1);
}

@starting-style {
  dialog[open] {
    opacity: 0;
    transform: scale(0.95);
  }
}

/* Exit animation (requires display: none transition) */
@media (prefers-reduced-motion: no-preference) {
  dialog {
    transition: opacity 150ms, transform 150ms, display 150ms allow-discrete, overlay 150ms allow-discrete;
  }
}
```

### 5. Handle Close Actions

```tsx
// Close button using Invoker Commands
function DialogClose({ dialogId, children }: { dialogId: string; children?: React.ReactNode }) {
  return (
    <button
      commandfor={dialogId}
      command="close"
      aria-label="Close dialog"
    >
      {children ?? <XIcon />}
    </button>
  )
}

// Or use form method="dialog" for form submissions
<form method="dialog">
  <button type="submit">Save and close</button>
</form>
```

### 6. Test Accessibility

- [ ] Focus moves to dialog on open
- [ ] Focus trapped within dialog
- [ ] ESC key closes dialog
- [ ] Focus returns to trigger on close
- [ ] Screen reader announces dialog
- [ ] `aria-labelledby` points to title
- [ ] `aria-describedby` points to description (if any)

### 7. Update Consumers

```tsx
// Before
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>...</DialogContent>
</Dialog>

// After
<>
  <DialogTrigger dialogId="my-dialog">Open</DialogTrigger>
  <Dialog id="my-dialog" onClose={() => console.log('closed')}>
    <DialogClose dialogId="my-dialog" />
    ...content...
  </Dialog>
</>
```

## Expected Artifacts

| Artifact | Location |
|----------|----------|
| Updated component | `src/components/ui/dialog.tsx` |
| CSS additions | `src/app/globals.css` |
| Migration guide | `.migration/guides/dialog-migration.md` |

## Validation Checklist

- [ ] Native `<dialog>` element used
- [ ] `showModal()` called for modal behavior
- [ ] Invoker Commands used for triggers
- [ ] Focus trap works (native)
- [ ] ESC closes (native)
- [ ] Focus restores on close
- [ ] Animations work
- [ ] Reduced motion respected
- [ ] Backdrop styled via `::backdrop`

## Success Criteria
- Modal functionality preserved
- JS reduced (no useState for open state)
- Accessibility maintained or improved
- All consumers updated
