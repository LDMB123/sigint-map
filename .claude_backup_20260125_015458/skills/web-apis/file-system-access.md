---
title: File System Access API
category: Web APIs
tags: [files, filesystem, storage, chromium143+]
description: Direct access to user's file system with native picker dialogs and OPFS
version: 1.0
browser_support: "Chromium 143+ baseline"
---

# File System Access API

Enables web apps to read, write, and manage files on the user's device with full integration of system file pickers and support for Origin Private File System (OPFS).

## When to Use

- **Document editors** — Allow users to open/save files directly
- **File upload optimization** — Batch operations on selected folders
- **OPFS-backed databases** — High-performance local storage
- **Media editing apps** — Process audio/video files
- **Development tools** — File tree navigation, code editing
- **Data analysis** — Import CSV/JSON, export results
- **File synchronization** — Track file changes, sync patterns

## Core Concepts

```typescript
interface FileSystemHandle {
  name: string;
  kind: 'file' | 'directory';
  isFile: boolean;
  isDirectory: boolean;
  queryPermission(options?: FileSystemHandlePermissionDescriptor): Promise<string>;
  requestPermission(options?: FileSystemHandlePermissionDescriptor): Promise<string>;
  remove(): Promise<void>;
  isSameEntry(other: FileSystemHandle): Promise<boolean>;
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  [Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemHandle]>;
  entries(): AsyncIterable<[string, FileSystemHandle]>;
  keys(): AsyncIterable<string>;
  values(): AsyncIterable<FileSystemHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
}
```

## File Picker Usage

### Open Single File

```typescript
async function openTextFile(): Promise<File> {
  const [handle] = await window.showOpenFilePicker({
    types: [
      {
        description: 'Text files',
        accept: { 'text/plain': ['.txt', '.text'] }
      }
    ],
    multiple: false
  });

  const file = await handle.getFile();
  console.log(`Opened file: ${file.name} (${file.size} bytes)`);

  return file;
}

// Usage
const textFile = await openTextFile();
const content = await textFile.text();
console.log(content);
```

### Open Multiple Files

```typescript
async function openMultipleImages(): Promise<File[]> {
  const handles = await window.showOpenFilePicker({
    types: [
      {
        description: 'Images',
        accept: {
          'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        }
      }
    ],
    multiple: true  // Allow multiple selection
  });

  const files: File[] = [];

  for (const handle of handles) {
    const file = await handle.getFile();
    files.push(file);
  }

  console.log(`Opened ${files.length} images`);
  return files;
}

// Usage
const images = await openMultipleImages();
images.forEach(img => console.log(img.name));
```

### Save File with Native Picker

```typescript
async function saveTextFile(content: string, fileName: string): Promise<void> {
  const handle = await window.showSaveFilePicker({
    suggestedName: fileName,
    types: [
      {
        description: 'Text files',
        accept: { 'text/plain': ['.txt'] }
      }
    ]
  });

  // Create writable stream
  const writable = await handle.createWritable();

  try {
    // Write content
    await writable.write(content);

    // Can seek and write at specific positions
    await writable.seek(0);
    await writable.truncate(content.length);
  } finally {
    await writable.close();
  }

  console.log(`File saved: ${handle.name}`);
}

// Usage
await saveTextFile('Hello, World!', 'document.txt');
```

### Directory Picker

```typescript
async function openDirectory(): Promise<FileSystemDirectoryHandle> {
  const directory = await window.showDirectoryPicker({
    mode: 'read' // or 'readwrite' for modification
  });

  console.log(`Selected directory: ${directory.name}`);
  return directory;
}

// Usage
const dir = await openDirectory();
for await (const [name, handle] of dir.entries()) {
  console.log(`${handle.kind}: ${name}`);
}
```

## Reading Files

### Read Text File

```typescript
async function readTextFile(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

// Usage
const textFile = await openTextFile();
const content = await readTextFile(textFile);
console.log('Content:', content);
```

### Read Binary File

```typescript
async function readBinaryFile(handle: FileSystemFileHandle): Promise<ArrayBuffer> {
  const file = await handle.getFile();
  return file.arrayBuffer();
}

// Read as typed array
async function readBinaryAsTypedArray(
  handle: FileSystemFileHandle,
  type: 'uint8' | 'int16' | 'float32' = 'uint8'
): Promise<any> {
  const buffer = await readBinaryFile(handle);

  switch (type) {
    case 'uint8':
      return new Uint8Array(buffer);
    case 'int16':
      return new Int16Array(buffer);
    case 'float32':
      return new Float32Array(buffer);
  }
}
```

### Stream Large Files

```typescript
async function processLargeFileInChunks(
  handle: FileSystemFileHandle,
  chunkSize: number = 64 * 1024,
  onChunk?: (chunk: Uint8Array, offset: number) => Promise<void>
): Promise<void> {
  const file = await handle.getFile();
  const reader = file.stream().getReader();

  let offset = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      if (onChunk) {
        await onChunk(value, offset);
      }

      offset += value.byteLength;
      console.log(`Processed ${offset} bytes`);
    }
  } finally {
    reader.releaseLock();
  }
}

// Usage: process 1MB CSV file
const csvHandle = await openTextFile();
await processLargeFileInChunks(
  csvHandle,
  1024 * 1024,
  async (chunk, offset) => {
    const text = new TextDecoder().decode(chunk);
    const lines = text.split('\n');
    // Process CSV lines
  }
);
```

## Writing Files

### Write with Truncate

```typescript
async function writeFileContent(
  handle: FileSystemFileHandle,
  content: string
): Promise<void> {
  const writable = await handle.createWritable();

  try {
    // Write data
    await writable.write(content);

    // Truncate to exact size (remove any existing content beyond write)
    await writable.truncate(content.length);
  } finally {
    await writable.close();
  }
}
```

### Append to File

```typescript
async function appendToFile(
  handle: FileSystemFileHandle,
  content: string
): Promise<void> {
  const writable = await handle.createWritable();

  try {
    // Seek to end
    const file = await handle.getFile();
    await writable.seek(file.size);

    // Append new content
    await writable.write(content);
  } finally {
    await writable.close();
  }
}
```

### Write at Specific Position

```typescript
async function insertAtPosition(
  handle: FileSystemFileHandle,
  position: number,
  content: string
): Promise<void> {
  const writable = await handle.createWritable();

  try {
    // Seek to position
    await writable.seek(position);

    // Write
    await writable.write(content);
  } finally {
    await writable.close();
  }
}
```

## Directory Operations

### List Directory Contents

```typescript
async function listDirectory(
  dirHandle: FileSystemDirectoryHandle,
  recursive: boolean = false
): Promise<Map<string, FileSystemHandle>> {
  const entries = new Map<string, FileSystemHandle>();

  async function traverse(
    dir: FileSystemDirectoryHandle,
    prefix: string = ''
  ): Promise<void> {
    for await (const [name, handle] of dir.entries()) {
      const fullPath = prefix ? `${prefix}/${name}` : name;

      entries.set(fullPath, handle);

      if (recursive && handle.kind === 'directory') {
        await traverse(
          handle as FileSystemDirectoryHandle,
          fullPath
        );
      }
    }
  }

  await traverse(dirHandle);
  return entries;
}

// Usage
const directory = await openDirectory();
const entries = await listDirectory(directory, true);
entries.forEach((handle, path) => {
  console.log(`${handle.kind}: ${path}`);
});
```

### Get or Create File in Directory

```typescript
async function ensureFileInDirectory(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string
): Promise<FileSystemFileHandle> {
  return dirHandle.getFileHandle(fileName, { create: true });
}

// Usage
const directory = await openDirectory();
const file = await ensureFileInDirectory(directory, 'data.json');
```

### Get or Create Subdirectory

```typescript
async function ensureSubdirectory(
  dirHandle: FileSystemDirectoryHandle,
  dirName: string
): Promise<FileSystemDirectoryHandle> {
  return dirHandle.getDirectoryHandle(dirName, { create: true });
}

// Usage
const nestedDir = await ensureSubdirectory(directory, 'nested/path');
```

### Remove Files/Directories

```typescript
async function removeEntry(
  dirHandle: FileSystemDirectoryHandle,
  name: string,
  recursive: boolean = false
): Promise<void> {
  await dirHandle.removeEntry(name, { recursive });
  console.log(`Removed: ${name}`);
}

// Remove file
await removeEntry(directory, 'file.txt');

// Remove directory (recursively)
await removeEntry(directory, 'folder', true);
```

## Permissions

### Check Permission

```typescript
async function checkPermission(
  handle: FileSystemHandle
): Promise<'granted' | 'denied' | 'prompt'> {
  return handle.queryPermission({ mode: 'read' });
}

// Usage
const file = await openTextFile();
const permission = await checkPermission(file);
console.log('Permission:', permission);
```

### Request Permission

```typescript
async function ensurePermission(
  handle: FileSystemHandle,
  mode: 'read' | 'readwrite' = 'read'
): Promise<boolean> {
  const permission = await handle.queryPermission({ mode });

  if (permission === 'granted') {
    return true;
  }

  const requested = await handle.requestPermission({ mode });
  return requested === 'granted';
}

// Usage
const file = await openTextFile();
if (await ensurePermission(file, 'readwrite')) {
  console.log('Write permission granted');
}
```

## Origin Private File System (OPFS)

OPFS provides sandboxed, high-performance storage that doesn't require user permission.

```typescript
async function getOPFSRoot(): Promise<FileSystemDirectoryHandle> {
  return navigator.storage.getDirectory();
}

// Usage
const opfsRoot = await getOPFSRoot();
console.log('OPFS root:', opfsRoot.name);
```

### OPFS File Operations

```typescript
async function createOPFSFile(fileName: string): Promise<FileSystemFileHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getFileHandle(fileName, { create: true });
}

async function writeToOPFS(fileName: string, content: string): Promise<void> {
  const root = await navigator.storage.getDirectory();
  const file = await root.getFileHandle(fileName, { create: true });

  const writable = await file.createWritable();
  await writable.write(content);
  await writable.close();

  console.log(`Written to OPFS: ${fileName}`);
}

async function readFromOPFS(fileName: string): Promise<string> {
  const root = await navigator.storage.getDirectory();
  const file = await root.getFileHandle(fileName);

  const fileObj = await file.getFile();
  return fileObj.text();
}

// Usage
await writeToOPFS('cache.json', JSON.stringify({ cached: true }));
const data = await readFromOPFS('cache.json');
console.log(JSON.parse(data));
```

### OPFS for IndexedDB Alternatives

```typescript
class OPFSDatabase {
  private root: FileSystemDirectoryHandle;

  static async create(): Promise<OPFSDatabase> {
    const db = new OPFSDatabase();
    db.root = await navigator.storage.getDirectory();
    return db;
  }

  async set(key: string, value: unknown): Promise<void> {
    const fileName = `data/${key}.json`;
    const [dir, file] = fileName.split('/');

    const dataDir = await this.root.getDirectoryHandle(dir, { create: true });
    const handle = await dataDir.getFileHandle(file, { create: true });

    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(value));
    await writable.close();
  }

  async get(key: string): Promise<unknown | null> {
    try {
      const fileName = `data/${key}.json`;
      const [dir, file] = fileName.split('/');

      const dataDir = await this.root.getDirectoryHandle(dir);
      const handle = await dataDir.getFileHandle(file);

      const fileObj = await handle.getFile();
      const content = await fileObj.text();

      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const fileName = `data/${key}.json`;
    const [dir, file] = fileName.split('/');

    const dataDir = await this.root.getDirectoryHandle(dir);
    await dataDir.removeEntry(file);
  }

  async clear(): Promise<void> {
    const dataDir = await this.root.getDirectoryHandle('data');
    await this.root.removeEntry('data', { recursive: true });
  }
}

// Usage
const db = await OPFSDatabase.create();
await db.set('user:1', { name: 'Alice', age: 30 });
const user = await db.get('user:1');
console.log(user);
```

## Advanced Patterns

### File Watcher

```typescript
async function watchDirectory(
  dirHandle: FileSystemDirectoryHandle,
  onChange: (entries: Map<string, FileSystemHandle>) => void
): Promise<void> {
  let lastState = await listDirectory(dirHandle);

  setInterval(async () => {
    const currentState = await listDirectory(dirHandle);

    // Compare states
    const changed = lastState.size !== currentState.size ||
      Array.from(lastState.entries()).some(
        ([key, value]) => currentState.get(key) !== value
      );

    if (changed) {
      onChange(currentState);
      lastState = currentState;
    }
  }, 1000);
}

// Usage
const directory = await openDirectory();
watchDirectory(directory, (entries) => {
  console.log('Directory changed:');
  entries.forEach((handle, path) => {
    console.log(`  ${handle.kind}: ${path}`);
  });
});
```

### Batch File Operations

```typescript
async function batchProcessFiles(
  dirHandle: FileSystemDirectoryHandle,
  processor: (file: File) => Promise<void>
): Promise<number> {
  let processed = 0;

  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'file') {
      const fileHandle = handle as FileSystemFileHandle;
      const file = await fileHandle.getFile();

      await processor(file);
      processed++;

      console.log(`Processed: ${name}`);
    }
  }

  console.log(`Batch complete: ${processed} files processed`);
  return processed;
}

// Usage
const directory = await openDirectory();
await batchProcessFiles(directory, async (file) => {
  if (file.type.startsWith('image/')) {
    // Process image
    const arrayBuffer = await file.arrayBuffer();
    // ... image processing logic
  }
});
```

## Error Handling

```typescript
async function safeFileOperation(): Promise<void> {
  try {
    const [handle] = await window.showOpenFilePicker();
    const file = await handle.getFile();
    const content = await file.text();
    console.log(content);
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'AbortError') {
        console.log('User cancelled file picker');
      } else if (error.name === 'NotAllowedError') {
        console.log('Permission denied');
      } else if (error.name === 'NotFoundError') {
        console.log('File not found');
      }
    }
    console.error('File operation failed:', error);
  }
}
```

## Browser Support

**Chromium 143+ baseline** — File System Access API is fully supported including OPFS for high-performance sandboxed storage.

## Related APIs

- **Storage Manager API** — Check storage quota before operations
- **Fetch API** — Download files with resume support
- **Blob API** — Binary data handling
- **Compression Streams** — Compress before saving
