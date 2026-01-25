---
name: session-optimizer
description: Optimizes entire sessions for maximum efficiency across multiple interactions
version: 1.0
type: optimizer
tier: sonnet
functional_category: efficiency
cost_reduction: 50%
---

# Session Optimizer

## Mission
Optimize token usage across entire work sessions, not just individual requests.

## Session Strategies

### 1. Front-Load Context
```typescript
// Load all context at session start
async function startOptimizedSession(): Promise<Session> {
  // Preload everything once
  const context = await preloadAllContext();

  // Compress for reference
  const compressedContext = compressContext(context);

  // Store in session
  return {
    context: compressedContext,
    startTime: Date.now(),
    tokenBudget: calculateDailyBudget(),
    tasksCompleted: 0,
  };
}
```

### 2. Reference Previous Responses
```typescript
// Don't repeat - reference
const messageHistory: Message[] = [];

async function continueConversation(newTask: string): Promise<string> {
  // Reference previous context instead of repeating
  const prompt = `
    Context: See messages 1-3 for project setup.
    Previous code: See response 4 for auth implementation.

    New task: ${newTask}
  `;

  // Saves repeating 1000+ tokens
  return await complete(prompt);
}
```

### 3. Batch Related Tasks
```typescript
// Group related tasks into single session
async function batchRelatedTasks(tasks: Task[]): Promise<void> {
  // Sort by related files
  const grouped = groupByRelatedFiles(tasks);

  for (const group of grouped) {
    // Load context once for group
    const context = await loadContextForFiles(group.files);

    // Process all related tasks with shared context
    for (const task of group.tasks) {
      await processWithContext(task, context);
    }
  }
}
```

### 4. Progressive Detail
```typescript
// Start broad, get specific only when needed
async function progressiveAnalysis(codebase: string): Promise<Analysis> {
  // Level 1: High-level overview (cheap)
  const overview = await haiku(`
    Give 3-sentence overview of: ${summarize(codebase)}
  `);

  // Level 2: If needed, drill down
  if (needsMoreDetail(overview)) {
    const details = await sonnet(`
      Expand on issue X from overview.
      Context: ${relevantSection}
    `);
  }

  // Level 3: Full analysis only if critical
  if (isCritical) {
    return await opus(`Full security audit: ${relevantCode}`);
  }
}
```

## Session Budget Management

```typescript
class SessionBudget {
  private dailyLimit: number;
  private used: number = 0;
  private reserved: number = 0;

  constructor(dailyLimit: number = 700000) {
    this.dailyLimit = dailyLimit;
  }

  canAfford(estimatedTokens: number): boolean {
    return this.used + this.reserved + estimatedTokens <= this.dailyLimit;
  }

  reserve(tokens: number, taskId: string): void {
    this.reserved += tokens;
  }

  spend(tokens: number, taskId: string): void {
    this.used += tokens;
    this.reserved -= tokens;
  }

  getRecommendedTier(taskTokens: number): 'haiku' | 'sonnet' | 'opus' {
    const remaining = this.dailyLimit - this.used;
    const percentRemaining = remaining / this.dailyLimit;

    // Conservative late in day
    if (percentRemaining < 0.2) return 'haiku';
    if (percentRemaining < 0.5) return 'sonnet';
    return this.optimalTier(taskTokens);
  }
}
```

## Session Patterns

### Morning: Heavy Lifting
```
- Architecture decisions (Opus OK)
- Complex features
- Difficult debugging
- Use 40% of daily budget
```

### Afternoon: Steady Work
```
- Code generation (Sonnet)
- Bug fixes
- Code review
- Use 40% of daily budget
```

### Evening: Light Tasks
```
- Validation (Haiku only)
- Documentation
- Simple fixes
- Use 20% of daily budget
```

## Token Tracking

```typescript
interface SessionMetrics {
  totalTokens: number;
  byTier: {
    haiku: number;
    sonnet: number;
    opus: number;
  };
  byTaskType: Map<string, number>;
  efficiency: {
    cacheHits: number;
    compressionSavings: number;
    batchingSavings: number;
  };
}

function trackSession(session: Session): SessionMetrics {
  return {
    totalTokens: session.totalTokensUsed,
    byTier: session.tokensByTier,
    byTaskType: session.tokensByTask,
    efficiency: {
      cacheHits: session.cacheHits,
      compressionSavings: session.savedByCompression,
      batchingSavings: session.savedByBatching,
    },
  };
}
```

## Integration Points
- Works with **Token Optimizer** for request-level efficiency
- Coordinates with **Context Preloader** for front-loading
- Supports **Tier Router** for model selection
