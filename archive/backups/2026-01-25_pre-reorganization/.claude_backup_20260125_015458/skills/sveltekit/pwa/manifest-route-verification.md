# Skill: Manifest Implementation and Verification

**ID**: `manifest-route-verification`
**Category**: PWA / Offline
**Agent**: PWA Engineer

---

## When to Use

- Setting up PWA for the first time
- After manifest changes
- Debugging installability issues
- Before production deployment
- Verifying PWA requirements met

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to SvelteKit project root |

---

## Steps

### Step 1: Verify Manifest Exists

```bash
# Check for static manifest
ls -la static/manifest.json static/manifest.webmanifest 2>/dev/null

# Check for generated manifest (if using vite-plugin-pwa)
grep -r "manifest" vite.config.ts
```

### Step 2: Validate Manifest Content

```bash
# Parse and validate JSON
cat static/manifest.json | jq '.'

# Check required fields
cat static/manifest.json | jq '{
  name: .name,
  short_name: .short_name,
  start_url: .start_url,
  display: .display,
  icons: .icons | length
}'
```

### Step 3: Check Icon Requirements

```bash
# PWA requires at least:
# - 192x192 icon
# - 512x512 icon
# - One maskable icon (recommended)

cat static/manifest.json | jq '.icons[] | {src, sizes, purpose}'

# Verify icon files exist
for icon in $(cat static/manifest.json | jq -r '.icons[].src'); do
  if [ -f "static$icon" ] || [ -f "static/${icon#/}" ]; then
    echo "✓ $icon exists"
  else
    echo "✗ $icon MISSING"
  fi
done
```

### Step 4: Verify Manifest Link in HTML

```bash
# SvelteKit automatically includes manifest if in static/
# But you can add explicit link in app.html:

grep -E "manifest|webmanifest" src/app.html
```

### Step 5: Test Manifest Serving

```bash
# Start dev server
npm run dev &
sleep 5

# Fetch manifest
curl -s http://localhost:5173/manifest.json | jq '.name, .short_name'

# Check content type
curl -sI http://localhost:5173/manifest.json | grep -i content-type

# Should be: application/manifest+json or application/json
```

### Step 6: Lighthouse PWA Audit

```bash
# Build production
npm run build
npm run preview &
sleep 5

# Run Lighthouse PWA audit
npx lighthouse http://localhost:4173 \
  --only-categories=pwa \
  --output=json \
  --output-path=pwa-audit.json

# Check installability
cat pwa-audit.json | jq '.audits["installable-manifest"]'
```

---

## Manifest Requirements Checklist

### Required Fields

- [ ] `name` - Full app name
- [ ] `short_name` - Short name (12 chars ideal)
- [ ] `start_url` - Entry point (usually "/")
- [ ] `display` - One of: fullscreen, standalone, minimal-ui, browser
- [ ] `icons` - At least 192px and 512px icons

### Recommended Fields

- [ ] `theme_color` - Status bar color
- [ ] `background_color` - Splash screen color
- [ ] `description` - App description
- [ ] `scope` - URL scope for PWA (usually "/")
- [ ] `screenshots` - App store screenshots
- [ ] `shortcuts` - Quick actions

### Icons Requirements

| Size | Required | Purpose |
|------|----------|---------|
| 192x192 | Yes | Chrome install |
| 512x512 | Yes | Splash screen |
| maskable | Recommended | Adaptive icons |
| 16-48px | No | Favicon fallback |

---

## Implementation Examples

### Option 1: Static Manifest File

```json
// static/manifest.json
{
  "name": "Your App Name",
  "short_name": "App",
  "description": "A description of your app",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/mobile.png",
      "sizes": "750x1334",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "shortcuts": [
    {
      "name": "Dashboard",
      "url": "/dashboard",
      "description": "View your dashboard"
    },
    {
      "name": "Settings",
      "url": "/settings",
      "description": "Manage settings"
    }
  ]
}
```

### Option 2: vite-plugin-pwa Generated Manifest

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    sveltekit(),
    VitePWA({
      manifest: {
        name: 'Your App Name',
        short_name: 'App',
        description: 'A description of your app',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/icon-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
});
```

### Option 3: Explicit Link in app.html

```html
<!-- src/app.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <link rel="manifest" href="%sveltekit.assets%/manifest.json" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

---

## Icon Generation

### Create Icons from Source

```bash
# Install image processing tool
npm install -D sharp-cli

# Generate icons from source
npx sharp -i source-icon.png -o static/icons/icon-192.png resize 192 192
npx sharp -i source-icon.png -o static/icons/icon-512.png resize 512 512

# For maskable icon, add 20% safe zone padding
npx sharp -i source-icon.png -o static/icons/icon-maskable.png resize 512 512 --background transparent --extend 102
```

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| manifest-audit.json | `.claude/artifacts/` | Validation results |
| pwa-audit.json | `.claude/artifacts/` | Lighthouse PWA audit |
| icon-checklist.md | `.claude/artifacts/` | Icon verification results |

---

## Output Template

```markdown
## Manifest Verification Report

### Date: [YYYY-MM-DD]

### Manifest Location
- Path: [/static/manifest.json | vite.config.ts]
- Type: [Static | Generated]
- Accessible at: [URL]

### Required Fields
| Field | Present | Value | Status |
|-------|---------|-------|--------|
| name | [Yes/No] | [value] | [OK/MISSING] |
| short_name | [Yes/No] | [value] | [OK/MISSING] |
| start_url | [Yes/No] | [value] | [OK/MISSING] |
| display | [Yes/No] | [value] | [OK/MISSING] |
| icons | [Yes/No] | [count] | [OK/MISSING] |

### Icons Verification
| Size | File | Exists | Purpose | Status |
|------|------|--------|---------|--------|
| 192x192 | [path] | [Yes/No] | [any/maskable] | [OK/MISSING] |
| 512x512 | [path] | [Yes/No] | [any/maskable] | [OK/MISSING] |

### Serving Verification
- Content-Type: [application/manifest+json]
- Accessible at: [http://localhost:5173/manifest.json]
- HTML link present: [Yes/No]

### Lighthouse PWA Score
- Installable: [Yes/No]
- PWA Optimized: [Yes/No]
- Issues: [list or "None"]

### Recommendations
1. [Recommendation with action items]
2. [Recommendation with action items]
```
