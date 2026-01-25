# DMBAlmanac Releases Scraper

## Overview

The releases scraper extracts DMB's official discography from DMBAlmanac.com, including albums, live releases, DVDs, compilations, and other releases.

## Files

- **Scraper**: `/Users/louisherman/Documents/dmb-almanac/scraper/src/scrapers/releases.ts`
- **Output**: `/Users/louisherman/Documents/dmb-almanac/scraper/output/releases.json`
- **Database Import**: `/Users/louisherman/Documents/dmb-almanac/scripts/import-data.ts` (updated)

## Usage

### Run the Scraper

```bash
cd /Users/louisherman/Documents/dmb-almanac/scraper
npm install
npm run scrape:releases
```

### Import to Database

After scraping, import the data:

```bash
cd /Users/louisherman/Documents/dmb-almanac
npm run import
```

## Target URLs

### Main Discography List
- **URL**: `https://dmbalmanac.com/DiscographyList.aspx`
- **Purpose**: Get list of all releases with IDs and titles
- **Selector Pattern**: `a[href*='ReleaseView.aspx?release=']`

### Release Detail Pages
- **URL Pattern**: `https://dmbalmanac.com/ReleaseView.aspx?release={ID}`
- **Purpose**: Get detailed information about each release
- **Data Extracted**:
  - Release title
  - Release type (studio, live, compilation, etc.)
  - Release date
  - Cover art URL
  - Track listing with durations
  - Source show dates (for live tracks)

## Data Structure

### ScrapedRelease
```typescript
interface ScrapedRelease {
  originalId?: string;          // Release ID from dmbalmanac URL
  title: string;                 // Album/release name
  releaseType: string;           // studio, live, compilation, video, etc.
  releaseDate?: string;          // Release date (ISO format)
  coverArtUrl?: string;          // URL to cover art image
  tracks: ScrapedReleaseTrack[]; // Track listing
  notes?: string;                // Additional notes
}
```

### ScrapedReleaseTrack
```typescript
interface ScrapedReleaseTrack {
  trackNumber: number;    // Track position on disc
  discNumber: number;     // Disc number (for multi-disc sets)
  songTitle: string;      // Song name
  duration?: string;      // Track duration (M:SS format)
  showDate?: string;      // Source show date (for live tracks)
  venueName?: string;     // Source venue (for live tracks)
}
```

## HTML Parsing Patterns

### Release List Page Selectors
```javascript
// Find all release links
$("a[href*='ReleaseView.aspx']").each((_, el) => {
  const href = $(el).attr("href");
  const releaseMatch = href.match(/release=([^&]+)/);
  const title = $(el).text().trim();
});
```

### Release Detail Page Selectors

#### Title Extraction
```javascript
// Primary: h1 element
const title = $("h1").first().text().trim();

// Fallback: page title
const title = $("title").text().replace(/DMB Almanac.*?[-:]?/i, "");
```

#### Release Type Detection
```javascript
const pageText = $("body").text().toLowerCase();

if (pageText.includes("live album")) {
  releaseType = "live";
} else if (pageText.includes("compilation")) {
  releaseType = "compilation";
} else if (pageText.includes("dvd") || pageText.includes("video")) {
  releaseType = "video";
} else if (pageText.includes("box set")) {
  releaseType = "box_set";
} else if (pageText.includes("ep")) {
  releaseType = "ep";
}
```

#### Track Listing Parsing

**Pattern 1: Table-based tracklist**
```javascript
$("table tr, .tracklist tr").each((_, row) => {
  const $row = $(row);

  // Check for disc header
  if (headerText.includes("disc")) {
    const discMatch = headerText.match(/disc\s*(\d+)/i);
    currentDiscNumber = parseInt(discMatch[1], 10);
    return;
  }

  // Extract song link
  const songLink = $row.find("a[href*='SongStats']").first();
  const songTitle = songLink.text().trim();

  // Extract track number from first cell
  const trackMatch = $row.find("td").first().text().match(/^\s*(\d+)/);

  // Extract duration
  const durationCell = $row.find("td").filter((i, td) => {
    return /\d+:\d{2}/.test($(td).text());
  });

  // Extract source show (for live tracks)
  const dateLink = $row.find("a[href*='TourShowSet']").first();
});
```

**Pattern 2: List-based tracklist**
```javascript
$("ol li, .track, .song-item").each((i, el) => {
  const songLink = $(el).find("a[href*='SongStats']").first();
  const songTitle = songLink.text().trim();
  const trackNumber = i + 1;

  // Extract duration from text
  const durationMatch = $(el).text().match(/(\d+:\d{2})/);
});
```

**Pattern 3: Paragraph-based tracklist**
```javascript
$("p").each((idx, p) => {
  const text = $(p).text();

  // Look for pattern: "1. Song Title" or "1 - Song Title"
  const trackMatch = text.match(/^\s*(\d+)[\.\-\)]\s*(.+)/);

  // Extract duration if present
  const durationMatch = songTitle.match(/\((\d+:\d{2})\)/);
});
```

#### Cover Art Extraction
```javascript
const coverImg = $("img[src*='cover'], img[src*='album']").first();
const coverArtUrl = coverImg.attr("src");
```

## Database Schema

### releases Table
```sql
CREATE TABLE releases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  release_type TEXT CHECK(release_type IN ('studio', 'live', 'compilation', 'ep', 'single', 'video', 'box_set')),
  release_date TEXT,
  catalog_number TEXT,
  cover_art_url TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### release_tracks Table
```sql
CREATE TABLE release_tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES songs(id),
  track_number INTEGER NOT NULL,
  disc_number INTEGER DEFAULT 1,
  duration_seconds INTEGER,
  show_id INTEGER REFERENCES shows(id),
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### performance_releases Table (M2M)
```sql
CREATE TABLE performance_releases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setlist_entry_id INTEGER NOT NULL REFERENCES setlist_entries(id),
  release_id INTEGER NOT NULL REFERENCES releases(id),
  release_track_id INTEGER REFERENCES release_tracks(id),
  UNIQUE(setlist_entry_id, release_id)
);
```

## Rate Limiting

The scraper follows ethical scraping practices:

- **Concurrency**: 2 concurrent requests maximum
- **Rate**: 5 requests per 10 seconds (30 per minute max)
- **Delay**: 1-3 second random delay between requests
- **User Agent**: `DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)`

## Caching & Checkpointing

### HTML Caching
- All fetched HTML is cached to `/Users/louisherman/Documents/dmb-almanac/scraper/cache/`
- Cache filenames are URL-based (sanitized)
- Re-running the scraper uses cached HTML to avoid redundant requests

### Progress Checkpointing
- Progress saved every 10 releases to `/Users/louisherman/Documents/dmb-almanac/scraper/cache/checkpoint_releases.json`
- Checkpoint includes:
  - `completedIds`: Array of release IDs already scraped
  - `releases`: Array of scraped release objects
  - `timestamp`: When checkpoint was saved
- Scraper resumes from last checkpoint on restart

### Resuming After Interruption
```bash
# If scraper crashes or is stopped, simply re-run
npm run scrape:releases

# It will automatically:
# 1. Load the checkpoint
# 2. Skip already-completed releases
# 3. Continue from where it left off
```

## Error Handling

### Common Issues

**Missing Title**
```
Warning: No title found for release {ID}
Fallback: Uses "Release {ID}"
```

**Missing Song Reference**
```
Warning: Song not found for track: "{song_title}" on {release_title}
Action: Track is skipped, logged in import output
```

**Unparseable Date**
```
Warning: Could not parse date: {date_str}
Action: Release saved with null release_date
```

**Invalid Release Type**
```
Action: Defaults to "studio"
```

## Output Format

### releases.json
```json
{
  "scrapedAt": "2026-01-15T10:30:00.000Z",
  "source": "https://www.dmbalmanac.com",
  "totalItems": 45,
  "releases": [
    {
      "originalId": "123",
      "title": "Under the Table and Dreaming",
      "releaseType": "studio",
      "releaseDate": "1994-09-27",
      "coverArtUrl": "https://dmbalmanac.com/images/covers/utatd.jpg",
      "tracks": [
        {
          "trackNumber": 1,
          "discNumber": 1,
          "songTitle": "The Best of What's Around",
          "duration": "4:17"
        },
        {
          "trackNumber": 2,
          "discNumber": 1,
          "songTitle": "What Would You Say",
          "duration": "3:42"
        }
      ],
      "notes": "Debut studio album"
    }
  ]
}
```

## Testing

### Test Individual Release
```typescript
// In releases.ts, add test code at bottom:
if (import.meta.url === `file://${process.argv[1]}`) {
  const testUrl = "https://www.dmbalmanac.com/ReleaseView.aspx?release=123";
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const release = await parseReleasePage(page, testUrl, "123");
  console.log(JSON.stringify(release, null, 2));
  await browser.close();
}
```

### Validate Output
```bash
# Check JSON syntax
cat scraper/output/releases.json | jq '.'

# Count releases
cat scraper/output/releases.json | jq '.totalItems'

# List release titles
cat scraper/output/releases.json | jq '.releases[].title'

# Check for missing tracks
cat scraper/output/releases.json | jq '.releases[] | select(.tracks | length == 0)'
```

## Known Limitations

1. **Dynamic Content**: If DMBAlmanac uses heavy JavaScript rendering, some content may not be captured. The scraper uses Playwright for robust page loading.

2. **Tracklist Variations**: Different releases may have different HTML structures for tracklists. The scraper uses multiple parsing patterns to handle variations.

3. **Multi-Disc Sets**: Disc numbering is detected from "Disc N" headers in the tracklist. If not found, all tracks default to disc 1.

4. **Show Matching**: For live tracks, show dates are extracted but not automatically matched to shows in the database during scraping. The import script handles this lookup.

5. **Cover Art**: Cover art URLs are captured as-is. They may be relative paths requiring BASE_URL prepending.

## Future Enhancements

- **Catalog Numbers**: Extract label and catalog information
- **Personnel Credits**: Parse musician credits for studio albums
- **Chart Performance**: Scrape chart positions and certifications
- **Track Previews**: Link to audio samples if available
- **Release Variants**: Handle different editions (remastered, deluxe, etc.)
- **Automatic Show Matching**: Link live tracks to specific shows during scraping

## Troubleshooting

### No releases found
```bash
# Check if page structure changed
curl -s "https://dmbalmanac.com/DiscographyList.aspx" | grep -i "ReleaseView"
```

### Tracks not importing
```bash
# Check song titles match between songs.json and releases.json
cat scraper/output/songs.json | jq '.songs[].title' | sort > songs.txt
cat scraper/output/releases.json | jq '.releases[].tracks[].songTitle' | sort | uniq > tracks.txt
comm -13 songs.txt tracks.txt  # Shows tracks missing from songs
```

### Scraper hangs
```bash
# Check rate limiter isn't too aggressive
# Edit src/scrapers/releases.ts and increase interval/intervalCap if needed
# Default: concurrency: 2, intervalCap: 5, interval: 10000 (5 req per 10 sec)
```

## Contact

For issues with the scraper, check:
- DMBAlmanac.com for site structure changes
- GitHub issues for dmb-almanac project
- CLAUDE.md for overall project documentation
