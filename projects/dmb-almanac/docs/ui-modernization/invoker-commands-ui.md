---
skill_id: ui-ux-invoker-commands
skill_name: "Declarative Invoker Commands (Chrome 143+)"
description: "Master declarative UI interactions with commandfor attribute in Chromium 143+"
category: "UI/UX Interactions"
target_platform: "Chromium 143+ on Apple Silicon"
version: "1.0"
created_date: 2026-01-21
difficulty: "intermediate"
estimated_time_minutes: 28
---

# Declarative Invoker Commands for Chromium 143+

The invoker command system in Chromium 143+ enables declarative UI interactions without onclick handlers. This skill covers commandfor attribute, command attribute, dialog triggers, and custom commands.

## Basic Command Invocation

Use commandfor to invoke commands on target elements.

```html
<button commandfor="my-dialog" command="showModal">Open Dialog</button>

<dialog id="my-dialog">
  <h2>Dialog Title</h2>
  <p>This dialog was opened with a command</p>
  <form method="dialog">
    <button value="cancel">Cancel</button>
    <button value="confirm" type="submit">Confirm</button>
  </form>
</dialog>

<style>
  dialog {
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    padding: 24px;
  }

  dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }

  dialog[open] {
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  button {
    padding: 8px 16px;
    margin-right: 8px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover {
    background: #1976D2;
  }
</style>

<script>
  const dialog = document.getElementById('my-dialog');

  dialog.addEventListener('close', (e) => {
    console.log('Dialog closed with result:', dialog.returnValue);
  });
</script>
```

## Custom Command Implementation

Define and handle custom commands without onclick handlers.

```html
<div class="command-buttons">
  <button commandfor="video-player" command="play">Play</button>
  <button commandfor="video-player" command="pause">Pause</button>
  <button commandfor="video-player" command="stop">Stop</button>
  <button commandfor="video-player" command="volume" commandargument="50">Set Volume 50</button>
</div>

<div id="video-player" class="player">
  <video src="sample.mp4" controls style="width: 100%; height: auto;"></video>
  <div class="player-status">Status: Ready</div>
  <div class="volume-display">Volume: 100%</div>
</div>

<style>
  .command-buttons {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  button {
    padding: 10px 20px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.2s;
  }

  button:hover {
    background: #1976D2;
  }

  button:active {
    transform: scale(0.98);
  }

  .player {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    background: #f5f5f5;
  }

  .player-status {
    margin-top: 12px;
    padding: 8px;
    background: white;
    border-radius: 4px;
    font-size: 14px;
    color: #666;
  }

  .volume-display {
    margin-top: 8px;
    padding: 8px;
    background: white;
    border-radius: 4px;
    font-size: 14px;
    color: #666;
  }
</style>

<script>
  const player = document.getElementById('video-player');
  const video = player.querySelector('video');
  const statusDiv = player.querySelector('.player-status');
  const volumeDisplay = player.querySelector('.volume-display');

  // Listen for commands on the player element
  player.addEventListener('command', (e) => {
    const command = e.detail?.command;
    const argument = e.detail?.argument;

    switch (command) {
      case 'play':
        video.play();
        statusDiv.textContent = 'Status: Playing';
        break;
      case 'pause':
        video.pause();
        statusDiv.textContent = 'Status: Paused';
        break;
      case 'stop':
        video.pause();
        video.currentTime = 0;
        statusDiv.textContent = 'Status: Stopped';
        break;
      case 'volume':
        const volumeLevel = parseInt(argument) || 100;
        video.volume = volumeLevel / 100;
        volumeDisplay.textContent = `Volume: ${volumeLevel}%`;
        break;
    }
  });

  // Polyfill for commandfor support in Chromium 143+
  document.addEventListener('click', (e) => {
    if (e.target.hasAttribute('commandfor')) {
      const targetId = e.target.getAttribute('commandfor');
      const command = e.target.getAttribute('command');
      const argument = e.target.getAttribute('commandargument');
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        const commandEvent = new CustomEvent('command', {
          detail: { command, argument },
          bubbles: true,
          cancelable: true
        });
        targetElement.dispatchEvent(commandEvent);
      }
    }
  });
</script>
```

## Dialog Trigger Commands

Use commands to trigger dialog open and close operations.

```html
<div class="dialog-controls">
  <button commandfor="confirmation-dialog" command="show">Show Confirmation</button>
  <button commandfor="confirmation-dialog" command="close">Close Dialog</button>
</div>

<dialog id="confirmation-dialog" class="confirmation">
  <form method="dialog">
    <div class="dialog-content">
      <h3>Confirm Action</h3>
      <p>Are you sure you want to proceed with this action?</p>
      <div class="dialog-actions">
        <button type="submit" value="cancel" class="btn-secondary">Cancel</button>
        <button type="submit" value="confirm" class="btn-primary">Confirm</button>
      </div>
    </div>
  </form>
</dialog>

<style>
  .dialog-controls {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
  }

  dialog {
    border: none;
    border-radius: 12px;
    padding: 0;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
    max-width: 400px;
  }

  dialog::backdrop {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
  }

  dialog[open] {
    animation: slideInUp 0.3s ease-out;
  }

  .dialog-content {
    padding: 24px;
  }

  .dialog-content h3 {
    margin: 0 0 12px 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .dialog-content p {
    margin: 0 0 24px 0;
    color: #666;
    line-height: 1.5;
  }

  .dialog-actions {
    display: flex;
    gap: 8px;
  }

  .btn-primary,
  .btn-secondary {
    flex: 1;
    padding: 10px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #2196F3;
    color: white;
  }

  .btn-primary:hover {
    background: #1976D2;
  }

  .btn-secondary {
    background: #f0f0f0;
    color: #333;
  }

  .btn-secondary:hover {
    background: #e0e0e0;
  }

  button {
    padding: 10px 20px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }

  button:hover {
    background: #1976D2;
  }

  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

<script>
  const dialog = document.getElementById('confirmation-dialog');

  dialog.addEventListener('close', (e) => {
    console.log('Dialog result:', dialog.returnValue);
    if (dialog.returnValue === 'confirm') {
      console.log('Action confirmed');
    } else {
      console.log('Action cancelled');
    }
  });

  // Handle command show/close for dialog
  document.addEventListener('click', (e) => {
    if (e.target.hasAttribute('commandfor') && e.target.getAttribute('commandfor') === 'confirmation-dialog') {
      const command = e.target.getAttribute('command');
      if (command === 'show') {
        dialog.showModal();
      } else if (command === 'close') {
        dialog.close();
      }
    }
  });
</script>
```

## Command Arguments

Pass arguments to commands for parameterized actions.

```html
<div class="theme-switcher">
  <button commandfor="app-container" command="setTheme" commandargument="light">Light</button>
  <button commandfor="app-container" command="setTheme" commandargument="dark">Dark</button>
  <button commandfor="app-container" command="setTheme" commandargument="auto">Auto</button>
</div>

<div id="app-container" class="app" data-theme="light">
  <div class="app-header">
    <h1>Theme Switcher Demo</h1>
    <div class="theme-indicator">Current Theme: <span id="theme-label">Light</span></div>
  </div>
  <div class="app-content">
    <p>Select a theme using the buttons above</p>
  </div>
</div>

<style>
  .theme-switcher {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
  }

  button {
    padding: 10px 16px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }

  button:hover {
    background: #1976D2;
  }

  button:active {
    transform: scale(0.95);
  }

  .app {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    transition: background-color 0.3s, color 0.3s;
  }

  .app[data-theme="light"] {
    background: white;
    color: #333;
  }

  .app[data-theme="dark"] {
    background: #1e1e1e;
    color: #e0e0e0;
  }

  .app[data-theme="auto"] {
    background: #f5f5f5;
    color: #333;
  }

  @media (prefers-color-scheme: dark) {
    .app[data-theme="auto"] {
      background: #1e1e1e;
      color: #e0e0e0;
    }
  }

  .app-header {
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #ddd;
  }

  .app[data-theme="dark"] .app-header {
    border-bottom-color: #444;
  }

  .theme-indicator {
    font-size: 14px;
    margin-top: 8px;
    opacity: 0.8;
  }
</style>

<script>
  const appContainer = document.getElementById('app-container');
  const themeLabel = document.getElementById('theme-label');

  document.addEventListener('click', (e) => {
    if (e.target.hasAttribute('commandfor') && e.target.getAttribute('commandfor') === 'app-container') {
      const command = e.target.getAttribute('command');
      const argument = e.target.getAttribute('commandargument');

      if (command === 'setTheme') {
        appContainer.setAttribute('data-theme', argument);
        themeLabel.textContent = argument.charAt(0).toUpperCase() + argument.slice(1);
        console.log(`Theme changed to: ${argument}`);
      }
    }
  });
</script>
```

## Nested Command Handling

Handle commands in nested element hierarchies.

```html
<div id="form-container" class="form-container">
  <form>
    <fieldset>
      <legend>User Information</legend>

      <div class="form-group">
        <label for="name">Name:</label>
        <input type="text" id="name" required />
        <button type="button" commandfor="form-container" command="clearField" commandargument="name">Clear</button>
      </div>

      <div class="form-group">
        <label for="email">Email:</label>
        <input type="email" id="email" required />
        <button type="button" commandfor="form-container" command="clearField" commandargument="email">Clear</button>
      </div>

      <div class="form-group">
        <button type="submit" commandfor="form-container" command="submit">Submit</button>
        <button type="button" commandfor="form-container" command="reset">Reset All</button>
      </div>
    </fieldset>
  </form>
</div>

<style>
  .form-container {
    max-width: 400px;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
  }

  fieldset {
    border: none;
    padding: 0;
    margin: 0;
  }

  legend {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
  }

  .form-group {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    align-items: center;
  }

  label {
    min-width: 80px;
    font-weight: 500;
  }

  input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
  }

  input:focus {
    outline: none;
    border-color: #2196F3;
    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
  }

  button {
    padding: 8px 16px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  button:hover {
    background: #1976D2;
  }

  button[type="button"]:not(:first-of-type) {
    background: #757575;
  }

  button[type="button"]:not(:first-of-type):hover {
    background: #616161;
  }
</style>

<script>
  const formContainer = document.getElementById('form-container');
  const form = formContainer.querySelector('form');

  document.addEventListener('click', (e) => {
    if (e.target.hasAttribute('commandfor') && e.target.getAttribute('commandfor') === 'form-container') {
      const command = e.target.getAttribute('command');
      const argument = e.target.getAttribute('commandargument');

      switch (command) {
        case 'clearField':
          const field = document.getElementById(argument);
          if (field) {
            field.value = '';
            field.focus();
          }
          break;
        case 'submit':
          if (form.checkValidity()) {
            console.log('Form submitted');
            alert('Form submitted successfully');
          } else {
            form.reportValidity();
          }
          break;
        case 'reset':
          form.reset();
          console.log('Form reset');
          break;
      }
    }
  });
</script>
```

## Command with Modifiers

Combine commands with keyboard modifiers for enhanced control.

```html
<div class="command-demo">
  <button commandfor="target" command="action" id="action-btn">Execute Action</button>
  <div id="target" class="target">Target Element</div>
  <div class="status">Status: Ready</div>
</div>

<style>
  .command-demo {
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
  }

  button {
    padding: 10px 20px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    margin-bottom: 16px;
  }

  button:hover {
    background: #45a049;
  }

  .target {
    padding: 16px;
    background: #f0f0f0;
    border: 2px solid transparent;
    border-radius: 4px;
    margin-bottom: 16px;
    transition: all 0.3s;
  }

  .target.active {
    background: #e3f2fd;
    border-color: #2196F3;
  }

  .target.highlight {
    background: #fff3cd;
    border-color: #ffc107;
  }

  .status {
    padding: 12px;
    background: #e8f5e9;
    border-radius: 4px;
    font-size: 14px;
    color: #2e7d32;
  }
</style>

<script>
  const target = document.getElementById('target');
  const statusDiv = document.querySelector('.status');
  const actionBtn = document.getElementById('action-btn');

  actionBtn.addEventListener('click', (e) => {
    if (e.shiftKey) {
      target.classList.toggle('highlight');
      statusDiv.textContent = 'Status: Toggled highlight (Shift+Click)';
    } else if (e.ctrlKey || e.metaKey) {
      target.classList.remove('active', 'highlight');
      statusDiv.textContent = 'Status: Cleared (Ctrl+Click)';
    } else {
      target.classList.toggle('active');
      statusDiv.textContent = 'Status: Toggled active state';
    }
  });
</script>
```

## Browser Compatibility

- Chromium 143+: Full invoker command support
- Edge 123+: Full support
- Safari 17+: Limited support
- Firefox: Partial support planned

## Performance Optimization

Use event delegation for command handling:

```javascript
// Efficient: Single listener on container
document.addEventListener('click', handleCommands, true);

// Avoid: Listener on each button
buttons.forEach(btn => btn.addEventListener('click', handleCommand));
```

## Summary

Master declarative invoker commands by implementing:
- Basic commandfor and command attributes
- Custom command handling with arguments
- Dialog trigger commands
- Parameterized command execution
- Nested command hierarchies
- Keyboard modifier combinations
- No onclick handler requirement
- Efficient event delegation patterns

Create interactive UIs without JavaScript event handlers.
