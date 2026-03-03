# GitOps Manifests

Last updated: 2026-03-03

This folder contains the Argo CD application configuration for deploying `deploy/kubernetes` into the `blaires-kind-heart` namespace.

## Before Apply
Update:
- `repoURL` to your repository remote.
- `targetRevision` to the desired branch/tag.

## Apply
```bash
kubectl apply -k deploy/gitops
```

## Verify
1. Argo CD app sync status is healthy.
2. Target namespace resources are reconciled.

## Navigation
- Deploy docs hub: `deploy/README.md`
