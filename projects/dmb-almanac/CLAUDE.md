# DMB Almanac Svelte - Developer Runbook

## Project Overview
DMB Almanac is a Progressive Web App (PWA) serving as a comprehensive Dave Matthews Band concert database. Built with SvelteKit 2, Svelte 5, SQLite (better-sqlite3), Dexie.js (IndexedDB), and targeting Chromium 143+ on Apple Silicon (macOS Tahoe 26.2).

## Documentation

See `app/docs/INDEX.md` for organized reference docs. Key compressed references:
- Bundle optimization: `app/docs/bundle/BUNDLE_REFERENCE.md`
- Memory management: `app/docs/memory/MEMORY_REFERENCE.md`
- PWA features: `app/docs/pwa/PWA_REFERENCE.md`
- WASM integration: `docs/wasm/WASM_REFERENCE.md`
- Window Controls: `app/docs/reference/WCO_REFERENCE.md`
- Scraping: `docs/scraping/SCRAPING_REFERENCE.md`
- DB architecture: `app/docs/reference/database-architecture/DATABASE_ARCHITECTURE_REFERENCE.md`

Full docs: `docs/INDEX.md` - guides, reports, audits, gpu, wasm, scraping

## Quick Start

**Prerequisites**: Node.js 20+, macOS 26.2 / Apple Silicon, Chrome 143+

```bash
npm install               # Install dependencies
npm run import            # Import scraped data
npm run dev               # Start dev server (localhost:5173)
npm run build             # Production build
npm run check             # Type check
```

## Project Structure
```
dmb-almanac/app/
├── src/routes/           # SvelteKit pages
├── src/lib/
│   ├── components/       # Svelte components (67)
│   ├── db/
│   │   ├── dexie/       # IndexedDB (client)
│   │   └── server/      # SQLite (server)
│   ├── types/           # TypeScript types
│   └── utils/           # Utilities (30+)
├── static/              # PWA manifest, icons, SW
├── data/dmb-almanac.db  # 22MB SQLite database
├── scripts/             # Import/export utilities
└── scraper/             # dmbalmanac.com data scraper
```

## Key Technologies
- **Framework**: SvelteKit 2 with Svelte 5
- **Reactivity**: Svelte 5 runes ($state, $derived, $effect)
- **Database**: SQLite (server) + Dexie.js/IndexedDB (client)
- **Visualizations**: D3.js, d3-sankey
- **Styling**: CSS with oklch colors
- **PWA**: vite-plugin-pwa, Workbox
- **Build**: Vite

## Common Tasks

### Add a new route
1. Create `src/routes/[route]/+page.svelte`
2. Add `+page.server.ts` for server data loading
3. Add navigation link in layout

### Add a database query
1. Add TypeScript types in `src/lib/types/`
2. Add server query in `src/routes/[route]/+page.server.ts`

### Test PWA functionality
1. Build production: `npm run build && npm run preview`
2. Open Chrome DevTools > Application tab
3. Check Service Workers, Manifest, Storage

## Svelte 5 Patterns

### State Management
```svelte
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);

  $effect(() => {
    console.log('Count changed:', count);
  });
</script>
```

### Props
```svelte
<script>
  let { shows = [], onSelect } = $props();
</script>
```

## Performance Targets (Chromium 143 / Apple Silicon)
LCP <1.0s | INP <100ms | CLS <0.05 | FCP <1.0s | TTFB <400ms

## Database

**SQLite (Server)**: `data/dmb-almanac.db` (22MB, WAL mode, foreign keys enabled)
**Dexie.js (Client)**: `src/lib/db/dexie/` (user data, offline sync)

## Gotchas

### Svelte 5 Runes
Use `$state()` not `let`, `$derived()` not `$:`, `$effect()` not `$: {...}`

### SQLite WAL
Locks during writes. Use `db.transaction()` for atomic ops. Never run multiple write transactions simultaneously. Run `PRAGMA wal_checkpoint(TRUNCATE)` periodically.

### Dexie Migrations
Always increment version on schema change. Add upgrade function per version. Never modify existing tables in same version or change primary key type. Test: delete IndexedDB in DevTools, reload.

### Service Worker
Changes apply after ALL tabs closed. Build required (no SW in dev). Enable "Update on reload" in DevTools. Cache invalidation: increment version in `sw.js`.

### D3.js with Svelte
D3 for data transforms/scales only, not DOM. `d3.scaleLinear()` yes, `d3.select().append()` no.

### Chrome 143+
View Transitions: HTTPS/localhost only. Speculation Rules: `<script type="speculationrules">`. scheduler.yield(): needs feature flag.

### Organization
Project root: Only CLAUDE.md and README.md. All docs in `docs/` and `app/docs/` subdirectories.

## Report Writing Standards

- Bullet points, not paragraphs
- No introductions or conclusions
- Technical shorthand allowed
- Omit articles where meaning is clear
- No filler phrases
