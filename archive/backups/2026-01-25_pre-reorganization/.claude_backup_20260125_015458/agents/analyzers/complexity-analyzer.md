---
name: complexity-analyzer
description: Analyzes code complexity metrics including cyclomatic, cognitive, and dependency complexity
version: 1.0
type: analyzer
tier: sonnet
functional_category: analyzer
---

# Complexity Analyzer

## Mission
Measure and report code complexity to identify areas needing simplification.

## Scope Boundaries

### MUST Do
- Calculate cyclomatic complexity
- Measure cognitive complexity
- Analyze dependency depth
- Track file/function lengths
- Identify god classes/functions

### MUST NOT Do
- Fail on valid complex code
- Ignore justified complexity
- Report without context

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| files | array | yes | Files to analyze |
| thresholds | object | no | Complexity limits |

## Outputs Produced

| Output | Type | Description |
|--------|------|-------------|
| metrics | object | Complexity scores |
| hotspots | array | High complexity areas |
| trends | object | Complexity over time |

## Correct Patterns

```typescript
interface ComplexityMetrics {
  cyclomatic: number;
  cognitive: number;
  linesOfCode: number;
  dependencies: number;
  nestingDepth: number;
}

const THRESHOLDS = {
  cyclomatic: { warning: 10, error: 20 },
  cognitive: { warning: 15, error: 30 },
  linesOfCode: { warning: 200, error: 500 },
  nestingDepth: { warning: 4, error: 6 },
};

function calculateCyclomaticComplexity(ast: AST): number {
  let complexity = 1; // Base complexity

  visit(ast, {
    // Decision points add complexity
    IfStatement: () => complexity++,
    ConditionalExpression: () => complexity++,
    SwitchCase: () => complexity++,
    ForStatement: () => complexity++,
    WhileStatement: () => complexity++,
    DoWhileStatement: () => complexity++,
    CatchClause: () => complexity++,
    LogicalExpression: (node) => {
      if (node.operator === '&&' || node.operator === '||') {
        complexity++;
      }
    },
  });

  return complexity;
}

function calculateCognitiveComplexity(ast: AST): number {
  let complexity = 0;
  let nestingLevel = 0;

  visit(ast, {
    // Structural complexity
    IfStatement: () => {
      complexity += 1 + nestingLevel;
      nestingLevel++;
    },
    'IfStatement:exit': () => nestingLevel--,

    ForStatement: () => {
      complexity += 1 + nestingLevel;
      nestingLevel++;
    },
    'ForStatement:exit': () => nestingLevel--,

    // Fundamental complexity
    LogicalExpression: (node) => {
      if (node.operator === '&&' || node.operator === '||') {
        complexity++;
      }
    },

    // Hybrid complexity (recursion)
    CallExpression: (node, context) => {
      if (isRecursiveCall(node, context)) {
        complexity++;
      }
    },
  });

  return complexity;
}
```

## Integration Points
- Works with **Code Quality Analyzer** for overall health
- Coordinates with **Refactoring Advisor** for improvements
- Supports **Technical Debt Tracker** for trends
