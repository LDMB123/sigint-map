---
skill_id: ui-ux-inert-management
skill_name: "Focus Trapping with Inert Attribute (Chrome 143+)"
description: "Master focus management and modal control using the inert attribute in Chromium 143+"
category: "UI/UX Interactions"
target_platform: "Chromium 143+ on Apple Silicon"
version: "1.0"
created_date: 2026-01-21
difficulty: "intermediate"
estimated_time_minutes: 28
---

# Focus Trapping with Inert Attribute for Chromium 143+

The inert attribute in Chromium 143+ provides native focus management without focus-trap libraries. This skill covers inert for modals, sidebar toggles, and declarative focus control.

## Basic Inert Attribute Usage

Make elements and their descendants inert (non-interactive).

```html
<div class="page-layout">
  <header>
    <h1>My Application</h1>
  </header>

  <button id="open-modal">Open Modal</button>

  <main id="main-content">
    <p>Main content area</p>
    <button>Interactive Button 1</button>
    <button>Interactive Button 2</button>
  </main>

  <dialog id="modal-dialog">
    <h2>Modal Dialog</h2>
    <p>This modal makes the rest of the page inert</p>
    <form method="dialog">
      <button type="submit" value="close">Close Modal</button>
    </form>
  </dialog>
</div>

<style>
  .page-layout {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  header {
    padding: 20px 0;
    border-bottom: 1px solid #e0e0e0;
    margin-bottom: 20px;
  }

  header h1 {
    margin: 0;
    font-size: 28px;
  }

  #open-modal {
    padding: 10px 20px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
  }

  #open-modal:hover {
    background: #1976D2;
  }

  main {
    padding: 20px 0;
  }

  main[inert] {
    opacity: 0.5;
    pointer-events: none;
  }

  main button {
    display: block;
    padding: 10px 16px;
    margin: 10px 0;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  main button:hover {
    background: #45a049;
  }

  dialog {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 500px;
  }

  dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
  }

  dialog h2 {
    margin: 0 0 12px 0;
    color: #333;
  }

  dialog p {
    margin: 0 0 24px 0;
    color: #666;
    line-height: 1.5;
  }

  dialog button {
    padding: 10px 24px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }

  dialog button:hover {
    background: #1976D2;
  }
</style>

<script>
  const openButton = document.getElementById('open-modal');
  const modal = document.getElementById('modal-dialog');
  const mainContent = document.getElementById('main-content');

  openButton.addEventListener('click', () => {
    mainContent.inert = true;
    modal.showModal();
  });

  modal.addEventListener('close', () => {
    mainContent.inert = false;
    openButton.focus();
  });
</script>
```

## Modal with Inert Focus Trapping

Create a modal that automatically manages focus with the inert attribute.

```html
<div class="modal-demo">
  <header>
    <h1>Focus Trapping Demo</h1>
    <button id="trigger-modal" class="trigger-btn">Open Confirmation Dialog</button>
  </header>

  <main id="page-main">
    <section class="form-section">
      <h2>User Form</h2>
      <form>
        <div class="form-group">
          <label for="name">Name:</label>
          <input type="text" id="name" placeholder="Enter your name" />
        </div>

        <div class="form-group">
          <label for="email">Email:</label>
          <input type="email" id="email" placeholder="Enter your email" />
        </div>

        <button type="submit" class="submit-btn">Submit</button>
      </form>
    </section>

    <aside class="sidebar">
      <h3>Sidebar Content</h3>
      <button>Sidebar Button 1</button>
      <button>Sidebar Button 2</button>
    </aside>
  </main>

  <dialog id="confirm-dialog" class="confirmation-modal">
    <div class="modal-header">
      <h2>Confirm Action</h2>
      <button id="close-btn" class="close-btn" aria-label="Close dialog">X</button>
    </div>

    <div class="modal-body">
      <p>Are you sure you want to submit this form?</p>
      <p>This action cannot be undone.</p>
    </div>

    <div class="modal-footer">
      <form method="dialog">
        <button type="submit" value="cancel" class="btn-cancel">Cancel</button>
        <button type="submit" value="confirm" class="btn-confirm">Confirm</button>
      </form>
    </div>
  </dialog>
</div>

<style>
  * {
    box-sizing: border-box;
  }

  .modal-demo {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-bottom: 4px solid #764ba2;
  }

  header h1 {
    margin: 0 0 16px 0;
    font-size: 28px;
  }

  .trigger-btn {
    padding: 10px 20px;
    background: white;
    color: #667eea;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
  }

  .trigger-btn:hover {
    background: #f0f0f0;
  }

  #page-main {
    display: flex;
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
    gap: 20px;
  }

  #page-main[inert] {
    opacity: 0.5;
    pointer-events: none;
  }

  .form-section {
    flex: 1;
  }

  .form-section h2 {
    color: #333;
    margin-bottom: 20px;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: #333;
  }

  .form-group input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  .form-group input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .submit-btn {
    padding: 10px 24px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
  }

  .submit-btn:hover {
    background: #5568d3;
  }

  .sidebar {
    width: 200px;
    padding: 16px;
    background: #f9f9f9;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
  }

  .sidebar h3 {
    margin: 0 0 12px 0;
    color: #333;
  }

  .sidebar button {
    display: block;
    width: 100%;
    padding: 10px;
    margin: 8px 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    color: #333;
    font-size: 14px;
  }

  .sidebar button:hover {
    background: #f0f0f0;
  }

  #confirm-dialog {
    border: none;
    border-radius: 12px;
    padding: 0;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
    max-width: 400px;
  }

  #confirm-dialog::backdrop {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
  }

  #confirm-dialog[open] {
    animation: modalSlideIn 0.3s ease-out;
  }

  .modal-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 20px;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }

  .modal-body {
    padding: 20px;
    color: #666;
    line-height: 1.6;
  }

  .modal-body p {
    margin: 0 0 12px 0;
  }

  .modal-body p:last-child {
    margin-bottom: 0;
  }

  .modal-footer {
    padding: 16px 20px;
    background: #f9f9f9;
    border-top: 1px solid #e0e0e0;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .modal-footer form {
    display: flex;
    gap: 8px;
  }

  .btn-cancel,
  .btn-confirm {
    padding: 10px 24px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    font-size: 14px;
  }

  .btn-cancel {
    background: #e0e0e0;
    color: #333;
  }

  .btn-cancel:hover {
    background: #d0d0d0;
  }

  .btn-confirm {
    background: #667eea;
    color: white;
  }

  .btn-confirm:hover {
    background: #5568d3;
  }

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

<script>
  const triggerBtn = document.getElementById('trigger-modal');
  const dialog = document.getElementById('confirm-dialog');
  const closeBtn = document.getElementById('close-btn');
  const main = document.getElementById('page-main');

  triggerBtn.addEventListener('click', () => {
    main.inert = true;
    dialog.showModal();
    dialog.querySelector('button[value="cancel"]').focus();
  });

  closeBtn.addEventListener('click', () => {
    dialog.close('cancel');
  });

  dialog.addEventListener('close', () => {
    main.inert = false;
    triggerBtn.focus();
  });
</script>
```

## Sidebar Toggle with Inert

Manage sidebar visibility with inert for background content control.

```html
<div class="sidebar-layout">
  <nav class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <h2>Navigation</h2>
      <button id="close-sidebar" class="close-btn" aria-label="Close sidebar">Close</button>
    </div>
    <ul class="nav-list">
      <li><a href="#home">Home</a></li>
      <li><a href="#about">About</a></li>
      <li><a href="#services">Services</a></li>
      <li><a href="#portfolio">Portfolio</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
  </nav>

  <div class="sidebar-overlay" id="sidebar-overlay"></div>

  <main id="main-content">
    <header class="top-bar">
      <button id="toggle-sidebar" class="menu-btn">Menu</button>
      <h1>Welcome</h1>
    </header>

    <div class="content">
      <h2>Main Content</h2>
      <p>This content is inert when the sidebar is open on mobile</p>
      <button>Interact with content</button>
      <button>Another button</button>
    </div>
  </main>
</div>

<style>
  * {
    box-sizing: border-box;
  }

  .sidebar-layout {
    display: flex;
    min-height: 100vh;
  }

  .sidebar {
    width: 250px;
    background: linear-gradient(135deg, #2d3436 0%, #000 100%);
    color: white;
    padding: 0;
    overflow-y: auto;
    position: relative;
    z-index: 1000;
  }

  .sidebar-header {
    padding: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .sidebar-header h2 {
    margin: 0;
    font-size: 20px;
  }

  .close-btn {
    display: none;
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 16px;
    padding: 4px 8px;
  }

  .nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .nav-list li {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .nav-list a {
    display: block;
    padding: 16px 20px;
    color: white;
    text-decoration: none;
    transition: background 0.2s;
    font-size: 14px;
  }

  .nav-list a:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .sidebar-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }

  .sidebar-overlay.active {
    display: block;
  }

  #main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  #main-content[inert] {
    opacity: 0.5;
    pointer-events: none;
  }

  .top-bar {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .top-bar h1 {
    margin: 0;
    font-size: 24px;
  }

  .menu-btn {
    display: none;
    background: transparent;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 4px 8px;
  }

  .content {
    padding: 20px;
    flex: 1;
  }

  .content h2 {
    color: #333;
    margin-bottom: 12px;
  }

  .content p {
    color: #666;
    line-height: 1.6;
    margin-bottom: 16px;
  }

  .content button {
    display: block;
    padding: 10px 20px;
    margin-bottom: 8px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }

  .content button:hover {
    background: #5568d3;
  }

  @media (max-width: 768px) {
    .sidebar {
      position: fixed;
      left: 0;
      top: 0;
      height: 100vh;
      z-index: 1001;
      transform: translateX(-100%);
      transition: transform 0.3s ease-out;
    }

    .sidebar.active {
      transform: translateX(0);
    }

    .close-btn {
      display: block;
    }

    .menu-btn {
      display: block;
    }
  }
</style>

<script>
  const toggleBtn = document.getElementById('toggle-sidebar');
  const closeBtn = document.getElementById('close-sidebar');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const main = document.getElementById('main-content');

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    main.inert = sidebar.classList.contains('active');

    if (sidebar.classList.contains('active')) {
      closeBtn.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    main.inert = false;
    toggleBtn.focus();
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    main.inert = false;
    toggleBtn.focus();
  });
</script>
```

## Multiple Inert Zones

Manage multiple inert regions for complex layouts.

```html
<div class="complex-layout">
  <aside class="left-panel" id="left-panel">
    <h3>Left Panel</h3>
    <button>Left Option 1</button>
    <button>Left Option 2</button>
  </aside>

  <main id="main-area">
    <h1>Main Area</h1>
    <button id="open-modal-btn">Open Settings</button>
  </main>

  <aside class="right-panel" id="right-panel">
    <h3>Right Panel</h3>
    <button>Right Option 1</button>
    <button>Right Option 2</button>
  </aside>

  <dialog id="settings-modal" class="modal">
    <h2>Settings</h2>
    <form method="dialog">
      <div class="setting-group">
        <label><input type="checkbox" /> Enable notifications</label>
      </div>
      <div class="setting-group">
        <label><input type="checkbox" /> Dark mode</label>
      </div>
      <button type="submit">Close</button>
    </form>
  </dialog>
</div>

<style>
  .complex-layout {
    display: flex;
    min-height: 100vh;
    gap: 16px;
    padding: 16px;
    background: #f5f5f5;
  }

  .left-panel,
  .right-panel {
    width: 200px;
    background: white;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
  }

  .left-panel[inert],
  .right-panel[inert] {
    opacity: 0.5;
    pointer-events: none;
  }

  .left-panel h3,
  .right-panel h3 {
    margin: 0 0 12px 0;
    color: #333;
  }

  .left-panel button,
  .right-panel button {
    display: block;
    width: 100%;
    padding: 8px;
    margin: 8px 0;
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
  }

  #main-area {
    flex: 1;
    background: white;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
  }

  #main-area[inert] {
    opacity: 0.5;
    pointer-events: none;
  }

  #open-modal-btn {
    padding: 10px 20px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  #settings-modal {
    border: none;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  }

  #settings-modal::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }

  .setting-group {
    margin-bottom: 16px;
  }

  .setting-group label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    color: #333;
  }
</style>

<script>
  const openBtn = document.getElementById('open-modal-btn');
  const modal = document.getElementById('settings-modal');
  const leftPanel = document.getElementById('left-panel');
  const rightPanel = document.getElementById('right-panel');
  const mainArea = document.getElementById('main-area');

  openBtn.addEventListener('click', () => {
    leftPanel.inert = true;
    rightPanel.inert = true;
    mainArea.inert = true;
    modal.showModal();
  });

  modal.addEventListener('close', () => {
    leftPanel.inert = false;
    rightPanel.inert = false;
    mainArea.inert = false;
    openBtn.focus();
  });
</script>
```

## Accessibility Best Practices

Combine inert with proper ARIA attributes:

```html
<div id="app">
  <main id="main-content" role="main">
    <h1>Application</h1>
    <button id="trigger">Trigger Modal</button>
  </main>

  <dialog
    id="modal"
    role="alertdialog"
    aria-labelledby="modal-title"
    aria-modal="true"
  >
    <h2 id="modal-title">Alert</h2>
    <p>Important message</p>
    <form method="dialog">
      <button type="submit">Acknowledge</button>
    </form>
  </dialog>
</div>

<style>
  #main-content[inert] {
    opacity: 0.5;
    pointer-events: none;
  }

  #modal {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  }

  #modal::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }
</style>

<script>
  const trigger = document.getElementById('trigger');
  const modal = document.getElementById('modal');
  const main = document.getElementById('main-content');

  trigger.addEventListener('click', () => {
    main.inert = true;
    modal.showModal();
  });

  modal.addEventListener('close', () => {
    main.inert = false;
    trigger.focus();
  });
</script>
```

## Performance Considerations

The inert attribute is highly performant:

```javascript
// Efficient: Inert handles all descendants
element.inert = true; // Single operation

// Creates a11y-friendly interfaces without focus-trap libraries
// No need for manual focus management
// Automatic keyboard navigation prevention
```

## Browser Compatibility

- Chromium 102+: Full inert support
- Safari 15.4+: Full support
- Firefox 112+: Full support
- Edge 102+: Full support

## Summary

Master focus trapping with the inert attribute:
- Make background content inert during modals
- Prevent focus escape without focus-trap libraries
- Sidebar toggle focus management
- Multiple inert zones for complex layouts
- Proper ARIA attribute combination
- Accessibility-first focus control
- No JavaScript focus management needed
- High performance native implementation

Create accessible modals and focus-trapped interfaces with native browser APIs.
