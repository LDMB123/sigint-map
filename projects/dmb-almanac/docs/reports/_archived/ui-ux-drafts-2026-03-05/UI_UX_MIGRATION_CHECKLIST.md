# UI/UX Migration Checklist (Route-by-Route)

Status: Dormant draft. The current Rust-first app does not implement `VITE_UI_V2`, `HeaderV2`, `FooterV2`, or `.ui2-main`. Use this only as exploratory design history, not as an active delivery checklist.

If this work is revived:
- Use `docs/guides/TESTING_CHECKLIST.md` for current Rust E2E and manual smoke steps.
- Use `docs/ops/A11Y_KEYBOARD_SPOTCHECK_RUNBOOK.md` for manual keyboard coverage.

## Phase 0 — Prep
- [ ] Enable the experimental shell behind an explicit feature flag.
- [ ] Add V2 design tokens + base styles under `.ui-v2` scope.
- [ ] Confirm PWA banners and install flows still render.

## Phase 1 — Core Shell
- [ ] Experimental header + footer integrated.
- [ ] Main content container uses the new shell wrapper.
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

## Testing If Revived
- [ ] Run the current Rust E2E and smoke flow from `docs/guides/TESTING_CHECKLIST.md`
- [ ] Run manual keyboard coverage from `docs/ops/A11Y_KEYBOARD_SPOTCHECK_RUNBOOK.md`
- [ ] Re-baseline route screenshots before rollout

## Rollout
- [ ] Toggle V2 on staging only
- [ ] Snapshot all key routes
- [ ] Production release with fallback to V1
