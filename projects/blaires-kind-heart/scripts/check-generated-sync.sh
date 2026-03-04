#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

GENERATED_FILES=(
  "rust/panel_registry_generated.rs"
  "public/panel-registry.js"
  "rust/db_contract_generated.rs"
  "public/db-contract.js"
  "rust/skill_taxonomy_generated.rs"
  "public/skill-taxonomy.js"
  "rust/skill_mastery_badges_generated.rs"
  "public/skill-mastery-badges.js"
  "public/reflection-prompts.generated.js"
  "rust/animation_timings_generated.rs"
  "src/styles/generated-animation-timings.css"
  "index.html"
  "public/asset-manifest.json"
  "public/asset-manifest.js"
)

declare -A BEFORE_HASHES

hash_or_missing() {
  local file="$1"
  if [ ! -f "$file" ]; then
    printf "__MISSING__"
    return
  fi
  shasum "$file" | awk '{print $1}'
}

for file in "${GENERATED_FILES[@]}"; do
  BEFORE_HASHES["$file"]="$(hash_or_missing "$file")"
done

node scripts/generate-panel-registry.mjs >/dev/null
node scripts/generate-db-contract.mjs >/dev/null
node scripts/generate-skill-taxonomy.mjs >/dev/null
node scripts/generate-skill-mastery-badges.mjs >/dev/null
node scripts/generate-reflection-prompts.mjs >/dev/null
node scripts/generate-animation-timings.mjs >/dev/null
if ! node scripts/generate-index-shell.mjs >/dev/null; then
  echo "❌ Index shell generator preflight failed. Fix markers/config and rerun." >&2
  exit 1
fi
node scripts/generate-critical-inline-css.mjs >/dev/null
bash scripts/asset-manifest.sh >/dev/null

CHANGED=()
for file in "${GENERATED_FILES[@]}"; do
  before="${BEFORE_HASHES["$file"]}"
  after="$(hash_or_missing "$file")"
  if [ "$before" != "$after" ]; then
    CHANGED+=("$file")
  fi
done

if [ "${#CHANGED[@]}" -gt 0 ]; then
  echo "❌ Generated artifacts are out of sync. Regenerate and commit:" >&2
  echo "   node scripts/generate-panel-registry.mjs" >&2
  echo "   node scripts/generate-db-contract.mjs" >&2
  echo "   node scripts/generate-skill-taxonomy.mjs" >&2
  echo "   node scripts/generate-skill-mastery-badges.mjs" >&2
  echo "   node scripts/generate-reflection-prompts.mjs" >&2
  echo "   node scripts/generate-animation-timings.mjs" >&2
  echo "   node scripts/generate-index-shell.mjs" >&2
  echo "   node scripts/generate-critical-inline-css.mjs" >&2
  echo "   bash scripts/asset-manifest.sh" >&2
  echo >&2
  printf 'Changed generated files:\n' >&2
  for file in "${CHANGED[@]}"; do
    printf '  - %s\n' "$file" >&2
  done
  exit 1
fi

echo "✅ Generated artifacts are in sync"
