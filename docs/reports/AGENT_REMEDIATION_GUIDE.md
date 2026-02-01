# Agent Definition Remediation Guide

**Date:** 2026-01-30
**Validation Results:** 2.9% compliance (13/447 agents)
**Critical Issues:** 240 agents non-functional

---

## Quick Start

### 1. Review the Analysis
```bash
# Read the full validation report
cat /Users/louisherman/ClaudeCodeProjects/docs/reports/AGENT_VALIDATION_REPORT.md

# See detailed issue list
cat /Users/louisherman/ClaudeCodeProjects/docs/reports/AGENT_ISSUES_DETAILED.csv
```

### 2. Run Validation Yourself
```bash
# Re-run validation to see current state
python3 /tmp/validate_agents.py
```

### 3. Test the Fix (Dry Run)
```bash
# See what would be changed (no files modified)
python3 /tmp/fix_tools_field.py --dry-run
```

---

## Critical Fix: Tools Field (240 agents)

### The Problem

240 agents have this format (WRONG):
```yaml
tools: Read, Write, Edit, Bash, Grep, Glob
```

Should be this format (CORRECT):
```yaml
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
```

### Automated Fix

**Option 1: Fix All Agents at Once**
```bash
# Backup first (recommended)
cd ~/.claude/agents
git status  # Make sure you're in a clean state
git checkout -b fix/agent-tools-field

# Apply fixes
python3 /tmp/fix_tools_field.py

# Verify changes
git diff
git status

# If looks good, commit
git add .
git commit -m "fix: convert tools field from string to YAML list format

Fixes 240 agents with malformed tools field. Tools were specified
as comma-separated strings instead of YAML lists, preventing proper
parsing by the agent system.

Generated with automated fix script."
```

**Option 2: Fix One Agent at a Time**
```bash
# Fix a single agent
python3 /tmp/fix_tools_field.py --file ~/.claude/agents/dmb-expert.md

# Review the change
git diff ~/.claude/agents/dmb-expert.md
```

**Option 3: Manual Fix**

For each agent file:
1. Open in editor
2. Find the `tools:` line
3. Replace with YAML list format
4. Save

---

## Fix Missing Frontmatter (1 agent)

**File:** `~/.claude/agents/token-optimizer.md`

**Action:** Add YAML frontmatter block at the top:

```yaml
---
name: token-optimizer
description: >
  Use when token usage optimization or cost reduction is needed.
  Delegate proactively when approaching budget limits or for large operations.
  Specialist in context compression, caching strategies, and tool selection for
  token efficiency.
model: haiku
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
permissionMode: default
---
```

---

## Naming Convention Fixes (323 agents)

### The Problem

323 files have spaces in their names:
- `DMB Expert.md` → should be `dmb-expert.md`
- `Full-Stack Developer.md` → should be `full-stack-developer.md`
- `LLM Cost Optimizer.md` → should be `llm-cost-optimizer.md`

### Manual Approach (Recommended for Git History)

```bash
cd ~/.claude/agents

# Example renames (do these carefully)
git mv "DMB Expert.md" "dmb-expert.md"
git mv "DMB Brand DNA Expert.md" "dmb-brand-dna-expert.md"
git mv "engineering/Full-Stack Developer.md" "engineering/full-stack-developer.md"

# Continue for all 323 files...
```

### Automated Approach (Use with Caution)

```bash
cd ~/.claude/agents

# Create rename script
cat > /tmp/rename_agents.sh << 'SCRIPT'
#!/bin/bash
find . -name "* *.md" -type f | while read file; do
  dir=$(dirname "$file")
  base=$(basename "$file")
  newbase=$(echo "$base" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  if [ "$base" != "$newbase" ]; then
    echo "git mv \"$file\" \"$dir/$newbase\""
  fi
done
SCRIPT

# Review what would be renamed
bash /tmp/rename_agents.sh

# If it looks good, execute with eval
bash /tmp/rename_agents.sh | bash
```

---

## Add Routing Patterns (194 agents)

### The Problem

Descriptions missing "Use when..." routing patterns.

### Template

```yaml
description: >
  Use when the user requests [SPECIFIC CAPABILITY].
  Delegate proactively [WHEN TO DELEGATE].
  [BRIEF DESCRIPTION OF WHAT THIS AGENT DOES].
```

### Examples

**Before:**
```yaml
description: Full stack development specialist
```

**After:**
```yaml
description: >
  Use when the user needs full-stack application development or architecture.
  Delegate proactively for specialized frontend, backend, or infrastructure tasks.
  Expert in modern web frameworks, APIs, databases, and deployment.
```

**Before:**
```yaml
description: Lightweight specialist in LLM token usage optimization
```

**After:**
```yaml
description: >
  Use when token usage optimization or cost reduction is needed.
  Delegate proactively when approaching budget limits or for large operations.
  Specialist in context compression, caching strategies, and token efficiency.
```

### Manual Process

For each of the 194 agents:
1. Read current description
2. Identify core capability
3. Identify when to delegate
4. Rewrite using template
5. Update file

This requires manual review and cannot be fully automated.

---

## Verification

### After Each Fix

```bash
# Run validation
python3 /tmp/validate_agents.py

# Check specific agent
python3 /tmp/validate_agents.py | grep -A5 "your-agent-name"
```

### Target Metrics

- **Immediate (after tools fix):** 95%+ compliance
- **Short-term (after naming fix):** 98%+ compliance
- **Long-term (after routing patterns):** 100% compliance

---

## Pre-Commit Hook (Prevention)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Validate agents before commit
if git diff --cached --name-only | grep -q '.claude/agents/.*\.md$'; then
  echo "Validating agent definitions..."
  python3 /tmp/validate_agents.py --quiet --check-staged
  if [ $? -ne 0 ]; then
    echo "Agent validation failed. Fix issues before committing."
    exit 1
  fi
fi

exit 0
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## Rollback Plan

If automated fixes cause issues:

```bash
# If you made a branch
git checkout main
git branch -D fix/agent-tools-field

# If you committed to main
git revert HEAD

# Nuclear option (lose all changes)
git reset --hard origin/main
```

---

## Files Generated

1. `/Users/louisherman/ClaudeCodeProjects/docs/reports/AGENT_VALIDATION_REPORT.md`
   - Full analysis report with all findings

2. `/Users/louisherman/ClaudeCodeProjects/docs/reports/AGENT_ISSUES_DETAILED.csv`
   - Detailed list of all issues by type

3. `/Users/louisherman/ClaudeCodeProjects/docs/reports/AGENT_REMEDIATION_GUIDE.md`
   - This file (step-by-step remediation)

4. `/tmp/validate_agents.py`
   - Validation script (can be re-run anytime)

5. `/tmp/fix_tools_field.py`
   - Automated fix script for tools field issue

---

## Support

If you encounter issues:

1. Check the validation report for specific error messages
2. Test fixes on a single file first
3. Use `--dry-run` flags when available
4. Keep git history clean with small, focused commits
5. Run validation after each batch of fixes

---

## Next Steps

**Recommended Order:**

1. [ ] Fix tools field issue (240 agents) - CRITICAL
2. [ ] Fix missing frontmatter (1 agent) - HIGH
3. [ ] Run validation to verify fixes - HIGH
4. [ ] Rename files to kebab-case (323 agents) - MEDIUM
5. [ ] Add routing patterns (194 agents) - LOW
6. [ ] Set up pre-commit hook - LOW
7. [ ] Document agent creation standards - LOW

**Estimated Time:**
- Tools field fix: 15 minutes (automated)
- Missing frontmatter: 5 minutes (manual)
- Naming convention: 2-4 hours (semi-automated, needs review)
- Routing patterns: 8-16 hours (fully manual)
- Total: 1-2 days for complete remediation

---

**Generated:** 2026-01-30
**Validation Script:** /tmp/validate_agents.py
**Fix Script:** /tmp/fix_tools_field.py
