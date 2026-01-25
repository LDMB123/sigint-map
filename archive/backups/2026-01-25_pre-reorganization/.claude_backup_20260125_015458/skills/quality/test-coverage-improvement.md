# Skill: Test Coverage Improvement

**ID**: `test-coverage-improvement`
**Category**: Quality
**Agent**: Coverage Analyzer

---

## When to Use
- Improving test coverage
- Identifying untested code
- Prioritizing testing efforts
- Meeting coverage requirements

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| coverage_report | string | yes | Path to coverage JSON |
| target | number | no | Target coverage percentage |

## Steps

### 1. Generate Coverage Report
```bash
npm run test -- --coverage --coverageReporters=json
```

### 2. Identify Gaps
```bash
# Find files with low coverage
npx coverage-check coverage/coverage-final.json --threshold 80
```

### 3. Prioritize by Risk
High priority (test first):
- Authentication/authorization code
- Payment processing
- Data validation
- API endpoints
- Core business logic

Lower priority:
- Configuration files
- Type definitions
- Generated code
- Development utilities

### 4. Generate Test Templates
```typescript
// For uncovered function
function calculateDiscount(price: number, percentage: number): number {
  if (percentage < 0 || percentage > 100) {
    throw new Error('Invalid percentage');
  }
  return price * (percentage / 100);
}

// Generated test
describe('calculateDiscount', () => {
  it('calculates discount correctly', () => {
    expect(calculateDiscount(100, 20)).toBe(20);
  });

  it('handles zero discount', () => {
    expect(calculateDiscount(100, 0)).toBe(0);
  });

  it('handles 100% discount', () => {
    expect(calculateDiscount(100, 100)).toBe(100);
  });

  it('throws on negative percentage', () => {
    expect(() => calculateDiscount(100, -1)).toThrow('Invalid percentage');
  });

  it('throws on percentage over 100', () => {
    expect(() => calculateDiscount(100, 101)).toThrow('Invalid percentage');
  });
});
```

## Coverage Targets
| Area | Minimum | Recommended |
|------|---------|-------------|
| Business Logic | 90% | 95% |
| API Handlers | 80% | 90% |
| UI Components | 70% | 80% |
| Utilities | 85% | 95% |
| Overall | 80% | 85% |
