---
name: implement-details-migration
description: Migrate disclosure/accordion to native <details>/<summary>
trigger: /details-migrate
used_by: [semantic-html-engineer, modern-css-architect]
---

# Implement Details/Summary Disclosure Migration

Convert JavaScript-controlled accordions and disclosure widgets to native `<details>/<summary>`.

## When to Use
- Migrating accordion components
- Simplifying collapsible sections
- Replacing JS expand/collapse state

## Required Inputs
- Source component file path
- Current expand/collapse behavior
- Animation requirements
- Multiple-open vs single-open behavior

## Step-by-Step Procedure

### 1. Analyze Current Implementation

```bash
# Find accordion/collapsible patterns
grep -rn "expanded\|collapse\|accordion" src/components/ --include="*.tsx"

# Check for state management
grep -n "useState.*expanded\|setExpanded" src/components/
```

### 2. Create Native Details Structure

```tsx
// Simple disclosure
<details>
  <summary>Click to reveal</summary>
  <div className="details-content">
    Hidden content here
  </div>
</details>

// Styled disclosure
interface DisclosureProps {
  title: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

function Disclosure({ title, children, defaultOpen, className }: DisclosureProps) {
  return (
    <details open={defaultOpen} className={cn("group", className)}>
      <summary className="cursor-pointer list-none flex items-center justify-between p-4 hover:bg-muted/50">
        <span>{title}</span>
        <ChevronIcon className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="overflow-hidden">
        <div className="p-4">
          {children}
        </div>
      </div>
    </details>
  )
}
```

### 3. Add CSS for Animations

```css
/* Content height animation using CSS */
details {
  /* Smooth marker rotation */
  &::marker,
  & > summary::marker {
    content: none;
  }
}

/* Content animation */
details > div {
  overflow: hidden;
  max-height: 0;
  transition: max-height 300ms ease-out, padding 300ms ease-out;
}

details[open] > div {
  max-height: 1000px; /* Large enough for content */
  transition: max-height 500ms ease-in, padding 300ms ease-in;
}

/* Alternative: Use grid for better animation */
details > div {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 300ms ease-out;
}

details[open] > div {
  grid-template-rows: 1fr;
}

details > div > * {
  overflow: hidden;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  details > div {
    transition: none;
  }
}
```

### 4. Handle Single-Open Accordion

For accordion behavior (only one open at a time), use the `name` attribute:

```html
<!-- All details with same name: only one can be open -->
<details name="faq-accordion">
  <summary>Question 1</summary>
  <p>Answer 1</p>
</details>

<details name="faq-accordion">
  <summary>Question 2</summary>
  <p>Answer 2</p>
</details>

<details name="faq-accordion">
  <summary>Question 3</summary>
  <p>Answer 3</p>
</details>
```

### 5. Create Accordion Component

```tsx
interface AccordionItem {
  id: string
  title: React.ReactNode
  content: React.ReactNode
}

interface AccordionProps {
  items: AccordionItem[]
  name?: string
  allowMultiple?: boolean
  className?: string
}

function Accordion({ items, name, allowMultiple = false, className }: AccordionProps) {
  const accordionName = allowMultiple ? undefined : (name || 'accordion-' + React.useId())

  return (
    <div className={cn("divide-y border rounded-lg", className)}>
      {items.map((item) => (
        <details key={item.id} name={accordionName} className="group">
          <summary className="p-4 cursor-pointer list-none flex justify-between items-center">
            {item.title}
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4">
            {item.content}
          </div>
        </details>
      ))}
    </div>
  )
}
```

### 6. Handle Programmatic Control (If Needed)

```tsx
// Minimal JS for programmatic open/close
function toggleDetails(detailsId: string, forceState?: boolean) {
  const details = document.getElementById(detailsId) as HTMLDetailsElement
  if (details) {
    details.open = forceState ?? !details.open
  }
}

// Listen for toggle events
function useDetailsState(detailsRef: React.RefObject<HTMLDetailsElement>) {
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    const details = detailsRef.current
    if (!details) return

    const handleToggle = () => setIsOpen(details.open)
    details.addEventListener('toggle', handleToggle)
    return () => details.removeEventListener('toggle', handleToggle)
  }, [detailsRef])

  return isOpen
}
```

### 7. Test Accessibility

- [ ] Keyboard: Enter/Space toggles open state
- [ ] `open` attribute reflects current state
- [ ] Summary is focusable
- [ ] Proper heading hierarchy within summary (if needed)
- [ ] Screen reader announces expanded/collapsed state

## Expected Artifacts

| Artifact | Location |
|----------|----------|
| Disclosure component | `src/components/ui/disclosure.tsx` |
| Accordion component | `src/components/ui/accordion.tsx` |
| CSS additions | `src/app/globals.css` |

## Validation Checklist

- [ ] Native `<details>/<summary>` used
- [ ] Click/keyboard toggles state
- [ ] Animation works
- [ ] Single-open accordion uses `name` attribute
- [ ] Reduced motion respected
- [ ] Accessible to screen readers

## Success Criteria
- Disclosure functionality preserved
- Zero JS for basic expand/collapse
- Animation smooth and accessible
- Accordion single-open works via `name`
