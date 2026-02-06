# Rollback Runbook (If Cutover Regresses)

Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

Purpose: Safely revert traffic back to the legacy app while minimizing client breakage from service worker and cached asset state.

## Rollback Triggers
1. Hydration failures in production.
2. Widespread stale UI reports (SSR-only, missing hydration).
3. Offline mode broken for core flows.
4. IndexedDB migration deletes legacy data incorrectly.
5. Service worker update loop or failure to activate.

## Server-Side Rollback (Traffic)
1. Flip traffic back to legacy app deployment immediately.
2. Keep Rust deployment accessible via a separate origin if possible for debugging.

## Client-Side Recovery Guidance (Support Script)
When users report "stuck" or "stale" behavior, use the least destructive path first.

1. In-app recovery:
   - Open PWA Status panel.
   - Use "Check for updates".
   - Use "Cleanup legacy caches" if available and online.
2. DevTools recovery (Chrome):
   - Application -> Service Workers: Unregister.
   - Only if still broken: Application -> Storage: Clear site data.
   - Hard reload.

Important:
- "Clear site data" deletes offline data (IndexedDB + caches). Treat it as a last resort.

## Rollback Hygiene (Avoid Making It Worse)
1. Do not ship another breaking SW change while rolling back.
2. Do not bump SW version repeatedly to chase a bad state.
3. Keep rollback window explicit:
   - If the team cannot commit to supporting the legacy app, do not roll back without a plan.

## After Rollback (Root Cause Collection)
1. Capture:
   - Browser version, OS.
   - Whether PWA installed.
   - Whether offline seed and hydration completed (`window.__DMB_HYDRATED` in diagnostics).
   - Service worker controller script URL.
2. Reproduce in a clean profile and a real legacy profile.
