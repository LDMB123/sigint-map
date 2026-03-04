#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "error: kubectl is not installed" >&2
  exit 1
fi

CONTEXT="$(kubectl config current-context 2>/dev/null || true)"
if [[ -z "${CONTEXT}" ]]; then
  echo "error: no active kubectl context configured" >&2
  echo "hint: run 'kubectl config use-context <name>' first" >&2
  exit 1
fi

echo "kubectl context: ${CONTEXT}"
kubectl cluster-info >/dev/null

echo "render check: deploy/kubernetes"
kubectl kustomize deploy/kubernetes >/dev/null
echo "render check: deploy/monitoring"
kubectl kustomize deploy/monitoring >/dev/null
echo "render check: deploy/gitops"
kubectl kustomize deploy/gitops >/dev/null

echo "server dry-run: deploy/kubernetes"
kubectl apply --dry-run=server -k deploy/kubernetes >/dev/null

if kubectl api-resources --api-group=monitoring.coreos.com -o name 2>/dev/null | grep -q '^servicemonitors$'; then
  echo "server dry-run: deploy/monitoring"
  kubectl apply --dry-run=server -k deploy/monitoring >/dev/null
else
  echo "skip server dry-run for deploy/monitoring (ServiceMonitor CRD missing)"
fi

if kubectl api-resources --api-group=argoproj.io -o name 2>/dev/null | grep -q '^applications$'; then
  echo "server dry-run: deploy/gitops"
  kubectl apply --dry-run=server -k deploy/gitops >/dev/null
else
  echo "skip server dry-run for deploy/gitops (Argo CD Application CRD missing)"
fi

echo "kubernetes preflight checks passed"
