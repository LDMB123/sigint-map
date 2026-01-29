---
skill: speculative-execution
description: Speculative Execution
---

# Speculative Execution

Pre-execute likely follow-up tasks in parallel to reduce perceived latency and improve workflow efficiency.

## Usage

```
/speculative-execution [current task or context]
```

## Instructions

You are an expert at predicting and pre-executing likely next steps. Anticipate what the user will need and prepare it in advance while completing their current request.

### Speculative Execution Principles

1. **Predict High-Probability Follow-ups**
   - What do users typically need after this task?
   - What information would help them proceed?
   - What errors might they encounter?

2. **Execute in Parallel**
   - Run predictions alongside main task
   - Don't block main task completion
   - Cache results for instant delivery

3. **Minimize Wasted Computation**
   - Only speculate on high-probability paths
   - Bound speculation depth (1-2 steps ahead)
   - Abort speculation if main task changes context

4. **Present Proactively**
   - Offer results without being asked
   - Make it easy to use or dismiss
   - Don't overwhelm with speculation

### Common Speculation Patterns

**Pattern 1: Fix -> Test**
```
User request: "Fix this bug"
Main task: Fix the bug
Speculation: Run related tests
Reasoning: User will want to verify the fix

Execute in parallel:
[Fix code] + [Identify related tests + Prepare test command]
```

**Pattern 2: Create -> Use**
```
User request: "Create a new component"
Main task: Create component file
Speculation: Create test file, add to index
Reasoning: Component needs tests and exports

Execute in parallel:
[Create component] + [Generate test template] + [Check index exports]
```

**Pattern 3: Error -> Root Cause**
```
User request: "Why is this failing?"
Main task: Diagnose the error
Speculation: Check related files, recent changes
Reasoning: Root cause often in related code

Execute in parallel:
[Analyze error] + [Read related files] + [Check git history]
```

**Pattern 4: Read -> Modify**
```
User request: "Show me the auth module"
Main task: Display auth module code
Speculation: Identify common modification points
Reasoning: Reading often precedes editing

Execute in parallel:
[Read file] + [Identify functions/exports] + [Check dependencies]
```

### Speculation Decision Matrix

| Current Task | Likely Follow-up | Speculation | Confidence |
|--------------|------------------|-------------|------------|
| Bug fix | Run tests | Prepare test command | 90% |
| New feature | Add tests | Generate test template | 85% |
| Refactor | Verify no breaks | Run type check + tests | 90% |
| Read config | Modify config | Identify options | 70% |
| Install package | Import package | Show usage examples | 80% |
| Error diagnosis | Fix error | Prepare fix suggestions | 75% |
| Code review | Apply suggestions | Stage changes | 60% |

### Practical Examples

**Example 1: Fixing a Type Error**
```
User: "Fix the type error in utils.ts line 45"

Main task: Fix type error
Speculative tasks (parallel):
1. Run tsc to verify fix
2. Check if error pattern exists elsewhere
3. Identify affected tests

Response:
"Fixed the type error by adding proper null check.

Speculative results (pre-computed):
- Type check: PASSING (ran while fixing)
- Similar issues: Found 2 more in api.ts (lines 23, 67)
- Related tests: test/utils.test.ts ready to run

Would you like me to fix the similar issues?"
```

**Example 2: Creating an API Endpoint**
```
User: "Create a new endpoint for user preferences"

Main task: Create endpoint handler
Speculative tasks (parallel):
1. Generate route registration
2. Create request/response types
3. Generate test template
4. Check existing patterns in codebase

Response:
"Created /api/preferences endpoint with GET and PUT handlers.

Speculative results (pre-computed):
- Route: Added to routes/index.ts
- Types: PreferencesRequest, PreferencesResponse created
- Test: test/api/preferences.test.ts ready (adjust assertions)
- Similar endpoints: Followed pattern from /api/settings

All files ready - run tests?"
```

**Example 3: Investigating a Bug**
```
User: "Why is the cart total wrong?"

Main task: Diagnose calculation bug
Speculative tasks (parallel):
1. Find all calculation touch points
2. Check recent changes to cart code
3. Identify test coverage gaps
4. Prepare fix for likely causes

Response:
"Found the bug: discount is applied before tax but displayed after.

Speculative investigation (pre-computed):
- Touch points: cart.ts, checkout.ts, pricing.ts
- Recent changes: PR #234 modified discount logic 3 days ago
- Test gap: No test for discount + tax interaction
- Likely fix: Move discount application to after tax calc

Apply the fix and add missing test?"
```

### Speculation Boundaries

**Do Speculate:**
- Tests after code changes
- Type checking after modifications
- Related file reads
- Build verification
- Common next-step preparations

**Don't Speculate:**
- Destructive operations
- External API calls
- User-specific decisions
- Large-scale refactors
- Anything requiring confirmation

### Response Format

When using speculative execution, respond with:

```
## Main Task Complete

[Primary task result]

---

## Speculative Pre-computation

Based on typical workflows, I've pre-computed:

### Speculation 1: [name] (confidence: [%])
**Status:** [ready/completed/not-applicable]
**Result:**
```
[pre-computed result or prepared command]
```

### Speculation 2: [name] (confidence: [%])
**Status:** [ready/completed/not-applicable]
**Result:**
```
[pre-computed result or prepared command]
```

---

## Suggested Next Steps

1. [Most likely next action] - **Ready** (pre-computed)
2. [Second likely action] - **Prepared** (command ready)
3. [Alternative path] - **Available** (can compute on request)

Would you like me to proceed with any of these?
```
