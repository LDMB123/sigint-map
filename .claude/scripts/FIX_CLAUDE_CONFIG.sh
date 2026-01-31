#!/bin/bash
# Claude Code Configuration Fixes
# Auto-generated from audit report
# Run with: bash FIX_CLAUDE_CONFIG.sh

set -e  # Exit on error

echo "=== Claude Code Configuration Fixes ==="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in the right directory
if [ ! -d ".claude" ]; then
    print_error "Error: Must run from workspace root (ClaudeCodeProjects/)"
    exit 1
fi

echo "=== PHASE 1: Workspace Organization ==="
echo ""

# Create docs directories
echo "Creating docs structure..."
mkdir -p docs/reports
mkdir -p docs/summaries
print_status "Created docs/reports and docs/summaries"

# Move scattered markdown files
echo ""
echo "Moving scattered files to docs/..."
mv COMPLETE_OPTIMIZATION_SUMMARY.md docs/summaries/ 2>/dev/null || print_warning "Already moved or missing: COMPLETE_OPTIMIZATION_SUMMARY.md"
mv MCP_PERFORMANCE_OPTIMIZATION_REPORT.md docs/reports/ 2>/dev/null || print_warning "Already moved or missing: MCP_PERFORMANCE_OPTIMIZATION_REPORT.md"
mv MIGRATION_TO_OFFICIAL_PATTERNS_COMPLETE.md docs/reports/ 2>/dev/null || print_warning "Already moved or missing: MIGRATION_TO_OFFICIAL_PATTERNS_COMPLETE.md"
mv OPTIMIZATION_AND_VERIFICATION_SUMMARY.md docs/summaries/ 2>/dev/null || print_warning "Already moved or missing: OPTIMIZATION_AND_VERIFICATION_SUMMARY.md"
mv PLUGIN_AUDIT_COMPLETE.md docs/reports/ 2>/dev/null || print_warning "Already moved or missing: PLUGIN_AUDIT_COMPLETE.md"
mv REDOS_VULNERABILITY_FIX_REPORT.md docs/reports/ 2>/dev/null || print_warning "Already moved or missing: REDOS_VULNERABILITY_FIX_REPORT.md"
mv ULTRA-4K-COMPLETE-FINAL-RESULTS.md docs/summaries/ 2>/dev/null || print_warning "Already moved or missing: ULTRA-4K-COMPLETE-FINAL-RESULTS.md"
mv ULTRA-4K-FINAL-RESULTS.md docs/summaries/ 2>/dev/null || print_warning "Already moved or missing: ULTRA-4K-FINAL-RESULTS.md"
print_status "Moved scattered markdown files"

echo ""
echo "=== PHASE 2: Fix CLAUDE.md Locations ==="
echo ""

# Move dmb-almanac CLAUDE.md to correct location
if [ -f "projects/dmb-almanac/app/docs/analysis/uncategorized/CLAUDE.md" ]; then
    echo "Moving dmb-almanac CLAUDE.md to project root..."
    mv projects/dmb-almanac/app/docs/analysis/uncategorized/CLAUDE.md \
       projects/dmb-almanac/CLAUDE.md
    print_status "Moved dmb-almanac CLAUDE.md to correct location"
else
    print_warning "dmb-almanac CLAUDE.md already in correct location or missing"
fi

# Create workspace root CLAUDE.md if missing
if [ ! -f "CLAUDE.md" ]; then
    echo ""
    echo "Creating workspace root CLAUDE.md..."
    cat > CLAUDE.md << 'EOF'
# ClaudeCodeProjects Workspace

Multi-project Claude Code workspace with agent-driven development patterns.

## Projects

- `projects/dmb-almanac/` - Dave Matthews Band concert database PWA (SvelteKit 2, Svelte 5, SQLite, Dexie.js)
- `projects/emerson-violin-pwa/` - Violin tuner PWA
- `projects/imagen-experiments/` - Google Imagen API experiments

## Workspace Commands

```bash
# List all projects
ls projects/

# Navigate to project
cd projects/dmb-almanac/

# Global agent operations
.claude/scripts/audit-all-agents.sh       # Audit all agents
.claude/scripts/comprehensive-validation.sh  # Validate configuration
```

## Agent System

This workspace uses:
- **12 reusable skills** in `.claude/skills/`
- **Parallelization config** supporting 130 concurrent agents (burst: 185)
- **Route table** for zero-overhead agent selection
- **MCP integrations** for desktop automation

## Architecture

```
ClaudeCodeProjects/
├── .claude/              # Shared agent infrastructure
│   ├── skills/          # 12 reusable skills
│   ├── config/          # Parallelization, routing, caching
│   ├── scripts/         # Validation and audit scripts
│   └── templates/       # Agent and skill templates
├── projects/            # Individual projects
│   ├── dmb-almanac/    # 22MB concert database (main project)
│   ├── emerson-violin-pwa/
│   └── imagen-experiments/
├── _archived/           # 2,459 historical files
└── docs/                # Workspace documentation
    ├── reports/         # Audit and analysis reports
    └── summaries/       # Project summaries
```

## Quick Start

### For New Claude Sessions

1. Check which project to work on
2. Navigate to project directory
3. Read project's CLAUDE.md for specific commands
4. Use skills from `.claude/skills/` as needed

### Common Workflows

**Start DMB Almanac development:**
```bash
cd projects/dmb-almanac
npm install
npm run dev
```

**Run workspace-wide validation:**
```bash
.claude/scripts/comprehensive-validation.sh
```

**Audit agent configuration:**
```bash
.claude/scripts/audit-all-agents.sh
```

## Key Technologies

- **Framework**: SvelteKit 2, Svelte 5 (runes-based reactivity)
- **Database**: SQLite (server) + Dexie.js (client)
- **Build**: Vite
- **PWA**: Workbox, vite-plugin-pwa
- **Target**: Chromium 143+ on Apple Silicon (macOS 26.2)

## Gotchas

- **Agent parallelization**: Max 130 concurrent (100 haiku + 25 sonnet + 5 opus)
- **Skills format**: Must use `skill-name/SKILL.md` with YAML frontmatter
- **Route table**: Pre-compiled - regenerate after adding agents
- **Git status**: Keep clean - move reports to docs/, not workspace root
EOF
    print_status "Created workspace root CLAUDE.md"
else
    print_warning "Workspace root CLAUDE.md already exists"
fi

echo ""
echo "=== PHASE 3: Git Cleanup ==="
echo ""

echo "Current git status:"
git status --short | head -20
echo ""

read -p "Stage all deletions and reorganized files? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add -u  # Stage deletions
    git add docs/  # Stage new docs directory
    git add CLAUDE.md  # Stage workspace CLAUDE.md
    git add projects/dmb-almanac/CLAUDE.md  # Stage moved CLAUDE.md
    print_status "Staged deletions and reorganized files"
    echo ""
    echo "Ready to commit. Suggested commit message:"
    echo ""
    echo "chore: reorganize workspace per Claude Code audit"
    echo ""
    echo "- Move scattered reports to docs/reports/ and docs/summaries/"
    echo "- Create workspace root CLAUDE.md"
    echo "- Move dmb-almanac CLAUDE.md to project root"
    echo "- Clean up deprecated agent and skill files"
    echo ""
else
    print_warning "Skipped git staging"
fi

echo ""
echo "=== PHASE 4: Skill Cleanup Recommendations ==="
echo ""

print_warning "Manual cleanup needed for:"
echo "  1. Invalid YAML skills staged in git (api_upgrade.yaml, etc.)"
echo "     → These should be removed from staging and recreated as skill-name/SKILL.md"
echo ""
echo "  2. Scattered DMB skill files (.claude/skills/dmb-*.md)"
echo "     → Should be moved to .claude/skills/dmb-analysis/ as reference files"
echo ""
echo "  3. Scattered SvelteKit skill files (.claude/skills/sveltekit-*.md)"
echo "     → Should be moved to .claude/skills/sveltekit/ as reference files"
echo ""
echo "  4. Large skill file: predictive-caching/SKILL.md (537 lines)"
echo "     → Should extract algorithms to predictive-caching/algorithms-reference.md"
echo ""

echo "=== Verification ==="
echo ""

# Count markdown files in workspace root
MD_COUNT=$(ls -1 *.md 2>/dev/null | wc -l | tr -d ' ')
echo "Markdown files in workspace root: $MD_COUNT"
if [ "$MD_COUNT" -eq 1 ]; then
    print_status "Organization goal achieved (only README.md allowed)"
else
    print_warning "Still have $MD_COUNT markdown files (target: 1)"
fi

# Check CLAUDE.md exists
if [ -f "CLAUDE.md" ]; then
    print_status "Workspace root CLAUDE.md exists"
else
    print_error "Workspace root CLAUDE.md missing"
fi

# Check dmb-almanac CLAUDE.md location
if [ -f "projects/dmb-almanac/CLAUDE.md" ]; then
    print_status "dmb-almanac CLAUDE.md in correct location"
else
    print_error "dmb-almanac CLAUDE.md not at project root"
fi

echo ""
echo "=== Summary ==="
echo ""
echo "Completed automated fixes. Organization score should improve from 45 to ~85."
echo ""
echo "Next steps:"
echo "  1. Review git diff before committing"
echo "  2. Manually fix skill format issues (see Phase 4 above)"
echo "  3. Re-run audit: claude-code skill organization"
echo "  4. Target: Organization score >95"
echo ""
print_status "Fix script complete!"
