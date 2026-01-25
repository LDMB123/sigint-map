---
title: Interest Invokers (interesttarget)
description: Hover-triggered popovers without JavaScript
tags: [chromium-143, invoker, interesttarget, hover, popover]
min_chrome_version: 142
category: HTML APIs
complexity: intermediate
last_updated: 2026-01
---

# Interest Invokers (Chrome 142+)

Show popovers on hover or focus with HTML attribute - no JavaScript needed. Perfect for tooltips, hints, and contextual menus that trigger on user interest rather than explicit click.

## When to Use

- **Tooltips** - Show hints on hover
- **Help text** - Display context on focus
- **Preview cards** - Popover on link hover
- **Keyboard hints** - Show on Tab/focus
- **Accessibility** - Screen reader discoverable
- **Non-intrusive popovers** - Light-dismiss friendly

## Syntax

```html
<!-- Element that triggers on interest (hover/focus) -->
<button interesttarget="tooltip-id">
  Hover me
</button>

<!-- Popover shown on interest -->
<div id="tooltip-id" popover>
  Helpful information
</div>

<!-- Automatically shows on:
     - mouseenter / mouseleave (mouse)
     - focus / blur (keyboard)
     - touchstart / touchend (touch)
-->
```

## Examples

### Basic Tooltip

```html
<button interesttarget="button-help">
  Click me
</button>

<div id="button-help" popover>
  This button performs important action
</div>

<style>
  [popover] {
    opacity: 0;
    transform: scale(0.9);
    transition: opacity 0.2s, transform 0.2s;
    background: #333;
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    max-width: 200px;
    z-index: 1000;
  }

  [popover]:popover-open {
    opacity: 1;
    transform: scale(1);
  }
</style>
```

### Help Text Hints

```html
<form>
  <label>
    Password
    <input type="password" interesttarget="password-hint" />
  </label>

  <div id="password-hint" popover>
    <h4>Password Requirements</h4>
    <ul>
      <li>8+ characters</li>
      <li>Uppercase letter</li>
      <li>Number</li>
      <li>Special character</li>
    </ul>
  </div>
</form>

<style>
  #password-hint {
    background: #f5f5f5;
    border: 1px solid #ddd;
    padding: 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }

  #password-hint h4 {
    margin: 0 0 0.75rem 0;
  }

  #password-hint ul {
    margin: 0;
    padding-left: 1rem;
  }

  #password-hint li {
    margin-bottom: 0.25rem;
  }
</style>
```

### Info Icons with Popovers

```html
<span class="form-field">
  Username
  <button interesttarget="username-info" class="info-btn">
    ?
  </button>
</span>

<div id="username-info" popover>
  3-16 alphanumeric characters, underscores allowed
</div>

<style>
  .form-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .info-btn {
    width: 24px;
    height: 24px;
    padding: 0;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: bold;
  }

  .info-btn:hover {
    background: #0052a3;
  }

  #username-info {
    background: white;
    border: 1px solid #ddd;
    padding: 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    max-width: 250px;
  }
</style>
```

### User Card Preview

```html
<!-- Link that shows user preview on hover -->
<a href="/user/123" interesttarget="user-preview-123">
  @username
</a>

<!-- User card popover -->
<div id="user-preview-123" popover class="user-card">
  <img src="/avatar/123.jpg" alt="User" />
  <h3>Username</h3>
  <p>@username</p>
  <p class="bio">Bio text here</p>
  <button>Follow</button>
</div>

<style>
  .user-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    padding: 1rem;
    width: 250px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .user-card img {
    width: 100%;
    height: 150px;
    object-fit: cover;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

  .user-card h3 {
    margin: 0 0 0.25rem 0;
  }

  .user-card p {
    margin: 0 0 0.5rem 0;
    color: #666;
    font-size: 0.875rem;
  }

  .user-card .bio {
    margin-bottom: 1rem;
  }

  .user-card button {
    width: 100%;
    padding: 0.5rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
  }
</style>
```

### Keyboard Shortcut Hints

```html
<!-- Links with keyboard shortcut hints -->
<nav>
  <a href="/" interesttarget="home-shortcut">
    Home
  </a>
  <a href="/search" interesttarget="search-shortcut">
    Search
  </a>
  <a href="/messages" interesttarget="messages-shortcut">
    Messages
  </a>
</nav>

<div id="home-shortcut" popover class="shortcut-hint">
  Keyboard: G then H
</div>

<div id="search-shortcut" popover class="shortcut-hint">
  Keyboard: /
</div>

<div id="messages-shortcut" popover class="shortcut-hint">
  Keyboard: G then M
</div>

<style>
  .shortcut-hint {
    background: #333;
    color: white;
    padding: 0.5rem 0.75rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-family: monospace;
    white-space: nowrap;
  }
</style>
```

### Feature Indicators

```html
<!-- Badge with feature info -->
<span class="badge" interesttarget="feature-new">
  NEW
</span>

<div id="feature-new" popover class="feature-info">
  <h4>New Feature</h4>
  <p>This feature is available starting today.</p>
  <a href="/blog/new-feature">Learn more →</a>
</div>

<style>
  .badge {
    display: inline-block;
    background: #22c55e;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: bold;
    cursor: help;
  }

  .feature-info {
    background: white;
    border: 2px solid #22c55e;
    border-radius: 0.5rem;
    padding: 1rem;
    max-width: 300px;
  }

  .feature-info h4 {
    margin: 0 0 0.5rem 0;
    color: #22c55e;
  }

  .feature-info p {
    margin: 0.5rem 0;
  }

  .feature-info a {
    color: #0066cc;
    text-decoration: none;
  }
</style>
```

### Documentation Links

```html
<!-- Terms with definitions -->
<p>
  Use
  <span interesttarget="api-def">API</span>
  to integrate with third-party services.
</p>

<div id="api-def" popover class="definition">
  <strong>API (Application Programming Interface)</strong>
  <p>
    A set of protocols and tools that defines how software
    components should interact. Allows applications to
    communicate with each other.
  </p>
</div>

<style>
  span[interesttarget] {
    border-bottom: 1px dotted #0066cc;
    cursor: help;
  }

  .definition {
    background: #f9f3ff;
    border-left: 3px solid #9333ea;
    padding: 1rem;
    border-radius: 0.5rem;
    max-width: 300px;
    font-size: 0.875rem;
  }

  .definition strong {
    display: block;
    margin-bottom: 0.5rem;
    color: #7e22ce;
  }

  .definition p {
    margin: 0;
  }
</style>
```

### Status Indicators

```html
<!-- Status badge with explanation -->
<span class="status pending" interesttarget="status-pending">
  ●
</span>

<div id="status-pending" popover class="status-explanation">
  <strong>Pending</strong>
  <p>Your request is being processed.</p>
  <p class="estimate">Estimated time: 2-3 minutes</p>
</div>

<style>
  .status {
    display: inline-block;
    font-size: 1rem;
    cursor: help;
  }

  .status.pending {
    color: #f59e0b;
  }

  .status.approved {
    color: #10b981;
  }

  .status.rejected {
    color: #ef4444;
  }

  .status-explanation {
    background: white;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    max-width: 250px;
    font-size: 0.875rem;
  }

  .status-explanation strong {
    display: block;
    margin-bottom: 0.5rem;
  }

  .status-explanation p {
    margin: 0.25rem 0;
  }

  .status-explanation .estimate {
    color: #666;
    font-size: 0.8rem;
  }
</style>
```

### Chart Tooltips

```html
<div class="chart">
  <div class="bar" interesttarget="bar-2023">
    <!-- Visual bar -->
  </div>

  <div id="bar-2023" popover class="chart-tooltip">
    <strong>2023</strong>
    <p>Revenue: $2.5M</p>
    <p>Growth: +15%</p>
  </div>
</div>

<style>
  .chart {
    display: flex;
    gap: 1rem;
    height: 300px;
    align-items: flex-end;
  }

  .bar {
    flex: 1;
    background: #0066cc;
    border-radius: 0.25rem 0.25rem 0 0;
    cursor: help;
    transition: opacity 0.2s;
  }

  .bar:hover {
    opacity: 0.8;
  }

  .chart-tooltip {
    background: white;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .chart-tooltip strong {
    display: block;
    margin-bottom: 0.5rem;
  }

  .chart-tooltip p {
    margin: 0.25rem 0;
  }
</style>
```

### Accessibility Info

```html
<!-- Accessibility features with explanations -->
<button interesttarget="accessibility-info">
  ♿ Accessibility
</button>

<div id="accessibility-info" popover class="a11y-info">
  <h3>Accessibility Features</h3>
  <ul>
    <li>Keyboard navigation (Tab, Enter, Escape)</li>
    <li>Screen reader support (NVDA, JAWS, VoiceOver)</li>
    <li>High contrast mode support</li>
    <li>Focus indicators visible</li>
  </ul>
</div>

<style>
  .a11y-info {
    background: white;
    border: 1px solid #0066cc;
    border-radius: 0.5rem;
    padding: 1rem;
    max-width: 300px;
  }

  .a11y-info h3 {
    margin: 0 0 1rem 0;
    color: #0066cc;
  }

  .a11y-info ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .a11y-info li {
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }
</style>
```

### Comparison with JavaScript

```html
<!-- OLD: JavaScript event handlers -->
<button id="old-tooltip">
  Hover me
</button>

<div id="old-tooltip-content" style="display: none;">
  Information
</div>

<script>
  const btn = document.getElementById('old-tooltip');
  const tooltip = document.getElementById('old-tooltip-content');

  btn.addEventListener('mouseenter', () => {
    tooltip.style.display = 'block';
  });

  btn.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });
</script>

<!-- NEW: Declarative interesttarget -->
<button interesttarget="new-tooltip">
  Hover me
</button>

<div id="new-tooltip" popover>
  Information
</div>

<!-- That's it! No JavaScript needed -->
```

## Supported Interactions

| Event Type | Trigger | Dismiss |
|---|---|---|
| Mouse | `mouseenter` | `mouseleave` |
| Keyboard | `focus` | `blur` / `Escape` |
| Touch | `touchstart` | `touchend` |
| All | Light-dismiss (click outside) | Always available |

## Browser Support Detection

```typescript
// Detect interesttarget support
function supportsInterestInvokers(): boolean {
  const el = document.createElement('button');
  return 'interesttarget' in el;
}

if (supportsInterestInvokers()) {
  console.log('Using interest invokers');
} else {
  console.log('Fallback to JavaScript hover detection');
}
```

## Real-World Benefits

- **No JavaScript** - Pure HTML attribute
- **Multi-modal** - Works with mouse, keyboard, touch
- **Accessible** - Built-in screen reader support
- **Light dismiss** - Click outside closes popover
- **Keyboard accessible** - Tab to focus and show hint
- **Touch-friendly** - Touch show/hide automatically

## Real-World Use Cases

**1. Tooltips** - Hover for hints, no click needed
**2. Form help** - Focus on input shows guidance
**3. Badges** - Hover on "NEW" badge shows info
**4. Documentation** - Defined terms with popovers
**5. Status indicators** - Click or hover to explain status
**6. Previews** - Hover links to show card preview
