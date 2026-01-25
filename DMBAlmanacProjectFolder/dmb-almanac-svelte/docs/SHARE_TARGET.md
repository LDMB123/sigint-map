# Share Target Implementation

## Overview

The DMB Almanac PWA implements the Web Share Target API to receive shared content from other apps and websites. When users share text or URLs to the PWA, the app intelligently parses the content and redirects to the most relevant page.

## Architecture

### Manifest Configuration

Location: `/static/manifest.json`

```json
{
  "share_target": {
    "action": "/search?source=share",
    "method": "GET",
    "params": {
      "text": "q"
    }
  }
}
```

- **action**: Target URL that receives shared content (search page with `source=share` flag)
- **method**: GET request (simpler than POST, no service worker needed)
- **params**: Maps shared text to the `q` query parameter

### Components

1. **Share Parser** (`/src/lib/utils/shareParser.ts`)
   - Parses shared text to extract DMB-related content
   - Identifies show dates, song titles, venue names, or URLs
   - Returns confidence level and target type

2. **Search Page Enhancement** (`/src/routes/search/+page.svelte`)
   - Detects share actions via `source=share` parameter
   - Processes shared content using the parser
   - Shows loading state while processing
   - Redirects to specific pages for high-confidence matches
   - Falls back to search for lower-confidence matches

## Supported Share Formats

### Show Dates (Highest Priority)

The parser recognizes multiple date formats:

| Format | Example | Confidence |
|--------|---------|------------|
| ISO (YYYY-MM-DD) | `2024-09-13` | High |
| Long date | `September 13, 2024` | High |
| Abbreviated | `Sep 13, 2024` | High |
| US format | `09/13/2024` or `09-13-2024` | Medium |

**Behavior**: Automatically redirects to `/shows/{date}` for high-confidence matches.

**Examples**:
- "Check out the show from 2024-09-13!"
- "Amazing concert on September 13, 2024"
- "Labor Day weekend 09/13/2024"

### URLs (Highest Priority)

Recognizes DMB Almanac URLs and app URLs:

| Pattern | Example |
|---------|---------|
| dmbalmanac.com | `https://dmbalmanac.com/show/2024-09-13` |
| App URLs | `https://app.com/shows/2024-09-13` |

**Behavior**: Extracts the show ID/date and redirects to the appropriate page.

### Song Titles (Medium Priority)

Recognizes song titles in two ways:

1. **Quoted songs**: `"Crash Into Me"`, `"Two Step"`
2. **Known titles**: Matches common DMB songs without quotes

**Behavior**: Redirects to `/songs/{slug}` (converts to URL-safe slug).

**Examples**:
- 'Check out "Bartender" from last night!'
- "Amazing performance of Two Step tonight!"

### Venue Names (Medium Priority)

Recognizes venues via:

1. **Known venues**: The Gorge, SPAC, Red Rocks, Alpine Valley, MSG
2. **Pattern matching**: "at {Venue Name}", "@ {Venue Name}"

**Behavior**: Redirects to `/search?q={venue}` for venue search.

**Examples**:
- "Heading to The Gorge this weekend!"
- "Great show at Madison Square Garden"
- "Tonight @ SPAC"

### Generic Text (Lowest Priority)

Any text that doesn't match specific patterns falls back to search.

**Behavior**: Stays on `/search?q={text}` and performs normal search.

## Priority Rules

When multiple patterns match, the parser uses this priority order:

1. **URLs** (highest confidence, most specific)
2. **Show dates** (high confidence, direct navigation)
3. **Song titles** (medium confidence, specific content)
4. **Venue names** (medium confidence, search-based)
5. **Generic search** (lowest priority, fallback)

Example: "Two Step from 2024-09-13 was amazing!"
- Contains both a song title ("Two Step") and a date
- Date has higher priority → redirects to show page

## User Experience

### High Confidence Flow

When the parser has high confidence (dates, URLs):

1. User shares content to DMB Almanac
2. App opens to `/search?source=share&q={text}`
3. Loading indicator appears: "Processing shared content"
4. Shows message: "Viewing show from 2024-09-13"
5. After 800ms, redirects to `/shows/2024-09-13`

### Low Confidence Flow

When the parser has low confidence (generic text):

1. User shares content to DMB Almanac
2. App opens to `/search?source=share&q={text}`
3. No loading indicator (processes immediately)
4. Shows search results for the shared text
5. User can refine search or browse results

## Testing

### Manual Testing

1. **From Mobile Browser** (Chrome Android, Safari iOS):
   ```
   1. Visit any website with DMB-related content
   2. Select text: "Check out the show from 2024-09-13"
   3. Tap Share → DMB Almanac
   4. Should redirect to show page
   ```

2. **From Twitter/X**:
   ```
   1. Find tweet: "Just saw DMB! 2024-09-13 was epic!"
   2. Tap Share → DMB Almanac
   3. Should extract date and redirect
   ```

3. **From Messaging Apps**:
   ```
   1. Receive message: "https://dmbalmanac.com/show/2024-09-13"
   2. Long press → Share → DMB Almanac
   3. Should redirect to show page
   ```

### Automated Testing

Run the test suite:

```bash
npm run test -- shareParser.test.ts
```

Tests cover:
- All date format variations
- URL parsing
- Song title extraction
- Venue name matching
- Priority ordering
- Edge cases and invalid input

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome (Android) | 93+ | Full |
| Edge (Android) | 93+ | Full |
| Safari (iOS) | 15.4+ | Full |
| Samsung Internet | 16+ | Full |
| Firefox (Android) | No | Not supported |

**Note**: Desktop browsers don't support Share Target (it's a mobile-only API).

## Security Considerations

### Input Sanitization

All shared text is sanitized before processing:

1. **Length limits**: Query strings limited to 200 characters
2. **XSS prevention**: All text is properly escaped/encoded
3. **URL validation**: Only whitelisted URL patterns are recognized
4. **SQL injection**: No direct database queries from shared content

### Privacy

- No shared content is logged or stored
- No analytics tracking of shared content
- Processing happens entirely client-side
- No server receives the shared text

## Performance

### Metrics

- **Time to Interactive**: < 100ms from share to UI
- **Redirect time**: 800ms delay for user feedback
- **Parse time**: < 10ms for typical input

### Optimizations

1. **Lazy loading**: Parser only runs when `source=share` is present
2. **Regex optimization**: Patterns compiled once, reused
3. **No network requests**: All processing is local
4. **Minimal DOM updates**: Single loading state, then redirect

## Future Enhancements

Potential improvements:

1. **File sharing**: Accept setlist files (.txt, .json)
2. **Image sharing**: OCR for setlist screenshots
3. **Multiple items**: Parse setlists with multiple songs
4. **Smart suggestions**: "Did you mean...?" for ambiguous content
5. **History**: Track recently shared content
6. **Shortcuts**: Quick actions based on shared content type

## Debugging

### Enable Debug Mode

Add to search page for detailed parsing info:

```javascript
if (import.meta.env.DEV) {
  console.log('Share parsing:', {
    original: query,
    parsed: parseShareContent(query),
    targetUrl: getTargetUrl(parseShareContent(query))
  });
}
```

### Common Issues

**Issue**: Share target doesn't appear
- **Solution**: PWA must be installed (add to home screen)

**Issue**: Wrong page after sharing
- **Solution**: Check parser priority rules, verify input format

**Issue**: Stuck on loading screen
- **Solution**: Redirect failed, check console for navigation errors

## Resources

- [Web Share Target API](https://web.dev/web-share-target/)
- [PWA Manifest Spec](https://w3c.github.io/manifest/)
- [Chrome Share Target Guide](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target)
