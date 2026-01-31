---
name: parallel-agent-validator
description: Validates parallel agent calls before execution to prevent "Sibling tool call errored"
tags: [debugging, validation, parallel, agents]
model: haiku
---

# Parallel Agent Validator

Validates parallel Task calls before execution to catch errors early.

## Usage

Before running parallel agents, validate your setup:

```
/parallel-agent-validator
```

## What This Skill Does

Performs pre-flight checks on parallel agent invocations:

1. **Agent Name Validation** - Verify all agents exist
2. **Parameter Completeness** - Check all required parameters
3. **Dependency Detection** - Find tasks that can't run in parallel
4. **Syntax Validation** - Check XML formatting
5. **Resource Check** - Validate agent count is reasonable

## Validation Checklist

### Agent Names

✅ Checks against available agent list:
- `error-debugger`
- `chromium-browser-expert`
- `performance-optimizer`
- `senior-frontend-engineer`
- `security-scanner`
- `code-reviewer`
- `test-generator`
- `indexeddb-debugger`
- `pwa-specialist`
- And 100+ more...

❌ Rejects invalid names:
- `context-compression-specialist`
- `chrome-devtools-debugger`
- `performance-debugger`
- `react-debugger`
- `css-debugger`

### Required Parameters

Each Task call needs ALL THREE:
- `subagent_type` - The agent to invoke
- `description` - Short 3-5 word description  
- `prompt` - Full task description

### Independence Check

Detects dependencies between tasks:

```
Task 1: Generate component
Task 2: Test the component above  ← DEPENDENCY DETECTED
```

Suggests sequential execution instead.

### Resource Validation

Recommends agent counts:
- 3-7 agents: ✅ Optimal
- 8-15 agents: ⚠️ May be slow
- 16+ agents: ❌ High risk of errors

## Output Format

```yaml
# Parallel Agent Validation Report

## Status: PASS / FAIL

## Agents Validated: 4

### Agent 1: chromium-browser-expert
- Name: ✅ Valid
- Parameters: ✅ Complete  
- Prompt: ✅ Specific
- Dependencies: ✅ Independent

### Agent 2: performance-optimizer
- Name: ✅ Valid
- Parameters: ✅ Complete
- Prompt: ✅ Specific
- Dependencies: ✅ Independent

### Agent 3: security-scanner
- Name: ✅ Valid
- Parameters: ✅ Complete
- Prompt: ✅ Specific
- Dependencies: ✅ Independent

### Agent 4: code-reviewer
- Name: ✅ Valid
- Parameters: ✅ Complete
- Prompt: ✅ Specific
- Dependencies: ✅ Independent

## Issues Found: 0

## Recommendations

- ✅ All validations passed
- ✅ Safe to execute in parallel
- ✅ Expected execution time: ~30-60s

## Ready to Execute

You can safely run these 4 agents in parallel.
```

## Example: Catching Errors

### Before Validation

```xml
<invoke name="Task">
  <parameter name="subagent_type">context-compression-specialist</parameter>
  <parameter name="prompt">Compress context</parameter>
</invoke>
<invoke name="Task">
  <parameter name="subagent_type">chrome-devtools-debugger</parameter>
  <parameter name="description">Debug performance</parameter>
  <parameter name="prompt">Analyze [path]</parameter>
</invoke>
```

### After Validation

```yaml
## Status: FAIL

## Issues Found: 3

### Issue 1: Invalid Agent Name
- Agent: 'context-compression-specialist'
- Problem: Agent not found in available list
- Fix: Use 'general-purpose' instead

### Issue 2: Missing Parameter
- Agent: 'context-compression-specialist'
- Problem: Missing 'description' parameter
- Fix: Add description parameter

### Issue 3: Invalid Agent Name
- Agent: 'chrome-devtools-debugger'
- Problem: Agent not found in available list
- Fix: Use 'chromium-browser-expert' instead

### Issue 4: Placeholder in Prompt
- Agent: 'chrome-devtools-debugger'  
- Problem: Prompt contains "[path]" placeholder
- Fix: Replace with actual file path
```

## When to Use

- Before running parallel agents for the first time
- After modifying parallel task definitions
- When debugging "Sibling tool call errored"
- Before deploying parallel workflows
- When onboarding new team members

## Related Skills

- `/parallel-debug` - Debug issues using parallel agents
- `/parallel-audit` - Comprehensive parallel auditing
- `/agent-architecture` - Learn agent patterns

## Performance

- **Validation Time**: <1s
- **Prevents**: 95% of parallel agent errors
- **Cost**: Free (Haiku-tier validation)

## Best Practices

### Do Run Validator

✅ Before launching 5+ parallel agents
✅ When trying new agent combinations
✅ After skill/agent updates
✅ When errors occur

### Validation Pattern

```
1. Write parallel Task calls
2. Run /parallel-agent-validator
3. Fix any issues
4. Run validated parallel agents
5. Profit
```

## Common Fixes

### Fix 1: Invalid Agent Name

**Before:**
```xml
<parameter name="subagent_type">chrome-devtools-debugger</parameter>
```

**After:**
```xml
<parameter name="subagent_type">chromium-browser-expert</parameter>
```

### Fix 2: Missing Description

**Before:**
```xml
<invoke name="Task">
  <parameter name="subagent_type">error-debugger</parameter>
  <parameter name="prompt">Fix bug</parameter>
</invoke>
```

**After:**
```xml
<invoke name="Task">
  <parameter name="subagent_type">error-debugger</parameter>
  <parameter name="description">Debug TypeError</parameter>
  <parameter name="prompt">Fix TypeError in src/lib/auth.ts:42</parameter>
</invoke>
```

### Fix 3: Placeholder Text

**Before:**
```xml
<parameter name="prompt">Analyze the issue at [path]</parameter>
```

**After:**
```xml
<parameter name="prompt">Analyze performance issues in src/routes/shows/+page.svelte</parameter>
```

### Fix 4: Dependencies

**Before (Parallel):**
```xml
<invoke name="Task">
  <parameter name="subagent_type">code-generator</parameter>
  <parameter name="description">Generate component</parameter>
  <parameter name="prompt">Create UserProfile component</parameter>
</invoke>
<invoke name="Task">
  <parameter name="subagent_type">test-generator</parameter>
  <parameter name="description">Generate tests</parameter>
  <parameter name="prompt">Test the component above</parameter>
</invoke>
```

**After (Sequential):**
```
Message 1:
<invoke name="Task">
  <parameter name="subagent_type">code-generator</parameter>
  <parameter name="description">Generate component</parameter>
  <parameter name="prompt">Create UserProfile component</parameter>
</invoke>

Message 2 (after result):
<invoke name="Task">
  <parameter name="subagent_type">test-generator</parameter>
  <parameter name="description">Generate tests</parameter>
  <parameter name="prompt">Test UserProfile component in src/components/UserProfile.tsx</parameter>
</invoke>
```

---

*Use this skill before every parallel agent execution to catch 95% of errors before they happen!*
