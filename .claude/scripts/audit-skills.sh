#!/usr/bin/env bash
# Skills Inventory Audit Script
# Analyzes 129 scattered skill-like files and categorizes them

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/Users/louisherman/ClaudeCodeProjects"
OUTPUT_DIR="$PROJECT_ROOT/.claude/audit"
OUTPUT_FILE="$OUTPUT_DIR/skills-inventory-$(date +%Y%m%d-%H%M%S).json"

mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}=== Skills Inventory Audit ===${NC}"
echo "Scanning for skill-like files..."
echo ""

# Find all guide/reference/quickref files
guide_files=$(find "$PROJECT_ROOT" -type f \( \
  -name "*_GUIDE.md" -o \
  -name "*_QUICKREF.md" -o \
  -name "*_QUICK_REFERENCE.md" -o \
  -name "*_REFERENCE.md" -o \
  -name "*IMPLEMENTATION_GUIDE.md" -o \
  -name "*DEPLOYMENT_GUIDE.md" -o \
  -name "*DEVELOPER_GUIDE.md" \
  \) \
  ! -path "**/node_modules/**" \
  ! -path "**/.git/**" \
  ! -path "**/dist/**" \
  ! -path "**/build/**" \
  | sort)

total_files=$(echo "$guide_files" | grep -c . || echo "0")

echo -e "${GREEN}Found ${total_files} skill-like files${NC}"
echo ""

# Categorize files by path patterns
categorize_file() {
  local file=$1
  local category="uncategorized"

  case "$file" in
    *scroll-animations*|*view-transitions*|*container-queries*|*anchor-positioning*|*popover*|*inert*|*motion*)
      category="ui-ux"
      ;;
    *pwa*|*service-worker*|*install*|*badging*|*protocol-handler*)
      category="pwa"
      ;;
    *bundle*|*inp*|*compression*|*scheduler*|*performance*|*optimization*)
      category="performance"
      ;;
    *navigation-api*|*speculation*|*file-handler*|*webgpu*)
      category="web-apis"
      ;;
    *dexie*|*indexeddb*|*query*|*database*)
      category="data"
      ;;
    *accessibility*|*wcag*|*a11y*|*aria*)
      category="accessibility"
      ;;
    *test*|*playwright*)
      category="testing"
      ;;
    *scraper*|*scraping*|*dmb*|*tour*)
      category="scraping"
      ;;
    *css*)
      category="css"
      ;;
    *html*)
      category="html"
      ;;
    *)
      category="uncategorized"
      ;;
  esac

  echo "$category"
}

# Assess file quality/richness
assess_quality() {
  local file=$1
  local line_count=$(wc -l < "$file" | tr -d ' ')
  local has_examples=$(grep -c '```' "$file" || echo "0")
  local has_sections=$(grep -c '^##' "$file" || echo "0")

  local score=0

  # Line count scoring
  if [ "$line_count" -gt 200 ]; then
    score=$((score + 3))
  elif [ "$line_count" -gt 100 ]; then
    score=$((score + 2))
  elif [ "$line_count" -gt 50 ]; then
    score=$((score + 1))
  fi

  # Code examples scoring
  if [ "$has_examples" -gt 5 ]; then
    score=$((score + 3))
  elif [ "$has_examples" -gt 2 ]; then
    score=$((score + 2))
  elif [ "$has_examples" -gt 0 ]; then
    score=$((score + 1))
  fi

  # Section structure scoring
  if [ "$has_sections" -gt 8 ]; then
    score=$((score + 2))
  elif [ "$has_sections" -gt 4 ]; then
    score=$((score + 1))
  fi

  echo "$score"
}

# Check if file has YAML frontmatter
has_frontmatter() {
  local file=$1
  if head -n 1 "$file" | grep -q '^---$'; then
    echo "true"
  else
    echo "false"
  fi
}

# Build JSON inventory
echo -e "${YELLOW}Analyzing files...${NC}"

declare -A category_counts
files_json="["

first=true
while IFS= read -r file; do
  [ -z "$file" ] && continue

  category=$(categorize_file "$file")
  quality=$(assess_quality "$file")
  frontmatter=$(has_frontmatter "$file")
  line_count=$(wc -l < "$file" | tr -d ' ')

  # Increment category counter
  category_counts[$category]=$((${category_counts[$category]:-0} + 1))

  # Get relative path
  rel_path="${file#$PROJECT_ROOT/}"

  # Get basename without extension for suggested skill name
  basename=$(basename "$file" .md)
  skill_name=$(echo "$basename" | sed 's/_GUIDE$//' | sed 's/_QUICKREF$//' | sed 's/_QUICK_REFERENCE$//' | sed 's/_REFERENCE$//' | sed 's/_/-/g' | tr '[:upper:]' '[:lower:]')

  if [ "$first" = true ]; then
    first=false
  else
    files_json+=","
  fi

  files_json+=$(cat <<EOF

  {
    "file_path": "$rel_path",
    "absolute_path": "$file",
    "category": "$category",
    "quality_score": $quality,
    "line_count": $line_count,
    "has_frontmatter": $frontmatter,
    "suggested_skill_name": "$skill_name"
  }
EOF
)

done <<< "$guide_files"

files_json+="
]"

# Build category summary
categories_json="{"
first=true
for category in "${!category_counts[@]}"; do
  if [ "$first" = true ]; then
    first=false
  else
    categories_json+=","
  fi
  categories_json+="
    \"$category\": ${category_counts[$category]}"
done
categories_json+="
  }"

# Build final JSON report
report=$(cat <<EOF
{
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_files": $total_files,
  "categories": $categories_json,
  "files": $files_json
}
EOF
)

echo "$report" | jq '.' > "$OUTPUT_FILE"

echo ""
echo -e "${GREEN}✓ Inventory complete${NC}"
echo ""
echo -e "${BLUE}Summary by Category:${NC}"
for category in $(echo "$categories_json" | jq -r 'keys[]' | sort); do
  count=$(echo "$categories_json" | jq -r ".\"$category\"")
  echo -e "  ${category}: ${count} files"
done

echo ""
echo -e "${BLUE}Top 20 High-Value Candidates (by quality score):${NC}"
jq -r '.files | sort_by(-.quality_score) | .[:20] | .[] | "\(.quality_score) - \(.category) - \(.suggested_skill_name) (\(.line_count) lines)"' "$OUTPUT_FILE"

echo ""
echo -e "${YELLOW}Files without YAML frontmatter: $(jq '[.files[] | select(.has_frontmatter == false)] | length' "$OUTPUT_FILE")/${total_files}${NC}"

echo ""
echo -e "${GREEN}Full report saved to: $OUTPUT_FILE${NC}"
