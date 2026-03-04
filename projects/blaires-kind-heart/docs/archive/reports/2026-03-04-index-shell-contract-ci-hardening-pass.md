# Index-Shell Contract + CI Hardening Pass

Date: 2026-03-04
Source plan: `/Users/louisherman/Downloads/KindHeartPhase3.md`

## Objective
Harden index-shell contract enforcement and CI observability after the index-first simplification pass, with no new dependencies and no user-facing contract drift.

## Scope Delivered

### Wave 0-1 (baseline freeze + static hardening)
- Added invariant ownership matrix under `config/index-shell.json -> qa.contract_invariants`.
- Refactored `scripts/check-index-shell-contract.mjs` to expose reusable invariant and contract failure collection.
- Added `scripts/check-index-shell-config.mjs` for config preflight validation.
- Added `scripts/check-index-shell-contract-negative.mjs` for synthetic mutation failure checks.
- Added scripts:
  - `qa:index-shell-config`
  - `qa:index-shell-contract-negative`
  - `qa:index-shell-deep`

### Wave 2 (generator guardrails)
- Hardened `scripts/generate-index-shell.mjs` with marker multiplicity/order preflight checks.
- Enforced exact panel order parity with `config/panels.json` (excluding `home-scene`).
- Added duplicate detection for panel IDs and head directive lists.
- Enforced normalized output formatting and single trailing newline.
- Added explicit preflight failure messaging in `scripts/check-generated-sync.sh`.

### Wave 3 (CI integration)
- Added `index-shell-contract-gate` job to `.github/workflows/pwa-health.yml`.
- Job runs `npm run qa:index-shell-deep` with Node + Rust + Trunk + Playwright Chromium parity.
- Added this gate into `e2e-quality-gates.needs`.

### Wave 4 (runtime-coupling E2E coverage)
- Expanded `e2e/index-shell-contract.spec.ts` deep-link coverage across all panel IDs.
- Expanded `e2e/panel-registry.spec.ts` to assert breadcrumb/theme/title hydration (registry present) and non-empty fallback labels (registry missing) across all panels.
- Hardened `e2e/feature-completeness.spec.ts` game arena + exit toggle assertions.

### Wave 5 (docs + operationalization)
- Updated active runbooks and ledger:
  - `README.md`
  - `docs/TESTING.md`
  - `docs/HANDOFF.md`
  - `docs/STATUS_LEDGER.md`

## Wave Commit Set
- `ef4fa5a` Wave 0-1: freeze index-shell invariants and harden static contract gates
- `68921d7` Wave 2: add index-shell generator preflight guardrails and stable output
- `0e4995b` Wave 3: wire index-shell deep contract gate into CI workflow
- `4ef0f9e` Wave 4: deepen index-shell runtime coupling E2E contract coverage
- `04f49c4` Wave 5: operationalize index-shell deep gates in docs and status ledger

## Validation Evidence
All required validation commands passed on committed branch state:

```bash
cargo check -q
npm run -s qa:generated-sync
npm run -s qa:critical-token-sync
npm run -s qa:panel-registry-shape
npm run -s qa:runtime
npm run -s qa:index-shell-config
npm run -s qa:index-shell-contract
npm run -s qa:index-shell-contract-negative
npm run -s qa:db-contract
npm run -s qa:duplication-budget
npm run -s qa:docs-links
node scripts/run-e2e.mjs --grep "panel registry|runtime diagnostics|feature completeness|index shell contract"
```

Result: PASS.
