---
name: pwa-protocol-handlers
description: Custom URL protocol registration for PWA deep linking and cross-app integration on macOS
version: 1.0.0
target: chromium-143+
platform: apple-silicon-m-series
os: macos-26.2
pwa-feature: protocol-handlers
---

# PWA Protocol Handlers

## Overview

Register PWAs as handlers for custom URL protocols (web+appname://), enabling deep linking from other applications and seamless cross-app integration on macOS.

## Manifest Protocol Handlers

### Basic Configuration

```json
{
  "name": "My Protocol App",
  "short_name": "ProtocolApp",
  "display": "standalone",
  "protocol_handlers": [
    {
      "protocol": "web+myapp",
      "url": "/protocol?url=%s"
    }
  ]
}
```

### Multiple Protocol Handlers

```json
{
  "name": "Multi Protocol App",
  "protocol_handlers": [
    {
      "protocol": "web+notes",
      "url": "/notes?action=open&url=%s"
    },
    {
      "protocol": "web+task",
      "url": "/tasks?action=create&url=%s"
    },
    {
      "protocol": "web+share",
      "url": "/share?content=%s"
    },
    {
      "protocol": "web+sync",
      "url": "/sync?data=%s"
    }
  ]
}
```

## URL Parameter Parsing

### Basic Handler

```javascript
// pages/protocol.js
class ProtocolHandler {
  constructor() {
    this.init();
  }

  async init() {
    // Parse URL on page load
    const params = new URLSearchParams(window.location.search);
    const encodedUrl = params.get('url');

    if (encodedUrl) {
      const originalUrl = decodeURIComponent(encodedUrl);
      console.log('Protocol invoked with URL:', originalUrl);
      await this.handleProtocolUrl(originalUrl);
    }
  }

  async handleProtocolUrl(url) {
    try {
      // Parse the web+myapp:// URL
      const protocolUrl = new URL(url);
      const action = protocolUrl.hostname;
      const params = protocolUrl.searchParams;

      console.log('Protocol action:', action);
      console.log('Parameters:', Array.from(params.entries()));

      // Route based on action
      switch (action) {
        case 'open':
          await this.openItem(params);
          break;
        case 'create':
          await this.createItem(params);
          break;
        case 'edit':
          await this.editItem(params);
          break;
        case 'share':
          await this.shareItem(params);
          break;
        default:
          console.warn('Unknown action:', action);
      }
    } catch (error) {
      console.error('Failed to handle protocol URL:', error);
    }
  }

  async openItem(params) {
    const id = params.get('id');
    const type = params.get('type');

    console.log(`Opening ${type} with ID: ${id}`);

    // Load item from IndexedDB
    const item = await this.loadItemFromDB(type, id);
    if (item) {
      this.displayItem(item);
    } else {
      console.warn('Item not found:', type, id);
    }
  }

  async createItem(params) {
    const title = params.get('title');
    const content = params.get('content');

    console.log('Creating new item:', title);

    // Pre-populate form with parameters
    const form = document.getElementById('create-form');
    if (form) {
      form.title.value = title || '';
      form.content.value = content || '';
    }
  }

  async editItem(params) {
    const id = params.get('id');
    const field = params.get('field');
    const value = params.get('value');

    console.log(`Editing item ${id}, field: ${field}`);

    const item = await this.loadItemFromDB('item', id);
    if (item) {
      item[field] = value;
      await this.saveItemToDB(item);
      this.displayItem(item);
    }
  }

  async shareItem(params) {
    const id = params.get('id');
    const withUser = params.get('withUser');

    console.log(`Sharing item ${id} with ${withUser}`);

    const item = await this.loadItemFromDB('item', id);
    if (item && navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: item.description,
          url: window.location.href
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    }
  }

  async loadItemFromDB(type, id) {
    // Implement database loading
    if (!window.indexedDB) return null;

    return new Promise((resolve) => {
      const request = indexedDB.open('app-db');

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(type + 's');
        const store = tx.objectStore(type + 's');
        const getRequest = store.get(parseInt(id));

        getRequest.onsuccess = () => {
          resolve(getRequest.result);
        };
      };
    });
  }

  async saveItemToDB(item) {
    if (!window.indexedDB) return;

    return new Promise((resolve) => {
      const request = indexedDB.open('app-db');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('items', 'readwrite');
        const store = tx.objectStore('items');
        store.put(item);
        resolve();
      };
    });
  }

  displayItem(item) {
    const container = document.getElementById('item-container');
    if (container) {
      container.innerHTML = `
        <h1>${item.title}</h1>
        <p>${item.description}</p>
        <p>Created: ${new Date(item.createdAt).toLocaleString()}</p>
      `;
    }
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ProtocolHandler();
  });
} else {
  new ProtocolHandler();
}
```

## Advanced Protocol URL Schemes

### Comprehensive URL Scheme Design

```javascript
// URL scheme patterns:
// web+notes://open?id=123&type=note
// web+notes://create?title=New%20Note
// web+notes://edit?id=123&field=content&value=Updated
// web+notes://delete?id=123
// web+notes://search?query=keyword
// web+notes://export?id=123&format=pdf

class AdvancedProtocolHandler {
  constructor() {
    this.routes = {
      'open': this.handleOpen.bind(this),
      'create': this.handleCreate.bind(this),
      'edit': this.handleEdit.bind(this),
      'delete': this.handleDelete.bind(this),
      'search': this.handleSearch.bind(this),
      'export': this.handleExport.bind(this),
      'import': this.handleImport.bind(this),
      'sync': this.handleSync.bind(this)
    };
  }

  async handleProtocol(url) {
    try {
      const protocolUrl = new URL(url);
      const action = protocolUrl.hostname;

      if (this.routes[action]) {
        await this.routes[action](protocolUrl);
      } else {
        console.warn('Unknown action:', action);
      }
    } catch (error) {
      console.error('Protocol handler error:', error);
    }
  }

  async handleOpen(url) {
    const params = url.searchParams;
    const id = params.get('id');
    const type = params.get('type') || 'note';

    const item = await this.loadFromIndexedDB(type, id);
    if (item) {
      this.displayItemEditor(item);
      window.history.replaceState(null, '', `/editor?id=${id}&type=${type}`);
    }
  }

  async handleCreate(url) {
    const params = url.searchParams;
    const title = params.get('title');
    const template = params.get('template');
    const content = params.get('content');

    const newItem = {
      title: title || 'Untitled',
      content: content || '',
      template: template || 'default',
      createdAt: Date.now(),
      tags: params.getAll('tags')
    };

    await this.saveToIndexedDB(newItem);
    this.displayItemEditor(newItem);
  }

  async handleEdit(url) {
    const params = url.searchParams;
    const id = params.get('id');
    const field = params.get('field');
    const value = params.get('value');

    const item = await this.loadFromIndexedDB('note', id);
    if (item) {
      if (field === 'tags') {
        item.tags = value.split(',');
      } else if (field === 'status') {
        item.status = value;
      } else {
        item[field] = value;
      }

      await this.saveToIndexedDB(item);
      this.displayItemEditor(item);
    }
  }

  async handleDelete(url) {
    const params = url.searchParams;
    const id = params.get('id');

    if (confirm('Delete this item?')) {
      await this.deleteFromIndexedDB('note', id);
      window.location.href = '/';
    }
  }

  async handleSearch(url) {
    const params = url.searchParams;
    const query = params.get('query');
    const type = params.get('type');

    const results = await this.searchIndexedDB(query, type);
    this.displaySearchResults(results, query);
    window.history.replaceState(null, '', `/search?q=${encodeURIComponent(query)}`);
  }

  async handleExport(url) {
    const params = url.searchParams;
    const id = params.get('id');
    const format = params.get('format') || 'json';

    const item = await this.loadFromIndexedDB('note', id);
    if (item) {
      const exported = this.formatForExport(item, format);
      this.downloadFile(exported, `export.${format}`);
    }
  }

  async handleImport(url) {
    const params = url.searchParams;
    const sourceUrl = params.get('source');

    if (sourceUrl) {
      const data = await fetch(sourceUrl).then(r => r.json());
      await this.saveToIndexedDB(data);
      console.log('Imported successfully');
    }
  }

  async handleSync(url) {
    const params = url.searchParams;
    const action = params.get('action');

    if (action === 'pull') {
      await this.syncPull();
    } else if (action === 'push') {
      await this.syncPush();
    } else {
      await this.syncBidirectional();
    }
  }

  async syncPull() {
    console.log('Pulling changes from server...');
    // Implement sync logic
  }

  async syncPush() {
    console.log('Pushing changes to server...');
    // Implement sync logic
  }

  async syncBidirectional() {
    console.log('Syncing bidirectionally...');
    // Implement sync logic
  }

  // IndexedDB helpers
  async loadFromIndexedDB(storeName, id) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('app-db');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(storeName);
        const store = tx.objectStore(storeName);
        const getRequest = store.get(parseInt(id));

        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }

  async saveToIndexedDB(item) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('app-db');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('notes', 'readwrite');
        const store = tx.objectStore('notes');
        const putRequest = store.put(item);

        putRequest.onsuccess = () => resolve(putRequest.result);
        putRequest.onerror = () => reject(putRequest.error);
      };
    });
  }

  async deleteFromIndexedDB(storeName, id) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('app-db');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const deleteRequest = store.delete(parseInt(id));

        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };
    });
  }

  async searchIndexedDB(query, type = 'notes') {
    return new Promise((resolve) => {
      const request = indexedDB.open('app-db');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(type);
        const store = tx.objectStore(type);
        const allRequest = store.getAll();

        allRequest.onsuccess = () => {
          const results = allRequest.result.filter(item =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.content.toLowerCase().includes(query.toLowerCase())
          );
          resolve(results);
        };
      };
    });
  }

  formatForExport(item, format) {
    if (format === 'json') {
      return JSON.stringify(item, null, 2);
    } else if (format === 'markdown') {
      return `# ${item.title}\n\n${item.content}`;
    } else if (format === 'pdf') {
      // Implement PDF export
      return item;
    }
    return JSON.stringify(item);
  }

  downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  displayItemEditor(item) {
    // Display item in editor UI
    document.getElementById('editor-title').value = item.title;
    document.getElementById('editor-content').value = item.content;
  }

  displaySearchResults(results, query) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = results
      .map(item => `
        <div class="result">
          <h3>${item.title}</h3>
          <p>${item.content.substring(0, 100)}...</p>
        </div>
      `)
      .join('');
  }
}

// Initialize
const protocolHandler = new AdvancedProtocolHandler();
```

## Deep Linking from Native Apps

### Swift Integration (macOS)

```swift
// In native macOS app
import Cocoa

class DeepLinkHandler {
  static func openInPWA(with url: URL) {
    // Format: web+notes://open?id=123
    let webURL = URL(string: "web+notes://open?id=\(url.lastPathComponent)")!

    // On macOS, use NSWorkspace to open with PWA
    NSWorkspace.shared.open(webURL)
  }

  static func createNoteInPWA(title: String, content: String) {
    let encodedTitle = title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!
    let encodedContent = content.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!

    let url = URL(string: "web+notes://create?title=\(encodedTitle)&content=\(encodedContent)")!
    NSWorkspace.shared.open(url)
  }
}
```

## Launch Handler with Protocol

```javascript
// In Service Worker - handle protocol launch
self.addEventListener('launch', (event) => {
  if (event.url) {
    console.log('PWA launched with URL:', event.url);

    // Navigate to appropriate handler page
    if (event.url.startsWith('web+')) {
      event.waitUntil(
        clients.openWindow('/protocol?url=' + encodeURIComponent(event.url))
      );
    }
  }
});

// Alternatively, in manifest (launch_handler is experimental)
{
  "launch_handler": {
    "client_mode": ["navigate-new", "navigate-existing"]
  }
}
```

## Testing Protocol Handlers

### 1. Manual Testing

```bash
# Test from terminal
open "web+notes://open?id=123"

# Test from another web app
<a href="web+notes://create?title=New%20Note">Create Note</a>
```

### 2. Test Page

```html
<!-- /test-protocol.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Protocol Handler Testing</title>
  <style>
    body {
      font-family: system-ui;
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }
    .test-case {
      border: 1px solid #ccc;
      padding: 15px;
      margin: 10px 0;
      border-radius: 6px;
    }
    button {
      padding: 8px 16px;
      margin: 5px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>Protocol Handler Testing</h1>

  <div class="test-case">
    <h2>Test Open</h2>
    <button onclick="testOpen()">Open Item</button>
  </div>

  <div class="test-case">
    <h2>Test Create</h2>
    <button onclick="testCreate()">Create Note</button>
  </div>

  <div class="test-case">
    <h2>Test Edit</h2>
    <button onclick="testEdit()">Edit Note</button>
  </div>

  <div class="test-case">
    <h2>Test Search</h2>
    <button onclick="testSearch()">Search</button>
  </div>

  <script>
    function testOpen() {
      window.location.href = 'web+notes://open?id=123&type=note';
    }

    function testCreate() {
      const title = encodeURIComponent('New Note from Protocol');
      const content = encodeURIComponent('This was created via protocol handler');
      window.location.href = `web+notes://create?title=${title}&content=${content}`;
    }

    function testEdit() {
      window.location.href = 'web+notes://edit?id=123&field=status&value=completed';
    }

    function testSearch() {
      const query = encodeURIComponent('important');
      window.location.href = `web+notes://search?query=${query}`;
    }
  </script>
</body>
</html>
```

### 3. Debug in DevTools

```javascript
// Check registered protocols
console.log('Protocol registered in manifest');

// Test URL parsing
const testUrl = 'web+notes://open?id=123';
const parsed = new URL(testUrl);
console.log('Action:', parsed.hostname);
console.log('Params:', Object.fromEntries(parsed.searchParams));
```

## Security Considerations

```javascript
// Always validate and sanitize protocol parameters
class SecureProtocolHandler {
  async handleProtocol(url) {
    try {
      const protocolUrl = new URL(url);
      const action = this.sanitizeAction(protocolUrl.hostname);
      const params = this.sanitizeParams(protocolUrl.searchParams);

      // Validate action is in whitelist
      if (!this.isValidAction(action)) {
        throw new Error('Invalid action: ' + action);
      }

      await this.routes[action](params);
    } catch (error) {
      console.error('Protocol handler error:', error);
    }
  }

  sanitizeAction(action) {
    // Only allow lowercase alphanumeric
    return action.toLowerCase().replace(/[^a-z0-9-]/g, '');
  }

  sanitizeParams(searchParams) {
    const sanitized = {};
    for (const [key, value] of searchParams) {
      // Remove any potentially dangerous characters
      sanitized[key.replace(/[^a-z0-9_-]/gi, '')] = value.slice(0, 1000);
    }
    return sanitized;
  }

  isValidAction(action) {
    const validActions = ['open', 'create', 'edit', 'search', 'export'];
    return validActions.includes(action);
  }
}
```

## Browser Compatibility

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| Protocol Handlers | 99+ | 99+ | No | 106+ |
| Web Scheme | 99+ | 99+ | No | 106+ |
| Custom Protocols | 99+ | 99+ | No | 106+ |

## References

- [Protocol Handler Registration API](https://wicg.github.io/web-app-launch/protocol-handler)
- [Web Scheme Registration](https://html.spec.whatwg.org/multipage/system-state.html#custom-handlers)
