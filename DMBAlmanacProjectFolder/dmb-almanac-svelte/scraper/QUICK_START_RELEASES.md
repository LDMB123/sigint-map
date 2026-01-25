# Quick Start: Releases Scraper

## 🚀 Run the Scraper (3 steps)

### Step 1: Test
```bash
cd /Users/louisherman/Documents/dmb-almanac/scraper
npm run test:releases
```

**Expected**: List of releases with sample tracks

### Step 2: Scrape
```bash
npm run scrape:releases
```

**Output**: `output/releases.json` with ~40-50 releases

**Time**: 5-10 minutes (depends on rate limiting)

### Step 3: Import
```bash
cd /Users/louisherman/Documents/dmb-almanac
npm run import
```

**Result**: Releases added to `data/dmb-almanac.db`

## 📊 Check Results

```bash
# View JSON output
cat scraper/output/releases.json | jq '.totalItems'

# Query database
sqlite3 data/dmb-almanac.db "SELECT COUNT(*) FROM releases;"
sqlite3 data/dmb-almanac.db "SELECT COUNT(*) FROM release_tracks;"

# List releases
sqlite3 data/dmb-almanac.db "SELECT title, release_type, release_date FROM releases ORDER BY release_date;"
```

## ⚠️ Common Issues

### Test fails - no releases found
```bash
# Page structure may have changed
# Check DMBAlmanac.com manually
open https://dmbalmanac.com/DiscographyList.aspx
```

### Import fails - songs not found
```bash
# Songs must be imported first
npm run scrape:songs
npm run import
```

### Scraper interrupted
```bash
# Just re-run - it will resume from checkpoint
npm run scrape:releases
```

## 📁 File Locations

| File | Location |
|------|----------|
| Scraper | `scraper/src/scrapers/releases.ts` |
| Test | `scraper/src/test-releases-scraper.ts` |
| Output | `scraper/output/releases.json` |
| Cache | `scraper/cache/` |
| Checkpoint | `scraper/cache/checkpoint_releases.json` |
| Database | `data/dmb-almanac.db` |

## 🔧 Advanced

### Clear cache and re-scrape
```bash
rm -rf scraper/cache/*
npm run scrape:releases
```

### Scrape single release (for debugging)
```bash
# Edit releases.ts, add at bottom:
# const testUrl = "https://dmbalmanac.com/ReleaseView.aspx?release=1";
# Then run with tsx
```

### Check specific release in database
```sql
SELECT
  r.title,
  rt.track_number,
  s.title as song_title,
  rt.duration_seconds
FROM releases r
JOIN release_tracks rt ON r.id = rt.release_id
JOIN songs s ON rt.song_id = s.id
WHERE r.id = 1
ORDER BY rt.disc_number, rt.track_number;
```

## 📚 Full Documentation

See `RELEASES_SCRAPER.md` for complete documentation.

## ✅ Success Criteria

After running all 3 steps, you should have:

- [x] `releases.json` file exists
- [x] JSON contains 40+ releases
- [x] Database has matching number of releases
- [x] Database has 400+ release tracks
- [x] No errors in import output

## 🎯 Next Steps

1. Create `/releases` page in web app
2. Display releases with cover art
3. Link tracks to songs
4. Add "On Release" badges to song pages
5. Create discography timeline view
