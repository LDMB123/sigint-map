---
name: pwa-shortcuts
description: PWA shortcuts for macOS dock right-click menu and keyboard shortcuts with keyboard API integration
version: 1.0.0
target: chromium-143+
platform: apple-silicon-m-series
os: macos-26.2
pwa-feature: shortcuts
---

# PWA Shortcuts & Quick Actions

## Overview

Create PWA shortcuts that appear in macOS Dock right-click menus and implement keyboard shortcuts for quick app actions using the Keyboard API.

## Manifest Shortcuts

### Basic Shortcuts

```json
{
  "name": "Productivity App",
  "short_name": "Productivity",
  "display": "standalone",
  "shortcuts": [
    {
      "name": "New Task",
      "short_name": "New",
      "description": "Create a new task",
      "url": "/new-task",
      "icons": [
        {
          "src": "/icons/new-task-192.png",
          "sizes": "192x192"
        }
      ]
    },
    {
      "name": "View Tasks",
      "short_name": "Tasks",
      "description": "View all tasks",
      "url": "/tasks",
      "icons": [
        {
          "src": "/icons/tasks-192.png",
          "sizes": "192x192"
        }
      ]
    },
    {
      "name": "Search",
      "short_name": "Search",
      "description": "Search tasks",
      "url": "/search",
      "icons": [
        {
          "src": "/icons/search-192.png",
          "sizes": "192x192"
        }
      ]
    }
  ]
}
```

### Advanced Shortcuts with Multiple Icons

```json
{
  "shortcuts": [
    {
      "name": "New Document",
      "short_name": "New",
      "description": "Create a new blank document",
      "url": "/create?type=document",
      "icons": [
        {
          "src": "/icons/new-doc-192.png",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "/icons/new-doc-256.png",
          "sizes": "256x256",
          "type": "image/png"
        },
        {
          "src": "/icons/new-doc-maskable-192.png",
          "sizes": "192x192",
          "type": "image/png",
          "purpose": "maskable"
        }
      ]
    },
    {
      "name": "Recent Documents",
      "short_name": "Recent",
      "description": "View recently opened documents",
      "url": "/recent",
      "icons": [
        {
          "src": "/icons/recent-192.png",
          "sizes": "192x192"
        }
      ]
    },
    {
      "name": "Templates",
      "short_name": "Templates",
      "description": "Browse document templates",
      "url": "/templates",
      "icons": [
        {
          "src": "/icons/templates-192.png",
          "sizes": "192x192"
        }
      ]
    },
    {
      "name": "Settings",
      "short_name": "Settings",
      "description": "Open app settings",
      "url": "/settings",
      "icons": [
        {
          "src": "/icons/settings-192.png",
          "sizes": "192x192"
        }
      ]
    }
  ]
}
```

## Keyboard Shortcuts Implementation

### Basic Keyboard Listener

```javascript
class KeyboardShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.init();
  }

  init() {
    // Define shortcuts
    this.registerShortcut({ key: 'n', metaKey: true }, 'newTask', () => this.createNewTask());
    this.registerShortcut({ key: 't', metaKey: true }, 'toggleTasks', () => this.toggleTaskView());
    this.registerShortcut({ key: 's', metaKey: true }, 'search', () => this.openSearch());
    this.registerShortcut({ key: 'k', metaKey: true }, 'commandPalette', () => this.openCommandPalette());
    this.registerShortcut({ key: ',', metaKey: true }, 'settings', () => this.openSettings());

    // Combo shortcuts
    this.registerShortcut({ key: 's', metaKey: true, shiftKey: true }, 'quickSave', () => this.quickSave());

    // Listen for keyboard events
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  registerShortcut(keyCombination, id, callback) {
    const key = JSON.stringify(keyCombination);
    this.shortcuts.set(key, { id, callback });
  }

  handleKeydown(event) {
    // Skip if typing in input/textarea
    if (this.isEditableElement(event.target)) {
      return;
    }

    const combination = {
      key: event.key.toLowerCase(),
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey
    };

    const key = JSON.stringify(combination);
    const shortcut = this.shortcuts.get(key);

    if (shortcut) {
      event.preventDefault();
      shortcut.callback();
      console.log('Executed shortcut:', shortcut.id);
    }
  }

  isEditableElement(element) {
    if (!element) return false;
    const tagName = element.tagName.toLowerCase();
    const isContentEditable = element.contentEditable === 'true';
    return tagName === 'input' || tagName === 'textarea' || isContentEditable;
  }

  createNewTask() {
    console.log('Creating new task');
    window.location.href = '/new-task';
  }

  toggleTaskView() {
    console.log('Toggling task view');
    const tasks = document.getElementById('tasks');
    if (tasks) {
      tasks.classList.toggle('hidden');
    }
  }

  openSearch() {
    console.log('Opening search');
    const searchBox = document.getElementById('search-input');
    if (searchBox) {
      searchBox.focus();
    }
  }

  openCommandPalette() {
    console.log('Opening command palette');
    // Trigger command palette UI
    const event = new CustomEvent('openCommandPalette');
    document.dispatchEvent(event);
  }

  openSettings() {
    console.log('Opening settings');
    window.location.href = '/settings';
  }

  quickSave() {
    console.log('Quick save');
    const event = new CustomEvent('quickSave');
    document.dispatchEvent(event);
  }
}

// Initialize
new KeyboardShortcutManager();
```

### Navigator Keyboard API (Chromium 107+)

```javascript
class KeyboardAPIHandler {
  async init() {
    if (!navigator.keyboard) {
      console.warn('Keyboard API not supported');
      return;
    }

    try {
      // Request keyboard lock for specific keys
      await navigator.keyboard.lock([
        'KeyN', // Cmd+N for new
        'KeyT', // Cmd+T for tasks
        'KeyS', // Cmd+S for search
        'KeyK', // Cmd+K for command palette
        'Comma', // Cmd+, for settings
      ]);

      console.log('Keyboard locked for app shortcuts');
    } catch (error) {
      console.warn('Could not lock keyboard:', error);
    }
  }

  release() {
    if (navigator.keyboard) {
      navigator.keyboard.unlock();
    }
  }
}

// Initialize on focus
window.addEventListener('focus', () => {
  new KeyboardAPIHandler().init();
});

// Release on blur
window.addEventListener('blur', () => {
  new KeyboardAPIHandler().release();
});
```

## Shortcut Display UI

### HTML for Displaying Available Shortcuts

```html
<!-- shortcuts-help.html -->
<div id="shortcuts-modal" class="modal">
  <div class="modal-content">
    <button class="close-btn" onclick="closeShortcutsModal()">×</button>
    <h1>Keyboard Shortcuts</h1>

    <div class="shortcuts-section">
      <h2>Tasks</h2>
      <table class="shortcuts-table">
        <tr>
          <td class="shortcut-key">⌘N</td>
          <td class="shortcut-desc">New task</td>
        </tr>
        <tr>
          <td class="shortcut-key">⌘T</td>
          <td class="shortcut-desc">Show all tasks</td>
        </tr>
        <tr>
          <td class="shortcut-key">⌘S</td>
          <td class="shortcut-desc">Search</td>
        </tr>
      </table>
    </div>

    <div class="shortcuts-section">
      <h2>Application</h2>
      <table class="shortcuts-table">
        <tr>
          <td class="shortcut-key">⌘K</td>
          <td class="shortcut-desc">Command palette</td>
        </tr>
        <tr>
          <td class="shortcut-key">⌘,</td>
          <td class="shortcut-desc">Settings</td>
        </tr>
        <tr>
          <td class="shortcut-key">⌘⇧S</td>
          <td class="shortcut-desc">Quick save</td>
        </tr>
      </table>
    </div>
  </div>
</div>

<style>
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 500px;
  margin: 50px auto;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 15px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

.shortcuts-section {
  margin: 20px 0;
}

.shortcuts-table {
  width: 100%;
  border-collapse: collapse;
}

.shortcuts-table tr {
  border-bottom: 1px solid #eee;
}

.shortcuts-table td {
  padding: 12px;
}

.shortcut-key {
  font-family: 'Monaco', monospace;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 6px 12px;
  font-weight: 600;
  width: 100px;
  text-align: center;
}

.shortcut-desc {
  color: #666;
}
</style>

<script>
function openShortcutsModal() {
  document.getElementById('shortcuts-modal').style.display = 'block';
}

function closeShortcutsModal() {
  document.getElementById('shortcuts-modal').style.display = 'none';
}

// Open on Cmd+?
document.addEventListener('keydown', (e) => {
  if (e.metaKey && e.shiftKey && e.key === '?') {
    openShortcutsModal();
  }
});
</script>
```

## Command Palette with Shortcuts

```javascript
class CommandPalette {
  constructor() {
    this.commands = [];
    this.registerCommands();
  }

  registerCommands() {
    this.commands = [
      {
        id: 'new-task',
        name: 'New Task',
        category: 'Tasks',
        shortcut: '⌘N',
        action: () => this.createNewTask()
      },
      {
        id: 'view-tasks',
        name: 'View All Tasks',
        category: 'Tasks',
        shortcut: '⌘T',
        action: () => this.viewTasks()
      },
      {
        id: 'search',
        name: 'Search',
        category: 'Navigation',
        shortcut: '⌘S',
        action: () => this.openSearch()
      },
      {
        id: 'settings',
        name: 'Settings',
        category: 'Application',
        shortcut: '⌘,',
        action: () => this.openSettings()
      },
      {
        id: 'help',
        name: 'Show Shortcuts',
        category: 'Help',
        shortcut: '⌘⇧?',
        action: () => this.showShortcuts()
      },
      {
        id: 'dark-mode',
        name: 'Toggle Dark Mode',
        category: 'Appearance',
        action: () => this.toggleDarkMode()
      },
      {
        id: 'about',
        name: 'About',
        category: 'Help',
        action: () => this.showAbout()
      }
    ];

    document.addEventListener('openCommandPalette', () => this.open());
  }

  open() {
    const palette = this.createPaletteUI();
    document.body.appendChild(palette);

    const input = palette.querySelector('input');
    input.focus();

    input.addEventListener('input', (e) => this.filterCommands(e.target.value, palette));
    input.addEventListener('keydown', (e) => this.handleKeydown(e, palette));
  }

  createPaletteUI() {
    const container = document.createElement('div');
    container.className = 'command-palette';
    container.innerHTML = `
      <div class="command-palette-content">
        <input
          type="text"
          placeholder="Type command or search..."
          class="command-input"
          autocomplete="off"
        >
        <ul class="command-list"></ul>
      </div>
    `;

    const list = container.querySelector('.command-list');
    this.renderCommandList(this.commands, list);

    // Close on escape
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        container.remove();
      }
    });

    return container;
  }

  renderCommandList(commands, list) {
    list.innerHTML = commands
      .map((cmd, index) => `
        <li class="command-item" data-id="${cmd.id}">
          <span class="command-name">${cmd.name}</span>
          <span class="command-category">${cmd.category}</span>
          ${cmd.shortcut ? `<span class="command-shortcut">${cmd.shortcut}</span>` : ''}
        </li>
      `)
      .join('');

    list.querySelectorAll('.command-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        const cmd = commands.find(c => c.id === item.dataset.id);
        if (cmd) cmd.action();
        document.querySelector('.command-palette').remove();
      });

      if (index === 0) {
        item.classList.add('selected');
      }
    });
  }

  filterCommands(query, palette) {
    const filtered = this.commands.filter(cmd =>
      cmd.name.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase())
    );

    const list = palette.querySelector('.command-list');
    this.renderCommandList(filtered, list);
  }

  handleKeydown(e, palette) {
    const items = palette.querySelectorAll('.command-item');
    const selected = palette.querySelector('.command-item.selected');
    const selectedIndex = Array.from(items).indexOf(selected);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (selected) selected.classList.remove('selected');
        const nextIndex = Math.min(selectedIndex + 1, items.length - 1);
        items[nextIndex].classList.add('selected');
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (selected) selected.classList.remove('selected');
        const prevIndex = Math.max(selectedIndex - 1, 0);
        items[prevIndex].classList.add('selected');
        break;

      case 'Enter':
        e.preventDefault();
        if (selected) {
          const cmd = this.commands.find(c => c.id === selected.dataset.id);
          if (cmd) cmd.action();
          palette.remove();
        }
        break;
    }
  }

  createNewTask() {
    window.location.href = '/new-task';
  }

  viewTasks() {
    window.location.href = '/tasks';
  }

  openSearch() {
    document.getElementById('search-input')?.focus();
  }

  openSettings() {
    window.location.href = '/settings';
  }

  showShortcuts() {
    openShortcutsModal();
  }

  toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
  }

  showAbout() {
    alert('My App v1.0.0\nA Progressive Web App');
  }
}

// Initialize
new CommandPalette();
```

## Command Palette Styling

```css
.command-palette {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 10000;
  padding-top: 100px;
}

.command-palette-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.command-input {
  width: 100%;
  padding: 16px;
  border: none;
  font-size: 16px;
  outline: none;
  border-bottom: 1px solid #eee;
}

.command-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 400px;
  overflow-y: auto;
}

.command-item {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s;
}

.command-item:hover,
.command-item.selected {
  background: #f5f5f5;
}

.command-name {
  flex: 1;
  font-weight: 500;
}

.command-category {
  color: #999;
  font-size: 12px;
  margin: 0 12px;
  text-transform: uppercase;
}

.command-shortcut {
  font-family: 'Monaco', monospace;
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}
```

## Testing Shortcuts

### Keyboard Shortcut Testing

```javascript
// In DevTools console
const manager = new KeyboardShortcutManager();

// Simulate Cmd+N
const event = new KeyboardEvent('keydown', {
  key: 'n',
  metaKey: true,
  code: 'KeyN'
});
document.dispatchEvent(event);
```

### macOS Dock Testing

```bash
# 1. Install PWA
chrome://apps > right-click > Install

# 2. Test Dock shortcuts
# Right-click PWA icon in Dock
# Verify shortcuts appear in menu
```

## Browser Compatibility

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| Shortcuts in manifest | 96+ | 96+ | No | No |
| Keyboard Events | All | All | All | All |
| Keyboard API (lock) | 107+ | 107+ | No | 110+ |
| Dock integration (macOS) | 96+ | 96+ | No | No |

## References

- [Web App Manifest Shortcuts](https://www.w3.org/TR/appmanifest/#shortcuts-member)
- [Keyboard API](https://wicg.github.io/keyboard-lock/)
- [Keyboard Event MDN](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent)
