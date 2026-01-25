---
title: Invoker Commands (commandfor & command)
description: Declarative element invocation without JavaScript click handlers
tags: [chromium-143, invoker, popover, dialog, html-api]
min_chrome_version: 142
category: HTML APIs
complexity: beginner
last_updated: 2026-01
---

# Invoker Commands (Chrome 142+)

Declarative HTML for triggering element actions. No JavaScript event listeners - use commandfor and command attributes to show/hide dialogs, popovers, and custom invokers.

## When to Use

- **Button interactions** - Show/hide without click handlers
- **Popover triggers** - Declarative popover opening
- **Dialog controls** - Open/close modals without JavaScript
- **Form toggles** - Enable/disable sections
- **Custom actions** - Extensible command system
- **Accessibility** - Built-in keyboard and screen reader support

## Syntax

```html
<!-- Button that invokes command on target -->
<button commandfor="target-id" command="show-popover">
  Open Menu
</button>

<!-- Popover that responds to invoke -->
<div id="target-id" popover>
  Content
</div>

<!-- Commands: show-popover, hide-popover, toggle-popover -->
<!-- Available commands depend on target element type -->
```

## Examples

### Basic Popover Trigger

```html
<button commandfor="menu-popover" command="show-popover">
  Menu
</button>

<div id="menu-popover" popover>
  <button commandfor="menu-popover" command="hide-popover">Close</button>
  <a href="/profile">Profile</a>
  <a href="/settings">Settings</a>
</div>

<style>
  [popover] {
    opacity: 0;
    transform: scale(0.9);
    transition: opacity 0.2s, transform 0.2s;
  }

  [popover]:popover-open {
    opacity: 1;
    transform: scale(1);
  }
</style>
```

### Dialog with Actions

```html
<!-- Trigger button -->
<button commandfor="confirm-dialog" command="show-popover">
  Confirm Action
</button>

<!-- Dialog -->
<div id="confirm-dialog" popover="manual">
  <h2>Confirm Delete</h2>
  <p>This action cannot be undone.</p>

  <div class="dialog-actions">
    <button commandfor="confirm-dialog" command="hide-popover">
      Cancel
    </button>
    <button onclick="handleDelete()">
      Delete
    </button>
  </div>
</div>

<style>
  #confirm-dialog {
    max-width: 400px;
    padding: 1.5rem;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    background: white;
  }

  .dialog-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .dialog-actions button {
    flex: 1;
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .dialog-actions button:last-child {
    background: #d32f2f;
    color: white;
  }
</style>
```

### Toggle Popover

```html
<!-- Toggle button -->
<button commandfor="theme-selector" command="toggle-popover">
  Theme
</button>

<!-- Popover that toggles -->
<div id="theme-selector" popover>
  <label>
    <input type="radio" name="theme" value="light" />
    Light
  </label>
  <label>
    <input type="radio" name="theme" value="dark" />
    Dark
  </label>
  <label>
    <input type="radio" name="theme" value="auto" />
    Auto
  </label>
</div>

<style>
  #theme-selector {
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    background: white;
  }

  #theme-selector label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    cursor: pointer;
  }

  #theme-selector label:hover {
    background: #f5f5f5;
  }
</style>
```

### Nested Popovers

```html
<!-- Main menu -->
<button commandfor="main-menu" command="show-popover">
  Menu
</button>

<div id="main-menu" popover>
  <button commandfor="products-menu" command="show-popover">
    Products ▶
  </button>
  <a href="/about">About</a>
  <a href="/contact">Contact</a>

  <!-- Submenu -->
  <div id="products-menu" popover>
    <a href="/products/new">New</a>
    <a href="/products/popular">Popular</a>
    <a href="/products/sale">Sale</a>
  </div>
</div>

<style>
  [popover] {
    min-width: 200px;
  }

  [popover] button {
    width: 100%;
    text-align: left;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
  }

  [popover] a {
    display: block;
    padding: 0.75rem 1rem;
    text-decoration: none;
    color: #0066cc;
  }
</style>
```

### Search Dropdown

```html
<div class="search-container">
  <input type="search" placeholder="Search..." />

  <button commandfor="search-results" command="show-popover">
    ▼
  </button>

  <!-- Results popover -->
  <div id="search-results" popover>
    <div class="result">
      <a href="/item-1">Item 1</a>
    </div>
    <div class="result">
      <a href="/item-2">Item 2</a>
    </div>
    <div class="result">
      <a href="/item-3">Item 3</a>
    </div>
  </div>
</div>

<style>
  .search-container {
    position: relative;
  }

  .search-container input {
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    width: 300px;
  }

  .search-container button {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
  }

  #search-results {
    min-width: 300px;
    max-height: 400px;
    overflow-y: auto;
  }

  .result {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .result:hover {
    background: #f5f5f5;
  }

  .result a {
    text-decoration: none;
    color: #0066cc;
  }
</style>
```

### Mobile Menu

```html
<!-- Mobile menu button -->
<button commandfor="mobile-nav" command="toggle-popover" class="menu-button">
  ☰
</button>

<!-- Mobile navigation -->
<nav id="mobile-nav" popover="manual">
  <a href="/">Home</a>
  <a href="/products">Products</a>
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
</nav>

<style>
  .menu-button {
    display: none;
  }

  @media (max-width: 768px) {
    .menu-button {
      display: block;
      padding: 0.75rem 1rem;
      background: #0066cc;
      color: white;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
    }

    #mobile-nav {
      position: fixed;
      top: 3rem;
      left: 0;
      right: 0;
      background: white;
      border-bottom: 1px solid #ddd;
      display: flex;
      flex-direction: column;
    }

    #mobile-nav a {
      padding: 1rem;
      border-bottom: 1px solid #e0e0e0;
      text-decoration: none;
      color: #333;
    }
  }
</style>
```

### Form Field Actions

```html
<div class="form-group">
  <label for="password">Password</label>
  <div class="password-input">
    <input type="password" id="password" />
    <button commandfor="password-help" command="toggle-popover">
      ?
    </button>
  </div>

  <!-- Help popover -->
  <div id="password-help" popover>
    <h3>Password Requirements</h3>
    <ul>
      <li>At least 8 characters</li>
      <li>Include uppercase letter</li>
      <li>Include number</li>
      <li>Include special character</li>
    </ul>
  </div>
</div>

<style>
  .password-input {
    display: flex;
    gap: 0.5rem;
  }

  .password-input input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
  }

  .password-input button {
    padding: 0.5rem 0.75rem;
    background: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  #password-help {
    min-width: 250px;
    padding: 1rem;
  }
</style>
```

### Notification Toast

```html
<!-- Notification trigger -->
<button commandfor="notification" command="show-popover">
  Show Notification
</button>

<!-- Toast/notification -->
<div id="notification" popover="manual" class="toast">
  <span>Action completed successfully!</span>
  <button commandfor="notification" command="hide-popover">✕</button>
</div>

<style>
  .toast {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    background: #4caf50;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .toast button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1.25rem;
  }
</style>
```

### Dropdown Menu

```html
<div class="dropdown">
  <button commandfor="user-menu" command="toggle-popover">
    User Account ▼
  </button>

  <div id="user-menu" popover>
    <a href="/profile">My Profile</a>
    <a href="/settings">Settings</a>
    <a href="/help">Help</a>
    <hr />
    <button onclick="logout()" style="width: 100%; text-align: left; padding: 0.75rem 1rem;">
      Logout
    </button>
  </div>
</div>

<style>
  .dropdown {
    position: relative;
    display: inline-block;
  }

  .dropdown button {
    padding: 0.75rem 1.5rem;
    background: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .dropdown button:hover {
    background: #e8e8e8;
  }

  #user-menu {
    min-width: 200px;
  }

  #user-menu a, #user-menu button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.75rem 1rem;
    text-decoration: none;
    color: #333;
    background: none;
    border: none;
    cursor: pointer;
  }

  #user-menu a:hover, #user-menu button:hover {
    background: #f5f5f5;
  }

  #user-menu hr {
    margin: 0.5rem 0;
    border: none;
    border-top: 1px solid #e0e0e0;
  }
</style>
```

### Filter Panel

```html
<button commandfor="filters" command="toggle-popover">
  Filters
</button>

<div id="filters" popover>
  <fieldset>
    <legend>Category</legend>
    <label>
      <input type="checkbox" value="electronics" />
      Electronics
    </label>
    <label>
      <input type="checkbox" value="clothing" />
      Clothing
    </label>
  </fieldset>

  <fieldset>
    <legend>Price Range</legend>
    <label>
      <input type="radio" name="price" value="0-50" />
      Under $50
    </label>
    <label>
      <input type="radio" name="price" value="50-100" />
      $50 - $100
    </label>
  </fieldset>

  <div class="filter-actions">
    <button commandfor="filters" command="hide-popover">
      Close
    </button>
    <button onclick="applyFilters()">
      Apply
    </button>
  </div>
</div>

<style>
  #filters {
    min-width: 250px;
    padding: 1rem;
  }

  #filters fieldset {
    margin-bottom: 1rem;
    border: 1px solid #e0e0e0;
    padding: 0.75rem;
    border-radius: 0.25rem;
  }

  #filters legend {
    font-weight: 600;
    padding: 0 0.5rem;
  }

  #filters label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.5rem 0;
    cursor: pointer;
  }

  .filter-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .filter-actions button {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .filter-actions button:last-child {
    background: #0066cc;
    color: white;
  }
</style>
```

### Comparison with Old Approach

```html
<!-- OLD: Required click handlers -->
<button onclick="toggleMenu()">Menu</button>
<div id="menu" style="display: none;">
  <!-- content -->
</div>

<script>
  function toggleMenu() {
    const menu = document.getElementById('menu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  }
</script>

<!-- NEW: Declarative invoker -->
<button commandfor="menu" command="toggle-popover">Menu</button>
<div id="menu" popover>
  <!-- content -->
</div>
```

## Browser Support Detection

```typescript
// Detect invoker command support
function supportsInvokerCommands(): boolean {
  const btn = document.createElement('button');
  return 'commandfor' in btn;
}

if (supportsInvokerCommands()) {
  console.log('Using invoker commands');
} else {
  console.log('Fallback to JavaScript handlers');
}
```

## Real-World Benefits

- **No JavaScript** - Pure declarative HTML
- **Accessibility** - Built-in ARIA, keyboard support
- **Screen reader friendly** - Semantic relationships
- **Touch-friendly** - Popovers work on all devices
- **Light dismiss** - Click outside closes popover
- **Automatic focus** - Focus management built-in

## Available Commands

| Command | Element Type | Effect |
|---------|---|---|
| `show-popover` | Popover | Show the popover |
| `hide-popover` | Popover | Hide the popover |
| `toggle-popover` | Popover | Toggle popover visibility |
| `showModal()` | Dialog | Show modal (with JS) |
| `close()` | Dialog | Close modal (with JS) |

## Real-World Use Cases

**1. Dropdowns** - No JavaScript, pure HTML
**2. Mobile menus** - Toggle with declarative attribute
**3. Popovers** - Show/hide without event listeners
**4. Filters** - Panel popover with form
**5. Notifications** - Toast popovers with auto-dismiss
