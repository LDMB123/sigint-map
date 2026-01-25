---
name: pwa-file-handlers
description: File system integration with file_handlers, LaunchQueue API, and OPFS for PWA file handling on macOS
version: 1.0.0
target: chromium-143+
platform: apple-silicon-m-series
os: macos-26.2
pwa-feature: file-handlers
---

# PWA File Handlers & File System Access

## Overview

Enable PWAs to register as file handlers for specific file types, integrate with macOS Finder, and access the Origin Private File System (OPFS) for app-owned file storage.

## Manifest File Handlers

### Basic Configuration

```json
{
  "name": "Document Editor",
  "short_name": "Docs",
  "display": "standalone",
  "file_handlers": [
    {
      "action": "/open-document",
      "accept": {
        "text/markdown": [".md", ".markdown"],
        "text/plain": [".txt"]
      },
      "icons": [
        {
          "src": "/icons/document-icon.png",
          "sizes": "256x256"
        }
      ]
    },
    {
      "action": "/open-image",
      "accept": {
        "image/png": [".png"],
        "image/jpeg": [".jpg", ".jpeg"],
        "image/webp": [".webp"]
      },
      "icons": [
        {
          "src": "/icons/image-icon.png",
          "sizes": "256x256"
        }
      ]
    }
  ]
}
```

### Advanced Multi-Type Handler

```json
{
  "file_handlers": [
    {
      "action": "/open",
      "accept": {
        "application/json": [".json", ".jsonld"],
        "text/csv": [".csv"],
        "text/xml": [".xml"],
        "application/xml": [".xml"],
        "text/plain": [".txt", ".log"]
      },
      "launch_type": "single-client",
      "icons": [
        {
          "src": "/icons/file-256.png",
          "sizes": "256x256",
          "type": "image/png"
        },
        {
          "src": "/icons/file-512.png",
          "sizes": "512x512",
          "type": "image/png"
        }
      ]
    }
  ]
}
```

## LaunchQueue API

Handle file opens from the file handler invocation.

### Basic Implementation

```javascript
// In your app's main script
if ('launchQueue' in window) {
  launchQueue.setConsumer((launchParams) => {
    if (launchParams.files.length === 0) {
      return;
    }

    for (const fileHandle of launchParams.files) {
      handleFile(fileHandle);
    }
  });
}

async function handleFile(fileHandle) {
  try {
    const file = await fileHandle.getFile();
    console.log('Opened file:', file.name, file.type);

    // Process the file
    const content = await file.text();
    displayContent(content, file.name);

    // Store in OPFS for future access
    await saveToOPFS(fileHandle);
  } catch (error) {
    console.error('Failed to read file:', error);
  }
}

function displayContent(content, filename) {
  const editor = document.getElementById('editor');
  editor.value = content;
  document.title = filename;
}
```

### Advanced LaunchQueue with File Type Detection

```javascript
// More sophisticated handler with type routing
if ('launchQueue' in window) {
  launchQueue.setConsumer(async (launchParams) => {
    for (const fileHandle of launchParams.files) {
      const file = await fileHandle.getFile();
      const mimeType = file.type;

      if (mimeType.startsWith('image/')) {
        await handleImageFile(fileHandle, file);
      } else if (mimeType.startsWith('text/')) {
        await handleTextFile(fileHandle, file);
      } else if (mimeType === 'application/json') {
        await handleJSONFile(fileHandle, file);
      } else {
        console.warn('Unsupported file type:', mimeType);
      }
    }
  });
}

async function handleImageFile(handle, file) {
  const blob = await file.arrayBuffer();
  const url = URL.createObjectURL(new Blob([blob], { type: file.type }));
  const img = document.createElement('img');
  img.src = url;
  document.getElementById('preview').innerHTML = '';
  document.getElementById('preview').appendChild(img);
}

async function handleTextFile(handle, file) {
  const text = await file.text();
  document.getElementById('editor').value = text;
  // Enable saving modifications back to original file
  storeForWriteAccess(handle);
}

async function handleJSONFile(handle, file) {
  const data = await file.json();
  renderJSONData(data);
  storeForWriteAccess(handle);
}

// Store handles that were opened, for write-back capability
const openFiles = new Map();

function storeForWriteAccess(handle) {
  openFiles.set(handle.name, handle);
}
```

## Origin Private File System (OPFS)

Store app-owned files that persist between sessions.

### OPFS Storage Pattern

```javascript
// Access the root directory of OPFS
async function getOPFSRoot() {
  const root = await navigator.storage.getDirectory();
  return root;
}

// Save file to OPFS
async function saveToOPFS(fileHandle) {
  try {
    const root = await navigator.storage.getDirectory();
    const file = await fileHandle.getFile();
    const fileName = file.name;

    // Create or get a file in OPFS
    const opfsFile = await root.getFileHandle(fileName, { create: true });
    const writable = await opfsFile.createWritable();

    const content = await file.arrayBuffer();
    await writable.write(content);
    await writable.close();

    console.log('File saved to OPFS:', fileName);
    return opfsFile;
  } catch (error) {
    console.error('Failed to save to OPFS:', error);
  }
}

// Retrieve file from OPFS
async function loadFromOPFS(fileName) {
  try {
    const root = await navigator.storage.getDirectory();
    const opfsFile = await root.getFileHandle(fileName);
    const file = await opfsFile.getFile();
    return file;
  } catch (error) {
    console.error('File not in OPFS:', error);
    return null;
  }
}

// List all files in OPFS
async function listOPFSFiles() {
  const root = await navigator.storage.getDirectory();
  const files = [];

  for await (const entry of root.entries()) {
    if (entry[1].kind === 'file') {
      files.push({
        name: entry[0],
        handle: entry[1]
      });
    }
  }

  return files;
}

// Delete file from OPFS
async function deleteFromOPFS(fileName) {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(fileName);
    console.log('Deleted from OPFS:', fileName);
  } catch (error) {
    console.error('Failed to delete from OPFS:', error);
  }
}
```

### OPFS with IndexedDB Integration

```javascript
import { openDB } from 'idb';

// Initialize database for file metadata
async function initFileMetadataDB() {
  const db = await openDB('file-metadata', 1, {
    upgrade(db) {
      const store = db.createObjectStore('files', { keyPath: 'fileName' });
      store.createIndex('lastModified', 'lastModified');
      store.createIndex('mimeType', 'mimeType');
    }
  });
  return db;
}

// Save file with metadata
async function saveFileWithMetadata(fileHandle, opfsHandle) {
  const file = await fileHandle.getFile();
  const db = await initFileMetadataDB();

  const metadata = {
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    lastModified: file.lastModified,
    opfsPath: opfsHandle.name,
    savedAt: Date.now()
  };

  await db.put('files', metadata);
  console.log('File metadata stored:', metadata.fileName);
}

// Query recent files
async function getRecentFiles(limit = 10) {
  const db = await initFileMetadataDB();
  const index = db.transaction('files').store.index('lastModified');
  const allFiles = await index.getAll();
  return allFiles.reverse().slice(0, limit);
}

// Get files by MIME type
async function getFilesByType(mimeType) {
  const db = await initFileMetadataDB();
  const index = db.transaction('files').store.index('mimeType');
  return index.getAll(mimeType);
}
```

## Drag and Drop Integration

```html
<!-- HTML with drag and drop zone -->
<div id="drop-zone" class="drop-zone">
  <p>Drag files here or click to open</p>
</div>

<script>
const dropZone = document.getElementById('drop-zone');

// Prevent default drag behavior
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// Highlight drop zone on drag over
['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
  dropZone.classList.add('highlight');
}

function unhighlight(e) {
  dropZone.classList.remove('highlight');
}

// Handle dropped files
dropZone.addEventListener('drop', handleDrop, false);

async function handleDrop(e) {
  const dt = e.dataTransfer;
  const items = dt.items;

  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === 'file') {
      const file = items[i].getAsFile();
      console.log('Dropped file:', file.name);

      // Process dropped file
      if (file.type.startsWith('image/')) {
        await handleImageFile(null, file);
      } else {
        await handleTextFile(null, file);
      }

      // Save to OPFS if possible
      if ('getAsFileSystemHandle' in DataTransferItem.prototype) {
        const handle = await items[i].getAsFileSystemHandle();
        await saveToOPFS(handle);
      }
    }
  }
}
</script>

<style>
.drop-zone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  background: #f9f9f9;
  cursor: pointer;
  transition: all 0.3s;
}

.drop-zone:hover {
  border-color: #999;
  background: #f5f5f5;
}

.drop-zone.highlight {
  border-color: #667eea;
  background: #f0f4ff;
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.2);
}
</style>
```

## MIME Type Registration

macOS Finder integration requires proper MIME type declarations:

```json
{
  "file_handlers": [
    {
      "action": "/editor",
      "accept": {
        "text/markdown": [".md"],
        "text/plain": [".txt", ".log"],
        "text/csv": [".csv"],
        "text/html": [".html", ".htm"],
        "application/json": [".json"],
        "application/xml": [".xml"]
      }
    },
    {
      "action": "/viewer",
      "accept": {
        "image/png": [".png"],
        "image/jpeg": [".jpg", ".jpeg"],
        "image/webp": [".webp"],
        "image/svg+xml": [".svg"]
      }
    }
  ]
}
```

## Testing File Handlers

### 1. Install PWA
```bash
# Install as macOS app
chrome://apps > right-click > "Install as app"
```

### 2. Register File Types
```bash
# macOS Finder: Right-click file > Get Info > Open With > Select your PWA
# Or: System Preferences > General > Default apps (macOS 13+)
```

### 3. Test LaunchQueue
```javascript
// In DevTools when PWA is installed:
if ('launchQueue' in window) {
  console.log('LaunchQueue supported');
  launchQueue.setConsumer((params) => {
    console.log('Files received:', params.files);
  });
}
```

### 4. Test OPFS
```javascript
// In DevTools:
const root = await navigator.storage.getDirectory();
const handle = await root.getFileHandle('test.txt', { create: true });
const writable = await handle.createWritable();
await writable.write('Hello OPFS');
await writable.close();
console.log('File created in OPFS');
```

## Performance Optimization for M-series

OPFS on Apple Silicon benefits from unified memory:

```javascript
// Efficient large file handling
async function processLargeFile(fileHandle) {
  const file = await fileHandle.getFile();
  const chunkSize = 1024 * 1024; // 1MB chunks
  let offset = 0;

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize);
    const buffer = await chunk.arrayBuffer();

    // Process chunk (Metal GPU can assist with data parallel operations)
    processChunk(buffer);

    offset += chunkSize;
    // Yield to avoid blocking
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

function processChunk(buffer) {
  // Use typed arrays for efficient memory access
  const view = new Uint8Array(buffer);
  // Perform operations on unified memory
}
```

## Service Worker Integration

```javascript
// sw.js - Handle file access with caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/open-document') {
    event.respondWith(handleFileRequest(event.request));
  }
});

async function handleFileRequest(request) {
  // Cache file metadata but refetch actual content
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    const cache = await caches.open('v1');
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return new Response('File not found', { status: 404 });
  }
}
```

## Browser Compatibility

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| File Handlers | 102+ | 102+ | No | No |
| LaunchQueue API | 102+ | 102+ | No | No |
| OPFS (Storage API) | 86+ | 86+ | No | 111+ |
| Drag & Drop Files | All | All | All | All |
| FileSystemHandle API | 86+ | 86+ | No | 111+ |

## References

- [File Handling API](https://github.com/WICG/file-handling/blob/main/explainer.md)
- [LaunchQueue API](https://wicg.github.io/launch-queue/)
- [Origin Private File System (OPFS)](https://fs.spec.whatwg.org/#origin-private-file-system)
- [File System Access API](https://wicg.github.io/file-system-access/)
