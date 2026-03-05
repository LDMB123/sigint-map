# Memory Leak Sources (Legacy Reference)

This file previously contained a long JS-era memory leak catalog for removed `/src/lib/*` code.

## Current Status

- The referenced paths are from the pre-Rust prototype and are no longer the active app surface in this repository.
- Keep this file as a short historical marker to avoid loading stale, high-token content in normal sessions.

## Use Instead

- Canonical current state: `STATUS.md`
- Rust cutover gate: `docs/ops/CUTOVER_RUNBOOK.md`
- Memory audit summary context: `docs/reports/MEMORY_AUDIT_SUMMARY.md`
- Historical detailed memory audit (if explicitly needed): `docs/reports/_full_audits/MEMORY_MANAGEMENT_AUDIT.md`

## Practical Rule

Do not use this legacy source list for current Rust implementation decisions. Treat it as archival context only.
