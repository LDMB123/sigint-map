# Share Target Handler - Quick Reference

## Overview

The DMB Almanac PWA receives shared content from other apps using the Web Share Target API. When users share text or URLs to the app, it intelligently parses the content and navigates to the most relevant page.

## Files

```
src/lib/utils/
├── shareParser.ts              # Main parser logic
├── shareParser.test.ts         # Comprehensive test suite
└── shareParser.examples.ts     # Usage examples

src/routes/search/+page.svelte  # Enhanced with share handling
static/manifest.json            # Share target declaration
docs/SHARE_TARGET.md           # Full documentation
```

## Quick Start

### Basic Usage

```typescript
import { parseShareContent, getTargetUrl } from '$lib/utils/shareParser';

// Parse shared text
const parsed = parseShareContent('Check out 2024-09-13!');
// { type: 'show', value: '2024-09-13', confidence: 'high' }

// Get target URL
const url = getTargetUrl(parsed);
// '/shows/2024-09-13'
```

### In a Svelte Component

```svelte
<script lang="ts">
  import { parseShareContent, getTargetUrl } from '$lib/utils/shareParser';
  import { goto } from '$app/navigation';

  function handleShare(text: string) {
    const parsed = parseShareContent(text);

    if (parsed.confidence === 'high') {
      goto(getTargetUrl(parsed));
    }
  }
</script>
```

## Supported Formats

### Show Dates

```typescript
// ISO format (YYYY-MM-DD) - HIGH confidence
parseShareContent('2024-09-13')
// → { type: 'show', value: '2024-09-13', confidence: 'high' }

// Long date - HIGH confidence
parseShareContent('September 13, 2024')
// → { type: 'show', value: '2024-09-13', confidence: 'high' }

// US format (MM/DD/YYYY) - MEDIUM confidence
parseShareContent('09/13/2024')
// → { type: 'show', value: '2024-09-13', confidence: 'medium' }
```

### URLs

```typescript
// DMB Almanac URLs
parseShareContent('https://dmbalmanac.com/show/2024-09-13')
// → { type: 'show', value: '2024-09-13', confidence: 'high' }

// App URLs
parseShareContent('https://app.com/shows/2024-09-13')
// → { type: 'show', value: '2024-09-13', confidence: 'high' }
```

### Song Titles

```typescript
// Quoted songs - MEDIUM confidence
parseShareContent('"Crash Into Me" was amazing!')
// → { type: 'song', value: 'Crash Into Me', confidence: 'medium' }

// Known titles - MEDIUM confidence
parseShareContent('Two Step opener tonight')
// → { type: 'song', value: 'Two Step', confidence: 'medium' }
```

### Venue Names

```typescript
// Known venues - MEDIUM confidence
parseShareContent('Heading to The Gorge!')
// → { type: 'venue', value: 'The Gorge Amphitheatre', confidence: 'medium' }

// Pattern matching - MEDIUM confidence
parseShareContent('Great show at Madison Square Garden')
// → { type: 'venue', value: 'Madison Square Garden', confidence: 'medium' }
```

## API Reference

### `parseShareContent(text: string): ParsedShareContent`

Parses shared text and identifies content type.

**Parameters:**
- `text` - The shared text to parse

**Returns:**
```typescript
{
  type: 'show' | 'song' | 'venue' | 'search' | 'unknown';
  value: string;              // Extracted value
  originalText: string;       // Original input
  confidence: 'high' | 'medium' | 'low';
}
```

**Example:**
```typescript
const result = parseShareContent('2024-09-13');
console.log(result);
// {
//   type: 'show',
//   value: '2024-09-13',
//   originalText: '2024-09-13',
//   confidence: 'high'
// }
```

### `getTargetUrl(parsed: ParsedShareContent): string`

Generates the target URL from parsed content.

**Parameters:**
- `parsed` - Result from `parseShareContent()`

**Returns:** URL path string

**Example:**
```typescript
const parsed = parseShareContent('2024-09-13');
const url = getTargetUrl(parsed);
console.log(url); // '/shows/2024-09-13'
```

### `getShareDescription(parsed: ParsedShareContent): string`

Gets user-friendly description of parsed content.

**Parameters:**
- `parsed` - Result from `parseShareContent()`

**Returns:** Human-readable description

**Example:**
```typescript
const parsed = parseShareContent('2024-09-13');
const desc = getShareDescription(parsed);
console.log(desc); // 'Viewing show from 2024-09-13'
```

## Priority Rules

When multiple patterns match, the parser uses this order:

1. **URLs** (most specific)
2. **Show dates** (high confidence)
3. **Song titles** (medium confidence)
4. **Venue names** (medium confidence)
5. **Generic search** (fallback)

**Example:**
```typescript
// Contains both date and song
parseShareContent('Two Step from 2024-09-13 was amazing!')
// → type: 'show' (date has higher priority)
```

## Testing

Run the test suite:

```bash
npm test -- shareParser.test.ts
```

Test coverage includes:
- ✓ All date formats (ISO, US, long format)
- ✓ URL parsing (dmbalmanac.com, app URLs)
- ✓ Song title extraction (quoted, known titles)
- ✓ Venue name matching (known venues, patterns)
- ✓ Priority ordering
- ✓ Edge cases (empty, invalid input)
- ✓ Real-world scenarios

## Common Patterns

### Conditional Redirect

```typescript
const parsed = parseShareContent(sharedText);

if (parsed.confidence === 'high') {
  // Auto-redirect for high confidence
  goto(getTargetUrl(parsed));
} else {
  // Show search results for lower confidence
  goto(`/search?q=${encodeURIComponent(parsed.value)}`);
}
```

### With Loading State

```typescript
let processing = $state(false);
let message = $state<string | null>(null);

const parsed = parseShareContent(sharedText);
message = getShareDescription(parsed);
processing = true;

setTimeout(() => {
  goto(getTargetUrl(parsed));
  processing = false;
}, 800);
```

### With Validation

```typescript
const parsed = parseShareContent(sharedText);

// Validate before redirecting
if (parsed.type === 'show') {
  const exists = await checkShowExists(parsed.value);

  if (exists) {
    goto(getTargetUrl(parsed));
  } else {
    // Fallback to search
    goto(`/search?q=${encodeURIComponent(parsed.value)}`);
  }
}
```

## Browser Support

| Platform | Support |
|----------|---------|
| Chrome Android 93+ | ✓ Full |
| Safari iOS 15.4+ | ✓ Full |
| Edge Android 93+ | ✓ Full |
| Samsung Internet 16+ | ✓ Full |
| Firefox Android | ✗ Not supported |

**Note:** Share Target is mobile-only. Desktop browsers don't support it.

## Security

All input is sanitized:

- ✓ Length limits (200 chars)
- ✓ XSS prevention (proper escaping)
- ✓ No server logging
- ✓ Client-side only processing

## Performance

- Parse time: < 10ms
- No network requests
- Minimal memory usage
- Optimized regex patterns

## Examples

See `shareParser.examples.ts` for complete code examples including:
- Basic parsing
- Conditional redirects
- Type-specific handling
- User feedback
- Async redirects
- Validation
- Svelte component integration

## Troubleshooting

**Share target doesn't appear in share menu:**
- Ensure PWA is installed (added to home screen)
- Check manifest.json is properly served
- Verify HTTPS (required for PWA)

**Wrong page after sharing:**
- Check parser priority rules
- Verify input format matches expected patterns
- Review test cases for similar input

**Stuck on loading screen:**
- Check browser console for errors
- Verify navigation is not blocked
- Check target URL is valid

## Related Documentation

- Full docs: `/docs/SHARE_TARGET.md`
- Test suite: `shareParser.test.ts`
- Examples: `shareParser.examples.ts`
- Web Share Target API: https://web.dev/web-share-target/
