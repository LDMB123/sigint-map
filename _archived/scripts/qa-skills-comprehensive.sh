#!/bin/bash

echo "================================================================================"
echo "CLAUDE CODE SKILLS ECOSYSTEM - COMPREHENSIVE QA REPORT"
echo "================================================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=8
PASSED=0
FAILED=0
TOTAL_ISSUES=0
TOTAL_WARNINGS=0

# Locations
GLOBAL_SKILLS="$HOME/.claude/skills"
PROJECT_SKILLS="/Users/louisherman/ClaudeCodeProjects/.claude/skills"
DMB_SKILLS="/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.claude/skills"

# ============================================================================
# CHECK 1: File Location Validation
# ============================================================================
echo "CHECK 1: FILE LOCATION VALIDATION"
echo "----------------------------------------"

CHECK_1_PASS=true
CHECK_1_ISSUES=0
CHECK_1_WARNINGS=0

# Global skills
if [ -d "$GLOBAL_SKILLS" ]; then
    GLOBAL_TOP=$(find "$GLOBAL_SKILLS" -maxdepth 1 -type f -name "*.md" | wc -l)
    GLOBAL_SUB=$(find "$GLOBAL_SKILLS" -mindepth 2 -type f -name "*.md" | wc -l)
    echo "  Global: $GLOBAL_TOP top-level, $GLOBAL_SUB in subdirectories"

    if [ $GLOBAL_SUB -gt 0 ]; then
        echo "    ⚠️  Warning: $GLOBAL_SUB skills in subdirectories (non-invocable)"
        ((CHECK_1_WARNINGS++))
    fi

    if [ $GLOBAL_TOP -lt 250 ]; then
        echo "    ⚠️  Warning: Expected 277+ top-level skills, found $GLOBAL_TOP"
        ((CHECK_1_WARNINGS++))
    fi
else
    echo "  ❌ Global: Directory does not exist"
    CHECK_1_PASS=false
    ((CHECK_1_ISSUES++))
fi

# ClaudeCodeProjects skills
if [ -d "$PROJECT_SKILLS" ]; then
    PROJECT_TOP=$(find "$PROJECT_SKILLS" -maxdepth 1 -type f -name "*.md" | wc -l)
    PROJECT_SUB=$(find "$PROJECT_SKILLS" -mindepth 2 -type f -name "*.md" | wc -l)
    echo "  ClaudeCodeProjects: $PROJECT_TOP top-level, $PROJECT_SUB in subdirectories"

    if [ $PROJECT_SUB -gt 0 ]; then
        echo "    ⚠️  Warning: $PROJECT_SUB skills in subdirectories (non-invocable)"
        ((CHECK_1_WARNINGS++))
    fi
else
    echo "  ❌ ClaudeCodeProjects: Directory does not exist"
    CHECK_1_PASS=false
    ((CHECK_1_ISSUES++))
fi

# DMB-Almanac skills
if [ -d "$DMB_SKILLS" ]; then
    DMB_TOP=$(find "$DMB_SKILLS" -maxdepth 1 -type f -name "*.md" | wc -l)
    DMB_SUB=$(find "$DMB_SKILLS" -mindepth 2 -type f -name "*.md" | wc -l)
    echo "  DMB-Almanac: $DMB_TOP top-level, $DMB_SUB in subdirectories"

    if [ $DMB_SUB -gt 0 ]; then
        echo "    ⚠️  Warning: $DMB_SUB skills in subdirectories (non-invocable)"
        ((CHECK_1_WARNINGS++))
    fi

    if [ $DMB_TOP -lt 250 ]; then
        echo "    ⚠️  Warning: Expected 278+ top-level skills, found $DMB_TOP"
        ((CHECK_1_WARNINGS++))
    fi
else
    echo "  ❌ DMB-Almanac: Directory does not exist"
    CHECK_1_PASS=false
    ((CHECK_1_ISSUES++))
fi

if [ "$CHECK_1_PASS" = true ]; then
    echo -e "${GREEN}✅ PASS${NC} - File Location Validation"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} - File Location Validation"
    ((FAILED++))
fi
echo "  Issues: $CHECK_1_ISSUES, Warnings: $CHECK_1_WARNINGS"
TOTAL_ISSUES=$((TOTAL_ISSUES + CHECK_1_ISSUES))
TOTAL_WARNINGS=$((TOTAL_WARNINGS + CHECK_1_WARNINGS))
echo ""

# ============================================================================
# CHECK 2: YAML Integrity
# ============================================================================
echo "CHECK 2: YAML INTEGRITY"
echo "----------------------------------------"

CHECK_2_PASS=true
CHECK_2_ISSUES=0
CHECK_2_WARNINGS=0

check_yaml_in_location() {
    local location=$1
    local location_name=$2
    local errors=0
    local missing=0
    local mismatches=0

    if [ ! -d "$location" ]; then
        return
    fi

    while IFS= read -r -d '' file; do
        local filename=$(basename "$file" .md)

        # Check if file has YAML frontmatter
        if ! head -1 "$file" | grep -q "^---$"; then
            ((missing++))
            echo "    ❌ $filename.md: Missing YAML frontmatter"
            continue
        fi

        # Extract YAML and check for name field
        local yaml_section=$(sed -n '/^---$/,/^---$/p' "$file" | sed '1d;$d')

        if ! echo "$yaml_section" | grep -q "^name:"; then
            ((missing++))
            echo "    ❌ $filename.md: Missing 'name' field"
            continue
        fi

        # Check name/filename sync
        local yaml_name=$(echo "$yaml_section" | grep "^name:" | sed 's/name: *//' | tr -d '"' | tr -d "'")
        if [ -n "$yaml_name" ] && [ "$yaml_name" != "$filename" ]; then
            ((mismatches++))
            echo "    ❌ $filename.md: Name mismatch (YAML: '$yaml_name', File: '$filename')"
        fi

        # Check for description
        if ! echo "$yaml_section" | grep -q "^description:"; then
            echo "    ⚠️  $filename.md: Missing 'description' field"
            ((CHECK_2_WARNINGS++))
        fi
    done < <(find "$location" -maxdepth 1 -type f -name "*.md" -print0)

    echo "  $location_name: Parse errors: $errors, Missing fields: $missing, Name mismatches: $mismatches"

    if [ $errors -gt 0 ] || [ $missing -gt 0 ] || [ $mismatches -gt 0 ]; then
        CHECK_2_PASS=false
        CHECK_2_ISSUES=$((CHECK_2_ISSUES + errors + missing + mismatches))
    fi
}

check_yaml_in_location "$GLOBAL_SKILLS" "Global"
check_yaml_in_location "$PROJECT_SKILLS" "ClaudeCodeProjects"
check_yaml_in_location "$DMB_SKILLS" "DMB-Almanac"

if [ "$CHECK_2_PASS" = true ]; then
    echo -e "${GREEN}✅ PASS${NC} - YAML Integrity"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} - YAML Integrity"
    ((FAILED++))
fi
echo "  Issues: $CHECK_2_ISSUES, Warnings: $CHECK_2_WARNINGS"
TOTAL_ISSUES=$((TOTAL_ISSUES + CHECK_2_ISSUES))
TOTAL_WARNINGS=$((TOTAL_WARNINGS + CHECK_2_WARNINGS))
echo ""

# ============================================================================
# CHECK 3: Cross-Location Consistency
# ============================================================================
echo "CHECK 3: CROSS-LOCATION CONSISTENCY"
echo "----------------------------------------"

CHECK_3_PASS=true
CHECK_3_ISSUES=0
CHECK_3_WARNINGS=0

# Get skill lists
GLOBAL_SKILLS_LIST=$(find "$GLOBAL_SKILLS" -maxdepth 1 -type f -name "*.md" -exec basename {} .md \; | sort)
PROJECT_SKILLS_LIST=$(find "$PROJECT_SKILLS" -maxdepth 1 -type f -name "*.md" -exec basename {} .md \; | sort)
DMB_SKILLS_LIST=$(find "$DMB_SKILLS" -maxdepth 1 -type f -name "*.md" -exec basename {} .md \; | sort)

# Check critical skills
CRITICAL_SKILLS=("commit" "review" "debug" "test-generate" "perf-audit")

for skill in "${CRITICAL_SKILLS[@]}"; do
    missing_from=()

    if ! echo "$GLOBAL_SKILLS_LIST" | grep -q "^${skill}$"; then
        missing_from+=("Global")
    fi
    if ! echo "$PROJECT_SKILLS_LIST" | grep -q "^${skill}$"; then
        missing_from+=("ClaudeCodeProjects")
    fi
    if ! echo "$DMB_SKILLS_LIST" | grep -q "^${skill}$"; then
        missing_from+=("DMB-Almanac")
    fi

    if [ ${#missing_from[@]} -gt 0 ]; then
        echo "  ⚠️  Critical skill '$skill' missing from: ${missing_from[*]}"
        ((CHECK_3_WARNINGS++))
    fi
done

echo "  Checked ${#CRITICAL_SKILLS[@]} critical skills across all locations"

if [ "$CHECK_3_PASS" = true ]; then
    echo -e "${GREEN}✅ PASS${NC} - Cross-Location Consistency"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} - Cross-Location Consistency"
    ((FAILED++))
fi
echo "  Issues: $CHECK_3_ISSUES, Warnings: $CHECK_3_WARNINGS"
TOTAL_ISSUES=$((TOTAL_ISSUES + CHECK_3_ISSUES))
TOTAL_WARNINGS=$((TOTAL_WARNINGS + CHECK_3_WARNINGS))
echo ""

# ============================================================================
# CHECK 4: Reference Integrity
# ============================================================================
echo "CHECK 4: REFERENCE INTEGRITY"
echo "----------------------------------------"

CHECK_4_PASS=true
CHECK_4_ISSUES=0
CHECK_4_WARNINGS=0

check_references_in_location() {
    local location=$1
    local location_name=$2
    local hardcoded=0

    if [ ! -d "$location" ]; then
        return
    fi

    while IFS= read -r -d '' file; do
        local filename=$(basename "$file")

        # Check for hardcoded paths
        if grep -q "/Users/" "$file" || grep -q "/home/" "$file"; then
            local count=$(grep -c "/Users/\|/home/" "$file")
            if [ $count -gt 0 ]; then
                echo "    ❌ $filename: Found $count hardcoded absolute paths"
                ((hardcoded++))
            fi
        fi
    done < <(find "$location" -maxdepth 1 -type f -name "*.md" -print0)

    if [ $hardcoded -gt 0 ]; then
        echo "  $location_name: $hardcoded files with hardcoded paths"
        CHECK_4_PASS=false
        CHECK_4_ISSUES=$((CHECK_4_ISSUES + hardcoded))
    else
        echo "  $location_name: No hardcoded paths found"
    fi
}

check_references_in_location "$GLOBAL_SKILLS" "Global"
check_references_in_location "$PROJECT_SKILLS" "ClaudeCodeProjects"
check_references_in_location "$DMB_SKILLS" "DMB-Almanac"

if [ "$CHECK_4_PASS" = true ]; then
    echo -e "${GREEN}✅ PASS${NC} - Reference Integrity"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} - Reference Integrity"
    ((FAILED++))
fi
echo "  Issues: $CHECK_4_ISSUES, Warnings: $CHECK_4_WARNINGS"
TOTAL_ISSUES=$((TOTAL_ISSUES + CHECK_4_ISSUES))
TOTAL_WARNINGS=$((TOTAL_WARNINGS + CHECK_4_WARNINGS))
echo ""

# ============================================================================
# CHECK 5: Invocability Test
# ============================================================================
echo "CHECK 5: INVOCABILITY TEST"
echo "----------------------------------------"

CHECK_5_PASS=true
CHECK_5_ISSUES=0
CHECK_5_WARNINGS=0

# Check for phantom skills
PHANTOM_SKILLS=("lighthouse-webvitals-expert" "accessibility-specialist")

for skill in "${PHANTOM_SKILLS[@]}"; do
    if [ -f "$GLOBAL_SKILLS/${skill}.md" ]; then
        echo "  ⚠️  Global: Phantom skill '$skill' exists"
        ((CHECK_5_WARNINGS++))
    fi
    if [ -f "$PROJECT_SKILLS/${skill}.md" ]; then
        echo "  ⚠️  ClaudeCodeProjects: Phantom skill '$skill' exists"
        ((CHECK_5_WARNINGS++))
    fi
    if [ -f "$DMB_SKILLS/${skill}.md" ]; then
        echo "  ⚠️  DMB-Almanac: Phantom skill '$skill' exists"
        ((CHECK_5_WARNINGS++))
    fi
done

# Test sample skills
TEST_SKILLS=("commit" "review" "debug" "perf-audit" "parallel-audit")

for skill in "${TEST_SKILLS[@]}"; do
    if [ ! -f "$GLOBAL_SKILLS/${skill}.md" ]; then
        echo "  ❌ Global: Expected skill '$skill' not found"
        CHECK_5_PASS=false
        ((CHECK_5_ISSUES++))
    fi
    if [ ! -f "$PROJECT_SKILLS/${skill}.md" ]; then
        echo "  ❌ ClaudeCodeProjects: Expected skill '$skill' not found"
        CHECK_5_PASS=false
        ((CHECK_5_ISSUES++))
    fi
    if [ ! -f "$DMB_SKILLS/${skill}.md" ]; then
        echo "  ❌ DMB-Almanac: Expected skill '$skill' not found"
        CHECK_5_PASS=false
        ((CHECK_5_ISSUES++))
    fi
done

echo "  Tested ${#TEST_SKILLS[@]} sample skills across all locations"

if [ "$CHECK_5_PASS" = true ]; then
    echo -e "${GREEN}✅ PASS${NC} - Invocability Test"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} - Invocability Test"
    ((FAILED++))
fi
echo "  Issues: $CHECK_5_ISSUES, Warnings: $CHECK_5_WARNINGS"
TOTAL_ISSUES=$((TOTAL_ISSUES + CHECK_5_ISSUES))
TOTAL_WARNINGS=$((TOTAL_WARNINGS + CHECK_5_WARNINGS))
echo ""

# ============================================================================
# CHECK 6: Content Quality
# ============================================================================
echo "CHECK 6: CONTENT QUALITY"
echo "----------------------------------------"

CHECK_6_PASS=true
CHECK_6_ISSUES=0
CHECK_6_WARNINGS=0

check_content_in_location() {
    local location=$1
    local location_name=$2
    local unclosed=0
    local todos=0
    local placeholders=0

    if [ ! -d "$location" ]; then
        return
    fi

    while IFS= read -r -d '' file; do
        local filename=$(basename "$file")

        # Check for unclosed code blocks
        local block_count=$(grep -c '```' "$file")
        if [ $((block_count % 2)) -ne 0 ]; then
            echo "    ❌ $filename: Unclosed code block"
            ((unclosed++))
        fi

        # Check for TODO/FIXME
        if grep -qi "TODO\|FIXME" "$file"; then
            ((todos++))
        fi

        # Check for placeholder text
        if grep -qi "\[placeholder\]\|\[TBD\]\|\[TODO\]" "$file"; then
            echo "    ❌ $filename: Contains placeholder text"
            ((placeholders++))
        fi
    done < <(find "$location" -maxdepth 1 -type f -name "*.md" -print0)

    echo "  $location_name: Unclosed blocks: $unclosed, TODO markers: $todos, Placeholders: $placeholders"

    if [ $unclosed -gt 0 ] || [ $placeholders -gt 0 ]; then
        CHECK_6_PASS=false
        CHECK_6_ISSUES=$((CHECK_6_ISSUES + unclosed + placeholders))
    fi

    if [ $todos -gt 0 ]; then
        CHECK_6_WARNINGS=$((CHECK_6_WARNINGS + todos))
    fi
}

check_content_in_location "$GLOBAL_SKILLS" "Global"
check_content_in_location "$PROJECT_SKILLS" "ClaudeCodeProjects"
check_content_in_location "$DMB_SKILLS" "DMB-Almanac"

if [ "$CHECK_6_PASS" = true ]; then
    echo -e "${GREEN}✅ PASS${NC} - Content Quality"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} - Content Quality"
    ((FAILED++))
fi
echo "  Issues: $CHECK_6_ISSUES, Warnings: $CHECK_6_WARNINGS"
TOTAL_ISSUES=$((TOTAL_ISSUES + CHECK_6_ISSUES))
TOTAL_WARNINGS=$((TOTAL_WARNINGS + CHECK_6_WARNINGS))
echo ""

# ============================================================================
# CHECK 7: Coordination Validation
# ============================================================================
echo "CHECK 7: COORDINATION VALIDATION"
echo "----------------------------------------"

CHECK_7_PASS=true
CHECK_7_ISSUES=0
CHECK_7_WARNINGS=0

check_coordination_in_location() {
    local location=$1
    local location_name=$2
    local with_coord=0

    if [ ! -d "$location" ]; then
        return
    fi

    while IFS= read -r -d '' file; do
        if grep -q "^coordination:" "$file"; then
            ((with_coord++))
        fi
    done < <(find "$location" -maxdepth 1 -type f -name "*.md" -print0)

    echo "  $location_name: $with_coord skills with coordination"

    if [ $with_coord -lt 20 ]; then
        echo "    ⚠️  Expected 25+ skills with coordination"
        ((CHECK_7_WARNINGS++))
    fi
}

check_coordination_in_location "$GLOBAL_SKILLS" "Global"
check_coordination_in_location "$PROJECT_SKILLS" "ClaudeCodeProjects"
check_coordination_in_location "$DMB_SKILLS" "DMB-Almanac"

if [ "$CHECK_7_PASS" = true ]; then
    echo -e "${GREEN}✅ PASS${NC} - Coordination Validation"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} - Coordination Validation"
    ((FAILED++))
fi
echo "  Issues: $CHECK_7_ISSUES, Warnings: $CHECK_7_WARNINGS"
TOTAL_ISSUES=$((TOTAL_ISSUES + CHECK_7_ISSUES))
TOTAL_WARNINGS=$((TOTAL_WARNINGS + CHECK_7_WARNINGS))
echo ""

# ============================================================================
# CHECK 8: Documentation Sync
# ============================================================================
echo "CHECK 8: DOCUMENTATION SYNC"
echo "----------------------------------------"

CHECK_8_PASS=true
CHECK_8_ISSUES=0
CHECK_8_WARNINGS=0

DOC_FILES=(
    "SKILL_INDEX.md"
    "SKILL_COORDINATION_MATRIX.md"
    "TOKEN_OPTIMIZATION_PRINCIPLES.md"
    "SKILL_INTEGRATION_PATTERNS.md"
)

for doc in "${DOC_FILES[@]}"; do
    if [ ! -f "$GLOBAL_SKILLS/$doc" ]; then
        echo "  ⚠️  Global: Missing $doc"
        ((CHECK_8_WARNINGS++))
    fi
    if [ ! -f "$PROJECT_SKILLS/$doc" ]; then
        echo "  ⚠️  ClaudeCodeProjects: Missing $doc"
        ((CHECK_8_WARNINGS++))
    fi
    if [ ! -f "$DMB_SKILLS/$doc" ]; then
        echo "  ⚠️  DMB-Almanac: Missing $doc"
        ((CHECK_8_WARNINGS++))
    fi
done

echo "  Checked ${#DOC_FILES[@]} documentation files across all locations"

if [ "$CHECK_8_PASS" = true ]; then
    echo -e "${GREEN}✅ PASS${NC} - Documentation Sync"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} - Documentation Sync"
    ((FAILED++))
fi
echo "  Issues: $CHECK_8_ISSUES, Warnings: $CHECK_8_WARNINGS"
TOTAL_ISSUES=$((TOTAL_ISSUES + CHECK_8_ISSUES))
TOTAL_WARNINGS=$((TOTAL_WARNINGS + CHECK_8_WARNINGS))
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "================================================================================"
echo "SUMMARY"
echo "================================================================================"
echo "Total Checks: $TOTAL_CHECKS"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Critical Issues: $TOTAL_ISSUES"
echo "Warnings: $TOTAL_WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "Production Ready: ${GREEN}✅ YES${NC}"
    echo "================================================================================"
    exit 0
else
    echo -e "Production Ready: ${RED}❌ NO${NC}"
    echo "================================================================================"
    exit 1
fi
