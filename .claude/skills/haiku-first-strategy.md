---
skill: haiku-first-strategy
description: Haiku-First Strategy
---

# Haiku-First Strategy

Use the most cost-effective model tier first, escalating to higher tiers only when necessary.

## Usage

```
/haiku-first-strategy [task description]
```

## Instructions

You are implementing a tiered LLM strategy that minimizes costs by starting with faster, cheaper models and escalating only when complexity requires it.

### Model Tier Decision Tree

```
START
  |
  v
Is this a simple, well-defined task?
  |
  +--YES--> Use Haiku tier
  |           - Syntax fixes
  |           - Simple refactors
  |           - Code formatting
  |           - Basic Q&A
  |           - Pattern matching
  |
  +--NO---> Does it require reasoning or context?
              |
              +--MODERATE--> Use Sonnet tier
              |               - Code review
              |               - Bug diagnosis
              |               - Feature implementation
              |               - Documentation
              |
              +--COMPLEX---> Use Opus tier
                              - Architecture design
                              - Complex debugging
                              - Novel problem solving
                              - Multi-file refactors
```

### Task Classification

**Haiku-Appropriate Tasks (Start Here)**
- Rename variable across file
- Add type annotations
- Fix linting errors
- Generate boilerplate
- Simple search/replace
- Format code
- Add comments to existing code
- Convert between similar formats

**Sonnet-Appropriate Tasks (Escalate To)**
- Implement new function with logic
- Debug runtime errors
- Write meaningful tests
- Refactor with behavior preservation
- Code review with suggestions
- Explain complex code
- Optimize performance

**Opus-Appropriate Tasks (Final Escalation)**
- Design system architecture
- Debug subtle race conditions
- Refactor large codebases
- Make nuanced technical decisions
- Handle ambiguous requirements
- Cross-cutting concerns

### Escalation Triggers

Escalate from Haiku to Sonnet when:
- First attempt produces incorrect output
- Task requires understanding business logic
- Multiple files need coordinated changes
- Output requires creative problem-solving

Escalate from Sonnet to Opus when:
- Sonnet produces subtly wrong solutions
- Task has significant ambiguity
- Requires weighing complex tradeoffs
- Needs deep architectural understanding

### Practical Examples

**Example 1: Variable Rename**
```
Task: Rename 'usr' to 'user' in auth.ts
Tier: Haiku (mechanical transformation)
```

**Example 2: Bug Fix**
```
Task: Fix "undefined is not a function" in processOrder
Tier: Start Haiku (if error location known)
      Escalate Sonnet (if root cause unclear)
      Escalate Opus (if architectural issue)
```

**Example 3: New Feature**
```
Task: Add caching layer to API client
Tier: Sonnet (requires design decisions)
      Escalate Opus (if cache invalidation complex)
```

### Cost Comparison

| Tier | Relative Cost | Speed | Use For |
|------|---------------|-------|---------|
| Haiku | 1x | Fastest | 60% of tasks |
| Sonnet | 5x | Fast | 30% of tasks |
| Opus | 25x | Slower | 10% of tasks |

### Implementation Pattern

```
1. Analyze task complexity (10 seconds)
2. Attempt with lowest appropriate tier
3. Evaluate output quality
4. If unsatisfactory, escalate one tier
5. Document escalation reason for learning
```

### Response Format

When applying haiku-first strategy, respond with:

```
## Task Analysis

**Task:** [description]
**Complexity indicators:** [list key factors]
**Initial tier:** [Haiku/Sonnet/Opus]
**Reasoning:** [one sentence]

## Execution

[Perform task at selected tier]

## Quality Check

**Output quality:** [acceptable/needs escalation]
**Escalation needed:** [yes/no]
**Escalation reason:** [if applicable]

## Final Result

**Tier used:** [final tier]
**Cost efficiency:** [estimated savings vs always-Opus]

[Final output]
```
