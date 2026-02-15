#!/bin/bash
# Asset Manifest Generator for Blaire's Kind Heart
# Generates BOTH:
# - public/asset-manifest.json (Rust include_str source of truth)
# - public/asset-manifest.js   (Service Worker importScripts source)

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS_DIR="$PROJECT_ROOT/assets"
OUTPUT_JS="$PROJECT_ROOT/public/asset-manifest.js"
OUTPUT_JSON="$PROJECT_ROOT/public/asset-manifest.json"

mkdir -p "$PROJECT_ROOT/public"

hash_file() {
  shasum "$1" | awk '{print $1}'
}

build_cache_version() {
  {
    echo "kindheart-cache-version-v2"

    for file in \
      "$PROJECT_ROOT/index.html" \
      "$PROJECT_ROOT/manifest.webmanifest" \
      "$PROJECT_ROOT/wasm-init.js" \
      "$PROJECT_ROOT/public/offline.html" \
      "$PROJECT_ROOT/public/sw.js" \
      "$PROJECT_ROOT/public/sw-assets.js"
    do
      if [ -f "$file" ]; then
        rel="${file#$PROJECT_ROOT/}"
        printf "%s:%s\n" "$rel" "$(hash_file "$file")"
      fi
    done

    if [ -d "$PROJECT_ROOT/src/styles" ]; then
      find "$PROJECT_ROOT/src/styles" -maxdepth 1 -type f -name "*.css" | LC_ALL=C sort | while read -r file; do
        rel="${file#$PROJECT_ROOT/}"
        printf "%s:%s\n" "$rel" "$(hash_file "$file")"
      done
    fi

    if [ -d "$ASSETS_DIR/companions" ]; then
      find "$ASSETS_DIR/companions" -type f -name "*.webp" | LC_ALL=C sort | while read -r file; do
        rel="${file#$PROJECT_ROOT/}"
        printf "%s:%s\n" "$rel" "$(hash_file "$file")"
      done
    fi

    if [ -d "$ASSETS_DIR/gardens" ]; then
      find "$ASSETS_DIR/gardens" -type f -name "*.webp" | LC_ALL=C sort | while read -r file; do
        rel="${file#$PROJECT_ROOT/}"
        printf "%s:%s\n" "$rel" "$(hash_file "$file")"
      done
    fi
  } | shasum | awk '{print substr($1,1,16)}'
}

CACHE_VERSION="$(build_cache_version)"
GENERATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

COMPANIONS="$(find "$ASSETS_DIR/companions" -type f -name "*.webp" | LC_ALL=C sort || true)"
GARDENS="$(find "$ASSETS_DIR/gardens" -type f -name "*.webp" | LC_ALL=C sort || true)"

TOTAL_COMPANIONS="$(printf "%s\n" "$COMPANIONS" | sed '/^$/d' | wc -l | tr -d ' ')"
TOTAL_GARDENS="$(printf "%s\n" "$GARDENS" | sed '/^$/d' | wc -l | tr -d ' ')"

TMP_JSON="$(mktemp "$PROJECT_ROOT/public/.asset-manifest.XXXXXX.json")"
trap 'rm -f "$TMP_JSON"' EXIT

cat > "$TMP_JSON" <<EOF
{
  "meta": {
    "cache_version": "$CACHE_VERSION",
    "generated_at": "$GENERATED_AT",
    "companion_count": $TOTAL_COMPANIONS,
    "garden_count": $TOTAL_GARDENS
  },
  "companions": {
EOF

COMPANION_COUNT=0
for asset in $COMPANIONS; do
  [ -z "$asset" ] && continue
  COMPANION_COUNT=$((COMPANION_COUNT + 1))

  filename="$(basename "$asset" .webp)"
  skin="$(echo "$filename" | cut -d'_' -f1)"
  expression="$(echo "$filename" | cut -d'_' -f2)"
  rel_path="companions/$(basename "$asset")"

  comma=","
  if [ "$COMPANION_COUNT" -eq "$TOTAL_COMPANIONS" ]; then
    comma=""
  fi
  printf '    "%s_%s": "%s"%s\n' "$skin" "$expression" "$rel_path" "$comma" >> "$TMP_JSON"
done

cat >> "$TMP_JSON" <<'EOF'
  },
  "gardens": {
EOF

GARDEN_COUNT=0
for asset in $GARDENS; do
  [ -z "$asset" ] && continue
  GARDEN_COUNT=$((GARDEN_COUNT + 1))

  filename="$(basename "$asset" .webp)"
  garden="$(echo "$filename" | sed 's/_stage_[0-9]$//')"
  stage="$(echo "$filename" | grep -o '[0-9]$')"
  rel_path="gardens/$(basename "$asset")"

  comma=","
  if [ "$GARDEN_COUNT" -eq "$TOTAL_GARDENS" ]; then
    comma=""
  fi
  printf '    "%s_stage_%s": "%s"%s\n' "$garden" "$stage" "$rel_path" "$comma" >> "$TMP_JSON"
done

cat >> "$TMP_JSON" <<'EOF'
  }
}
EOF

mv "$TMP_JSON" "$OUTPUT_JSON"

{
  echo "self.ASSET_MANIFEST = "
  cat "$OUTPUT_JSON"
  echo ";"
} > "$OUTPUT_JS"

echo "✅ Asset manifests generated:"
echo "   - JS: $OUTPUT_JS"
echo "   - JSON: $OUTPUT_JSON"
echo "   - Cache version: $CACHE_VERSION"
echo "   - Companions: $TOTAL_COMPANIONS assets"
echo "   - Gardens: $TOTAL_GARDENS assets"
