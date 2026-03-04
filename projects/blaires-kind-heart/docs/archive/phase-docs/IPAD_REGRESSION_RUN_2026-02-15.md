# iPad Regression Run - 2026-02-15

- Archive Path: `docs/archive/phase-docs/IPAD_REGRESSION_RUN_2026-02-15.md`
- Normalized On: `2026-03-04`
- Source Title: `iPad Regression Run - 2026-02-15`

## Summary
Execute current-cycle iPad regression validation for release confidence.

## Context
### Objective
Execute current-cycle iPad regression validation for release confidence.

### Environment Check
- Date: 2026-02-15
- Host: macOS workstation
- Device discovery command: `xcrun xctrace list devices`
- Result: no physical iPad detected; only host Mac + simulators listed.

## Actions
_No actions recorded._

## Validation
Ran Safari-engine proxy test:

```bash
npm run test:e2e:webkit
```

Result:
- PASS (`1 passed`)
- Test: `webkit smoke › home scene renders with key controls`

- Simulator target: `iPad mini (A17 Pro)`, iOS 26.2
- Boot method: `xcrun simctl boot` + `xcrun simctl bootstatus -b`
- App launch method: `xcrun simctl openurl` against host-served `dist/`
- Host serve: `python3 -m http.server 4192 --directory dist`

Evidence captured:
- `../assets/simulator-regression/2026-02-15/home.png`
- `../assets/simulator-regression/2026-02-15/stories.png`
- `../assets/simulator-regression/2026-02-15/tracker.png`
- HTTP access log: `../assets/simulator-regression/2026-02-15/http.log` (successful 200s for app shell, WASM, CSS, and assets)

### Physical Device Status
- Physical iPad mini 6 regression remains pending.
- Current state: simulator regression complete; physical-device-specific validation still recommended before release sign-off.

### Next Physical Run Steps
1. Connect target iPad mini 6 (iPadOS 26.2).
2. Serve app via local network:
   - `trunk serve --address 0.0.0.0`
3. Run manual checklist from archived full guide:
   - `../reference-full/TESTING.full.md`
4. Record pass/fail evidence in `docs/STATUS_LEDGER.md`.

## References
_No references recorded._

