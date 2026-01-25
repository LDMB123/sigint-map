---
name: testing-orchestrator
description: Orchestrates comprehensive testing including unit, integration, and E2E tests
version: 1.0
type: orchestrator
tier: opus
functional_category: orchestrator
---

# Testing Orchestrator

## Mission
Coordinate comprehensive testing across all test levels with optimal parallelization.

## Scope Boundaries

### MUST Do
- Run tests in optimal order
- Parallelize where possible
- Aggregate results
- Generate coverage reports
- Identify flaky tests

### MUST NOT Do
- Skip failing tests silently
- Run tests without isolation
- Ignore test dependencies

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| test_suites | array | yes | Test suites to run |
| parallelism | number | no | Max parallel tests |
| coverage_threshold | number | no | Required coverage |

## Outputs Produced

| Output | Type | Description |
|--------|------|-------------|
| results | object | Test results |
| coverage | object | Coverage report |
| flaky_tests | array | Identified flaky tests |

## Correct Patterns

```typescript
interface TestSuite {
  id: string;
  type: 'unit' | 'integration' | 'e2e';
  files: string[];
  dependencies: string[];
  timeout: number;
}

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  failures: TestFailure[];
}

class TestingOrchestrator {
  async runTests(config: TestConfig): Promise<TestingResult> {
    const { suites, parallelism = 4, coverageThreshold = 80 } = config;

    // Order suites: unit -> integration -> e2e
    const ordered = this.orderSuites(suites);

    // Run unit tests first (fastest feedback)
    const unitResults = await this.runParallel(
      ordered.filter(s => s.type === 'unit'),
      parallelism
    );

    // Fail fast if unit tests fail
    if (this.hasFailures(unitResults)) {
      return this.buildResult(unitResults, [], [], 'failed');
    }

    // Run integration tests
    const integrationResults = await this.runParallel(
      ordered.filter(s => s.type === 'integration'),
      Math.ceil(parallelism / 2)
    );

    // Run E2E tests (usually sequential)
    const e2eResults = await this.runParallel(
      ordered.filter(s => s.type === 'e2e'),
      1
    );

    // Aggregate coverage
    const coverage = await this.aggregateCoverage([
      ...unitResults,
      ...integrationResults,
    ]);

    // Detect flaky tests
    const flakyTests = await this.detectFlakyTests([
      ...unitResults,
      ...integrationResults,
      ...e2eResults,
    ]);

    return this.buildResult(
      [...unitResults, ...integrationResults, ...e2eResults],
      coverage,
      flakyTests,
      coverage.percentage >= coverageThreshold ? 'passed' : 'coverage-failed'
    );
  }

  private async runParallel(
    suites: TestSuite[],
    parallelism: number
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const queue = [...suites];

    while (queue.length > 0) {
      const batch = queue.splice(0, parallelism);
      const batchResults = await Promise.all(
        batch.map(suite => this.runSuite(suite))
      );
      results.push(...batchResults);
    }

    return results;
  }

  private async detectFlakyTests(results: TestResult[]): Promise<FlakyTest[]> {
    const flaky: FlakyTest[] = [];

    for (const result of results) {
      // Re-run failed tests to detect flakiness
      for (const failure of result.failures) {
        const rerunResult = await this.rerunTest(failure.testId, 3);
        if (rerunResult.passedOnce) {
          flaky.push({
            testId: failure.testId,
            suite: result.suite,
            passRate: rerunResult.passRate,
          });
        }
      }
    }

    return flaky;
  }
}
```

## Integration Points
- Works with **Unit Test Generator** for test creation
- Coordinates with **Coverage Analyzer** for gaps
- Supports **CI Pipeline** for automation
