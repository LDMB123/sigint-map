# Curated Lists Database Schema

This document describes the database schema needed to store curated lists from DMBAlmanac.com.

## Overview

DMBAlmanac maintains expert-curated lists covering special interest topics such as:
- Longest song performances
- Rare songs by album
- Venue statistics and milestones
- Guest collaboration highlights
- Release information grids
- Timeline-based collections

## SQLite Schema

### Table: `curated_lists`

Main table storing list metadata.

```sql
CREATE TABLE curated_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- DMBAlmanac reference
  original_id TEXT NOT NULL UNIQUE, -- List ID from ListView.aspx?id=XXX

  -- Identification
  title TEXT NOT NULL,              -- "Longest Documented Performances By Song"
  slug TEXT NOT NULL UNIQUE,        -- URL-friendly version: "longest-documented-performances-by-song"
  category TEXT NOT NULL,           -- "Songs", "Venues", "Shows", "Releases", etc.

  -- Metadata
  description TEXT,                 -- Purpose/context for the list
  item_count INTEGER DEFAULT 0,     -- Number of items in the list

  -- Timestamps
  created_at TEXT NOT NULL,         -- ISO 8601 timestamp
  updated_at TEXT NOT NULL,         -- ISO 8601 timestamp
  scraped_at TEXT NOT NULL,         -- When this list was last scraped

  -- Indexes
  CHECK (item_count >= 0)
);

CREATE INDEX idx_curated_lists_category ON curated_lists(category);
CREATE INDEX idx_curated_lists_slug ON curated_lists(slug);
CREATE INDEX idx_curated_lists_original_id ON curated_lists(original_id);
```

### Table: `curated_list_items`

Individual items within each list.

```sql
CREATE TABLE curated_list_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- List reference
  list_id INTEGER NOT NULL,
  position INTEGER NOT NULL,        -- Order within list (1-based)

  -- Item type and reference
  item_type TEXT NOT NULL,          -- "show", "song", "venue", "guest", "release", "text"
  item_id TEXT,                     -- Original ID from dmbalmanac (if applicable)
  item_title TEXT NOT NULL,         -- Display name
  item_link TEXT,                   -- Full URL to item page

  -- Additional context
  notes TEXT,                       -- Item-specific notes or context
  metadata TEXT,                    -- JSON object with additional data

  -- Timestamps
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  -- Foreign key
  FOREIGN KEY (list_id) REFERENCES curated_lists(id) ON DELETE CASCADE,

  -- Constraints
  UNIQUE(list_id, position),
  CHECK (position > 0),
  CHECK (item_type IN ('show', 'song', 'venue', 'guest', 'release', 'text'))
);

CREATE INDEX idx_list_items_list_id ON curated_list_items(list_id);
CREATE INDEX idx_list_items_type ON curated_list_items(item_type);
CREATE INDEX idx_list_items_position ON curated_list_items(list_id, position);
```

## Example Data

### List: "Longest Documented Performances By Song"

**curated_lists table:**
```json
{
  "id": 1,
  "original_id": "44",
  "title": "Longest Documented Performances By Song",
  "slug": "longest-documented-performances-by-song",
  "category": "Songs",
  "description": "A comprehensive list of the longest recorded performances for each frequently played song.",
  "item_count": 50,
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-15T10:00:00Z",
  "scraped_at": "2026-01-15T10:00:00Z"
}
```

**curated_list_items table:**
```json
[
  {
    "id": 1,
    "list_id": 1,
    "position": 1,
    "item_type": "song",
    "item_id": "123",
    "item_title": "Lie in Our Graves",
    "item_link": "https://dmbalmanac.com/SongStats.aspx?sid=123",
    "notes": "42:15 - Red Rocks 1995-08-15",
    "metadata": "{\"duration\":\"42:15\",\"date\":\"1995-08-15\",\"venue\":\"Red Rocks\"}"
  },
  {
    "id": 2,
    "list_id": 1,
    "position": 2,
    "item_type": "song",
    "item_id": "456",
    "item_title": "#41",
    "item_link": "https://dmbalmanac.com/SongStats.aspx?sid=456",
    "notes": "27:32 - Gorge 2002-09-01",
    "metadata": "{\"duration\":\"27:32\",\"date\":\"2002-09-01\",\"venue\":\"Gorge\"}"
  }
]
```

### List: "Countries DMB Has Played In"

**curated_lists table:**
```json
{
  "id": 2,
  "original_id": "30",
  "title": "Countries DMB Has Played In",
  "slug": "countries-dmb-has-played-in",
  "category": "Venues",
  "description": "All countries where Dave Matthews Band has performed.",
  "item_count": 12,
  "created_at": "2026-01-15T10:01:00Z",
  "updated_at": "2026-01-15T10:01:00Z",
  "scraped_at": "2026-01-15T10:01:00Z"
}
```

**curated_list_items table:**
```json
[
  {
    "id": 10,
    "list_id": 2,
    "position": 1,
    "item_type": "text",
    "item_id": null,
    "item_title": "United States",
    "item_link": null,
    "notes": "Primary touring territory - over 1,500 shows",
    "metadata": "{\"show_count\":1500}"
  },
  {
    "id": 11,
    "list_id": 2,
    "position": 2,
    "item_type": "text",
    "item_id": null,
    "item_title": "Canada",
    "item_link": null,
    "notes": "Frequent tours since 1990s - 75+ shows",
    "metadata": "{\"show_count\":75}"
  }
]
```

## Data Import Process

When importing scraped data from `scraper/output/lists.json`:

1. **Parse JSON file** containing `ScrapedList[]` array
2. **For each list**:
   - Upsert into `curated_lists` by `original_id`
   - Set timestamps
   - Calculate `item_count`
3. **For each list item**:
   - Delete existing items for this `list_id` (to handle updates)
   - Insert new items with correct `position`
   - Store `metadata` as JSON string

## Query Examples

### Get all lists by category
```sql
SELECT id, title, slug, item_count, category
FROM curated_lists
WHERE category = 'Songs'
ORDER BY title;
```

### Get list with items
```sql
SELECT
  l.title as list_title,
  l.description,
  i.position,
  i.item_title,
  i.item_type,
  i.notes,
  i.metadata
FROM curated_lists l
INNER JOIN curated_list_items i ON l.id = i.list_id
WHERE l.slug = 'longest-documented-performances-by-song'
ORDER BY i.position;
```

### Find all lists containing a specific show
```sql
SELECT DISTINCT
  l.title,
  l.category,
  i.position,
  i.notes
FROM curated_lists l
INNER JOIN curated_list_items i ON l.id = i.list_id
WHERE i.item_type = 'show' AND i.item_id = '12345';
```

### Get list categories with counts
```sql
SELECT
  category,
  COUNT(*) as list_count,
  SUM(item_count) as total_items
FROM curated_lists
GROUP BY category
ORDER BY list_count DESC;
```

## Integration Notes

### Next.js API Routes

Create `/app/api/lists/route.ts` for list index:
```typescript
import { getDb } from "@/lib/db/client";

export async function GET() {
  const db = getDb();

  const lists = db.prepare(`
    SELECT id, original_id, title, slug, category, item_count, description
    FROM curated_lists
    ORDER BY category, title
  `).all();

  return Response.json({ lists });
}
```

Create `/app/api/lists/[slug]/route.ts` for list detail:
```typescript
import { getDb } from "@/lib/db/client";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const db = getDb();

  const list = db.prepare(`
    SELECT * FROM curated_lists WHERE slug = ?
  `).get(params.slug);

  if (!list) {
    return Response.json({ error: "List not found" }, { status: 404 });
  }

  const items = db.prepare(`
    SELECT * FROM curated_list_items
    WHERE list_id = ?
    ORDER BY position
  `).all(list.id);

  return Response.json({ list, items });
}
```

### Page Routes

Create `/app/lists/page.tsx` for list index
Create `/app/lists/[slug]/page.tsx` for individual list

## Metadata JSON Structure

The `metadata` field stores additional structured data as JSON. Common patterns:

### For song performance lists:
```json
{
  "duration": "42:15",
  "date": "1995-08-15",
  "venue": "Red Rocks Amphitheatre",
  "city": "Morrison, CO"
}
```

### For statistical lists:
```json
{
  "play_count": 847,
  "percentage": "78.5%",
  "first_date": "1991-03-14",
  "last_date": "2025-08-30"
}
```

### For venue/location lists:
```json
{
  "show_count": 25,
  "first_show": "1995-06-10",
  "last_show": "2024-07-15",
  "capacity": 18000
}
```

## Maintenance

- **Re-scrape frequency**: Monthly recommended
- **Upsert strategy**: Use `original_id` to detect updates
- **Item updates**: Delete and re-insert items to handle position changes
- **Archival**: Consider keeping historical snapshots for trending analysis
