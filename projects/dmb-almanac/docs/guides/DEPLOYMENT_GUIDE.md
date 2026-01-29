# DMB Almanac Deployment Guide

> Comprehensive guide for deploying the DMB Almanac Progressive Web Application
> Last Updated: January 27, 2026

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Environment Setup](#environment-setup)
4. [Build Process](#build-process)
5. [Deployment Options](#deployment-options)
6. [Database Configuration](#database-configuration)
7. [PWA Configuration](#pwa-configuration)
8. [Production Optimization](#production-optimization)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### System Requirements

- **Node.js**: v20.x or later (LTS recommended)
- **npm**: v10.x or later
- **Git**: Latest stable version
- **Disk Space**: Minimum 2GB for build artifacts

### Development Tools

```bash
# Verify Node.js version
node --version  # Should be v20.x+

# Verify npm version
npm --version  # Should be v10.x+

# Install global tools (optional)
npm install -g tsx  # For TypeScript script execution
```

### Browser Support

The application targets modern browsers with the following features:
- ES2022+ JavaScript
- CSS Container Queries
- IndexedDB
- Service Workers
- Web Push API (optional)

---

## Project Structure

```
dmb-almanac/
├── app/                          # Main SvelteKit application
│   ├── src/
│   │   ├── lib/                  # Shared libraries
│   │   │   ├── components/       # Svelte components
│   │   │   ├── db/               # Database (Dexie/IndexedDB)
│   │   │   ├── monitoring/       # Error tracking & RUM
│   │   │   ├── pwa/              # PWA utilities
│   │   │   ├── security/         # CSRF, JWT, validation
│   │   │   ├── server/           # Server-side utilities
│   │   │   ├── stores/           # Svelte stores
│   │   │   ├── utils/            # Utility functions
│   │   │   └── wasm/             # WebAssembly modules & fallbacks
│   │   ├── routes/               # SvelteKit routes
│   │   ├── app.css               # Global styles
│   │   ├── app.html              # HTML template
│   │   └── hooks.server.js       # Server hooks
│   ├── static/                   # Static assets
│   │   ├── icons/                # PWA icons
│   │   ├── manifest.json         # PWA manifest
│   │   └── speculation-rules.json
│   ├── tests/                    # Test suites
│   │   ├── e2e/                  # Playwright E2E tests
│   │   └── unit/                 # Vitest unit tests
│   ├── package.json
│   ├── vite.config.js
│   └── sw-optimized.js           # Service worker
├── scraper/                      # Data scraper (separate module)
└── docs/                         # Documentation
```

---

## Environment Setup

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd dmb-almanac/app

# Install dependencies
npm ci  # Use ci for reproducible builds
```

### 2. Environment Variables

Create a `.env` file in the `app/` directory:

```bash
# Required for Web Push Notifications
VITE_VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_SUBJECT=mailto:admin@dmbalmanac.com

# Required for production
PUBLIC_SITE_URL=https://dmbalmanac.com

# Security secrets
JWT_SECRET=<32-character-random-string>
PUSH_API_KEY=<32-character-random-string>

# Optional
PUSH_API_SECRET=<additional-secret>
PUSH_DB_PATH=./push-subscriptions.db
NODE_ENV=production
```

### 3. Generate Keys

```bash
# Generate VAPID keys for push notifications
npx web-push generate-vapid-keys

# Generate secure random strings
openssl rand -base64 32  # Run twice for JWT_SECRET and PUSH_API_KEY
```

---

## Build Process

### Development

```bash
# Start development server
npm run dev

# Development server with network access
npm run dev -- --host
```

### Production Build

```bash
# Step 1: Clean previous builds
rm -rf .svelte-kit build

# Step 2: Compress static data
npm run compress:data

# Step 3: Build application
npm run build

# Step 4: Preview production build locally
npm run preview
```

### Build Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run lint` | Run ESLint |
| `npm run check` | Svelte type checking |
| `npm run compress:data` | Compress static data files |

---

## Deployment Options

### Option 1: Node.js Server

The default configuration uses `@sveltejs/adapter-node`.

```bash
# Build
npm run build

# Start server
NODE_ENV=production node build

# Or with PM2
pm2 start build/index.js --name dmb-almanac
```

### Option 2: Docker

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm ci --production
EXPOSE 3000
CMD ["node", "build"]
```

```bash
# Build and run
docker build -t dmb-almanac .
docker run -p 3000:3000 --env-file .env dmb-almanac
```

### Option 3: Vercel

```bash
# Install Vercel adapter
npm install @sveltejs/adapter-vercel

# Update svelte.config.js to use adapter-vercel
# Deploy
vercel --prod
```

### Option 4: Static Hosting (Limited)

For static-only deployment (no server-side features):

```bash
# Install static adapter
npm install @sveltejs/adapter-static

# Update svelte.config.js
# Build
npm run build

# Deploy build/ to CDN (Cloudflare Pages, Netlify, etc.)
```

---

## Database Configuration

### IndexedDB (Client-Side)

The application uses Dexie.js for IndexedDB management. Database initialization is automatic on first load.

**Schema Location**: `src/lib/db/dexie/schema.js`

```javascript
// Database version management
const DB_VERSION = 1;

// Stores
- shows
- songs
- venues
- tours
- guests
- statistics
- userPreferences
- cachedPages
```

### Server-Side Database (SQLite)

For server-side caching and push subscriptions:

```bash
# Initialize database constraints
npm run constraints

# Schema file: src/lib/db/schema.sql
# Indexes: src/lib/db/performance-indexes.sql
```

---

## PWA Configuration

### Manifest

Located at `static/manifest.json`:

```json
{
  "name": "DMB Almanac - Dave Matthews Band Concert Database",
  "short_name": "DMB Almanac",
  "start_url": "/?source=pwa",
  "display": "standalone",
  "theme_color": "#030712",
  "background_color": "#030712"
}
```

### Service Worker

The optimized service worker (`sw-optimized.js`) provides:

- **Cache-First Strategy** for static assets
- **Network-First Strategy** for API calls
- **Background Sync** for offline actions
- **Push Notifications** support

### Icons

Ensure all required icons exist in `static/icons/`:
- icon-16.png
- icon-32.png
- icon-72.png
- icon-96.png
- icon-128.png
- icon-144.png
- icon-152.png
- icon-192.png
- icon-384.png
- icon-512.png
- maskable-512.png

---

## Production Optimization

### Performance Checklist

1. **Enable Compression**
   ```nginx
   # nginx.conf
   gzip on;
   gzip_types text/plain application/javascript text/css application/json;
   brotli on;
   brotli_types text/plain application/javascript text/css application/json;
   ```

2. **Configure CDN**
   - Cache static assets (`/_app/immutable/*`) indefinitely
   - Cache pages with appropriate TTL
   - Enable edge caching

3. **HTTP/2 or HTTP/3**
   - Ensure server supports HTTP/2 minimum
   - HTTP/3 (QUIC) recommended for mobile

4. **Security Headers**
   ```
   Content-Security-Policy: default-src 'self'; ...
   X-Content-Type-Options: nosniff
   X-Frame-Options: DENY
   Referrer-Policy: strict-origin-when-cross-origin
   ```

### Bundle Analysis

```bash
# Analyze bundle size
npm run build -- --analyze

# Large chunks (>50KB) are expected for data-heavy pages
# Consider lazy loading for specific routes if needed
```

---

## Troubleshooting

### Common Issues

#### Build Fails with ENOENT Error
```bash
# Clear SvelteKit cache and rebuild
rm -rf .svelte-kit node_modules/.vite
npm run build
```

#### Service Worker Not Updating
```javascript
// Force update in browser DevTools
// Application > Service Workers > Update on reload
```

#### IndexedDB Errors
```javascript
// Clear IndexedDB in browser DevTools
// Application > Storage > IndexedDB > Delete database
```

#### WASM Modules Not Loading
The application includes JavaScript fallbacks for all WASM modules. If WASM fails to load, fallbacks activate automatically.

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* npm run dev

# E2E test debugging
npm run test:e2e:debug
```

---

## Rollback Procedures

### Immediate Rollback

```bash
# If using Git-based deployment
git checkout <previous-commit>
npm ci
npm run build
# Redeploy

# If using Docker
docker pull dmb-almanac:<previous-tag>
docker stop dmb-almanac
docker run -d --name dmb-almanac dmb-almanac:<previous-tag>
```

### Database Rollback

**IndexedDB**: Client-side only, clears on browser storage clear

**Server Database**:
```bash
# Restore from backup
sqlite3 push-subscriptions.db < backup.sql
```

### Feature Flags

For gradual rollout, use environment variables as feature flags:

```javascript
const ENABLE_NEW_FEATURE = import.meta.env.VITE_ENABLE_NEW_FEATURE === 'true';
```

---

## Monitoring Setup

### Error Tracking (Sentry)

```bash
# Add to .env
VITE_SENTRY_DSN=https://your-sentry-dsn
```

### Custom Telemetry

The application includes built-in telemetry:
- `src/lib/monitoring/errors.js` - Error capture
- `src/lib/monitoring/rum.js` - Real User Monitoring
- `src/lib/services/telemetryQueue.js` - Batched reporting

### Health Check Endpoint

```bash
# Check application health
curl https://dmbalmanac.com/api/health
```

---

## Support

For deployment assistance:
- Review existing documentation in `docs/` directory
- Check recent commit history for context
- Consult the project's issue tracker

---

*Document generated: January 27, 2026*
