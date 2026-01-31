# DMB Almanac Svelte - Developer Runbook

## Project Overview
DMB Almanac is a Progressive Web App (PWA) serving as a comprehensive Dave Matthews Band concert database. Built with SvelteKit 2, Svelte 5, SQLite (better-sqlite3), Dexie.js (IndexedDB), and targeting Chromium 143+ on Apple Silicon (macOS Tahoe 26.2).

## Documentation Quick Reference

**Compressed Summaries (80-90% token savings):**
- **GPU Development**: `.compressed/GPU_COMPUTE_DEVELOPER_GUIDE_SUMMARY.md` (750 tokens vs 7,500)
- **Rust/Native API**: `.compressed/NATIVE_API_AND_RUST_DEEP_DIVE_2026_SUMMARY.md` (650 tokens vs 6,100)
- **Modernization Audit**: `.compressed/MODERNIZATION_AUDIT_2026_SUMMARY.md` (450 tokens vs 5,000)
- **GPU Testing**: `.compressed/GPU_TESTING_GUIDE_SUMMARY.md` (400 tokens vs 4,200)
- **Rust Migration Plan**: `.compressed/RUST_NATIVE_API_MODERNIZATION_SUMMARY.md` (500 tokens vs 3,900)
- **Hybrid WebGPU/Rust**: `.compressed/HYBRID_WEBGPU_RUST_20_WEEK_PLAN_SUMMARY.md` (500 tokens vs 3,700)
- **Accessibility**: `.compressed/ACCESSIBILITY_AUDIT_DMB_ALMANAC_SUMMARY.md` (450 tokens vs 3,400)
- **Chromium 143**: `.compressed/IMPLEMENTATION_GUIDE_CHROMIUM_143_SUMMARY.md` (450 tokens vs 3,300)
- **Tier 1 Implementation**: `.compressed/DMB_TIER_1_IMPLEMENTATION_GUIDE_SUMMARY.md` (450 tokens vs 3,250)
- **Security**: `.compressed/SECURITY_IMPLEMENTATION_GUIDE_SUMMARY.md` (260 tokens vs 3,200)

**Full Documentation**: Organized in `docs/` by category: `gpu/`, `reports/`, `guides/`, `architecture/`, `audits/`

## Quick Start

**Prerequisites**: Node.js 20+, macOS 26.2 / Apple Silicon, Chrome 143+

**Setup & Dev**:
```bash
npm install               # Install dependencies
npx tsx scripts/init-db.ts  # Initialize database
npm run import            # Import scraped data
npm run dev               # Start dev server (localhost:5173)
npm run build             # Production build
npm run check             # Type check
```

**Scraper**:
```bash
cd scraper && npm install
npm run scrape            # Full scrape
npm run scrape:[venues|songs|guests|shows]  # Targeted scrape
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
LCP <1.0s • INP <100ms • CLS <0.05 • FCP <1.0s • TTFB <400ms
*See: `.compressed/IMPLEMENTATION_GUIDE_CHROMIUM_143_SUMMARY.md`*

## Database

**SQLite (Server)**: `data/dmb-almanac.db` (22MB, WAL mode, foreign keys enabled)
**Dexie.js (Client)**: `src/lib/db/dexie/` (user data, offline sync)

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

### Documentation Organization
- **Project root**: Only CLAUDE.md and README.md
- **Scattered files**: Run `.claude/scripts/enforce-organization.sh` before commit
- **All docs**: Organized in `docs/` subdirectories (reports/, guides/, audits/, etc.)

## Agent System

This project uses 15 specialized Claude Code agents for development tasks. See:
- `.claude/AGENT_ROSTER.md` - Agent documentation
- `.claude/SKILLS_LIBRARY.md` - Skills documentation
- `.claude/agents/` - Individual agent definitions

## Report Writing Standards

When writing reports:
- Use bullet points, not paragraphs
- No introductions or conclusions
- Technical shorthand allowed (e.g., "impl" for implementation)
- Omit articles (a, the) where meaning is clear
- No filler phrases ("it's important to note that...")
