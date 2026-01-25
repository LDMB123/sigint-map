---
name: details-summary
description: Implement native <details>/<summary> for accordions and collapsible content
trigger: /details
used_by: [semantic-html-engineer, full-stack-developer, senior-frontend-engineer]
tags: [html5, accessibility, accordion, disclosure, chromium]
---

# Native HTML Details and Summary Elements

Implement native `<details>` and `<summary>` elements for accordions, FAQs, and collapsible content with zero JavaScript.

## When to Use

- **Accordions**: FAQ sections, settings panels, expandable lists
- **Disclosure widgets**: "Show more" content, collapsible sections
- **Mobile navigation**: Hamburger menus, nested navigation
- **Form sections**: Multi-step forms with collapsible steps
- **Product details**: Expandable product specifications

**DO NOT USE FOR:**
- Modal dialogs (use `<dialog>` instead)
- Tooltips (use `popover` attribute)
- Tabs (use tab pattern with ARIA)
- Dropdown menus requiring complex navigation

## Browser Support

- Chrome/Edge: 12+ (basic support)
- Safari: 6.1+
- Firefox: 49+
- All modern browsers: Full support with animations

## Required Inputs

- Summary text (clickable header)
- Content to show/hide
- Optional: Exclusive accordion behavior (name attribute)
- Optional: Default open state

## Implementation

### Vanilla HTML/CSS

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Details/Summary Examples</title>
  <style>
    /* Reset default browser styling */
    details {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 8px;
      overflow: hidden;
      transition: border-color 0.2s;
    }

    details[open] {
      border-color: #3b82f6;
    }

    /* Remove default marker/triangle */
    summary {
      list-style: none;
      cursor: pointer;
      user-select: none;
      padding: 16px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background-color 0.2s;
    }

    summary::-webkit-details-marker {
      display: none;
    }

    summary:hover {
      background-color: #f9fafb;
    }

    summary:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: -2px;
    }

    /* Custom chevron icon */
    summary::after {
      content: '▼';
      font-size: 12px;
      color: #6b7280;
      transition: transform 0.2s;
    }

    details[open] summary::after {
      transform: rotate(180deg);
    }

    /* Content area with animation */
    .details-content {
      padding: 0 16px 16px;
      color: #4b5563;
      line-height: 1.6;
      animation: slideDown 0.2s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Respect reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .details-content {
        animation: none;
      }
      summary::after {
        transition: none;
      }
    }

    /* FAQ specific styling */
    .faq-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    .faq-item {
      background: white;
    }

    .faq-question {
      font-size: 16px;
    }

    .faq-answer {
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="faq-container">
    <h1>Frequently Asked Questions</h1>

    <!-- Exclusive accordion - only one open at a time -->
    <details class="faq-item" name="faq">
      <summary class="faq-question">What is the return policy?</summary>
      <div class="details-content">
        <p class="faq-answer">
          We offer a 30-day return policy for all unused items in original packaging.
          Shipping costs are non-refundable.
        </p>
      </div>
    </details>

    <details class="faq-item" name="faq">
      <summary class="faq-question">How long does shipping take?</summary>
      <div class="details-content">
        <p class="faq-answer">
          Standard shipping takes 5-7 business days. Express shipping available
          for 2-3 business days delivery.
        </p>
      </div>
    </details>

    <details class="faq-item" name="faq" open>
      <summary class="faq-question">Do you ship internationally?</summary>
      <div class="details-content">
        <p class="faq-answer">
          Yes! We ship to over 50 countries worldwide. International shipping
          times vary by destination.
        </p>
      </div>
    </details>

    <details class="faq-item" name="faq">
      <summary class="faq-question">What payment methods do you accept?</summary>
      <div class="details-content">
        <p class="faq-answer">
          We accept all major credit cards, PayPal, Apple Pay, and Google Pay.
        </p>
      </div>
    </details>
  </div>

  <script>
    // Optional: Listen for toggle events
    document.querySelectorAll('details').forEach(details => {
      details.addEventListener('toggle', (e) => {
        console.log(`Details ${details.open ? 'opened' : 'closed'}`);
      });
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

interface AccordionItemProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  name?: string;
  className?: string;
  onToggle?: (isOpen: boolean) => void;
}

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
  name,
  className,
  onToggle
}: AccordionItemProps) {
  const detailsRef = React.useRef<HTMLDetailsElement>(null);

  React.useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;

    const handleToggle = () => {
      onToggle?.(details.open);
    };

    details.addEventListener('toggle', handleToggle);
    return () => details.removeEventListener('toggle', handleToggle);
  }, [onToggle]);

  return (
    <details
      ref={detailsRef}
      open={defaultOpen}
      name={name}
      className={cn(
        "border border-gray-200 rounded-lg overflow-hidden",
        "transition-colors",
        "open:border-blue-500",
        className
      )}
    >
      <summary
        className={cn(
          "cursor-pointer list-none select-none",
          "px-4 py-3 font-semibold",
          "flex items-center justify-between",
          "hover:bg-gray-50 transition-colors",
          "focus-visible:outline-2 focus-visible:outline-blue-500"
        )}
      >
        <span>{title}</span>
        <ChevronIcon className="w-4 h-4 transition-transform [[open]>&]:rotate-180" />
      </summary>
      <div className="px-4 pb-4 text-gray-600 animate-slideDown">
        {children}
      </div>
    </details>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

interface AccordionProps {
  items: Array<{
    id: string;
    title: React.ReactNode;
    content: React.ReactNode;
  }>;
  exclusive?: boolean;
  defaultOpenId?: string;
  className?: string;
}

export function Accordion({
  items,
  exclusive = false,
  defaultOpenId,
  className
}: AccordionProps) {
  // Generate unique name for exclusive accordion
  const accordionName = React.useId();

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          title={item.title}
          defaultOpen={item.id === defaultOpenId}
          name={exclusive ? accordionName : undefined}
        >
          {item.content}
        </AccordionItem>
      ))}
    </div>
  );
}

// Simple disclosure widget
interface DisclosureProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function Disclosure({
  title,
  children,
  defaultOpen = false,
  className
}: DisclosureProps) {
  return (
    <details open={defaultOpen} className={cn("group", className)}>
      <summary className="cursor-pointer list-none font-medium">
        <span className="inline-flex items-center gap-2">
          <span className="transition-transform group-open:rotate-90">▶</span>
          {title}
        </span>
      </summary>
      <div className="mt-2 pl-6 text-gray-600">
        {children}
      </div>
    </details>
  );
}

// Usage Example
export function FAQExample() {
  const faqs = [
    {
      id: '1',
      title: 'What is the return policy?',
      content: (
        <p>
          We offer a 30-day return policy for all unused items in original packaging.
          Shipping costs are non-refundable.
        </p>
      )
    },
    {
      id: '2',
      title: 'How long does shipping take?',
      content: (
        <p>
          Standard shipping takes 5-7 business days. Express shipping available
          for 2-3 business days delivery.
        </p>
      )
    },
    {
      id: '3',
      title: 'Do you ship internationally?',
      content: (
        <p>
          Yes! We ship to over 50 countries worldwide. International shipping
          times vary by destination.
        </p>
      )
    }
  ];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">FAQ</h1>
      <Accordion items={faqs} exclusive defaultOpenId="3" />
    </div>
  );
}
```

### Svelte 5 Implementation

```svelte
<script lang="ts">
  interface AccordionItem {
    id: string;
    title: string;
    content: string;
  }

  interface Props {
    items: AccordionItem[];
    exclusive?: boolean;
    defaultOpenId?: string;
    class?: string;
  }

  let {
    items,
    exclusive = false,
    defaultOpenId,
    class: className = ''
  }: Props = $props();

  // Generate unique name for exclusive accordion
  const accordionName = exclusive ? `accordion-${Math.random().toString(36).slice(2)}` : undefined;

  function handleToggle(event: Event, itemId: string) {
    const details = event.target as HTMLDetailsElement;
    console.log(`Item ${itemId} ${details.open ? 'opened' : 'closed'}`);
  }
</script>

<div class="accordion {className}">
  {#each items as item (item.id)}
    <details
      class="accordion-item"
      open={item.id === defaultOpenId}
      name={accordionName}
      ontoggle={(e) => handleToggle(e, item.id)}
    >
      <summary class="accordion-summary">
        <span class="accordion-title">{item.title}</span>
        <svg
          class="chevron"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div class="accordion-content">
        <p>{item.content}</p>
      </div>
    </details>
  {/each}
</div>

<style>
  .accordion {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 800px;
  }

  .accordion-item {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    transition: border-color 0.2s;
  }

  .accordion-item[open] {
    border-color: #3b82f6;
  }

  .accordion-summary {
    list-style: none;
    cursor: pointer;
    user-select: none;
    padding: 16px;
    font-weight: 600;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background-color 0.2s;
  }

  .accordion-summary::-webkit-details-marker {
    display: none;
  }

  .accordion-summary:hover {
    background-color: #f9fafb;
  }

  .accordion-summary:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
  }

  .chevron {
    width: 20px;
    height: 20px;
    color: #6b7280;
    transition: transform 0.2s;
  }

  .accordion-item[open] .chevron {
    transform: rotate(180deg);
  }

  .accordion-content {
    padding: 0 16px 16px;
    color: #4b5563;
    line-height: 1.6;
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .accordion-content {
      animation: none;
    }
    .chevron {
      transition: none;
    }
  }
</style>

<!-- Usage Example -->
<script lang="ts">
  const faqs = [
    {
      id: '1',
      title: 'What is the return policy?',
      content: 'We offer a 30-day return policy for all unused items in original packaging.'
    },
    {
      id: '2',
      title: 'How long does shipping take?',
      content: 'Standard shipping takes 5-7 business days. Express shipping is 2-3 days.'
    },
    {
      id: '3',
      title: 'Do you ship internationally?',
      content: 'Yes! We ship to over 50 countries worldwide.'
    }
  ];
</script>

<Accordion items={faqs} exclusive defaultOpenId="1" />
```

## Key Features

### Exclusive Accordion (name attribute)

When multiple `<details>` elements share the same `name` attribute, only one can be open at a time (like radio buttons):

```html
<!-- Only one can be open at a time -->
<details name="faq">
  <summary>Question 1</summary>
  <p>Answer 1</p>
</details>

<details name="faq">
  <summary>Question 2</summary>
  <p>Answer 2</p>
</details>
```

### Independent Details (no name)

Without a `name` attribute, all details can be open simultaneously:

```html
<!-- All can be open at once -->
<details>
  <summary>Section 1</summary>
  <p>Content 1</p>
</details>

<details>
  <summary>Section 2</summary>
  <p>Content 2</p>
</details>
```

### Programmatic Control

```javascript
// Open/close via JavaScript
const details = document.querySelector('details');
details.open = true;  // Open
details.open = false; // Close

// Listen for toggle event
details.addEventListener('toggle', () => {
  console.log(details.open ? 'Opened' : 'Closed');
});
```

## Common Patterns

### Mobile Navigation Menu

```html
<details class="mobile-menu">
  <summary aria-label="Toggle navigation menu">
    <span class="hamburger" aria-hidden="true">
      <span class="line"></span>
      <span class="line"></span>
      <span class="line"></span>
    </span>
  </summary>
  <nav aria-label="Mobile navigation">
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
</details>

<style>
  /* Hamburger to X animation */
  .mobile-menu[open] .line:nth-child(1) {
    transform: translateY(7px) rotate(45deg);
  }
  .mobile-menu[open] .line:nth-child(2) {
    opacity: 0;
  }
  .mobile-menu[open] .line:nth-child(3) {
    transform: translateY(-7px) rotate(-45deg);
  }
</style>
```

### Nested Accordions

```html
<details>
  <summary>Parent Section</summary>
  <div>
    <p>Parent content</p>
    <details>
      <summary>Child Section</summary>
      <p>Child content</p>
    </details>
  </div>
</details>
```

### Custom Marker Icons

```css
/* Remove default marker */
summary {
  list-style: none;
}

summary::-webkit-details-marker {
  display: none;
}

/* Add custom icon */
summary::before {
  content: '▶';
  display: inline-block;
  margin-right: 8px;
  transition: transform 0.2s;
}

details[open] summary::before {
  transform: rotate(90deg);
}
```

## Animation Challenges and Solutions

### Problem: Animating height: auto

CSS cannot transition `height: auto`. Here are solutions:

**Solution 1: Animate transform instead**
```css
.content {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Solution 2: Use max-height**
```css
.content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
}

details[open] .content {
  max-height: 500px; /* Must be larger than content */
}
```

**Solution 3: Use CSS Grid (modern)**
```css
.content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease-out;
}

details[open] .content {
  grid-template-rows: 1fr;
}

.content > * {
  overflow: hidden;
}
```

## Accessibility Features

### Built-in Keyboard Support
- **Enter/Space**: Toggle open/closed state
- **Summary is automatically focusable**: No `tabindex` needed

### Screen Reader Support
- Announces "collapsed" or "expanded" state automatically
- Summary acts as button for assistive technology
- No ARIA attributes required for basic functionality

### Optional Enhancements
```html
<details>
  <summary aria-label="Show product specifications">
    Specifications
  </summary>
  <div>
    <!-- Content -->
  </div>
</details>
```

## Accessibility Checklist

- [ ] Summary text is descriptive
- [ ] Content inside details is properly structured (headings, lists)
- [ ] Custom icons have `aria-hidden="true"`
- [ ] Focus indicator visible on summary
- [ ] Animation respects `prefers-reduced-motion`
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Keyboard works (Enter/Space to toggle)

## Browser Compatibility

All modern browsers support `<details>` and `<summary>`:
- Chrome/Edge: 12+
- Safari: 6.1+
- Firefox: 49+
- Mobile browsers: Full support

**No polyfill needed** for modern browsers.

## Migration from JS Accordions

**Before (JavaScript):**
```javascript
const accordion = createAccordion({
  items: [...],
  exclusive: true,
  animate: true
});
```

**After (Native HTML):**
```html
<details name="accordion">
  <summary>Item 1</summary>
  <p>Content 1</p>
</details>
```

**Complexity Reduction:**
- No state management (useState, signals)
- No click handlers
- No ARIA attributes for expand/collapse
- No animation library
- Browser handles everything

## Performance Benefits

- Zero JavaScript for basic functionality
- GPU-accelerated animations (transform/opacity)
- No layout thrashing from height animations
- Lazy rendering (content rendered only when open)

## Expected Output

A fully functional accordion/disclosure widget with:
- Native browser toggle behavior
- Keyboard accessibility (Enter/Space)
- Screen reader support
- Smooth animations
- Exclusive accordion mode (optional)
- Zero JavaScript required

## Success Criteria

- [ ] Details toggle with click and keyboard
- [ ] Only one open at a time (if using name attribute)
- [ ] Animation smooth (200-300ms)
- [ ] Focus visible on summary
- [ ] Screen reader announces state
- [ ] Works without JavaScript
- [ ] Reduced motion respected

## References

- [MDN: `<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details)
- [MDN: `<summary>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary)
- [MDN: name attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details#name)
- [WCAG: Disclosure Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
