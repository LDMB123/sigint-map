# Infrastructure Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all critical infrastructure issues: rotate hardcoded secrets, deduplicate 950 agents to 200, optimize performance, and install governance guards.

**Architecture:** Four-phase approach: (1) Security fixes with env vars, (2) Agent deduplication using hash comparison, (3) Performance optimization with route table rebuild, (4) Governance enforcement via pre-commit hooks.

**Tech Stack:** Bash, Python 3.14, JSON manipulation, Git, zsh, Claude MCP configuration

**Audit Reference:** /Users/louisherman/__claude_infra_audit__/2026-01-31_221534/

---

## Prerequisites

**User must provide:**
- New Gemini API key (from https://aistudio.google.com/app/apikey)
- New GitHub token (from https://github.com/settings/tokens)

**Verification:**
- Working directory: /Users/louisherman/ClaudeCodeProjects
- Audit completed: ✅
- Backups exist: /Users/louisherman/__claude_infra_audit__/2026-01-31_221534/backups/

---

## PHASE 1: SECURITY FIXES (BLOCKER)

### Task 1.1: Get New Credentials from User

**Files:**
- None (user interaction)

**Step 1: Request credentials**

Ask user:
```
Please provide the new API credentials:

1. New Gemini API key (starts with AIza):
2. New GitHub token (starts with ghp_):

Paste them here and I'll automate the rest.
```

**Step 2: Validate format**

Check:
- Gemini key starts with "AIza"
- GitHub token starts with "ghp_"
- Both are non-empty strings

**Step 3: Store in memory**

Save to variables:
```python
GEMINI_KEY = "<user_provided>"
GITHUB_TOKEN = "<user_provided>"
```

---

### Task 1.2: Create Secrets Environment File

**Files:**
- Create: `~/.claude-secrets.env`

**Step 1: Write secrets file**

```bash
cat > ~/.claude-secrets.env << 'EOF'
# Claude MCP Secrets
# DO NOT COMMIT THIS FILE
# Created: 2026-01-31

export GEMINI_API_KEY="<GEMINI_KEY_HERE>"
export GITHUB_TOKEN="<GITHUB_TOKEN_HERE>"
EOF
```

**Step 2: Set secure permissions**

Run: `chmod 600 ~/.claude-secrets.env`
Expected: No output

**Step 3: Verify file created**

Run: `ls -l ~/.claude-secrets.env`
Expected: `-rw------- 1 louisherman staff ...`

**Step 4: Commit creation**

```bash
# Document that secrets file exists (but don't commit the file itself)
echo "~/.claude-secrets.env created - DO NOT COMMIT" >> /Users/louisherman/__claude_infra_audit__/2026-01-31_221534/CHANGES.log
```

---

### Task 1.3: Update Shell Profile

**Files:**
- Modify: `~/.zshrc` (append)

**Step 1: Check if already sourced**

Run: `grep -q 'claude-secrets.env' ~/.zshrc && echo "EXISTS" || echo "NOT_FOUND"`
Expected: "NOT_FOUND" (or EXISTS if already done)

**Step 2: Add sourcing to .zshrc**

```bash
cat >> ~/.zshrc << 'EOF'

# Source Claude secrets (added 2026-01-31)
if [ -f ~/.claude-secrets.env ]; then
    source ~/.claude-secrets.env
fi
EOF
```

**Step 3: Source now**

Run: `source ~/.claude-secrets.env`
Expected: No output

**Step 4: Verify env vars loaded**

Run: `echo "Gemini: ${GEMINI_API_KEY:0:10}..." && echo "GitHub: ${GITHUB_TOKEN:0:10}..."`
Expected: First 10 chars of each credential displayed

---

### Task 1.4: Update MCP Configuration

**Files:**
- Backup: `~/.claude.json` → `~/.claude.json.backup-pre-env-vars-<timestamp>`
- Modify: `~/.claude.json`

**Step 1: Create backup**

```bash
cp ~/.claude.json ~/.claude.json.backup-pre-env-vars-$(date +%Y%m%d-%H%M%S)
```

Run: `ls ~/.claude.json.backup-pre-env-vars-*`
Expected: Backup file listed

**Step 2: Update gemini MCP server**

```python
import json
import os

config_path = os.path.expanduser('~/.claude.json')

with open(config_path) as f:
    config = json.load(f)

# Update gemini server env
config['mcpServers']['gemini']['env']['GEMINI_API_KEY'] = '${GEMINI_API_KEY}'

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)
```

**Step 3: Update github MCP server**

```python
import json
import os

config_path = os.path.expanduser('~/.claude.json')

with open(config_path) as f:
    config = json.load(f)

# Update github server env
config['mcpServers']['github']['env']['GITHUB_PERSONAL_ACCESS_TOKEN'] = '${GITHUB_TOKEN}'

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)
```

**Step 4: Verify changes**

Run: `grep '${GEMINI_API_KEY}' ~/.claude.json && grep '${GITHUB_TOKEN}' ~/.claude.json`
Expected: Both env var references found

**Step 5: Test MCP servers (manual)**

User action:
```
Start new Claude Code session
Verify MCP servers initialize without errors
Test: Use Gemini MCP tool
Test: Use GitHub MCP tool
```

---

### Task 1.5: Revoke Old Credentials

**Files:**
- None (user web actions)

**Step 1: Revoke Gemini key**

User action:
```
1. Visit https://aistudio.google.com/app/apikey
2. Find old key ending with "...n0"
3. Click Delete
4. Confirm deletion
```

**Step 2: Revoke GitHub token**

User action:
```
1. Visit https://github.com/settings/tokens
2. Find old token ending with "...sXt"
3. Click Delete
4. Confirm deletion
```

**Step 3: Verify old credentials don't work**

Test (should FAIL):
- Try using old Gemini key with curl (should get 401/403)
- Try using old GitHub token (should get 401)

**Step 4: Document completion**

```bash
echo "Phase 1 complete: Secrets rotated and moved to env vars" >> /Users/louisherman/__claude_infra_audit__/2026-01-31_221534/CHANGES.log
```

---

## PHASE 2: AGENT DEDUPLICATION

### Task 2.1: Backup Agent Directory

**Files:**
- Create: `~/.claude/agents_backup_2026-01-31.tar.gz`

**Step 1: Create compressed backup**

```bash
cd ~/.claude
tar -czf agents_backup_2026-01-31-$(date +%H%M%S).tar.gz agents/
```

**Step 2: Verify backup**

Run: `ls -lh ~/.claude/agents_backup_2026-01-31-*.tar.gz`
Expected: Backup file ~10-50MB

**Step 3: Test backup integrity**

Run: `tar -tzf ~/.claude/agents_backup_2026-01-31-*.tar.gz | head -5`
Expected: List of agent files

---

### Task 2.2: Remove Old Backup Directories

**Files:**
- Delete: `~/.claude/agents_backup_phase3_20260130_233206/`
- Delete: `~/.claude/agents_backup_phase3_20260130_233147/`

**Step 1: Count agents before**

Run: `find ~/.claude/agents -name "*.md" | wc -l`
Expected: ~950

**Step 2: Remove old backup dirs**

```bash
rm -rf ~/.claude/agents_backup_phase3_20260130_233206
rm -rf ~/.claude/agents_backup_phase3_20260130_233147
```

**Step 3: Count agents after**

Run: `find ~/.claude/agents -name "*.md" | wc -l`
Expected: Should decrease by 500-600 (backup dirs removed)

**Step 4: Verify dirs gone**

Run: `ls -d ~/.claude/agents_backup_phase3_* 2>&1`
Expected: "No such file or directory"

---

### Task 2.3: Hash All Agents

**Files:**
- Create: `/tmp/agent-dedup-$(date +%Y%m%d)/agent-hashes.txt`

**Step 1: Create dedup workspace**

```bash
mkdir -p /tmp/agent-dedup-$(date +%Y%m%d)
cd /tmp/agent-dedup-$(date +%Y%m%d)
```

**Step 2: Hash all agent files**

```bash
find ~/.claude/agents -name "*.md" -type f -exec sha256sum {} \; > agent-hashes.txt
```

**Step 3: Sort and find duplicates**

```bash
sort agent-hashes.txt | uniq -d -w 64 > duplicate-hashes.txt
```

**Step 4: Count duplicates**

Run: `wc -l duplicate-hashes.txt`
Expected: ~100-300 duplicate hashes

---

### Task 2.4: Identify and Archive Duplicates

**Files:**
- Create: `~/.claude/agents_duplicates_removed_2026-01-31/`
- Modify: Various agent files (move to archive)

**Step 1: Create archive directory**

```bash
mkdir -p ~/.claude/agents_duplicates_removed_2026-01-31
```

**Step 2: Create deduplication script**

```python
#!/usr/bin/env python3
import os
import shutil
from collections import defaultdict

# Read hashes
hash_to_files = defaultdict(list)
with open('agent-hashes.txt') as f:
    for line in f:
        hash_val, filepath = line.strip().split(maxsplit=1)
        hash_to_files[hash_val].append(filepath)

# Find duplicates (hash with multiple files)
duplicates_moved = 0
for hash_val, files in hash_to_files.items():
    if len(files) > 1:
        # Keep first, move rest
        for dup_file in files[1:]:
            dest_dir = os.path.expanduser('~/.claude/agents_duplicates_removed_2026-01-31')
            basename = os.path.basename(dup_file)
            dest = os.path.join(dest_dir, f"{duplicates_moved}_{basename}")
            shutil.move(dup_file, dest)
            duplicates_moved += 1
            print(f"Moved: {dup_file}")

print(f"\nTotal duplicates moved: {duplicates_moved}")
```

**Step 3: Run deduplication**

Run: `python3 deduplicate.py`
Expected: "Total duplicates moved: <number>"

**Step 4: Verify agent count reduced**

Run: `find ~/.claude/agents -name "*.md" | wc -l`
Expected: 150-250 (reduced from 350-450)

---

### Task 2.5: Verify No Broken References

**Files:**
- None (verification only)

**Step 1: List remaining agents**

Run: `find ~/.claude/agents -name "*.md" | sort > remaining-agents.txt`

**Step 2: Check skills still reference valid agents**

```bash
# Find all skill references to agents
grep -r "agent:" ~/.claude/skills/ | grep -v ".git" > skill-agent-refs.txt
```

**Step 3: Manual verification**

Review: Do removed agents break any skill references?
Expected: No (duplicates shouldn't be referenced)

---

## PHASE 3: PERFORMANCE OPTIMIZATION

### Task 3.1: Rebuild Route Table

**Files:**
- Modify: `~/.claude/config/semantic-route-table.json` (if exists)

**Step 1: Check if route table exists**

Run: `ls ~/.claude/config/semantic-route-table.json 2>&1`

**Step 2: Count agents for route table**

Run: `find ~/.claude/agents -name "*.md" | wc -l`
Expected: 150-250 (post-dedup)

**Step 3: Trigger route table rebuild**

If route table tool exists:
```bash
# Method depends on route table implementation
# May be automatic on next session start
# Or may require explicit regeneration command
```

If no route table tool:
```
Route table will rebuild automatically on next session start
```

**Step 4: Verify route table updated**

After next session start:
```bash
# Check route table size matches agent count
# Verify semantic matching still works
```

---

### Task 3.2: Test Agent Routing Speed

**Files:**
- None (testing only)

**Step 1: Test skill invocation**

Start new session:
```
/autonomous
/brainstorming
```
Expected: Skills load quickly

**Step 2: Test agent routing**

```
Ask Claude to use various agents
Observe: Should be noticeably faster than before
```

**Step 3: Document performance**

```bash
echo "Phase 3 complete: Route table rebuilt, $(find ~/.claude/agents -name "*.md" | wc -l) agents" >> /Users/louisherman/__claude_infra_audit__/2026-01-31_221534/CHANGES.log
```

---

## PHASE 4: GOVERNANCE ENFORCEMENT

### Task 4.1: Create Agent Count Guard Hook

**Files:**
- Create: `~/.claude/hooks/validate-agent-count.sh`

**Step 1: Write guard hook**

```bash
cat > ~/.claude/hooks/validate-agent-count.sh << 'EOF'
#!/bin/bash
# Agent Count Guard - Prevents agent bloat
# Created: 2026-01-31

AGENT_COUNT=$(find ~/.claude/agents -name "*.md" 2>/dev/null | wc -l)
MAX_AGENTS=250

if [ "$AGENT_COUNT" -gt "$MAX_AGENTS" ]; then
    echo "❌ Agent count ($AGENT_COUNT) exceeds limit ($MAX_AGENTS)"
    echo "   Run agent deduplication before proceeding"
    echo "   Backup: tar -czf agents_backup_$(date +%Y%m%d).tar.gz ~/.claude/agents"
    exit 1
fi

echo "✅ Agent count ($AGENT_COUNT) within limit ($MAX_AGENTS)"
exit 0
EOF
```

**Step 2: Make executable**

Run: `chmod +x ~/.claude/hooks/validate-agent-count.sh`

**Step 3: Test hook**

Run: `~/.claude/hooks/validate-agent-count.sh`
Expected: "✅ Agent count (###) within limit (250)"

---

### Task 4.2: Create Performance Dashboard Script

**Files:**
- Create: `~/.claude/scripts/performance-dashboard.sh`

**Step 1: Create scripts directory**

```bash
mkdir -p ~/.claude/scripts
```

**Step 2: Write dashboard script**

```bash
cat > ~/.claude/scripts/performance-dashboard.sh << 'EOF'
#!/bin/bash
# Claude Infrastructure Performance Dashboard
# Created: 2026-01-31

echo "═══════════════════════════════════════"
echo "  Claude Infrastructure Dashboard"
echo "═══════════════════════════════════════"
echo ""

# Agents
AGENT_COUNT=$(find ~/.claude/agents -name "*.md" 2>/dev/null | wc -l)
echo "Agents:     $AGENT_COUNT"

# Skills
SKILL_COUNT=$(find ~/.claude/skills -name "SKILL.md" 2>/dev/null | wc -l)
echo "Skills:     $SKILL_COUNT"

# Hooks
HOOK_COUNT=$(find ~/.claude/hooks -name "*.sh" 2>/dev/null | wc -l)
echo "Hooks:      $HOOK_COUNT"

# Duplicates (rough estimate)
TOTAL_FILES=$(find ~/.claude -type f 2>/dev/null | wc -l)
UNIQUE_HASHES=$(find ~/.claude -type f -exec sha256sum {} \; 2>/dev/null | sort | uniq -w 64 | wc -l)
DUPLICATES=$((TOTAL_FILES - UNIQUE_HASHES))
echo "Duplicates: ~$DUPLICATES files"

# Secrets safety
if grep -q "AIza" ~/.claude.json 2>/dev/null; then
    echo "Security:   🔴 HARDCODED SECRETS FOUND"
elif [ -f ~/.claude-secrets.env ]; then
    echo "Security:   ✅ Using env vars"
else
    echo "Security:   ⚠️  No secrets detected"
fi

echo ""
echo "Last updated: $(date)"
echo "═══════════════════════════════════════"
EOF
```

**Step 3: Make executable**

Run: `chmod +x ~/.claude/scripts/performance-dashboard.sh`

**Step 4: Run dashboard**

Run: `~/.claude/scripts/performance-dashboard.sh`
Expected: Dashboard output with current metrics

---

### Task 4.3: Document All Changes

**Files:**
- Create: `/Users/louisherman/__claude_infra_audit__/2026-01-31_221534/IMPLEMENTATION_COMPLETE.md`

**Step 1: Create completion doc**

```markdown
# Implementation Complete

**Date**: 2026-01-31
**Executor**: Claude Sonnet 4.5
**Plan**: docs/plans/2026-01-31-infrastructure-fixes.md

## Changes Applied

### Phase 1: Security ✅
- Rotated Gemini API key
- Rotated GitHub token
- Created ~/.claude-secrets.env
- Updated ~/.zshrc to source secrets
- Updated ~/.claude.json to use env var references
- Revoked old credentials

### Phase 2: Agent Deduplication ✅
- Backed up agents directory
- Removed old backup dirs (agents_backup_phase3_*)
- Deduplicated agents: 950 → <FINAL_COUNT>
- Archived duplicates to agents_duplicates_removed_2026-01-31/

### Phase 3: Performance ✅
- Rebuilt route table (or confirmed auto-rebuild)
- Verified agent routing speed improved

### Phase 4: Governance ✅
- Created agent count guard hook
- Created performance dashboard script
- All guards tested and working

## Verification

Run verification checklist:
```bash
# Security
echo $GEMINI_API_KEY | head -c 10  # Should show new key
grep '${GEMINI_API_KEY}' ~/.claude.json  # Should find reference

# Performance
find ~/.claude/agents -name "*.md" | wc -l  # Should be 150-250

# Governance
~/.claude/hooks/validate-agent-count.sh  # Should pass
~/.claude/scripts/performance-dashboard.sh  # Should show metrics
```

## Rollback Procedures

If needed:
- Secrets: `cp ~/.claude.json.backup-pre-env-vars-* ~/.claude.json`
- Agents: `tar -xzf ~/.claude/agents_backup_2026-01-31-*.tar.gz`

## Next Steps

- Monitor agent count weekly
- Run dashboard monthly
- Keep backups for 90 days
```

**Step 2: Commit all changes**

```bash
cd /Users/louisherman/__claude_infra_audit__/2026-01-31_221534
git add -A
git commit -m "docs: infrastructure fixes implementation complete

- Phase 1: Security (secrets rotated, env vars)
- Phase 2: Agent dedup (950 → <count>)
- Phase 3: Performance (route table rebuilt)
- Phase 4: Governance (guards installed)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Post-Implementation Verification

### Verify Security

Run:
```bash
# Check secrets not hardcoded
! grep -q "AIzaSy" ~/.claude.json && echo "✅ No hardcoded Gemini key"
! grep -q "ghp_VL" ~/.claude.json && echo "✅ No hardcoded GitHub token"

# Check env vars loaded
[ -n "$GEMINI_API_KEY" ] && echo "✅ GEMINI_API_KEY loaded"
[ -n "$GITHUB_TOKEN" ] && echo "✅ GITHUB_TOKEN loaded"
```

### Verify Performance

Run:
```bash
# Check agent count
AGENT_COUNT=$(find ~/.claude/agents -name "*.md" | wc -l)
[ "$AGENT_COUNT" -lt 300 ] && echo "✅ Agent count optimized: $AGENT_COUNT"

# Check duplicates removed
! ls ~/.claude/agents_backup_phase3_* 2>/dev/null && echo "✅ Old backups removed"
```

### Verify Governance

Run:
```bash
# Test guard hook
~/.claude/hooks/validate-agent-count.sh && echo "✅ Agent guard working"

# Test dashboard
~/.claude/scripts/performance-dashboard.sh
```

---

**Plan saved to:** `docs/plans/2026-01-31-infrastructure-fixes.md`

**Execution options:**

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks
2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution

**Which approach do you prefer?**
