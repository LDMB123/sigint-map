---
title: Storage Manager API
category: Web APIs
tags: [storage, quota, persistence, chromium143+]
description: Manage storage quotas, persistence, and storage buckets
version: 1.0
browser_support: "Chromium 143+ baseline"
---

# Storage Manager API

Provides access to browser storage quotas, persistent storage requests, and storage buckets for organizing data with separate quotas and policies.

## When to Use

- **Check storage quota** — Know how much space available before downloading
- **Request persistent storage** — Prevent browser from clearing data
- **Storage buckets** — Organize data with different retention policies
- **Download large files** — Calculate available space before caching
- **Quota exceeded handling** — Gracefully handle storage limits
- **Multi-purpose storage** — Separate cache, user data, analytics storage

## Core Concepts

```typescript
interface StorageManager {
  estimate(): Promise<StorageEstimate>;
  persist(): Promise<boolean>;
  persisted(): Promise<boolean>;

  getDirectory(): Promise<FileSystemDirectoryHandle>;
}

interface StorageEstimate {
  usage: number;      // Bytes currently used
  quota: number;      // Bytes available to site
}
```

## Basic Usage

### Check Storage Quota

```typescript
async function checkStorageQuota(): Promise<void> {
  const estimate = await navigator.storage.estimate();

  const percentUsed = (estimate.usage / estimate.quota) * 100;

  console.log(`Storage usage: ${estimate.usage} bytes`);
  console.log(`Storage quota: ${estimate.quota} bytes`);
  console.log(`Percentage used: ${percentUsed.toFixed(2)}%`);
}

// Run periodically to monitor
setInterval(checkStorageQuota, 60000);
```

### Request Persistent Storage

```typescript
async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage) {
    console.log('Storage API not available');
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persisted();

    if (isPersisted) {
      console.log('Storage is already persistent');
      return true;
    }

    const granted = await navigator.storage.persist();

    if (granted) {
      console.log('Persistent storage granted');
      return true;
    } else {
      console.log('Persistent storage denied');
      return false;
    }
  } catch (error) {
    console.error('Failed to request persistent storage:', error);
    return false;
  }
}

// Call early on app startup
await requestPersistence();
```

### Monitor Storage Changes

```typescript
async function monitorStorageQuota(): Promise<void> {
  let lastUsage = 0;

  async function checkAndNotify(): Promise<void> {
    const estimate = await navigator.storage.estimate();

    if (estimate.usage !== lastUsage) {
      const delta = estimate.usage - lastUsage;
      console.log(`Storage changed by ${delta} bytes`);

      const percentUsed = (estimate.usage / estimate.quota) * 100;

      if (percentUsed > 90) {
        console.warn('Storage is nearly full (>90%)');
        await handleStorageWarning();
      }

      lastUsage = estimate.usage;
    }
  }

  // Check every 5 seconds
  setInterval(checkAndNotify, 5000);
}

async function handleStorageWarning(): Promise<void> {
  console.log('Clearing old cache entries');
  // Implement cache eviction strategy
}
```

## Storage Buckets (Chrome 122+)

Storage buckets allow organizing data with separate quotas and retention policies.

```typescript
interface StorageBucket {
  name: string;
  durability: 'strict' | 'relaxed';
  persisted: boolean;
  estimate(): Promise<StorageEstimate>;
  persist(): Promise<boolean>;
  getDirectory(): Promise<FileSystemDirectoryHandle>;
}

interface StorageBucketOptions {
  durability?: 'strict' | 'relaxed';
  persisted?: boolean;
  quota?: number;
}
```

### Create and Use Buckets

```typescript
async function createStorageBuckets(): Promise<void> {
  // Cache bucket - can be cleared by browser
  const cacheBucket = await navigator.storage.bucket('app-cache', {
    durability: 'relaxed',
    persisted: false
  });

  // User data bucket - persistent across sessions
  const userBucket = await navigator.storage.bucket('user-data', {
    durability: 'strict',
    persisted: true
  });

  // Analytics bucket - separate quota for non-critical data
  const analyticsBucket = await navigator.storage.bucket('analytics', {
    durability: 'relaxed',
    persisted: false
  });

  console.log('Storage buckets created');
}

// Buckets allow organizing data with different lifetime policies
// Cache can be cleared by browser when storage is low
// User data persists unless user explicitly clears site data
```

### Bucket-Specific Quota

```typescript
async function manageBucketQuotas(): Promise<void> {
  // Get cache bucket
  const cacheBucket = await navigator.storage.bucket('app-cache');

  // Check cache-specific quota
  const cacheEstimate = await cacheBucket.estimate();
  console.log('Cache usage:', cacheEstimate.usage);
  console.log('Cache quota:', cacheEstimate.quota);

  // Each bucket has its own quota
  if (cacheEstimate.usage > cacheEstimate.quota * 0.8) {
    console.log('Cache bucket nearly full');
    await evictOldCacheEntries(cacheBucket);
  }
}

async function evictOldCacheEntries(bucket: StorageBucket): Promise<void> {
  const directory = await bucket.getDirectory();

  // List files in bucket
  for await (const [name, handle] of directory) {
    if (handle.kind === 'file') {
      const file = await handle.getFile();
      const modified = new Date(file.lastModified);
      const age = Date.now() - modified.getTime();

      // Remove files older than 7 days
      if (age > 7 * 24 * 60 * 60 * 1000) {
        await directory.removeEntry(name);
        console.log(`Removed old cache entry: ${name}`);
      }
    }
  }
}
```

## Advanced Patterns

### Before Large Download

```typescript
async function downloadLargeFile(
  url: string,
  fileName: string,
  sizeBytes: number
): Promise<void> {
  // Check available space
  const estimate = await navigator.storage.estimate();
  const availableSpace = estimate.quota - estimate.usage;

  if (availableSpace < sizeBytes) {
    throw new Error(
      `Insufficient storage. Need ${sizeBytes} bytes, ` +
      `have ${availableSpace} bytes available`
    );
  }

  console.log(`Downloading ${fileName} (${sizeBytes} bytes)`);

  // Safe to download
  const response = await fetch(url);
  const blob = await response.blob();

  // Save to storage
  const handle = await window.showSaveFilePicker({
    suggestedName: fileName
  });

  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();

  console.log('Download complete');
}

// Usage
await downloadLargeFile(
  'https://example.com/large-file.bin',
  'large-file.bin',
  500 * 1024 * 1024 // 500MB
);
```

### Storage Warning System

```typescript
class StorageWarningSystem {
  private thresholds = {
    warning: 0.75,    // 75% full
    critical: 0.90,   // 90% full
    emergency: 0.95   // 95% full
  };

  private listeners: Map<string, Set<() => void>> = new Map();

  constructor() {
    this.setupMonitoring();
  }

  private async setupMonitoring(): Promise<void> {
    setInterval(async () => {
      await this.checkAndNotify();
    }, 30000); // Check every 30 seconds
  }

  private async checkAndNotify(): Promise<void> {
    const estimate = await navigator.storage.estimate();
    const percentUsed = estimate.usage / estimate.quota;

    if (percentUsed >= this.thresholds.emergency) {
      this.emit('emergency', percentUsed);
      console.error('Storage emergency: >95% full');
    } else if (percentUsed >= this.thresholds.critical) {
      this.emit('critical', percentUsed);
      console.warn('Storage critical: >90% full');
    } else if (percentUsed >= this.thresholds.warning) {
      this.emit('warning', percentUsed);
      console.warn('Storage warning: >75% full');
    }
  }

  private emit(level: string, percentUsed: number): void {
    const listeners = this.listeners.get(level);
    if (listeners) {
      listeners.forEach(listener => listener());
    }
  }

  on(level: string, callback: () => void): void {
    if (!this.listeners.has(level)) {
      this.listeners.set(level, new Set());
    }
    this.listeners.get(level)!.add(callback);
  }

  off(level: string, callback: () => void): void {
    this.listeners.get(level)?.delete(callback);
  }
}

const storageWarning = new StorageWarningSystem();

storageWarning.on('warning', () => {
  console.log('Show storage warning to user');
});

storageWarning.on('critical', () => {
  console.log('Show storage critical dialog and start cleanup');
});

storageWarning.on('emergency', () => {
  console.log('Clear all caches immediately');
});
```

### Intelligent Cache Eviction

```typescript
class IntelligentCacheEviction {
  async evictLRU(bucketName: string, targetBytes: number): Promise<void> {
    const bucket = await navigator.storage.bucket(bucketName);
    const directory = await bucket.getDirectory();

    // Collect all files with metadata
    const files: Array<{
      name: string;
      handle: FileSystemFileHandle;
      accessed: number;
      size: number;
    }> = [];

    for await (const [name, handle] of directory) {
      if (handle.kind === 'file') {
        const file = await handle.getFile();
        files.push({
          name,
          handle: handle as FileSystemFileHandle,
          accessed: file.lastModified,
          size: file.size
        });
      }
    }

    // Sort by access time (least recently used first)
    files.sort((a, b) => a.accessed - b.accessed);

    let freedSpace = 0;

    for (const file of files) {
      if (freedSpace >= targetBytes) break;

      await directory.removeEntry(file.name);
      freedSpace += file.size;

      console.log(`Evicted ${file.name} (freed ${file.size} bytes)`);
    }

    console.log(`Eviction complete. Freed ${freedSpace} bytes`);
  }

  async evictLFU(bucketName: string, targetBytes: number): Promise<void> {
    // Similar to LRU but track access count instead of time
    const bucket = await navigator.storage.bucket(bucketName);
    const directory = await bucket.getDirectory();
    const accessCounts = new Map<string, number>();

    // In real implementation, store access counts in IndexedDB
    // For now, evict by size (largest first)
    const files: Array<{
      name: string;
      handle: FileSystemFileHandle;
      size: number;
    }> = [];

    for await (const [name, handle] of directory) {
      if (handle.kind === 'file') {
        const file = await handle.getFile();
        files.push({
          name,
          handle: handle as FileSystemFileHandle,
          size: file.size
        });
      }
    }

    files.sort((a, b) => b.size - a.size); // Largest first

    let freedSpace = 0;

    for (const file of files) {
      if (freedSpace >= targetBytes) break;

      await directory.removeEntry(file.name);
      freedSpace += file.size;
    }
  }
}

const eviction = new IntelligentCacheEviction();

// When storage is critical
const estimate = await navigator.storage.estimate();
const targetFree = estimate.quota * 0.25; // Free 25% of quota
const needToFree = estimate.usage - targetFree;

if (needToFree > 0) {
  await eviction.evictLRU('app-cache', needToFree);
}
```

### Persistent Storage with Fallback

```typescript
class PersistentStorageManager {
  async ensurePersistence(): Promise<boolean> {
    try {
      // First, check if already persistent
      const isPersisted = await navigator.storage.persisted();
      if (isPersisted) {
        console.log('Already persistent');
        return true;
      }

      // Try to request persistence
      const granted = await navigator.storage.persist();

      if (granted) {
        console.log('Persistence granted');
        return true;
      }

      // Permission denied - not persistent but data survives
      console.log('Persistence denied - using relaxed bucket');
      return false;
    } catch (error) {
      console.error('Persistence check failed:', error);
      return false;
    }
  }

  async getOptimalBucket(name: string): Promise<StorageBucket> {
    const isPersistent = await this.ensurePersistence();

    return navigator.storage.bucket(name, {
      durability: isPersistent ? 'strict' : 'relaxed',
      persisted: isPersistent
    });
  }
}

const persistentStorage = new PersistentStorageManager();

// Use appropriate bucket based on persistence capability
const bucket = await persistentStorage.getOptimalBucket('app-data');
```

## Error Handling

```typescript
async function safeStorageOperation(): Promise<void> {
  try {
    const estimate = await navigator.storage.estimate();
    console.log('Storage quota:', estimate.quota);
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        console.log('Storage API denied (no permissions)');
      } else if (error.name === 'QuotaExceededError') {
        console.log('Storage quota exceeded');
      }
    }
  }

  try {
    const isPersistent = await navigator.storage.persisted();
    console.log('Persistent storage:', isPersistent);
  } catch (error) {
    console.log('Persistence check not available');
  }
}
```

## Quota Estimates by Storage Type

```typescript
async function estimateByType(): Promise<void> {
  const estimate = await navigator.storage.estimate();

  // Quota breakdown (estimated)
  console.log('Total quota:', estimate.quota);
  console.log('Current usage:', estimate.usage);

  // Approximate breakdown by storage:
  // - IndexedDB: ~50MB per origin (default)
  // - Cache API: ~50MB per origin (default)
  // - localStorage: ~5-10MB per origin
  // - SessionStorage: ~5-10MB per origin

  // Total varies by browser and device storage
  // On mobile: typically 10-50MB
  // On desktop: typically 50-500MB

  const available = estimate.quota - estimate.usage;
  console.log('Available space:', available);
}
```

## Browser Support

**Chromium 143+ baseline** — Storage Manager API is fully supported. Storage Buckets API (Chrome 122+) provides advanced quota management.

## Related APIs

- **File System Access API** — Get directory handles for bucket access
- **IndexedDB** — Structured data storage
- **Cache API** — Response caching for service workers
- **LocalStorage** — Synchronous key-value storage (limited quota)
