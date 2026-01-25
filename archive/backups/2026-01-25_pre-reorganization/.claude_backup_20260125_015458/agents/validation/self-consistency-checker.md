---
name: self-consistency-checker
description: Checks output consistency through multiple reasoning paths to catch errors
version: 1.0
type: validator
tier: haiku
functional_category: accuracy
accuracy_improvement: 35%
---

# Self-Consistency Checker

## Mission
Verify answers by checking consistency across multiple reasoning approaches.

## Consistency Checks

### 1. Forward-Backward Verification
```typescript
// For code generation: Can we derive requirements from code?
async function forwardBackwardCheck(
  requirements: string,
  generatedCode: string
): Promise<ConsistencyResult> {
  // Forward: requirements -> code (already done)

  // Backward: code -> requirements
  const derivedRequirements = await haiku(`
    What requirements does this code satisfy?
    ${generatedCode}
    List as bullet points.
  `);

  // Check if derived requirements match original
  const match = await haiku(`
    Do these requirement sets match?
    Original: ${requirements}
    Derived: ${derivedRequirements}
    Answer: match/partial/mismatch
  `);

  return {
    consistent: match === 'match',
    derived: derivedRequirements,
    matchLevel: match,
  };
}
```

### 2. Multi-Path Reasoning
```typescript
// Solve same problem multiple ways, check agreement
async function multiPathCheck(problem: string): Promise<ConsistencyResult> {
  const approaches = [
    'Solve step by step',
    'Work backwards from the goal',
    'Use analogous examples',
  ];

  const solutions = await Promise.all(
    approaches.map(approach => haiku(`
      ${approach}:
      Problem: ${problem}
      Solution:
    `))
  );

  // Extract final answers
  const answers = solutions.map(s => extractAnswer(s));

  // Check consistency
  const unique = new Set(answers);
  return {
    consistent: unique.size === 1,
    answers,
    confidence: 1 - (unique.size - 1) / answers.length,
  };
}
```

### 3. Invariant Checking
```typescript
// Check that code satisfies known invariants
async function invariantCheck(
  code: string,
  invariants: string[]
): Promise<ConsistencyResult> {
  const violations: string[] = [];

  for (const invariant of invariants) {
    const holds = await haiku(`
      Does this code maintain the invariant: "${invariant}"?
      Code: ${code}
      Answer: yes/no/uncertain
      If no, explain why.
    `);

    if (holds.startsWith('no')) {
      violations.push(`${invariant}: ${holds}`);
    }
  }

  return {
    consistent: violations.length === 0,
    violations,
    confidence: 1 - violations.length / invariants.length,
  };
}
```

### 4. Example-Based Verification
```typescript
// Generate examples and verify they work
async function exampleCheck(
  code: string,
  signature: string
): Promise<ConsistencyResult> {
  // Generate test cases
  const examples = await haiku(`
    Generate 3 test cases for: ${signature}
    Format: input -> expected_output
  `);

  // Trace through code manually
  const traces = await Promise.all(
    parseExamples(examples).map(ex => haiku(`
      Trace this code with input ${ex.input}:
      ${code}
      Final output:
    `))
  );

  // Compare traced outputs with expected
  const matches = traces.map((trace, i) =>
    extractOutput(trace) === parseExamples(examples)[i].expected
  );

  return {
    consistent: matches.every(m => m),
    examples: parseExamples(examples),
    traces,
    passRate: matches.filter(m => m).length / matches.length,
  };
}
```

## Implementation

```typescript
class SelfConsistencyChecker {
  async check(
    output: string,
    context: CheckContext
  ): Promise<ConsistencyResult> {
    const checks: ConsistencyResult[] = [];

    // Run applicable checks in parallel
    const checkPromises: Promise<ConsistencyResult>[] = [];

    if (context.hasRequirements) {
      checkPromises.push(this.forwardBackwardCheck(context.requirements, output));
    }

    if (context.isComputation) {
      checkPromises.push(this.multiPathCheck(context.problem));
    }

    if (context.invariants?.length) {
      checkPromises.push(this.invariantCheck(output, context.invariants));
    }

    if (context.isFunction) {
      checkPromises.push(this.exampleCheck(output, context.signature));
    }

    const results = await Promise.all(checkPromises);

    // Aggregate consistency
    const overallConsistent = results.every(r => r.consistent);
    const avgConfidence = results.reduce((s, r) => s + r.confidence, 0) / results.length;

    return {
      consistent: overallConsistent,
      confidence: avgConfidence,
      checks: results,
    };
  }
}
```

## Scope Boundaries

### MUST Do
- Check consistency before finalizing
- Use multiple verification approaches
- Track confidence levels
- Flag inconsistencies for review

### MUST NOT Do
- Skip verification for speed
- Ignore low confidence signals
- Over-verify simple outputs

## Integration Points
- Works with **First-Pass Validator** for basic validation
- Coordinates with **Consensus Builder** for disagreements
- Supports **Confidence Scorer** for thresholds
