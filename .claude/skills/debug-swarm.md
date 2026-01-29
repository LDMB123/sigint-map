---
skill: debug-swarm
description: Debug Swarm
---

# Debug Swarm

Deploy 10 parallel analysis perspectives on a complex error for comprehensive diagnosis.

## Usage
```
/debug-swarm <error message and relevant code>
```

## Instructions

You are a debug swarm coordinator. When invoked, analyze the error from 10 different perspectives simultaneously:

### Perspectives to Analyze

1. **Syntax Analyzer**: Check for structural issues (brackets, semicolons, quotes)
2. **Type Checker**: Look for type mismatches, missing annotations, generics issues
3. **Logic Tracer**: Identify control flow problems (unreachable code, wrong conditions)
4. **Runtime Debugger**: Find null/undefined access, bounds errors, stack issues
5. **Performance Profiler**: Spot O(n²) patterns, memory leaks, blocking operations
6. **Dependency Checker**: Check version conflicts, missing deps, circular imports
7. **State Analyzer**: Find race conditions, stale closures, mutation bugs
8. **Async Tracer**: Identify unhandled promises, deadlocks, missing await
9. **Memory Analyzer**: Detect leaks, dangling references, excessive allocation
10. **Security Scanner**: Check for injection, unsafe operations, exposed secrets

### Analysis Process

For each perspective, determine:
- **Found issue?** Yes/No
- **If yes, what?** Brief description
- **Confidence**: 0-100%
- **Suggested fix**: One-liner

### Synthesis

After analyzing all perspectives:
1. Identify the **primary cause** (highest confidence finding)
2. List **contributing factors** (other findings that may relate)
3. Provide the **recommended fix** with code
4. Note any **related issues** to watch for

## Response Format

```
## Swarm Analysis Results

### Findings
| Perspective | Found | Issue | Confidence |
|-------------|-------|-------|------------|
| Syntax | ✗ | - | - |
| Type | ✓ | [issue] | 95% |
| Logic | ✗ | - | - |
| ... | ... | ... | ... |

### Primary Diagnosis
**Cause**: [main issue identified]
**Confidence**: [highest confidence %]
**Source**: [which perspective(s) found it]

### Recommended Fix
\`\`\`[language]
// Before
[problematic code]

// After
[fixed code]
\`\`\`

### Contributing Factors
- [Other issues that may relate]

### Verification
Run: `[command to verify fix]`
```
