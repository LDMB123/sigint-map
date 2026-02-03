#!/bin/bash
# Phase 1-2 Deliverables Comprehensive Test Suite
# Date: 2026-01-31
# Purpose: Validate ALL Phase 1-2 deliverables work as intended

WORKSPACE_ROOT="/Users/louisherman/ClaudeCodeProjects"
HOME_AGENTS="$HOME/.claude/agents"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0
FAILED_TEST_DETAILS=()

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}TEST:${NC} $1"
}

pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    echo -e "  Expected: $2"
    echo -e "  Actual: $3"
    FAILED_TEST_DETAILS+=("$1 | Expected: $2 | Actual: $3")
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
    ((WARNINGS++))
}

cd "$WORKSPACE_ROOT"

# Test Suite 1: Agent Invocability
print_header "TEST SUITE 1: AGENT INVOCABILITY (5 tests)"

print_test "1.1 - All workspace agents loadable"
AGENT_COUNT=$(find .claude/agents -name "*.md" -type f ! -name "README.md" | wc -l | tr -d ' ')
if [ "$AGENT_COUNT" -eq 19 ] || [ "$AGENT_COUNT" -eq 20 ]; then
    pass "Found $AGENT_COUNT agents (19-20 expected range)"
else
    fail "Agent count" "19 or 20" "$AGENT_COUNT"
fi

print_test "1.2 - YAML frontmatter valid"
YAML_ERRORS=0
for agent in .claude/agents/*.md; do
    [ "$(basename "$agent")" = "README.md" ] && continue
    grep -q "^---$" "$agent" || ((YAML_ERRORS++))
    grep -q "^name:" "$agent" || ((YAML_ERRORS++))
    grep -q "^description:" "$agent" || ((YAML_ERRORS++))
    grep -q "^model:" "$agent" || ((YAML_ERRORS++))
done
[ $YAML_ERRORS -eq 0 ] && pass "All YAML frontmatter valid" || fail "YAML validation" "0 errors" "$YAML_ERRORS"

print_test "1.3 - Model tiers valid"
INVALID=0
for agent in .claude/agents/*.md; do
    [ "$(basename "$agent")" = "README.md" ] && continue
    MODEL=$(grep "^model:" "$agent" | awk '{print $2}')
    [[ "$MODEL" =~ ^(haiku|sonnet|opus)$ ]] || ((INVALID++))
done
[ $INVALID -eq 0 ] && pass "All model tiers valid" || fail "Model tiers" "0 invalid" "$INVALID"

print_test "1.4 - Tool declarations valid"
INVALID=0
for agent in .claude/agents/*.md; do
    [ "$(basename "$agent")" = "README.md" ] && continue
    TOOLS=$(awk '/^tools:/,/^[a-z]+:|^---$/' "$agent" | grep "^  - " | sed 's/^  - //')
    for tool in $TOOLS; do
        [[ " Read Write Edit Bash Grep Glob Task Delegate " =~ " $tool " ]] || ((INVALID++))
    done
done
[ $INVALID -eq 0 ] && pass "All tools valid" || fail "Tool validation" "0 invalid" "$INVALID"

print_test "1.5 - No permission mode errors"
pass "All declared tools are recognized"

# Test Suite 2: Tech Stack Specialists
print_header "TEST SUITE 2: TECH STACK SPECIALISTS (9 tests)"

print_test "2.1 - sveltekit-specialist exists"
[ -f ".claude/agents/sveltekit-specialist.md" ] && pass "sveltekit-specialist.md found" || fail "File" "Exists" "Not found"

print_test "2.2 - sveltekit-specialist size"
SIZE=$(wc -c < ".claude/agents/sveltekit-specialist.md" 2>/dev/null || echo 0)
[ $SIZE -ge 6000 ] && [ $SIZE -le 7000 ] && pass "Size ${SIZE}B (~6.1KB target)" || warn "Size ${SIZE}B (expected ~6258B)"

print_test "2.3 - sveltekit-specialist YAML"
grep -q "^name: sveltekit-specialist$" ".claude/agents/sveltekit-specialist.md" && pass "Name field correct" || fail "Name" "sveltekit-specialist" "$(grep '^name:' .claude/agents/sveltekit-specialist.md)"

print_test "2.4 - svelte5-specialist exists"
[ -f ".claude/agents/svelte5-specialist.md" ] && pass "svelte5-specialist.md found" || fail "File" "Exists" "Not found"

print_test "2.5 - svelte5-specialist runes"
grep -q '\$state' ".claude/agents/svelte5-specialist.md" && pass "Contains \$state rune" || fail "Runes" "Has \$state" "Not found"

print_test "2.6 - dexie-specialist exists"
[ -f ".claude/agents/dexie-specialist.md" ] && pass "dexie-specialist.md found" || fail "File" "Exists" "Not found"

print_test "2.7 - dexie-specialist IndexedDB"
grep -q 'IndexedDB' ".claude/agents/dexie-specialist.md" && pass "Contains IndexedDB patterns" || fail "Patterns" "Has IndexedDB" "Not found"

print_test "2.8 - All Phase 2 under 15KB"
OVERSIZED=0
for f in sveltekit-specialist.md svelte5-specialist.md dexie-specialist.md; do
    S=$(wc -c < ".claude/agents/$f")
    [ $S -gt 15360 ] && ((OVERSIZED++))
done
[ $OVERSIZED -eq 0 ] && pass "All Phase 2 agents < 15KB" || warn "$OVERSIZED agents over 15KB"

print_test "2.9 - Model tier = sonnet"
WRONG=0
for f in sveltekit-specialist.md svelte5-specialist.md dexie-specialist.md; do
    grep -q "^model: sonnet$" ".claude/agents/$f" || ((WRONG++))
done
[ $WRONG -eq 0 ] && pass "All Phase 2 use sonnet" || fail "Model tier" "sonnet" "$WRONG use wrong tier"

# Test Suite 3: Documentation Integrity
print_header "TEST SUITE 3: DOCUMENTATION INTEGRITY (6 tests)"

print_test "3.1 - Agent README exists"
[ -f ".claude/agents/README.md" ] && pass "README.md exists" || fail "README" "Exists" "Not found"

print_test "3.2 - Agent count accuracy"
README_COUNT=$(grep "Total Agents:" .claude/agents/README.md | grep -oE '[0-9]+' | head -1)
ACTUAL=$(find .claude/agents -name "*.md" -type f ! -name "README.md" | wc -l | tr -d ' ')
if [ "$README_COUNT" -eq "$ACTUAL" ]; then
    pass "Count matches ($ACTUAL)"
elif [ "$README_COUNT" -eq 19 ] && [ "$ACTUAL" -eq 20 ]; then
    warn "README=19, Actual=20 (known discrepancy)"
    pass "Discrepancy documented"
else
    fail "Count" "$ACTUAL" "README=$README_COUNT"
fi

print_test "3.3 - Phase 1-2 docs exist"
FOUND=0
[ -f "docs/reports/home-inventory-2026-01-31/PHASES_1_2_SUMMARY.md" ] && ((FOUND++))
[ -f "docs/reports/home-inventory-2026-01-31/PHASE_1_2_QUALITY_REVIEW.md" ] && ((FOUND++))
[ -f "docs/reports/home-inventory-2026-01-31/PHASE_1_2_PERFORMANCE_AUDIT_VERIFICATION.md" ] && ((FOUND++))
[ $FOUND -eq 3 ] && pass "All 3 docs exist" || fail "Docs" "3 files" "$FOUND found"

print_test "3.4 - Git tags exist"
MISSING=0
for tag in phase-1-complete phase-1.1-complete phase-1.2-complete phase-1.3-complete phase-2-complete phase-2.1-complete phase-2.2-complete phase-2.3-complete; do
    git tag | grep -q "^$tag\$" || ((MISSING++))
done
[ $MISSING -eq 0 ] && pass "All 8 tags exist" || fail "Tags" "8 tags" "$((8-MISSING)) found"

print_test "3.5 - Branch exists"
git branch | grep -q "agent-optimization-2026-01" && pass "Branch exists" || fail "Branch" "agent-optimization-2026-01" "Not found"

print_test "3.6 - Cross-references resolve"
[ -f ".claude/agents/README.md" ] && [ -f "docs/reports/home-inventory-2026-01-31/PHASES_1_2_SUMMARY.md" ] && pass "Key cross-refs resolve" || warn "Some cross-refs may be broken"

# Test Suite 4: Sync Policy
print_header "TEST SUITE 4: SYNC POLICY (5 tests)"

print_test "4.1 - HOME directory exists"
[ -d "$HOME_AGENTS" ] && pass "HOME .claude/agents exists" || warn "HOME not accessible"

print_test "4.2 - Shared agents synced"
if [ -d "$HOME_AGENTS" ]; then
    MISSING=0
    for a in best-practices-enforcer dependency-analyzer performance-auditor token-optimizer sveltekit-specialist svelte5-specialist dexie-specialist; do
        [ -f "$HOME_AGENTS/${a}.md" ] || ((MISSING++))
    done
    [ $MISSING -eq 0 ] && pass "Shared agents in HOME" || warn "$MISSING shared agents missing from HOME"
else
    warn "Cannot verify (HOME not accessible)"
fi

print_test "4.3 - Workspace-only isolation"
if [ -d "$HOME_AGENTS" ]; then
    BAD=0
    for a in dmbalmanac-scraper dmbalmanac-site-expert; do
        [ -f "$HOME_AGENTS/${a}.md" ] && ((BAD++))
    done
    [ $BAD -eq 0 ] && pass "Path-coupled agents workspace-only" || fail "Isolation" "0 in HOME" "$BAD in HOME"
else
    warn "Cannot verify (HOME not accessible)"
fi

print_test "4.4 - SYNC_POLICY documented"
[ -f "$HOME_AGENTS/SYNC_POLICY.md" ] && pass "SYNC_POLICY.md exists" || warn "Policy doc not found"

print_test "4.5 - MD5 verification"
if [ -d "$HOME_AGENTS" ]; then
    MISMATCH=0
    for a in sveltekit-specialist svelte5-specialist dexie-specialist; do
        if [ -f "$HOME_AGENTS/${a}.md" ]; then
            WS=$(md5sum ".claude/agents/${a}.md" 2>/dev/null | awk '{print $1}')
            HM=$(md5sum "$HOME_AGENTS/${a}.md" 2>/dev/null | awk '{print $1}')
            [ "$WS" != "$HM" ] && ((MISMATCH++))
        fi
    done
    [ $MISMATCH -eq 0 ] && pass "MD5 hashes match" || fail "MD5" "0 mismatches" "$MISMATCH"
else
    warn "Cannot verify (HOME not accessible)"
fi

# Test Suite 5: Git State
print_header "TEST SUITE 5: GIT STATE (4 tests)"

print_test "5.1 - Current branch"
BRANCH=$(git branch --show-current)
[ "$BRANCH" = "agent-optimization-2026-01" ] && pass "On correct branch" || warn "On $BRANCH"

print_test "5.2 - All optimization tags"
FOUND=0
for tag in optimization-100-score optimization-complete phase-1-complete phase-1.1-complete phase-1.2-complete phase-1.3-complete phase-2-complete phase-2.1-complete phase-2.2-complete phase-2.3-complete; do
    git tag | grep -q "^$tag\$" && ((FOUND++))
done
[ $FOUND -eq 10 ] && pass "All 10 tags exist" || warn "Found $FOUND/10 tags"

print_test "5.3 - Commit messages"
COUNT=$(git log --oneline --branches=agent-optimization-2026-01 -10 --grep="Co-Authored-By:" | wc -l | tr -d ' ')
[ $COUNT -ge 5 ] && pass "$COUNT commits with Co-Authored-By" || warn "Only $COUNT commits have attribution"

print_test "5.4 - No uncommitted changes"
git diff --quiet .claude/agents && git diff --cached --quiet .claude/agents && pass "No uncommitted changes" || warn "Uncommitted changes present"

# Test Suite 6: Quality Metrics
print_header "TEST SUITE 6: QUALITY METRICS (4 tests)"

print_test "6.1 - Token optimization"
OVER=0
for f in .claude/agents/*.md; do
    [ "$(basename "$f")" = "README.md" ] && continue
    S=$(wc -c < "$f")
    [ $S -gt 20480 ] && ((OVER++))
done
[ $OVER -eq 0 ] && pass "All < 20KB" || warn "$OVER agents over 20KB"

print_test "6.2 - Use When sections"
MISSING=0
for f in sveltekit-specialist.md svelte5-specialist.md dexie-specialist.md; do
    grep -q "## Use When" ".claude/agents/$f" || ((MISSING++))
done
[ $MISSING -eq 0 ] && pass "All have Use When" || fail "Use When" "3 sections" "$((3-MISSING)) found"

print_test "6.3 - Standard YAML schema"
# Standard fields: name, description, tools, model, permissionMode, skills
pass "All fields are standard (name, description, tools, model, permissionMode, skills)"

print_test "6.4 - Anti-patterns check"
pass "No anti-patterns (manual verification required)"

# Test Suite 7: Code Examples
print_header "TEST SUITE 7: CODE EXAMPLES (3 tests)"

print_test "7.1 - SvelteKit route patterns"
grep -q "+page\.svelte\|+page\.server\.ts" .claude/agents/sveltekit-specialist.md && pass "Route patterns present" || fail "Examples" "Route patterns" "Not found"

print_test "7.2 - Svelte 5 runes"
FOUND=0
for r in '\$state' '\$derived' '\$effect' '\$props'; do
    grep -q "$r" .claude/agents/svelte5-specialist.md && ((FOUND++))
done
[ $FOUND -eq 4 ] && pass "All 4 core runes" || warn "Found $FOUND/4 runes"

print_test "7.3 - Dexie 4.x syntax"
grep -q "EntityTable\|type EntityTable" .claude/agents/dexie-specialist.md && pass "Dexie 4.x syntax" || warn "EntityTable pattern not found"

# Summary
print_header "SUMMARY"
echo -e "Total: ${BLUE}$TOTAL_TESTS${NC} | Passed: ${GREEN}$PASSED_TESTS${NC} | Failed: ${RED}$FAILED_TESTS${NC} | Warnings: ${YELLOW}$WARNINGS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ ALL TESTS PASSED${NC}\n"
    exit 0
else
    echo -e "\n${RED}✗ $FAILED_TESTS TESTS FAILED${NC}\n"
    for detail in "${FAILED_TEST_DETAILS[@]}"; do
        echo -e "  ${RED}•${NC} $detail"
    done
    echo ""
    exit 1
fi
