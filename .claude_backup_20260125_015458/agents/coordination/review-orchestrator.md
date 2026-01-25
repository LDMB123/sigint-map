---
name: review-orchestrator
description: Orchestrates comprehensive code reviews using multiple specialized reviewers
version: 2.0
type: orchestrator
tier: sonnet
functional_category: orchestrator
implements: [EarlyTermination, TierAware]
---

# Review Orchestrator

## Mission
Coordinate comprehensive code reviews across security, performance, and quality dimensions.

## Performance Capabilities

### Progressive Deepening
- **Quick Scan** (Haiku): Surface-level checks, 5s for 100 files, $0.25
- **Standard Review** (Sonnet): Issue found → deep analysis, 30s, $2.00
- **Thorough Review** (Sonnet): All dimensions + fixes, 60s, $5.00
- **Cost Savings**: 60% average (most code is clean, no deep review needed)

### Early Termination
- **Trigger**: Critical security issue found
- **Action**: Skip performance/quality checks, flag immediately
- **Savings**: 40% time, 50% cost for vulnerable code

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

## Progressive Deepening Implementation

```typescript
interface EarlyTermination {
  shouldTerminate(intermediateResults: Finding[]): boolean {
    // Terminate early if critical security issue found
    return intermediateResults.some(
      f => f.category === 'security' && f.severity === 'critical'
    );
  }

  getTerminationReason(): string {
    return 'Critical security vulnerability detected - immediate attention required';
  }

  getMinResultsBeforeTermination(): number {
    return 1; // Can terminate after first critical finding
  }
}

interface TierAware {
  selectTier(files: string[], depth: string): 'haiku' | 'sonnet' {
    // Progressive deepening: start cheap, escalate if needed
    if (depth === 'quick') return 'haiku';

    // Check if files are likely clean (use historical data)
    const likelyClean = this.predictCleanCode(files);
    if (likelyClean) return 'haiku'; // Try Haiku first

    return 'sonnet'; // Default to Sonnet for standard/thorough
  }

  async cascadingReview(files: string[]): Promise<ReviewResult> {
    // Stage 1: Quick Haiku scan
    const quickScan = await haikuReviewer.quickScan(files);

    if (quickScan.findings.length === 0) {
      // Code is clean, skip deep review
      return {
        findings: [],
        summary: 'No issues detected in quick scan',
        score: 100,
        reviewers: ['haiku-quick-scan'],
      };
    }

    // Stage 2: Deep Sonnet review (only if issues found)
    if (this.shouldTerminate(quickScan.findings)) {
      // Critical issue, return immediately
      return {
        findings: quickScan.findings,
        summary: 'Critical security issue - immediate action required',
        score: 0,
        reviewers: ['haiku-quick-scan'],
      };
    }

    // Stage 3: Full review on problem areas only
    const problemFiles = this.extractProblemFiles(quickScan.findings);
    const deepReview = await sonnetReviewer.deepReview(problemFiles);

    return this.mergeResults(quickScan, deepReview);
  }
}
```

## Usage Example

```typescript
// Review 100 files with progressive deepening
const orchestrator = new ReviewOrchestrator();

// Scenario 1: Clean codebase (80% of reviews)
// - Haiku quick scan: 5s, $0.25
// - No issues found, skip deep review
// Total: 5s, $0.25 (vs 60s, $5.00 with full Sonnet review)
// Savings: 92% time, 95% cost

// Scenario 2: Issues found (20% of reviews)
// - Haiku quick scan: 5s, $0.25
// - Issues detected, deep Sonnet review on 10 problem files: 15s, $1.50
// Total: 20s, $1.75 (vs 60s, $5.00 with full Sonnet review)
// Savings: 67% time, 65% cost

const result = await orchestrator.cascadingReview(files);

if (result.score < 70) {
  console.log(`⚠️  Issues found: ${result.findings.length}`);
  console.log(`Quick scan detected problems, performed deep review`);
} else {
  console.log(`✅ Code quality: ${result.score}/100`);
  console.log(`Clean code - skipped expensive deep review`);
}
```

## Integration Points
- Works with **Security Validator** for security review
- Coordinates with **Performance Analyzer** for perf review
- Supports **Test Coverage Analyzer** for test review
- Uses **Progressive Deepening** pattern for cost optimization
