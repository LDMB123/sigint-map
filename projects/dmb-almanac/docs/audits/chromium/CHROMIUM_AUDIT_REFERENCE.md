# Chromium 143+ Audit Reference - DMB Almanac

## Native API Adoption: 28/28

## Already Eliminated Libraries

- Animation: Framer Motion / GSAP / anime.js -> CSS scroll-driven + WAAPI
- Tooltips: Tippy.js / Radix -> native Popover API
- Dates: date-fns / moment / dayjs -> Date + Intl
- Forms: react-hook-form / yup / zod -> native constraint validation
- CSS-in-JS: styled-components / emotion -> CSS nesting + Svelte scoped
- Virtualization: react-window -> custom VirtualList with content-visibility
- Utilities: lodash / underscore -> native Array methods, `Object.groupBy()`, `structuredClone`

## Production Dependencies

### KEEP

| Package | Size (gzip) | Reason |
|---------|-------------|--------|
| `dexie` v4.2.1 | ~45 KB | 9 schema versions, migrations, transactions, compound indexes, typed errors. Raw IDB too verbose. |
| `d3-selection` | ~12 KB | Data-join enter/update/exit pattern non-trivial to replicate. Lazy-loaded. |
| `d3-sankey` | ~8 KB | Specialized Sankey layout algorithm. No native alternative. Lazy-loaded. |
| `d3-geo` | ~16 KB | Geographic projections. No native alternative. Lazy-loaded. |
| `topojson-client` | ~4 KB | TopoJSON parser. No native alternative. |
| `web-push` v3.6.7 | 76 KB disk | Server-side only. VAPID protocol. 0 KB client bundle. |
| `cheerio` | -- | Server-side scraper. Not bundled. |
| `better-sqlite3` | -- | Server-side database. Not bundled. |

### REMOVE / REPLACE

| Package | Size (gzip) | Action | Effort |
|---------|-------------|--------|--------|
| `d3-axis` | ~4 KB | Remove. `native-axis.js` (494 lines) already exists as complete replacement. | 2-4 hrs |
| `d3-scale` | ~10 KB | Complete migration to `native-scales.js`. Partially done. | 4-8 hrs |
| `d3-drag` | ~4 KB | Replace with Pointer Events API (`pointerdown`/`pointermove`/`pointerup` + `setPointerCapture()`). ~40 lines native code. | 3-5 hrs |

## CSS Fallbacks to Remove

All `@supports not (...)` blocks for features native in Chrome 105+ are dead code:

| Feature | Chrome Version | Location |
|---------|---------------|----------|
| `light-dark()` | 123+ | `app.css:555` |
| `oklch()` | 111+ | `app.css:582` |
| `color-mix()` | 111+ | `app.css:637, 659` |
| `anchor-name` | 125+ | `app.css:1752`, `anchor-positioning.css:293` |
| `content-visibility` | 85+ | `app.css:2667` |
| `animation-timeline: scroll()` | 115+ | `scroll-animations.css:621`, `discography/+page.svelte:670`, `tours/+page.svelte:404`, `tours/[year]/+page.svelte:471`, `guests/[slug]/+page.svelte:408` |
| `animation-timeline: view()` | 115+ | Multiple component files |
| `container-type: inline-size` | 105+ | `discography/+page.svelte:696` |
| `:has()` | 105+ | `tours/+page.svelte:418` |

Savings: ~2-3 KB CSS (uncompressed)

## Vendor Prefixes to Remove

- `-webkit-overflow-scrolling: touch` in `VirtualList.svelte:393` -- unnecessary since Chrome 62+, Safari-only property

## `new Date()` Remnants (~30 call sites)

- `sitemap.xml/+server.js`: `new Date().toISOString()`
- `monitoring/errors.js`: `timestamp: new Date()`
- `errors/logger.js`, `errors/types.js`: same pattern
- `pwa/pushNotificationEnhanced.js`: `new Date()`, `.getHours()`
- `db/dexie/sync.js`: `new Date().getFullYear()` -> `getYear()` from dateUtils.js
- `db/dexie/validation/*.js`: timestamps
- `utils/contentIndex.js`: date formatting -> `formatDate()` from dateUtils.js
- `utils/compression-monitor.js`: timestamps
- `api/push-subscribe/+server.js`: date parsing
- Risk: `new Date('YYYY-MM-DD')` parses as UTC midnight and can shift dates by timezone. Use `parseDate()`/`formatDate()` from dateUtils.js for date-only strings.

## Native APIs Adopted

| API | Chrome | Implementation |
|-----|--------|---------------|
| View Transitions | 111+ | `viewTransitions.js`, `viewTransitionMPA.js` |
| CSS Scroll-Driven Animations | 115+ | `scroll-animations.css` (600+ lines) |
| Web Animations API | 84+ | `webAnimationsAPI.js` (834 lines) |
| Popover API | 114+ | `popoverAPI.js`, `popover.js` |
| CSS Anchor Positioning | 125+ | `anchor-positioning.css` |
| `<dialog>` | 37+ | `showModal()` |
| Date + Intl | 137+ | `dateUtils.js` (264 lines) |
| Navigation API | 102+ | `navigationApi.js` |
| Speculation Rules | 109+ | `speculationRules.js`, `SpeculationRules.svelte` |
| `content-visibility` | 85+ | `contentVisibility.js` (370 lines) |
| CSS Nesting | 120+ | Throughout |
| CSS `@scope` | 118+ | `scoped-patterns.css` |
| `Intl.RelativeTimeFormat` | 71+ | `dateUtils.js` |
| `Intl.DateTimeFormat` | 24+ | Throughout |
| `IntersectionObserver` | 51+ | D3 lazy loading, content visibility |
| `ResizeObserver` | 64+ | VirtualList, visualizations |
| `structuredClone` | 98+ | Stores/services |
| `AbortController` | 66+ | Debounce, fetch cancellation |
| `AbortSignal.timeout()` | 103+ | Services |
| `Object.groupBy()` | 117+ | Data processing |
| `navigator.share` | 89+ | `web-share.js` |
| `navigator.clipboard` | 66+ | Share functionality |
| CSS `oklch()` | 111+ | Color system |
| CSS `color-mix()` | 111+ | Theme system |
| CSS `light-dark()` | 123+ | Dark mode |
| Web Locks API | 69+ | `webLocks.js` |
| Scheduler API | 94+ | `scheduler.js` |
| Storage Manager API | 55+ | Quota monitoring |
| Container Queries | 105+ | Layout patterns |

## D3 Lazy Loading

- All D3 modules loaded via `d3-loader.js` with `IntersectionObserver` trigger
- Never in initial bundle -- loads only when visualizations scroll into view
- Used by: TransitionFlow, GapTimeline, SongHeatmap, RarityScorecard, GuestNetwork, TourMap

## Chrome 143+ IDB Improvements (Future Reference)

- `IDBFactory.databases()` for listing databases
- `IDBObjectStore.getAll()` / `getAllKeys()` for batch reads
- `IDBTransaction` durability hints (`"strict"`, `"relaxed"`)

## Priority Actions

### HIGH (Low effort, measurable impact)
- Remove `d3-axis` from package.json, update `d3-loader.js` to use `native-axis.js` (-4 KB)
- Remove all `@supports not` CSS fallback blocks (-2-3 KB)
- Remove `-webkit-overflow-scrolling: touch` (dead code)

### MEDIUM (Moderate effort)
- Complete `d3-scale` -> `native-scales.js` migration (-10 KB)
- Replace `d3-drag` with Pointer Events API (-4 KB)
- Migrate 30 `new Date()` call sites to Temporal (correctness)

### LOW (High effort or blocked)
- Removed `@js-temporal/polyfill` (Date + Intl path is native)
- Replace `d3-selection` with native DOM (-12 KB, 20-40 hrs)
- Replace `dexie` with raw IndexedDB (-45 KB, 100+ hrs)

## Total Remaining Bundle Savings

- Easy wins: ~20 KB gzipped (`d3-axis` + `d3-scale` + `d3-drag` + CSS)
- Maximum theoretical: ~71 KB gzipped (includes Dexie replacement, not recommended)
