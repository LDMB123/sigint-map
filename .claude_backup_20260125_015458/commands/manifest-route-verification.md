# PWA Manifest Route Verification

## Usage

```
/manifest-route-verification [manifest-path] [verification-scope]
```

## Instructions

You are an expert in Progressive Web App configuration with deep knowledge of Web App Manifest specifications, SvelteKit routing, and cross-browser PWA requirements. You understand how manifest properties interact with routing, the importance of scope and start_url alignment, and common pitfalls in PWA installation.

Audit and verify the PWA manifest configuration against SvelteKit routes to ensure proper installability and navigation behavior.

## Manifest Property Reference

| Property | Required | Impact | Common Issues |
|----------|----------|--------|---------------|
| `name` | Yes | App name in OS | Too long (>45 chars) |
| `short_name` | Yes | Home screen label | Too long (>12 chars) |
| `start_url` | Yes | Launch entry point | Mismatched with scope |
| `scope` | Recommended | Navigation boundary | Restricts app navigation |
| `display` | Yes | Display mode | `standalone` vs `fullscreen` |
| `icons` | Yes | App icons | Missing sizes, wrong format |
| `theme_color` | Recommended | UI theming | Doesn't match CSS |
| `background_color` | Recommended | Splash screen | Flash of wrong color |

## Icon Size Requirements

| Size | Purpose | Required |
|------|---------|----------|
| 48x48 | Minimum Android | No |
| 72x72 | Android legacy | No |
| 96x96 | Android legacy | No |
| 128x128 | Chrome Web Store | No |
| 144x144 | Windows tiles | No |
| 152x152 | iOS | Yes (iOS) |
| 167x167 | iPad Pro | Yes (iOS) |
| 180x180 | iOS home screen | Yes (iOS) |
| 192x192 | Android home | Yes |
| 384x384 | Android splash | Recommended |
| 512x512 | Android splash | Yes |
| 1024x1024 | iOS App Store | No |

## Display Mode Behavior

| Mode | Address Bar | System UI | Use Case |
|------|-------------|-----------|----------|
| `fullscreen` | Hidden | Hidden | Games, immersive |
| `standalone` | Hidden | Visible | Most apps |
| `minimal-ui` | Minimal | Visible | Content apps |
| `browser` | Visible | Visible | Fallback |

## Manifest Verification Script

```typescript
// scripts/verify-manifest.ts
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

interface WebAppManifest {
  name: string;
  short_name: string;
  start_url: string;
  scope?: string;
  display: string;
  theme_color?: string;
  background_color?: string;
  icons: ManifestIcon[];
  description?: string;
  categories?: string[];
  screenshots?: any[];
}

interface VerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

async function verifyManifest(): Promise<VerificationResult> {
  const result: VerificationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: []
  };

  // Find manifest
  const manifestPaths = [
    'static/manifest.json',
    'static/manifest.webmanifest',
    'static/site.webmanifest'
  ];

  let manifestPath: string | null = null;
  let manifest: WebAppManifest | null = null;

  for (const path of manifestPaths) {
    const fullPath = resolve(projectRoot, path);
    if (existsSync(fullPath)) {
      manifestPath = fullPath;
      manifest = JSON.parse(readFileSync(fullPath, 'utf-8'));
      result.info.push(`Found manifest at: ${path}`);
      break;
    }
  }

  if (!manifest) {
    result.valid = false;
    result.errors.push('No manifest.json found in static/');
    return result;
  }

  // Required fields
  const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
  for (const field of requiredFields) {
    if (!(field in manifest)) {
      result.valid = false;
      result.errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate name lengths
  if (manifest.name && manifest.name.length > 45) {
    result.warnings.push(`name is too long (${manifest.name.length}/45 chars)`);
  }

  if (manifest.short_name && manifest.short_name.length > 12) {
    result.warnings.push(`short_name is too long (${manifest.short_name.length}/12 chars)`);
  }

  // Validate start_url
  if (manifest.start_url) {
    const startUrl = manifest.start_url;

    // Check if start_url matches a route
    const routes = await glob('src/routes/**/+page.svelte', { cwd: projectRoot });
    const routePaths = routes.map(r => {
      let path = r.replace('src/routes', '').replace('/+page.svelte', '') || '/';
      path = path.replace(/\[([^\]]+)\]/g, ':$1');
      return path;
    });

    if (!routePaths.some(r => startUrl === r || startUrl.startsWith(r + '?'))) {
      result.warnings.push(`start_url "${startUrl}" may not match any route`);
    }
  }

  // Validate scope
  if (manifest.scope && manifest.start_url) {
    if (!manifest.start_url.startsWith(manifest.scope)) {
      result.valid = false;
      result.errors.push(`start_url "${manifest.start_url}" is outside scope "${manifest.scope}"`);
    }
  }

  // Validate display mode
  const validDisplayModes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
  if (manifest.display && !validDisplayModes.includes(manifest.display)) {
    result.valid = false;
    result.errors.push(`Invalid display mode: ${manifest.display}`);
  }

  // Validate icons
  if (manifest.icons) {
    const iconSizes = manifest.icons.map(i => i.sizes);

    const requiredSizes = ['192x192', '512x512'];
    for (const size of requiredSizes) {
      if (!iconSizes.includes(size)) {
        result.valid = false;
        result.errors.push(`Missing required icon size: ${size}`);
      }
    }

    const recommendedSizes = ['180x180', '384x384'];
    for (const size of recommendedSizes) {
      if (!iconSizes.includes(size)) {
        result.warnings.push(`Missing recommended icon size: ${size}`);
      }
    }

    // Check icon files exist
    for (const icon of manifest.icons) {
      const iconPath = resolve(projectRoot, 'static', icon.src.replace(/^\//, ''));
      if (!existsSync(iconPath)) {
        result.valid = false;
        result.errors.push(`Icon file not found: ${icon.src}`);
      }
    }

    // Check for maskable icon
    const hasMaskable = manifest.icons.some(i => i.purpose?.includes('maskable'));
    if (!hasMaskable) {
      result.warnings.push('No maskable icon defined (recommended for Android)');
    }
  }

  // Validate colors
  const colorRegex = /^#([0-9A-Fa-f]{3}){1,2}$/;

  if (manifest.theme_color && !colorRegex.test(manifest.theme_color)) {
    result.warnings.push(`Invalid theme_color format: ${manifest.theme_color}`);
  }

  if (manifest.background_color && !colorRegex.test(manifest.background_color)) {
    result.warnings.push(`Invalid background_color format: ${manifest.background_color}`);
  }

  return result;
}

// Run verification
verifyManifest().then(result => {
  console.log('\n=== PWA Manifest Verification ===\n');

  for (const info of result.info) {
    console.log(`INFO: ${info}`);
  }

  for (const warning of result.warnings) {
    console.log(`WARNING: ${warning}`);
  }

  for (const error of result.errors) {
    console.log(`ERROR: ${error}`);
  }

  console.log(`\nResult: ${result.valid ? 'VALID' : 'INVALID'}`);
  process.exit(result.valid ? 0 : 1);
});
```

## SvelteKit Manifest Configuration

### Static Manifest

```json
// static/manifest.json
{
  "name": "My SvelteKit PWA",
  "short_name": "MyApp",
  "description": "A progressive web application built with SvelteKit",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#3b82f6",
  "background_color": "#0a0a0f",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "categories": ["productivity", "utilities"],
  "shortcuts": [
    {
      "name": "Dashboard",
      "short_name": "Dashboard",
      "url": "/dashboard",
      "icons": [{ "src": "/icons/shortcut-dashboard.png", "sizes": "96x96" }]
    }
  ]
}
```

### Dynamic Manifest Route

```typescript
// src/routes/manifest.json/+server.ts
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
  const baseUrl = url.origin;

  const manifest = {
    name: 'My SvelteKit PWA',
    short_name: 'MyApp',
    description: 'A progressive web application built with SvelteKit',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    theme_color: '#3b82f6',
    background_color: '#0a0a0f',
    icons: [
      {
        src: `${baseUrl}/icons/icon-192.png`,
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: `${baseUrl}/icons/icon-512.png`,
        sizes: '512x512',
        type: 'image/png'
      },
      {
        src: `${baseUrl}/icons/icon-maskable-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  };

  return json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};

export const prerender = true;
```

### HTML Head Integration

```svelte
<!-- src/app.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json" />

    <!-- Theme Color -->
    <meta name="theme-color" content="#3b82f6" />
    <meta name="theme-color" content="#1a1a2e" media="(prefers-color-scheme: dark)" />

    <!-- iOS Meta Tags -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="MyApp" />

    <!-- iOS Icons -->
    <link rel="apple-touch-icon" href="/icons/icon-180.png" />
    <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
    <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />

    <!-- iOS Splash Screens -->
    <link rel="apple-touch-startup-image" href="/splash/apple-splash-2048-2732.jpg" media="(device-width: 1024px) and (device-height: 1366px)" />

    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

### Route Scope Verification

```typescript
// src/lib/pwa/scope-checker.ts
export interface ScopeCheckResult {
  inScope: boolean;
  url: string;
  scope: string;
  reason?: string;
}

export function checkUrlInScope(
  url: string,
  scope: string = '/'
): ScopeCheckResult {
  try {
    const urlObj = new URL(url, window.location.origin);
    const scopeObj = new URL(scope, window.location.origin);

    // Check same origin
    if (urlObj.origin !== scopeObj.origin) {
      return {
        inScope: false,
        url,
        scope,
        reason: 'Different origin'
      };
    }

    // Check path prefix
    const normalizedPath = urlObj.pathname.endsWith('/')
      ? urlObj.pathname
      : urlObj.pathname + '/';
    const normalizedScope = scopeObj.pathname.endsWith('/')
      ? scopeObj.pathname
      : scopeObj.pathname + '/';

    if (!normalizedPath.startsWith(normalizedScope.slice(0, -1))) {
      return {
        inScope: false,
        url,
        scope,
        reason: `Path "${urlObj.pathname}" not in scope "${scope}"`
      };
    }

    return {
      inScope: true,
      url,
      scope
    };
  } catch (error) {
    return {
      inScope: false,
      url,
      scope,
      reason: `Invalid URL: ${error}`
    };
  }
}

// Check all routes against manifest scope
export async function verifyRoutesInScope(
  routes: string[],
  scope: string
): Promise<Map<string, ScopeCheckResult>> {
  const results = new Map<string, ScopeCheckResult>();

  for (const route of routes) {
    results.set(route, checkUrlInScope(route, scope));
  }

  return results;
}
```

### Response Format

```markdown
## PWA Manifest Route Verification Report

### Manifest Location
- Path: [static/manifest.json]
- Type: [Static/Dynamic]

### Required Fields Audit

| Field | Status | Value | Issue |
|-------|--------|-------|-------|
| name | Pass/Fail | [Value] | [Issue if any] |
| short_name | Pass/Fail | [Value] | [Issue if any] |
| start_url | Pass/Fail | [Value] | [Issue if any] |
| display | Pass/Fail | [Value] | [Issue if any] |
| icons | Pass/Fail | [Count] icons | [Issue if any] |

### Icon Verification

| Size | Required | Found | Path | Status |
|------|----------|-------|------|--------|
| 192x192 | Yes | Yes/No | [Path] | Pass/Fail |
| 512x512 | Yes | Yes/No | [Path] | Pass/Fail |
| Maskable | Recommended | Yes/No | [Path] | Pass/Warn |

### Route Scope Analysis

| Route | In Scope | Notes |
|-------|----------|-------|
| / | Yes | Start URL |
| /dashboard | Yes | - |
| /external-link | No | Outside scope |

### start_url Verification
- Configured: [start_url value]
- Route exists: [Yes/No]
- Matches scope: [Yes/No]

### Recommendations

1. **Critical** (Blocks PWA installation):
   - [List of critical issues]

2. **Warnings** (May affect UX):
   - [List of warnings]

3. **Suggestions** (Best practices):
   - [List of suggestions]

### Generated Manifest
```json
{
  // Corrected manifest if needed
}
```

### Verification Script
```bash
npx tsx scripts/verify-manifest.ts
```
```
