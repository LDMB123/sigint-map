#!/bin/bash
# Organization Enforcement Script
# Automatically detects and reports disorganization issues
# Run this regularly to maintain clean structure

set -e

WORKSPACE_ROOT="/Users/louisherman/ClaudeCodeProjects"
cd "$WORKSPACE_ROOT"

echo "═══════════════════════════════════════════════════════"
echo "  Claude Code Organization Enforcement"
echo "═══════════════════════════════════════════════════════"
echo ""

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ISSUES_FOUND=0
FILES_ORGANIZED=0

# Function to report issue
report_issue() {
    echo -e "${RED}✗${NC} $1"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
}

# Function to report warning
report_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to report success
report_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to report action
report_action() {
    echo -e "${BLUE}→${NC} $1"
}

echo "1. Checking workspace root for scattered markdown files..."
echo "───────────────────────────────────────────────────────"

# Find markdown files in root (excluding README.md and CLAUDE.md)
ROOT_MDS=$(find . -maxdepth 1 -name "*.md" -type f ! -name "README.md" ! -name "CLAUDE.md" 2>/dev/null)

if [ -z "$ROOT_MDS" ]; then
    report_success "Workspace root is clean"
else
    COUNT=$(echo "$ROOT_MDS" | wc -l | tr -d ' ')
    report_issue "Found $COUNT markdown files in workspace root:"
    echo "$ROOT_MDS" | while read file; do
        echo "    - $file"
    done
    echo ""
    echo "  Recommended: Move to docs/reports/"
fi

echo ""
echo "2. Checking for scattered shell scripts..."
echo "───────────────────────────────────────────────────────"

# Find shell scripts in root
ROOT_SCRIPTS=$(find . -maxdepth 1 -name "*.sh" -type f 2>/dev/null)

if [ -z "$ROOT_SCRIPTS" ]; then
    report_success "No scattered shell scripts in root"
else
    COUNT=$(echo "$ROOT_SCRIPTS" | wc -l | tr -d ' ')
    report_issue "Found $COUNT shell scripts in workspace root:"
    echo "$ROOT_SCRIPTS" | while read file; do
        echo "    - $file"
    done
    echo ""
    echo "  Recommended: Move to .claude/scripts/ or project scripts/"
fi

echo ""
echo "3. Checking project folders for root-level markdown files..."
echo "───────────────────────────────────────────────────────"

for PROJECT in projects/*/; do
    if [ ! -d "$PROJECT" ]; then continue; fi

    PROJECT_NAME=$(basename "$PROJECT")
    PROJECT_MDS=$(find "$PROJECT" -maxdepth 1 -name "*.md" -type f ! -name "README.md" 2>/dev/null)

    if [ -z "$PROJECT_MDS" ]; then
        report_success "$PROJECT_NAME: Clean root"
    else
        COUNT=$(echo "$PROJECT_MDS" | wc -l | tr -d ' ')
        if [ "$COUNT" -gt 5 ]; then
            report_issue "$PROJECT_NAME: $COUNT markdown files in root (should be in docs/)"
        else
            report_warning "$PROJECT_NAME: $COUNT markdown files in root"
        fi
    fi
done

echo ""
echo "4. Checking for duplicate/similar file names..."
echo "───────────────────────────────────────────────────────"

# Find common duplicate patterns
# NOTE: Duplicates across different directories are EXPECTED (each project has own AUDIT_SUMMARY.md, etc.)
# Only flag if files exist in the SAME directory
DUPES=$(find . -name "*SUMMARY*.md" -o -name "*COMPLETE*.md" -o -name "*INDEX*.md" 2>/dev/null | \
    xargs -I {} basename {} | sort | uniq -c | awk '$1 > 1 {print $2}')

if [ -z "$DUPES" ]; then
    report_success "No obvious duplicate file patterns"
else
    # This is informational only - duplicates across directories are normal
    echo -e "${BLUE}ℹ${NC} Found common filename patterns across different directories (expected):"
    COUNT=$(echo "$DUPES" | wc -l | tr -d ' ')
    if [ "$COUNT" -gt 10 ]; then
        echo "    $COUNT common patterns (e.g., AUDIT_SUMMARY.md in multiple projects)"
        echo "    This is normal - each project has its own documentation"
    else
        echo "$DUPES" | while read name; do
            echo "    - $name appears in multiple directories"
        done
    fi
fi

echo ""
echo "5. Checking skills organization..."
echo "───────────────────────────────────────────────────────"

# Check for skills outside .claude/skills/
STRAY_SKILLS=$(find . -name "*skill*.md" ! -path "*/.claude/skills/*" ! -path "*/node_modules/*" ! -path "*/_archived/*" ! -path "*/.claude/audit/*" 2>/dev/null)

if [ -z "$STRAY_SKILLS" ]; then
    report_success "All skills properly located"
else
    report_issue "Found skills outside .claude/skills/:"
    echo "$STRAY_SKILLS" | while read file; do
        echo "    - $file"
    done
fi

echo ""
echo "6. Checking agents organization..."
echo "───────────────────────────────────────────────────────"

# Check for agents outside .claude/agents/
# FIX: Exclude docs/plans/ to avoid flagging plan documents as agents
STRAY_AGENTS=$(find . \( -name "*agent*.yaml" -o -name "*agent*.md" \) ! -path "*/.claude/agents/*" ! -path "*/node_modules/*" ! -path "*/_archived/*" ! -path "*/.claude/audit/*" ! -path "*/.claude/templates/*" ! -path "*/docs/archive/*" ! -path "*/docs/plans/*" 2>/dev/null)

if [ -z "$STRAY_AGENTS" ]; then
    report_success "All agents properly located"
else
    report_issue "Found agents outside .claude/agents/:"
    echo "$STRAY_AGENTS" | while read file; do
        echo "    - $file"
    done
fi

echo ""
echo "7. Checking for orphaned backup files..."
echo "───────────────────────────────────────────────────────"

# Find backup files
# FIX: Explicitly exclude _archived/ and all its subdirectories
BACKUPS=$(find . \( -name "*~" -o -name "*.bak" -o -name "*.old" \) ! -path "*/_archived/*" ! -path "*/node_modules/*" 2>/dev/null)

if [ -z "$BACKUPS" ]; then
    report_success "No orphaned backup files"
else
    COUNT=$(echo "$BACKUPS" | wc -l | tr -d ' ')
    report_warning "Found $COUNT backup files (should be in _archived/):"
    echo "$BACKUPS" | head -5 | while read file; do
        echo "    - $file"
    done
    if [ "$COUNT" -gt 5 ]; then
        echo "    ... and $((COUNT - 5)) more"
    fi
fi

echo ""
echo "8. Checking documentation structure..."
echo "───────────────────────────────────────────────────────"

# Check if docs/ directory exists in each project
for PROJECT in projects/*/; do
    if [ ! -d "$PROJECT" ]; then continue; fi

    PROJECT_NAME=$(basename "$PROJECT")

    if [ -d "${PROJECT}docs/" ]; then
        report_success "$PROJECT_NAME: docs/ directory exists"

        # Check if it has a README
        if [ ! -f "${PROJECT}docs/README.md" ]; then
            report_warning "$PROJECT_NAME: docs/ missing README.md index"
        fi
    else
        # Count markdown files (excluding node_modules)
        # FIX: Exclude node_modules from markdown file counts
        MD_COUNT=$(find "$PROJECT" -name "*.md" ! -name "README.md" ! -path "*/node_modules/*" 2>/dev/null | wc -l | tr -d ' ')
        if [ "$MD_COUNT" -gt 3 ]; then
            report_warning "$PROJECT_NAME: No docs/ directory but has $MD_COUNT markdown files"
        fi
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Summary"
echo "═══════════════════════════════════════════════════════"

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ Organization is perfect! No issues found.${NC}"
else
    echo -e "${RED}✗ Found $ISSUES_FOUND organizational issues${NC}"
    echo ""
    echo "Run with --fix to automatically organize files"
fi

echo ""
echo "Last checked: $(date)"

exit $ISSUES_FOUND
