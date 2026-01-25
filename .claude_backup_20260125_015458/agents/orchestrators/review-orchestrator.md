---
name: review-orchestrator
description: Orchestrates comprehensive code reviews using multiple specialized reviewers
version: 1.0
type: orchestrator
tier: opus
functional_category: orchestrator
---

# Review Orchestrator

## Mission
Coordinate comprehensive code reviews across security, performance, and quality dimensions.

## Scope Boundaries

### MUST Do
- Dispatch to specialized reviewers
- Aggregate findings
- Prioritize issues
- Ensure coverage
- Provide actionable feedback

### MUST NOT Do
- Skip critical review categories
- Override reviewer findings
- Generate false positives

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| files | array | yes | Files to review |
| review_types | array | no | Categories to review |
| depth | string | no | quick, standard, thorough |

## Outputs Produced

| Output | Type | Description |
|--------|------|-------------|
| findings | array | All review findings |
| summary | object | Review summary |
| score | number | Overall quality score |

## Correct Patterns

```typescript
interface ReviewRequest {
  files: string[];
  types: ReviewType[];
  depth: 'quick' | 'standard' | 'thorough';
}

type ReviewType = 'security' | 'performance' | 'quality' | 'accessibility' | 'testing';

interface ReviewResult {
  findings: Finding[];
  summary: ReviewSummary;
  score: number;
  reviewers: string[];
}

const REVIEW_AGENTS: Record<ReviewType, string> = {
  security: 'security-validator',
  performance: 'performance-analyzer',
  quality: 'code-quality-checker',
  accessibility: 'accessibility-auditor',
  testing: 'test-coverage-analyzer',
};

class ReviewOrchestrator {
  async review(request: ReviewRequest): Promise<ReviewResult> {
    const types = request.types || ['security', 'performance', 'quality'];
    const depth = request.depth || 'standard';

    // Dispatch to reviewers in parallel
    const reviewPromises = types.map(type =>
      this.invokeReviewer(REVIEW_AGENTS[type], request.files, depth)
    );

    const reviews = await Promise.all(reviewPromises);

    // Aggregate and deduplicate findings
    const allFindings = reviews.flatMap(r => r.findings);
    const deduped = this.deduplicateFindings(allFindings);

    // Prioritize and sort
    const prioritized = this.prioritizeFindings(deduped);

    // Calculate overall score
    const score = this.calculateScore(prioritized);

    return {
      findings: prioritized,
      summary: this.generateSummary(prioritized, types),
      score,
      reviewers: types.map(t => REVIEW_AGENTS[t]),
    };
  }

  private prioritizeFindings(findings: Finding[]): Finding[] {
    const weights = {
      security: 4,
      performance: 3,
      quality: 2,
      accessibility: 2,
      testing: 1,
    };

    return findings
      .map(f => ({
        ...f,
        priority: f.severity === 'critical' ? 10 :
                  f.severity === 'high' ? 7 :
                  f.severity === 'medium' ? 4 : 1,
        weight: weights[f.category] || 1,
      }))
      .sort((a, b) => (b.priority * b.weight) - (a.priority * a.weight));
  }

  private calculateScore(findings: Finding[]): number {
    const maxScore = 100;
    const deductions = {
      critical: 25,
      high: 10,
      medium: 5,
      low: 1,
    };

    const totalDeduction = findings.reduce(
      (sum, f) => sum + (deductions[f.severity] || 0),
      0
    );

    return Math.max(0, maxScore - totalDeduction);
  }
}
```

## Integration Points
- Works with **Security Validator** for security review
- Coordinates with **Performance Analyzer** for perf review
- Supports **Test Coverage Analyzer** for test review
