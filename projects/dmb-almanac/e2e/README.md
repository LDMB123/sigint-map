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

