# PWA File & Protocol Handlers

This document explains how the DMB Almanac PWA handles file launches and custom protocol URLs for seamless integration with the operating system.

## Overview

The PWA implements two handler mechanisms:

1. **File Handler** (`/open-file`) - Processes files opened with the PWA via the OS file system
2. **Protocol Handler** (`/protocol`) - Handles custom `web+dmb://` protocol URLs

Both handlers provide a smooth user experience with loading states and error handling.

## File Handler: /open-file

### Purpose

Allows users to open concert data files (`.dmb`, `.setlist`, `.json`) directly with the DMB Almanac PWA from their file system.

### Supported File Types

| Extension | Format | Use Case |
|-----------|--------|----------|
| `.dmb` | JSON | DMB-specific concert data files (single show or batch) |
| `.setlist` | JSON | Exported setlist data (single show or batch) |
| `.json` | JSON | Generic concert data format |

### File Format Specifications

#### Single Show File
```json
{
  "date": "1991-03-23",
  "venue": {
    "id": 123,
    "name": "The Tabernacle",
    "city": "Atlanta",
    "state": "GA",
    "country": "United States"
  },
  "setlist": [
    {
      "position": 1,
      "title": "Ants Marching",
      "setName": "set1",
      "durationSeconds": 245
    }
  ]
}
```

#### Concert Data File
```json
{
  "shows": [
    { "date": "1991-03-23", ... },
    { "date": "1991-03-24", ... }
  ]
}
```

#### Song Data File
```json
{
  "id": 1,
  "slug": "ants-marching",
  "title": "Ants Marching",
  "sortTitle": "Ants Marching",
  "isCover": false,
  "totalPerformances": 1234
}
```

### Route Implementation

**File**: `/src/routes/open-file/+page.ts` & `+page.svelte`

The handler:
1. Receives files via `launchQueue` API (Chrome 73+)
2. Reads and parses JSON file contents
3. Determines file type (show, song, batch)
4. Redirects to appropriate page:
   - Single show → `/shows/[date]`
   - Single song → `/songs/[slug]`
   - Batch → `/shows` (browse interface)

### Usage

#### From OS File Manager
1. Create a `.dmb` or `.json` file with concert data
2. Right-click → "Open with..."
3. Select "DMB Almanac"
4. File is processed and you're navigated to the appropriate page

#### From Web Page
```html
<a href="/open-file?file=base64_encoded_json&type=show">
  Open Concert Data
</a>
```

#### Programmatic (PWA/Native App)
```javascript
// Share concert data with the PWA
const fileData = {
  date: "1991-03-23",
  venue: { /* ... */ },
  setlist: [ /* ... */ ]
};

const url = new URL('/open-file', window.location.origin);
url.searchParams.set('file', btoa(JSON.stringify(fileData)));
url.searchParams.set('type', 'show');
window.location.href = url.toString();
```

### Error Handling

The handler gracefully handles errors:
- Invalid JSON format → Shows error with file name and message
- Unsupported format → Suggests browsing shows instead
- Missing required fields → Indicates what's missing

Users can:
- Return to home page
- Browse shows list
- Try a different file

## Protocol Handler: /protocol

### Purpose

Allows deep linking to specific content via custom `web+dmb://` protocol URLs. Users can share links that open directly in the installed PWA.

### Supported Protocols

| Protocol | Format | Example | Destination |
|----------|--------|---------|-------------|
| Show | `web+dmb://show/[date]` | `web+dmb://show/1991-03-23` | `/shows/1991-03-23` |
| Song | `web+dmb://song/[slug]` | `web+dmb://song/ants-marching` | `/songs/ants-marching` |
| Venue | `web+dmb://venue/[id]` | `web+dmb://venue/123` | `/venues/123` |
| Search | `web+dmb://search/[query]` | `web+dmb://search/phish-jam` | `/search?q=phish-jam` |
| Guest | `web+dmb://guest/[id]` | `web+dmb://guest/45` | `/guests/45` |
| Tour | `web+dmb://tour/[id]` | `web+dmb://tour/1991-spring` | `/tours/1991-spring` |

### Route Implementation

**File**: `/src/routes/protocol/+page.ts` & `+page.svelte`

The handler:
1. Parses the `web+dmb://` URL from search params
2. Extracts resource type and identifier
3. Validates identifier format:
   - Dates: `YYYY-MM-DD` format
   - Slugs: lowercase with hyphens
   - IDs: numeric only
4. Redirects to appropriate route or shows error

### Usage

#### In HTML Links
```html
<!-- Show specific concert -->
<a href="web+dmb://show/1991-03-23">
  Atlanta, GA - March 23, 1991
</a>

<!-- Song page -->
<a href="web+dmb://song/ants-marching">
  Ants Marching
</a>

<!-- Search -->
<a href="web+dmb://search/carter-jam">
  Search: Carter Jam
</a>
```

#### Sharing via URL
```javascript
// Generate a shareable link
const showLink = `web+dmb://show/1991-03-23`;
const songLink = `web+dmb://song/ants-marching`;

// If PWA isn't installed, fallback to web link
const fallbackUrl = `${window.location.origin}/shows/1991-03-23`;
```

#### From Other Apps
```javascript
// Android Intent or iOS URL Scheme
window.location.href = 'web+dmb://show/1991-03-23';

// With fallback
window.location.href = 'web+dmb://show/1991-03-23';
setTimeout(() => {
  window.location.href = 'https://dmbalmanac.example.com/shows/1991-03-23';
}, 1000);
```

### Error Handling

Invalid URLs show helpful error messages with:
- Explanation of what went wrong
- Examples of supported formats
- Quick action buttons to browse shows or return home

Example errors:
- Invalid date format: "Expected format: YYYY-MM-DD"
- Invalid song slug: "Song not found, try browsing songs"
- Unknown resource: "Supported: show, song, venue, search, guest, tour"

## Web App Manifest Integration

The Web App Manifest should declare both handlers:

```json
{
  "file_handlers": [
    {
      "action": "/open-file",
      "accept": {
        "application/json": [".json", ".dmb", ".setlist"]
      },
      "launch_type": "single-client"
    }
  ],
  "protocol_handlers": [
    {
      "protocol": "web+dmb",
      "url": "/protocol?url=%s"
    }
  ]
}
```

## Implementation Details

### File Handler Flow

```
User opens file from OS
        ↓
Browser detects .dmb/.setlist/.json
        ↓
PWA launched with launchQueue
        ↓
+page.svelte onMount() → handleLaunchQueue()
        ↓
File contents read and parsed
        ↓
Encoded as base64 in URL
        ↓
+page.ts load() → Parses JSON → Determines type
        ↓
Redirect to /shows/[date] or /songs/[slug]
        ↓
User sees content immediately
```

### Protocol Handler Flow

```
User clicks web+dmb:// link
        ↓
OS routes to registered handler
        ↓
PWA opened with /protocol?url=web+dmb://...
        ↓
+page.ts load() → Parses protocol URL
        ↓
Validates resource type and identifier
        ↓
Redirect to /shows, /songs, /venues, /search, etc.
        ↓
or show error with suggestions
        ↓
User lands on desired page
```

## Testing

### Test File Handler

1. Create test JSON file:
```json
{
  "date": "1991-03-23",
  "venue": {"name": "The Tabernacle"},
  "setlist": [{"title": "Ants Marching"}]
}
```

2. Save as `test-show.dmb`

3. Open in PWA:
   - On macOS: Right-click → Open With → DMB Almanac
   - On Windows: Right-click → Open with → DMB Almanac
   - On Android: Share → DMB Almanac

4. Verify redirect to `/shows/1991-03-23`

### Test Protocol Handler

1. Create a test link:
```html
<a href="web+dmb://show/1991-03-23">Test Show</a>
```

2. Click the link (PWA must be installed)

3. Verify:
   - Loading state appears
   - After <1 second, redirects to `/shows/1991-03-23`

4. Test various URLs:
```
web+dmb://show/1991-03-23
web+dmb://song/ants-marching
web+dmb://venue/123
web+dmb://search/phish
web+dmb://show/invalid-date
web+dmb://unknown/resource
```

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| File Handler | 73+ | Not yet | Not yet | 79+ |
| Protocol Handler | 74+ | Not yet | Not yet | 79+ |
| launchQueue API | 73+ | Not yet | Not yet | 79+ |

Graceful degradation: If unsupported, handlers still work via direct URL navigation.

## Security Considerations

1. **File Validation**
   - Only JSON files accepted
   - Size limits enforced by browser
   - No execution of code from files

2. **URL Validation**
   - All identifiers validated for correct format
   - Invalid formats rejected with error
   - Protocol must be `web+dmb://` (exact match)

3. **Data Privacy**
   - Files only read on client side
   - No data sent to server during file processing
   - Only metadata (date, slug, ID) used for routing

4. **HTTPS Requirement**
   - Protocol handler requires HTTPS
   - File handler works on HTTP (file:// protocol)
   - localhost allowed for development

## Future Enhancements

1. **Share Target API**: Allow sharing content TO the PWA
   ```json
   {
     "share_target": {
       "action": "/share",
       "method": "POST",
       "enctype": "multipart/form-data",
       "params": {
         "title": "title",
         "text": "text",
         "files": [{"name": "data", "accept": ["application/json"]}]
       }
     }
   }
   ```

2. **Batch Processing**: Support multiple files
   - Store in IndexedDB
   - Add to favorites or custom lists

3. **Export Format**: Generate `.dmb` files from app
   - Share concert data with others
   - Backup favorites
   - Cross-device sync

4. **URL Scheme Registration**: More granular scheme versions
   - `web+dmbalmanac://` for branded links
   - Deep linking with navigation history

## Related Files

- `/src/routes/open-file/+page.ts` - File handler load function
- `/src/routes/open-file/+page.svelte` - File handler UI
- `/src/routes/protocol/+page.ts` - Protocol handler load function
- `/src/routes/protocol/+page.svelte` - Protocol handler UI
- `/static/manifest.json` - Web App Manifest (handlers configuration)

## References

- [MDN: File Handler API](https://developer.mozilla.org/en-US/docs/Web/API/LaunchQueue)
- [MDN: Protocol Handler](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/registerProtocolHandler)
- [Web.dev: File Handler API](https://web.dev/file-handler/)
- [Web.dev: Protocol Handlers](https://web.dev/protocol-handler/)
