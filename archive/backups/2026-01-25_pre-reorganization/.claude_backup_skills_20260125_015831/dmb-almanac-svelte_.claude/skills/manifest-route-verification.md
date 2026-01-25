# Skill: Manifest Route Implementation/Verification

**ID**: `manifest-route-verification`
**Category**: PWA / Offline
**Agent**: PWA Engineer

---

## When to Use

- Setting up PWA for the first time
- After manifest changes
- Debugging installability issues
- Before production deployment

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to project root |

---

## Steps

### Step 1: Verify Manifest Exists

```bash
# Check for static manifest
ls -la public/manifest.json public/manifest.webmanifest 2>/dev/null

# Check for route-based manifest (App Router)
ls -la app/manifest.ts app/manifest.json 2>/dev/null
```

### Step 2: Validate Manifest Content

```bash
# Parse and validate JSON
cat public/manifest.json | jq '.'

# Check required fields
cat public/manifest.json | jq '{
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
# - One maskable icon

cat public/manifest.json | jq '.icons[] | {src, sizes, purpose}'

# Verify icon files exist
for icon in $(cat public/manifest.json | jq -r '.icons[].src'); do
  if [ -f "public$icon" ] || [ -f "public/${icon#/}" ]; then
    echo "✓ $icon exists"
  else
    echo "✗ $icon MISSING"
  fi
done
```

### Step 4: Verify Manifest Link in HTML

```bash
# Check app/layout.tsx for manifest link
grep -E "manifest|webmanifest" app/layout.tsx

# Or check if using metadata API
grep -E "manifest:" app/layout.tsx
```

### Step 5: Test Manifest Serving

```bash
# Start dev server
npm run dev &
sleep 5

# Fetch manifest
curl -s http://localhost:3000/manifest.json | jq '.name, .short_name'

# Check content type
curl -sI http://localhost:3000/manifest.json | grep -i content-type

# Should be: application/manifest+json
```

### Step 6: Lighthouse PWA Audit

```bash
npx lighthouse http://localhost:3000 \
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
- [ ] `short_name` - Short name (≤12 chars ideal)
- [ ] `start_url` - Entry point (usually "/")
- [ ] `display` - One of: fullscreen, standalone, minimal-ui, browser
- [ ] `icons` - At least 192px and 512px icons

### Recommended Fields

- [ ] `theme_color` - Status bar color
- [ ] `background_color` - Splash screen color
- [ ] `description` - App description
- [ ] `scope` - URL scope for PWA
- [ ] `screenshots` - App store screenshots
- [ ] `shortcuts` - Quick actions

### Icons Requirements

| Size | Required | Purpose |
|------|----------|---------|
| 192x192 | Yes | Chrome install |
| 512x512 | Yes | Splash screen |
| maskable | Yes | Adaptive icons |
| 16-48px | No | Favicon fallback |

---

## App Router Manifest Route

```typescript
// app/manifest.ts (Alternative to static file)
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DMB Almanac',
    short_name: 'DMB Almanac',
    description: 'Dave Matthews Band Concert Database',
    start_url: '/',
    display: 'standalone',
    background_color: '#030712',
    theme_color: '#030712',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
```

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| manifest-audit.json | `.claude/artifacts/` | Validation results |
| pwa-audit.json | `.claude/artifacts/` | Lighthouse PWA audit |

---

## Output Template

```markdown
## Manifest Verification Report

### Date: [YYYY-MM-DD]

### Manifest Location
- Path: [/public/manifest.json | /app/manifest.ts]
- Type: [Static | Route]

### Required Fields
| Field | Present | Value | Status |
|-------|---------|-------|--------|
| name | [Yes/No] | [value] | [OK/MISSING] |
| short_name | [Yes/No] | [value] | [OK/MISSING] |
| start_url | [Yes/No] | [value] | [OK/MISSING] |
| display | [Yes/No] | [value] | [OK/MISSING] |
| icons | [Yes/No] | [count] | [OK/MISSING] |

### Icons Verification
| Size | File | Exists | Purpose |
|------|------|--------|---------|
| 192x192 | [path] | [Yes/No] | [any/maskable] |
| 512x512 | [path] | [Yes/No] | [any/maskable] |

### Serving Verification
- Content-Type: [application/manifest+json]
- Accessible at: [URL]
- HTML link present: [Yes/No]

### Lighthouse PWA Score
- Installable: [Yes/No]
- Issues: [list]

### Recommendations
1. [Recommendation]
2. [Recommendation]
```
