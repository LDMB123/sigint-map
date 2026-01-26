# Complexity Analyzer

Intelligent task complexity analysis for optimal model tier selection in the Cascading Tier System.

## Overview

The Complexity Analyzer examines task descriptions to calculate a complexity score (0-100) that determines which AI model tier should handle the task:

- **Haiku** (0-30): Simple validation, syntax checking, routing
- **Sonnet** (25-70): Implementation, debugging, refactoring
- **Opus** (65+): Architecture design, complex reasoning, system design

Overlap zones (25-30 and 65-70) enable graceful degradation - start with a lower tier and escalate if needed.

## Features

- **Multi-dimensional analysis**: Evaluates 6 different complexity signals
- **Weighted scoring**: Each signal contributes proportionally to overall complexity
- **Pattern detection**: Recognizes technical domains, file references, abstraction levels
- **Transparent breakdown**: Provides detailed signal analysis for debugging

## Usage

### Basic Analysis

```typescript
import { analyzeComplexity } from './complexity-analyzer';

const task = {
  description: 'Implement user authentication with JWT'
};

const score = analyzeComplexity(task);
console.log(`Complexity: ${score}/100`);
```

### Tier Recommendation

```typescript
import { analyzeTier } from './complexity-analyzer';

const task = {
  description: 'Design a microservices architecture for e-commerce'
};

const result = analyzeTier(task);
console.log(`Recommended tier: ${result.tier}`); // 'haiku', 'sonnet', or 'opus'
console.log(`Score: ${result.score}`);
```

### Detailed Breakdown

```typescript
import { analyzeComplexityDetailed } from './complexity-analyzer';

const task = {
  description: 'Refactor authentication across multiple files',
  context: {
    fileCount: 5
  }
};

const breakdown = analyzeComplexityDetailed(task);
console.log('Signals:', breakdown.signals);
console.log('Contributions:', breakdown.contributions);
```

## Complexity Signals

### 1. Token Count (Weight: 0.15)
- Approximation: character count / 4
- Longer descriptions → higher complexity
- Contribution: `(tokenCount / 1000) × 0.15`

### 2. Question Count (Weight: 0.20)
- Detects: `?`, question words (how, what, why), implicit questions (should, could, consider)
- More questions → more decision-making required
- Contribution: `questionCount × 10 × 0.20`

### 3. Step Count (Weight: 0.20)
- Detects: sequence words (first, then, next), bullet points, numbered lists, action verbs
- More steps → more complex workflow
- Contribution: `stepCount × 8 × 0.20`

### 4. Domain Count (Weight: 0.15)
- Recognizes: frameworks, languages, databases, infrastructure, testing tools
- Cross-domain tasks require broader knowledge
- Contribution: `domainCount × 15 × 0.15`

### 5. File Count (Weight: 0.10)
- Extracted from: file references in description, context.fileCount
- Multi-file changes increase coordination complexity
- Contribution: `fileCount × 5 × 0.10`

### 6. Abstraction Level (Weight: 0.20)
- Scale: 1-5
  - **Level 1**: Code-level (function, variable, loop)
  - **Level 2**: Feature-level (feature, behavior, workflow)
  - **Level 3**: Component-level (module, interface, encapsulation)
  - **Level 4**: Pattern-level (design patterns, dependency injection)
  - **Level 5**: Architecture-level (system design, microservices, scalability)
- Contribution: `abstractionLevel × 20 × 0.20`

## Scoring Formula

```
score =
  (tokenCount / 1000 × 0.15) +
  (questionCount × 10 × 0.20) +
  (stepCount × 8 × 0.20) +
  (domainCount × 15 × 0.15) +
  (fileCount × 5 × 0.10) +
  (abstractionLevel × 20 × 0.20)
```

Maximum theoretical score: ~100 (capped at 100)

## Examples

### Haiku Tier (Score: 0-30)

```typescript
// Score: ~6
{
  description: 'Fix typo in README.md'
}

// Score: ~4
{
  description: 'Validate JSON syntax in config files'
}
```

### Sonnet Tier (Score: 25-70)

```typescript
// Score: ~35
{
  description: `
    Design a microservices architecture for an e-commerce platform.
    How should we handle service communication?
    What about data consistency?
  `
}

// Score: ~45
{
  description: `
    Investigate performance degradation across the system.
    What bottlenecks exist? How can we optimize?
    Should we implement caching?
  `
}
```

### Opus Tier (Score: 65+)

```typescript
// Score: ~70+
{
  description: `
    Design and implement a distributed event-driven architecture.
    How should we ensure data consistency across services?
    What patterns for saga orchestration vs choreography?
    Which message broker (Kafka vs RabbitMQ vs NATS)?
    How to handle circuit breakers and retries?
    Plan migration from monolith with zero downtime.
    Consider: scalability, fault tolerance, observability, security.
    Implement across 15+ microservices with different data stores.
  `
}
```

## Integration with Cascading Tier System

The analyzer is designed to work with the broader tier selection system:

1. **Complexity Analyzer** (this module) → Calculates initial score
2. **Tier Selector** → Chooses starting tier based on score
3. **Execution Engine** → Runs task with selected tier
4. **Quality Validator** → Validates output quality
5. **Escalation Handler** → Upgrades tier if validation fails

## API Reference

### `analyzeComplexity(task: Task): number`
Returns complexity score (0-100) for the task.

### `analyzeTier(task: Task): { tier, score, breakdown }`
Returns recommended tier, score, and detailed breakdown.

### `analyzeComplexityDetailed(task: Task): ComplexityBreakdown`
Returns full breakdown including signals and contributions.

### `extractSignals(task: Task): ComplexitySignals`
Extracts raw complexity signals from task.

### `calculateComplexity(signals: ComplexitySignals): number`
Calculates score from pre-extracted signals.

### `getRecommendedTier(score: number): TierRecommendation`
Converts score to tier recommendation ('haiku', 'sonnet', 'opus').

## Testing

Run the example suite:

```bash
npx tsx complexity-analyzer.example.ts
```

Run unit tests (requires test runner):

```bash
npm test complexity-analyzer.test.ts
```

## Performance

- **Computation**: O(n) where n = description length
- **Memory**: Minimal (no large data structures)
- **Latency**: < 1ms for typical task descriptions

## Future Enhancements

- Historical success rate tracking per task type
- Machine learning model for pattern recognition
- Custom domain dictionaries per project
- Context-aware file dependency analysis
- Integration with actual embedding models for semantic analysis

## Version

**Version**: 1.0.0
**Last Updated**: 2025-01-25
**Specification**: `.claude/optimization/CASCADING_TIERS.md`
