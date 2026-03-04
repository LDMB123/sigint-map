#!/usr/bin/env bash

ghcr_validate_image() {
  local image="$1"
  if [[ ! "${image}" =~ ^ghcr\.io/.+/.+$ ]]; then
    echo "error: image must be a GHCR repo, got '${image}'" >&2
    return 1
  fi
}

ghcr_resolve_token() {
  local token="${GHCR_TOKEN:-${GH_TOKEN:-${GITHUB_TOKEN:-}}}"
  if [[ -z "${token}" ]] && command -v gh >/dev/null 2>&1; then
    token="$(gh auth token 2>/dev/null || true)"
  fi
  printf '%s' "${token}"
}

ghcr_resolve_username() {
  local username="${GHCR_USERNAME:-}"
  if [[ -z "${username}" ]] && command -v gh >/dev/null 2>&1; then
    username="$(gh api user --jq .login 2>/dev/null || true)"
  fi
  if [[ -z "${username}" ]]; then
    username="token"
  fi
  printf '%s' "${username}"
}

ghcr_push_with_hint() {
  local ref="$1"
  if docker push "${ref}"; then
    return 0
  fi
  echo "error: failed pushing ${ref}" >&2
  echo "hint: token likely lacks package write access. Use a token with package publish scopes." >&2
  return 1
}

ghcr_fetch_bearer_token() {
  local repo="$1"
  local username="$2"
  local token="$3"
  local body_file status bearer
  body_file="$(mktemp "${TMPDIR:-/tmp}/ghcr-token.XXXXXX.json")"
  status="$(
    curl -sS \
      -u "${username}:${token}" \
      -o "${body_file}" \
      -w '%{http_code}' \
      "https://ghcr.io/token?scope=repository:${repo}:pull"
  )"
  if [[ "${status}" != "200" ]]; then
    echo "error: GHCR token request failed for ${repo} (HTTP ${status})" >&2
    rm -f "${body_file}"
    return 1
  fi
  bearer="$(sed -nE 's/.*"token":"([^"]+)".*/\1/p' "${body_file}")"
  rm -f "${body_file}"
  if [[ -z "${bearer}" ]]; then
    echo "error: unable to acquire GHCR bearer token for ${repo}" >&2
    return 1
  fi
  printf '%s' "${bearer}"
}
