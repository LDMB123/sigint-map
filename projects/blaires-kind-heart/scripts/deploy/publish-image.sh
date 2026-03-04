#!/usr/bin/env bash
set -euo pipefail

IMAGE="ghcr.io/ldmb123/blaires-kind-heart"
TAG="main"
SKIP_BUILD=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/ghcr-common.sh"

usage() {
  cat <<'USAGE'
Usage: scripts/deploy/publish-image.sh [options]

Build and publish the static web container to GHCR.

Options:
  --image <image>      Container image repo (default: ghcr.io/ldmb123/blaires-kind-heart)
  --tag <tag>          Primary tag to push (default: main)
  --skip-build         Skip npm release build before docker build
  --help               Show this help text
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image)
      IMAGE="${2:-}"
      shift 2
      ;;
    --tag)
      TAG="${2:-}"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument '$1'" >&2
      usage
      exit 1
      ;;
  esac
done

if ! ghcr_validate_image "${IMAGE}"; then
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker is not installed" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "error: docker daemon unavailable; start Docker Desktop and retry" >&2
  exit 1
fi

TOKEN="$(ghcr_resolve_token)"
if [[ -z "$TOKEN" ]]; then
  echo "error: missing GHCR token (set GHCR_TOKEN/GH_TOKEN or authenticate gh cli)" >&2
  exit 1
fi

USERNAME="$(ghcr_resolve_username)"

if [[ "$SKIP_BUILD" -ne 1 ]]; then
  npm run build:release
fi

GIT_SHA="$(git rev-parse --short=12 HEAD)"
PRIMARY_TAG="${IMAGE}:${TAG}"
SHA_TAG="${IMAGE}:sha-${GIT_SHA}"

echo "${TOKEN}" | docker login ghcr.io -u "${USERNAME}" --password-stdin >/dev/null

docker build -f deploy/docker/Dockerfile -t "${PRIMARY_TAG}" -t "${SHA_TAG}" .
if ! ghcr_push_with_hint "${PRIMARY_TAG}"; then
  exit 1
fi
if ! ghcr_push_with_hint "${SHA_TAG}"; then
  exit 1
fi

echo "published ${PRIMARY_TAG}"
echo "published ${SHA_TAG}"

if command -v npm >/dev/null 2>&1; then
  npm run deploy:pin-image -- --dry-run --image "${IMAGE}" --tag "${TAG}" >/dev/null
fi
