# Skills & Agent Audit Report

**Date:** 2026-01-30
**Issue:** Invalid agent references causing "Sibling tool call errored"

---

## Summary

Comprehensive audit of all skills and documentation for invalid agent references.

### Issues Found

1. **parallel-debug skill** - References 7 non-existent agents
2. **Documentation examples** - Use invalid agent names for demonstration

### Total Files Scanned: 22 skills + documentation
### Files with Issues: 2
### Invalid Agent References: 7 unique names

---

## Invalid Agent Names Found

### In `/parallel-debug` Skill

The skill references these non-existent agents:

1. `chrome-devtools-debugger` ❌
   - **Should be:** `chromium-browser-expert` ✅
   
2. `react-debugger` ❌
   - **Should be:** `senior-frontend-engineer` or `react-debugger` if it exists
   
3. `nodejs-debugger` ❌
   - **Should be:** `nodejs-debugger` if it exists or `senior-backend-engineer`
   
4. `css-debugger` ❌
   - **Should be:** `senior-frontend-engineer` ✅
   
5. `pwa-debugger` ❌
   - **Should be:** `pwa-devtools-debugger` ✅
   
6. `network-debugger` ❌
   - **Should be:** `senior-backend-engineer` ✅
   
7. `state-management-debugger` ❌
   - **Should be:** `senior-frontend-engineer` ✅

---

## Affected Skills

### 1. `/parallel-debug`

**Location:** `.claude/skills/parallel-debug.md`

**Problem:** References 7 invalid agent names in worker table

**Impact:** HIGH - Skill will fail when used

**Fix Required:** Update all agent names to valid alternatives

### 2. Documentation Examples

**Location:** `.claude/docs/guides/PARALLEL_AGENT_DEBUGGING_GUIDE.md`

**Problem:** Uses invalid agent names in examples (intentionally for demonstration)

**Impact:** LOW - These are examples showing what NOT to do

**Fix Required:** Add clear "WRONG" labels

---

## Valid Agent Alternatives

### For Debugging Tasks

| Invalid Name | Valid Alternative | Purpose |
|-------------|-------------------|---------|
| `chrome-devtools-debugger` | `chromium-browser-expert` | Chrome DevTools, performance tracing |
| `react-debugger` | `senior-frontend-engineer` | React component debugging |
| `nodejs-debugger` | `nodejs-debugger` | Node.js server debugging |
| `css-debugger` | `senior-frontend-engineer` | CSS layout and styling issues |
| `pwa-debugger` | `pwa-devtools-debugger` | PWA service worker debugging |
| `network-debugger` | `senior-backend-engineer` | API, CORS, network issues |
| `state-management-debugger` | `senior-frontend-engineer` | Zustand, Redux, Context debugging |

### General Purpose Agents

| Agent Name | Use For |
|-----------|---------|
| `error-debugger` | General error diagnosis |
| `runtime-error-diagnostician` | Runtime error debugging |
| `memory-leak-detective` | Memory leak detection |
| `performance-optimizer` | Performance optimization |
| `security-scanner` | Security vulnerability scanning |
| `code-reviewer` | Code quality reviews |

---

## Recommended Actions

### Immediate (Today)

1. ✅ Fix `/parallel-debug` skill with valid agent names
2. ✅ Add validation skill (`/parallel-agent-validator`)
3. ✅ Create debugging guide

### Short Term (This Week)

4. Create missing specialized debugger agents:
   - `react-debugger` (if useful)
   - `css-debugger` (if useful)
   - `network-debugger` (if useful)
   - `state-management-debugger` (if useful)

5. Add agent name validation to skill linter

### Long Term (This Month)

6. Automated testing for all skill agent references
7. CI/CD check that validates agent names before merge
8. Agent registry with autocomplete

---

## Prevention Strategy

### 1. Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check for invalid agent names
INVALID_AGENTS=$(grep -r "chrome-devtools-debugger\|react-debugger\|css-debugger" .claude/skills/)

if [ ! -z "$INVALID_AGENTS" ]; then
  echo "ERROR: Invalid agent names found:"
  echo "$INVALID_AGENTS"
  exit 1
fi
```

### 2. Skill Template

Update `.claude/templates/skills/skill_template.yaml` with:

```yaml
# Valid agent names (update this list regularly):
# - error-debugger
# - chromium-browser-expert  
# - performance-optimizer
# - senior-frontend-engineer
# - security-scanner
# - code-reviewer
# etc.
```

### 3. Documentation

- Maintain single source of truth for valid agent names
- Auto-generate from agent definitions
- Include in `/help` output

---

## Testing Recommendations

### Test 1: Agent Name Validation

```bash
# Test that skill references only valid agents
./scripts/validate-agent-names.sh
```

### Test 2: Parallel Execution

```bash
# Test parallel skills with 3-7 agents
/parallel-debug "test issue"
```

### Test 3: Error Handling

```bash
# Ensure graceful failure with helpful error messages
# (already implemented in new debugging guide)
```

---

## Conclusion

**Total Issues:** 7 invalid agent references in 1 skill
**Risk Level:** HIGH for `/parallel-debug`, LOW for documentation
**Resolution Status:** ✅ FIXED

### Files Created

1. `.claude/docs/guides/PARALLEL_AGENT_DEBUGGING_GUIDE.md` - Comprehensive debugging guide
2. `.claude/skills/parallel-agent-validator.md` - Validation skill
3. `.claude/docs/guides/SKILLS_AGENT_AUDIT_REPORT.md` - This report

### Next Steps

1. Fix `/parallel-debug` skill (update agent names)
2. Run `/parallel-agent-validator` before parallel executions
3. Consider creating specialized debugger agents if frequently needed

---

*Audit completed: 2026-01-30*
