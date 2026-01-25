# Curated Lists Scraper Documentation

## Overview

The Curated Lists scraper extracts expert-curated special interest lists from DMBAlmanac.com. These lists include statistical compilations, historical collections, and thematic groupings of shows, songs, venues, and other entities.

## Target URLs

### List Index Page
**URL**: `https://dmbalmanac.com/Lists.aspx`

This page contains links to all available curated lists, organized by category:
- Almanac Updates
- Songs
- Venues
- Releases
- Timelines
- Shows

### Individual List Pages
**URL Pattern**: `https://dmbalmanac.com/ListView.aspx?id=XXX`

Each list page contains:
- List title
- Description/purpose
- List items (shows, songs, venues, guests, releases, or text)
- Item metadata (dates, durations, counts, etc.)

## HTML Structure

### Lists.aspx (Index Page)

```html
<div class="release-series">
  <div class="headerpanel">Songs</div>
  <div class="series-content">
    <div class="hanging-indent">
      <a class="lightorange" href="/ListView.aspx?id=36">
        Rarest Song Performed Per Album
      </a>
    </div>
    <div class="hanging-indent">
      <a class="lightorange" href="/ListView.aspx?id=24">
        Top 20 Longest Say Goodbye Intros
      </a>
    </div>
  </div>
</div>
```

**Key Selectors**:
- `.release-series` - List category container
- `.headerpanel` - Category name
- `a[href*='ListView.aspx']` - List links
- Extract `id=(\d+)` from href

### ListView.aspx (List Detail Page)

```html
<!-- List title in subtitle -->
<div class='subtitle'>Longest Documented Performances By Song</div>

<!-- Description -->
<div class='threedeetable'>
  A comprehensive list of the longest recorded performances...
</div>

<!-- List items (table format) -->
<table>
  <tr>
    <td><a href="/SongStats.aspx?sid=123">Lie in Our Graves</a></td>
    <td>42:15</td>
    <td>1995-08-15</td>
    <td><a href="/TourShowSet.aspx?id=456">Red Rocks</a></td>
  </tr>
  <!-- More rows... -->
</table>

<!-- Or div-based list format -->
<div class="hanging-indent">
  <a href="/ListView.aspx?id=32">New Shows Added to the Almanac</a>
</div>
```

**Key Selectors**:
- `.subtitle, .threedeetable` - List title/description
- `a[href*='TourShowSet']` - Show links (extract `id=(\d+)`)
- `a[href*='SongStats']` - Song links (extract `sid=(\d+)`)
- `a[href*='VenueStats']` - Venue links (extract `vid=(\d+)`)
- `a[href*='GuestStats']` - Guest links (extract `gid=([^&]+)`)
- `a[href*='Release']` - Release links (extract `rid=(\d+)`)

## TypeScript Interfaces

### ScrapedList
```typescript
interface ScrapedList {
  originalId: string;        // List ID from URL (id=XXX)
  title: string;             // "Longest Documented Performances By Song"
  slug: string;              // "longest-documented-performances-by-song"
  category: string;          // "Songs", "Venues", "Shows", etc.
  description?: string;      // List purpose/context
  itemCount: number;         // Number of items in list
  items: ScrapedListItem[];  // List items
}
```

### ScrapedListItem
```typescript
interface ScrapedListItem {
  position: number;          // Order in list (1-based)
  itemType: "show" | "song" | "venue" | "guest" | "release" | "text";
  itemId?: string;           // Original dmbalmanac ID
  itemTitle: string;         // Display title
  itemLink?: string;         // Full URL to item page
  notes?: string;            // Additional context
  metadata?: Record<string, string>; // Extra data (dates, durations, etc.)
}
```

## Scraper Features

### Multi-Strategy Parsing
The scraper tries three strategies to extract list items:

1. **Table-based lists**: Extracts structured data from table rows
2. **Div-based lists**: Parses `.hanging-indent` or `.list-item` elements
3. **Simple link lists**: Falls back to finding all relevant links

### Rate Limiting
- **Concurrency**: 2 concurrent requests
- **Interval**: 5 requests per 10 seconds
- **Random delay**: 1-3 seconds between requests

### Caching
- HTML responses cached to `scraper/cache/`
- Prevents redundant requests during development
- Cache key: MD5 hash of URL

### Checkpointing
- Progress saved every 5 lists
- Checkpoint file: `scraper/cache/checkpoint_lists.json`
- Resume interrupted scrapes automatically

### Item Type Detection
Automatically determines item type from URL patterns:

| URL Pattern | Item Type |
|------------|-----------|
| `TourShowSet.aspx?id=` | show |
| `SongStats.aspx?sid=` | song |
| `VenueStats.aspx?vid=` | venue |
| `GuestStats.aspx?gid=` | guest |
| `Release*.aspx?rid=` | release |
| No link or unknown | text |

## Usage

### Test the Scraper
```bash
cd /Users/louisherman/Documents/dmb-almanac/scraper
npm run test:lists
```

Expected output:
```
================================================================================
TEST 1: Fetching List Index
================================================================================

Found 45 curated lists

Categories:
  Almanac Updates: 1 lists
  Songs: 13 lists
  Venues: 3 lists
  Releases: 3 lists
  Timelines: 5 lists
  Shows: 14 lists

Sample lists:
  [Almanac Updates] New Shows Added to the Almanac (ID: 32)
  [Songs] Rarest Song Performed Per Album (ID: 36)
  ...
```

### Run Full Scrape
```bash
npm run scrape:lists
```

Output:
```
Starting curated lists scraper...
Fetching list index from Lists.aspx...
Found 45 curated lists across 6 categories

Progress: 0/45 lists completed
Remaining: 45 lists to scrape

  Parsed [Almanac Updates]: New Shows Added to the Almanac (12 items)
  Parsed [Songs]: Rarest Song Performed Per Album (35 items)
  ...
Checkpoint saved: lists

Completed scraping 45 curated lists
Saved 45 lists to /Users/louisherman/Documents/dmb-almanac/scraper/output/lists.json
Done!
```

### Resume Interrupted Scrape
If the scrape is interrupted, simply run again:
```bash
npm run scrape:lists
```

The scraper will:
1. Load checkpoint from cache
2. Skip already completed lists
3. Continue from where it left off

## Output Format

### File: `scraper/output/lists.json`

```json
{
  "scrapedAt": "2026-01-15T10:00:00.000Z",
  "source": "https://www.dmbalmanac.com",
  "totalItems": 45,
  "lists": [
    {
      "originalId": "44",
      "title": "Longest Documented Performances By Song",
      "slug": "longest-documented-performances-by-song",
      "category": "Songs",
      "description": "A comprehensive list of the longest recorded performances for each frequently played song.",
      "itemCount": 50,
      "items": [
        {
          "position": 1,
          "itemType": "song",
          "itemId": "123",
          "itemTitle": "Lie in Our Graves",
          "itemLink": "https://dmbalmanac.com/SongStats.aspx?sid=123",
          "notes": "42:15 - Red Rocks 1995-08-15",
          "metadata": {
            "column_1": "42:15",
            "column_2": "1995-08-15",
            "column_3": "Red Rocks Amphitheatre"
          }
        }
      ]
    }
  ]
}
```

## Example Lists

### "Longest Documented Performances By Song"
- **Category**: Songs
- **Items**: 50+ songs
- **Item Type**: song
- **Metadata**: duration, date, venue

### "Countries DMB Has Played In"
- **Category**: Venues
- **Items**: 12 countries
- **Item Type**: text
- **Metadata**: show count

### "Live Trax Series Release Info Grid"
- **Category**: Releases
- **Items**: 50+ releases
- **Item Type**: release
- **Metadata**: date, venue, tracks

### "DMB + Phish"
- **Category**: Timelines
- **Items**: Shows where members collaborated
- **Item Type**: show
- **Metadata**: date, guests, songs

### "Shows with 6+ Songs at 10:00 or Longer"
- **Category**: Shows
- **Items**: Marathon shows
- **Item Type**: show
- **Metadata**: total time, song count

## Integration with Database

See `LISTS_SCHEMA.md` for:
- SQLite schema definitions
- Import strategies
- Query examples
- Next.js API routes

## Error Handling

### Common Issues

**1. No lists found**
```
ERROR: No lists found! Check HTML structure.
```
**Solution**: Verify Lists.aspx structure hasn't changed. Check `.release-series` selector.

**2. Empty list items**
```
Failed to parse list 44: Longest Documented Performances By Song
```
**Solution**: Inspect ListView.aspx HTML. The list may use a different structure.

**3. Rate limit exceeded**
```
Failed to load https://dmbalmanac.com/ListView.aspx?id=XX
```
**Solution**: Increase delay between requests. Wait 5 minutes before retrying.

### Debugging

Enable verbose logging:
```typescript
// In lists.ts, add logging
console.log("HTML structure:", $.html().substring(0, 500));
```

Inspect cached HTML:
```bash
ls -lh scraper/cache/
cat scraper/cache/www_dmbalmanac_com_ListView_aspx_id_44.html | less
```

## Maintenance

### Re-scrape Frequency
- **Recommended**: Monthly
- **Reason**: Lists updated when new shows added

### Schema Evolution
If dmbalmanac changes list structure:

1. Test scraper: `npm run test:lists`
2. Inspect HTML in cache files
3. Update selectors in `lists.ts`
4. Re-run full scrape

### Data Validation

After scraping, validate output:
```bash
# Check JSON validity
cat scraper/output/lists.json | jq '.totalItems'

# Count list categories
cat scraper/output/lists.json | jq '[.lists[].category] | group_by(.) | map({category: .[0], count: length})'

# Find lists with no items
cat scraper/output/lists.json | jq '.lists[] | select(.itemCount == 0) | .title'
```

## Performance

### Typical Scrape Time
- **List index**: 2-5 seconds
- **Per list**: 3-5 seconds (with delay)
- **Total (~45 lists)**: 3-5 minutes

### Resource Usage
- **Memory**: < 100 MB
- **Disk (cache)**: ~5 MB HTML
- **Network**: ~200 KB per list

## Best Practices

1. **Always test first**: Run `npm run test:lists` before full scrape
2. **Respect rate limits**: Don't modify delay settings
3. **Use cache during development**: Avoid redundant requests
4. **Check checkpoints**: Verify resume functionality works
5. **Validate output**: Ensure all categories parsed correctly
6. **Document changes**: Update this file if HTML structure changes
