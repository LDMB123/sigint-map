# E2E Test Harness

Playwright-based end-to-end tests live in this directory.

## Install

```bash
cd e2e
npm install
```

## Run

```bash
cd e2e
npm run test:e2e
```

## Notes

- `e2e/node_modules/`, `e2e/playwright-report/`, and `e2e/test-results/` are local artifacts and are ignored.
- For environment-targeted E2E flow, prefer `bash scripts/cutover-remote-e2e.sh` from repo root.
- Rust cutover scripts include `tests/e2e/rust-visual.spec.js`; update baselines intentionally with:

```bash
cd e2e
RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/rust-visual.spec.js --project=chromium --update-snapshots
```
