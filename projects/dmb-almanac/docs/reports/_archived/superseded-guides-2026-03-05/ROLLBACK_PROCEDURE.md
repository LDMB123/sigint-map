# Rollback Procedure (Local-Only, Rust-First)

This project has not been publicly deployed yet. The current workflow is a local-only offline PWA transition.

## What “Rollback” Means Right Now
- If a change breaks the Rust app locally, rollback is just `git checkout`/revert to a known-good commit.
- If a service worker gets “stuck” in a browser profile, rollback is performed by clearing browser state (not redeploying infrastructure).

## Browser Rollback (Service Worker + Storage)
In Chrome/Chromium:
1. DevTools: Application
2. Service Workers: unregister the service worker for the origin
3. Storage: Clear site data (IndexedDB, Cache Storage, Local Storage)
4. Hard reload the page

## Code Rollback (Repo)
1. Identify last known good commit.
2. Re-run the fast gate:

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac
bash scripts/cutover-rehearsal.sh
```

