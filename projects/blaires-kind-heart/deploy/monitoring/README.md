# Monitoring Manifests

Last updated: 2026-03-03

These manifests provide baseline monitoring scaffolds for environments running Prometheus Operator.

## Included Resources
- `servicemonitor.yaml`: scrapes `blaires-kind-heart-metrics`.
- `prometheus-rules.yaml`: baseline alerts for availability and latency.
- `kustomization.yaml`: apply entrypoint.

## Apply
```bash
kubectl apply -k deploy/monitoring
```

## Environment Notes
Adjust namespaces and selector labels if your Prometheus installation uses different conventions.

## Navigation
- Deploy docs hub: `deploy/README.md`
