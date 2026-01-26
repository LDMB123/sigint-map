/**
 * Escalation Engine Examples
 * Demonstrates practical usage of automatic tier escalation
 */

import {
  EscalationEngine,
  escalateWithRetry,
  createExecutionResult,
  type ExecutionResult,
  type ModelTier,
  type Task
} from './escalation-engine';

/**
 * Example 1: Basic escalation on quality failure
 */
async function example1_BasicEscalation() {
  console.log('\n=== Example 1: Basic Escalation ===\n');

  const engine = new EscalationEngine();
  const task: Task = {
    description: 'Implement user authentication with JWT tokens'
  };

  // Simulate a low-quality response from Haiku
  const haikuResult = createExecutionResult(
    'haiku',
    'Add JWT library and create token function',
    {
      durationMs: 800,
      tokenCount: 30,
      truncated: false,
      qualityScore: 0.5 // Below threshold
    }
  );

  const decision = engine.evaluateEscalation(haikuResult, 'haiku', task);

  console.log('Haiku result quality:', haikuResult.metadata.qualityScore);
  console.log('Should escalate:', decision.shouldEscalate);
  console.log('Reason:', decision.reason);
  console.log('Next tier:', decision.nextTier);
  console.log('Confidence:', decision.confidence);

  if (decision.shouldEscalate) {
    engine.recordEscalation('haiku', 'sonnet', decision.reason!, haikuResult);
  }

  console.log('\nStatistics:', engine.getStatistics());
}

/**
 * Example 2: Context preservation across escalations
 */
async function example2_ContextPreservation() {
  console.log('\n=== Example 2: Context Preservation ===\n');

  const engine = new EscalationEngine();
  const task: Task = {
    description: 'Refactor authentication system across multiple files',
    context: {
      fileCount: 8,
      affectedComponents: ['auth', 'user', 'session']
    }
  };

  // First attempt with Haiku - partial success
  const haikuResult = createExecutionResult(
    'haiku',
    'Started refactoring auth.ts...',
    {
      durationMs: 1500,
      tokenCount: 150,
      truncated: true // Incomplete
    }
  );
  haikuResult.context = {
    filesProcessed: ['auth.ts'],
    remainingFiles: ['user.ts', 'session.ts', 'middleware.ts']
  };

  // Preserve context for escalation
  const preservedContext = engine.preserveContext(haikuResult, task);

  console.log('Original task:', task.description);
  console.log('Haiku result was truncated:', haikuResult.metadata.truncated);
  console.log('\nPreserved context:');
  console.log('- Original task:', preservedContext.originalTask.description);
  console.log('- Failed tier:', preservedContext.failedAttempt.tier);
  console.log('- Files processed:', preservedContext.filesProcessed);
  console.log('- Remaining files:', preservedContext.remainingFiles);

  // Record escalation
  engine.recordEscalation('haiku', 'sonnet', 'truncated-output', haikuResult, preservedContext);

  console.log('\nEscalation recorded with preserved context');
}

/**
 * Example 3: Automatic retry with escalation
 */
async function example3_AutomaticRetry() {
  console.log('\n=== Example 3: Automatic Retry with Escalation ===\n');

  const task: Task = {
    description: 'Design a distributed caching system with Redis'
  };

  // Mock executor that fails on lower tiers
  const executor = async (tier: ModelTier, context?: Record<string, any>) => {
    console.log(`\nAttempting with tier: ${tier}`);

    if (context?.failedAttempt) {
      console.log(`  (escalated from ${context.failedAttempt.tier})`);
    }

    // Simulate tier-specific responses
    if (tier === 'haiku') {
      return createExecutionResult(
        'haiku',
        'Use Redis for caching',
        {
          durationMs: 500,
          tokenCount: 20,
          truncated: false,
          qualityScore: 0.4 // Too low
        }
      );
    }

    if (tier === 'sonnet') {
      return createExecutionResult(
        'sonnet',
        'Implement Redis with connection pooling and basic caching strategies',
        {
          durationMs: 1500,
          tokenCount: 100,
          truncated: false,
          qualityScore: 0.7 // Marginal, but let's say it passes
        }
      );
    }

    return createExecutionResult(
      'opus',
      'Complete distributed caching architecture with Redis Cluster, failover strategies, cache invalidation patterns, and performance optimization',
      {
        durationMs: 3000,
        tokenCount: 500,
        truncated: false,
        confidence: 0.95,
        qualityScore: 0.95
      }
    );
  };

  const { result, escalations } = await escalateWithRetry(
    task,
    executor,
    'haiku'
  );

  console.log('\n--- Final Result ---');
  console.log('Final tier:', result.tier);
  console.log('Success:', result.success);
  console.log('Total escalations:', escalations);
  console.log('Response preview:', result.response?.substring(0, 80) + '...');
}

/**
 * Example 4: Monitoring escalation rate
 */
async function example4_MonitoringEscalationRate() {
  console.log('\n=== Example 4: Monitoring Escalation Rate ===\n');

  const engine = new EscalationEngine();

  // Simulate 100 executions with varying success rates
  console.log('Simulating 100 executions...\n');

  for (let i = 0; i < 100; i++) {
    const tier = i < 70 ? 'haiku' : i < 90 ? 'sonnet' : 'opus';
    const needsEscalation = Math.random() < 0.15; // 15% escalation rate

    if (needsEscalation && tier !== 'opus') {
      const nextTier = tier === 'haiku' ? 'sonnet' : 'opus';
      const reasons = ['low-confidence', 'truncated-output', 'quality-threshold'] as const;
      const reason = reasons[Math.floor(Math.random() * reasons.length)];

      engine.recordEscalation(tier, nextTier, reason);
    } else {
      engine.recordExecution(tier, Math.random() * 2000);
    }
  }

  const stats = engine.getStatistics();
  const health = engine.getHealthStatus();

  console.log('=== Statistics ===');
  console.log('Total executions:', stats.totalExecutions);
  console.log('Total escalations:', stats.totalEscalations);
  console.log('Escalation rate:', `${(stats.escalationRate * 100).toFixed(2)}%`);
  console.log('Target rate:', '20%');
  console.log('\n=== Escalation Breakdown ===');
  console.log('Haiku → Sonnet:', stats.escalationsByTransition['haiku-to-sonnet']);
  console.log('Haiku → Opus:', stats.escalationsByTransition['haiku-to-opus']);
  console.log('Sonnet → Opus:', stats.escalationsByTransition['sonnet-to-opus']);
  console.log('\n=== Health Status ===');
  console.log('Status:', health.status);
  console.log('Message:', health.message);
  console.log('Within target:', engine.isWithinTarget() ? 'Yes' : 'No');
}

/**
 * Example 5: Escalation by reason analysis
 */
async function example5_EscalationReasonAnalysis() {
  console.log('\n=== Example 5: Escalation Reason Analysis ===\n');

  const engine = new EscalationEngine();

  // Simulate various escalation scenarios
  const scenarios = [
    { reason: 'low-confidence' as const, count: 5 },
    { reason: 'truncated-output' as const, count: 8 },
    { reason: 'quality-threshold' as const, count: 3 },
    { reason: 'complexity-mismatch' as const, count: 6 },
    { reason: 'context-overflow' as const, count: 2 },
    { reason: 'validation-error' as const, count: 4 }
  ];

  for (const scenario of scenarios) {
    for (let i = 0; i < scenario.count; i++) {
      engine.recordEscalation('haiku', 'sonnet', scenario.reason);
    }
  }

  const stats = engine.getStatistics();

  console.log('=== Escalations by Reason ===');
  const sortedReasons = Object.entries(stats.escalationsByReason)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  for (const [reason, count] of sortedReasons) {
    const percentage = (count / stats.totalEscalations * 100).toFixed(1);
    console.log(`${reason.padEnd(25)} ${count.toString().padStart(3)} (${percentage}%)`);
  }

  console.log('\n=== Insights ===');
  if (stats.escalationsByReason['truncated-output'] > stats.totalEscalations * 0.3) {
    console.log('⚠️  High truncation rate - consider increasing context windows');
  }
  if (stats.escalationsByReason['complexity-mismatch'] > stats.totalEscalations * 0.2) {
    console.log('⚠️  Frequent complexity mismatches - improve initial tier selection');
  }
  if (stats.escalationsByReason['low-confidence'] > stats.totalEscalations * 0.2) {
    console.log('⚠️  High low-confidence rate - review model prompts and instructions');
  }
}

/**
 * Example 6: Custom configuration
 */
async function example6_CustomConfiguration() {
  console.log('\n=== Example 6: Custom Configuration ===\n');

  // Create engine with stricter quality thresholds
  const strictEngine = new EscalationEngine({
    qualityThresholds: {
      minConfidence: 0.85,      // Higher than default 0.7
      minQualityScore: 0.85,    // Higher than default 0.75
      maxTruncationRatio: 0.02, // Stricter than default 0.05
      minCompleteness: 0.95     // Higher than default 0.9
    },
    targetEscalationRate: 0.15, // Lower target (15% vs 20%)
    maxEscalations: 3           // Allow more attempts
  });

  const config = strictEngine.getConfig();

  console.log('=== Strict Configuration ===');
  console.log('Min confidence:', config.qualityThresholds.minConfidence);
  console.log('Min quality score:', config.qualityThresholds.minQualityScore);
  console.log('Target escalation rate:', `${(config.targetEscalationRate * 100).toFixed(0)}%`);
  console.log('Max escalations:', config.maxEscalations);

  // Test with marginal quality response
  const marginalResult = createExecutionResult(
    'haiku',
    'Response',
    {
      durationMs: 500,
      tokenCount: 50,
      truncated: false,
      confidence: 0.75, // Would pass default (0.7) but fails strict (0.85)
      qualityScore: 0.8  // Would pass default (0.75) but fails strict (0.85)
    }
  );

  const decision = strictEngine.evaluateEscalation(marginalResult, 'haiku');

  console.log('\n=== Escalation Decision (Strict Thresholds) ===');
  console.log('Should escalate:', decision.shouldEscalate);
  console.log('Reason:', decision.reason);
  console.log('Next tier:', decision.nextTier);
}

/**
 * Example 7: Export and import history
 */
async function example7_HistoryPersistence() {
  console.log('\n=== Example 7: History Persistence ===\n');

  const engine = new EscalationEngine();

  // Record some escalations
  engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
  engine.recordEscalation('haiku', 'sonnet', 'truncated-output');
  engine.recordEscalation('sonnet', 'opus', 'complexity-mismatch');

  console.log('Original engine:');
  console.log('Total escalations:', engine.getStatistics().totalEscalations);

  // Export history
  const history = engine.exportHistory();
  console.log('\nExported history entries:', history.length);

  // Create new engine and import
  const newEngine = new EscalationEngine();
  newEngine.importHistory(history);

  console.log('\nNew engine after import:');
  console.log('Total escalations:', newEngine.getStatistics().totalEscalations);

  const stats = newEngine.getStatistics();
  console.log('Haiku → Sonnet:', stats.escalationsByTransition['haiku-to-sonnet']);
  console.log('Sonnet → Opus:', stats.escalationsByTransition['sonnet-to-opus']);
}

/**
 * Run all examples
 */
async function runAllExamples() {
  await example1_BasicEscalation();
  await example2_ContextPreservation();
  await example3_AutomaticRetry();
  await example4_MonitoringEscalationRate();
  await example5_EscalationReasonAnalysis();
  await example6_CustomConfiguration();
  await example7_HistoryPersistence();

  console.log('\n=== All Examples Complete ===\n');
}

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  example1_BasicEscalation,
  example2_ContextPreservation,
  example3_AutomaticRetry,
  example4_MonitoringEscalationRate,
  example5_EscalationReasonAnalysis,
  example6_CustomConfiguration,
  example7_HistoryPersistence
};
