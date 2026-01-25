# PWA File Handlers API

## When to Use
Use the File Handlers API when you need your Progressive Web App to:
- Open specific file types directly from the operating system
- Register as the default handler for custom file extensions
- Handle files via double-click, right-click "Open With", or drag-and-drop
- Create a native-like file opening experience in a PWA

## Prerequisites
- Chrome 102+ or Edge 102+ (not supported in Firefox/Safari)
- HTTPS context (or localhost for development)
- PWA must be installed as standalone app
- User permission to associate file types

## Manifest Configuration

Add file_handlers to your manifest.json:

```json
{
  "file_handlers": [
    {
      "action": "/open-file",
      "accept": {
        "application/json": [".json"],
        "application/x-custom": [".custom"],
        "text/plain": [".txt"]
      },
      "icons": [
        {
          "src": "/icons/icon-192.png",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "/icons/icon-512.png",
          "sizes": "512x512",
          "type": "image/png"
        }
      ],
      "launch_type": "single-client"
    }
  ]
}
```

### Configuration Properties

**action** (required)
- Route to handle file opens (e.g., "/open-file")
- Must be within PWA scope
- Can include query parameters

**accept** (required)
- Object mapping MIME types to file extensions
- Extensions must include leading dot (e.g., ".json")
- Can use wildcards (e.g., "image/*")

**icons** (optional)
- Array of icon objects for file picker UI
- Should include multiple sizes (192x192, 256x256, 512x512)
- Uses PNG format typically

**launch_type** (optional)
- "single-client": Reuse existing app window (default)
- "multiple-clients": Open new window for each file

## LaunchQueue API

The launchQueue API receives files when your PWA is launched:

```typescript
// Browser support detection
function isFileHandlingSupported(): boolean {
  return 'launchQueue' in window;
}

// Set up file receiver
if ('launchQueue' in window) {
  window.launchQueue.setConsumer(async (launchParams) => {
    if (!launchParams.files.length) {
      return; // No files to handle
    }

    for (const fileHandle of launchParams.files) {
      // fileHandle is a FileSystemFileHandle
      const file = await fileHandle.getFile();
      await processFile(file, fileHandle);
    }
  });
}
```

## File Processing Pipeline

### 1. Receive Files from LaunchQueue

```typescript
function getFilesFromLaunchQueue(
  callback: (files: Array<{ file: File; name: string }>) => void
): void {
  if (!('launchQueue' in window)) {
    console.warn('File Handling API not supported');
    return;
  }

  window.launchQueue.setConsumer(async (launchParams) => {
    const files: Array<{ file: File; name: string }> = [];

    for (const handle of launchParams.files) {
      const file = await handle.getFile();
      files.push({ file, name: file.name });
    }

    if (files.length > 0) {
      callback(files);
    }
  });
}
```

### 2. Validate File Metadata

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
}

function validateFileMetadata(file: File): ValidationResult {
  // Check file size (10MB limit)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File too large (max 10MB)' };
  }

  // Check if empty
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  // Check filename length
  if (file.name.length > 255) {
    return { valid: false, error: 'Filename too long (max 255 chars)' };
  }

  // Check file extension
  const validExtensions = ['.json', '.dmb', '.setlist', '.txt'];
  const hasValidExt = validExtensions.some(ext =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!hasValidExt) {
    return {
      valid: false,
      error: `Invalid file type. Expected: ${validExtensions.join(', ')}`
    };
  }

  return { valid: true };
}
```

### 3. Read and Parse File

```typescript
async function parseJsonFile(file: File): Promise<{ data: any; error?: string }> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data || typeof data !== 'object') {
      return { data: null, error: 'Invalid JSON data' };
    }

    return { data };
  } catch (e) {
    return { data: null, error: `JSON parse error: ${e.message}` };
  }
}
```

### 4. Detect File Type

```typescript
interface FileTypeDetection {
  type: 'show' | 'song' | 'batch' | 'concert' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
}

function detectFileType(data: any, filename: string): FileTypeDetection {
  // Check filename extension first
  if (filename.endsWith('.dmb')) {
    if (data.date && data.venue) {
      return { type: 'show', confidence: 'high' };
    }
  }

  // Check data structure
  if (Array.isArray(data)) {
    return { type: 'batch', confidence: 'high' };
  }

  if (data.shows && Array.isArray(data.shows)) {
    return { type: 'concert', confidence: 'high' };
  }

  if (data.date && data.venue && data.setlist) {
    return { type: 'show', confidence: 'high' };
  }

  if (data.slug && data.title) {
    return { type: 'song', confidence: 'medium' };
  }

  return { type: 'unknown', confidence: 'low' };
}
```

### 5. Validate JSON Schema

```typescript
function validateJsonSchema(data: any, type: string): ValidationResult {
  switch (type) {
    case 'show':
      if (!data.date || typeof data.date !== 'string') {
        return { valid: false, error: 'Missing or invalid "date" field' };
      }
      if (!data.venue || typeof data.venue !== 'string') {
        return { valid: false, error: 'Missing or invalid "venue" field' };
      }
      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        return { valid: false, error: 'Date must be in YYYY-MM-DD format' };
      }
      return { valid: true };

    case 'song':
      if (!data.slug || typeof data.slug !== 'string') {
        return { valid: false, error: 'Missing or invalid "slug" field' };
      }
      if (!data.title || typeof data.title !== 'string') {
        return { valid: false, error: 'Missing or invalid "title" field' };
      }
      return { valid: true };

    case 'batch':
      if (!Array.isArray(data) || data.length === 0) {
        return { valid: false, error: 'Batch must be non-empty array' };
      }
      if (data.length > 1000) {
        return { valid: false, error: 'Batch too large (max 1000 items)' };
      }
      return { valid: true };

    case 'concert':
      if (!data.shows || !Array.isArray(data.shows)) {
        return { valid: false, error: 'Missing or invalid "shows" array' };
      }
      if (data.shows.length === 0 || data.shows.length > 1000) {
        return { valid: false, error: 'Concert must have 1-1000 shows' };
      }
      return { valid: true };

    default:
      return { valid: false, error: 'Unknown file type' };
  }
}
```

### 6. Complete Processing Pipeline

```typescript
interface FileData {
  type: 'show' | 'setlist' | 'unknown';
  data: any;
  metadata: {
    fileName: string;
    fileSize: number;
    fileType: 'dmb' | 'setlist' | 'json' | 'txt';
  };
}

async function processSetlistFile(
  file: File
): Promise<FileData | { error: string }> {
  // 1. Validate metadata
  const metaValidation = validateFileMetadata(file);
  if (!metaValidation.valid) {
    return { error: metaValidation.error! };
  }

  // 2. Parse JSON
  const { data, error: parseError } = await parseJsonFile(file);
  if (parseError) {
    return { error: parseError };
  }

  // 3. Detect file type
  const { type, confidence } = detectFileType(data, file.name);

  // 4. Validate schema
  const schemaValidation = validateJsonSchema(data, type);
  if (!schemaValidation.valid) {
    return { error: schemaValidation.error! };
  }

  // 5. Return processed data
  return {
    type: type === 'batch' || type === 'concert' ? 'setlist' : type,
    data,
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.name.split('.').pop() as 'dmb' | 'setlist' | 'json' | 'txt'
    }
  };
}
```

## SvelteKit Integration

### Route Handler (+page.svelte)

```svelte
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { processSetlistFile, encodeFileDataForUrl } from '$lib/utils/fileHandler';

  let status = $state('idle');
  let fileName = $state('');
  let errorMessage = $state('');

  onMount(() => {
    if ('launchQueue' in window) {
      window.launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams.files.length) return;

        for (const fileHandle of launchParams.files) {
          const file = await fileHandle.getFile();
          fileName = file.name;
          status = 'processing';

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
    }
  });
</script>

{#if status === 'processing'}
  <p>Processing {fileName}...</p>
{:else if status === 'error'}
  <p class="error">{errorMessage}</p>
{/if}
```

### Server-Side Routing (+page.ts)

```typescript
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
  const fileParam = url.searchParams.get('file');
  const typeParam = url.searchParams.get('type');

  if (!fileParam) {
    return { error: 'No file data provided' };
  }

  try {
    const decoded = JSON.parse(atob(decodeURIComponent(fileParam)));

    // Route based on file type
    if (typeParam === 'show' && decoded.date) {
      throw redirect(302, `/shows/${decoded.date}`);
    } else if (typeParam === 'song' && decoded.slug) {
      throw redirect(302, `/songs/${decoded.slug}`);
    } else if (typeParam === 'setlist') {
      // Navigate to list view with data
      throw redirect(302, '/shows');
    }

    return { data: decoded };
  } catch (e) {
    return { error: 'Failed to decode file data' };
  }
};
```

## URL Encoding for Navigation

When passing file data via URL parameters:

```typescript
function encodeFileDataForUrl(
  data: any
): { encoded: string; size: number } | null {
  try {
    const json = JSON.stringify(data);
    const encoded = encodeURIComponent(btoa(json));

    // Check practical URL limit (100KB)
    if (encoded.length > 100 * 1024) {
      return null;
    }

    return { encoded, size: encoded.length };
  } catch (e) {
    return null;
  }
}

function decodeFileDataFromUrl(
  encoded: string
): { data: any } | { error: string } {
  try {
    const decoded = atob(decodeURIComponent(encoded));
    const data = JSON.parse(decoded);
    return { data };
  } catch (e) {
    return { error: 'Failed to decode URL parameter' };
  }
}
```

## File Type Registration Patterns

### Single File Type (Custom Extension)
```json
{
  "file_handlers": [{
    "action": "/open",
    "accept": {
      "application/x-myapp": [".myapp"]
    }
  }]
}
```

### Multiple Extensions (Same MIME)
```json
{
  "accept": {
    "application/json": [".json", ".dmb", ".setlist"]
  }
}
```

### Multiple MIME Types
```json
{
  "accept": {
    "application/json": [".json"],
    "text/plain": [".txt"],
    "application/x-custom": [".custom"]
  }
}
```

### Wildcard Patterns
```json
{
  "accept": {
    "image/*": [".png", ".jpg", ".gif", ".webp"],
    "video/*": [".mp4", ".webm"]
  }
}
```

## Testing

### Local Development Testing
```bash
# 1. Build production version
npm run build
npm run preview

# 2. Open in Chrome and install PWA
# DevTools > Application > Install

# 3. Create test file
cat > test.json << 'EOF'
{
  "date": "2024-01-15",
  "venue": "Test Venue",
  "setlist": []
}
EOF

# 4. Test file opening
# - Double-click test.json
# - Right-click > Open With > Your PWA
# - Drag into PWA window
```

### Chrome DevTools Verification
```
Application Tab:
  Manifest > file_handlers section
    - Check action URL
    - Verify accepted types
    - Confirm icon paths

Console:
  console.log('launchQueue' in window);
  // Should log: true (when installed)

Network Tab:
  - Monitor /open-file requests
  - Check URL parameter size
```

### Debug Logging
```typescript
if ('launchQueue' in window) {
  window.launchQueue.setConsumer(async (launchParams) => {
    console.log('LaunchQueue triggered');
    console.log('Files count:', launchParams.files.length);

    for (const handle of launchParams.files) {
      const file = await handle.getFile();
      console.log('File:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified)
      });
    }
  });
}
```

## Browser Compatibility

| Browser | Support | Min Version | Notes |
|---------|---------|-------------|-------|
| Chrome | Yes | 102+ | Full support |
| Edge | Yes | 102+ | Chromium-based |
| Firefox | No | - | Not implemented |
| Safari | No | - | Not implemented |

### Requirements
- HTTPS or localhost/127.0.0.1
- PWA installed in standalone mode
- User grants file association permission
- Service worker registered

## Performance Considerations

| Operation | Target Time | Notes |
|-----------|-------------|-------|
| File read (1MB) | < 10ms | Async FileReader API |
| JSON parse (1MB) | < 20ms | Native parser |
| Type detection | < 1ms | Pattern matching |
| Schema validation | < 5ms | Structural checks |
| URL encoding (100KB) | < 5ms | Base64 conversion |
| Total pipeline | < 50ms | End-to-end on M-series |

### Optimization Tips
- Set reasonable file size limits (10MB default)
- Use streaming for large files
- Validate incrementally (metadata first)
- Cache processed results in IndexedDB
- Use Web Workers for heavy processing

## Security Best Practices

### File Validation
```typescript
// Always validate before processing
const ALLOWED_EXTENSIONS = ['.json', '.dmb', '.setlist'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILENAME_LENGTH = 255;

function isFileSafe(file: File): boolean {
  // Check size
  if (file.size > MAX_FILE_SIZE) return false;

  // Check extension
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(ext)) return false;

  // Check filename length
  if (file.name.length > MAX_FILENAME_LENGTH) return false;

  return true;
}
```

### Content Security
- Never use `eval()` on file contents
- Parse JSON with strict error handling
- Sanitize data before displaying
- Validate against known schemas only
- Limit array/object sizes to prevent DoS

### URL Parameter Security
- Limit encoded payload size (100KB)
- Use URL-safe base64 encoding
- Validate decoded data before use
- Don't expose sensitive data in URLs
- Consider using session storage for large data

## Common Issues

### File handler not appearing
**Problem**: PWA doesn't appear in "Open With" menu

**Solution**:
- Verify PWA is installed (not just bookmarked)
- Restart browser after installation
- Check manifest includes file_handlers
- Ensure file extension matches exactly (case-sensitive)

### LaunchQueue not firing
**Problem**: Files don't trigger launchQueue consumer

**Solution**:
- Confirm Chrome 102+ or Edge 102+
- Verify running in standalone mode (not browser tab)
- Check HTTPS or localhost
- Set consumer in top-level script, not in component lifecycle

### Large files timing out
**Problem**: Processing takes too long or fails

**Solution**:
- Reduce file size limit
- Use streaming APIs for large files
- Move processing to Web Worker
- Show progress indicator for user feedback

### URL parameter too large
**Problem**: Navigation fails with large data

**Solution**:
- Use IndexedDB to store data, pass ID in URL
- Reduce data payload (send only essentials)
- Use server endpoints for large data transfers
- Consider using Cache API

## Example: Complete File Handler Utility

```typescript
// src/lib/utils/fileHandler.ts

export function isFileHandlingSupported(): boolean {
  return 'launchQueue' in window;
}

export function canRegisterFileHandlers(): boolean {
  return (
    isFileHandlingSupported() &&
    (location.protocol === 'https:' || location.hostname === 'localhost')
  );
}

export function getFilesFromLaunchQueue(
  callback: (files: Array<{ file: File; name: string }>) => void
): void {
  if (!isFileHandlingSupported()) return;

  window.launchQueue.setConsumer(async (launchParams) => {
    const files: Array<{ file: File; name: string }> = [];

    for (const handle of launchParams.files) {
      const file = await handle.getFile();
      files.push({ file, name: file.name });
    }

    if (files.length > 0) {
      callback(files);
    }
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
```

## References
- [File Handling API Spec](https://www.w3.org/TR/file-handling/)
- [Chrome Platform Status](https://chromestatus.com/feature/5721776130965504)
- [MDN: launchQueue](https://developer.mozilla.org/en-US/docs/Web/API/LaunchQueue)
- [Web App Manifest](https://www.w3.org/TR/appmanifest/)
- [FileSystemFileHandle API](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle)

## Related Skills
- /Users/louisherman/ClaudeCodeProjects/.claude/skills/pwa/service-workers.md
- /Users/louisherman/ClaudeCodeProjects/.claude/skills/pwa/manifest.md
- /Users/louisherman/ClaudeCodeProjects/.claude/skills/web-apis/file-system-access.md
