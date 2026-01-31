# Parallel Agent Debugging Guide

## Root Cause: "Sibling tool call errored"

This error occurs when making multiple Tool calls in a single message and **one or more fails**. When one call errors, Claude Code marks ALL sibling calls as errored.

---

## The 5 Most Common Causes

### 1. ❌ Invalid Agent Names

**ERROR:**
```
Agent type 'context-compression-specialist' not found
```

**Problem:** You're using an agent name that doesn't exist in the system.

**Fix:** Use only valid agent names from the available list. Check the Task tool documentation for the complete list of agents.

**Common invalid names:**
- `context-compression-specialist` ❌
- `chrome-devtools-debugger` ❌
- `performance-debugger` ❌  
- `react-debugger` ❌
- `css-debugger` ❌
- `pwa-debugger` ❌
- `network-debugger` ❌
- `state-management-debugger` ❌

**Valid alternatives:**
- `error-debugger` ✅
- `chromium-browser-expert` ✅
- `performance-optimizer` ✅
- `senior-frontend-engineer` ✅
- `pwa-specialist` ✅
- `runtime-error-diagnostician` ✅

### 2. ❌ Missing Required Parameters

The Task tool requires **ALL THREE** parameters:
- `subagent_type` - The agent to invoke
- `description` - Short 3-5 word description
- `prompt` - The full task description

**WRONG - Missing description:**
```xml
<invoke name="Task">
  <parameter name="subagent_type">error-debugger</parameter>
  <parameter name="prompt">Fix the bug in auth.ts</parameter>
</invoke>
```

**RIGHT - All parameters:**
```xml
<invoke name="Task">
  <parameter name="subagent_type">error-debugger</parameter>
  <parameter name="description">Debug auth error</parameter>
  <parameter name="prompt">Diagnose and fix the TypeError in src/lib/auth.ts:42 - cannot read property 'token' of undefined</parameter>
</invoke>
```

### 3. ❌ Placeholders or Template Variables in Prompts

**WRONG - Using placeholders:**
```xml
<invoke name="Task">
  <parameter name="subagent_type">chromium-browser-expert</parameter>
  <parameter name="description">Debug performance</parameter>
  <parameter name="prompt">Analyze the issue at [path]</parameter>
</invoke>
```

**RIGHT - Specific file paths:**
```xml
<invoke name="Task">
  <parameter name="subagent_type">chromium-browser-expert</parameter>
  <parameter name="description">Debug performance</parameter>
  <parameter name="prompt">Capture Chrome DevTools performance trace for src/routes/shows/+page.svelte focusing on long tasks and LCP</parameter>
</invoke>
```

### 4. ❌ Dependencies Between Parallel Tasks

**WRONG - Task 2 depends on Task 1's output:**
```xml
<invoke name="Task">
  <parameter name="subagent_type">code-generator</parameter>
  <parameter name="description">Generate component</parameter>
  <parameter name="prompt">Create a UserProfile component with name and email props</parameter>
</invoke>
<invoke name="Task">
  <parameter name="subagent_type">test-generator</parameter>
  <parameter name="description">Generate tests</parameter>
  <parameter name="prompt">Write tests for the UserProfile component created above</parameter>
</invoke>
```

**RIGHT - Run sequentially:**
```xml
<!-- First message -->
<invoke name="Task">
  <parameter name="subagent_type">code-generator</parameter>
  <parameter name="description">Generate component</parameter>
  <parameter name="prompt">Create a UserProfile component with name and email props in src/components/UserProfile.tsx</parameter>
</invoke>

<!-- Wait for result, then second message -->
<invoke name="Task">
  <parameter name="subagent_type">test-generator</parameter>
  <parameter name="description">Generate tests</parameter>
  <parameter name="prompt">Write comprehensive unit tests for src/components/UserProfile.tsx</parameter>
</invoke>
```

### 5. ❌ Too Many Parallel Agents

**Problem:** Launching 50-100 agents simultaneously can overwhelm the system.

**Fix:** Start with 3-7 parallel agents, increase gradually if needed.

**Recommended:**
```xml
<!-- 4 parallel agents for comprehensive debugging -->
<invoke name="Task">
  <parameter name="subagent_type">chromium-browser-expert</parameter>
  <parameter name="description">DevTools analysis</parameter>
  <parameter name="prompt">Analyze Chrome DevTools performance trace for src/routes/shows/+page.svelte</parameter>
</invoke>
<invoke name="Task">
  <parameter name="subagent_type">senior-frontend-engineer</parameter>
  <parameter name="description">Code review</parameter>
  <parameter name="prompt">Review src/routes/shows/+page.svelte for component issues and performance problems</parameter>
</invoke>
<invoke name="Task">
  <parameter name="subagent_type">indexeddb-debugger</parameter>
  <parameter name="description">Database debug</parameter>
  <parameter name="prompt">Debug IndexedDB issues in src/lib/db/shows.ts for transaction deadlocks and quota errors</parameter>
</invoke>
<invoke name="Task">
  <parameter name="subagent_type">performance-optimizer</parameter>
  <parameter name="description">Performance audit</parameter>
  <parameter name="prompt">Audit src/routes/shows/+page.svelte for N+1 queries and bundle size issues</parameter>
</invoke>
```

---

## How to Find Valid Agent Names

### Method 1: Check Task Tool Description

Look at the Task tool's agent list in the system prompt. The complete list includes:

**General Purpose:**
- `general-purpose` - For complex multi-step tasks
- `Explore` - For codebase exploration  
- `Plan` - For implementation planning
- `Bash` - For command execution

**Debugging:**
- `error-debugger` - Error diagnosis and fixing
- `runtime-error-diagnostician` - Runtime error debugging
- `memory-leak-detective` - Memory leak detection

**Frontend:**
- `senior-frontend-engineer` - React/Next.js/SvelteKit development
- `chromium-browser-expert` - Browser DevTools and Chrome features
- `performance-optimizer` - Performance optimization

**Database:**
- `indexeddb-debugger` - IndexedDB debugging
- `dexie-database-architect` - Dexie.js schema design
- `database-specialist` - SQL optimization

**PWA:**
- `pwa-specialist` - PWA development
- `pwa-devtools-debugger` - PWA debugging
- `workbox-serviceworker-expert` - Service worker patterns

...and many more. Check the Task tool description for the complete list.

### Method 2: Use Grep to Find Agent Definitions

```bash
grep -r "subagent_type" .claude/agents/
```

### Method 3: Read the Agent Documentation

```bash
ls .claude/agents/
cat .claude/docs/reference/AGENT_ECOSYSTEM_INDEX.md
```

---

## Debugging Workflow

When you get "Sibling tool call errored":

### Step 1: Identify the Failing Call

Look at the error messages BEFORE the sibling errors:
```
Agent type 'context-compression-specialist' not found  ← THIS is the problem
<tool_use_error>Sibling tool call errored</tool_use_error>  ← These are cascading
<tool_use_error>Sibling tool call errored</tool_use_error>
<tool_use_error>Sibling tool call errored</tool_use_error>
```

### Step 2: Fix the Root Cause

Based on the error type:

**"Agent type '...' not found":**
- Change to a valid agent name from the available list

**"Missing required parameter":**
- Add the missing `description`, `prompt`, or `subagent_type`

**"Invalid parameter":**
- Check you're not mixing tool parameters (e.g., using Write parameters with Task)

### Step 3: Validate Your Fix

Before running, check:
- [ ] All agents exist in the available list
- [ ] All 3 parameters present: `subagent_type`, `description`, `prompt`
- [ ] No placeholder text like `[path]` or `{variable}`
- [ ] No dependencies between parallel tasks
- [ ] Reasonable number of parallel agents (3-7 recommended)

### Step 4: Run Again

If it still fails, isolate by running agents one at a time to find which specific call is problematic.

---

## Best Practices

### ✅ DO: Use Specific File Paths

```xml
<invoke name="Task">
  <parameter name="subagent_type">security-scanner</parameter>
  <parameter name="description">Scan auth file</parameter>
  <parameter name="prompt">Scan src/lib/auth.ts for XSS and SQL injection vulnerabilities</parameter>
</invoke>
```

### ✅ DO: Include Context in Prompts

```xml
<invoke name="Task">
  <parameter name="subagent_type">performance-optimizer</parameter>
  <parameter name="description">Optimize database</parameter>
  <parameter name="prompt">Analyze src/lib/database.ts for N+1 query patterns and missing indexes. Focus on the getShows() and getShowById() functions.</parameter>
</invoke>
```

### ✅ DO: Use Short, Clear Descriptions

```xml
<parameter name="description">Debug TypeError</parameter>  ✅
<parameter name="description">Debug</parameter>  ❌ (too vague)
<parameter name="description">Debug the TypeError that occurs in the authentication module</parameter>  ❌ (too long)
```

### ✅ DO: Batch Related Independent Tasks

```xml
<!-- Good: 4 independent security scans in parallel -->
<invoke name="Task">
  <parameter name="subagent_type">security-scanner</parameter>
  <parameter name="description">Scan auth</parameter>
  <parameter name="prompt">Scan src/lib/auth.ts for vulnerabilities</parameter>
</invoke>
<invoke name="Task">
  <parameter name="subagent_type">security-scanner</parameter>
  <parameter name="description">Scan DB</parameter>
  <parameter name="prompt">Scan src/lib/db.ts for SQL injection</parameter>
</invoke>
<invoke name="Task">
  <parameter name="subagent_type">security-scanner</parameter>
  <parameter name="description">Scan API</parameter>
  <parameter name="prompt">Scan src/routes/api/+server.ts for XSS</parameter>
</invoke>
<invoke name="Task">
  <parameter name="subagent_type">security-scanner</parameter>
  <parameter name="description">Scan forms</parameter>
  <parameter name="prompt">Scan src/components/LoginForm.svelte for CSRF</parameter>
</invoke>
```

### ❌ DON'T: Use Invalid Agent Names

```xml
<!-- These agents don't exist -->
<parameter name="subagent_type">context-compression-specialist</parameter>  ❌
<parameter name="subagent_type">chrome-devtools-debugger</parameter>  ❌
<parameter name="subagent_type">performance-debugger</parameter>  ❌
```

### ❌ DON'T: Skip Required Parameters

```xml
<!-- Missing description -->
<invoke name="Task">
  <parameter name="subagent_type">error-debugger</parameter>
  <parameter name="prompt">Fix the bug</parameter>
</invoke>
```

### ❌ DON'T: Use Placeholders

```xml
<parameter name="prompt">Analyze the issue at [path]</parameter>  ❌
<parameter name="prompt">Fix {error_type} in {file}</parameter>  ❌
<parameter name="prompt">Scan ${filename} for issues</parameter>  ❌
```

### ❌ DON'T: Create Dependencies

```xml
<!-- Task 2 depends on Task 1's output - BAD -->
<invoke name="Task">
  <parameter name="subagent_type">code-generator</parameter>
  <parameter name="description">Generate code</parameter>
  <parameter name="prompt">Create UserProfile component</parameter>
</invoke>
<invoke name="Task">
  <parameter name="subagent_type">test-generator</parameter>
  <parameter name="description">Test it</parameter>
  <parameter name="prompt">Test the component above</parameter>  ❌ Depends on first task
</invoke>
```

---

## Quick Reference

### Valid Agent Names for Common Tasks

| Task | Valid Agent |
|------|-------------|
| Debug errors | `error-debugger` |
| Debug runtime errors | `runtime-error-diagnostician` |
| Debug memory leaks | `memory-leak-detective` |
| Performance optimization | `performance-optimizer` |
| Security scanning | `security-scanner` |
| Code review | `code-reviewer` |
| Generate code | `code-generator` |
| Generate tests | `test-generator` |
| Frontend work | `senior-frontend-engineer` |
| Backend work | `senior-backend-engineer` |
| Database work | `database-specialist` |
| IndexedDB debugging | `indexeddb-debugger` |
| PWA development | `pwa-specialist` |
| PWA debugging | `pwa-devtools-debugger` |
| Chrome DevTools | `chromium-browser-expert` |
| Migration work | `migration-specialist` |

### Template for Parallel Debugging

```xml
<!-- 1. Performance Analysis -->
<invoke name="Task">
  <parameter name="subagent_type">chromium-browser-expert</parameter>
  <parameter name="description">Performance trace</parameter>
  <parameter name="prompt">Capture Chrome DevTools performance trace for [FILE] focusing on long tasks, LCP, and INP</parameter>
</invoke>

<!-- 2. Code Review -->
<invoke name="Task">
  <parameter name="subagent_type">senior-frontend-engineer</parameter>
  <parameter name="description">Code review</parameter>
  <parameter name="prompt">Review [FILE] for component issues, state management problems, and performance anti-patterns</parameter>
</invoke>

<!-- 3. Database Analysis -->
<invoke name="Task">
  <parameter name="subagent_type">indexeddb-debugger</parameter>
  <parameter name="description">Database debug</parameter>
  <parameter name="prompt">Debug IndexedDB issues in [FILE] - check for transaction deadlocks, VersionError, QuotaExceededError</parameter>
</invoke>

<!-- 4. Performance Optimization -->
<invoke name="Task">
  <parameter name="subagent_type">performance-optimizer</parameter>
  <parameter name="description">Performance audit</parameter>
  <parameter name="prompt">Analyze [FILE] for N+1 queries, blocking operations, and bundle size problems</parameter>
</invoke>
```

---

## Still Getting Errors?

### Create a Test Case

Run ONE agent at a time to isolate the problem:

```xml
<!-- Test 1 -->
<invoke name="Task">
  <parameter name="subagent_type">error-debugger</parameter>
  <parameter name="description">Test agent 1</parameter>
  <parameter name="prompt">Diagnose error in src/lib/test.ts</parameter>
</invoke>
```

If this works, add agents one by one until you find the problematic call.

### Check Your Syntax

Common XML syntax errors:
```xml
<!-- WRONG - Missing closing tag -->
<parameter name="prompt">Test

<!-- WRONG - Wrong quotes -->
<parameter name='prompt'>Test</parameter>

<!-- RIGHT -->
<parameter name="prompt">Test</parameter>
```

### Verify Agent Availability

```bash
# List all available agents
cd /Users/louisherman/ClaudeCodeProjects
grep -r "subagent_type" .claude/ | grep -v "node_modules" | head -50
```

---

## Summary Checklist

Before running parallel agents:

- [ ] All agent names are valid (from available list)
- [ ] All 3 parameters present on each call
- [ ] No placeholder text in prompts
- [ ] Tasks are truly independent
- [ ] Using 3-7 agents (not 50-100)
- [ ] File paths are specific and complete
- [ ] Descriptions are 3-5 words
- [ ] XML syntax is correct

Follow this checklist and you'll avoid "Sibling tool call errored" 95% of the time!
