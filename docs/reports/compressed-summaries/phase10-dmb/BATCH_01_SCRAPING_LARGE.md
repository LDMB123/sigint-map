# Phase 10 Batch 01: Scraping Documentation - Large Files (Ultra-Compressed)

**Original:** 5 files, 15-24KB each (~104 KB total, ~26K tokens)
**Compressed:** 5 single-line summaries (~2 KB, ~500 tokens)
**Ratio:** 98.1% reduction

---

1. **DMBALMANAC_HTML_STRUCTURE_REFERENCE** | DMBAlmanac.com scraper selector guide | ASP.NET WebForms (table layouts, minimal CSS) | URL patterns: ?id/?sid/?vid/?gid/?tid | Date format: MM.DD.YY→YYYY-MM-DD | Pages: show setlists, song stats, venue stats, guest stats, tours, song lists | Key selectors documented | Static content (no pagination) | JavaScript: charts/modals only

2. **Guest_Shows_Scraper_Spec** | Guest musician appearance scraper spec | Module: guest-shows.ts | URL: TourGuestShows.aspx?gid=[ID] | Extracts: per-song instruments, complete appearance history | Data: guest name, instruments, total appearances, first/last shows, date-venue-songs table | Implementation: TypeScript scraper with Cheerio | Target: 127+ guest musicians

3. **TOUR_STATS_IMPLEMENTATION_ROADMAP** | Tour statistics scraper enhancement roadmap | Current: 30% coverage (8/26 metrics) | Captured: basic info, show count, songs | Missing: quality metrics, geographic distribution, duration stats, positioning, debuts, show types, rarity | Phased implementation plan | Priority: P0 (basic coverage) → P1 (analytics) → P2 (advanced) | Estimated: 18 fields to add

4. **TOUR_STATS_EXTRACTION_GUIDE** | Tour stats page scraping guide | URL: TourStats.aspx?tid=[ID] | Sections: header (name, years, show count), map, stats tables, show list, song list | Tables: plays by date/by show/by segment/by venue | Charts: plays_chart.gif, slots_chart.gif | Extraction patterns for each metric type | Quality metrics: unknown/cancelled/rescheduled counts

5. **RELEASES_SCRAPER_CODE_REFERENCE** | Releases scraper implementation reference | File: app/scraper/src/scrapers/releases.ts | Functions: scrapeReleases(), extractAlbumDetails(), parseReleaseDate() | Selectors: .release-table, .album-row, .track-listing | Data: title, release date, format, tracks, duration | Error handling: retry logic, rate limiting | Output: JSON releases array

---

**Batch 01 Complete**
**Recovery:** 104 KB disk + ~26K tokens (98.1% compression)

**Full documents:** `projects/dmb-almanac/docs/scraping/`
