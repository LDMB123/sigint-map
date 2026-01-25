# Curated Lists Scraper

Extracts expert-curated special interest lists from DMBAlmanac.com, including statistical compilations, historical collections, and thematic groupings.

## Quick Start

### Test the Scraper
```bash
npm run test:lists
```

### Run Full Scrape
```bash
npm run scrape:lists
```

### Output Location
```
scraper/output/lists.json
```

## What This Scrapes

The Lists scraper extracts all curated lists from `https://dmbalmanac.com/Lists.aspx`, including:

### List Categories
- **Almanac Updates**: New shows added, site changes
- **Songs**: Longest performances, rare songs, special versions
- **Venues**: Venue statistics, geographic coverage
- **Releases**: Live Trax series, DMBlive series info grids
- **Timelines**: Historical events, tour chronicles, collaborations
- **Shows**: Marathon shows, statistical highlights, availability

### Example Lists
- "Longest Documented Performances By Song" (50+ items)
- "Countries DMB Has Played In" (12 items)
- "Live Trax Series Release Info Grid" (50+ items)
- "DMB + Phish" (collaboration timeline)
- "Shows with 6+ Songs at 10:00 or Longer" (marathon shows)

## Features

- Multi-strategy HTML parsing (table, div, and link-based)
- Automatic item type detection (show, song, venue, guest, release, text)
- Rate limiting (2 concurrent, 5 req/10sec)
- HTML caching for development
- Checkpoint support for resumable scrapes
- Metadata extraction from list items

## Data Structure

### ScrapedList
```typescript
{
  originalId: "44",
  title: "Longest Documented Performances By Song",
  slug: "longest-documented-performances-by-song",
  category: "Songs",
  description: "A comprehensive list of the longest...",
  itemCount: 50,
  items: [...]
}
```

### ScrapedListItem
```typescript
{
  position: 1,
  itemType: "song",
  itemId: "123",
  itemTitle: "Lie in Our Graves",
  itemLink: "https://dmbalmanac.com/SongStats.aspx?sid=123",
  notes: "42:15 - Red Rocks 1995-08-15",
  metadata: {
    "duration": "42:15",
    "date": "1995-08-15",
    "venue": "Red Rocks Amphitheatre"
  }
}
```

## Database Integration

### Required Tables
```sql
-- List metadata
CREATE TABLE curated_lists (
  id INTEGER PRIMARY KEY,
  original_id TEXT UNIQUE,
  title TEXT,
  slug TEXT UNIQUE,
  category TEXT,
  description TEXT,
  item_count INTEGER,
  created_at TEXT,
  updated_at TEXT,
  scraped_at TEXT
);

-- List items
CREATE TABLE curated_list_items (
  id INTEGER PRIMARY KEY,
  list_id INTEGER,
  position INTEGER,
  item_type TEXT,
  item_id TEXT,
  item_title TEXT,
  item_link TEXT,
  notes TEXT,
  metadata TEXT,
  FOREIGN KEY (list_id) REFERENCES curated_lists(id)
);
```

See `docs/LISTS_SCHEMA.md` for complete schema and query examples.

## Usage Examples

### Get All Lists by Category
```typescript
const lists = db.prepare(`
  SELECT * FROM curated_lists
  WHERE category = ?
  ORDER BY title
`).all('Songs');
```

### Get List with Items
```typescript
const list = db.prepare(`
  SELECT * FROM curated_lists WHERE slug = ?
`).get('longest-documented-performances-by-song');

const items = db.prepare(`
  SELECT * FROM curated_list_items
  WHERE list_id = ?
  ORDER BY position
`).all(list.id);
```

### Find Lists Containing a Show
```typescript
const lists = db.prepare(`
  SELECT DISTINCT l.title, i.position, i.notes
  FROM curated_lists l
  JOIN curated_list_items i ON l.id = i.list_id
  WHERE i.item_type = 'show' AND i.item_id = ?
`).all('12345');
```

## File Structure

```
scraper/
├── src/
│   ├── scrapers/
│   │   └── lists.ts           # Main scraper implementation
│   └── test-lists-scraper.ts  # Test script
├── docs/
│   ├── LISTS_SCRAPER.md       # Detailed documentation
│   └── LISTS_SCHEMA.md        # Database schema
├── output/
│   └── lists.json             # Scraped data
└── cache/
    ├── checkpoint_lists.json  # Resume checkpoint
    └── *.html                 # Cached HTML responses
```

## Scraper Configuration

### Rate Limiting
```typescript
{
  concurrency: 2,           // Max 2 parallel requests
  intervalCap: 5,           // Max 5 requests...
  interval: 10000,          // ...per 10 seconds
  randomDelay: [1000, 3000] // 1-3 second delay between
}
```

### Checkpointing
- Saves progress every 5 lists
- Resume automatically on restart
- Located at: `cache/checkpoint_lists.json`

## Troubleshooting

### No Lists Found
**Symptom**: Test shows "Found 0 curated lists"
**Solution**: Check if Lists.aspx structure changed. Inspect cached HTML.

### Empty List Items
**Symptom**: Lists have `itemCount: 0`
**Solution**: ListView.aspx may use different HTML structure. Update selectors.

### Rate Limiting Errors
**Symptom**: HTTP errors or timeouts
**Solution**: Wait 5 minutes, then retry. Delay settings are already conservative.

## Development

### Add New Item Type
If dmbalmanac adds a new entity type:

1. Update `ScrapedListItem['itemType']` in `src/types.ts`
2. Add URL pattern matching in `lists.ts`
3. Update database schema in `LISTS_SCHEMA.md`

### Modify Parsing Strategy
If HTML structure changes:

1. Run `npm run test:lists` to identify issue
2. Inspect cached HTML in `cache/`
3. Update parsing logic in `parseListPage()` function
4. Re-test before full scrape

## Performance

- **List index**: 2-5 seconds
- **Per list**: 3-5 seconds
- **Total (~45 lists)**: 3-5 minutes
- **Memory usage**: < 100 MB
- **Cache size**: ~5 MB

## Documentation

- **LISTS_SCRAPER.md**: Detailed implementation guide
- **LISTS_SCHEMA.md**: Database schema and queries
- **types.ts**: TypeScript type definitions

## Related Scrapers

- **shows.ts**: Individual show data
- **songs.ts**: Song catalog
- **venues.ts**: Venue directory
- **releases.ts**: Discography information
- **liberation.ts**: Liberation tracking (special list)

## Contributing

When modifying the scraper:

1. Test changes: `npm run test:lists`
2. Update documentation
3. Validate output: `cat output/lists.json | jq .`
4. Commit with clear message

## License

Part of the DMB Almanac Clone project - Educational purposes only.
