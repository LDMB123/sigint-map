/**
 * Escalation Engine Tests
 * Comprehensive test suite for automatic tier escalation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EscalationEngine,
  createExecutionResult,
  escalateWithRetry,
  type ExecutionResult,
  type ModelTier,
  type EscalationDecision,
  type Task
} from './escalation-engine';

describe('EscalationEngine', () => {
  let engine: EscalationEngine;

  beforeEach(() => {
    engine = new EscalationEngine();
  });

  describe('evaluateEscalation', () => {
    it('should not escalate when output meets quality thresholds', () => {
      const result = createExecutionResult(
        'haiku',
        'High quality response with detailed explanation',
        {
          durationMs: 1000,
          tokenCount: 100,
          truncated: false,
          confidence: 0.95,
          qualityScore: 0.9
        }
      );

      const decision = engine.evaluateEscalation(result, 'haiku');

      expect(decision.shouldEscalate).toBe(false);
      expect(decision.confidence).toBeGreaterThan(0.9);
    });

    it('should escalate on low confidence', () => {
      const result = createExecutionResult(
        'haiku',
        'Uncertain response',
        {
          durationMs: 1000,
          tokenCount: 50,
          truncated: false,
          confidence: 0.5 // Below threshold of 0.7
        }
      );

      const decision = engine.evaluateEscalation(result, 'haiku');

      expect(decision.shouldEscalate).toBe(true);
      expect(decision.reason).toBe('low-confidence');
      expect(decision.nextTier).toBe('sonnet');
    });

    it('should escalate on truncated output', () => {
      const result = createExecutionResult(
        'haiku',
        'Incomplete response...',
        {
          durationMs: 1000,
          tokenCount: 30,
          truncated: true,
          confidence: 0.8
        }
      );

      const decision = engine.evaluateEscalation(result, 'haiku');

      expect(decision.shouldEscalate).toBe(true);
      expect(decision.reason).toBe('truncated-output');
      expect(decision.nextTier).toBe('sonnet');
    });

    it('should escalate on quality threshold failure', () => {
      const result = createExecutionResult(
        'sonnet',
        'Low quality response',
        {
          durationMs: 2000,
          tokenCount: 40,
          truncated: false,
          qualityScore: 0.5 // Below threshold of 0.75
        }
      );

      const decision = engine.evaluateEscalation(result, 'sonnet');

      expect(decision.shouldEscalate).toBe(true);
      expect(decision.reason).toBe('quality-threshold');
      expect(decision.nextTier).toBe('opus');
    });

    it('should escalate on validation error', () => {
      const result = createExecutionResult(
        'haiku',
        '',
        {
          durationMs: 500,
          tokenCount: 0,
          truncated: false
        },
        'validation failed: missing required fields'
      );

      const decision = engine.evaluateEscalation(result, 'haiku');

      expect(decision.shouldEscalate).toBe(true);
      expect(decision.reason).toBe('validation-error');
    });

    it('should escalate on parsing failure', () => {
      const result = createExecutionResult(
        'haiku',
        'Invalid JSON{{{',
        {
          durationMs: 500,
          tokenCount: 10,
          truncated: false
        },
        'parse error: unexpected token'
      );

      const decision = engine.evaluateEscalation(result, 'haiku');

      expect(decision.shouldEscalate).toBe(true);
      expect(decision.reason).toBe('parsing-failure');
    });

    it('should escalate on context overflow', () => {
      const result = createExecutionResult(
        'haiku',
        '',
        {
          durationMs: 100,
          tokenCount: 0,
          truncated: false
        },
        'context limit exceeded: token limit reached'
      );

      const decision = engine.evaluateEscalation(result, 'haiku');

      expect(decision.shouldEscalate).toBe(true);
      expect(decision.reason).toBe('context-overflow');
      expect(decision.confidence).toBe(1.0);
    });

    it('should escalate on timeout', () => {
      const result = createExecutionResult(
        'haiku',
        '',
        {
          durationMs: 35000, // Exceeds 30s timeout for haiku
          tokenCount: 0,
          truncated: false
        },
        'timeout exceeded'
      );

      const decision = engine.evaluateEscalation(result, 'haiku');

      expect(decision.shouldEscalate).toBe(true);
      expect(decision.reason).toBe('timeout');
    });

    it('should detect complexity mismatch for architecture tasks on haiku', () => {
      const task: Task = {
        description: `Design a distributed microservices architecture with event-driven patterns and message queues for async processing. The system needs to handle high throughput with multiple services communicating through REST APIs and gRPC. How should we handle service communication, data consistency across services, and ensure scalability? What patterns should we use for fault tolerance, circuit breakers, and retry logic? Consider using Kafka or RabbitMQ for message brokering. We need to design the system to support millions of requests per day with low latency requirements.`
      };

      const result = createExecutionResult(
        'haiku',
        'Use REST APIs',
        {
          durationMs: 500,
          tokenCount: 20,
          truncated: false,
          qualityScore: 0.8 // Set higher to avoid quality-threshold triggering first
        }
      );

      const decision = engine.evaluateEscalation(result, 'haiku', task);

      expect(decision.shouldEscalate).toBe(true);
      expect(decision.reason).toBe('complexity-mismatch');
    });

    it('should not escalate beyond opus tier', () => {
      const result = createExecutionResult(
        'opus',
        'Low quality',
        {
          durationMs: 5000,
          tokenCount: 10,
          truncated: false,
          qualityScore: 0.3
        }
      );

      const decision = engine.evaluateEscalation(result, 'opus');

      expect(decision.shouldEscalate).toBe(false);
      expect(decision.details).toContain('highest tier');
    });

    it('should escalate haiku to sonnet', () => {
      const result = createExecutionResult(
        'haiku',
        '',
        {
          durationMs: 500,
          tokenCount: 0,
          truncated: true
        }
      );

      const decision = engine.evaluateEscalation(result, 'haiku');

      expect(decision.nextTier).toBe('sonnet');
    });

    it('should escalate sonnet to opus', () => {
      const result = createExecutionResult(
        'sonnet',
        '',
        {
          durationMs: 1000,
          tokenCount: 0,
          truncated: true
        }
      );

      const decision = engine.evaluateEscalation(result, 'sonnet');

      expect(decision.nextTier).toBe('opus');
    });
  });

  describe('recordEscalation', () => {
    it('should record escalation attempt', () => {
      const result = createExecutionResult(
        'sonnet',
        'Success',
        {
          durationMs: 2000,
          tokenCount: 100,
          truncated: false
        }
      );

      engine.recordEscalation('haiku', 'sonnet', 'low-confidence', result);

      const stats = engine.getStatistics();
      expect(stats.totalEscalations).toBe(1);
      expect(stats.escalationsByTransition['haiku-to-sonnet']).toBe(1);
      expect(stats.escalationsByReason['low-confidence']).toBe(1);
    });

    it('should track multiple escalation types', () => {
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      engine.recordEscalation('haiku', 'sonnet', 'truncated-output');
      engine.recordEscalation('sonnet', 'opus', 'quality-threshold');

      const stats = engine.getStatistics();
      expect(stats.totalEscalations).toBe(3);
      expect(stats.escalationsByTransition['haiku-to-sonnet']).toBe(2);
      expect(stats.escalationsByTransition['sonnet-to-opus']).toBe(1);
      expect(stats.escalationsByReason['low-confidence']).toBe(1);
      expect(stats.escalationsByReason['truncated-output']).toBe(1);
      expect(stats.escalationsByReason['quality-threshold']).toBe(1);
    });

    it('should update escalation success rate', () => {
      const successResult = createExecutionResult(
        'sonnet',
        'Success',
        { durationMs: 1000, tokenCount: 100, truncated: false }
      );

      const failureResult = createExecutionResult(
        'sonnet',
        '',
        { durationMs: 500, tokenCount: 0, truncated: false },
        'Still failed'
      );

      engine.recordEscalation('haiku', 'sonnet', 'low-confidence', successResult);
      engine.recordEscalation('haiku', 'sonnet', 'truncated-output', failureResult);

      const stats = engine.getStatistics();
      expect(stats.escalationSuccessRate).toBe(0.5);
    });

    it('should maintain escalation history', () => {
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      engine.recordEscalation('sonnet', 'opus', 'complexity-mismatch');

      const history = engine.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].fromTier).toBe('haiku');
      expect(history[0].toTier).toBe('sonnet');
      expect(history[1].fromTier).toBe('sonnet');
      expect(history[1].toTier).toBe('opus');
    });
  });

  describe('recordExecution', () => {
    it('should record successful execution', () => {
      engine.recordExecution('haiku', 500);

      const stats = engine.getStatistics();
      expect(stats.totalExecutions).toBe(1);
      expect(stats.escalationRate).toBe(0);
    });

    it('should calculate correct escalation rate', () => {
      // 3 successful, 2 escalations
      // Total executions = 3 + 2 = 5
      // Escalation rate = 2 / 5 = 0.4 (40%)
      engine.recordExecution('haiku', 500);
      engine.recordExecution('sonnet', 1000);
      engine.recordExecution('haiku', 600);

      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      engine.recordEscalation('haiku', 'opus', 'complexity-mismatch');

      const stats = engine.getStatistics();
      expect(stats.totalExecutions).toBe(5); // 3 + 2
      expect(stats.totalEscalations).toBe(2);
      expect(stats.escalationRate).toBeCloseTo(0.4, 2); // 2/5 = 40%
    });
  });

  describe('preserveContext', () => {
    it('should preserve context from failed attempt', () => {
      const task: Task = {
        description: 'Complex task',
        context: { fileCount: 5 }
      };

      const result = createExecutionResult(
        'haiku',
        'Partial response',
        {
          durationMs: 1000,
          tokenCount: 50,
          truncated: true
        }
      );
      result.context = { customData: 'value' };

      const preserved = engine.preserveContext(result, task);

      expect(preserved.originalTask).toBe(task);
      expect(preserved.failedAttempt.tier).toBe('haiku');
      expect(preserved.failedAttempt.response).toBe('Partial response');
      expect(preserved.customData).toBe('value');
      expect(preserved.preservedAt).toBeDefined();
    });

    it('should return empty context when preservation disabled', () => {
      const customEngine = new EscalationEngine({
        preserveContext: false
      });

      const task: Task = { description: 'Task' };
      const result = createExecutionResult('haiku', 'Response', {
        durationMs: 500,
        tokenCount: 20,
        truncated: false
      });

      const preserved = customEngine.preserveContext(result, task);

      expect(Object.keys(preserved)).toHaveLength(0);
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when within target', () => {
      engine.recordExecution('haiku', 500);
      engine.recordExecution('haiku', 600);
      engine.recordExecution('haiku', 550);
      engine.recordExecution('haiku', 520);
      engine.recordExecution('haiku', 480);
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');

      const health = engine.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.escalationRate).toBeLessThanOrEqual(health.target);
    });

    it('should return warning status when above target', () => {
      // To get warning (above target but < 1.5x target):
      // Target is 20%, so warning is 20-30%
      // Need escalation rate of ~25%
      // 2 escalations / 8 total = 25%
      engine.recordExecution('haiku', 500);
      engine.recordExecution('haiku', 600);
      engine.recordExecution('haiku', 550);
      engine.recordExecution('haiku', 520);
      engine.recordExecution('haiku', 480);
      engine.recordExecution('haiku', 510);
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      engine.recordEscalation('haiku', 'sonnet', 'truncated-output');

      const health = engine.getHealthStatus();

      // 2 escalations / 8 total executions = 25% (above 20% target, below 30%)
      expect(health.status).toBe('warning');
      expect(health.escalationRate).toBeGreaterThan(health.target);
      expect(health.escalationRate).toBeLessThanOrEqual(health.target * 1.5);
    });

    it('should return critical status when significantly above target', () => {
      engine.recordExecution('haiku', 500);
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      engine.recordEscalation('haiku', 'opus', 'complexity-mismatch');

      const health = engine.getHealthStatus();

      // 2 escalations / 1 execution = 200% (way above 20% target)
      expect(health.status).toBe('critical');
      expect(health.escalationRate).toBeGreaterThan(health.target * 1.5);
    });
  });

  describe('isWithinTarget', () => {
    it('should return true when escalation rate is within target', () => {
      // Target is 20%, simulate 15% escalation rate
      engine.recordExecution('haiku', 500);
      engine.recordExecution('haiku', 600);
      engine.recordExecution('haiku', 550);
      engine.recordExecution('haiku', 520);
      engine.recordExecution('haiku', 480);
      engine.recordExecution('haiku', 510);
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');

      expect(engine.isWithinTarget()).toBe(true);
    });

    it('should return false when escalation rate exceeds target', () => {
      // Simulate 50% escalation rate
      engine.recordExecution('haiku', 500);
      engine.recordExecution('haiku', 600);
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');

      expect(engine.isWithinTarget()).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customEngine = new EscalationEngine({
        qualityThresholds: {
          minConfidence: 0.8,
          minQualityScore: 0.85,
          maxTruncationRatio: 0.02,
          minCompleteness: 0.95
        },
        maxEscalations: 1,
        targetEscalationRate: 0.1
      });

      const config = customEngine.getConfig();

      expect(config.qualityThresholds.minConfidence).toBe(0.8);
      expect(config.maxEscalations).toBe(1);
      expect(config.targetEscalationRate).toBe(0.1);
    });

    it('should update configuration dynamically', () => {
      engine.updateConfig({
        targetEscalationRate: 0.15,
        maxEscalations: 3
      });

      const config = engine.getConfig();

      expect(config.targetEscalationRate).toBe(0.15);
      expect(config.maxEscalations).toBe(3);
    });
  });

  describe('history management', () => {
    it('should retrieve limited history', () => {
      for (let i = 0; i < 20; i++) {
        engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      }

      const recentHistory = engine.getHistory(5);

      expect(recentHistory).toHaveLength(5);
    });

    it('should filter escalations by reason', () => {
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      engine.recordEscalation('haiku', 'sonnet', 'truncated-output');
      engine.recordEscalation('haiku', 'opus', 'low-confidence');
      engine.recordEscalation('sonnet', 'opus', 'complexity-mismatch');

      const lowConfidenceEscalations = engine.getEscalationsByReason('low-confidence');

      expect(lowConfidenceEscalations).toHaveLength(2);
      lowConfidenceEscalations.forEach(attempt => {
        expect(attempt.reason).toBe('low-confidence');
      });
    });

    it('should export and import history', () => {
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      engine.recordEscalation('sonnet', 'opus', 'complexity-mismatch');

      const exported = engine.exportHistory();
      const newEngine = new EscalationEngine();
      newEngine.importHistory(exported);

      const stats = newEngine.getStatistics();
      expect(stats.totalEscalations).toBe(2);
      expect(stats.escalationsByReason['low-confidence']).toBe(1);
      expect(stats.escalationsByReason['complexity-mismatch']).toBe(1);
    });
  });

  describe('resetStatistics', () => {
    it('should reset all statistics', () => {
      engine.recordExecution('haiku', 500);
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');

      engine.resetStatistics();

      const stats = engine.getStatistics();
      expect(stats.totalExecutions).toBe(0);
      expect(stats.totalEscalations).toBe(0);
      expect(stats.escalationRate).toBe(0);

      const history = engine.getHistory();
      expect(history).toHaveLength(0);
    });
  });
});

describe('escalateWithRetry', () => {
  it('should succeed without escalation on first try', async () => {
    const task: Task = { description: 'Simple task' };

    const executor = async (tier: ModelTier) => {
      return createExecutionResult(
        tier,
        'Success',
        {
          durationMs: 500,
          tokenCount: 50,
          truncated: false,
          confidence: 0.9,
          qualityScore: 0.85
        }
      );
    };

    const { result, escalations } = await escalateWithRetry(
      task,
      executor,
      'haiku'
    );

    expect(result.success).toBe(true);
    expect(escalations).toBe(0);
    expect(result.tier).toBe('haiku');
  });

  it('should escalate once on quality failure', async () => {
    const task: Task = { description: 'Medium task' };

    let attempts = 0;
    const executor = async (tier: ModelTier) => {
      attempts++;

      if (tier === 'haiku') {
        return createExecutionResult(
          tier,
          'Low quality',
          {
            durationMs: 500,
            tokenCount: 20,
            truncated: false,
            qualityScore: 0.5
          }
        );
      }

      return createExecutionResult(
        tier,
        'High quality response',
        {
          durationMs: 1000,
          tokenCount: 100,
          truncated: false,
          confidence: 0.9,
          qualityScore: 0.9
        }
      );
    };

    const { result, escalations } = await escalateWithRetry(
      task,
      executor,
      'haiku'
    );

    expect(result.success).toBe(true);
    expect(escalations).toBe(1);
    expect(result.tier).toBe('sonnet');
    expect(attempts).toBe(2);
  });

  it('should escalate multiple times if needed', async () => {
    const task: Task = {
      description: 'Complex architecture design with multiple microservices'
    };

    let attempts = 0;
    const executor = async (tier: ModelTier) => {
      attempts++;

      if (tier === 'opus') {
        return createExecutionResult(
          tier,
          'Comprehensive architecture design...',
          {
            durationMs: 3000,
            tokenCount: 500,
            truncated: false,
            confidence: 0.95,
            qualityScore: 0.95
          }
        );
      }

      return createExecutionResult(
        tier,
        'Insufficient detail',
        {
          durationMs: 500,
          tokenCount: 50,
          truncated: false,
          qualityScore: 0.6
        }
      );
    };

    const { result, escalations } = await escalateWithRetry(
      task,
      executor,
      'haiku'
    );

    expect(result.success).toBe(true);
    expect(escalations).toBe(2);
    expect(result.tier).toBe('opus');
    expect(attempts).toBe(3);
  });

  it('should preserve context between escalations', async () => {
    const task: Task = { description: 'Task with context' };

    const contexts: Array<Record<string, any> | undefined> = [];
    const executor = async (tier: ModelTier, context?: Record<string, any>) => {
      contexts.push(context);

      if (tier === 'haiku') {
        const result = createExecutionResult(
          tier,
          'Partial',
          {
            durationMs: 500,
            tokenCount: 20,
            truncated: true
          }
        );
        result.context = { partialData: 'preserved' };
        return result;
      }

      return createExecutionResult(
        tier,
        'Complete',
        {
          durationMs: 1000,
          tokenCount: 100,
          truncated: false,
          confidence: 0.9
        }
      );
    };

    await escalateWithRetry(task, executor, 'haiku');

    expect(contexts).toHaveLength(2);
    expect(contexts[0]).toBeUndefined(); // First attempt has no context
    expect(contexts[1]?.failedAttempt).toBeDefined(); // Second attempt has preserved context
    expect(contexts[1]?.partialData).toBe('preserved');
  });

  it('should stop at max escalations', async () => {
    const task: Task = { description: 'Task' };

    const customEngine = new EscalationEngine({ maxEscalations: 1 });

    let attempts = 0;
    const executor = async (tier: ModelTier) => {
      attempts++;
      return createExecutionResult(
        tier,
        'Always fails',
        {
          durationMs: 500,
          tokenCount: 10,
          truncated: false,
          qualityScore: 0.3
        }
      );
    };

    const { result, escalations } = await escalateWithRetry(
      task,
      executor,
      'haiku',
      customEngine
    );

    expect(escalations).toBe(1);
    expect(attempts).toBe(2); // haiku + 1 escalation to sonnet
    expect(result.tier).toBe('sonnet');
  });
});

describe('createExecutionResult', () => {
  it('should create successful result', () => {
    const result = createExecutionResult(
      'sonnet',
      'Test response',
      {
        durationMs: 1000,
        tokenCount: 50,
        truncated: false,
        confidence: 0.85
      }
    );

    expect(result.tier).toBe('sonnet');
    expect(result.success).toBe(true);
    expect(result.response).toBe('Test response');
    expect(result.error).toBeUndefined();
    expect(result.metadata.durationMs).toBe(1000);
    expect(result.metadata.confidence).toBe(0.85);
  });

  it('should create failed result', () => {
    const result = createExecutionResult(
      'haiku',
      '',
      {
        durationMs: 500,
        tokenCount: 0,
        truncated: false
      },
      'Execution failed'
    );

    expect(result.tier).toBe('haiku');
    expect(result.success).toBe(false);
    expect(result.response).toBeUndefined();
    expect(result.error).toBe('Execution failed');
  });

  it('should estimate token count from response length', () => {
    const result = createExecutionResult(
      'sonnet',
      'A'.repeat(400), // 400 chars = ~100 tokens
      {
        durationMs: 1000,
        truncated: false
      }
    );

    expect(result.metadata.tokenCount).toBe(100);
  });
});
