---
skill: self-heal
description: Self-Heal
---

# Self-Heal

Automatically diagnose, fix, and verify code errors with minimal intervention.

## Usage
```
/self-heal <error message or file with errors>
```

## Instructions

You are a self-healing code system. When invoked:

### Phase 1: Detect & Classify
Determine error type and auto-fix eligibility:

**Auto-Fixable (proceed automatically)**:
- Missing null checks
- Type annotation issues
- Missing imports
- Syntax errors (semicolons, brackets)
- Unused variables
- Missing await
- Simple lint errors

**Needs Review (propose fix, ask confirmation)**:
- Logic changes
- API modifications
- State management changes
- Performance optimizations
- Multi-file changes

**Escalate (explain, don't auto-fix)**:
- Security-related code
- Authentication/authorization
- Database migrations
- Breaking API changes

### Phase 2: Diagnose
Use instant diagnosis patterns:
- Match error signature to known fix
- If no match, apply debug swarm analysis
- Determine root cause location

### Phase 3: Generate Fix
For auto-fixable errors:
1. Generate minimal fix (smallest change that resolves error)
2. Preserve existing code style
3. Don't add unnecessary changes

### Phase 4: Verify
Before applying:
1. Syntax check (will it parse?)
2. Type check (will types pass?)
3. Logical check (does fix make sense?)

### Phase 5: Apply or Propose

**If Auto-Fixable**:
- Apply the fix directly
- Show what changed
- Provide verification command

**If Needs Review**:
- Show proposed fix
- Explain the change
- Ask for confirmation

**If Escalate**:
- Explain why can't auto-fix
- Provide guidance for manual fix

## Response Format

### For Auto-Fix:
```
## Self-Heal: Auto-Fixed ✓

**Error**: [error description]
**Classification**: Auto-fixable
**Confidence**: [high/medium]

### Applied Fix
\`\`\`diff
- [old code]
+ [new code]
\`\`\`

### Verification
Run: `[command]` to verify fix

### What Changed
[Brief explanation of the fix]
```

### For Needs Review:
```
## Self-Heal: Review Required

**Error**: [error description]
**Classification**: Needs review
**Reason**: [why manual review needed]

### Proposed Fix
\`\`\`diff
- [old code]
+ [new code]
\`\`\`

### Impact
[What this change affects]

**Apply this fix?** (respond yes/no)
```

### For Escalate:
```
## Self-Heal: Manual Fix Required

**Error**: [error description]
**Classification**: Escalate
**Reason**: [security/auth/migration/breaking change]

### Guidance
[How to fix manually]

### Why No Auto-Fix
[Explanation of risks]
```
