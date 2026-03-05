# RC4 Release Evidence Pack

This folder is the machine-verifiable source of truth for RC4 release readiness.

## Contents

- `manifest.json`: release evidence payload consumed by CI and local QA.
- `manifest.schema.json`: schema contract for the manifest.
- `runs/`: physical iPad run evidence docs (`rc3_run_01`, `rc4_run_02`).
- `waivers/`: approved, time-bounded non-blocking exceptions.
- `IPAD_REGRESSION_RUN_TEMPLATE.md`: operator run template.
- `ISSUE_LOG_TEMPLATE.md`: issue log template for run findings.

## Commands

```bash
# schema + path checks; allows pending physical runs
npm run qa:release-evidence:soft

# strict release check; requires both runs PASS with zero open P0/P1
npm run qa:release-evidence
```

## Strict Release Rule

Strict mode is release-blocking and requires all of the following:

1. Manifest validates against schema.
2. All `report_path` and `doc_path` files exist.
3. Target platform is exactly iPad mini 6 / iPadOS 26.2 / Safari 26.2.
4. Both physical runs are `PASS` with `p0_open=0` and `p1_open=0`.
5. If `kpi_status.db_reduction_status=FAIL`, waiver `phase5-db-reduction-rc4` must be `APPROVED` with justification and follow-up milestone.

Release tag workflow (`v*`) enforces strict mode.

Current state (2026-03-05): `kpi_status.db_reduction_status=PASS`; no active KPI waiver is present in the manifest.
