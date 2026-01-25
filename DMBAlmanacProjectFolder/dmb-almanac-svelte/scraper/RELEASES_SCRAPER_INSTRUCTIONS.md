# DMBAlmanac Releases Scraper - Instructions

## Overview

The releases scraper extracts discography data from **https://www.dmbalmanac.com/DiscographyList.aspx** and saves detailed release information including:

- Release title
- Release type (studio, live, compilation, video, box set, EP, single)
- Release date
- Cover art URL
- Track listing (song titles, track numbers, disc numbers, duration, source show dates for live tracks)
- Release notes

## Scraper Architecture

### Main Scraper File
- **Location**: `src/scrapers/releases.ts`
- **Functions**:
  - `getReleaseUrls(page)` - Scrapes the discography list page to get all release URLs
  - `parseReleasePage(page, releaseUrl, releaseId)` - Scrapes individual release detail pages
  - `scrapeAllReleases()` - Main orchestration function
  - `saveReleases(releases)` - Saves results to JSON

### Test Script
- **Location**: `src/test-releases-scraper.ts`
- **Purpose**: Test if selectors work and show sample data from the first few releases
- **Usage**:
  ```bash
  cd scraper
  npm run test:releases
  ```

## Running the Scraper

### Option 1: Quick Test (Recommended First Step)

Test if the scraper can connect to dmbalmanac.com and extract release data:

```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper
npm run test:releases
```

This will:
1. Fetch the discography list page
2. Show the first 5 releases found
3. Fetch and parse the first release detail page
4. Show sample track data

### Option 2: Full Scrape (All Releases)

Run the complete scraper to extract all releases:

```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper
npm run scrape:releases
```

This will:
1. Scrape all releases from the discography list
2. Parse details for each release (tracks, dates, cover art, etc.)
3. Save results to `output/releases.json`
4. Create checkpoints every 10 releases for resume capability

### Option 3: Using the Orchestrator

Run the releases scraper as part of the full scraping orchestration:

```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper
npm run scrape releases  # Just releases
npm run scrape:all       # All scrapers including releases
```

## Output Format

The scraper saves results to `output/releases.json`:

```json
{
  "scrapedAt": "2025-01-23T12:34:56.789Z",
  "source": "https://www.dmbalmanac.com",
  "totalItems": 42,
  "releases": [
    {
      "originalId": "1",
      "title": "Crash",
      "releaseType": "studio",
      "releaseDate": "1998-04-29",
      "coverArtUrl": "https://...",
      "tracks": [
        {
          "trackNumber": 1,
          "discNumber": 1,
          "songTitle": "Don't Drink the Water",
          "duration": "6:45",
          "showDate": null
        },
        {
          "trackNumber": 2,
          "discNumber": 1,
          "songTitle": "Pantala Naga Pampa",
          "duration": "4:23",
          "showDate": null
        }
      ],
      "notes": "..."
    }
  ]
}
```

## Data Fields Explained

### Release Object
- **originalId**: Release ID from dmbalmanac.com URL
- **title**: Album/release name
- **releaseType**: One of: `studio`, `live`, `compilation`, `video`, `box_set`, `ep`, `single`
- **releaseDate**: ISO date string (YYYY-MM-DD) or null if not found
- **coverArtUrl**: URL to cover art image
- **tracks**: Array of tracks on the release
- **notes**: Additional release notes/information

### Track Object
- **trackNumber**: Position on disc (1, 2, 3, etc.)
- **discNumber**: Which disc this track is on (1 for single disc)
- **songTitle**: Name of the song
- **duration**: Duration in MM:SS format
- **showDate**: For live tracks, the ISO date of the source show

## Scraper Features

### Rate Limiting
- **Concurrency**: 2 simultaneous requests maximum
- **Request Cap**: 5 requests per 10 seconds (30/minute max)
- **Random Delays**: 1-3 seconds between requests
- **Respectful**: Always includes User-Agent header identifying as educational project

### Caching
- HTML responses are cached to avoid redundant requests
- Cache location: `cache/html/`
- Subsequent runs check cache before hitting the website

### Checkpointing
- Saves progress every 10 releases
- Checkpoint location: `cache/checkpoint_releases.json`
- Allows resuming interrupted scrapes
- Prevents re-scraping already completed releases

### Error Handling
- Gracefully handles missing data (null values instead of crashes)
- Continues processing if individual release fails
- Logs warnings for missing selectors or data
- Fallback strategies for different HTML structures

## Track Listing Parsing

The scraper uses three fallback strategies to extract track listings:

1. **Table-based layout** - Most common format with `<table>` rows
2. **Ordered list format** - Using `<ol>`, `<li>`, or `.track` elements
3. **Paragraph format** - Text patterns like "1. Song Title (duration)"

This ensures compatibility across different page layouts on dmbalmanac.com.

## HTML Selectors

Key selectors used by the scraper:

```javascript
// Release list page
$("a[href*='ReleaseView.aspx']")  // Find all release links

// Release detail page
$("h1")                            // Release title
$("img[src*='cover'], img[src*='album']")  // Cover art
$("table tr", "ol li", ".track")   // Track listings
$("a[href*='SongStats']")          // Song links in tracks
$("a[href*='TourShowSet'], a[href*='ShowSetlist']")  // Live show dates
```

## Resuming an Interrupted Scrape

If the scraper is interrupted (network issue, browser crash, etc.):

1. The checkpoint file is automatically saved every 10 releases
2. Simply run the scraper again with the same command
3. It will automatically resume from where it left off
4. Completed releases are skipped (no duplicates)

Example:
```bash
npm run scrape:releases
# ... scraper crashes at release 37 ...
npm run scrape:releases
# ... resumes at release 38, completes all releases ...
```

## Troubleshooting

### "No releases found" Error
- The website structure may have changed
- HTML selectors may need updating
- Run the test script to debug: `npm run test:releases`

### Missing Track Data
- Some releases may not have track listings on dmbalmanac.com
- Track parsing fallbacks to other strategies if primary fails
- Check logs for parsing warnings

### Slow Performance
- Rate limiting (2 requests concurrent, 30/min max) is intentional to respect the website
- First run caches HTML; subsequent runs use cache for development

### Memory Issues with Large Datasets
- The scraper processes releases sequentially to minimize memory usage
- Checkpoints save progress to disk

## Database Integration

After scraping, integrate releases.json into the database:

```bash
cd ../
npm run import  # Imports all JSON files from scraper/output/
```

This will:
1. Parse releases.json
2. Normalize track data
3. Link tracks to existing songs
4. Create release records in SQLite database

## Development Notes

### TypeScript Types
- See `src/types.ts` for `ScrapedRelease` and `ScrapedReleaseTrack` interfaces

### Cache Utilities
- `cacheHtml()`, `getCachedHtml()` - HTML caching
- `saveCheckpoint()`, `loadCheckpoint()` - Progress checkpointing

### Helper Functions
- `normalizeWhitespace()` - Clean up extra spaces/newlines
- `parseDate()` - Convert text dates to ISO format
- `slugify()` - Generate URL-friendly names

### Rate Limiter
- Located in `utils/rate-limit.ts`
- Provides `delay()` and `randomDelay()` functions
- Uses `p-queue` for request queuing

## Statistics

Based on the scraper code, expected results:

- **Release Count**: Typically 40-50 studio albums, live albums, compilations, EPs
- **Total Tracks**: 500+ tracks across all releases
- **Live Releases**: Many include source show information
- **Multi-disc Releases**: Box sets may have 5+ discs

## Contact & Support

For issues or questions:
1. Check the test script output: `npm run test:releases`
2. Review logs in the console output
3. Check `cache/checkpoint_releases.json` for progress status
