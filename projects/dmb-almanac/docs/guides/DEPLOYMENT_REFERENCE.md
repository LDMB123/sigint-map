# DMB Almanac Deployment Reference

## Prerequisites

- Node.js v20+ (LTS), npm v10+, Git latest stable
- Disk: min 2GB for build artifacts
- Browser targets: ES2022+, CSS Container Queries, IndexedDB, Service Workers, Web Push API

```bash
node --version   # v20.x+
npm --version    # v10.x+
```

## Environment Variables

### Required (.env in app/)
```bash
VITE_VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_SUBJECT=mailto:admin@dmbalmanac.com
PUBLIC_SITE_URL=https://dmbalmanac.com
JWT_SECRET=<32-char-random>
PUSH_API_KEY=<32-char-random>
```

### Optional
```bash
PUSH_API_SECRET=<additional-secret>
PUSH_DB_PATH=./push-subscriptions.db
NODE_ENV=production
VITE_SENTRY_DSN=https://your-sentry-dsn
```

### Generate Keys
```bash
npx web-push generate-vapid-keys
openssl rand -base64 32   # run twice for JWT_SECRET + PUSH_API_KEY
```

## Pre-Flight Checks

```bash
cd dmb-almanac/app
rm -rf .svelte-kit build node_modules/.vite   # clean
npm ci                                         # reproducible install
npm run test                                   # unit tests
npm run lint                                   # ESLint
npm run check                                  # Svelte type check
```

### Verify WASM Build
```bash
ls -lh src/lib/wasm/aggregations/index_bg.wasm
# Expected: 119KB (production). If 19KB, run: ../scripts/build-wasm.sh
```

## Build Process

### Development
```bash
npm run dev               # dev server
npm run dev -- --host     # with network access
```

### Production Build
```bash
rm -rf .svelte-kit build  # 1. clean
npm run compress:data     # 2. compress static data
npm run build             # 3. build
npm run preview           # 4. preview locally
```

### Scripts Reference
| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview prod build |
| `npm run test` | Unit tests |
| `npm run test:e2e` | E2E tests |
| `npm run lint` | ESLint |
| `npm run check` | Svelte type checking |
| `npm run compress:data` | Compress static data |
| `npm run constraints` | Initialize DB constraints |

## Deployment Options

### Option 1: Node.js (adapter-node, default)
```bash
npm run build
NODE_ENV=production node build
# or with PM2:
pm2 start build/index.js --name dmb-almanac
```

### Option 2: Docker
- Multi-stage build: `node:20-alpine` builder + runtime
- Copy `build/` + `package*.json`, `npm ci --production`, expose 3000, `CMD ["node", "build"]`
```bash
docker build -t dmb-almanac .
docker run -p 3000:3000 --env-file .env dmb-almanac
```

### Option 3: Vercel
```bash
npm install @sveltejs/adapter-vercel
# update svelte.config.js to use adapter-vercel
vercel --prod
```

### Option 4: Static Hosting (no SSR)
```bash
npm install @sveltejs/adapter-static
# update svelte.config.js
npm run build
# deploy build/ to Cloudflare Pages, Netlify, etc.
# Ensure WASM MIME type: application/wasm
```

## Database Setup

### IndexedDB (Client)
- Uses Dexie.js, auto-initializes on first load
- Schema: `src/lib/db/dexie/schema.js`
- Stores: shows, songs, venues, tours, guests, statistics, userPreferences, cachedPages

### SQLite (Server)
```bash
npm run constraints        # initialize constraints
# Schema: src/lib/db/schema.sql
# Indexes: src/lib/db/performance-indexes.sql
# Migrations: src/lib/db/migrations/
```

## PWA Configuration

- Manifest: `static/manifest.json` (standalone, theme `#030712`, start `/?source=pwa`)
- Service Worker: `sw-optimized.js` - Cache-First (static), Network-First (API), Background Sync, Push
- Icons: `static/icons/` - icon-16/32/72/96/128/144/152/192/384/512.png + maskable-512.png

## Production Optimization

### Compression (nginx)
- Enable gzip + brotli for `text/plain`, `application/javascript`, `text/css`, `application/json`

### CDN / HTTP
- Cache `/_app/immutable/*` indefinitely, pages with appropriate TTL
- Minimum HTTP/2, HTTP/3 (QUIC) recommended for mobile

### Security Headers
- CSP: `default-src 'self'`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`

### Security Hardening
- CSRF (`src/lib/security/csrf.js`), JWT (`src/lib/server/jwt.js`), CSP (`src/hooks.server.js`)
- Rate limiting on API endpoints, input validation in WASM fallback layer

### Feature Flags
```javascript
const ENABLE_NEW_FEATURE = import.meta.env.VITE_ENABLE_NEW_FEATURE === 'true';
// WASM rollout example (inline configuration):
const WASM_CONFIG = { enabled: true, rollout: 10, browsers: ['chrome','edge','firefox','safari'] };
```

## Post-Deploy Checklist

### Immediate (0-15 min)
- [ ] Site loads without JS errors
- [ ] WASM module loads (check Network tab)
- [ ] Service worker registers
- [ ] PWA installs on mobile
- [ ] Push notifications work
- [ ] All routes render correctly

### First Hour (15-60 min)
- [ ] Error rate < 1%
- [ ] LCP < 2.5s, FID < 100ms
- [ ] No memory leaks (Memory tab)
- [ ] Offline mode functional
- [ ] Database syncs properly

## Monitoring

### Built-in Telemetry
- `src/lib/monitoring/errors.js` - error capture
- `src/lib/monitoring/rum.js` - Real User Monitoring
- `src/lib/services/telemetryQueue.js` - batched reporting
- `src/lib/utils/native-web-vitals.js` - Web Vitals

### Health Check
```bash
curl https://dmbalmanac.com/api/health
```

### Key Metrics (first 24h)
- WASM load time <100ms, error rate <1%, perf gain 2-5x vs JS, cache hit >80%
- Events: `wasm-performance` (function, duration, backend), `wasm-error` (error, context)

## Troubleshooting

### Build Fails (ENOENT)
```bash
rm -rf .svelte-kit node_modules/.vite && npm run build
```

### Service Worker Not Updating
- DevTools > Application > Service Workers > Update on reload

### IndexedDB Errors
- DevTools > Application > Storage > IndexedDB > Delete database

### WASM Not Loading
- JS fallbacks activate automatically if WASM fails
- Check MIME type: `Content-Type: application/wasm`
- Check CORS: `Access-Control-Allow-Origin: *`
- Verify correct module size (119KB, not 19KB)
- Debugger open disables optimizations

### Debug Mode
```bash
DEBUG=* npm run dev
npm run test:e2e:debug
```

## Rollback

### WASM-Specific (fastest)
```javascript
// Disable WASM feature flag
export const WASM_CONFIG = { enabled: false, rollout: 0, browsers: [] };
// Or force JS backend per-user
localStorage.setItem('compute-backend', 'javascript');
```

### Git-based
```bash
git checkout <previous-commit>
npm ci && npm run build
# redeploy
```

### Docker
```bash
docker pull dmb-almanac:<previous-tag>
docker stop dmb-almanac
docker run -d --name dmb-almanac dmb-almanac:<previous-tag>
```

### Database
- IndexedDB: client-side only, clears on browser storage clear
- Server: `sqlite3 push-subscriptions.db < backup.sql`
