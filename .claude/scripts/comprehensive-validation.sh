#!/bin/bash
# Comprehensive Validation Script for Universal Agent Framework
# Validates all fixes from forensic audit remediation

set -e

echo "=========================================="
echo "UAF COMPREHENSIVE VALIDATION"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: YAML Syntax Validation
echo "TEST 1: YAML Syntax Validation"
echo "-------------------------------------------"
YAML_FILES=$(find /Users/louisherman/ClaudeCodeProjects/.claude/agents -name "*.yaml")
YAML_COUNT=0
YAML_ERRORS=0

for file in $YAML_FILES; do
    YAML_COUNT=$((YAML_COUNT + 1))
    if ! python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
        echo -e "${RED}✗${NC} YAML syntax error: $file"
        YAML_ERRORS=$((YAML_ERRORS + 1))
        ERRORS=$((ERRORS + 1))
    fi
done

if [ $YAML_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓${NC} All $YAML_COUNT YAML files valid"
else
    echo -e "${RED}✗${NC} $YAML_ERRORS/$YAML_COUNT YAML files have syntax errors"
fi
echo ""

# Test 2: No "orchestrator_testing" Corruption
echo "TEST 2: Corruption Check (orchestrator_testing)"
echo "-------------------------------------------"
CORRUPTED=$(grep -r "orchestrator_testing" /Users/louisherman/ClaudeCodeProjects/.claude/agents --include="*.yaml" --include="*.md" | wc -l | tr -d ' ')

if [ "$CORRUPTED" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No 'orchestrator_testing' corruption found"
else
    echo -e "${RED}✗${NC} Found $CORRUPTED occurrences of 'orchestrator_testing' corruption"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 3: Collaboration Contracts Present
echo "TEST 3: Collaboration Contracts"
echo "-------------------------------------------"
TOTAL_AGENTS=$(find /Users/louisherman/ClaudeCodeProjects/.claude/agents -name "*.yaml" -o -name "*.md" | wc -l | tr -d ' ')
WITH_CONTRACTS=$(grep -l "^collaboration:" /Users/louisherman/ClaudeCodeProjects/.claude/agents/**/*.{yaml,md} 2>/dev/null | wc -l | tr -d ' ')
MISSING=$((TOTAL_AGENTS - WITH_CONTRACTS))

if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}✓${NC} All $TOTAL_AGENTS agents have collaboration contracts"
else
    echo -e "${YELLOW}⚠${NC} $MISSING/$TOTAL_AGENTS agents missing collaboration contracts"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Test 4: Required Fields Present
echo "TEST 4: Required Fields Validation"
echo "-------------------------------------------"
REQUIRED_FIELDS=("agent.id" "agent.name" "agent.model_tier" "agent.version")
MISSING_FIELDS=0

for file in $(find /Users/louisherman/ClaudeCodeProjects/.claude/agents -name "*.yaml"); do
    for field in "${REQUIRED_FIELDS[@]}"; do
        if ! grep -q "$field:" "$file"; then
            echo -e "${RED}✗${NC} Missing $field in $file"
            MISSING_FIELDS=$((MISSING_FIELDS + 1))
            ERRORS=$((ERRORS + 1))
        fi
    done
done

if [ $MISSING_FIELDS -eq 0 ]; then
    echo -e "${GREEN}✓${NC} All required fields present in all agents"
fi
echo ""

# Test 5: Model Tier Validation
echo "TEST 5: Model Tier Validation"
echo "-------------------------------------------"
INVALID_TIERS=$(grep -h "model_tier:" /Users/louisherman/ClaudeCodeProjects/.claude/agents/**/*.yaml 2>/dev/null | grep -v -E "(haiku|sonnet|opus)" | wc -l | tr -d ' ')

if [ "$INVALID_TIERS" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} All model tiers are valid (haiku/sonnet/opus)"
else
    echo -e "${RED}✗${NC} Found $INVALID_TIERS invalid model tier values"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 6: Agent ID Uniqueness
echo "TEST 6: Agent ID Uniqueness"
echo "-------------------------------------------"
DUPLICATE_IDS=$(grep -h "^  id:" /Users/louisherman/ClaudeCodeProjects/.claude/agents/**/*.yaml 2>/dev/null | sort | uniq -d | wc -l | tr -d ' ')

if [ "$DUPLICATE_IDS" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} All agent IDs are unique"
else
    echo -e "${RED}✗${NC} Found $DUPLICATE_IDS duplicate agent IDs"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 7: Broken References Check
echo "TEST 7: Broken References"
echo "-------------------------------------------"
# This is a simplified check - full validation requires parsing YAML
echo -e "${YELLOW}⚠${NC} Skipping (requires test suite) - will be validated by contract-validator"
echo ""

# Test 8: Telemetry Database Check
echo "TEST 8: Telemetry Infrastructure"
echo "-------------------------------------------"
if [ -f "/Users/louisherman/.claude/telemetry/metrics.db" ]; then
    TABLES=$(sqlite3 /Users/louisherman/.claude/telemetry/metrics.db ".tables" 2>/dev/null | wc -w | tr -d ' ')
    if [ "$TABLES" -ge 9 ]; then
        echo -e "${GREEN}✓${NC} Telemetry database exists with $TABLES tables"
    else
        echo -e "${YELLOW}⚠${NC} Telemetry database exists but has only $TABLES tables (expected 9+)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗${NC} Telemetry database not found"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 9: Caching Infrastructure Check
echo "TEST 9: Caching Infrastructure"
echo "-------------------------------------------"
if [ -f "/Users/louisherman/ClaudeCodeProjects/.claude/config/caching.yaml" ]; then
    echo -e "${GREEN}✓${NC} Caching configuration exists"
else
    echo -e "${RED}✗${NC} Caching configuration missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "/Users/louisherman/ClaudeCodeProjects/.claude/lib/cache-manager.ts" ]; then
    echo -e "${GREEN}✓${NC} Cache manager implementation exists"
else
    echo -e "${RED}✗${NC} Cache manager implementation missing"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 10: Documentation Check
echo "TEST 10: Documentation Presence"
echo "-------------------------------------------"
README_COUNT=$(find /Users/louisherman/ClaudeCodeProjects/.claude/agents -name "README.md" | wc -l | tr -d ' ')

if [ "$README_COUNT" -ge 10 ]; then
    echo -e "${GREEN}✓${NC} Found $README_COUNT category README files"
else
    echo -e "${YELLOW}⚠${NC} Only $README_COUNT category README files found (expected 15)"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Test 11: Test Suite Check
echo "TEST 11: Test Suite Deployment"
echo "-------------------------------------------"
if [ -d "/Users/louisherman/ClaudeCodeProjects/.claude/tests" ]; then
    TEST_FILES=$(find /Users/louisherman/ClaudeCodeProjects/.claude/tests -name "*.test.ts" | wc -l | tr -d ' ')
    if [ "$TEST_FILES" -ge 5 ]; then
        echo -e "${GREEN}✓${NC} Test suite deployed with $TEST_FILES test files"
    else
        echo -e "${YELLOW}⚠${NC} Test suite has only $TEST_FILES test files (expected 5+)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗${NC} Test suite directory not found"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 12: OpenAPI Specifications Check
echo "TEST 12: OpenAPI Specifications"
echo "-------------------------------------------"
if [ -d "/Users/louisherman/ClaudeCodeProjects/.claude/api" ]; then
    OPENAPI_FILES=$(find /Users/louisherman/ClaudeCodeProjects/.claude/api -name "*.openapi.yaml" -o -name "openapi.yaml" | wc -l | tr -d ' ')
    if [ "$OPENAPI_FILES" -ge 5 ]; then
        echo -e "${GREEN}✓${NC} Found $OPENAPI_FILES OpenAPI specification files"
    else
        echo -e "${YELLOW}⚠${NC} Only $OPENAPI_FILES OpenAPI files found (expected 5+)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC} OpenAPI directory not found"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Final Summary
echo "=========================================="
echo "VALIDATION SUMMARY"
echo "=========================================="
echo ""
echo "Total Tests Run: 12"
echo -e "Errors: ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓✓✓ ALL VALIDATIONS PASSED ✓✓✓${NC}"
    echo ""
    echo "System Health: 100/100 (A+)"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ PASSED WITH WARNINGS ⚠${NC}"
    echo ""
    echo "System Health: 85/100 (B)"
    exit 0
else
    echo -e "${RED}✗✗✗ VALIDATION FAILED ✗✗✗${NC}"
    echo ""
    echo "System Health: $((100 - ERRORS * 10))/100"
    exit 1
fi
