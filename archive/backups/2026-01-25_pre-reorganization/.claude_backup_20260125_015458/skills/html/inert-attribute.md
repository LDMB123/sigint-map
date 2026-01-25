---
title: Inert Attribute for Disabling Interactive Content
category: html
description: Using the inert attribute to disable interactive content during modals, loading states, and overlays
tags: [html5, inert, accessibility, modal, overlay, loading-state, keyboard-nav]
---

# Inert Attribute Skill

## When to Use

- Disabling content behind modal dialogs and overlays
- Preventing interaction during loading or processing states
- Temporarily disabling sidebar or navigation during transitions
- Preventing keyboard access to hidden content in accordions/tabs
- Avoiding focus traps in multi-step wizards
- Disabling page content while drawer/menu is open

## Required Inputs

- **Element to disable**: Container to make inert (sidebar, main content, etc.)
- **Trigger condition**: When to apply inert (modal open, loading, etc.)
- **Restore condition**: When to remove inert (modal close, loaded)
- **Nested interactivity**: Whether child elements should remain interactive (usually no)

## Steps

### Step 1: Understand What Inert Does

The `inert` attribute removes an element and its descendants from:
- **Tab order**: Cannot be focused with Tab key
- **Accessibility tree**: Hidden from screen readers
- **Click events**: Pointer events still work (use CSS `pointer-events: none` if needed)
- **Find-in-page**: Text cannot be searched

```html
<!-- All interactive elements inside are disabled -->
<div inert>
  <button>Cannot be clicked or focused</button>
  <input type="text" /> <!-- Cannot be focused -->
  <a href="/link">Cannot be tabbed to</a>
</div>
```

### Step 2: Apply Inert to Background Content When Modal Opens

When showing a modal, make the rest of the page inert:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Modal Example</title>
</head>
<body>
  <!-- Main page content - will become inert when modal opens -->
  <main id="main-content">
    <h1>Page Title</h1>
    <button id="open-modal">Open Modal</button>
    <nav>
      <a href="/home">Home</a>
      <a href="/about">About</a>
    </nav>
  </main>

  <!-- Modal - remains interactive when open -->
  <dialog id="modal">
    <h2>Modal Title</h2>
    <p>Modal content here</p>
    <button id="close-modal">Close</button>
  </dialog>

  <script>
    const mainContent = document.getElementById('main-content');
    const modal = document.getElementById('modal');
    const openBtn = document.getElementById('open-modal');
    const closeBtn = document.getElementById('close-modal');

    openBtn.addEventListener('click', () => {
      modal.showModal();
      mainContent.inert = true; // Disable background content
    });

    closeBtn.addEventListener('click', () => {
      modal.close();
      mainContent.inert = false; // Re-enable background content
    });
  </script>
</body>
</html>
```

**Note**: Native `<dialog>` with `.showModal()` automatically makes background content inert! This example is for custom modals.

### Step 3: Use During Loading States

Disable UI while data is loading:

```html
<div id="app">
  <main id="content">
    <h1>Dashboard</h1>
    <button id="load-data">Load Data</button>
    <div id="results"></div>
  </main>

  <!-- Loading overlay -->
  <div id="loading-overlay" hidden>
    <div class="spinner" aria-live="polite">Loading...</div>
  </div>
</div>

<script>
  const content = document.getElementById('content');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadBtn = document.getElementById('load-data');

  async function loadData() {
    // Disable main content
    content.inert = true;
    loadingOverlay.hidden = false;

    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      document.getElementById('results').textContent = JSON.stringify(data);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      // Re-enable main content
      content.inert = false;
      loadingOverlay.hidden = true;
    }
  }

  loadBtn.addEventListener('click', loadData);
</script>

<style>
  #loading-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  [inert] {
    opacity: 0.5;
    pointer-events: none; /* Also disable pointer events */
  }
</style>
```

### Step 4: Use with Drawer/Sidebar Navigation

Disable main content when sidebar is open:

```html
<div id="app">
  <aside id="sidebar" inert>
    <nav>
      <a href="/dashboard">Dashboard</a>
      <a href="/settings">Settings</a>
    </nav>
  </aside>

  <main id="main-content">
    <button id="toggle-sidebar">☰ Menu</button>
    <h1>Page Content</h1>
  </main>
</div>

<script>
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('main-content');
  const toggleBtn = document.getElementById('toggle-sidebar');
  let sidebarOpen = false;

  toggleBtn.addEventListener('click', () => {
    sidebarOpen = !sidebarOpen;

    if (sidebarOpen) {
      sidebar.inert = false;        // Enable sidebar
      mainContent.inert = true;      // Disable main content
      sidebar.classList.add('open');
    } else {
      sidebar.inert = true;          // Disable sidebar
      mainContent.inert = false;     // Enable main content
      sidebar.classList.remove('open');
    }
  });
</script>

<style>
  #sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s;
  }

  #sidebar.open {
    transform: translateX(0);
  }
</style>
```

### Step 5: Use with Accordions/Tabs (Hidden Content)

Prevent keyboard navigation to hidden accordion content:

```html
<div class="accordion">
  <button aria-expanded="false" aria-controls="panel-1">
    Section 1
  </button>
  <div id="panel-1" hidden inert>
    <p>Content for section 1</p>
    <a href="/link">Link inside panel</a>
  </div>

  <button aria-expanded="false" aria-controls="panel-2">
    Section 2
  </button>
  <div id="panel-2" hidden inert>
    <p>Content for section 2</p>
    <a href="/link">Link inside panel</a>
  </div>
</div>

<script>
  document.querySelectorAll('.accordion button').forEach(button => {
    button.addEventListener('click', () => {
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      const isExpanded = button.getAttribute('aria-expanded') === 'true';

      if (isExpanded) {
        panel.hidden = true;
        panel.inert = true;
        button.setAttribute('aria-expanded', 'false');
      } else {
        panel.hidden = false;
        panel.inert = false;
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });
</script>
```

### Step 6: Combine with CSS for Visual Feedback

Style inert elements to show they're disabled:

```css
/* Visual indication that content is inert */
[inert] {
  opacity: 0.5;
  filter: grayscale(50%);
  pointer-events: none; /* Prevent clicks */
  user-select: none;    /* Prevent text selection */
}

/* Custom cursor for inert areas */
[inert] * {
  cursor: not-allowed;
}

/* Ensure focus outline doesn't appear on inert elements */
[inert]:focus,
[inert] *:focus {
  outline: none;
}

/* Loading state with inert */
.loading-container[inert] {
  position: relative;
}

.loading-container[inert]::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Step 7: Polyfill for Older Browsers

Use the `wicg-inert` polyfill for browsers without native support:

```html
<script src="https://cdn.jsdelivr.net/npm/wicg-inert@3.1.2/dist/inert.min.js"></script>

<script>
  // Check if inert is supported
  if (!('inert' in HTMLElement.prototype)) {
    console.log('Using inert polyfill');
  }

  // Use inert normally - polyfill handles compatibility
  document.getElementById('main-content').inert = true;
</script>
```

## Expected Output

- Element with `inert` attribute cannot be focused with Tab
- Screen readers skip inert content entirely
- Click events may still fire (use CSS `pointer-events: none`)
- Nested elements inherit inert behavior
- Focus moves to next non-inert element when tabbing
- ARIA states (aria-expanded, aria-hidden) work independently

## Code Examples by Framework

### React

```jsx
function ModalExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const mainRef = useRef(null);

  const openModal = () => {
    setIsModalOpen(true);
    // Make main content inert
    if (mainRef.current) {
      mainRef.current.inert = true;
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // Re-enable main content
    if (mainRef.current) {
      mainRef.current.inert = false;
    }
  };

  return (
    <>
      <main ref={mainRef}>
        <h1>Page Title</h1>
        <button onClick={openModal}>Open Modal</button>
      </main>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true">
            <h2>Modal Title</h2>
            <button onClick={closeModal}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
```

### Svelte

```svelte
<script>
  let isModalOpen = $state(false);
  let mainElement = $state(null);

  function openModal() {
    isModalOpen = true;
    if (mainElement) {
      mainElement.inert = true;
    }
  }

  function closeModal() {
    isModalOpen = false;
    if (mainElement) {
      mainElement.inert = false;
    }
  }
</script>

<main bind:this={mainElement}>
  <h1>Page Title</h1>
  <button onclick={openModal}>Open Modal</button>
</main>

{#if isModalOpen}
  <div class="modal-overlay">
    <div class="modal" role="dialog" aria-modal="true">
      <h2>Modal Title</h2>
      <button onclick={closeModal}>Close</button>
    </div>
  </div>
{/if}
```

### Vue

```vue
<template>
  <main ref="mainElement">
    <h1>Page Title</h1>
    <button @click="openModal">Open Modal</button>
  </main>

  <div v-if="isModalOpen" class="modal-overlay">
    <div class="modal" role="dialog" aria-modal="true">
      <h2>Modal Title</h2>
      <button @click="closeModal">Close</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const isModalOpen = ref(false);
const mainElement = ref(null);

function openModal() {
  isModalOpen.value = true;
  if (mainElement.value) {
    mainElement.value.inert = true;
  }
}

function closeModal() {
  isModalOpen.value = false;
  if (mainElement.value) {
    mainElement.value.inert = false;
  }
}
</script>
```

## Common Mistakes to Avoid

- **Not combining with `pointer-events: none`**: Inert doesn't block clicks by default
- **Forgetting to remove inert**: Leaves UI permanently disabled
- **Using on individual form elements**: Use `disabled` attribute instead
- **Relying only on inert for security**: Still validate on server
- **Not providing visual feedback**: Users don't know content is disabled
- **Applying to `<body>`**: Makes entire page unusable, including screen reader

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 102+ | ✅ | Native support |
| Edge 102+ | ✅ | Native support |
| Safari 15.5+ | ✅ | Native support |
| Firefox 112+ | ✅ | Native support |
| Older browsers | ⚠️ | Use polyfill |

## Testing Checklist

- [ ] Inert elements cannot be focused with Tab key
- [ ] Screen reader skips inert content completely
- [ ] Pointer events are blocked (if using `pointer-events: none`)
- [ ] Visual indication shows content is disabled
- [ ] Inert state is removed when condition ends
- [ ] Keyboard shortcuts don't trigger in inert areas
- [ ] Find-in-page doesn't find text in inert areas
- [ ] Focus moves to next available element when inert is applied
- [ ] Works with polyfill in older browsers

## Success Criteria

- Users cannot interact with inert content via keyboard
- Screen readers don't announce inert content
- Visual design clearly shows disabled state
- Inert state is properly toggled on/off
- WCAG 2.1 AA: 2.4.3 Focus Order maintained
- WCAG 2.1 AA: 4.1.2 Name, Role, Value (proper state management)
