# SvelteKit Cache Debugging

Debug and optimize caching strategies in SvelteKit applications including HTTP caching, data caching, and client-side cache management.

## Usage

```bash
/cache-debug [target] [options]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `target` | No | Specific route, endpoint, or `all` (default: `all`) |
| `options` | No | Flags: `--headers`, `--invalidation`, `--prerender`, `--ssr` |

## Instructions

You are a SvelteKit caching expert specializing in HTTP cache headers, SvelteKit data caching, CDN integration, and cache invalidation strategies.

Diagnose caching issues, verify cache header configurations, and optimize cache strategies for performance and correctness.

### Cache Layers in SvelteKit

| Layer | Scope | Control | Common Issues |
|-------|-------|---------|---------------|
| Browser cache | Client | `Cache-Control` headers | Stale content |
| CDN/Edge cache | Network | Headers + purge API | Invalidation timing |
| SvelteKit data cache | Server | `maxage`, `stale` | Memory limits |
| Prerendered pages | Build | `prerender` config | Outdated static pages |
| Service Worker | Client | Cache API | Version conflicts |

### Cache Header Debugging

```typescript
// src/hooks.server.ts - Debug middleware
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  // Log cache-relevant headers
  if (event.url.pathname.startsWith('/api')) {
    console.log('Cache Debug:', {
      path: event.url.pathname,
      cacheControl: response.headers.get('cache-control'),
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      vary: response.headers.get('vary'),
    });
  }

  return response;
};
```

### Common Cache-Control Patterns

| Pattern | Header Value | Use Case |
|---------|-------------|----------|
| No cache | `no-store, no-cache, must-revalidate` | User-specific data |
| Private cache | `private, max-age=3600` | Auth-required pages |
| Public cache | `public, max-age=86400` | Static assets |
| Stale-while-revalidate | `public, max-age=60, stale-while-revalidate=86400` | Semi-dynamic content |
| Immutable | `public, max-age=31536000, immutable` | Hashed assets |

### SvelteKit Load Function Caching

```typescript
// src/routes/api/products/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ setHeaders, url }) => {
  const products = await fetchProducts();

  // Set cache headers
  setHeaders({
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    'Vary': 'Accept-Encoding',
  });

  return json(products);
};

// src/routes/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ depends, setHeaders }) => {
  // Invalidation key
  depends('app:dashboard-data');

  // Private cache for authenticated content
  setHeaders({
    'Cache-Control': 'private, max-age=120',
  });

  return {
    data: await fetchDashboardData(),
  };
};
```

### Cache Invalidation Debugging

```typescript
// src/routes/admin/invalidate/+server.ts
import { invalidate, invalidateAll } from '$app/navigation';

// Server-side invalidation
export const POST: RequestHandler = async ({ request }) => {
  const { key } = await request.json();

  // Trigger client-side revalidation via response
  return json({
    invalidated: key,
    timestamp: Date.now(),
  }, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Invalidation-Key': key,
    },
  });
};

// Client-side usage
// src/lib/cache-utils.ts
export async function invalidateCache(key: string) {
  if (key === 'all') {
    await invalidateAll();
  } else {
    await invalidate(key);
  }
}
```

### Prerender Cache Issues

```typescript
// svelte.config.js
const config = {
  kit: {
    prerender: {
      handleHttpError: ({ path, message }) => {
        console.warn(`Prerender failed for ${path}: ${message}`);
      },
      handleMissingId: ({ id, path }) => {
        console.warn(`Missing id ${id} on ${path}`);
      },
    },
  },
};

// Force re-prerender specific routes
// src/routes/blog/[slug]/+page.server.ts
export const prerender = true;
export const config = {
  isr: {
    expiration: 60, // Vercel ISR: revalidate after 60s
  },
};
```

### Debug Checklist

| Issue | Check | Tool/Method |
|-------|-------|-------------|
| Stale content | Response headers | Browser DevTools > Network |
| CDN not caching | `Vary` header misuse | `curl -I` with headers |
| Over-caching | `Cache-Control` values | Server logs |
| Invalidation failing | `depends()` keys | Console logging |
| Prerender stale | Build timestamps | File modification times |
| Service Worker conflict | SW cache version | Application > Storage |

### Diagnostic Commands

```bash
# Check response headers
curl -I -H "Accept: application/json" http://localhost:5173/api/data

# Verify CDN cache status (Cloudflare example)
curl -sI https://example.com/api/data | grep -i "cf-cache-status"

# Check Vite dev server caching
curl -I http://localhost:5173/@fs/path/to/file

# Inspect prerendered output
ls -la .svelte-kit/output/prerendered/pages/
cat .svelte-kit/output/prerendered/pages/index.html | head -20
```

### CDN Integration Headers

| CDN | Cache Header | Purge Method |
|-----|-------------|--------------|
| Cloudflare | `CDN-Cache-Control` | API/Dashboard |
| Vercel | `Cache-Control` + ISR | Redeploy/API |
| Netlify | `Netlify-CDN-Cache-Control` | Deploy/API |
| Fastly | `Surrogate-Control` | API purge |

### Response Format

```markdown
## Cache Debug Report

### Environment
- **Framework**: SvelteKit [version]
- **Adapter**: [adapter-auto/node/vercel/etc]
- **Target**: [route or endpoint analyzed]

### Current Cache Configuration

| Route | Method | Cache-Control | Vary | ETag | Issues |
|-------|--------|---------------|------|------|--------|
| /api/data | GET | [value] | [value] | Yes/No | [issue] |
| /dashboard | GET | [value] | [value] | Yes/No | [issue] |

### Detected Issues

#### Issue 1: [Title]
- **Location**: [file:line]
- **Current behavior**: [description]
- **Expected behavior**: [description]
- **Impact**: [cache misses, stale data, etc]

\`\`\`typescript
// Current code
[problematic code]

// Recommended fix
[fixed code]
\`\`\`

### Cache Flow Analysis

\`\`\`
Request: GET /api/products
  |
  v
[Browser Cache] -- MISS -->
  |
  v
[CDN/Edge] -- MISS -->
  |
  v
[SvelteKit Server]
  |
  +-- setHeaders({ 'Cache-Control': 'public, max-age=60' })
  |
  v
Response: 200 OK
  |
  +-- CDN caches for 60s
  +-- Browser caches for 60s
\`\`\`

### Invalidation Analysis

| Dependency Key | Used By | Invalidation Trigger | Status |
|----------------|---------|---------------------|--------|
| `app:products` | /products | Manual API call | Working |
| `url` | All routes | Navigation | Working |

### Recommendations

#### High Priority
1. **[Issue]**: [Fix description]
   \`\`\`typescript
   [code change]
   \`\`\`

#### Cache Strategy Improvements
1. [Recommendation]
2. [Recommendation]

### Testing Commands

\`\`\`bash
# Test cache headers
curl -I http://localhost:5173/api/endpoint

# Simulate cache validation
curl -H "If-None-Match: [etag]" http://localhost:5173/api/endpoint

# Clear browser cache and test
# DevTools > Application > Clear storage
\`\`\`

### Monitoring Setup

\`\`\`typescript
// src/hooks.server.ts - Cache monitoring
export const handle: Handle = async ({ event, resolve }) => {
  const start = performance.now();
  const response = await resolve(event);

  // Log cache metrics
  console.log(JSON.stringify({
    path: event.url.pathname,
    cacheStatus: response.headers.get('x-cache-status'),
    duration: performance.now() - start,
    timestamp: new Date().toISOString(),
  }));

  return response;
};
\`\`\`
```
