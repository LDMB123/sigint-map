# Rust Scrape Fixtures

Fixtures live in `rust/crates/dmb_pipeline/tests/fixtures` and are used for selector drift checks.

## Update Workflow
1. Save the updated HTML into the appropriate fixture file.
2. Run the fixtures-only check:
   ```bash
   cd rust
   cargo run -p dmb_pipeline -- scrape-fixtures --warnings-output data/warnings-fixtures.json --warnings-max 0
   ```
3. Confirm warnings remain zero. If not, update selectors or expected outputs.

## Warning Report Schema
The fixtures run writes a warning report JSON (via `--warnings-output`) with the following fields:
- `generatedAt`
- `emptySelectors` / `missingFields`
- `missingByField` / `missingByContext`
- `topMissingFields` (array of `{field, count}`)
- `emptyBySelector` / `emptyByContext`
- `httpStatusCounts`
- `endpointTimingsMs`
- `endpointRetries`
- `signature`

Optional JSONL events (`--warnings-jsonl`) include `selector_missing` events with `context`, `detail`, and a `snippet` for quick debugging.

## Current Fixtures
- `song_stats.html`
- `venue_stats.html`
- `guest_shows.html`
- `liberations.html`
- `venue_show_history.html`
- `song_performances.html`
- `lists.html`
