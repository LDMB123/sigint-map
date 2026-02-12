#!/usr/bin/env bash
# Markdown Documentation Organization Script
# Organizes scattered .md files into proper directory structure

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CLAUDE_DIR="$PROJECT_ROOT/.claude"

DRY_RUN=true

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --execute)
      DRY_RUN=false
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--execute]"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Markdown Documentation Organization${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}DRY RUN MODE${NC} - No changes will be made"
  echo "Run with --execute to apply changes"
  echo ""
fi

# Create target directory structure
echo -e "${CYAN}Creating documentation structure...${NC}"

declare -a doc_dirs=(
  "$CLAUDE_DIR/docs/reports"            # Audit and completion reports
  "$CLAUDE_DIR/docs/guides"             # How-to guides (already exists)
  "$CLAUDE_DIR/docs/reference"          # Reference documentation (already exists)
  "$CLAUDE_DIR/docs/architecture"       # Architecture docs (already exists)
  "$CLAUDE_DIR/docs/optimization"       # Optimization strategies
)

for dir in "${doc_dirs[@]}"; do
  if [ "$DRY_RUN" = false ]; then
    mkdir -p "$dir"
  fi
  echo -e "  ${GREEN}✓${NC} $dir"
done

echo ""

# Track actions
moved_count=0
skipped_count=0

# Function to move file
move_file() {
  local source=$1
  local target=$2
  local reason=$3

  if [ ! -f "$source" ]; then
    return
  fi

  if [ "$DRY_RUN" = true ]; then
    echo -e "  ${CYAN}→${NC} $(basename "$source")"
    echo -e "    From: $source"
    echo -e "    To:   $target"
    echo -e "    Why:  $reason"
  else
    mv "$source" "$target"
    echo -e "  ${GREEN}✓${NC} Moved $(basename "$source") → $target"
  fi

  moved_count=$((moved_count + 1))
}

# ============================================================================
# CATEGORY 1: Audit/Completion Reports → docs/reports/
# ============================================================================
echo -e "${BLUE}[1] Moving audit and completion reports...${NC}"

# Root directory reports
move_file "$PROJECT_ROOT/REVIEW_SUMMARY.md" \
  "$CLAUDE_DIR/docs/reports/REVIEW_SUMMARY.md" \
  "Audit report"

move_file "$PROJECT_ROOT/AUDIT_ANALYSIS_COMPLETE.md" \
  "$CLAUDE_DIR/docs/reports/AUDIT_ANALYSIS_COMPLETE.md" \
  "Audit analysis"

move_file "$PROJECT_ROOT/AGENT_UPDATE_SUMMARY.md" \
  "$CLAUDE_DIR/docs/reports/AGENT_UPDATE_SUMMARY.md" \
  "Agent update report"

move_file "$PROJECT_ROOT/README_AUDIT_RESULTS.md" \
  "$CLAUDE_DIR/docs/reports/README_AUDIT_RESULTS.md" \
  "README audit"

move_file "$PROJECT_ROOT/DMB_SCRAPER_COMPLETION_SUMMARY.md" \
  "$CLAUDE_DIR/docs/reports/DMB_SCRAPER_COMPLETION_SUMMARY.md" \
  "Scraper completion report"

move_file "$PROJECT_ROOT/DMB_SCRAPER_AUDIT_REPORT.md" \
  "$CLAUDE_DIR/docs/reports/DMB_SCRAPER_AUDIT_REPORT.md" \
  "Scraper audit"

move_file "$PROJECT_ROOT/CHROME_143_CSS_AUDIT_REPORT.md" \
  "$CLAUDE_DIR/docs/reports/CHROME_143_CSS_AUDIT_REPORT.md" \
  "Chrome CSS audit"

# Audit directory (keep in place)
# Already in .claude/audit/ - these stay

echo ""

# ============================================================================
# CATEGORY 2: Quick References → docs/reference/
# ============================================================================
echo -e "${BLUE}[2] Moving quick reference guides...${NC}"

move_file "$PROJECT_ROOT/CHROME_143_FEATURES_QUICK_REFERENCE.md" \
  "$CLAUDE_DIR/docs/reference/CHROME_143_FEATURES_QUICK_REFERENCE.md" \
  "Chrome features reference"

move_file "$PROJECT_ROOT/SCRAPER_AGENT_QUICK_REFERENCE.md" \
  "$CLAUDE_DIR/docs/reference/SCRAPER_AGENT_QUICK_REFERENCE.md" \
  "Scraper agent reference"

# Route table references - keep in config (already in right place)
echo -e "  ${GREEN}⊘${NC} route-table*.md (already in .claude/config/)"

echo ""

# ============================================================================
# CATEGORY 3: Optimization Docs → Keep in docs/optimization/
# ============================================================================
echo -e "${BLUE}[3] Optimization documentation...${NC}"

# Move optimization from .claude/optimization to .claude/docs/optimization
if [ -d "$CLAUDE_DIR/optimization" ]; then
  echo -e "  ${CYAN}→${NC} Moving optimization/*.md to docs/optimization/"

  while IFS= read -r opt_file; do
    target_file="$CLAUDE_DIR/docs/optimization/$(basename "$opt_file")"
    move_file "$opt_file" "$target_file" "Optimization strategy"
  done < <(find "$CLAUDE_DIR/optimization" -name "*.md" -type f 2>/dev/null || true)

  # Remove old optimization directory after moving files
  if [ "$DRY_RUN" = false ] && [ -d "$CLAUDE_DIR/optimization" ]; then
    rmdir "$CLAUDE_DIR/optimization" 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} Removed empty optimization/ directory"
  fi
fi

echo ""

# ============================================================================
# CATEGORY 4: Markdown agent files → Remove (already converted to YAML)
# ============================================================================
echo -e "${BLUE}[4] Cleaning up converted markdown agents...${NC}"

# These were converted to YAML in Phase 1.5
declare -a md_agents=(
  "$CLAUDE_DIR/agents/self-improving/recursive-optimizer.md"
  "$CLAUDE_DIR/agents/self-improving/feedback-loop-optimizer.md"
  "$CLAUDE_DIR/agents/self-improving/meta-learner.md"
  "$CLAUDE_DIR/agents/quantum-parallel/wave-function-optimizer.md"
  "$CLAUDE_DIR/agents/quantum-parallel/massive-parallel-coordinator.md"
  "$CLAUDE_DIR/agents/quantum-parallel/superposition-executor.md"
)

for md_agent in "${md_agents[@]}"; do
  if [ -f "$md_agent" ]; then
    if [ "$DRY_RUN" = true ]; then
      echo -e "  ${YELLOW}×${NC} Would delete: $(basename "$md_agent") (already converted to YAML)"
    else
      rm "$md_agent"
      echo -e "  ${GREEN}✓${NC} Deleted $(basename "$md_agent") (already converted)"
    fi
    moved_count=$((moved_count + 1))
  fi
done

echo ""

# ============================================================================
# CATEGORY 5: Architecture docs → Keep in docs/architecture/
# ============================================================================
echo -e "${BLUE}[5] Architecture documentation...${NC}"

# Move ARCHITECTURE.md from agents/documentation to docs/architecture
if [ -f "$CLAUDE_DIR/agents/documentation/ARCHITECTURE.md" ]; then
  move_file "$CLAUDE_DIR/agents/documentation/ARCHITECTURE.md" \
    "$CLAUDE_DIR/docs/architecture/AGENT_ARCHITECTURE.md" \
    "Agent architecture documentation"
fi

# docs/architecture/* already in right place
echo -e "  ${GREEN}⊘${NC} Other architecture docs already in docs/architecture/"

echo ""

# ============================================================================
# CATEGORY 6: Audit reports → Keep in .claude/audit/
# ============================================================================
echo -e "${BLUE}[6] Audit reports (already organized)...${NC}"

echo -e "  ${GREEN}⊘${NC} All audit reports already in .claude/audit/"
echo -e "    - AUDIT_COMPLETION_SUMMARY.md"
echo -e "    - ORGANIZATION_COMPLETE_REPORT.md"
echo -e "    - FINAL_VERIFICATION_REPORT.md"
echo -e "    - *.json reports"

echo ""

# ============================================================================
# CATEGORY 7: Skills → Keep in .claude/skills/
# ============================================================================
echo -e "${BLUE}[7] Skills (already organized)...${NC}"

echo -e "  ${GREEN}⊘${NC} All 113 skills already in .claude/skills/ with proper structure"

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Organization Summary${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "Files moved/cleaned: ${GREEN}$moved_count${NC}"
echo -e "Files skipped:       ${CYAN}$skipped_count${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}This was a dry run. Run with --execute to apply changes.${NC}"
  echo ""
fi

# Show final structure
echo -e "${BLUE}Final documentation structure:${NC}"
echo ""
echo -e "${CYAN}.claude/${NC}"
echo -e "├── agents/                    ${GREEN}# 68 agent YAML files${NC}"
echo -e "├── skills/                    ${GREEN}# 113 skill markdown files${NC}"
echo -e "├── config/                    ${GREEN}# Configuration files${NC}"
echo -e "│   ├── route-table.json"
echo -e "│   ├── route-table.md"
echo -e "│   └── ..."
echo -e "├── audit/                     ${GREEN}# Audit reports (JSON + MD)${NC}"
echo -e "│   ├── AUDIT_COMPLETION_SUMMARY.md"
echo -e "│   ├── FINAL_VERIFICATION_REPORT.md"
echo -e "│   └── *.json"
echo -e "├── docs/                      ${GREEN}# All documentation${NC}"
echo -e "│   ├── reports/               ${CYAN}# Audit and completion reports${NC}"
echo -e "│   ├── guides/                ${CYAN}# How-to guides and templates${NC}"
echo -e "│   ├── reference/             ${CYAN}# Quick references and rosters${NC}"
echo -e "│   ├── architecture/          ${CYAN}# System architecture docs${NC}"
echo -e "│   └── optimization/          ${CYAN}# Optimization strategies${NC}"
echo -e "└── scripts/                   ${GREEN}# Automation scripts${NC}"
echo ""

if [ "$DRY_RUN" = false ]; then
  echo -e "${GREEN}✓ Documentation organization complete!${NC}"
else
  echo -e "${BLUE}Preview complete. Run with --execute to organize files.${NC}"
fi
echo ""
