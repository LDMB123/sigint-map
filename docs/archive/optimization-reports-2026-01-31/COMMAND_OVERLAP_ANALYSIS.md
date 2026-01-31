# User-Level Commands Overlap Analysis

**Date**: 2026-01-30
**Total User Commands**: 139
**Overlapping Commands**: 40 (28.8%)
**Status**: ⚠️ Significant duplication detected

---

## Executive Summary

You have **139 commands** at the user level (`~/.claude/commands/`) with **significant overlap** with your project-level skills and agents. This creates:

⚠️ **Potential Issues**:
1. Confusion about which to invoke (`/dmb-stats` command vs dmb-analysis skill)
2. Maintenance burden (updating in two places)
3. Inconsistent behavior between command and skill versions
4. Token waste if commands load similar context

✅ **Opportunities**:
1. Consolidate duplicates
2. Decide command vs skill placement strategy
3. Clean up orphaned/unused commands
4. Improve discoverability

---

## Overlap Categories

### Category 1: Direct DMB Duplicates 🔴 HIGH PRIORITY

**User-Level Commands** duplicating **Project Skills/Agents**:

| Command | Project Component | Recommendation |
|---------|-------------------|----------------|
| `dmb-stats` | `dmb-analysis` skill | **Remove command** - use skill |
| `scrape-dmb` | `scraping` skill | **Remove command** - use skill |
| `parallel-dmb-validation` | Part of dmb workflow | **Remove command** - use skill |
| `liberation-check` | DMB-specific | **Move to project** or remove |

**Action**: Remove 4 DMB-specific commands, use project skill instead

---

### Category 2: Database/Dexie Duplicates 🟡 MEDIUM PRIORITY

| Command | Project Component | Recommendation |
|---------|-------------------|----------------|
| `dexie-migrate` | `dmb-analysis` or project need | **Evaluate** - may be general utility |
| `dexie-setup` | Project-specific setup | **Keep as command** - cross-project |
| `indexeddb-audit` | PWA/storage related | **Keep as command** - general utility |
| `parallel-indexeddb-audit` | Related to above | **Keep as command** - general utility |
| `query-debug` | Database debugging | **Keep as command** - general utility |

**Action**: Keep as commands (useful cross-project)

---

### Category 3: Code Quality Duplicates 🟡 MEDIUM PRIORITY

| Command | Project Agent | Recommendation |
|---------|---------------|----------------|
| `review` | `code-reviewer` agent | **Remove command** - use agent |
| `pr-review` | `code-reviewer` agent | **Remove command** - use agent |
| `security-audit` | `security-scanner` agent | **Remove command** - use agent |
| `test-generate` | `test-generator` agent | **Remove command** - use agent |
| `refactor` | `refactoring-agent` | **Remove command** - use agent |

**Action**: Remove 5 code quality commands, delegate to agents instead

---

### Category 4: Debugging Duplicates 🟡 MEDIUM PRIORITY

| Command | Project Agent | Recommendation |
|---------|---------------|----------------|
| `debug` | `error-debugger` agent | **Remove command** - use agent |
| `error-debug` | `error-debugger` agent | **Remove command** - use agent |
| `js-debug` | General debugging | **Keep as command** - JS-specific |
| `memory-debug` | General debugging | **Keep as command** - memory-specific |
| `playwright-debug` | `scraping` skill | **Keep as command** - Playwright-specific |
| `sw-debug` | PWA debugging | **Keep as command** - SW-specific |
| `e2e-test-debug` | Testing | **Keep as command** - E2E-specific |
| `inp-debug` | Performance | **Keep as command** - INP-specific |
| `scraper-debug` | `scraping` skill | **Remove command** - use skill |

**Action**: Remove 3 general debug commands, keep 6 specialized ones

---

### Category 5: Performance/Audit Duplicates 🟡 MEDIUM PRIORITY

| Command | Project Component | Recommendation |
|---------|-------------------|----------------|
| `perf-audit` | `performance-profiler` agent | **Remove command** - use agent |
| `lighthouse` | Performance analysis | **Keep as command** - specific tool |
| `css-perf-audit` | Performance analysis | **Keep as command** - CSS-specific |
| `parallel-pwa` | PWA audit | **Keep as command** - comprehensive |
| `parallel-css-audit` | CSS audit | **Keep as command** - parallel pattern |

**Action**: Remove 1 general perf command, keep 4 specialized ones

---

### Category 6: Deployment/Migration Duplicates 🟡 MEDIUM PRIORITY

| Command | Project Component | Recommendation |
|---------|-------------------|----------------|
| `deployment-strategy` | `deployment` skill | **Remove command** - use skill |
| `cloud-deploy` | Deployment | **Keep as command** - cloud-specific |
| `k8s-deploy` | Kubernetes | **Keep as command** - K8s-specific |
| `migrate` | `migration-agent` | **Remove command** - use agent |
| `database-migration` | Migration | **Keep as command** - DB-specific |

**Action**: Remove 2 general deploy/migrate commands, keep 3 specialized ones

---

### Category 7: Parallel Workflow Commands ✅ KEEP

These are **valid cross-project utilities**:

| Command | Purpose | Status |
|---------|---------|--------|
| `parallel-accessibility-audit` | A11y audit | ✅ Keep |
| `parallel-ai-audit` | AI system audit | ✅ Keep |
| `parallel-api-validation` | API testing | ✅ Keep |
| `parallel-bundle-analysis` | Bundle optimization | ✅ Keep |
| `parallel-debug` | Parallel debugging | ✅ Keep |
| `parallel-dependency-audit` | Dependency checks | ✅ Keep |
| `parallel-frontend` | Frontend audit | ✅ Keep |
| `parallel-security` | Security scanning | ✅ Keep |
| `parallel-test` | Test execution | ✅ Keep |

**Action**: Keep all 9+ parallel-* commands (useful patterns)

---

### Category 8: Specialized Tools ✅ KEEP

These are **general-purpose commands with no project overlap**:

| Command | Purpose | Status |
|---------|---------|--------|
| `commit` | Smart git commits | ✅ Keep |
| `code-simplifier` | Code simplification | ✅ Keep |
| `css-modernize` | CSS modernization | ✅ Keep |
| `prisma-review` | Prisma ORM review | ✅ Keep (if using Prisma) |
| `trpc-generate` | tRPC generation | ✅ Keep (if using tRPC) |
| `zustand-setup` | Zustand state setup | ✅ Keep (if using Zustand) |
| `view-transitions` | View Transitions API | ✅ Keep |
| `speculation-rules` | Speculation Rules | ✅ Keep |

**Action**: Keep specialized framework/API commands

---

## Recommended Actions

### High Priority - Remove Duplicates (15 commands)

**DMB-Specific** (use project skills instead):
1. ❌ Remove `dmb-stats` → use `/dmb-analysis` skill
2. ❌ Remove `scrape-dmb` → use `/scraping` skill
3. ❌ Remove `parallel-dmb-validation` → use dmb workflow
4. ❌ Remove `liberation-check` → DMB-specific, move to project

**Code Quality** (delegate to agents instead):
5. ❌ Remove `review` → delegate to `code-reviewer` agent
6. ❌ Remove `pr-review` → delegate to `code-reviewer` agent
7. ❌ Remove `security-audit` → delegate to `security-scanner` agent
8. ❌ Remove `test-generate` → delegate to `test-generator` agent
9. ❌ Remove `refactor` → delegate to `refactoring-agent`

**Debugging** (use agents instead):
10. ❌ Remove `debug` → delegate to `error-debugger` agent
11. ❌ Remove `error-debug` → delegate to `error-debugger` agent
12. ❌ Remove `scraper-debug` → use `scraping` skill

**Performance/Deployment**:
13. ❌ Remove `perf-audit` → delegate to `performance-profiler` agent
14. ❌ Remove `deployment-strategy` → use `deployment` skill
15. ❌ Remove `migrate` → delegate to `migration-agent`

### Medium Priority - Evaluate (10 commands)

Consider whether these add value beyond project components:
- `dexie-migrate` - Keep if used cross-project
- `dexie-setup` - Keep if used cross-project
- `database-migration` - Keep if general utility
- `cloud-deploy` - Keep if deploying to cloud
- `k8s-deploy` - Keep if using Kubernetes
- Others - evaluate usage frequency

### Low Priority - Keep (114 commands)

Specialized, cross-project, or unique utilities with no overlap.

---

## Architecture Decision Tree

**When deciding command vs skill/agent**:

```
Is it project-specific (DMB Almanac)?
├─ YES → Put in project .claude/skills/ or .claude/agents/
└─ NO → Is it a general utility used across projects?
   ├─ YES → Keep in ~/.claude/commands/
   └─ NO → Is it a one-off tool you rarely use?
      ├─ YES → Delete it
      └─ NO → Keep in ~/.claude/commands/
```

---

## Cleanup Plan

### Phase 1: Remove Duplicates (15 commands)
```bash
# Backup first
cp -r ~/.claude/commands ~/.claude/commands_backup_2026-01-30

# Remove DMB duplicates
rm ~/.claude/commands/dmb-stats.md
rm ~/.claude/commands/scrape-dmb.md
rm ~/.claude/commands/parallel-dmb-validation.md
rm ~/.claude/commands/liberation-check.md

# Remove code quality duplicates
rm ~/.claude/commands/review.md
rm ~/.claude/commands/pr-review.md
rm ~/.claude/commands/security-audit.md
rm ~/.claude/commands/test-generate.md
rm ~/.claude/commands/refactor.md

# Remove debug duplicates
rm ~/.claude/commands/debug.md
rm ~/.claude/commands/error-debug.md
rm ~/.claude/commands/scraper-debug.md

# Remove performance/deployment duplicates
rm ~/.claude/commands/perf-audit.md
rm ~/.claude/commands/deployment-strategy.md
rm ~/.claude/commands/migrate.md
```

### Phase 2: Document Remaining Commands
Create `~/.claude/commands/README.md` documenting:
- What each command does
- When to use command vs skill vs agent
- Categorization by purpose

### Phase 3: Monitor Usage
Track which commands you actually use over next month, remove unused ones.

---

## Expected Impact

### Before Cleanup
- User commands: 139
- Overlapping: 40 (28.8%)
- Confusion: High (which to use?)
- Maintenance: 2x effort for duplicates

### After Cleanup (Recommended)
- User commands: ~124 (remove 15 duplicates)
- Overlapping: ~25 (20% - specialized only)
- Confusion: Low (clear boundaries)
- Maintenance: Focused on cross-project utilities

### Token Impact
- Commands only load when invoked
- No automatic context loading
- Cleanup saves mental overhead, not tokens

---

## Summary

**Current State**:
- ⚠️ 40 commands overlap with project skills/agents
- 🔴 4 DMB-specific commands duplicating project skills
- 🟡 11 general commands duplicating project agents
- ✅ ~100 unique cross-project utilities (keep)

**Recommended Actions**:
1. **Remove 15 duplicate commands** (high priority)
2. **Evaluate 10 borderline commands** (medium priority)
3. **Keep 114 specialized commands** (no overlap)
4. **Document command architecture** for future clarity

**Next Steps**:
1. Review this analysis
2. Approve cleanup plan
3. Backup commands directory
4. Execute removals
5. Create commands README

---

*Analysis completed: 2026-01-30*
*Total commands analyzed: 139*
*Cleanup opportunity: 15 duplicates identified*
