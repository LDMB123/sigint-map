# Protocol Handler Implementation

## Overview

The DMB Almanac PWA implements the Protocol Handlers API (Chrome 96+) to register the `web+dmb://` custom protocol. This allows external websites, apps, and documents to link directly to specific content within the PWA.

## Architecture

```
External Link (web+dmb://show/1991-03-23)
    ↓
Browser Protocol Handler Registration
    ↓
PWA: /protocol?uri=web%2Bdmb%3A%2F%2Fshow%2F1991-03-23
    ↓
+page.ts: Parse and validate protocol URL
    ↓
Redirect to: /shows/1991-03-23
```

## Files

### 1. `/src/lib/pwa/protocol.ts`
Protocol handler registration service with:
- Feature detection for Protocol Handlers API
- Registration/unregistration logic
- State management with subscriptions
- URL parsing and validation helpers
- Platform capability detection

### 2. `/src/routes/protocol/+page.ts`
Server-side load function that:
- Receives protocol URL via `?uri=` query parameter
- Validates protocol prefix (`web+dmb://`)
- Parses resource type and identifier
- Validates against whitelist of allowed routes
- Sanitizes identifiers to prevent injection
- Redirects to appropriate internal route

### 3. `/src/routes/protocol/+page.svelte`
Visual feedback page that shows:
- Loading state during processing
- Error messages for invalid URLs
- Success confirmation before redirect
- Help text with supported formats

### 4. `/src/lib/components/pwa/ProtocolHandlerIndicator.svelte`
UI component that displays:
- Registration status badge or card
- Platform-specific capabilities
- Manual registration trigger
- Example protocol URLs
- Error states

### 5. `/static/manifest.json`
Web App Manifest declaration:
```json
{
  "protocol_handlers": [
    {
      "protocol": "web+dmb",
      "url": "/protocol?uri=%s"
    }
  ]
}
```

## Supported Protocol Patterns

| Pattern | Example | Maps To |
|---------|---------|---------|
| `web+dmb://show/{date}` | `web+dmb://show/1991-03-23` | `/shows/1991-03-23` |
| `web+dmb://song/{slug}` | `web+dmb://song/ants-marching` | `/songs/ants-marching` |
| `web+dmb://venue/{id}` | `web+dmb://venue/123` | `/venues/123` |
| `web+dmb://guest/{id}` | `web+dmb://guest/456` | `/guests/456` |
| `web+dmb://tour/{id}` | `web+dmb://tour/789` | `/tours/789` |
| `web+dmb://search/{query}` | `web+dmb://search/satellite` | `/search?q=satellite` |

## Usage

### Initialization

The protocol handler is automatically initialized when the PWA loads:

```typescript
// In src/lib/stores/pwa.ts
import { protocolHandler } from '$lib/pwa/protocol';

pwaStore.initialize(); // Calls protocolHandler.initialize()
```

### Manual Registration

Users can manually trigger registration:

```typescript
import { protocolHandler } from '$lib/pwa/protocol';

// Trigger registration prompt
await protocolHandler.register();
```

### Subscribe to State Changes

```typescript
import { protocolHandler } from '$lib/pwa/protocol';

const unsubscribe = protocolHandler.subscribe((state) => {
  console.log('Supported:', state.isSupported);
  console.log('Registered:', state.isRegistered);
  console.log('Protocol:', state.protocol);
  console.log('Error:', state.error);
});
```

### Create Protocol URLs

```typescript
import { protocolHandler } from '$lib/pwa/protocol';

const showUrl = protocolHandler.createUrl('show', '1991-03-23');
// Returns: "web+dmb://show/1991-03-23"

const songUrl = protocolHandler.createUrl('song', 'ants-marching');
// Returns: "web+dmb://song/ants-marching"
```

### Parse Protocol URLs

```typescript
import { protocolHandler } from '$lib/pwa/protocol';

const parsed = protocolHandler.parseUrl('web+dmb://show/1991-03-23');
// Returns: { resource: 'show', identifier: '1991-03-23' }

const route = protocolHandler.handleProtocolUrl('web+dmb://show/1991-03-23');
// Returns: "/shows/1991-03-23"
```

## UI Components

### Badge Variant (Compact)

```svelte
<script>
  import { ProtocolHandlerIndicator } from '$lib/components/pwa';
</script>

<ProtocolHandlerIndicator variant="badge" />
```

Shows a small badge with tooltip on hover.

### Card Variant (Expanded)

```svelte
<script>
  import { ProtocolHandlerIndicator } from '$lib/components/pwa';
</script>

<ProtocolHandlerIndicator variant="card" showDetails={true} />
```

Shows a full card with registration button and detailed information.

## Security

### Input Validation

All protocol URLs are validated with multiple security checks:

1. **Protocol Prefix Validation**: Must start with `web+dmb://`
2. **Path Traversal Prevention**: Rejects URLs containing `..`, `//`, or `\`
3. **Route Whitelist**: Only allows redirects to whitelisted routes
4. **Identifier Sanitization**: Removes null bytes and dangerous characters
5. **Format Validation**: Resource-specific regex patterns (e.g., dates, slugs, IDs)
6. **Length Limits**: Maximum lengths on all identifiers (200 chars for text, 20 for IDs)

### Whitelist

Only these route prefixes are allowed:
- `/shows/`
- `/songs/`
- `/venues/`
- `/guests/`
- `/tours/`
- `/search`

## Browser Support

### Chromium (Chrome, Edge, Brave, etc.)

- **Support**: Chrome 96+ (December 2021)
- **Behavior**: Registration is instant and silent (no user prompt)
- **Status**: Full support

### Firefox

- **Support**: Firefox 119+ (October 2023)
- **Behavior**: Requires user confirmation for registration
- **Status**: Full support with user prompt

### Safari

- **Support**: Limited/experimental
- **Behavior**: May require macOS-level protocol registration
- **Status**: Not recommended, use Universal Links instead

### iOS Safari

- **Support**: Not supported
- **Fallback**: Use iOS Universal Links for deep linking

## Platform Detection

```typescript
import { getProtocolHandlerCapabilities } from '$lib/pwa/protocol';

const capabilities = getProtocolHandlerCapabilities();
console.log(capabilities);
// {
//   supported: true,
//   platform: 'chromium',
//   notes: [
//     'Chrome/Chromium supports protocol handlers since version 96+',
//     'Registration is instant and requires no user confirmation'
//   ]
// }
```

## Testing

### Manual Testing

1. **Register the handler**:
   - Open the PWA
   - Check browser DevTools Console for: `[Protocol] Successfully registered`
   - Or use the UI component to register manually

2. **Test a protocol link**:
   Create an HTML file with a link:
   ```html
   <!DOCTYPE html>
   <html>
   <body>
     <h1>Test DMB Protocol Handler</h1>
     <a href="web+dmb://show/1991-03-23">View Show: 1991-03-23</a>
     <a href="web+dmb://song/ants-marching">View Song: Ants Marching</a>
   </body>
   </html>
   ```

3. **Click the link**:
   - Should open the PWA if registered
   - Should navigate to the correct route

### Chrome DevTools Testing

1. Open DevTools > Application > Storage > Local Storage
2. Check for key: `pwa-protocol-registered` = `"true"`

### URL Bar Testing

In Chrome, you can type protocol URLs directly:
```
web+dmb://show/1991-03-23
```

This should trigger the handler if registered.

## Error Handling

The implementation handles several error scenarios:

| Error | Cause | User Message |
|-------|-------|--------------|
| `invalid_protocol` | URL doesn't start with `web+dmb://` | "Invalid protocol. Only web+dmb:// URLs are allowed." |
| `invalid_format` | Path traversal or malformed URL | "Invalid URL format detected (path traversal attempt)" |
| `invalid_identifier` | Identifier doesn't match expected format | "Invalid identifier for resource: {resource}" |
| `error` | Unexpected parsing error | "Failed to parse protocol URL: {error}" |

## Debugging

### Enable Console Logging

All protocol handler operations log to console with `[Protocol]` prefix:

```
[Protocol] Manager initialized { isSupported: true, isRegistered: true, ... }
[Protocol] Successfully registered: { protocol: 'web+dmb', url: '...' }
[Protocol] Auto-registration failed: ...
```

### Check Registration State

```typescript
import { protocolHandler } from '$lib/pwa/protocol';

const state = protocolHandler.getState();
console.log(state);
```

### Test URL Parsing

```typescript
import { protocolHandler } from '$lib/pwa/protocol';

// Test parsing
const url = 'web+dmb://show/1991-03-23';
const parsed = protocolHandler.parseUrl(url);
const route = protocolHandler.handleProtocolUrl(url);

console.log({ url, parsed, route });
```

## Manifest Declaration

The protocol handler is declared in the Web App Manifest:

```json
{
  "protocol_handlers": [
    {
      "protocol": "web+dmb",
      "url": "/protocol?uri=%s"
    }
  ]
}
```

**Important Notes**:
- The `protocol` must start with `web+` (custom protocols require this prefix)
- The `url` must be a relative URL within the PWA's scope
- The `%s` placeholder is replaced with the full protocol URL (URL-encoded)
- The parameter name `uri` must match the query parameter used in the route

## Future Enhancements

Potential improvements:

1. **Deep Link Analytics**: Track protocol handler usage
2. **Intent Sharing**: Share protocol URLs from the app
3. **QR Code Generation**: Generate QR codes with protocol URLs
4. **Email Integration**: mailto: links with protocol URLs
5. **Calendar Integration**: Add shows to calendar with protocol links
6. **Social Sharing**: Share protocol links on social media

## Related APIs

This implementation works well with other PWA APIs:

- **File Handling API**: Open `.dmb` files with show data
- **Share Target API**: Receive shares from other apps
- **Launch Handler API**: Control how multiple protocol links are handled
- **URL Handlers**: Handle regular HTTP URLs (limited browser support)

## References

- [MDN: Navigator.registerProtocolHandler()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/registerProtocolHandler)
- [Web Protocol Handlers Spec](https://html.spec.whatwg.org/multipage/system-state.html#custom-handlers)
- [Chrome Platform Status: Protocol Handlers](https://chromestatus.com/feature/5668240191586304)
- [Web App Manifest: protocol_handlers](https://developer.mozilla.org/en-US/docs/Web/Manifest/protocol_handlers)
