---
name: parallel-validation-swarm
description: Runs multiple validation checks simultaneously for comprehensive coverage
version: 1.0
type: validator
tier: haiku
functional_category: swarms
speedup: 8-12x
---

# Parallel Validation Swarm

## Mission
Execute all validation checks in parallel instead of sequentially.

## Validation Categories

### Run All Validations Concurrently
```typescript
interface ValidationResult {
  category: string;
  passed: boolean;
  issues: Issue[];
  duration: number;
}

async function runAllValidations(codebase: string): Promise<ValidationResult[]> {
  const startTime = Date.now();

  // Run ALL validations in parallel
  const results = await Promise.all([
    // Syntax & Types
    haiku(`Validate TypeScript syntax in ${codebase}`),
    haiku(`Check for type errors in ${codebase}`),
    haiku(`Verify import/export consistency`),

    // Style & Format
    haiku(`Check ESLint rules compliance`),
    haiku(`Verify Prettier formatting`),
    haiku(`Check naming conventions`),

    // Security
    haiku(`Scan for hardcoded secrets`),
    haiku(`Check for SQL injection patterns`),
    haiku(`Verify input sanitization`),

    // Performance
    haiku(`Detect N+1 query patterns`),
    haiku(`Find memory leak patterns`),
    haiku(`Check bundle size impacts`),

    // Quality
    haiku(`Verify test coverage`),
    haiku(`Check documentation completeness`),
    haiku(`Validate API contracts`),
  ]);

  // Sequential would take 15 * 2s = 30s
  // Parallel takes ~2-3s
  console.log(`Completed in ${Date.now() - startTime}ms`);

  return results;
}
```

## Parallel vs Sequential Comparison

| Validations | Sequential | Parallel | Speedup |
|-------------|------------|----------|---------|
| 5 checks | 10s | 2s | 5x |
| 10 checks | 20s | 2.5s | 8x |
| 15 checks | 30s | 3s | 10x |
| 20 checks | 40s | 3.5s | 11x |

## Smart Validation Routing

```typescript
const VALIDATION_CONFIG = {
  syntax: { tier: 'haiku', parallel: true, timeout: 5000 },
  types: { tier: 'haiku', parallel: true, timeout: 10000 },
  security: { tier: 'sonnet', parallel: true, timeout: 15000 },
  architecture: { tier: 'opus', parallel: false, timeout: 30000 },
};

async function smartValidate(code: string): Promise<ValidationReport> {
  // Group by tier for cost efficiency
  const haikuValidations = Object.entries(VALIDATION_CONFIG)
    .filter(([_, config]) => config.tier === 'haiku');

  const sonnetValidations = Object.entries(VALIDATION_CONFIG)
    .filter(([_, config]) => config.tier === 'sonnet');

  // Run Haiku validations in parallel swarm
  const haikuResults = await Promise.all(
    haikuValidations.map(([name]) => runValidation(name, 'haiku'))
  );

  // Only run Sonnet if Haiku found issues
  if (haikuResults.some(r => r.issues.length > 0)) {
    const sonnetResults = await Promise.all(
      sonnetValidations.map(([name]) => runValidation(name, 'sonnet'))
    );
    return merge(haikuResults, sonnetResults);
  }

  return { results: haikuResults, allPassed: true };
}
```

## Integration Points
- Works with **Haiku Swarm Coordinator** for parallel execution
- Coordinates with **Result Aggregator** for combining results
- Supports **Tier Router** for smart tier selection
