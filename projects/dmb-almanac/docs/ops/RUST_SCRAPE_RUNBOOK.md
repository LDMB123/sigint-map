# Rust Scrape Runbook

Use this runbook for safe live scrapes and warning-budget enforcement.

## Live Scrape (Standard)
```bash
cd rust
cargo run -p dmb_pipeline -- scrape --live --warnings-output data/warnings.json --warnings-max 0
```

## Cache-Only Dry Run (No Network, No Writes)
```bash
cd rust
cargo run -p dmb_pipeline -- scrape --live --dry-run --warnings-output data/warnings.json
```
Alias: `--cache-only` (same behavior).

## Warn-Only (Never Fails)
```bash
cd rust
cargo run -p dmb_pipeline -- scrape --live --warn-only --warnings-output data/warnings.json
```

## Warning JSONL (Optional)
```bash
cd rust
cargo run -p dmb_pipeline -- scrape --live --warnings-output data/warnings.json --warnings-jsonl target/scrape-warnings.jsonl
```

## Override Retries / TTL / Sampling
```bash
cd rust
cargo run -p dmb_pipeline -- scrape --live --max-retries 5 --cache-ttl-days 30 --max-items 50 --warnings-output data/warnings.json
```

Note: `--max-items` truncates lists after scraping. Use it for quick selector smoke checks only; it does not reduce network requests.

## Validate + Warning Regression Gate
```bash
cd rust
DMB_VALIDATE_WARNING_REPORT=data/warnings.json \
DMB_WARNING_MAX_EMPTY=0 \
DMB_WARNING_MAX_MISSING=0 \
DMB_WARNING_BASELINE=data/warnings.baseline.json \
cargo run -p dmb_pipeline -- validate
```

## Validate With Endpoint Budgets
```bash
cd rust
DMB_VALIDATE_WARNING_REPORT=data/warnings.json \
DMB_ENDPOINT_TIMING_MAX_PCT=50 \
DMB_ENDPOINT_RETRY_MAX=2 \
cargo run -p dmb_pipeline -- validate
```

## Empty Selector Budgets By Context
```bash
cd rust
DMB_VALIDATE_WARNING_REPORT=data/warnings.json \
DMB_WARNING_MAX_EMPTY_BY_CONTEXT=data/warnings.max-by-context.json \
cargo run -p dmb_pipeline -- validate
```

## Selector Smoke Test (List Pages Only)
```bash
cd rust
cargo run -p dmb_pipeline -- scrape-smoke --warnings-output data/warnings.json --warnings-max 0
```

## Validate (Strict Warnings - Local Only)
```bash
cd rust
DMB_VALIDATE_WARNING_REPORT=data/warnings.json \
cargo run -p dmb_pipeline -- validate --strict-warnings
```

## Updating Warning Baseline (Manual Only)
```bash
cd rust
../scripts/update-warning-baseline.sh
```

## Warning Trend Compare (Manual)
```bash
./scripts/compare-warning-reports.py rust/data/warnings.json rust/data/warnings.baseline.json
```
