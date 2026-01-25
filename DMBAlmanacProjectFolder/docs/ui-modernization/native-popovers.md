---
skill_id: ui-ux-native-popovers
skill_name: "Native Popover API for Chromium 143+"
description: "Master the Popover API in Chromium 143+ for declarative modal and popover interactions"
category: "UI/UX Interactions"
target_platform: "Chromium 143+ on Apple Silicon"
version: "1.0"
created_date: 2026-01-21
difficulty: "intermediate"
estimated_time_minutes: 30
---

# Native Popover API for Chromium 143+

The Popover API in Chromium 143+ enables declarative modal and popover interactions without JavaScript frameworks. This skill covers the popover attribute, popovertarget, light dismiss behavior, and nested popovers.

## Basic Popover Attribute

Create a simple popover with the `popover` attribute.

```html
<button popovertarget="my-popover">Open Popover</button>

<div popover="auto" id="my-popover">
  <h2>Popover Title</h2>
  <p>This is a native popover using the Popover API</p>
  <button popovertarget="my-popover" popovertargetaction="hide">Close</button>
</div>

<style>
  [popover] {
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 20px;
    background: white;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  }

  [popover]:popover-open {
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
```

## Popover Toggle and Explicit Modes

Control popover behavior with different action types.

```html
<div style="display: flex; gap: 10px; margin-bottom: 20px;">
  <button popovertarget="demo-popover" popovertargetaction="toggle">Toggle</button>
  <button popovertarget="demo-popover" popovertargetaction="show">Show</button>
  <button popovertarget="demo-popover" popovertargetaction="hide">Hide</button>
</div>

<div popover="manual" id="demo-popover">
  <h3>Manual Popover</h3>
  <p>This popover uses manual mode and requires explicit actions</p>
  <p>Current state: <span id="popover-state">hidden</span></p>
</div>

<style>
  [popover] {
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 24px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
    width: 300px;
  }

  [popover]:popover-open {
    animation: popInScale 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes popInScale {
    from {
      opacity: 0;
      transform: scale(0.85);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>

<script>
  const popover = document.getElementById('demo-popover');
  const stateDisplay = document.getElementById('popover-state');

  popover.addEventListener('beforetoggle', (e) => {
    if (e.newState === 'open') {
      stateDisplay.textContent = 'opening';
    } else {
      stateDisplay.textContent = 'closing';
    }
  });

  popover.addEventListener('toggle', (e) => {
    if (e.newState === 'open') {
      stateDisplay.textContent = 'visible';
    } else {
      stateDisplay.textContent = 'hidden';
    }
  });
</script>
```

## Light Dismiss Behavior

Control popover dismissal with the `auto` mode for light dismiss.

```html
<div style="padding: 20px; background: #f0f0f0; border-radius: 8px;">
  <h3>Light Dismiss Popovers</h3>

  <button popovertarget="auto-dismiss">Open Auto-Dismiss Popover</button>

  <div popover="auto" id="auto-dismiss">
    <h4>Auto Popover</h4>
    <p>Click outside to dismiss (light dismiss)</p>
    <p>Pressing Escape also closes it</p>
  </div>
</div>

<style>
  [popover="auto"] {
    border: 2px solid #4CAF50;
    background: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(76, 175, 80, 0.15);
  }

  [popover="auto"]:popover-open {
    animation: fadeIn 0.2s ease-in;
  }

  [popover]:backdrop {
    background: rgba(0, 0, 0, 0.1);
    -webkit-backdrop-filter: blur(2px);
    backdrop-filter: blur(2px);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>

<script>
  const autoPopover = document.getElementById('auto-dismiss');

  autoPopover.addEventListener('beforetoggle', (e) => {
    if (e.newState === 'open') {
      console.log('Popover opened with auto-dismiss enabled');
    }
  });

  // Detect light dismiss (clicking outside)
  document.addEventListener('click', (e) => {
    if (autoPopover.matches(':popover-open') && !autoPopover.contains(e.target) && !e.target.matches('[popovertarget="auto-dismiss"]')) {
      console.log('Light dismiss triggered');
    }
  });
</script>
```

## Nested Popovers

Create popover hierarchies with proper stacking and management.

```html
<button popovertarget="parent-popover">Open Parent Popover</button>

<div popover="auto" id="parent-popover">
  <h3>Parent Popover</h3>
  <p>Click to open a nested popover</p>
  <button popovertarget="child-popover">Open Nested Popover</button>

  <div popover="auto" id="child-popover" style="margin-top: 10px;">
    <h4>Child Popover</h4>
    <p>This popover is nested within the parent</p>
    <button popovertarget="grandchild-popover">Open Grandchild</button>

    <div popover="auto" id="grandchild-popover" style="margin-top: 10px;">
      <h5>Grandchild Popover</h5>
      <p>Deeply nested popover</p>
    </div>
  </div>
</div>

<style>
  [popover] {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    background: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  [popover]:popover-open {
    animation: slideDown 0.2s ease-out;
  }

  #child-popover {
    background: #f9f9f9;
    border-color: #e0e0e0;
  }

  #grandchild-popover {
    background: #f5f5f5;
    border-color: #d0d0d0;
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

  button {
    display: inline-block;
    padding: 8px 16px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    margin-top: 8px;
  }

  button:hover {
    background: #1976D2;
  }
</style>

<script>
  const parentPopover = document.getElementById('parent-popover');
  const childPopover = document.getElementById('child-popover');
  const grandchildPopover = document.getElementById('grandchild-popover');

  let nestingLevel = 0;

  parentPopover.addEventListener('toggle', (e) => {
    if (e.newState === 'open') {
      nestingLevel = 1;
      console.log('Nesting level:', nestingLevel);
    } else {
      nestingLevel = 0;
    }
  });

  childPopover.addEventListener('toggle', (e) => {
    if (e.newState === 'open') {
      nestingLevel = 2;
      console.log('Nesting level:', nestingLevel);
    }
  });

  grandchildPopover.addEventListener('toggle', (e) => {
    if (e.newState === 'open') {
      nestingLevel = 3;
      console.log('Nesting level:', nestingLevel);
    }
  });
</script>
```

## Popover Positioning

Control popover positioning with anchor positioning API.

```html
<div style="display: flex; gap: 20px; padding: 40px;">
  <button id="top-anchor" popovertarget="top-popover" style="align-self: flex-start;">Top Position</button>
  <button id="right-anchor" popovertarget="right-popover" style="align-self: center;">Right Position</button>
  <button id="bottom-anchor" popovertarget="bottom-popover" style="align-self: flex-end;">Bottom Position</button>
</div>

<div popover="auto" id="top-popover" anchor="top-anchor" style="anchor-name: --top-anchor;">
  Positioned at top
</div>

<div popover="auto" id="right-popover" anchor="right-anchor">
  Positioned at right
</div>

<div popover="auto" id="bottom-popover" anchor="bottom-anchor">
  Positioned at bottom
</div>

<style>
  [popover] {
    border: 1px solid #999;
    padding: 12px;
    background: white;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    border-radius: 6px;
  }

  #top-popover {
    position-anchor: --top-anchor;
    inset-area: top span-left;
    margin-bottom: 8px;
  }

  #right-popover {
    inset-area: right span-block;
    margin-left: 8px;
  }

  #bottom-popover {
    inset-area: bottom span-left;
    margin-top: 8px;
  }
</style>
```

## Popover with Form Elements

Create accessible popovers containing form controls.

```html
<button popovertarget="form-popover">Open Settings</button>

<div popover="auto" id="form-popover">
  <h3>Settings</h3>
  <form id="settings-form">
    <div style="margin-bottom: 12px;">
      <label for="theme-select">Theme:</label>
      <select id="theme-select" style="margin-left: 8px;">
        <option>Light</option>
        <option>Dark</option>
        <option>Auto</option>
      </select>
    </div>

    <div style="margin-bottom: 12px;">
      <label>
        <input type="checkbox" id="notifications"> Enable notifications
      </label>
    </div>

    <div style="margin-bottom: 12px;">
      <label for="volume">Volume:</label>
      <input type="range" id="volume" min="0" max="100" value="50" style="margin-left: 8px; width: 150px;">
    </div>

    <div style="display: flex; gap: 8px;">
      <button type="submit" style="flex: 1;">Save</button>
      <button type="button" popovertarget="form-popover" popovertargetaction="hide" style="flex: 1;">Cancel</button>
    </div>
  </form>
</div>

<style>
  #form-popover {
    border: 1px solid #ddd;
    padding: 20px;
    background: white;
    border-radius: 8px;
    width: 280px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
  }

  #form-popover h3 {
    margin-top: 0;
    color: #333;
  }

  select, input[type="range"] {
    padding: 6px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  button {
    padding: 8px 16px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover {
    background: #1976D2;
  }

  button[type="button"] {
    background: #757575;
  }

  button[type="button"]:hover {
    background: #616161;
  }
</style>

<script>
  const form = document.getElementById('settings-form');
  const formPopover = document.getElementById('form-popover');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('Settings saved');
    formPopover.hidePopover();
  });
</script>
```

## Popover Keyboard Navigation

Ensure popovers are keyboard accessible.

```html
<button popovertarget="keyboard-popover">Open Keyboard-Friendly Popover</button>

<div popover="auto" id="keyboard-popover">
  <h3 id="popover-title">Navigation Options</h3>
  <ul role="menu" aria-labelledby="popover-title">
    <li><button role="menuitem" onclick="handleOption('cut')">Cut</button></li>
    <li><button role="menuitem" onclick="handleOption('copy')">Copy</button></li>
    <li><button role="menuitem" onclick="handleOption('paste')">Paste</button></li>
  </ul>
</div>

<style>
  #keyboard-popover {
    border: 1px solid #ddd;
    background: white;
    padding: 8px 0;
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    min-width: 150px;
  }

  #keyboard-popover ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  #keyboard-popover li button {
    width: 100%;
    text-align: left;
    padding: 12px 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 14px;
    color: #333;
  }

  #keyboard-popover li button:hover,
  #keyboard-popover li button:focus {
    background: #f0f0f0;
    outline: none;
  }
</style>

<script>
  const popoverButton = document.querySelector('[popovertarget="keyboard-popover"]');
  const popover = document.getElementById('keyboard-popover');

  function handleOption(option) {
    console.log(`Selected: ${option}`);
    popover.hidePopover();
  }

  popover.addEventListener('beforetoggle', (e) => {
    if (e.newState === 'open') {
      const firstButton = popover.querySelector('button');
      setTimeout(() => firstButton?.focus(), 0);
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popover.matches(':popover-open')) {
      popover.hidePopover();
      popoverButton.focus();
    }
  });
</script>
```

## Browser Compatibility

- Chromium 143+: Full Popover API support
- Safari 17.4+: Full support
- Firefox 125+: Full support
- Edge 123+: Full support

## Performance Considerations

Use CSS containment for popover performance:

```css
[popover] {
  contain: layout style paint;
  will-change: transform, opacity;
}
```

## Summary

Master the native Popover API by implementing:
- Basic popovers with popover attribute
- Toggle, show, and hide actions
- Light dismiss behavior with auto mode
- Nested popover hierarchies
- Positioning with anchor positioning API
- Form integration in popovers
- Keyboard navigation and accessibility
- Performance optimization with CSS containment

Create modern, accessible UI patterns without JavaScript frameworks.
