# DMB Almanac - Consolidated Quick Reference

## Scraper

### Active Scrapers (13 total)
- `shows.ts` - ShowSetlist.aspx - 2,800+ shows, setlists, guests, soundcheck
- `songs.ts` - SongStats.aspx - 200+ songs, play counts, first/last played
- `song-stats.ts` - SongStats.aspx (enhanced) - slot breakdown, durations, segues, liberation
- `venues.ts` - VenueStats.aspx - 500+ venues, city/state/country
- `venue-stats.ts` - VenueStats.aspx (enhanced) - capacity, previous names, top songs
- `guests.ts` - GuestStats.aspx - 100+ guests, instruments, appearances
- `tours.ts` - TourShowInfo.aspx - 83 tours, show/venue counts, top songs
- `releases.ts` - ReleaseView.aspx - 150+ releases, track listings
- `rarity.ts` - ShowRarity.aspx - rarity index per tour
- `liberation.ts` - Liberation.aspx - gap tracking, last played dates
- `history.ts` - ThisDayinHistory.aspx - 366 calendar days
- `lists.ts` - ListView.aspx - 40+ curated lists
- Coverage: ~85-90% of available data

### URL Patterns
- Shows by year: `/TourShow.aspx?where=YYYY`
- Show detail: `/ShowSetlist.aspx?id=ID` (alt: `/TourShowSet.aspx?id=ID`)
- Song list: `/SongSearchResult.aspx`
- Song detail: `/SongStats.aspx?sid=ID`
- Venue detail: `/VenueStats.aspx?vid=ID`
- Guest detail: `/GuestStats.aspx?gid=ID`
- Guest shows: `/TourGuestShows.aspx?gid=ID`
- Tour detail: `/TourShowInfo.aspx?tid=ID`
- Releases: `/DiscographyList.aspx`
- Release detail: `/ReleaseView.aspx?release=ID`
- Rarity: `/ShowRarity.aspx`
- Liberation: `/Liberation.aspx`
- Lists: `/Lists.aspx`, `/ListView.aspx?id=ID`
- Calendar: `/ThisDayinHistory.aspx?month=M&day=D`

### Data Formats
- Dates: ISO 8601 internally (`YYYY-MM-DD`), European dot on site (`DD.MM.YYYY`)
- Duration: seconds internally, `MM:SS` display
- IDs: `id=` (show), `sid=` (song), `vid=` (venue), `gid=` (guest), `tid=` (tour), `release=` (release)

### Rate Limiting
- Concurrency: 2 concurrent requests
- Throughput: 5 requests per 10 seconds
- Delay: 1-3s between requests
- All HTML cached locally in `scraper/cache/`
- Cache checked before every request; no rate limiting on cache hits

### New Scraper Template
```typescript
import PQueue from "p-queue";
import { cacheHtml, getCachedHtml, saveCheckpoint, loadCheckpoint } from "./utils/cache.js";

export async function scrapeAllFeatures() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const queue = new PQueue({ concurrency: 2, intervalCap: 5, interval: 10000 });
  try {
    const checkpoint = loadCheckpoint("features");
    const completed = new Set(checkpoint?.completed || []);
    const allData = checkpoint?.data || [];
    // process items, checkpoint every 50
    return allData;
  } finally {
    await browser.close();
  }
}
```

### Scrape Times (estimated)
- Shows: 30-60 min | Songs: 10-15 min | Song Stats: 30-45 min
- Venues: 5-10 min | Venue Stats: 10-15 min | Guests: 2-5 min
- Tours: 5-10 min | Releases: 5-10 min | Rarity: 5 min
- Liberation: 1 min | History: 60-90 min | Lists: 10-15 min
- Full scrape total: ~4-6 hours

### Known Gaps
- Guest -> show reverse mapping (one-way only: shows -> guests)
- Song date-by-date performance records (summary stats only)
- Venue individual show records (count only)
- Year-by-year statistics (pages accessed but data not preserved)

### Troubleshooting
- Parser fails: use CSS selectors over regex (`$(".title").text()` > regex)
- Missing data: implement fallback extraction (primary selector -> alt selector -> regex)
- 429 errors: reduce concurrency to 1, intervalCap to 3, increase delay
- Interrupted: just re-run; auto-resumes from checkpoint

### File Structure
```
scraper/
├── src/scrapers/       # All scraper files + index.ts
├── src/utils/          # cache.js, rate-limit.js, helpers.js
├── src/types.ts        # TypeScript interfaces
├── output/             # JSON output files
├── cache/              # Cached HTML
└── checkpoints/        # Scraper progress
```

---

## D3 Optimization

### D3 Modules in Use
- `d3-selection` (8KB) - DOM manipulation
- `d3-scale` (12KB) - data scaling
- `d3-sankey` (8KB) - TransitionFlow (keep)
- `d3-force` (22KB) - GuestNetwork (keep)
- `d3-geo` (16KB) - TourMap (keep)
- `d3-transition` (3KB) - animations
- `d3-axis` (8KB) - REMOVE, replace with native SVG
- `d3-drag` (3KB) - REMOVE, unused

### Removal: d3-axis
- Create `/src/lib/utils/native-axis.ts` with `createAxisTop()`, `createAxisLeft()`, `createAxisBottom()`, `createAxisRight()`
- Update imports in: SongHeatmap.svelte, GapTimeline.svelte, RarityScorecard.svelte
- Remove `loadD3Axis()` from `d3-loader.ts`
- Remove `d3-axis` and `@types/d3-axis` from package.json

### Removal: d3-drag
- Remove `loadD3Drag()` from `d3-loader.ts`
- Remove from 'guests' preload case in `preloadVisualization()`
- Remove `d3-drag` and `@types/d3-drag` from package.json

### Replacement: scaleSqrt
- In `force-simulation.worker.ts`: replace `scaleSqrt` import with inline:
```typescript
const createSqrtScale = (value: number, maxValue: number, rangeMin: number, rangeMax: number): number => {
  if (maxValue === 0) return rangeMin;
  const t = Math.sqrt(value / maxValue);
  return rangeMin + t * (rangeMax - rangeMin);
};
```

### Bundle Impact
- Savings: ~11.5KB gzipped (8.8% reduction)
- New code overhead: ~300 bytes (native-axis.ts + createSqrtScale)

### Implementation Order
1. Remove d3-drag (10 min)
2. Replace scaleSqrt (10 min)
3. Create native-axis.ts (5 min)
4. Replace d3-axis in SongHeatmap (20 min)
5. Replace d3-axis in GapTimeline (20 min)
6. Replace d3-axis in RarityScorecard (20 min)
7. Remove d3-axis from package.json (5 min)
8. Verify: `npm run test && npm run check && npm run build`

### D3 + Svelte Rule
- D3 for data transforms/scales only, not DOM
- `d3.scaleLinear()` yes, `d3.select().append()` no

---

## PWA

### Quick Win: Periodic Sync
- Register in `+layout.svelte` after background sync setup:
```typescript
if ('serviceWorker' in navigator) {
  const registration = await navigator.serviceWorker.ready;
  if ('periodicSync' in registration) {
    await (registration as any).periodicSync.register('check-data-freshness', {
      minInterval: 24 * 60 * 60 * 1000
    });
  }
}
```
- Browser: Chrome 80+, Edge 80+, not Safari

### Quick Win: Badging API
- Show pending offline mutation count on app icon:
```typescript
import { setAppBadge, clearAppBadge } from '$lib/utils/appBadge';
$effect(() => {
  const pendingCount = offlineMutationQueue.filter(
    (item) => item.status === 'pending' || item.status === 'retrying'
  ).length;
  pendingCount > 0 ? setAppBadge(pendingCount) : clearAppBadge();
});
```
- Browser: Chrome 81+, Edge 81+, Safari 16+ (partial)

### Quick Win: File Handle Storage
- Store `FileSystemFileHandle` from `launchQueue` for save-back
- Key functions: `storeFileHandle()`, `getFileHandle()`, `saveToOriginalFile()`, `clearFileHandle()`
- Requires `readwrite` permission (granted on file open)
- Browser: Chrome 86+, Edge 86+, not Safari

### Quick Win: Window Controls Overlay
- CSS env vars: `titlebar-area-height`, `titlebar-area-width`
- `html { padding-top: max(env(safe-area-inset-top), env(titlebar-area-height)); }`
- Title bar: `position: fixed; -webkit-app-region: drag;`
- Interactive elements: `-webkit-app-region: no-drag;`
- Browser: Chrome 85+, Edge 85+, not Safari

### PWA Debugging
```javascript
// Periodic sync check
navigator.serviceWorker.ready.then(reg => {
  reg.periodicSync.getTags().then(tags => console.log('Sync tags:', tags));
});
// Badge test
navigator.setAppBadge(5);
navigator.clearAppBadge();
// Launch queue check
console.log('launchQueue available:', 'launchQueue' in window);
```

### Service Worker Gotchas
- Changes apply after ALL tabs closed
- Build required (no SW in dev mode)
- Enable "Update on reload" in DevTools for testing
- Cache invalidation: increment version in `sw.js`

---

## Testing

### Commands
```bash
npm run check             # Type check
npm run test              # Run tests
npm run build             # Production build
npm run build && npm run preview  # Test PWA
```

### PWA Testing
- Chrome DevTools > Application tab
- Check: Service Workers, Manifest, Storage
- Simulate periodic sync in Service Workers panel
- Go offline, make changes, verify badge appears, go online, verify sync

### D3 Visualization QA
- SongHeatmap: axes render, x-labels rotated -45deg, y-labels left-aligned
- GapTimeline: y-axis dates, x-axis numeric, grid alignment
- RarityScorecard: axes scaled to data
- GuestNetwork: force sim initializes, node sizes proportional, no overlap

---

## Performance

### Targets (Chromium 143 / Apple Silicon)
- LCP < 1.0s | INP < 100ms | CLS < 0.05 | FCP < 1.0s | TTFB < 400ms

### Animation Performance (Apple Silicon GPU)
- Scroll animation: 120fps (8.33ms/frame) on ProMotion
- Zero CPU usage when GPU-accelerated
- Always animate `transform`/`opacity`, never `top`/`left`/`position`

### Bundle Size Checks
- After D3 cleanup: ~11.5KB gzipped savings
- Popover API, @starting-style, CSS range syntax: 0 bytes (native browser)

---

## Chromium 143+ Features

### Already Implemented
- `<dialog>` elements (PWA modals)
- Scroll-driven animations (header progress bar)
- CSS container queries (Card, Table, Pagination)
- GPU acceleration (all interactive components)

### @starting-style Animations (15 min)
```css
:global(dialog) {
  opacity: 1; transform: translateY(0);
  transition: opacity 300ms, transform 300ms, display 300ms allow-discrete;
}
@starting-style {
  :global(dialog[open]) { opacity: 0; transform: translateY(20px); }
}
:global(dialog:not([open])) { opacity: 0; transform: translateY(20px); }
```
- Chrome 117+, Safari 17.2+, Firefox 123+

### Popover API (30 min)
```html
<button popovertarget="mobile-nav">Menu</button>
<nav id="mobile-nav" popover="auto">...</nav>
```
- Auto light-dismiss, keyboard accessible
- Chrome 114+, Safari 17.2+, Firefox 125+
- Check support: `if ('showPopover' in element) element.showPopover();`

### CSS Range Syntax (30 min)
```css
/* Old */ @media (min-width: 640px) and (max-width: 1023px) { }
/* New */ @media (640px <= width < 1024px) { }
```
- Chrome 143+, Safari 17.4+, Firefox 128+

### Browser Support Matrix
| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| `<dialog>` | 37+ | 15.4+ | 98+ | 79+ |
| @starting-style | 117+ | 17.2+ | 123+ | 117+ |
| Popover API | 114+ | 17.2+ | 125+ | 114+ |
| CSS Anchor Positioning | 125+ | 17.2+ | 126+ | 125+ |
| CSS Range Syntax | 143+ | 17.4+ | 128+ | 143+ |
| Scroll-driven Animations | 115+ | 16.0+ | 125+ | 115+ |

### Common Pitfalls
- @starting-style: must target `dialog[open]`, not bare `dialog`
- Popover: check `'showPopover' in element` before calling
- Media range syntax: don't mix old/new syntax in same query
- Animations: use `transform` not `top`/`left` for GPU acceleration

---

## Accessibility

### Popover Tooltips (planned)
- Use Popover API for D3 visualization tooltips
- Keyboard navigation: Tab to focus, Escape to dismiss
- Screen reader: ARIA attributes announced
- Files: GuestNetwork, SongHeatmap, TourMap, GapTimeline, RarityScorecard

### Testing
```
1. Tab through tooltips
2. Hover to show, Escape to hide
3. VoiceOver reads tooltip content
4. Verify ARIA attributes
```

---

## Database

### SQLite (Server)
- `data/dmb-almanac.db` (22MB, WAL mode, foreign keys enabled)
- Use `db.transaction()` for atomic ops
- Run `PRAGMA wal_checkpoint(TRUNCATE)` periodically
- Never run multiple simultaneous write transactions

### Dexie.js (Client)
- `src/lib/db/dexie/` - user data, offline sync
- Always increment version on schema change
- Add upgrade function per version
- Never modify existing tables in same version
- Test: delete IndexedDB in DevTools, reload

---

## Project Structure
```
dmb-almanac/app/
├── src/routes/           # SvelteKit pages
├── src/lib/
│   ├── components/       # 67 Svelte components
│   ├── db/dexie/        # IndexedDB (client)
│   ├── db/server/       # SQLite (server)
│   ├── types/           # TypeScript types
│   └── utils/           # 30+ utilities
├── static/              # PWA manifest, icons, SW
├── data/dmb-almanac.db  # 22MB SQLite
└── scraper/             # dmbalmanac.com scraper
```

### Svelte 5 Runes Cheatsheet
- `let count = $state(0)` - reactive state
- `let doubled = $derived(count * 2)` - computed
- `$effect(() => { ... })` - side effects
- `let { shows, onSelect } = $props()` - component props
- NOT: `let`, `$:`, `$: { ... }` (Svelte 4 syntax)
