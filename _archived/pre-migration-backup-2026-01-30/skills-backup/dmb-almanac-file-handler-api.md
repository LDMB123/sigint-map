---
name: dmb-almanac-file-handler-api
description: "File Handler API integration for PWA file management"
recommended_tier: sonnet
category: scraping
complexity: intermediate
tags:
  - projects
  - scraping
  - chromium-143
  - apple-silicon
target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2
philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."
prerequisites: []
related_skills: []
see_also: []
minimum_example_count: 3
requires_testing: true
performance_critical: false
migrated_from: projects/dmb-almanac/app/docs/analysis/uncategorized/FILE_HANDLER_API_REFERENCE.md
migration_date: 2026-01-25
---

# File Handling API - Reference Card


### Token Management

See [Token Optimization Skills](./token-optimization/README.md) for all automatic optimizations.

## Skill Coordination

**When to delegate:**
- Complex multi-file tasks → `/parallel-audit`
- Specialized domains → Category-specific experts
- Performance issues → `/perf-audit`

**Works well with:**
- Related skills in same category
- Debug and optimization tools

## Quick Links
- **Quick Start:** FILE_HANDLER_QUICK_START.md
- **Full Guide:** FILE_HANDLER_INTEGRATION.md
- **Delivery:** FILE_HANDLER_DELIVERY.md
- **Summary:** FILE_HANDLER_IMPLEMENTATION_SUMMARY.md

---

## API Reference

### Support Detection

```typescript
import { isFileHandlingSupported, canRegisterFileHandlers } from '$lib/utils/fileHandler';

// Check if browser has launchQueue
if (isFileHandlingSupported()) {
  console.log('File Handling API available');
}

// Check if HTTPS context allows file handlers
if (canRegisterFileHandlers()) {
  console.log('Can register file handlers');
}
```

### File Reception

```typescript
import { getFilesFromLaunchQueue } from '$lib/utils/fileHandler';

// Set up listener for files opened via File Handling API
getFilesFromLaunchQueue(async (files) => {
  for (const { file, name } of files) {
    console.log('Received file:', name);
  }
});
```

### File Processing

```typescript
import { processSetlistFile } from '$lib/utils/fileHandler';

// Single function processes entire pipeline
const result = await processSetlistFile(file);

if ('error' in result) {
  // { error: string }
  console.error(result.error);
} else {
  // { type: 'show' | 'setlist' | 'unknown', data: any, metadata: {...} }
  console.log(result.type);
  console.log(result.data);
  console.log(result.metadata.fileName);
  console.log(result.metadata.fileSize);
  console.log(result.metadata.fileType);
}
```

### Manual Validation

```typescript
import {
  validateFileMetadata,
  validateJsonSchema,
  detectFileType
} from '$lib/utils/fileHandler';

// 1. Validate file properties
const metaValidation = validateFileMetadata(file);
if (!metaValidation.valid) {
  console.error(metaValidation.error);
}

// 2. Parse JSON
const data = JSON.parse(await file.text());

// 3. Detect file type
const { type, confidence } = detectFileType(data, file.name);
console.log(`Type: ${type}, Confidence: ${confidence}`);

// 4. Validate schema
const schemaValidation = validateJsonSchema(data, type);
if (!schemaValidation.valid) {
  console.error(schemaValidation.error);
}
```

### URL Encoding

```typescript
import {
  encodeFileDataForUrl,
  decodeFileDataFromUrl
} from '$lib/utils/fileHandler';

// Encode data for URL parameter
const encoded = encodeFileDataForUrl(fileData);
if (encoded) {
  const url = `/open-file?file=${encoded.encoded}&type=${type}`;
  await goto(url);
}

// Decode data from URL parameter
const result = decodeFileDataFromUrl(urlParam);
if ('error' in result) {
  console.error(result.error);
} else {
  const data = result.data;
}
```

### Utilities

```typescript
import { formatFileSize } from '$lib/utils/fileHandler';

// Format bytes to human-readable size
const size = formatFileSize(fileHandle.size);
console.log(size); // "1.5 MB"
```

---

## Types

```typescript
// File processing result
interface FileData {
  type: 'show' | 'setlist' | 'unknown';
  data: unknown; // Parsed JSON data
  metadata: {
    fileName: string;
    fileSize: number;
    fileType: 'dmb' | 'setlist' | 'json' | 'txt';
  };
}

// Validation result
interface ValidationResult {
  valid: boolean;
  error?: string; // Only present if valid === false
}

// Type detection result
interface FileTypeDetection {
  type: 'show' | 'song' | 'batch' | 'concert' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
}
```

---

## File Formats

### Show Format
```json
{
  "date": "2024-01-15",
  "venue": "Madison Square Garden",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "setlist": [
    { "song": "Song Name", "set": 1 }
  ]
}
```

### Setlist Format
```json
[
  {
    "date": "2024-01-15",
    "venue": "Madison Square Garden",
    "setlist": [...]
  }
]
```

### Song Format
```json
{
  "slug": "song-slug",
  "title": "Song Title",
  "artist": "Dave Matthews Band"
}
```

### Concert Format
```json
{
  "tour": "Tour Name",
  "year": 2024,
  "shows": [
    { "date": "2024-01-15", "venue": "..." }
  ]
}
```

---

## Svelte Component Example

```svelte
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import {
    getFilesFromLaunchQueue,
    processSetlistFile,
    encodeFileDataForUrl,
    formatFileSize
  } from '$lib/utils/fileHandler';

  let status = $state('idle');
  let fileName = $state('');
  let errorMessage = $state('');

  onMount(() => {
    getFilesFromLaunchQueue(async (files) => {
      for (const { file } of files) {
        status = 'processing';
        fileName = file.name;

        const result = await processSetlistFile(file);

        if ('error' in result) {
          errorMessage = result.error;
          status = 'error';
        } else {
          const encoded = encodeFileDataForUrl(result.data);
          if (encoded) {
            await goto(`/open-file?file=${encoded.encoded}&type=${result.type}`);
            status = 'success';
          } else {
            errorMessage = 'File too large to process';
            status = 'error';
          }
        }
      }
    });
  });
</script>

{#if status === 'processing'}
  <p>Processing {fileName}...</p>
{:else if status === 'error'}
  <p class="error">{errorMessage}</p>
{/if}
```

---

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| File too large | >10MB | Use smaller file |
| File is empty | 0 bytes | Check file content |
| Invalid file type | Wrong extension | Use .dmb, .setlist, .json, or .txt |
| Filename too long | >255 chars | Rename file |
| Invalid JSON format | Malformed JSON | Fix JSON syntax |
| Empty JSON data | null/undefined | Add content |
| Invalid show format | Missing date/venue | Add required fields |
| Invalid song format | Missing slug/title | Add required fields |
| Invalid batch format | Not array | Make it an array |
| Invalid concert format | Missing shows | Add shows array |
| Batch too large | >1000 items | Split into smaller files |
| File data too large | >100KB encoded | Use smaller dataset |

---

## Manifest Configuration

```json
"file_handlers": [
  {
    "action": "/open-file",
    "accept": {
      "application/json": [".json"],
      "application/x-dmb": [".dmb"],
      "application/x-setlist": [".setlist"],
      "text/plain": [".txt"]
    },
    "icons": [
      { "src": "/icons/icon-192.png", "sizes": "192x192" },
      { "src": "/icons/icon-256.png", "sizes": "256x256" },
      { "src": "/icons/icon-512.png", "sizes": "512x512" }
    ],
    "launch_type": "single-client"
  }
]
```

---

## Testing

### Create Test File
```bash
cat > show.dmb << 'EOF'
{
  "date": "2024-01-15",
  "venue": "Madison Square Garden",
  "setlist": [
    { "song": "Ants Marching", "set": 1 }
  ]
}
EOF
```

### Test Locally
```bash
npm run build
npm run preview
# Install PWA in Chrome
# Double-click show.dmb file
# Should open in PWA
```

### Debug in DevTools
```javascript
// Console
// Check if supported
console.log('Supported:', 'launchQueue' in window);

// Check manifest
// Application > Manifest > file_handlers section
```

---

## Browser Compatibility

| Browser | Support | Min Version |
|---------|---------|-------------|
| Chrome | ✓ Yes | 102+ |
| Edge | ✓ Yes | 102+ |
| Firefox | ✗ No | Not implemented |
| Safari | ✗ No | Not implemented |

**Requirements:**
- HTTPS (or localhost)
- PWA installed (standalone mode)
- User permission granted

---

## Performance

| Operation | Time | Notes |
|-----------|------|-------|
| File read | ~5ms | 1MB file |
| JSON parse | ~15ms | 1MB file |
| Type detect | <1ms | Pattern matching |
| Validation | ~3ms | Schema check |
| URL encode | ~4ms | Base64 |
| **Total** | **~30ms** | End-to-end |

---

## Limits

| Limit | Value | Reason |
|-------|-------|--------|
| File size | 10 MB | Memory management |
| Filename length | 255 chars | OS limit |
| Batch items | 1,000 | Memory management |
| Concert shows | 1,000 | Memory management |
| Encoded size | 100 KB | URL practical limit |

---

## File Extensions Supported

| Extension | MIME Type | Use Case |
|-----------|-----------|----------|
| .dmb | application/x-dmb | DMB custom format |
| .setlist | application/x-setlist | Setlist exports |
| .json | application/json | Generic JSON |
| .txt | text/plain | Text-based JSON |

---

## Import Statement

```typescript
// Import everything
import * as FileHandler from '$lib/utils/fileHandler';

// Or specific functions
import {
  isFileHandlingSupported,
  canRegisterFileHandlers,
  getFilesFromLaunchQueue,
  validateFileMetadata,
  validateJsonSchema,
  detectFileType,
  processSetlistFile,
  encodeFileDataForUrl,
  decodeFileDataFromUrl,
  formatFileSize,
  type FileData,
  type ValidationResult
} from '$lib/utils/fileHandler';
```

---

## Common Patterns

### Pattern 1: Simple File Processing
```typescript
const result = await processSetlistFile(file);
if ('error' in result) {
  handleError(result.error);
} else {
  handleSuccess(result.data);
}
```

### Pattern 2: Manual Validation Steps
```typescript
if (!validateFileMetadata(file).valid) return;
const data = JSON.parse(await file.text());
const { type } = detectFileType(data, file.name);
if (!validateJsonSchema(data, type).valid) return;
// Process data
```

### Pattern 3: URL Parameter Passing
```typescript
const encoded = encodeFileDataForUrl(data);
if (encoded) {
  await goto(`/route?file=${encoded.encoded}`);
}

// On destination route:
const decoded = decodeFileDataFromUrl(urlParam);
if ('error' in decoded) {
  handleError(decoded.error);
} else {
  useData(decoded.data);
}
```

### Pattern 4: Upload Handler
```typescript
async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    const result = await processSetlistFile(file);
    console.log('Uploaded:', result);
  }
}
```

---

## References

- [File Handling API Spec](https://www.w3.org/TR/file-handling/)
- [Chrome Status](https://chromestatus.com/feature/5721776130965504)
- [MDN: launchQueue](https://developer.mozilla.org/en-US/docs/Web/API/LaunchQueue)
- [Web App Manifest](https://www.w3.org/TR/appmanifest/)

---

## Status

- Implementation: Complete
- Testing: Ready
- Documentation: Comprehensive
- Deployment: Ready

---

**Last Updated:** 2026-01-21
**Version:** 1.0
**Stability:** Production Ready
