# DMB Almanac Scraping Reference (Rust Pipeline)

## Purpose

Operational reference for the active Rust scraping/data pipeline used by the Rust-first offline PWA.

## Canonical Implementation

- Scrape + parse logic: `rust/crates/dmb_pipeline/src/scrape.rs`
- CLI entrypoints: `rust/crates/dmb_pipeline/src/main.rs`
- Fixtures: `rust/crates/dmb_pipeline/tests/fixtures/`

## Core Commands

```bash
# Live scrape + warnings report
cargo run -p dmb_pipeline -- scrape --live --warnings-output data/warnings.json

# Enforce warning budget
cargo run -p dmb_pipeline -- scrape --live --warnings-output data/warnings.json --warnings-max 0

# Fixture-only regression gate
cargo run -p dmb_pipeline -- scrape-fixtures --warnings-output data/warnings-fixtures.json --warnings-max 0

# Selector smoke check
cargo run -p dmb_pipeline -- scrape-smoke --warnings-output data/warnings.json --warnings-max 0

# Validate warning report
DMB_VALIDATE_WARNING_REPORT=data/warnings.json \
  cargo run -p dmb_pipeline -- validate --strict-warnings
```

## Primary Outputs

- Warning reports: `data/warnings.json`
- Server-served bundle: `rust/static/data/`
- Data manifest: `rust/static/data/manifest.json`

## Operational Rules

- Treat Rust pipeline outputs as source of truth.
- Use fixture and smoke modes before broad live reruns.
- Keep warning budgets explicit (`--warnings-max`) in automation.

## Troubleshooting (Short)

- Frequent retries/timeouts: reduce concurrency, rerun smoke/fixtures first.
- Empty/partial scrape output: verify target selectors in `scrape.rs` and rerun fixture gate.
- Validation failures: inspect `data/warnings.json` and reconcile against strict validation rules.

## Deep-Dive Debug Path

When short troubleshooting is insufficient, inspect in this order:

1. Fixture baselines: `rust/crates/dmb_pipeline/tests/fixtures/`
2. Parser/selectors: `rust/crates/dmb_pipeline/src/scrape.rs`
3. CLI wiring and flags: `rust/crates/dmb_pipeline/src/main.rs`
4. Warning payloads: `data/warnings.json` (and fixture warning outputs)
5. Validation and parity flow: run `validate --strict-warnings` before broad reruns

## Historical Notes

Legacy JS-era scraping notes were intentionally removed from this active reference to keep token usage low and avoid stale guidance.
