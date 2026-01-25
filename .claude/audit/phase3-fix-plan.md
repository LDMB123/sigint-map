# Phase 3: Fix Plan
**Generated**: 2026-01-25

This plan addresses 284 issues found across 470 agents.

---

## Prioritization Strategy

| Priority | Category | Count | Action Required |
|----------|----------|-------|-----------------|
| 🔴 **Critical** | Shadowed Agents | 2 | MUST FIX |
| 🟡 **High** | Dangling References | 14 | SHOULD FIX |
| 🟡 **Medium** | Model Issues | 12 | SHOULD FIX |
| 🟢 **Low** | Format Issues | 4 | NICE TO HAVE |
| 🔵 **Info** | Unreachable | 252 | DOCUMENT ONLY |

---

## Checkpoint 1: Resolve Shadowed Agents (Critical)

**Goal**: Eliminate name collisions so all agents are uniquely addressable.

### Issue 1.1: `qa-engineer` collision

**Collision**:
- User: `~/.claude/agents/testing/QA Engineer.md`
- Project: `dmb-almanac-svelte/.claude/agents/08-qa-engineer.md`

**Recommended Fix**:
Rename project agent to make its purpose clearer and avoid collision.

**Files to Change**:
1. `dmb-almanac-svelte/.claude/agents/08-qa-engineer.md`
   - Change **ID** from `qa-engineer` to `dmb-qa-engineer`
   - Update description to clarify it's DMB-specific

2. `dmb-almanac-svelte/.claude/AGENT_ROSTER.md`
   - Update agent index to reflect new name

**Verification**:
- Re-run parser: ensure only 1 collision remains
- Check collaboration references: none reference `qa-engineer`

---

### Issue 1.2: `performance-optimizer` collision

**Collision**:
- User: `~/.claude/agents/engineering/Performance Optimizer.md`
- Project: `dmb-almanac-svelte/.claude/agents/07-performance-optimizer.md`

**Impact**: Referenced 15 times in collaboration metadata!

**Recommended Fix**:
Rename project agent AND update all references.

**Files to Change**:
1. `dmb-almanac-svelte/.claude/agents/07-performance-optimizer.md`
   - Change **ID** from `performance-optimizer` to `dmb-performance-optimizer`
   - Clarify it's specific to DMB Almanac PWA

2. `dmb-almanac-svelte/.claude/AGENT_ROSTER.md`
   - Update agent index

3. **Find and update all collaboration references**:
   - Scan user agents for `delegates_to: performance-optimizer`
   - Scan user agents for `receives_from: performance-optimizer`
   - Update to `dmb-performance-optimizer` where referring to project agent

**Verification**:
- Re-run parser: 0 collisions
- Re-run orphan detector: `performance-optimizer` references drop to 0 dangling
- Check that user `performance-optimizer` is now reachable if referenced

---

## Checkpoint 2: Fix Dangling References (High Priority)

**Goal**: Remove or create agents for all dangling references.

### Strategy

**Remove** (recommended for most):
- `All orchestrators` — meta-reference, not a real agent
- `any-sonnet-orchestrator` — meta-reference
- `domain-specific-experts` — meta-reference
- `junior-developers` — meta-reference
- `system` — pseudo-agent

**Create stub agents** (if frequently referenced):
- `build-debugger` (consider if needed)
- `compliance-checker` (consider if needed)
- `dependency-analyzer` (consider if needed)
- `documentation-generator` (consider if needed)
- `haiku-swarm-coordinator` (consider if needed)
- `migration-transformer` (consider if needed)
- `risk-assessor` (consider if needed)
- `secret-detector` (consider if needed)
- `static-analyzer` (consider if needed)
- `test-validator` (consider if needed)

### Action Plan

**Step 2.1**: Scan collaboration metadata for dangling references

```bash
grep -r "build-debugger" ~/.claude/agents/
grep -r "compliance-checker" ~/.claude/agents/
# ... etc for each dangling reference
```

**Step 2.2**: For each dangling reference, decide:
- **Remove**: Edit agent file to remove from collaboration metadata
- **Create**: Create minimal stub agent with proper frontmatter

**Step 2.3**: For removals, update collaboration sections:
- Remove from `delegates_to` lists
- Remove from `receives_from` lists
- Keep descriptions but remove the reference

**Verification**:
- Re-run orphan detector: 0 dangling references

---

## Checkpoint 3: Normalize Model Names (Medium Priority)

**Goal**: Standardize all model names to lowercase kebab-case.

### Issue 3.1: Missing model (1 agent)

**Files**:
- Find agent with `model: unknown`
- Add appropriate model: `haiku`, `sonnet`, or `opus`

### Issue 3.2: Inconsistent naming (11 agents with `Gemini 3 Pro`)

**Pattern**:
All 11 are project agents in `dmb-almanac-svelte/.claude/agents/`

**Recommended Fix**:
Update all project agents to use `gemini-3-pro` instead of `Gemini 3 Pro`

**Files to Change**:
```
dmb-almanac-svelte/.claude/agents/00-lead-orchestrator.md
dmb-almanac-svelte/.claude/agents/01-sveltekit-engineer.md
dmb-almanac-svelte/.claude/agents/02-svelte-component-engineer.md
dmb-almanac-svelte/.claude/agents/03-vite-build-engineer.md
dmb-almanac-svelte/.claude/agents/04-caching-specialist.md
dmb-almanac-svelte/.claude/agents/05-pwa-engineer.md
dmb-almanac-svelte/.claude/agents/06-local-first-steward.md
dmb-almanac-svelte/.claude/agents/07-performance-optimizer.md
dmb-almanac-svelte/.claude/agents/08-qa-engineer.md
dmb-almanac-svelte/.claude/agents/09-eslint-typescript-steward.md
dmb-almanac-svelte/.claude/agents/10-parallel-coordinator.md
```

**Change**:
```markdown
# Before
**Model**: Gemini 3 Pro

# After
**Model**: gemini-3-pro
```

**Verification**:
- Re-run parser: all models use standard aliases

---

## Checkpoint 4: Fix Format Inconsistencies (Low Priority)

**Goal**: Ensure project agents use consistent plain markdown format.

### Issue 4.1: 4 project agents use YAML frontmatter

**Expected**: Plain markdown with bold key-value pairs
**Actual**: YAML frontmatter

**Decision Required**:
1. Convert YAML to plain markdown (match majority), OR
2. Convert plain markdown to YAML (adopt user agent standard)

**Recommended**: Convert all project agents to YAML frontmatter for consistency with user agents.

**Files to Change** (if converting to YAML):
All 15 project agents in `dmb-almanac-svelte/.claude/agents/`

**Template**:
```yaml
---
name: dmb-qa-engineer
description: [current role/purpose]
model: gemini-3-pro
tools: [appropriate tools]
permissionMode: acceptEdits
---

[rest of content]
```

**Verification**:
- Re-run parser: all agents use yaml format

---

## Checkpoint 5: Document Unreachable Agents (Informational)

**Goal**: Understand which agents are standalone vs. truly orphaned.

### Strategy

252 unreachable agents fall into categories:

1. **Leaf workers** (invoked directly by user or orchestrators)
   - Example: `bundle-size-analyzer`, `memory-leak-detective`
   - **Action**: Document as "user-invokable" or "orchestrator-invokable"

2. **Duplicates/Similar** (overlap with other agents)
   - Example: Multiple debugging agents
   - **Action**: Consider consolidation or retirement

3. **Unused/Deprecated** (created but never used)
   - **Action**: Move to archive or delete

**No changes in this checkpoint** — documentation only.

Create `unreachable-agents-analysis.md` categorizing all 252.

---

## Implementation Order

| Step | Checkpoint | Estimated Effort | Risk |
|------|------------|------------------|------|
| 1 | Resolve shadowed agents | 10 min | Low |
| 2 | Fix dangling references | 30 min | Medium |
| 3 | Normalize model names | 15 min | Low |
| 4 | Fix format issues | 30 min | Low |
| 5 | Document unreachable | 20 min | None |

**Total Estimated Time**: 1h 45m

---

## Rollback Plan

All changes will be tracked. If issues arise:

1. **Shadowed agents**: Revert renames, restore original names
2. **Dangling references**: Re-add removed references
3. **Model names**: Revert to original capitalization
4. **Format changes**: Restore original format
5. **Documentation**: Delete generated docs

**Git recommended** (if this were a git repo):
- Create branch before changes
- Commit after each checkpoint
- Can revert individual commits

Since this is NOT a git repo:
- Create backups before editing
- Track all changes in changelog

---

## Success Criteria

After completing all checkpoints:

- ✅ 0 name collisions
- ✅ 0 dangling references
- ✅ All models use standard aliases
- ✅ Consistent agent format across scopes
- ✅ 252 unreachable agents categorized and documented
- ✅ Validator script passes all checks

---

## Auto-Approval for Autonomous Mode

Since autonomous mode is enabled, proceeding directly to **PHASE 4: Implementation**.

The following changes will be made:
1. Rename 2 project agents to resolve collisions
2. Remove or create agents for 14 dangling references
3. Normalize 12 model names
4. Optionally fix 4 format issues
5. Generate unreachable agents documentation

All changes will be logged in implementation report.

**Starting PHASE 4 implementation...**
