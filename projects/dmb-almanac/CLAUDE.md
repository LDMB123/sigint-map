# DMB Almanac Svelte - Developer Runbook

## Project Overview
DMB Almanac is a Progressive Web App (PWA) serving as a comprehensive Dave Matthews Band concert database. Built with SvelteKit 2, Svelte 5, SQLite (better-sqlite3), Dexie.js (IndexedDB), and targeting Chromium 143+ on Apple Silicon (macOS Tahoe 26.2).

## Quick Start

### Prerequisites
- Node.js 20+ (LTS)
- macOS Tahoe 26.2 / Apple Silicon M-series
- Chrome/Chromium 143+

### Install Dependencies
```bash
npm install
```

### Environment Variables
No `.env` file required for development. Database path is hardcoded to `data/dmb-almanac.db`.

### Database Setup
```bash
# Initialize empty database with schema
npx tsx scripts/init-db.ts

# Import scraped data (requires JSON files in scraper/output/)
npm run import
```

### Development
```bash
npm run dev        # Start dev server on http://localhost:5173
```

### Production Build
```bash
npm run build      # Create production build
npm run preview    # Preview production build
```

### Type Check
```bash
npm run check      # Svelte type check
```

### Scraper (Data Collection)
```bash
cd scraper
npm install
npm run scrape           # Full data scrape
npm run scrape:venues    # Venues only
npm run scrape:songs     # Songs only
npm run scrape:guests    # Guests only
npm run scrape:shows     # Shows only
```

## Project Structure
```
dmb-almanac/app/
├── src/
│   ├── routes/              # SvelteKit routes
│   │   ├── +page.svelte    # Homepage
│   │   ├── +layout.svelte  # Root layout
│   │   ├── shows/          # Show pages
│   │   ├── songs/          # Song pages
│   │   ├── venues/         # Venue pages
│   │   └── ...
│   ├── lib/
│   │   ├── components/     # Svelte components
│   │   │   └── visualizations/  # D3 visualizations
│   │   ├── db/             # Database layer
│   │   │   ├── dexie/      # IndexedDB (client)
│   │   │   ├── server/     # SQLite (server)
│   │   │   ├── schema.sql  # Database schema
│   │   │   └── index.ts    # DB initialization
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   ├── app.css             # Global styles
│   └── app.html            # HTML template
├── static/                  # Static assets
│   ├── icons/              # PWA icons
│   ├── manifest.json       # Web App Manifest
│   └── sw.js               # Service Worker
├── data/                    # SQLite database
│   └── dmb-almanac.db      # 22MB concert database
├── scripts/                 # Utility scripts
│   ├── export-to-json.ts   # Export SQLite to JSON
│   └── import-data.ts      # Import scraped data
├── scraper/                 # Data scraper for dmbalmanac.com
├── .claude/                 # Claude Code configuration
│   ├── agents/             # 15 specialized agents
│   ├── skills/             # 18 reusable skills
│   ├── AGENT_ROSTER.md     # Agent documentation
│   └── SKILLS_LIBRARY.md   # Skills documentation
├── svelte.config.js        # SvelteKit config
├── vite.config.ts          # Vite config
└── package.json
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
2. Create query in `src/lib/db/server/queries.ts`

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
| Metric | Target | Notes |
|--------|--------|-------|
| LCP | < 1.0s | SSR + preloading |
| INP | < 100ms | scheduler.yield() |
| CLS | < 0.05 | Reserved space |
| FCP | < 1.0s | SSR |
| TTFB | < 400ms | SQLite WAL mode |

## Database

### SQLite (Server-side)
- Location: `data/dmb-almanac.db`
- Size: ~22MB
- Tables: venues, songs, tours, shows, setlist_entries, guests, releases, etc.
- Configuration: WAL mode, foreign keys enabled

### Dexie.js (Client-side)
- Location: `src/lib/db/dexie/`
- Used for: User data (favorites, attended shows), offline caching
- Schema: Mirrors server schema for offline sync

## Gotchas

### Svelte 5 Runes
- ❌ **Don't use** `let` for reactive state: `let count = 0` (won't react)
- ✅ **Do use** `$state()`: `let count = $state(0)` (reactive)
- ❌ **Don't use** computed with `$:`: `$: doubled = count * 2` (deprecated)
- ✅ **Do use** `$derived()`: `let doubled = $derived(count * 2)`

### SQLite WAL Mode
- Database locks during writes - use batch operations
- Never run multiple write transactions simultaneously
- Use `db.transaction()` wrapper for atomic operations
- WAL file can grow - run `PRAGMA wal_checkpoint(TRUNCATE)` periodically

### Dexie Migrations
- ✅ **Always increment** version number when changing schema
- ❌ **Never modify** existing tables in same version
- ✅ **Add upgrade function** for each version change
- ❌ **Never change** primary key type after creation
- Test migrations: delete IndexedDB in DevTools, reload to trigger migration

### Service Worker
- Changes don't apply until **ALL tabs closed** and reopened
- Must run `npm run build` to test SW changes (dev mode doesn't use SW)
- Chrome DevTools > Application > Service Workers > "Update on reload" helps
- Cache invalidation: increment cache version in `sw.js`

### D3.js with Svelte
- Don't use D3 for DOM manipulation - use Svelte's reactivity
- Use D3 for data transformations and scales only
- Example: `const xScale = d3.scaleLinear()...` ✅, `d3.select().append()` ❌

### Chrome 143+ Features
- View Transitions only work over HTTPS or localhost
- Speculation Rules require `<script type="speculationrules">` in HTML
- scheduler.yield() needs feature flag: chrome://flags/#enable-experimental-web-platform-features

## Agent System

This project uses 15 specialized Claude Code agents for development tasks. See:
- `.claude/AGENT_ROSTER.md` - Agent documentation
- `.claude/SKILLS_LIBRARY.md` - Skills documentation
- `.claude/agents/` - Individual agent definitions
