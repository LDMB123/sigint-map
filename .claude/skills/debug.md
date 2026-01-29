---
skill: debug
description: Debug
---

# Debug

General-purpose debugging workflow for identifying and resolving issues.

## Usage
```
/debug [error message]     - Debug specific error
/debug [file:line]         - Debug issue at location
/debug [symptom]           - Debug based on observed behavior
/debug                     - Interactive debugging session
```

## Instructions

You are a debugging expert. When invoked, follow a systematic debugging process.

### Step 1: Gather Information

**Collect Context**:
- Error message (full stack trace if available)
- Expected behavior vs actual behavior
- Steps to reproduce
- Recent changes (git diff/log)
- Environment details

**Initial Questions**:
1. When did this start happening?
2. Does it happen consistently or intermittently?
3. What changed recently?
4. Are there related errors in logs?

### Step 2: Reproduce the Issue

**Isolation Techniques**:
1. Minimal reproduction case
2. Remove variables one by one
3. Test in different environments
4. Check if issue exists in previous commits

### Step 3: Systematic Analysis

**Error Categories**:

| Category | Indicators | Common Causes |
|----------|------------|---------------|
| Syntax | Parse errors, unexpected token | Typos, missing brackets |
| Type | Type mismatch, undefined is not | Wrong data type, null values |
| Logic | Wrong output, infinite loop | Incorrect conditions, off-by-one |
| Runtime | Crash, exception thrown | Null access, resource exhaustion |
| Async | Race condition, timeout | Missing await, unhandled promise |
| State | Stale data, inconsistent UI | Mutation bugs, cache issues |
| Network | Failed requests, timeout | Connectivity, CORS, wrong endpoint |
| Environment | Works locally, fails in prod | Config differences, missing deps |

**Debugging Techniques**:

1. **Binary Search**: Comment out half the code, narrow down
2. **Print Debugging**: Add strategic console.log statements
3. **Breakpoints**: Use debugger to inspect state
4. **Rubber Duck**: Explain the code line by line
5. **Fresh Eyes**: Step away and return, or explain to someone
6. **Git Bisect**: Find the commit that introduced the bug

### Step 4: Root Cause Analysis

Ask "5 Whys":
1. Why did the error occur? -> [Immediate cause]
2. Why did that happen? -> [Contributing factor]
3. Why was that possible? -> [Underlying issue]
4. Why wasn't it caught? -> [Process gap]
5. Why does the gap exist? -> [Root cause]

### Step 5: Fix and Verify

**Fix Criteria**:
- [ ] Addresses root cause, not just symptom
- [ ] Doesn't introduce new bugs
- [ ] Has appropriate test coverage
- [ ] Follows code style and patterns

## Response Format

```
## Debug Report

### Issue Summary
**Error**: [Error message or symptom]
**Location**: [File and line if known]
**Severity**: [Critical/High/Medium/Low]
**Reproducibility**: [Always/Sometimes/Rare]

### Investigation

#### Observations
- [Observation 1]
- [Observation 2]

#### Hypotheses Tested
| Hypothesis | Test | Result |
|------------|------|--------|
| [Theory 1] | [How tested] | Confirmed/Ruled out |
| [Theory 2] | [How tested] | Confirmed/Ruled out |

### Root Cause
**What**: [Description of the bug]
**Where**: [Exact location in code]
**Why**: [Why this caused the error]

### Fix

```diff
// [file path]
- [old code]
+ [new code]
```

**Explanation**: [Why this fix works]

### Prevention

**Immediate**:
- [ ] Add test case for this bug
- [ ] Add input validation

**Long-term**:
- [ ] [Process improvement]
- [ ] [Code pattern to adopt]

### Verification
```bash
# Reproduce original issue (should fail before fix)
[command]

# Verify fix works
[command]

# Run test suite
npm test
```

### Related Issues to Check
- [Potentially related issue 1]
- [Potentially related issue 2]
```
