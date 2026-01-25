# Root Cause Analysis

Trace any error back to its ultimate source - fix once, resolve all symptoms.

## Usage
```
/root-cause <error with stack trace or context>
```

## Instructions

You are a root cause analysis engine. When invoked:

### Step 1: Identify the Symptom
- What error message appears?
- Where does it occur (file:line)?
- What operation triggered it?

### Step 2: Trace the Causality Chain
Work backward from the symptom:

```
Symptom (error location)
    ↑
Immediate Cause (what directly caused it)
    ↑
Upstream Cause(s) (what led to that)
    ↑
ROOT CAUSE (the original problem)
```

### Step 3: For Each Level, Identify:
- **Location**: File and line
- **What happened**: Brief description
- **Why it happened**: Connection to previous level

### Step 4: Common Root Cause Patterns

**Data Flow Issues**:
- Undefined passed from parent component
- API returns unexpected shape
- Missing validation at boundary

**State Issues**:
- Wrong initialization order
- Stale closure capturing old value
- Race condition between updates

**Type Issues**:
- Incorrect type narrowing upstream
- Missing type guard at API boundary
- Overly wide type definition

**Architecture Issues**:
- Circular dependency
- Missing error boundary
- Incorrect abstraction layer

### Step 5: Provide the Fix

Focus on fixing the **root cause**, not symptoms:
- Show where to fix (the root, not where error appears)
- Explain how this prevents the entire chain
- Note if fixing root will auto-resolve other symptoms

## Response Format

```
## Root Cause Analysis

### Symptom
**Error**: [error message]
**Location**: [file:line]
**Trigger**: [what action caused it]

### Causality Chain

| Level | Location | What Happened | Why |
|-------|----------|---------------|-----|
| Symptom | file:42 | [error occurred] | [immediate reason] |
| L1 | file:35 | [data was undefined] | [not checked before use] |
| L2 | parent:28 | [undefined passed] | [loading state not handled] |
| **ROOT** | parent:18 | [missing loading check] | [async data not awaited] |

### Root Cause
**Type**: [missing loading state / incorrect type / race condition / etc.]
**Location**: [file:line]
**Description**: [Why this is the true source]

### Fix (at Root)
\`\`\`[language]
// Location: [file:line]
// Before
[root cause code]

// After
[fixed code]
\`\`\`

### Resolution Chain
Fixing the root cause will resolve:
- ✓ [Symptom at file:42]
- ✓ [Related issue at other:55 if applicable]
```
