# Documentation Index

Last updated: 2026-03-04 (session 29)
Scope: active docs map for this repository.

## Primary Entry Points

- Workspace-wide docs map: `docs/WORKSPACE_DOCS_MAP.md`
- Active docs map: `docs/INDEX.md` (this file)
- Archive docs map: `docs/archive/INDEX.md`
- Deploy docs map: `deploy/README.md`

## Active Docs

### Status & Tracking
- `docs/STATUS_LEDGER.md` - QA gate results and work history
- `docs/HANDOFF.md` - Fast takeover runbook for new sessions
- Session 28 focus: RC4 deep freeze readiness wave (release evidence contract, strict validator, release-tag workflow)

### References
- `docs/ICONS.md` - Icon generation guide
- `docs/TESTING.md` - Testing procedures
- `docs/TROUBLESHOOTING.md` - Common issues and fixes
- `docs/PERSISTENCE_CONTRACT.md` - DB worker protocol, schema, export/restore invariants

### Testing & Deployment
- `docs/IPAD_REGRESSION_TEMPLATE.md` - Physical iPad testing checklist
- `docs/testing/release-evidence/README.md` - RC4 machine-verifiable release evidence pack
- `docs/deployment/README.md` - Deployment docs entry point
- `docs/deployment/PWA_HEADERS.md` - Required HTTP headers for PWA

### Reports
- `docs/reports/README.md` - Report locations
- `docs/testing/README.md` - Testing artifacts
- Latest operational update: `docs/STATUS_LEDGER.md` (session 28, RC4 readiness evidence wave)
- Latest pass report: `docs/archive/reports/2026-03-04-phase4-index-shell-modernization-pass.md`
- Latest pass report: `docs/archive/reports/2026-03-04-index-shell-contract-ci-hardening-pass.md`
- Latest pass report: `docs/archive/reports/2026-03-03-css-apple-silicon-optimizer-pass.md`
- Generated QA outputs: `scripts/reports/`
- Release-tag readiness workflow: `.github/workflows/release-readiness.yml`

## Archive
- All historical docs: `docs/archive/INDEX.md`
- Phase docs: `docs/archive/phase-docs/`
- Completed plans: `docs/archive/plans/`
- Simulator evidence: `docs/archive/assets/`

## Related Non-Docs Folders With Markdown
- `assets/icons/README.md` - icon generation quick guide
- `deploy/README.md` - deployment docs hub

## Organization Rules
- Keep active docs minimal (token budget: 25,000)
- Generated/test artifacts go in `scripts/reports/` or `docs/archive/`
- Only reference docs and deployment guides stay in active docs root
