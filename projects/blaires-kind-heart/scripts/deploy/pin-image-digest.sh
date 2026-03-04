#!/usr/bin/env bash
set -euo pipefail

IMAGE="ghcr.io/ldmb123/blaires-kind-heart"
TAG="main"
FILE="deploy/kubernetes/deployment.yaml"
DRY_RUN=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/ghcr-common.sh"

usage() {
  cat <<'USAGE'
Usage: scripts/deploy/pin-image-digest.sh [options]

Resolve an immutable GHCR digest for an image tag and patch deploy/kubernetes/deployment.yaml.

Options:
  --image <image>    Container image repo (default: ghcr.io/ldmb123/blaires-kind-heart)
  --tag <tag>        Container image tag (default: main)
  --file <path>      Deployment manifest to patch (default: deploy/kubernetes/deployment.yaml)
  --dry-run          Resolve and print digest without modifying files
  --help             Show this help text
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
    --file)
      FILE="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
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

if [[ ! -f "$FILE" ]]; then
  echo "error: deployment file not found: $FILE" >&2
  exit 1
fi

REPO="${IMAGE#ghcr.io/}"

TOKEN="$(ghcr_resolve_token)"
if [[ -z "$TOKEN" ]]; then
  echo "error: missing GHCR token (set GHCR_TOKEN or GH_TOKEN, or authenticate gh cli)" >&2
  exit 1
fi

USERNAME="$(ghcr_resolve_username)"
BEARER="$(ghcr_fetch_bearer_token "${REPO}" "${USERNAME}" "${TOKEN}")"
if [[ -z "${BEARER}" ]]; then
  exit 1
fi

MANIFEST_HEADERS_FILE="$(mktemp)"
MANIFEST_STATUS="$(
  curl -sSI \
    -H "Authorization: Bearer ${BEARER}" \
    -H "Accept: application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json" \
    -o "${MANIFEST_HEADERS_FILE}" \
    -w '%{http_code}' \
    "https://ghcr.io/v2/${REPO}/manifests/${TAG}"
)"
if [[ "${MANIFEST_STATUS}" != "200" ]]; then
  echo "error: manifest lookup failed for ${IMAGE}:${TAG} (HTTP ${MANIFEST_STATUS})." >&2
  echo "hint: publish the image first (run: npm run deploy:publish-image)." >&2
  rm -f "${MANIFEST_HEADERS_FILE}"
  exit 1
fi

DIGEST="$(
  tr -d '\r' < "${MANIFEST_HEADERS_FILE}" \
    | awk 'BEGIN { IGNORECASE=1 } /^docker-content-digest:/ { print $2 }'
)"
rm -f "${MANIFEST_HEADERS_FILE}"
if [[ -z "$DIGEST" ]]; then
  echo "error: digest not found for ${IMAGE}:${TAG}. Ensure image is published and tag exists." >&2
  exit 1
fi

echo "resolved ${IMAGE}:${TAG} -> ${DIGEST}"

if [[ "$DRY_RUN" -eq 1 ]]; then
  exit 0
fi

TMP_FILE="$(mktemp)"
set +e
awk -v newImage="${IMAGE}@${DIGEST}" '
  !done && $0 ~ /^[[:space:]]*image:[[:space:]]*ghcr\.io\/[^[:space:]]*\/blaires-kind-heart([:@][^[:space:]]+)?[[:space:]]*$/ {
    sub(/image:[[:space:]]*.*/, "image: " newImage);
    done=1
  }
  { print }
  END { if (!done) exit 42 }
' "$FILE" > "$TMP_FILE"
AWK_EXIT=$?
set -e

if [[ "$AWK_EXIT" -ne 0 ]]; then
  rm -f "$TMP_FILE"
  if [[ "$AWK_EXIT" -eq 42 ]]; then
    echo "error: could not find app image line to patch in ${FILE}" >&2
  else
    echo "error: failed updating ${FILE}" >&2
  fi
  exit 1
fi

mv "$TMP_FILE" "$FILE"
echo "updated ${FILE} with pinned digest"
