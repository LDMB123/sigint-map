# Native HTML `<details>`/`<summary>` Code Snippets
## Ready-to-Use Components for DMB Almanac

These snippets follow the exact patterns used successfully in this codebase.

---

## 1. FAQ Accordion (RFC Compliant)

This is the exact pattern from `/src/routes/faq/+page.svelte`.

### Svelte Component

```svelte
<script lang="ts">
  interface FAQItem {
    question: string;
    answer: string | string[];
  }

  const faqs: FAQItem[] = [
    {
      question: "Your question here",
      answer: [
        "First paragraph of answer",
        "Second paragraph of answer"
      ]
    }
  ];
</script>

<div class="content">
  {#each faqs as faq}
    <details class="faq-item" name="faq">
      <summary class="question">
        <span class="question-text">{faq.question}</span>
        <span class="chevron" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            role="img"
            aria-label="Toggle answer"
          >
            <title>Toggle answer</title>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </summary>
      <div class="answer">
        {#if Array.isArray(faq.answer)}
          {#each faq.answer as paragraph}
            <p class="answer-text">{paragraph}</p>
          {/each}
        {:else}
          <p class="answer-text">{faq.answer}</p>
        {/if}
      </div>
    </details>
  {/each}
</div>

<style>
  /* Container */
  .content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    max-width: 800px;
  }

  /* Accordion Item */
  .faq-item {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    background: var(--card-bg);
    overflow: hidden;
    transition: border-color var(--transition-fast);
  }

  .faq-item[open] {
    border-color: var(--color-primary-400);
  }

  /* Question (Summary) - the clickable header */
  .question {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-5);
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--foreground);
    cursor: pointer;
    list-style: none;
    user-select: none;
    transition: background-color var(--transition-fast);
  }

  /* Remove default WebKit/Blink marker */
  .question::-webkit-details-marker {
    display: none;
  }

  .question:hover {
    background-color: var(--background-secondary);
  }

  .question:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: -2px;
  }

  .question-text {
    flex: 1;
  }

  /* Chevron icon rotation */
  .chevron {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    color: var(--foreground-secondary);
    transition: transform var(--transition-fast);
  }

  .chevron svg {
    width: 100%;
    height: 100%;
  }

  .faq-item[open] .chevron {
    transform: rotate(180deg);
  }

  /* Answer content with animation */
  .answer {
    padding: 0 var(--space-5) var(--space-5);
    color: var(--foreground-secondary);
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

  .answer-text {
    margin: 0;
    line-height: 1.6;
  }

  .answer-text + .answer-text {
    margin-top: var(--space-3);
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .answer {
      animation: none;
    }

    .chevron {
      transition: none;
    }
  }
</style>
```

### Key Features
- **Mutually exclusive accordion**: `name="faq"` ensures only one open at a time
- **No JavaScript state**: Browser handles toggle natively
- **Smooth animation**: CSS animation on `.answer`
- **Accessible**: Proper `aria-label`, focus visible, semantic HTML
- **Mobile friendly**: Responsive padding and font sizes

---

## 2. Mobile Navigation Menu

This is the pattern from `/src/lib/components/navigation/Header.svelte`.

### Svelte Component

```svelte
<script lang="ts">
  import { page } from '$app/stores';

  const navigation = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' }
  ];

  let mobileMenuDetails = $state<HTMLDetailsElement | null>(null);

  // Auto-close menu when page changes
  $effect(() => {
    if (mobileMenuDetails && $page) {
      mobileMenuDetails.open = false;
    }
  });
</script>

<header class="header">
  <div class="container">
    <a href="/" class="logo">Logo</a>

    <!-- Mobile Menu - CSS-only toggle using <details> -->
    <details class="mobileMenuDetails" bind:this={mobileMenuDetails}>
      <summary class="menuButton" aria-label="Toggle navigation menu">
        <span class="menuIcon" aria-hidden="true">
          <span class="menuLine"></span>
          <span class="menuLine"></span>
          <span class="menuLine"></span>
        </span>
      </summary>

      <nav id="mobile-navigation" class="mobileNav" aria-label="Mobile navigation">
        {#each navigation as item, index}
          <a
            href={item.href}
            class="mobileNavLink"
            style="--stagger-index: {index + 1}"
          >
            {item.label}
          </a>
        {/each}
      </nav>
    </details>
  </div>
</header>

<style>
  .header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--background);
    border-bottom: 1px solid var(--border-color);
    backdrop-filter: blur(10px);
  }

  .container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1280px;
    margin: 0 auto;
    padding: var(--space-3) var(--space-4);
  }

  .logo {
    font-weight: bold;
    text-decoration: none;
    color: var(--foreground);
  }

  /* Mobile Menu - CSS-only <details>/<summary> */
  .mobileMenuDetails {
    display: block;
  }

  @media (min-width: 1024px) {
    .mobileMenuDetails {
      display: none;
    }
  }

  /* Remove default marker */
  .mobileMenuDetails > :global(summary) {
    list-style: none;
  }

  .mobileMenuDetails > :global(summary::-webkit-details-marker) {
    display: none;
  }

  /* Menu Button */
  .menuButton {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--foreground);
    border-radius: var(--radius-lg);
    transition: background-color var(--transition-fast);
  }

  .menuButton:hover {
    background-color: var(--background-secondary);
  }

  .menuButton:active {
    transform: scale(0.95);
  }

  .menuIcon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    gap: 5px;
  }

  /* Hamburger lines that transform to X */
  .menuLine {
    display: block;
    width: 20px;
    height: 2px;
    background-color: currentColor;
    border-radius: 1px;
    transition:
      transform 200ms ease,
      opacity 200ms ease;
    transform-origin: center;
  }

  /* Transform hamburger to X when details[open] */
  .mobileMenuDetails[open] .menuLine:nth-child(1) {
    transform: translateY(7px) rotate(45deg);
  }

  .mobileMenuDetails[open] .menuLine:nth-child(2) {
    opacity: 0;
    transform: scaleX(0);
  }

  .mobileMenuDetails[open] .menuLine:nth-child(3) {
    transform: translateY(-7px) rotate(-45deg);
  }

  /* Mobile Navigation Menu */
  .mobileNav {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    padding: var(--space-2) var(--space-4) var(--space-4);
    border-top: 1px solid var(--border-color);
    background-color: var(--background);
    animation: slideDown 200ms ease-out;
    transform-origin: top;
    z-index: 50;
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

  @media (min-width: 1024px) {
    .mobileNav {
      display: none;
    }
  }

  .mobileNavLink {
    display: flex;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    color: var(--foreground-secondary);
    text-decoration: none;
    border-radius: var(--radius-lg);
    transition: all var(--transition-fast);
    min-height: 48px;
    animation: slideInFromRight 200ms ease-out both;
    animation-delay: calc(var(--stagger-index, 0) * 20ms);
  }

  .mobileNavLink:hover {
    color: var(--foreground);
    background-color: var(--background-secondary);
  }

  .mobileNavLink:active {
    background-color: var(--background-tertiary);
    transform: scale(0.98);
  }

  @keyframes slideInFromRight {
    from {
      opacity: 0;
      transform: translateX(16px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .mobileNav,
    .mobileNavLink,
    .menuIcon {
      animation: none;
      transition: none;
    }
  }
</style>
```

### Key Features
- **Zero JavaScript toggle**: Native `<details>` behavior
- **Auto-close on navigation**: Via `$effect` watching `$page`
- **Hamburger to X animation**: CSS transform on lines 1-3
- **Staggered link animation**: CSS custom properties for delay
- **GPU optimized**: `transform` instead of height animations
- **Mobile-first**: Hidden on desktop via media query

---

## 3. Simple Collapsible Section

Minimal pattern for any collapsible content.

### Svelte Component

```svelte
<details class="collapsible">
  <summary class="header">Click to expand</summary>
  <div class="content">
    <p>This content is hidden by default.</p>
  </div>
</details>

<style>
  .collapsible {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 0;
  }

  .header {
    padding: var(--space-4);
    cursor: pointer;
    user-select: none;
    list-style: none;
    font-weight: var(--font-semibold);
  }

  .header::-webkit-details-marker {
    display: none;
  }

  .header::before {
    content: '▶ ';
    display: inline-block;
    transition: transform 0.2s;
    margin-right: var(--space-2);
  }

  .collapsible[open] .header::before {
    transform: rotate(90deg);
  }

  .content {
    padding: 0 var(--space-4) var(--space-4);
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
    .content {
      animation: none;
    }

    .header::before {
      transition: none;
    }
  }
</style>
```

---

## 4. Dialog Modal

Use this pattern from `/src/lib/components/pwa/InstallPrompt.svelte` for modals.

### Svelte Component

```svelte
<script lang="ts">
  let dialogRef: HTMLDialogElement | null = $state(null);
  let isOpen = $state(false);

  function openDialog() {
    isOpen = true;
  }

  function closeDialog() {
    isOpen = false;
  }

  // Sync dialog element with state
  $effect(() => {
    if (isOpen && dialogRef) {
      dialogRef.showModal();
    } else if (!isOpen && dialogRef) {
      dialogRef.close();
    }
  });
</script>

<button onclick={openDialog}>Open Dialog</button>

<dialog
  bind:this={dialogRef}
  class="modal-dialog"
  aria-labelledby="dialog-title"
  onclose={closeDialog}
>
  <div class="dialog-content">
    <h2 id="dialog-title" class="dialog-title">Dialog Title</h2>
    <p class="dialog-description">Dialog description goes here.</p>
    <div class="dialog-actions">
      <button type="button" onclick={closeDialog} class="btn-secondary">
        Cancel
      </button>
      <button type="button" onclick={closeDialog} class="btn-primary">
        Confirm
      </button>
    </div>
  </div>
</dialog>

<style>
  :global(dialog.modal-dialog) {
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
    :global(dialog.modal-dialog[open]) {
      opacity: 0;
      transform: translateY(20px);
    }
  }

  :global(dialog.modal-dialog:not([open])) {
    opacity: 0;
    transform: translateY(20px);
  }

  :global(dialog.modal-dialog::backdrop) {
    background-color: rgba(0, 0, 0, 0.5);
    transition: background-color 300ms ease-out, overlay 300ms allow-discrete;
  }

  @starting-style {
    :global(dialog.modal-dialog[open]::backdrop) {
      background-color: rgba(0, 0, 0, 0);
    }
  }

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
    color: var(--foreground-secondary);
    line-height: 1.5;
  }

  .dialog-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 12px;
  }

  .btn-primary,
  .btn-secondary {
    padding: 10px 20px;
    border-radius: 8px;
    border: none;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background-color: var(--color-primary-600);
    color: white;
  }

  .btn-primary:hover {
    background-color: var(--color-primary-700);
  }

  .btn-secondary {
    background-color: var(--background-secondary);
    color: var(--foreground);
  }

  .btn-secondary:hover {
    background-color: var(--background-tertiary);
  }

  @media (prefers-reduced-motion: reduce) {
    :global(dialog.modal-dialog),
    :global(dialog.modal-dialog::backdrop) {
      transition: none;
    }
  }
</style>
```

### Key Features
- **Chromium 117+ `@starting-style`**: Smooth entry/exit animations
- **Automatic backdrop**: `<dialog>` provides backdrop layer
- **Focus trap**: Browser manages focus automatically
- **Escape key**: Close with Escape key by default
- **Accessibility**: Proper ARIA labels, semantic structure

---

## 5. Accordion Group (Multiple Independent Accordions)

Use when you need multiple collapsible sections, not mutually exclusive.

### Svelte Component

```svelte
<script lang="ts">
  const sections = [
    { id: 'section-1', title: 'Section 1', content: 'Content 1' },
    { id: 'section-2', title: 'Section 2', content: 'Content 2' }
  ];
</script>

<div class="accordion-group">
  {#each sections as section}
    <details class="accordion-item" id={section.id}>
      <summary class="accordion-header">{section.title}</summary>
      <div class="accordion-body">
        <p>{section.content}</p>
      </div>
    </details>
  {/each}
</div>

<style>
  .accordion-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .accordion-item {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .accordion-header {
    padding: var(--space-3) var(--space-4);
    cursor: pointer;
    user-select: none;
    list-style: none;
    font-weight: 500;
    transition: background-color 0.15s;
  }

  .accordion-header::-webkit-details-marker {
    display: none;
  }

  .accordion-header:hover {
    background-color: var(--background-secondary);
  }

  .accordion-body {
    padding: var(--space-4);
    border-top: 1px solid var(--border-color);
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
</style>
```

### Note
**Difference from RFC accordion**: Each section can be open independently (no `name` attribute). For mutually exclusive (one at a time), add `name="accordion"` to all `<details>` elements.

---

## Common Patterns

### Pattern: Custom Chevron/Arrow Icon

```svelte
<details class="collapsible">
  <summary class="header">
    <span>Title</span>
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  </summary>
  <div class="content">Content</div>
</details>

<style>
  .icon {
    width: 20px;
    height: 20px;
    transition: transform 0.2s;
  }

  .collapsible[open] .icon {
    transform: rotate(180deg);
  }
</style>
```

### Pattern: Disabled Details

```svelte
<details class="collapsible" disabled>
  <summary>This cannot be opened</summary>
  <div>Content</div>
</details>

<style>
  .collapsible[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .collapsible[disabled] summary {
    pointer-events: none;
  }
</style>
```

### Pattern: Nested Details

```svelte
<details class="parent">
  <summary>Parent Section</summary>
  <div>
    <p>Parent content</p>

    <details class="child">
      <summary>Child Section</summary>
      <div>Child content</div>
    </details>
  </div>
</details>

<style>
  .child {
    margin-top: var(--space-3);
  }
</style>
```

---

## Testing Checklist

- [ ] Test with keyboard: Tab to summary, Enter/Space to toggle
- [ ] Test Escape key: Should close any open `<dialog>`
- [ ] Test mobile: Details should work on touch devices
- [ ] Test screen reader: Announce open/closed state
- [ ] Test prefers-reduced-motion: Animations should be disabled
- [ ] Test in Chrome 131+: `@starting-style` should work
- [ ] Test in Safari: All patterns should degrade gracefully
- [ ] Test with JavaScript disabled: Details should still work

---

## Performance Notes

1. **No JavaScript overhead**: `<details>` toggle is native
2. **GPU accelerated**: Use `transform` for animations, not `height`
3. **Composited**: Animations run on GPU thread on Apple Silicon
4. **Efficient**: Single `::before` pseudo-element per summary
5. **Accessible**: No extra ARIA needed for `<details>`/`<summary>`

---

## Migration Path

If converting from custom collapse components:

**Before (JS-based)**:
```svelte
<script>
  let isOpen = $state(false);
</script>

<button onclick={() => isOpen = !isOpen}>Toggle</button>
{#if isOpen}
  <div class="content">Content</div>
{/if}

<style>
  .content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s;
  }
</style>
```

**After (HTML native)**:
```svelte
<details>
  <summary>Toggle</summary>
  <div class="content">Content</div>
</details>

<style>
  .content {
    animation: slideDown 0.2s ease-out;
  }
</style>
```

---

**All examples tested with SvelteKit 2 + Svelte 5 runes on macOS 26.2 / Apple Silicon**

**Chrome 143+ compatible**
