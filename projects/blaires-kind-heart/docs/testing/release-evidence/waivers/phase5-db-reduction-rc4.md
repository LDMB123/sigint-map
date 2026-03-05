# Waiver: phase5-db-reduction-rc4

Status: RESOLVED (historical record)
Resolved on: 2026-03-05
Resolution evidence: `scripts/reports/phase5-kpi-20260305-000315.md`

## 1) Failing Metric (Concrete Values)

- Metric: `db_reduction` from Phase 5 KPI report.
- Baseline value: `46`.
- Current value: `46`.
- Status: `FAIL` (no reduction from baseline).
- Source report: `scripts/reports/phase5-kpi-20260304-074707.md`.
- Recorded on: `2026-03-04`.

## 2) Why This Is Non-Blocking for RC4

RC4 scope is freeze-readiness and operational closure. Current RC gates, build verification, runtime diagnostics, and iPad-profile performance checks are passing. The KPI miss is architectural debt, not a release safety or correctness regression.

## 3) Risk Assessment

- Short-term release risk: low.
- Maintainability risk if deferred repeatedly: medium.
- Runtime risk introduced by waiver: low (no functional behavior change is being waived).

## 4) Follow-up Milestone and Owner

- Owner: Engineering.
- Follow-up milestone: RC5 Wave 1.
- Required action: deliver measurable reduction in cross-domain DB callsites and refresh KPI baseline/report.

## 5) Expiry Date (Hard Deadline)

- Expires on: `2026-04-15`.

## 6) Exit Criteria to Remove Waiver

1. `db_reduction_status` is `PASS` in a new KPI report.
2. Manifest `kpi_status.source_report_path` points to the new report.
3. Waiver entry is removed from `docs/testing/release-evidence/manifest.json`.

## 7) Resolution Outcome

- KPI now passes with `cross_domain_db_callsites=0` and `db_reduction_status=PASS`.
- Manifest now points to `scripts/reports/phase5-kpi-20260305-000315.md`.
- Waiver entry has been removed from `docs/testing/release-evidence/manifest.json`.
