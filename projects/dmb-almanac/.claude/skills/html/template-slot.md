---
title: Template and Slot Elements for Web Components
category: html
description: Using <template>, <slot>, Shadow DOM, and custom elements for reusable markup
tags: [html5, web-components, template, slot, shadow-dom, custom-elements]
---

# Template and Slot Skill

## When to Use

- Creating reusable UI components without frameworks
- Building custom elements with encapsulated styles
- Implementing design system components
- Content projection patterns (similar to React children)
- Creating widget libraries that work across frameworks
- Server-side rendered components with progressive enhancement

## Required Inputs

- **Component name**: Custom element tag name (must contain hyphen)
- **Template structure**: HTML markup to clone
- **Slot names**: Named slots for specific content areas
- **Shadow DOM mode**: Open (inspectable) or closed (encapsulated)
- **Styling**: Component-scoped CSS

## Steps

### Step 1: Understand the `<template>` Element

The `<template>` tag holds HTML that is not rendered until cloned:

```html
<!-- This HTML is inert - not rendered, not executed -->
<template id="my-template">
  <div class="card">
    <h2>Card Title</h2>
    <p>Card content goes here</p>
    <button>Click me</button>
  </div>

  <style>
    .card {
      border: 1px solid #ccc;
      padding: 1rem;
      border-radius: 8px;
    }
  </style>
</template>

<script>
  // Clone and insert the template
  const template = document.getElementById('my-template');
  const clone = template.content.cloneNode(true);
  document.body.appendChild(clone);
</script>
```

**Key properties**:
- Content is inert (scripts don't run, images don't load)
- Can contain any HTML, including `<style>` and `<script>`
- Use `.content` property to access DocumentFragment
- Clone with `.cloneNode(true)` to duplicate

### Step 2: Create a Basic Custom Element

Register a custom element class:

```html
<!-- Define the template -->
<template id="user-card-template">
  <div class="user-card">
    <img src="" alt="" class="avatar">
    <div class="info">
      <h3 class="name"></h3>
      <p class="email"></p>
    </div>
  </div>

  <style>
    .user-card {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
    }

    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
    }

    .info {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  </style>
</template>

<script>
  class UserCard extends HTMLElement {
    constructor() {
      super();

      // Attach shadow DOM
      const shadow = this.attachShadow({ mode: 'open' });

      // Clone template
      const template = document.getElementById('user-card-template');
      const content = template.content.cloneNode(true);

      // Append to shadow DOM
      shadow.appendChild(content);
    }

    connectedCallback() {
      // Element added to DOM - populate with data
      const name = this.getAttribute('name') || 'Anonymous';
      const email = this.getAttribute('email') || '';
      const avatar = this.getAttribute('avatar') || 'default.png';

      this.shadowRoot.querySelector('.name').textContent = name;
      this.shadowRoot.querySelector('.email').textContent = email;
      this.shadowRoot.querySelector('.avatar').src = avatar;
      this.shadowRoot.querySelector('.avatar').alt = name;
    }
  }

  // Register the custom element
  customElements.define('user-card', UserCard);
</script>

<!-- Usage -->
<user-card
  name="Jane Doe"
  email="jane@example.com"
  avatar="https://via.placeholder.com/64"
></user-card>
```

### Step 3: Use `<slot>` for Content Projection

Slots allow passing content into components:

```html
<template id="alert-template">
  <div class="alert">
    <span class="icon">⚠️</span>
    <div class="content">
      <!-- Default slot: accepts any content -->
      <slot></slot>
    </div>
    <button class="close">×</button>
  </div>

  <style>
    .alert {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
    }

    .icon {
      font-size: 1.5rem;
    }

    .content {
      flex: 1;
    }

    .close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
    }
  </style>
</template>

<script>
  class AlertBox extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      const template = document.getElementById('alert-template');
      shadow.appendChild(template.content.cloneNode(true));

      // Handle close button
      shadow.querySelector('.close').addEventListener('click', () => {
        this.remove();
      });
    }
  }

  customElements.define('alert-box', AlertBox);
</script>

<!-- Usage: content goes into <slot> -->
<alert-box>
  <strong>Warning!</strong> This is an important message.
</alert-box>
```

### Step 4: Use Named Slots for Multiple Content Areas

Named slots allow targeting specific areas:

```html
<template id="card-template">
  <div class="card">
    <header class="card-header">
      <!-- Named slot for header content -->
      <slot name="header">Default Header</slot>
    </header>

    <div class="card-body">
      <!-- Default slot for main content -->
      <slot></slot>
    </div>

    <footer class="card-footer">
      <!-- Named slot for footer content -->
      <slot name="footer"></slot>
    </footer>
  </div>

  <style>
    .card {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
    }

    .card-header {
      background: #f5f5f5;
      padding: 1rem;
      border-bottom: 1px solid #ddd;
    }

    .card-body {
      padding: 1rem;
    }

    .card-footer {
      background: #f5f5f5;
      padding: 1rem;
      border-top: 1px solid #ddd;
    }
  </style>
</template>

<script>
  class CardComponent extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      const template = document.getElementById('card-template');
      shadow.appendChild(template.content.cloneNode(true));
    }
  }

  customElements.define('card-component', CardComponent);
</script>

<!-- Usage: assign content to named slots -->
<card-component>
  <h2 slot="header">Card Title</h2>

  <p>This is the main content of the card.</p>
  <p>It goes into the default slot.</p>

  <div slot="footer">
    <button>Cancel</button>
    <button>Save</button>
  </div>
</card-component>
```

### Step 5: Listen to Slot Changes

React when slotted content changes:

```html
<template id="list-template">
  <div class="list-container">
    <div class="count"></div>
    <ul>
      <slot></slot>
    </ul>
  </div>

  <style>
    .list-container {
      border: 1px solid #ddd;
      padding: 1rem;
    }

    .count {
      margin-bottom: 0.5rem;
      color: #666;
      font-size: 0.875rem;
    }
  </style>
</template>

<script>
  class DynamicList extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      const template = document.getElementById('list-template');
      shadow.appendChild(template.content.cloneNode(true));

      // Listen for slot changes
      const slot = shadow.querySelector('slot');
      slot.addEventListener('slotchange', () => {
        this.updateCount();
      });
    }

    connectedCallback() {
      this.updateCount();
    }

    updateCount() {
      const slot = this.shadowRoot.querySelector('slot');
      const items = slot.assignedElements({ flatten: true });
      const count = items.length;

      this.shadowRoot.querySelector('.count').textContent =
        `${count} item${count !== 1 ? 's' : ''}`;
    }
  }

  customElements.define('dynamic-list', DynamicList);
</script>

<!-- Usage -->
<dynamic-list>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</dynamic-list>
```

### Step 6: Access Slotted Content

Get elements assigned to slots:

```javascript
class MyComponent extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <slot name="header"></slot>
      <slot></slot>
    `;
  }

  connectedCallback() {
    const slots = this.shadowRoot.querySelectorAll('slot');

    slots.forEach(slot => {
      // Get assigned elements
      const assignedElements = slot.assignedElements();
      console.log('Slot name:', slot.name || 'default');
      console.log('Assigned elements:', assignedElements);

      // Get assigned nodes (includes text nodes)
      const assignedNodes = slot.assignedNodes();
      console.log('Assigned nodes:', assignedNodes);
    });
  }
}

customElements.define('my-component', MyComponent);
```

### Step 7: Create a Complete Component Example

Full example with template, slots, and Shadow DOM:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tab Component Example</title>
</head>
<body>

<template id="tabs-template">
  <div class="tabs">
    <div class="tab-buttons" role="tablist">
      <slot name="tabs"></slot>
    </div>
    <div class="tab-panels">
      <slot name="panels"></slot>
    </div>
  </div>

  <style>
    .tabs {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
    }

    .tab-buttons {
      display: flex;
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
    }

    ::slotted([slot="tabs"]) {
      padding: 1rem;
      border: none;
      background: none;
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }

    ::slotted([slot="tabs"][aria-selected="true"]) {
      background: white;
      border-bottom-color: #007bff;
    }

    .tab-panels {
      padding: 1rem;
    }

    ::slotted([slot="panels"]) {
      display: none;
    }

    ::slotted([slot="panels"][aria-hidden="false"]) {
      display: block;
    }
  </style>
</template>

<script>
  class TabsComponent extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      const template = document.getElementById('tabs-template');
      shadow.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
      const tabSlot = this.shadowRoot.querySelector('slot[name="tabs"]');
      const tabs = tabSlot.assignedElements();
      const panels = this.querySelectorAll('[slot="panels"]');

      // Show first tab by default
      if (tabs.length > 0 && panels.length > 0) {
        tabs[0].setAttribute('aria-selected', 'true');
        panels[0].setAttribute('aria-hidden', 'false');
      }

      // Handle tab clicks
      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
          // Deselect all tabs
          tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
          panels.forEach(p => p.setAttribute('aria-hidden', 'true'));

          // Select clicked tab
          tab.setAttribute('aria-selected', 'true');
          panels[index].setAttribute('aria-hidden', 'false');
        });
      });
    }
  }

  customElements.define('tabs-component', TabsComponent);
</script>

<!-- Usage -->
<tabs-component>
  <button slot="tabs" role="tab">Tab 1</button>
  <button slot="tabs" role="tab">Tab 2</button>
  <button slot="tabs" role="tab">Tab 3</button>

  <div slot="panels" role="tabpanel">Content for tab 1</div>
  <div slot="panels" role="tabpanel">Content for tab 2</div>
  <div slot="panels" role="tabpanel">Content for tab 3</div>
</tabs-component>

</body>
</html>
```

## Expected Output

- Template content is cloned and inserted into Shadow DOM
- Styles are scoped to component (don't leak out)
- Slotted content is projected into designated areas
- Component works across frameworks (framework-agnostic)
- Encapsulation: external styles don't affect component internals
- Events bubble from Shadow DOM to light DOM

## Code Examples by Framework

### Vanilla JavaScript (Full Example)

```javascript
// Define template inline
class ButtonGroup extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <style>
        .button-group {
          display: flex;
          gap: 0.5rem;
        }

        ::slotted(button) {
          padding: 0.5rem 1rem;
          border: 1px solid #007bff;
          background: white;
          color: #007bff;
          cursor: pointer;
          transition: all 0.2s;
        }

        ::slotted(button:hover) {
          background: #007bff;
          color: white;
        }
      </style>

      <div class="button-group">
        <slot></slot>
      </div>
    `;
  }
}

customElements.define('button-group', ButtonGroup);
```

### Lit (Web Component Library)

```javascript
import { LitElement, html, css } from 'lit';

class CardElement extends LitElement {
  static styles = css`
    .card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1rem;
    }
  `;

  render() {
    return html`
      <div class="card">
        <header>
          <slot name="header"></slot>
        </header>
        <main>
          <slot></slot>
        </main>
        <footer>
          <slot name="footer"></slot>
        </footer>
      </div>
    `;
  }
}

customElements.define('card-element', CardElement);
```

### Svelte (Web Component Mode)

```svelte
<svelte:options tag="my-counter" />

<script>
  let count = $state(0);

  function increment() {
    count += 1;
  }
</script>

<div class="counter">
  <p>Count: {count}</p>
  <button onclick={increment}>Increment</button>
  <slot />
</div>

<style>
  .counter {
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 8px;
  }
</style>
```

## Common Mistakes to Avoid

- **Not using hyphen in custom element name**: Must have hyphen (e.g., `my-component`)
- **Forgetting `mode: 'open'` in attachShadow**: Shadow DOM won't be accessible
- **Not cloning template**: Using `.content` directly moves nodes instead of copying
- **Styling slotted content incorrectly**: Use `::slotted()` pseudo-element
- **Expecting global styles to penetrate**: Shadow DOM encapsulates styles
- **Not handling slot fallback**: Provide default content in `<slot>`
- **Defining element name with uppercase**: Must be lowercase with hyphen

## Browser Support

| Browser | `<template>` | `<slot>` | Shadow DOM | Custom Elements |
|---------|--------------|----------|------------|-----------------|
| Chrome 35+ | ✅ | ✅ | ✅ | ✅ |
| Edge 79+ | ✅ | ✅ | ✅ | ✅ |
| Safari 10+ | ✅ | ✅ | ✅ | ✅ |
| Firefox 63+ | ✅ | ✅ | ✅ | ✅ |

All modern browsers support Web Components natively!

## Testing Checklist

- [ ] Custom element name contains hyphen
- [ ] Template content is cloned, not moved
- [ ] Shadow DOM is attached with `mode: 'open'`
- [ ] Slots accept content correctly
- [ ] Named slots receive targeted content
- [ ] Styles are scoped to component
- [ ] External styles don't leak into Shadow DOM
- [ ] Component works without framework
- [ ] Events bubble from Shadow DOM to light DOM
- [ ] Slot fallback content displays when slot is empty

## Success Criteria

- Component is framework-agnostic and reusable
- Styles are fully encapsulated (no leakage)
- Content projection works via slots
- Custom element is properly registered
- Shadow DOM provides style/DOM encapsulation
- WCAG 2.1 AA: Proper ARIA roles and attributes
- Works in all modern browsers without polyfills
