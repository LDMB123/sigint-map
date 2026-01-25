---
title: Compression Streams API
category: Web APIs
tags: [compression, streaming, performance, chromium143+]
description: Stream-based compression and decompression with gzip, deflate formats
version: 1.0
browser_support: "Chromium 143+ baseline"
---

# Compression Streams API

Provides streaming compression and decompression using standard compression algorithms without requiring external libraries.

## When to Use

- **Large data compression** — Compress before IndexedDB storage
- **Network optimization** — Compress before fetch/POST
- **File compression** — Create ZIP-like exports
- **Stream processing** — Compress data as it streams
- **Cache optimization** — Compress cache entries
- **Real-time logging** — Compress log streams

## Core Concepts

```typescript
interface CompressionStream extends TransformStream {
  constructor(format: CompressionFormat);
}

interface DecompressionStream extends TransformStream {
  constructor(format: CompressionFormat);
}

type CompressionFormat = 'gzip' | 'deflate' | 'deflate-raw';
```

## Basic Compression

### Compress Text to Gzip

```typescript
async function compressText(text: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  writer.write(data);
  await writer.close();

  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // Combine chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

// Usage
const originalText = 'Hello, World! '.repeat(1000);
const compressed = await compressText(originalText);
console.log(`Original: ${originalText.length} bytes`);
console.log(`Compressed: ${compressed.length} bytes`);
console.log(`Ratio: ${(compressed.length / originalText.length * 100).toFixed(2)}%`);
```

### Decompress Gzip

```typescript
async function decompressGzip(compressed: Uint8Array): Promise<string> {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  writer.write(compressed);
  await writer.close();

  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  const decoder = new TextDecoder();
  return decoder.decode(result);
}

// Usage
const text = await decompressGzip(compressed);
console.log('Decompressed:', text.substring(0, 50) + '...');
```

## Compression Formats

### Gzip (Most Compatible)

```typescript
async function compressWithGzip(data: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  writer.write(data);
  await writer.close();

  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // Combine and return
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

// Gzip: Good compression, standard format, larger files
// Use for: Network transfer, file downloads, archives
```

### Deflate (Faster)

```typescript
async function compressWithDeflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream('deflate');
  // ... same implementation as gzip
}

// Deflate: Faster than gzip but less common
// Use for: Real-time compression, less critical data
```

### Deflate-raw (Smallest Overhead)

```typescript
async function compressWithDeflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream('deflate-raw');
  // ... same implementation as gzip
}

// Deflate-raw: Smallest header overhead
// Use for: Custom containers, embedded compression
```

## Streaming Patterns

### Stream Compression

```typescript
async function compressStream(
  readableStream: ReadableStream<Uint8Array>,
  format: 'gzip' | 'deflate' = 'gzip'
): Promise<ReadableStream<Uint8Array>> {
  const compressionStream = new CompressionStream(format);
  return readableStream.pipeThrough(compressionStream);
}

// Usage: Compress fetch response
const response = await fetch('large-file.json');
const compressed = await compressStream(
  response.body as ReadableStream<Uint8Array>
);

// Read compressed chunks as they arrive
const reader = compressed.getReader();
const chunks: Uint8Array[] = [];

try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    console.log(`Received ${value.length} bytes of compressed data`);
  }
} finally {
  reader.releaseLock();
}
```

### Stream Decompression

```typescript
async function decompressStream(
  readableStream: ReadableStream<Uint8Array>,
  format: 'gzip' | 'deflate' = 'gzip'
): Promise<ReadableStream<Uint8Array>> {
  const decompressionStream = new DecompressionStream(format);
  return readableStream.pipeThrough(decompressionStream);
}

// Usage: Decompress stored compressed data
const compressed = getCompressedDataFromIndexedDB();
const decompressed = await decompressStream(
  Uint8Array.from(compressed)
);
```

### Pipeline Compression and Upload

```typescript
async function uploadWithCompression(
  file: File,
  uploadUrl: string
): Promise<Response> {
  const reader = file.stream().pipeThrough(
    new TransformStream({
      async transform(chunk: Uint8Array, controller) {
        // Optional: Transform chunk (normalize, validate)
        controller.enqueue(chunk);
      }
    })
  ).pipeThrough(new CompressionStream('gzip'));

  return fetch(uploadUrl, {
    method: 'POST',
    body: reader,
    headers: {
      'Content-Encoding': 'gzip',
      'Content-Type': file.type
    }
  });
}

// Usage
const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
if (fileInput?.files?.[0]) {
  const response = await uploadWithCompression(
    fileInput.files[0],
    '/api/upload'
  );
  console.log('Upload complete');
}
```

## Practical Patterns

### Compress for IndexedDB Storage

```typescript
class CompressedStore {
  private db: IDBDatabase;

  constructor(db: IDBDatabase) {
    this.db = db;
  }

  async set(key: string, value: unknown): Promise<void> {
    // Serialize
    const serialized = JSON.stringify(value);
    const encoded = new TextEncoder().encode(serialized);

    // Compress
    const compressed = await this.compress(encoded);

    // Store
    const tx = this.db.transaction('compressed-store', 'readwrite');
    const store = tx.objectStore('compressed-store');

    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        key,
        data: compressed,
        timestamp: Date.now(),
        originalSize: encoded.length,
        compressedSize: compressed.length
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get(key: string): Promise<unknown | null> {
    const tx = this.db.transaction('compressed-store', 'readonly');
    const store = tx.objectStore('compressed-store');

    return new Promise((resolve, reject) => {
      const request = store.get(key);

      request.onsuccess = async () => {
        const item = request.result;
        if (!item) {
          resolve(null);
          return;
        }

        try {
          // Decompress
          const decompressed = await this.decompress(item.data);

          // Deserialize
          const decoded = new TextDecoder().decode(decompressed);
          const parsed = JSON.parse(decoded);

          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async compress(data: Uint8Array): Promise<Uint8Array> {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    writer.write(data);
    await writer.close();

    const chunks: Uint8Array[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  private async decompress(data: Uint8Array): Promise<Uint8Array> {
    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    writer.write(data);
    await writer.close();

    const chunks: Uint8Array[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  getStats(key: string): Promise<{
    originalSize: number;
    compressedSize: number;
    ratio: number;
  } | null> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('compressed-store', 'readonly');
      const store = tx.objectStore('compressed-store');
      const request = store.get(key);

      request.onsuccess = () => {
        const item = request.result;
        if (!item) {
          resolve(null);
          return;
        }

        resolve({
          originalSize: item.originalSize,
          compressedSize: item.compressedSize,
          ratio: item.compressedSize / item.originalSize
        });
      };

      request.onerror = () => reject(request.error);
    });
  }
}

// Usage
const db = await new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('compressed-db');
  request.onupgradeneeded = () => {
    request.result.createObjectStore('compressed-store', { keyPath: 'key' });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const store = new CompressedStore(db);

// Store compressed data
await store.set('large-object', { data: 'x'.repeat(100000) });

// Retrieve and decompress
const retrieved = await store.get('large-object');
console.log(retrieved);

// Check compression ratio
const stats = await store.getStats('large-object');
console.log('Compression stats:', stats);
```

### Compare Compression Formats

```typescript
async function compareCompressionFormats(data: Uint8Array): Promise<void> {
  console.log(`Original size: ${data.length} bytes`);

  // Test gzip
  const gzipStream = new CompressionStream('gzip');
  const gzipWriter = gzipStream.writable.getWriter();
  gzipWriter.write(data);
  await gzipWriter.close();

  let gzipSize = 0;
  const gzipReader = gzipStream.readable.getReader();
  try {
    while (true) {
      const { done, value } = await gzipReader.read();
      if (done) break;
      gzipSize += value.length;
    }
  } finally {
    gzipReader.releaseLock();
  }

  // Test deflate
  const deflateStream = new CompressionStream('deflate');
  const deflateWriter = deflateStream.writable.getWriter();
  deflateWriter.write(data);
  await deflateWriter.close();

  let deflateSize = 0;
  const deflateReader = deflateStream.readable.getReader();
  try {
    while (true) {
      const { done, value } = await deflateReader.read();
      if (done) break;
      deflateSize += value.length;
    }
  } finally {
    deflateReader.releaseLock();
  }

  // Test deflate-raw
  const rawStream = new CompressionStream('deflate-raw');
  const rawWriter = rawStream.writable.getWriter();
  rawWriter.write(data);
  await rawWriter.close();

  let rawSize = 0;
  const rawReader = rawStream.readable.getReader();
  try {
    while (true) {
      const { done, value } = await rawReader.read();
      if (done) break;
      rawSize += value.length;
    }
  } finally {
    rawReader.releaseLock();
  }

  console.log('Compression results:');
  console.log(`  Gzip: ${gzipSize} bytes (${(gzipSize/data.length*100).toFixed(2)}%)`);
  console.log(`  Deflate: ${deflateSize} bytes (${(deflateSize/data.length*100).toFixed(2)}%)`);
  console.log(`  Deflate-raw: ${rawSize} bytes (${(rawSize/data.length*100).toFixed(2)}%)`);
}

// Usage
const largeData = new Uint8Array(10000000); // 10MB of data
for (let i = 0; i < largeData.length; i++) {
  largeData[i] = Math.floor(Math.random() * 256);
}

await compareCompressionFormats(largeData);
```

## Performance Monitoring

```typescript
class CompressionMetrics {
  static async measureCompression(
    data: Uint8Array,
    format: 'gzip' | 'deflate' = 'gzip'
  ): Promise<{
    originalSize: number;
    compressedSize: number;
    ratio: number;
    duration: number;
  }> {
    const start = performance.now();

    const stream = new CompressionStream(format);
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    writer.write(data);
    await writer.close();

    let compressedSize = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        compressedSize += value.length;
      }
    } finally {
      reader.releaseLock();
    }

    const duration = performance.now() - start;

    return {
      originalSize: data.length,
      compressedSize,
      ratio: compressedSize / data.length,
      duration
    };
  }
}

// Usage
const testData = new Uint8Array(1000000); // 1MB
const metrics = await CompressionMetrics.measureCompression(testData, 'gzip');
console.log('Compression metrics:', metrics);
```

## Browser Support

**Chromium 143+ baseline** — Compression Streams API is fully supported with gzip, deflate, and deflate-raw formats.

## Related APIs

- **Fetch API** — Upload compressed data
- **File System Access API** — Save compressed files
- **Web Workers** — Offload compression to background thread
- **ReadableStream** — Stream processing
