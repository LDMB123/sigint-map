# Bundle Audit References

Use this directory for dated bundle-size and performance audits.
The current performance baseline for the Rust-owned client lives in `docs/wasm/rust-optimization-report.md` and `docs/gpu/GPU_REFERENCE.md`.

## Current Supporting Inputs

- `docs/wasm/README.md`
- `docs/wasm/rust-optimization-report.md`
- `docs/gpu/GPU_REFERENCE.md`
- `scripts/check-wasm-size.sh`

## Naming Pattern

- BUNDLE_AUDIT_YYYY-MM-DD.md

## Maintenance Rule

Promote any still-relevant performance conclusions into the active Wasm or GPU references instead of leaving them only in dated audit files.
