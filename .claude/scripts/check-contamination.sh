#!/usr/bin/env bash
# check-contamination.sh
# Detects cross-project agent contamination and stale tech references.
# Run manually or via Claude hook to verify workspace isolation is intact.
#
# Usage: .claude/scripts/check-contamination.sh
# Exit:  0 = clean, 1 = contamination found

set -euo pipefail

WORKSPACE="$(cd "$(dirname "$0")/../.." && pwd)"
GLOBAL_AGENTS=~/.claude/agents
FAIL=0

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

pass() { echo -e "  ${GREEN}PASS${NC}  $1"; }
fail() { echo -e "  ${RED}FAIL${NC}  $1"; FAIL=1; }
warn() { echo -e "  ${YELLOW}WARN${NC}  $1"; }

echo "=== Workspace Contamination Check ==="
echo "Workspace: $WORKSPACE"
echo ""

# ----------------------------------------------------------------------------
# 1. Global agents (~/.claude/agents/) must not contain project-specific agents
# ----------------------------------------------------------------------------
echo "[1] Global agent scope (~/.claude/agents/)"

PROJECT_KEYWORDS="dmb|svelte|sveltekit|dexie|safari|violin|imagen|blaire|gemini-api"
# Only check top-level agents, not _archived/ subdirectories
hits=$(find "$GLOBAL_AGENTS" -maxdepth 1 -name "*.md" 2>/dev/null \
  | grep -Ei "$PROJECT_KEYWORDS" || true)

if [ -z "$hits" ]; then
  pass "No project-specific agents in global scope"
else
  while IFS= read -r f; do
    fail "Project-specific agent in global scope: $(basename $f)"
  done <<< "$hits"
fi

# Also check for dmb/ subdirectory
if [ -d "$GLOBAL_AGENTS/dmb" ]; then
  fail "DMB subdirectory exists in global scope: ~/.claude/agents/dmb/"
else
  pass "No DMB subdirectory in global scope"
fi
echo ""

# ----------------------------------------------------------------------------
# 2. Workspace .claude/agents/ should have zero active agents (only README + _archived)
# ----------------------------------------------------------------------------
echo "[2] Workspace agent dir ($WORKSPACE/.claude/agents/)"

WORKSPACE_AGENTS="$WORKSPACE/.claude/agents"
active=$(find "$WORKSPACE_AGENTS" -maxdepth 1 -name "*.md" \
  ! -name "README.md" ! -name "SYNC_POLICY.md" 2>/dev/null || true)

if [ -z "$active" ]; then
  pass "No active agents at workspace scope (correct — use project scope)"
else
  while IFS= read -r f; do
    warn "Active agent at workspace scope: $(basename $f) — should be project-scoped"
  done <<< "$active"
fi
echo ""

# ----------------------------------------------------------------------------
# 3. workflow-patterns.json must not reference stale technologies
# ----------------------------------------------------------------------------
echo "[3] workflow-patterns.json stale tech check"

PATTERNS="$WORKSPACE/.claude/config/workflow-patterns.json"
if [ -f "$PATTERNS" ]; then
  STALE_TECH="svelte|sveltekit|Svelte|SvelteKit|dexie|Dexie|indexeddb|IndexedDB|prisma|Prisma"
  stale_hits=$(grep -Ei "$STALE_TECH" "$PATTERNS" 2>/dev/null || true)
  if [ -z "$stale_hits" ]; then
    pass "No stale tech references in workflow-patterns.json"
  else
    count=$(echo "$stale_hits" | wc -l | tr -d ' ')
    fail "$count stale tech references found in workflow-patterns.json:"
    echo "$stale_hits" | head -5 | sed 's/^/      /'
  fi
else
  warn "workflow-patterns.json not found"
fi
echo ""

# ----------------------------------------------------------------------------
# 4. route-table.json domains must not contain stale tech
# ----------------------------------------------------------------------------
echo "[4] route-table.json stale domain check"

ROUTES="$WORKSPACE/.claude/config/route-table.json"
if [ -f "$ROUTES" ]; then
  STALE_DOMAINS="sveltekit|svelte|dexie|indexeddb|leptos-ssr|trpc|prisma"
  # Check only the domains map keys
  stale_domains=$(python3 -c "
import json, sys
with open('$ROUTES') as f: data = json.load(f)
domains = list(data.get('domains', {}).keys())
stale = [d for d in domains if any(s in d for s in ['svelte','dexie','indexeddb','leptos','trpc','prisma'])]
print('\n'.join(stale))
" 2>/dev/null || true)
  if [ -z "$stale_domains" ]; then
    pass "No stale domains in route-table.json"
  else
    while IFS= read -r d; do
      fail "Stale domain in route-table.json: $d"
    done <<< "$stale_domains"
  fi
else
  warn "route-table.json not found"
fi
echo ""

# ----------------------------------------------------------------------------
# 5. All projects must have .gitignore
# ----------------------------------------------------------------------------
echo "[5] Project .gitignore coverage"

for project in dmb-almanac blaires-kind-heart imagen-experiments gemini-mcp-server emerson-violin-pwa; do
  gitignore="$WORKSPACE/projects/$project/.gitignore"
  if [ -f "$gitignore" ]; then
    pass "$project/.gitignore exists"
  else
    fail "$project/.gitignore MISSING"
  fi
done
echo ""

# ----------------------------------------------------------------------------
# 6. settings.local.json must not be tracked in git
# ----------------------------------------------------------------------------
echo "[6] settings.local.json not tracked in git"

tracked=$(git -C "$WORKSPACE" ls-files 2>/dev/null | grep "settings.local" || true)
if [ -z "$tracked" ]; then
  pass "No settings.local.json tracked in git"
else
  while IFS= read -r f; do
    fail "settings.local.json tracked in git: $f"
  done <<< "$tracked"
fi
echo ""

# ----------------------------------------------------------------------------
# 7. Violin PWA agents — only violin-relevant agents should exist
# ----------------------------------------------------------------------------
echo "[7] Violin PWA agent isolation"

VIOLIN_AGENTS="$WORKSPACE/projects/emerson-violin-pwa/.claude/agents"
if [ -d "$VIOLIN_AGENTS" ]; then
  non_violin=$(find "$VIOLIN_AGENTS" -name "*.md" \
    ! -name "web-audio-specialist.md" ! -name "README.md" 2>/dev/null || true)
  if [ -z "$non_violin" ]; then
    pass "Violin PWA agents: only violin-relevant agents present"
  else
    while IFS= read -r f; do
      fail "Non-violin agent in violin project: $(basename $f)"
    done <<< "$non_violin"
  fi
else
  warn "Violin PWA .claude/agents/ dir not found"
fi
echo ""

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------
echo "==================================="
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}CLEAN — no contamination detected${NC}"
  exit 0
else
  echo -e "${RED}CONTAMINATION DETECTED — review failures above${NC}"
  exit 1
fi
