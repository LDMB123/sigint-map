# UI/UX Migration Checklist (Route‑by‑Route)

## Phase 0 — Prep
- [ ] Enable V2 shell behind `VITE_UI_V2` feature flag.
- [ ] Add V2 design tokens + base styles under `.ui-v2` scope.
- [ ] Confirm PWA banners and install flows still render.

## Phase 1 — Core Shell
- [ ] HeaderV2 + FooterV2 integrated.
- [ ] Main content container uses `.ui2-main`.
- [ ] Skip link and error overlays preserved.

## Phase 2 — Key Routes
1. Home (`/`)
- [ ] New hero + stats layout
- [ ] Updated link grid
- [ ] Preserve SSR data loading

2. Search (`/search`)
- [ ] New search input + filters
- [ ] Results cards
- [ ] Preserve query params + share target

3. Shows (`/shows`)
- [ ] New virtual list styling
- [ ] Year grouping preserved
- [ ] Keep perf badge

4. Show Detail (`/shows/[showId]`)
- [ ] New layout frame
- [ ] Preserve setlist and metadata sections

5. Songs (`/songs`, `/songs/[slug]`)
- [ ] New list layout + detail header

6. Venues (`/venues`, `/venues/[venueId]`)
- [ ] New list layout + detail tabs

7. Visualizations (`/visualizations`)
- [ ] Keep lazy loading and GPU/WASM isolation

## Phase 3 — Secondary Routes
- [ ] Tours
- [ ] Guests
- [ ] Liberation
- [ ] Stats
- [ ] Assistant

## Testing
- [ ] Run `npm run test:e2e -- pwa.spec.js`
- [ ] Run `npm run test:e2e -- performance.spec.js`
- [ ] Run accessibility checks

## Rollout
- [ ] Toggle V2 on staging only
- [ ] Snapshot all key routes
- [ ] Production release with fallback to V1
