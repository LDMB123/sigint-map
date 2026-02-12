#!/usr/bin/env bash
# Skills Migration Script
# Migrates all 129 scattered skill files to proper .claude/skills/ structure with YAML frontmatter

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SKILLS_DIR="$PROJECT_ROOT/.claude/skills"
AUDIT_FILE=$(ls -t "$PROJECT_ROOT/.claude/audit/skills-inventory-"*.json | head -1)
TEMPLATE_FILE="$PROJECT_ROOT/.claude/docs/guides/SKILL_TEMPLATE.md"

# Base categories (will create more as needed)
base_categories=("ui-ux" "pwa" "performance" "web-apis" "data" "accessibility" "testing" "scraping" "css" "html" "chromium" "chromium-143" "mcp")
for category in "${base_categories[@]}"; do
  mkdir -p "$SKILLS_DIR/$category"
done

# Track all categories we create (including dynamic ones)
declare -A all_categories

echo -e "${BLUE}=== Skills Migration ===${NC}"
echo "Source audit: $AUDIT_FILE"
echo "Template: $TEMPLATE_FILE"
echo ""

# Read template to extract structure
if [ ! -f "$TEMPLATE_FILE" ]; then
  echo -e "${RED}Error: Template file not found at $TEMPLATE_FILE${NC}"
  exit 1
fi

# Function to determine complexity from quality score and line count
determine_complexity() {
  local quality=$1
  local lines=$2

  if [ "$lines" -gt 500 ] && [ "$quality" -ge 7 ]; then
    echo "advanced"
  elif [ "$lines" -gt 200 ] || [ "$quality" -ge 6 ]; then
    echo "intermediate"
  else
    echo "beginner"
  fi
}

# Function to extract description from first paragraph of file
extract_description() {
  local file=$1
  # Get first non-empty, non-header line that's not a code block
  local desc=$(grep -v '^#' "$file" | grep -v '^```' | grep -v '^$' | head -1 | sed 's/^[*-] //' | cut -c1-120)

  if [ -z "$desc" ]; then
    desc="Implementation guide and reference documentation"
  fi

  echo "$desc"
}

# Function to generate YAML frontmatter
generate_frontmatter() {
  local skill_name=$1
  local category=$2
  local complexity=$3
  local description=$4
  local original_file=$5

  cat <<EOF
---
name: $skill_name
version: 1.0.0
description: $description
author: Claude Code
created: $(date +%Y-%m-%d)
updated: $(date +%Y-%m-%d)

category: $category
complexity: $complexity
tags:
  - ${category}
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: $original_file
migration_date: $(date +%Y-%m-%d)
---

EOF
}

# Process each file from audit
total_files=$(jq -r '.total_files' "$AUDIT_FILE")
migrated=0
skipped=0

echo -e "${YELLOW}Processing $total_files files...${NC}"
echo ""

while IFS= read -r file_obj; do
  file_path=$(echo "$file_obj" | jq -r '.file_path')
  absolute_path=$(echo "$file_obj" | jq -r '.absolute_path')
  category=$(echo "$file_obj" | jq -r '.category')
  quality=$(echo "$file_obj" | jq -r '.quality_score')
  lines=$(echo "$file_obj" | jq -r '.line_count')
  skill_name=$(echo "$file_obj" | jq -r '.suggested_skill_name')

  # Skip if file doesn't exist (safety check)
  if [ ! -f "$absolute_path" ]; then
    echo -e "${RED}✗ File not found: $file_path${NC}"
    skipped=$((skipped + 1))
    continue
  fi

  # Determine final category (improve categorization with new categories)
  if [ "$category" = "uncategorized" ]; then
    case "$skill_name" in
      *chrome*|*chromium*)
        category="chromium-143"
        ;;
      *api*)
        category="web-apis"
        ;;
      *cache*|*semantic*)
        category="performance"
        ;;
      *workflow*)
        category="mcp"
        ;;
      *migration*|*deployment*)
        category="deployment"
        ;;
      *agent*|*orchestrator*)
        category="agent-architecture"
        ;;
      *security*|*auth*)
        category="security"
        ;;
      *)
        category="chromium-143"
        ;;
    esac
  fi

  # Many scraping files are actually UI/performance/deployment guides
  if [ "$category" = "scraping" ]; then
    case "$skill_name" in
      *scroll*|*animation*|*view-transition*|*container-quer*|*anchor*|*popover*|*inert*|*visual*)
        category="ui-ux"
        ;;
      *bundle*|*performance*|*optimization*|*compression*|*inp*|*scheduler*)
        category="performance"
        ;;
      *chrome*|*chromium*|*migration*|*implementation*)
        category="chromium-143"
        ;;
      *deployment*|*developer*|*quick*)
        category="deployment"
        ;;
      *css*)
        category="css"
        ;;
      *pwa*|*service-worker*)
        category="pwa"
        ;;
      *wasm*|*webgpu*)
        category="web-apis"
        ;;
      *agent*|*orchestrator*)
        category="agent-architecture"
        ;;
      *wco*)
        category="web-components"
        ;;
      # Keep actual scraping guides in scraping
      *scraper*|*scraping*|*dmb*|*tour*|*selector*)
        category="scraping"
        ;;
    esac
  fi

  # Create category directory if it doesn't exist
  mkdir -p "$SKILLS_DIR/$category"
  all_categories[$category]=1

  # Determine complexity
  complexity=$(determine_complexity "$quality" "$lines")

  # Extract description
  description=$(extract_description "$absolute_path")

  # Generate new file path
  target_file="$SKILLS_DIR/$category/$skill_name.md"

  # Check if target already exists
  if [ -f "$target_file" ]; then
    echo -e "${YELLOW}⊘ Skipping (exists): $category/$skill_name.md${NC}"
    skipped=$((skipped + 1))
    continue
  fi

  # Create temporary file with frontmatter + original content
  temp_file=$(mktemp)

  # Generate frontmatter
  generate_frontmatter "$skill_name" "$category" "$complexity" "$description" "$file_path" > "$temp_file"

  # Append original content (skip if already has frontmatter)
  if head -n 1 "$absolute_path" | grep -q '^---$'; then
    # Has frontmatter, skip first YAML block
    sed -n '/^---$/,/^---$/!p;//!p' "$absolute_path" | tail -n +2 >> "$temp_file"
  else
    # No frontmatter, append entire file
    cat "$absolute_path" >> "$temp_file"
  fi

  # Move to target location
  mv "$temp_file" "$target_file"

  echo -e "${GREEN}✓ Migrated: $category/$skill_name.md${NC}"
  migrated=$((migrated + 1))

done < <(jq -c '.files[]' "$AUDIT_FILE")

echo ""
echo -e "${GREEN}=== Migration Complete ===${NC}"
echo -e "Migrated: ${GREEN}$migrated${NC} files"
echo -e "Skipped: ${YELLOW}$skipped${NC} files"
echo ""

# Generate category indexes
echo -e "${BLUE}Generating category indexes...${NC}"

# Use all categories we've created (including dynamic ones)
for category in "${!all_categories[@]}"; do
  index_file="$SKILLS_DIR/$category/INDEX.md"

  # Count skills in category
  skill_count=$(find "$SKILLS_DIR/$category" -name "*.md" -not -name "INDEX.md" -not -name "README.txt" | wc -l | tr -d ' ')

  if [ "$skill_count" -eq 0 ]; then
    continue
  fi

  cat > "$index_file" <<EOF
# ${category^} Skills Index

Total skills: $skill_count

## Skills in this category

EOF

  # List all skills with their descriptions
  find "$SKILLS_DIR/$category" -name "*.md" -not -name "INDEX.md" | sort | while read -r skill_file; do
    skill_basename=$(basename "$skill_file" .md)

    # Extract description from frontmatter
    desc=$(grep '^description:' "$skill_file" | head -1 | sed 's/^description: //' || echo "No description")
    complexity=$(grep '^complexity:' "$skill_file" | head -1 | sed 's/^complexity: //' || echo "intermediate")

    echo "- **$skill_basename** ($complexity): $desc" >> "$index_file"
  done

  echo -e "${GREEN}✓ Index: $category/INDEX.md ($skill_count skills)${NC}"
done

echo ""
echo -e "${GREEN}✓ All category indexes generated${NC}"
echo ""
echo -e "${BLUE}Skills organized by category:${NC}"
for category in $(find "$SKILLS_DIR" -mindepth 1 -maxdepth 1 -type d | sort); do
  category_name=$(basename "$category")
  count=$(find "$category" -name "*.md" -not -name "INDEX.md" -not -name "README.txt" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" -gt 0 ]; then
    echo -e "  ${category_name}: ${count} skills"
  fi
done

echo ""
echo -e "${GREEN}New categories created dynamically:${NC}"
for category in "${!all_categories[@]}"; do
  is_base=false
  for base in "${base_categories[@]}"; do
    if [ "$category" = "$base" ]; then
      is_base=true
      break
    fi
  done
  if [ "$is_base" = false ]; then
    count=$(find "$SKILLS_DIR/$category" -name "*.md" -not -name "INDEX.md" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${YELLOW}${category}${NC}: ${count} skills"
  fi
done
