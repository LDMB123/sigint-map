#!/bin/bash

echo "================================================================================"
echo "CLAUDE CODE SKILLS - CRITICAL ISSUE REMEDIATION"
echo "================================================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Locations
GLOBAL_SKILLS="$HOME/.claude/skills"
PROJECT_SKILLS="/Users/louisherman/ClaudeCodeProjects/.claude/skills"
DMB_SKILLS="/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.claude/skills"

TOTAL_FIXES=0
TOTAL_ERRORS=0

# ============================================================================
# FIX 1: skill-diagnostic.md YAML Issue
# ============================================================================
echo "FIX 1: Correcting skill-diagnostic.md YAML"
echo "----------------------------------------"

fix_skill_diagnostic() {
    local location=$1
    local location_name=$2

    if [ ! -f "$location/skill-diagnostic.md" ]; then
        echo "  ⚠️  $location_name: skill-diagnostic.md not found"
        return
    fi

    # Check if the issue exists
    if grep -q "skill-name  # MUST match filename exactly" "$location/skill-diagnostic.md"; then
        echo "  🔧 Fixing $location_name/skill-diagnostic.md"

        # Remove the malformed line
        sed -i.bak '/skill-name  # MUST match filename exactly/d' "$location/skill-diagnostic.md"

        if [ $? -eq 0 ]; then
            echo "  ✅ Fixed $location_name/skill-diagnostic.md"
            rm "$location/skill-diagnostic.md.bak"
            ((TOTAL_FIXES++))
        else
            echo "  ❌ Error fixing $location_name/skill-diagnostic.md"
            ((TOTAL_ERRORS++))
        fi
    else
        echo "  ℹ️  $location_name/skill-diagnostic.md: No fix needed"
    fi
}

fix_skill_diagnostic "$GLOBAL_SKILLS" "Global"
fix_skill_diagnostic "$PROJECT_SKILLS" "ClaudeCodeProjects"
fix_skill_diagnostic "$DMB_SKILLS" "DMB-Almanac"

echo ""

# ============================================================================
# FIX 2: Move Documentation Files to _reports/
# ============================================================================
echo "FIX 2: Organizing documentation files"
echo "----------------------------------------"

organize_docs() {
    local location=$1
    local location_name=$2

    if [ ! -d "$location" ]; then
        echo "  ⚠️  $location_name: Directory not found"
        return
    fi

    # Create _reports directory if it doesn't exist
    mkdir -p "$location/_reports"

    # Move documentation files
    local moved=0
    for pattern in "SKILLS_" "COMPREHENSIVE_" "QA_" "FINAL_" "OPTIMIZATION_" \
                   "ULTIMATE_" "REGISTRATION_" "ECOSYSTEM_" "PERFORMANCE_" \
                   "COMPLETE_" "REORGANIZATION_" "SEMANTIC_" "SKILL_INDEX" \
                   "DEEP_DIVE_" "AUDIT_" "PATTERN_" "DEBUG_" "CROSS_SESSION_"; do

        for file in "$location"/${pattern}*.md; do
            if [ -f "$file" ]; then
                local filename=$(basename "$file")
                echo "  🔧 Moving $filename to _reports/"
                mv "$file" "$location/_reports/"
                if [ $? -eq 0 ]; then
                    ((moved++))
                    ((TOTAL_FIXES++))
                else
                    echo "  ❌ Error moving $filename"
                    ((TOTAL_ERRORS++))
                fi
            fi
        done
    done

    echo "  ✅ $location_name: Moved $moved files to _reports/"
}

organize_docs "$GLOBAL_SKILLS" "Global"
organize_docs "$PROJECT_SKILLS" "ClaudeCodeProjects"
organize_docs "$DMB_SKILLS" "DMB-Almanac"

echo ""

# ============================================================================
# FIX 3: Remove Hardcoded Paths
# ============================================================================
echo "FIX 3: Removing hardcoded absolute paths"
echo "----------------------------------------"

fix_hardcoded_paths() {
    local location=$1
    local location_name=$2

    if [ ! -d "$location" ]; then
        echo "  ⚠️  $location_name: Directory not found"
        return
    fi

    local fixed=0

    # Find all .md files and replace hardcoded paths
    while IFS= read -r -d '' file; do
        # Check if file contains hardcoded paths
        if grep -q "/Users/louisherman" "$file"; then
            local count=$(grep -c "/Users/louisherman" "$file")
            echo "  🔧 Fixing $(basename "$file") ($count instances)"

            # Replace paths
            sed -i.bak \
                -e 's|/Users/louisherman/\.claude/skills|~/.claude/skills|g' \
                -e 's|/Users/louisherman/ClaudeCodeProjects/.claude/skills|<project-root>/.claude/skills|g' \
                -e 's|/Users/louisherman/ClaudeCodeProjects|<project-root>|g' \
                "$file"

            if [ $? -eq 0 ]; then
                rm "$file.bak"
                ((fixed++))
                ((TOTAL_FIXES++))
            else
                echo "  ❌ Error fixing $(basename "$file")"
                mv "$file.bak" "$file"
                ((TOTAL_ERRORS++))
            fi
        fi
    done < <(find "$location" -maxdepth 1 -type f -name "*.md" -print0)

    # Also fix in _reports if it exists
    if [ -d "$location/_reports" ]; then
        while IFS= read -r -d '' file; do
            if grep -q "/Users/louisherman" "$file"; then
                local count=$(grep -c "/Users/louisherman" "$file")
                echo "  🔧 Fixing _reports/$(basename "$file") ($count instances)"

                sed -i.bak \
                    -e 's|/Users/louisherman/\.claude/skills|~/.claude/skills|g' \
                    -e 's|/Users/louisherman/ClaudeCodeProjects/.claude/skills|<project-root>/.claude/skills|g' \
                    -e 's|/Users/louisherman/ClaudeCodeProjects|<project-root>|g' \
                    "$file"

                if [ $? -eq 0 ]; then
                    rm "$file.bak"
                    ((fixed++))
                    ((TOTAL_FIXES++))
                else
                    echo "  ❌ Error fixing _reports/$(basename "$file")"
                    mv "$file.bak" "$file"
                    ((TOTAL_ERRORS++))
                fi
            fi
        done < <(find "$location/_reports" -type f -name "*.md" -print0 2>/dev/null)
    fi

    echo "  ✅ $location_name: Fixed $fixed files"
}

fix_hardcoded_paths "$GLOBAL_SKILLS" "Global"
fix_hardcoded_paths "$PROJECT_SKILLS" "ClaudeCodeProjects"
fix_hardcoded_paths "$DMB_SKILLS" "DMB-Almanac"

echo ""

# ============================================================================
# FIX 4: Close Unclosed Code Blocks
# ============================================================================
echo "FIX 4: Closing unclosed code blocks"
echo "----------------------------------------"

fix_unclosed_blocks() {
    local location=$1
    local location_name=$2
    local file="$location/_reports/COMPLETE_SKILLS_OPTIMIZATION_REPORT.md"

    if [ ! -f "$file" ]; then
        echo "  ℹ️  $location_name: File not found (already fixed or moved)"
        return
    fi

    # Count code blocks
    local block_count=$(grep -c '```' "$file")

    if [ $((block_count % 2)) -ne 0 ]; then
        echo "  🔧 Fixing unclosed code block in COMPLETE_SKILLS_OPTIMIZATION_REPORT.md"
        echo '```' >> "$file"

        if [ $? -eq 0 ]; then
            echo "  ✅ Fixed $location_name"
            ((TOTAL_FIXES++))
        else
            echo "  ❌ Error fixing $location_name"
            ((TOTAL_ERRORS++))
        fi
    else
        echo "  ℹ️  $location_name: No unclosed blocks found"
    fi
}

fix_unclosed_blocks "$GLOBAL_SKILLS" "Global"
fix_unclosed_blocks "$PROJECT_SKILLS" "ClaudeCodeProjects"
fix_unclosed_blocks "$DMB_SKILLS" "DMB-Almanac"

echo ""

# ============================================================================
# FIX 5: Rename Phantom Skills
# ============================================================================
echo "FIX 5: Handling phantom skills"
echo "----------------------------------------"

handle_phantom_skills() {
    local location=$1
    local location_name=$2

    if [ ! -d "$location" ]; then
        echo "  ⚠️  $location_name: Directory not found"
        return
    fi

    local handled=0

    # Rename phantom skills with underscore prefix
    for skill in "lighthouse-webvitals-expert.md" "accessibility-specialist.md"; do
        if [ -f "$location/$skill" ]; then
            echo "  🔧 Renaming $skill to _$skill"
            mv "$location/$skill" "$location/_$skill"

            if [ $? -eq 0 ]; then
                ((handled++))
                ((TOTAL_FIXES++))
            else
                echo "  ❌ Error renaming $skill"
                ((TOTAL_ERRORS++))
            fi
        fi
    done

    if [ $handled -eq 0 ]; then
        echo "  ℹ️  $location_name: No phantom skills found"
    else
        echo "  ✅ $location_name: Renamed $handled phantom skills"
    fi
}

handle_phantom_skills "$GLOBAL_SKILLS" "Global"
handle_phantom_skills "$PROJECT_SKILLS" "ClaudeCodeProjects"
handle_phantom_skills "$DMB_SKILLS" "DMB-Almanac"

echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "================================================================================"
echo "REMEDIATION SUMMARY"
echo "================================================================================"
echo "Total Fixes Applied: $TOTAL_FIXES"
echo "Total Errors: $TOTAL_ERRORS"
echo ""

if [ $TOTAL_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All critical issues resolved successfully${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run QA validation: ./qa-skills-comprehensive.sh"
    echo "2. Verify production readiness"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some fixes failed - review errors above${NC}"
    echo ""
    echo "Please manually review and fix the errors before proceeding."
    echo ""
    exit 1
fi
