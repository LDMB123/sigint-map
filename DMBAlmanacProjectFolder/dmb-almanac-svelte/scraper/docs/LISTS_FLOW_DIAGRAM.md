# Curated Lists Scraper Flow Diagram

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DMBAlmanac Lists Scraper                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────┐
        │  1. Fetch Lists.aspx (Index Page)      │
        │     - Load checkpoint (if exists)       │
        │     - Parse list links by category      │
        └────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────┐
        │  2. Extract List Metadata              │
        │     - List ID (from URL)                │
        │     - Title (from link text)            │
        │     - Category (from header)            │
        └────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────┐
        │  3. For Each List (with rate limit)    │
        │     - Fetch ListView.aspx?id=XXX        │
        │     - Check cache first                 │
        │     - Add 1-3 second delay              │
        └────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────┐
        │  4. Parse List Detail Page             │
        │     - Extract description               │
        │     - Try parsing strategies:           │
        │       • Strategy 1: Table-based         │
        │       • Strategy 2: Div-based           │
        │       • Strategy 3: Simple links        │
        └────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────┐
        │  5. Extract List Items                 │
        │     - Position in list                  │
        │     - Item type (show/song/venue/etc)   │
        │     - Item ID (from URL)                │
        │     - Item title                        │
        │     - Notes and metadata                │
        └────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────┐
        │  6. Save Progress                      │
        │     - Checkpoint every 5 lists          │
        │     - Cache HTML responses              │
        └────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────┐
        │  7. Output JSON File                   │
        │     - scraper/output/lists.json         │
        │     - Structured ScrapedList[] array    │
        └────────────────────────────────────────┘
```

## Detailed Parsing Flow

### Phase 1: Index Parsing

```
https://dmbalmanac.com/Lists.aspx
              │
              ▼
   ┌──────────────────────┐
   │  Load HTML (cached?) │
   └──────────────────────┘
              │
              ▼
   ┌──────────────────────────────────────────────┐
   │  Find all .release-series containers         │
   └──────────────────────────────────────────────┘
              │
              ▼
   ┌──────────────────────────────────────────────┐
   │  For each container:                         │
   │    1. Get category from .headerpanel         │
   │    2. Find a[href*='ListView.aspx'] links    │
   │    3. Extract id= from each href             │
   │    4. Get title from link text               │
   └──────────────────────────────────────────────┘
              │
              ▼
   ┌──────────────────────────────────────────────┐
   │  Result: Array of                            │
   │  { id, title, category }                     │
   └──────────────────────────────────────────────┘
```

### Phase 2: Detail Parsing

```
https://dmbalmanac.com/ListView.aspx?id=44
              │
              ▼
   ┌──────────────────────┐
   │  Load HTML (cached?) │
   └──────────────────────┘
              │
              ▼
   ┌──────────────────────────────────────────────┐
   │  Extract description from .subtitle          │
   └──────────────────────────────────────────────┘
              │
              ▼
   ┌──────────────────────────────────────────────┐
   │  Try Strategy 1: Table-based parsing         │
   │    • Find table rows                         │
   │    • Extract links and metadata from cells   │
   │    • Success? → Use this strategy            │
   └──────────────────────────────────────────────┘
              │ (if items.length === 0)
              ▼
   ┌──────────────────────────────────────────────┐
   │  Try Strategy 2: Div-based parsing           │
   │    • Find .hanging-indent elements           │
   │    • Extract links from each div             │
   │    • Success? → Use this strategy            │
   └──────────────────────────────────────────────┘
              │ (if items.length === 0)
              ▼
   ┌──────────────────────────────────────────────┐
   │  Try Strategy 3: Simple link parsing         │
   │    • Find all relevant link types            │
   │    • Extract in document order               │
   └──────────────────────────────────────────────┘
              │
              ▼
   ┌──────────────────────────────────────────────┐
   │  For each item found:                        │
   │    1. Detect type from URL pattern           │
   │    2. Extract ID from URL                    │
   │    3. Get title from link text               │
   │    4. Extract notes/metadata                 │
   │    5. Assign position number                 │
   └──────────────────────────────────────────────┘
              │
              ▼
   ┌──────────────────────────────────────────────┐
   │  Result: ScrapedList with items              │
   └──────────────────────────────────────────────┘
```

## Item Type Detection Flow

```
                    Extract URL from <a> tag
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Check URL pattern                      │
        └─────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
    Contains                                  Contains
  "TourShowSet"?                            "SongStats"?
        │                                           │
        ▼                                           ▼
   ┌─────────┐                               ┌─────────┐
   │  SHOW   │                               │  SONG   │
   │ id=XXX  │                               │ sid=XXX │
   └─────────┘                               └─────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
    Contains                                  Contains
  "VenueStats"?                            "GuestStats"?
        │                                           │
        ▼                                           ▼
   ┌─────────┐                               ┌─────────┐
   │  VENUE  │                               │  GUEST  │
   │ vid=XXX │                               │ gid=XXX │
   └─────────┘                               └─────────┘
                              │
                              ▼
                        Contains "Release"?
                              │
                              ▼
                         ┌─────────┐
                         │ RELEASE │
                         │ rid=XXX │
                         └─────────┘
                              │
                              ▼
                       No match found?
                              │
                              ▼
                         ┌─────────┐
                         │  TEXT   │
                         │ (no ID) │
                         └─────────┘
```

## Rate Limiting Flow

```
┌─────────────────────────────────────────┐
│  PQueue Configuration                   │
│    concurrency: 2                       │
│    intervalCap: 5                       │
│    interval: 10000ms                    │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  For each list to scrape:               │
│    1. Add to queue                      │
│    2. Queue ensures rate limits         │
│    3. Wait for slot to become available │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Execute request                        │
│    - Fetch HTML                         │
│    - Parse content                      │
│    - Cache result                       │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Add random delay                       │
│    - Between 1-3 seconds                │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Continue to next item                  │
└─────────────────────────────────────────┘
```

## Checkpoint and Resume Flow

```
        ┌─────────────────────────────────┐
        │  Start scraper                  │
        └─────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────┐
        │  Check for checkpoint file      │
        └─────────────────────────────────┘
                      │
           ┌──────────┴──────────┐
           │                     │
        EXISTS               DOESN'T EXIST
           │                     │
           ▼                     ▼
┌───────────────────┐   ┌───────────────────┐
│  Load checkpoint  │   │  Start from       │
│    - completedIds │   │  beginning        │
│    - lists[]      │   │  (empty arrays)   │
└───────────────────┘   └───────────────────┘
           │                     │
           └──────────┬──────────┘
                      │
                      ▼
        ┌─────────────────────────────────┐
        │  Filter remaining lists         │
        │  (skip completedIds)            │
        └─────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────┐
        │  Process each remaining list    │
        └─────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────┐
        │  Every 5 lists:                 │
        │    - Save checkpoint            │
        │    - Update completedIds        │
        │    - Save lists[] so far        │
        └─────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────┐
        │  All complete? Final checkpoint │
        └─────────────────────────────────┘
```

## Data Flow Through System

```
┌──────────────────────────────────────────────────────────────────┐
│                       DMBAlmanac.com                             │
│  https://dmbalmanac.com/Lists.aspx                               │
│  https://dmbalmanac.com/ListView.aspx?id=XXX                     │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (HTTP requests with caching)
┌──────────────────────────────────────────────────────────────────┐
│                    Scraper (lists.ts)                            │
│  - Playwright browser automation                                 │
│  - Cheerio HTML parsing                                          │
│  - Rate limiting (p-queue)                                       │
└──────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│  Cache (HTML files)     │   │  Checkpoint (progress)  │
│  cache/*.html           │   │  cache/checkpoint_      │
│                         │   │    lists.json           │
└─────────────────────────┘   └─────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Output (JSON)                                 │
│  scraper/output/lists.json                                       │
│  {                                                               │
│    scrapedAt: "...",                                             │
│    totalItems: 45,                                               │
│    lists: [                                                      │
│      { originalId, title, slug, category, items: [...] }        │
│    ]                                                             │
│  }                                                               │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Import script)
┌──────────────────────────────────────────────────────────────────┐
│                   SQLite Database                                │
│  data/dmb-almanac.db                                             │
│                                                                  │
│  curated_lists:                                                  │
│    - id, original_id, title, slug, category, description         │
│                                                                  │
│  curated_list_items:                                             │
│    - id, list_id, position, item_type, item_id, item_title      │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (API queries)
┌──────────────────────────────────────────────────────────────────┐
│                   Next.js Application                            │
│  /app/lists/page.tsx          (List index by category)           │
│  /app/lists/[slug]/page.tsx   (Individual list detail)           │
│  /api/lists/route.ts          (JSON API endpoint)                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      User Browser                                │
│  Browsable curated lists with filtering and search               │
└──────────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
                     Scrape List
                          │
                          ▼
              ┌───────────────────────┐
              │  Try to fetch HTML    │
              └───────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
        SUCCESS                       FAIL
            │                           │
            ▼                           ▼
┌───────────────────────┐   ┌───────────────────────┐
│  Cache HTML           │   │  Log error            │
└───────────────────────┘   │  Return null          │
            │               │  Continue to next     │
            ▼               └───────────────────────┘
┌───────────────────────┐
│  Try to parse         │
└───────────────────────┘
            │
┌───────────┴───────────┐
│                       │
PARSED              PARSE ERROR
│                       │
▼                       ▼
┌───────────────────┐   ┌───────────────────────┐
│  Return list      │   │  Log error            │
│  Add to results   │   │  Return null          │
└───────────────────┘   │  Continue to next     │
            │           └───────────────────────┘
            ▼
┌───────────────────────────┐
│  Save checkpoint          │
│  (every 5 lists)          │
└───────────────────────────┘
```

## Performance Optimization

```
┌─────────────────────────────────────────┐
│  Request for List Page                  │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Check Cache                            │
│    - MD5 hash of URL                    │
│    - Look in cache/ directory           │
└─────────────────────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
  FOUND             NOT FOUND
    │                   │
    ▼                   ▼
┌─────────┐   ┌───────────────────────┐
│  Return │   │  Fetch from dmbalmanac│
│  cached │   │  Wait in rate limiter │
│  HTML   │   │  Save to cache        │
└─────────┘   └───────────────────────┘
    │                   │
    └─────────┬─────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Parse HTML with Cheerio                │
│    - Fast in-memory parsing             │
│    - No browser overhead (for cached)   │
└─────────────────────────────────────────┘
```

This scraper is designed to be:
- **Efficient**: Caching and rate limiting
- **Resilient**: Error handling and checkpointing
- **Respectful**: Conservative rate limits
- **Maintainable**: Clear separation of concerns
- **Resumable**: Checkpoint-based progress tracking
