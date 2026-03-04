# Kubernetes Manifests

Last updated: 2026-03-03

This folder contains the production workload manifests for `blaires-kind-heart`.

## Release Flow
1. Publish container image:
   ```bash
   npm run deploy:publish-image
   ```
2. Pin immutable image digest:
   ```bash
   npm run deploy:pin-image
   ```
3. Validate cluster compatibility:
   ```bash
   npm run deploy:preflight
   ```
4. Apply manifests:
   ```bash
   kubectl apply -k deploy/kubernetes
   ```

## Notes
- `deployment.yaml` should use a pinned digest (`@sha256:...`) before production apply.
- `service.yaml` exposes both app HTTP and metrics endpoints.

## Navigation
- Deploy docs hub: `deploy/README.md`
