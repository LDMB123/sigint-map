# DMB Almanac Scraper Reference

## Target Site: dmbalmanac.com

### HTML Structure
- Concert pages use table-based layout with bgcolor attributes
- Song links use `SongStats` URL pattern
- Set separators identified by color codes (e.g., `bgcolor="#006666"`)
- Tour pages contain nested tables with show listings

### Key Selectors
- Show table: `#SetTable tbody tr`
- Song links: `a[href*="SongStats"]`
- Set opener: `[bgcolor="#006666"]` or `[data-slot="opener"]`
- Tour listing: `.tourTable` or equivalent

### Selector Fallback Strategy
```javascript
const SELECTORS = {
  ITEMS: {
    primary: '[data-item]',
    fallback1: '.item-card',
    fallback2: '.item',
    fallback3: 'article'
  }
};
```

### Releases Scraper
- Album pages: structured differently from concert pages
- Release date extraction from metadata tables
- Track listing extraction with song link resolution

### Proxy Usage
- Rotate user agents for request diversity
- Respect robots.txt directives
- Implement polite delays between requests (2+ seconds)

### Common Fixes
- **Selector not found**: Check if element moved to iframe or shadow DOM
- **Empty data**: Look for text in child elements or data attributes
- **Timeout**: Use `waitForFunction()` instead of `waitForSelector()`
- **Rate limited**: Implement exponential backoff starting at 2 seconds
