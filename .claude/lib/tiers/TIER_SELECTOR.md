# Tier Selector

Intelligent model tier selection with complexity analysis and distribution tracking for the Cascading Tier System.

## Overview

The tier selection system automatically determines the optimal Claude model tier (Haiku, Sonnet, or Opus) based on task complexity analysis. It includes:

- **Complexity-based scoring**: Analyzes task characteristics to produce a 0-100 complexity score
- **Overlap zone handling**: Manages boundary cases with escalation support
- **Distribution tracking**: Monitors tier usage to maintain cost efficiency
- **Validation**: Ensures distribution matches target ratios (60% Haiku, 35% Sonnet, 5% Opus)

## Quick Start

```typescript
import { selectTier, createDistributionTracker } from '@claude/lib/tiers';

// Select tier for a task
const task = { description: 'Implement user authentication' };
const selection = selectTier(task);

console.log(selection.tier);        // 'haiku' | 'sonnet' | 'opus'
console.log(selection.score);       // 0-100 complexity score
console.log(selection.reason);      // Human-readable explanation

// Track distribution over time
const tracker = createDistributionTracker();
tracker.record(selection.tier);

// Validate distribution
const validation = tracker.validate();
if (!validation.isValid) {
  console.log(validation.recommendations);
}
```

## Tier Mapping

Complexity scores map to tiers with overlapping boundaries:

| Tier   | Score Range | Description                          | Overlap Zone |
|--------|-------------|--------------------------------------|--------------|
| Haiku  | 0-30        | Simple, routine tasks                | 25-30        |
| Sonnet | 25-70       | Medium complexity, multi-step tasks  | 25-30, 65-70 |
| Opus   | 65+         | Complex, architectural tasks         | 65-70        |

### Overlap Zones

**Lower Overlap (25-30)**: Haiku/Sonnet boundary
- Default: Try Haiku first
- Can escalate to Sonnet if needed
- Use case: Tasks that might be simple but could require more reasoning

**Upper Overlap (65-70)**: Sonnet/Opus boundary
- Default: Try Sonnet first
- Can escalate to Opus if needed
- Use case: Complex tasks that might not need top-tier reasoning

## API Reference

### Core Functions

#### `selectTier(task: Task): TierSelection`

Main tier selection function with full metadata.

```typescript
const selection = selectTier({
  description: 'Implement feature X',
  context: { fileCount: 5 },
  metadata: { priority: 'high' }
});

// Returns:
{
  tier: 'sonnet',
  score: 45.2,
  breakdown: { /* complexity details */ },
  inOverlapZone: false,
  canEscalate: false,
  escalationTier: undefined,
  reason: 'Medium complexity task (score: 45.2) - requires Sonnet capabilities'
}
```

#### `selectTierSimple(task: Task): TierRecommendation`

Simplified tier selection returning only the tier name.

```typescript
const tier = selectTierSimple({ description: 'Fix typo' });
// Returns: 'haiku'
```

#### `analyzeBatch(tasks: Task[]): BatchAnalysisResult`

Analyze multiple tasks and get distribution statistics.

```typescript
const tasks = [
  { description: 'Fix bug' },
  { description: 'Add feature' },
  { description: 'Design architecture' }
];

const result = analyzeBatch(tasks);
// Returns: { selections, distribution, percentages, validation }
```

### Distribution Tracking

#### `TierDistributionTracker`

Class for tracking tier usage over time.

```typescript
const tracker = createDistributionTracker();

// Record selections
tracker.record('haiku');
tracker.recordBatch(['haiku', 'sonnet', 'opus']);

// Get statistics
const counts = tracker.getCounts();
const percentages = tracker.getPercentages();
const validation = tracker.validate();

// Get formatted summary
console.log(tracker.getSummary());

// Reset
tracker.reset();
```

## Target Distribution

The system targets the following distribution for cost optimization:

- **Haiku**: 60% - Simple, routine tasks
- **Sonnet**: 35% - Medium complexity tasks
- **Opus**: 5% - Complex, high-value tasks

### Acceptable Deviation

The system allows ±5 percentage points deviation from target before flagging distribution issues.

## Usage Patterns

### Pattern 1: Single Task Selection

```typescript
import { selectTier } from '@claude/lib/tiers';

const task = {
  description: 'Implement user login with email and password',
  context: {
    fileCount: 3,
    files: ['auth.ts', 'login.tsx', 'api.ts']
  }
};

const selection = selectTier(task);

// Use the recommended tier
await executeWithModel(selection.tier, task);

// If in overlap zone and task fails, escalate
if (selection.canEscalate && taskFailed) {
  await executeWithModel(selection.escalationTier!, task);
}
```

### Pattern 2: Batch Processing with Distribution Validation

```typescript
import { analyzeBatch } from '@claude/lib/tiers';

const tasks = await loadTaskQueue();
const analysis = analyzeBatch(tasks);

// Check if distribution is healthy
if (!analysis.validation.isValid) {
  console.warn('Distribution deviates from target:');
  analysis.validation.recommendations.forEach(rec => {
    console.log(`  - ${rec}`);
  });
}

// Process tasks with recommended tiers
for (const [index, task] of tasks.entries()) {
  const selection = analysis.selections[index];
  await processTask(task, selection.tier);
}
```

### Pattern 3: Continuous Distribution Monitoring

```typescript
import { createDistributionTracker } from '@claude/lib/tiers';

class TaskProcessor {
  private tracker = createDistributionTracker();

  async processTask(task: Task) {
    const selection = selectTier(task);
    this.tracker.record(selection.tier);

    // Log distribution every 100 tasks
    if (this.tracker.getCounts().total % 100 === 0) {
      console.log(this.tracker.getSummary());
    }

    await executeTask(task, selection.tier);
  }

  getDistributionReport() {
    return this.tracker.getSummary();
  }
}
```

### Pattern 4: Smart Escalation

```typescript
import { selectTier } from '@claude/lib/tiers';

async function processWithEscalation(task: Task) {
  const selection = selectTier(task);

  try {
    // Try recommended tier first
    const result = await executeTask(task, selection.tier);
    return result;
  } catch (error) {
    // If in overlap zone, try escalation
    if (selection.canEscalate && isComplexityError(error)) {
      console.log(`Escalating from ${selection.tier} to ${selection.escalationTier}`);
      return await executeTask(task, selection.escalationTier!);
    }
    throw error;
  }
}
```

## Best Practices

### 1. Provide Rich Task Descriptions

The complexity analyzer works best with detailed task descriptions:

```typescript
// Poor: Vague, minimal information
const task = { description: 'Fix auth' };

// Good: Clear, detailed description
const task = {
  description: `
    Fix authentication bug where users are logged out unexpectedly
    - Investigate session timeout issue
    - Review JWT token expiration logic
    - Add refresh token support
    - Update tests
  `
};
```

### 2. Include Context Metadata

Provide file counts and other context for better accuracy:

```typescript
const task = {
  description: 'Refactor user module',
  context: {
    fileCount: 12,
    files: ['user.ts', 'user.service.ts', 'user.controller.ts', ...],
    linesChanged: 500
  }
};
```

### 3. Monitor Distribution Regularly

Track tier usage over time to ensure cost efficiency:

```typescript
// Daily distribution check
const tracker = loadDailyTracker();
const validation = tracker.validate();

if (!validation.isValid) {
  alertTeam('Tier distribution outside target range', validation);
}
```

### 4. Use Escalation Strategically

Escalate tasks in overlap zones when initial tier fails:

```typescript
const selection = selectTier(task);

if (selection.inOverlapZone) {
  console.log(`Task in overlap zone (score: ${selection.score})`);
  console.log(`Trying ${selection.tier} first, ${selection.escalationTier} available`);
}
```

## Constants

### `TARGET_DISTRIBUTION`

Target tier distribution percentages:

```typescript
{
  haiku: 60,   // 60% of tasks
  sonnet: 35,  // 35% of tasks
  opus: 5      // 5% of tasks
}
```

### `ACCEPTABLE_DEVIATION`

Acceptable deviation from target: ±5 percentage points

### `OVERLAP_ZONES`

Overlap zone boundaries:

```typescript
{
  lower: { min: 25, max: 30 },  // Haiku/Sonnet boundary
  upper: { min: 65, max: 70 }   // Sonnet/Opus boundary
}
```

## Type Definitions

### `TierSelection`

Complete tier selection result:

```typescript
interface TierSelection {
  tier: TierRecommendation;           // Selected tier
  score: number;                      // Complexity score (0-100)
  breakdown: ComplexityBreakdown;     // Detailed scoring breakdown
  inOverlapZone: boolean;             // Whether score is in overlap zone
  canEscalate: boolean;               // Whether escalation is available
  escalationTier?: TierRecommendation; // Next tier if escalation needed
  reason: string;                     // Human-readable explanation
}
```

### `TierDistribution`

Tier usage counts:

```typescript
interface TierDistribution {
  haiku: number;   // Haiku task count
  sonnet: number;  // Sonnet task count
  opus: number;    // Opus task count
  total: number;   // Total task count
}
```

### `DistributionValidation`

Distribution validation result:

```typescript
interface DistributionValidation {
  isValid: boolean;                          // Within acceptable deviation
  current: TierDistributionPercentages;      // Current percentages
  target: TierDistributionPercentages;       // Target percentages
  deviations: {                              // Deviation from target
    haiku: number;
    sonnet: number;
    opus: number;
  };
  recommendations: string[];                 // Actionable recommendations
}
```

## Testing

Run the test suite:

```bash
npx vitest run .claude/lib/tiers/tier-selector.test.ts
```

Run examples:

```bash
npx tsx .claude/lib/tiers/tier-selector.example.ts
```

## Files

- `tier-selector.ts` - Main tier selection implementation
- `tier-selector.test.ts` - Comprehensive test suite (31 tests)
- `tier-selector.example.ts` - Usage examples
- `TIER_SELECTOR.md` - This documentation

## See Also

- [Complexity Analyzer](./complexity-analyzer.ts) - Task complexity scoring engine
- [README.md](./README.md) - Complexity analyzer documentation
