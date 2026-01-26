---
name: protocol-handler
version: 1.0.0
description: The DMB Almanac PWA registers `web+dmb://` protocol to enable deep linking from external sources.
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: pwa
complexity: intermediate
tags:
  - pwa
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

# Migration metadata
migrated_from: projects/dmb-almanac/app/src/lib/pwa/PROTOCOL_HANDLER_QUICK_REFERENCE.md
migration_date: 2026-01-25
---

# Protocol Handler Quick Reference

## TL;DR

The DMB Almanac PWA registers `web+dmb://` protocol to enable deep linking from external sources.

## Supported URLs

```
web+dmb://show/1991-03-23          → /shows/1991-03-23
web+dmb://song/ants-marching       → /songs/ants-marching
web+dmb://venue/123                → /venues/123
web+dmb://guest/456                → /guests/456
web+dmb://tour/789                 → /tours/789
web+dmb://search/query             → /search?q=query
```

## Quick Usage

### Import the Service

```typescript
import { protocolHandler } from '$lib/pwa/protocol';
```

### Check Registration Status

```typescript
const state = protocolHandler.getState();
console.log(state.isRegistered); // true/false
```

### Subscribe to Changes

```typescript
const unsubscribe = protocolHandler.subscribe((state) => {
  if (state.isRegistered) {
    console.log('Protocol handler is active!');
  }
});
```

### Create Protocol URLs

```typescript
const showUrl = protocolHandler.createUrl('show', '1991-03-23');
// Returns: "web+dmb://show/1991-03-23"

const songUrl = protocolHandler.createUrl('song', 'ants-marching');
// Returns: "web+dmb://song/ants-marching"
```

### Parse Protocol URLs

```typescript
const parsed = protocolHandler.parseUrl('web+dmb://show/1991-03-23');
// Returns: { resource: 'show', identifier: '1991-03-23' }

const route = protocolHandler.handleProtocolUrl('web+dmb://show/1991-03-23');
// Returns: "/shows/1991-03-23"
```

### Manual Registration

```typescript
await protocolHandler.register();
```

## UI Component

### Badge (Compact)

```svelte
<script>
  import { ProtocolHandlerIndicator } from '$lib/components/pwa';
</script>

<ProtocolHandlerIndicator variant="badge" />
```

### Card (Detailed)

```svelte
<script>
  import { ProtocolHandlerIndicator } from '$lib/components/pwa';
</script>

<ProtocolHandlerIndicator variant="card" showDetails={true} />
```

## Testing

### Visit Test Page

```
/protocol-test
```

### Console Check

```javascript
// Check registration
localStorage.getItem('pwa-protocol-registered')
// Should return: "true"

// Import and test
import { protocolHandler } from '$lib/pwa/protocol';
protocolHandler.getState()
```

### Create Test HTML

```html
<!DOCTYPE html>
<html>
<body>
  <h1>Protocol Test</h1>
  <a href="web+dmb://show/1991-03-23">Test Link</a>
</body>
</html>
```

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 96+ | ✅ | Auto-registers |
| Edge 96+ | ✅ | Auto-registers |
| Firefox 119+ | ✅ | User prompt |
| Safari | ⚠️ | Limited |
| iOS | ❌ | Not supported |

## Common Patterns

### Share a Show

```typescript
const showUrl = protocolHandler.createUrl('show', '1991-03-23');

if (navigator.share) {
  await navigator.share({
    title: 'DMB Show',
    url: showUrl
  });
}
```

### Check Feature Support

```typescript
import { isProtocolHandlerSupported } from '$lib/pwa/protocol';

if (isProtocolHandlerSupported()) {
  // Protocol handlers are available
}
```

### Get Platform Info

```typescript
import { getProtocolHandlerCapabilities } from '$lib/pwa/protocol';

const caps = getProtocolHandlerCapabilities();
console.log(caps.platform); // 'chromium' | 'firefox' | 'safari' | 'unknown'
console.log(caps.notes);    // Array of platform-specific notes
```

## Security

All URLs are validated:
- ✅ Protocol must be `web+dmb://`
- ✅ No path traversal (`../`, `//`)
- ✅ Whitelisted routes only
- ✅ Sanitized identifiers
- ✅ Format validation (regex)
- ✅ Length limits

## Manifest Configuration

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

## Flow Diagram

```
External Click
    ↓
web+dmb://show/1991-03-23
    ↓
Browser (if registered)
    ↓
/protocol?uri=web%2Bdmb%3A%2F%2Fshow%2F1991-03-23
    ↓
Parse & Validate (+page.ts)
    ↓
Redirect to /shows/1991-03-23
    ↓
Show Page Rendered
```

## Debugging

### Enable Logging

All protocol operations log with `[Protocol]` prefix:

```
[Protocol] Manager initialized
[Protocol] Successfully registered
[Protocol] Auto-registration failed
```

### Check State

```typescript
console.log(protocolHandler.getState());
```

### Test Parsing

```typescript
const url = 'web+dmb://show/1991-03-23';
console.log(protocolHandler.parseUrl(url));
console.log(protocolHandler.handleProtocolUrl(url));
```

## Files

| File | Purpose |
|------|---------|
| `src/lib/pwa/protocol.ts` | Service implementation |
| `src/lib/pwa/PROTOCOL_HANDLER.md` | Full documentation |
| `src/lib/components/pwa/ProtocolHandlerIndicator.svelte` | UI component |
| `src/routes/protocol/+page.ts` | Route handler |
| `src/routes/protocol-test/+page.svelte` | Test page |

## API Reference

### protocolHandler

```typescript
interface ProtocolHandlerState {
  isSupported: boolean;
  isRegistered: boolean;
  protocol: string;
  url: string;
  error: string | null;
}

// Methods
protocolHandler.initialize(): void
protocolHandler.register(): Promise<boolean>
protocolHandler.unregister(): void
protocolHandler.subscribe(callback): () => void
protocolHandler.getState(): ProtocolHandlerState
protocolHandler.createUrl(resource, identifier): string
protocolHandler.parseUrl(url): { resource, identifier } | null
protocolHandler.handleProtocolUrl(url): string | null
protocolHandler.isProtocolUrl(url): boolean
```

### Helpers

```typescript
isProtocolHandlerSupported(): boolean
getProtocolHandlerCapabilities(): {
  supported: boolean;
  platform: 'chromium' | 'firefox' | 'safari' | 'unknown';
  notes: string[];
}
```

## Integration Points

- ✅ Auto-initializes in `pwaStore.initialize()`
- ✅ Exported from `$lib/pwa`
- ✅ Component exported from `$lib/components/pwa`
- ✅ Routes handled in `/protocol`
- ✅ Test page at `/protocol-test`

## Examples in the Wild

### Create a Shareable Link

```typescript
// Get current show
const showDate = '1991-03-23';

// Create protocol URL
const protocolUrl = protocolHandler.createUrl('show', showDate);

// Copy to clipboard
await navigator.clipboard.writeText(protocolUrl);

// Or share
await navigator.share({
  title: `DMB Show - ${showDate}`,
  text: 'Check out this show!',
  url: protocolUrl
});
```

### Detect and Handle

```svelte
<script>
  import { protocolHandler } from '$lib/pwa/protocol';

  let canUseProtocols = $state(false);

  $effect(() => {
    protocolHandler.subscribe((state) => {
      canUseProtocols = state.isSupported && state.isRegistered;
    });
  });
</script>

{#if canUseProtocols}
  <p>Protocol handlers are active!</p>
  <button onclick={shareViaProtocol}>Share this show</button>
{/if}
```

## That's It!

For complete documentation, see `/src/lib/pwa/PROTOCOL_HANDLER.md`
