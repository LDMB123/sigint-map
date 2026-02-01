#!/bin/bash
# Infrastructure Health Check - Comprehensive system validation
# Created: 2026-01-31 (Phase 4: Governance)
# Usage: .claude/scripts/infra-health-check.sh

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOME_CLAUDE="$HOME/.claude"
PROJECT_CLAUDE="$PROJECT_ROOT/.claude"

# Thresholds
MAX_AGENTS=500
MAX_AGENT_SIZE_KB=50
MAX_ROUTE_TABLE_KB=300
MAX_DUPLICATES=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

pass() { echo -e "${GREEN}  PASS${NC} $1"; }
warn() { echo -e "${YELLOW}  WARN${NC} $1"; WARNINGS=$((WARNINGS + 1)); }
fail() { echo -e "${RED}  FAIL${NC} $1"; ERRORS=$((ERRORS + 1)); }

echo "==========================================="
echo "  Claude Infrastructure Health Check"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "==========================================="
echo ""

# --- SECTION 1: Agent Count ---
echo -e "${BLUE}[1/7] Agent Count${NC}"
AGENT_COUNT=$(find "$HOME_CLAUDE/agents" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$AGENT_COUNT" -gt "$MAX_AGENTS" ]; then
    fail "Agent count ($AGENT_COUNT) exceeds limit ($MAX_AGENTS)"
elif [ "$AGENT_COUNT" -gt $((MAX_AGENTS * 80 / 100)) ]; then
    warn "Agent count ($AGENT_COUNT) approaching limit ($MAX_AGENTS)"
else
    pass "Agent count: $AGENT_COUNT (limit: $MAX_AGENTS)"
fi

# --- SECTION 2: Duplicate Detection ---
echo -e "${BLUE}[2/7] Duplicate Detection${NC}"
UNIQUE_HASHES=$(python3 -c "
import os, hashlib
d='$HOME_CLAUDE/agents'
h={}
dups=0
for r,_,fs in os.walk(d):
    for f in fs:
        if f.endswith('.md'):
            p=os.path.join(r,f)
            s=hashlib.md5(open(p,'rb').read()).hexdigest()
            if s in h: dups+=1
            else: h[s]=f
print(dups)
" 2>/dev/null)
if [ "$UNIQUE_HASHES" -gt "$MAX_DUPLICATES" ]; then
    fail "Found $UNIQUE_HASHES duplicate agent files"
elif [ "$UNIQUE_HASHES" -gt 0 ]; then
    warn "Found $UNIQUE_HASHES duplicate agent files"
else
    pass "No duplicate agents detected"
fi

# --- SECTION 3: Route Table Health ---
echo -e "${BLUE}[3/7] Route Table Health${NC}"
# Check both locations for semantic route table
if [ -f "$PROJECT_CLAUDE/config/semantic-route-table.json" ]; then
    SRT_PATH="$PROJECT_CLAUDE/config/semantic-route-table.json"
elif [ -f "$HOME_CLAUDE/config/semantic-route-table.json" ]; then
    SRT_PATH="$HOME_CLAUDE/config/semantic-route-table.json"
else
    SRT_PATH=""
fi
if [ -n "$SRT_PATH" ] && [ -f "$SRT_PATH" ]; then
    SRT_SIZE=$(du -k "$SRT_PATH" | awk '{print $1}')
    if python3 -c "import json; json.load(open('$SRT_PATH'))" 2>/dev/null; then
        if [ "$SRT_SIZE" -gt "$MAX_ROUTE_TABLE_KB" ]; then
            warn "Route table large: ${SRT_SIZE}KB (limit: ${MAX_ROUTE_TABLE_KB}KB)"
        else
            pass "Route table valid JSON, ${SRT_SIZE}KB"
        fi
    else
        fail "Route table is invalid JSON"
    fi

    # Check version
    VERSION=$(python3 -c "import json; print(json.load(open('$SRT_PATH')).get('version','unknown'))" 2>/dev/null)
    pass "Route table version: $VERSION"
else
    fail "Semantic route table not found in project or home .claude/config/"
fi

# --- SECTION 4: Config File Validity ---
echo -e "${BLUE}[4/7] Config File Validity${NC}"
for cfg in "$PROJECT_CLAUDE/config/"*.yaml; do
    [ -f "$cfg" ] || continue
    name=$(basename "$cfg")
    if python3 -c "import yaml; yaml.safe_load(open('$cfg'))" 2>/dev/null; then
        pass "$name: valid YAML"
    else
        fail "$name: invalid YAML"
    fi
done
for cfg in "$PROJECT_CLAUDE/config/"*.json; do
    [ -f "$cfg" ] || continue
    name=$(basename "$cfg")
    if python3 -c "import json; json.load(open('$cfg'))" 2>/dev/null; then
        pass "$name: valid JSON"
    else
        fail "$name: invalid JSON"
    fi
done

# --- SECTION 5: Frontmatter Validation (sample) ---
echo -e "${BLUE}[5/7] Agent Frontmatter (sample of 20)${NC}"
BAD_FM=0
SAMPLED=0
for agent in $(find "$HOME_CLAUDE/agents" -name "*.md" -type f | awk 'BEGIN{srand()}{print rand()"\t"$0}' | sort -n | cut -f2 | head -20); do
    SAMPLED=$((SAMPLED + 1))
    if ! head -1 "$agent" | grep -q "^---$" 2>/dev/null; then
        name=$(basename "$agent")
        if [ "$name" != "README.md" ] && [ "$name" != "SYNC_POLICY.md" ]; then
            BAD_FM=$((BAD_FM + 1))
        fi
    fi
done
if [ "$BAD_FM" -eq 0 ]; then
    pass "All $SAMPLED sampled agents have valid frontmatter"
else
    warn "$BAD_FM of $SAMPLED sampled agents missing frontmatter"
fi

# --- SECTION 6: Backup Directories ---
echo -e "${BLUE}[6/7] Stale Backup Detection${NC}"
STALE_BACKUPS=$(find "$HOME_CLAUDE" -maxdepth 1 -type d -name "*backup*" -name "*phase*" 2>/dev/null | wc -l | tr -d ' ')
if [ "$STALE_BACKUPS" -gt 0 ]; then
    fail "Found $STALE_BACKUPS stale backup directories in ~/.claude/"
else
    pass "No stale backup directories"
fi

# Check for backup tarballs
TARBALL_COUNT=$(find "$HOME_CLAUDE" -maxdepth 1 -name "*.tar.gz" 2>/dev/null | wc -l | tr -d ' ')
if [ "$TARBALL_COUNT" -gt 0 ]; then
    pass "Backup tarballs available: $TARBALL_COUNT"
else
    warn "No backup tarballs found (consider creating one)"
fi

# --- SECTION 7: Skills Validation ---
echo -e "${BLUE}[7/7] Skills Validation${NC}"
SKILL_COUNT=$(find "$PROJECT_CLAUDE/skills" -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
BAD_SKILLS=0
for skill in $(find "$PROJECT_CLAUDE/skills" -name "SKILL.md" 2>/dev/null); do
    if ! head -1 "$skill" | grep -q "^---$" 2>/dev/null; then
        BAD_SKILLS=$((BAD_SKILLS + 1))
    fi
done
if [ "$BAD_SKILLS" -eq 0 ]; then
    pass "All $SKILL_COUNT skills have valid frontmatter"
else
    warn "$BAD_SKILLS of $SKILL_COUNT skills missing frontmatter"
fi

# --- SUMMARY ---
echo ""
echo "==========================================="
echo "  SUMMARY"
echo "==========================================="
echo ""
echo "  Agents:      $AGENT_COUNT"
echo "  Skills:      $SKILL_COUNT"
echo "  Errors:      $ERRORS"
echo "  Warnings:    $WARNINGS"
echo ""

if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}  STATUS: ALL CHECKS PASSED${NC}"
elif [ "$ERRORS" -eq 0 ]; then
    echo -e "${YELLOW}  STATUS: PASSED WITH $WARNINGS WARNING(S)${NC}"
else
    echo -e "${RED}  STATUS: FAILED WITH $ERRORS ERROR(S)${NC}"
fi
echo ""
echo "  Run: $(date '+%Y-%m-%d %H:%M:%S')"
echo "==========================================="

exit $ERRORS
