# Releases Scraper - Quick Start Guide

## TL;DR - Run in 3 Commands

```bash
# 1. Enter scraper directory
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper

# 2. Test the scraper (fast, 5-10 seconds)
npm run test:releases

# 3. Run full scraper (will take 10-20 minutes)
npm run scrape:releases
```

After completion, check results:
```bash
# View the output file
ls -lh output/releases.json

# See how many releases were scraped
cat output/releases.json | grep -o '"originalId"' | wc -l
```

---

## What Gets Scraped

The scraper extracts from: **https://www.dmbalmanac.com/DiscographyList.aspx**

**Per Release**:
- Title (album name)
- Release type (studio, live, compilation, video, box set, EP, single)
- Release date (ISO format: YYYY-MM-DD)
- Cover art image URL
- Complete track listing:
  - Track number
  - Song title
  - Duration (MM:SS)
  - Disc number (for multi-disc)
  - Source show date (for live tracks)
- Release notes/description

**Expected Results**:
- 40-50 releases total
- 300-400+ unique songs
- 500+ total track entries

---

## File Locations

| File | Path |
|------|------|
| Output (after scrape) | `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/output/releases.json` |
| Instructions | `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/RELEASES_SCRAPER_INSTRUCTIONS.md` |
| Test script | `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/test-releases-scraper.ts` |
| Main scraper | `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/scrapers/releases.ts` |

---

## Available Commands

```bash
# Quick test (5-10 seconds)
npm run test:releases

# Full scrape of all releases
npm run scrape:releases

# Run scraper with progress monitoring
npm run scrape:releases 2>&1 | tee releases-scrape.log

# Just releases as part of larger scrape
npm run scrape releases

# All scrapers including releases
npm run scrape:all
```

---

## Monitoring Progress

### Option 1: Watch the Logs
```bash
npm run scrape:releases
```
Shows real-time progress like:
```
[1/42] Crash (11 tracks)
[2/42] Before These Crowded Streets (13 tracks)
...
```

### Option 2: Monitor Checkpoint (in separate terminal)
```bash
watch -n 2 'wc -l < scraper/cache/checkpoint_releases.json'
```

### Option 3: Check File Size Growing
```bash
watch -n 2 'ls -lh scraper/output/releases.json'
```

---

## Output Format

The scraper creates `output/releases.json`:

```json
{
  "scrapedAt": "2025-01-23T14:30:45.123Z",
  "source": "https://www.dmbalmanac.com",
  "totalItems": 42,
  "releases": [
    {
      "originalId": "1",
      "title": "Crash",
      "releaseType": "studio",
      "releaseDate": "1998-04-29",
      "coverArtUrl": "https://dmbalmanac.com/...",
      "tracks": [
        {
          "trackNumber": 1,
          "discNumber": 1,
          "songTitle": "Don't Drink the Water",
          "duration": "6:45"
        },
        {
          "trackNumber": 2,
          "discNumber": 1,
          "songTitle": "Pantala Naga Pampa",
          "duration": "4:23"
        }
      ],
      "notes": "..."
    }
  ]
}
```

---

## Troubleshooting

### "Command not found: npm"
Make sure you're in the scraper directory:
```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper
npm --version  # Should show npm version
```

### Test says "No releases found"
The website structure may have changed. Check:
1. Is dmbalmanac.com accessible? Try in browser: https://www.dmbalmanac.com/DiscographyList.aspx
2. Run test again to see exact error: `npm run test:releases`

### Scraper stops midway
It's OK! The scraper checkpoints every 10 releases. Just run again:
```bash
npm run scrape:releases
```
It will resume from where it left off.

### Want to start fresh?
```bash
rm cache/checkpoint_releases.json
npm run scrape:releases  # Starts over
```

### Too slow?
The scraper is rate-limited to be respectful (30 requests/minute max). This is intentional. Expected time: 10-20 minutes.

---

## After Scraping

### Import to Database
```bash
cd ../
npm run import
```

### View the Data
```bash
# Quick stats
cat scraper/output/releases.json | jq '.totalItems'
cat scraper/output/releases.json | jq '.releases | length'
cat scraper/output/releases.json | jq '.releases[0]'
```

### Check How Many Tracks Total
```bash
cat scraper/output/releases.json | jq '[.releases[].tracks | length] | add'
```

---

## Need More Details?

See the full analysis:
- Full technical analysis: `/Users/louisherman/ClaudeCodeProjects/RELEASES_SCRAPER_ANALYSIS.md`
- Detailed instructions: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/RELEASES_SCRAPER_INSTRUCTIONS.md`

---

## One-Liner for Full Workflow

```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper && npm run test:releases && npm run scrape:releases && echo "✓ Done! Results in output/releases.json"
```

Or with import:

```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper && npm run scrape:releases && cd .. && npm run import && echo "✓ Imported to database!"
```

---

## Expected Timeline

| Step | Time | Notes |
|------|------|-------|
| npm run test:releases | 5-10 sec | Verify selectors work |
| npm run scrape:releases | 10-20 min | Scrapes 40+ releases |
| npm run import | 1-2 min | Imports to SQLite |
| **Total** | **15-25 min** | First-time setup |

---

## Rate Limiting Info

The scraper respectfully limits requests:
- **Max**: 30 requests per minute
- **Concurrent**: 2 requests at a time
- **Delays**: 1-3 seconds between requests

This protects dmbalmanac.com while still providing good throughput (scrapes entire discography in ~15-20 minutes).
