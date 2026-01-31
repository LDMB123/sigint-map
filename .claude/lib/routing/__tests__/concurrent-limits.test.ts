/**
 * Concurrent Limits and Adaptive Throttling Test Suite
 *
 * Tests the EscalationEngine's adaptive throttling and concurrent limit enforcement:
 * - Escalation rate tracking and limits
 * - Adaptive tier selection based on load
 * - Quality threshold enforcement
 * - Context preservation across escalations
 * - Concurrency control and rate limiting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EscalationEngine,
  createExecutionResult,
  escalateWithRetry,
  type ExecutionResult,
  type ModelTier,
  type Task
} from '../../tiers/escalation-engine.js';

describe('Concurrent Limits and Adaptive Throttling', () => {
  let engine: EscalationEngine;

  beforeEach(() => {
    engine = new EscalationEngine({
      maxEscalations: 2,
      targetEscalationRate: 0.20,
      preserveContext: true
    });
  });

  describe('Escalation Rate Tracking', () => {
    it('should track total executions and escalations', () => {
      const result1 = createExecutionResult('haiku', 'Success', {
        durationMs: 100,
        tokenCount: 50,
        truncated: false,
        confidence: 0.9
      });

      engine.recordExecution('haiku', 100);
      engine.recordExecution('sonnet', 200);

      const stats = engine.getStatistics();
      expect(stats.totalExecutions).toBe(2);
    });

    it('should calculate escalation rate correctly', () => {
      // Record 10 executions, 2 escalations
      for (let i = 0; i < 8; i++) {
        engine.recordExecution('haiku', 100);
      }

      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      engine.recordEscalation('haiku', 'sonnet', 'quality-threshold');

      const stats = engine.getStatistics();
      expect(stats.totalExecutions).toBe(10);
      expect(stats.totalEscalations).toBe(2);
      expect(stats.escalationRate).toBeCloseTo(0.2, 2);
    });

    it('should track escalation rate within target threshold', () => {
      // Keep escalation rate under 20%
      for (let i = 0; i < 10; i++) {
        engine.recordExecution('haiku', 100);
      }
      
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      
      const stats = engine.getStatistics();
      expect(stats.escalationRate).toBeLessThan(0.20);
      expect(engine.isWithinTarget()).toBe(true);
    });

    it('should detect when escalation rate exceeds target', () => {
      // Create high escalation rate (50%)
      for (let i = 0; i < 5; i++) {
        engine.recordExecution('haiku', 100);
      }
      
      for (let i = 0; i < 5; i++) {
        engine.recordEscalation('haiku', 'sonnet', 'quality-threshold');
      }

      const stats = engine.getStatistics();
      expect(stats.escalationRate).toBeGreaterThan(0.20);
      expect(engine.isWithinTarget()).toBe(false);
    });

    it('should provide health status based on escalation rate', () => {
      // Healthy: under target
      for (let i = 0; i < 10; i++) {
        engine.recordExecution('haiku', 100);
      }
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');

      let health = engine.getHealthStatus();
      expect(health.status).toBe('healthy');

      // Warning: slightly over target
      for (let i = 0; i < 5; i++) {
        engine.recordEscalation('haiku', 'sonnet', 'quality-threshold');
      }

      health = engine.getHealthStatus();
      expect(['warning', 'critical']).toContain(health.status);
    });
  });

  describe('Escalation Transition Tracking', () => {
    it('should track haiku-to-sonnet escalations', () => {
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      engine.recordEscalation('haiku', 'sonnet', 'truncated-output');

      const stats = engine.getStatistics();
      expect(stats.escalationsByTransition['haiku-to-sonnet']).toBe(2);
    });

    it('should track sonnet-to-opus escalations', () => {
      engine.recordEscalation('sonnet', 'opus', 'quality-threshold');
      engine.recordEscalation('sonnet', 'opus', 'complexity-mismatch');

      const stats = engine.getStatistics();
      expect(stats.escalationsByTransition['sonnet-to-opus']).toBe(2);
    });

    it('should track haiku-to-opus skip escalations', () => {
      engine.recordEscalation('haiku', 'opus', 'context-overflow');

      const stats = engine.getStatistics();
      expect(stats.escalationsByTransition['haiku-to-opus']).toBe(1);
    });

    it('should track escalations by reason', () => {
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      engine.recordEscalation('sonnet', 'opus', 'truncated-output');

      const stats = engine.getStatistics();
      expect(stats.escalationsByReason['low-confidence']).toBe(2);
      expect(stats.escalationsByReason['truncated-output']).toBe(1);
    });
  });

  describe('Quality Threshold Enforcement', () => {
    it('should enforce minimum confidence threshold', () => {
      const lowConfidenceResult = createExecutionResult('haiku', 'Uncertain answer', {
        durationMs: 100,
        tokenCount: 30,
        truncated: false,
        confidence: 0.5
      });

      const decision = engine.evaluateEscalation(lowConfidenceResult, 'haiku');
      expect(decision.shouldEscalate).toBe(true);
      expect(decision.reason).toBe('low-confidence');
    });

    it('should enforce minimum quality score threshold', () => {
      const lowQualityResult = createExecutionResult('sonnet', 'Poor quality response', {
        durationMs: 200,
        tokenCount: 40,
        truncated: false,
        qualityScore: 0.5
      });

      const decision = engine.evaluateEscalation(lowQualityResult, 'sonnet');
      expect(decision.shouldEscalate).toBe(true);
      expect(decision.reason).toBe('quality-threshold');
    });

    it('should not escalate when quality thresholds are met', () => {
      const highQualityResult = createExecutionResult('haiku', 'Excellent response', {
        durationMs: 100,
        tokenCount: 100,
        truncated: false,
        confidence: 0.95,
        qualityScore: 0.9
      });

      const decision = engine.evaluateEscalation(highQualityResult, 'haiku');
      expect(decision.shouldEscalate).toBe(false);
    });

    it('should escalate on truncated output', () => {
      const truncatedResult = createExecutionResult('haiku', 'Incomplete...', {
        durationMs: 100,
        tokenCount: 20,
        truncated: true
      });

      const decision = engine.evaluateEscalation(truncatedResult, 'haiku');
      expect(decision.shouldEscalate).toBe(true);
      expect(decision.reason).toBe('truncated-output');
    });
  });

  describe('Adaptive Tier Selection', () => {
    it('should escalate haiku to sonnet on quality failure', () => {
      const result = createExecutionResult('haiku', 'Low quality', {
        durationMs: 100,
        tokenCount: 30,
        truncated: false,
        confidence: 0.6
      });

      const decision = engine.evaluateEscalation(result, 'haiku');
      expect(decision.shouldEscalate).toBe(true);
      expect(decision.nextTier).toBe('sonnet');
    });

    it('should escalate sonnet to opus on quality failure', () => {
      const result = createExecutionResult('sonnet', 'Low quality', {
        durationMs: 200,
        tokenCount: 40,
        truncated: false,
        qualityScore: 0.6
      });

      const decision = engine.evaluateEscalation(result, 'sonnet');
      expect(decision.shouldEscalate).toBe(true);
      expect(decision.nextTier).toBe('opus');
    });

    it('should not escalate opus tier (already at max)', () => {
      const result = createExecutionResult('opus', 'Response', {
        durationMs: 300,
        tokenCount: 50,
        truncated: false,
        qualityScore: 0.6
      });

      const decision = engine.evaluateEscalation(result, 'opus');
      expect(decision.shouldEscalate).toBe(false);
      expect(decision.nextTier).toBeUndefined();
    });

    it('should detect complexity mismatch and escalate', () => {
      const task: Task = {
        id: 'test-1',
        description: 'Design complex distributed system architecture with microservices, scalability, and performance optimization across multiple domains'
      };

      const result = createExecutionResult('haiku', 'Simple response', {
        durationMs: 50,
        tokenCount: 20,
        truncated: false
      });

      const decision = engine.evaluateEscalation(result, 'haiku', task);
      expect(decision.shouldEscalate).toBe(true);
      expect(decision.reason).toBe('complexity-mismatch');
    });
  });

  describe('Context Preservation', () => {
    it('should preserve context from failed attempts', () => {
      const task: Task = {
        id: 'test-1',
        description: 'Test task'
      };

      const result = createExecutionResult('haiku', 'Failed', {
        durationMs: 100,
        tokenCount: 30,
        truncated: false
      }, 'Validation error');

      const preservedContext = engine.preserveContext(result, task);

      expect(preservedContext.originalTask).toEqual(task);
      expect(preservedContext.failedAttempt).toBeDefined();
      expect(preservedContext.failedAttempt.tier).toBe('haiku');
      expect(preservedContext.preservedAt).toBeDefined();
    });

    it('should include error information in preserved context', () => {
      const task: Task = {
        id: 'test-1',
        description: 'Test task'
      };

      const result = createExecutionResult('sonnet', 'Error', {
        durationMs: 200,
        tokenCount: 40,
        truncated: false
      }, 'Parse error: invalid JSON');

      const preservedContext = engine.preserveContext(result, task);

      expect(preservedContext.failedAttempt.error).toContain('Parse error');
    });

    it('should respect preserveContext configuration', () => {
      const noContextEngine = new EscalationEngine({
        preserveContext: false
      });

      const task: Task = {
        id: 'test-1',
        description: 'Test task'
      };

      const result = createExecutionResult('haiku', 'Failed', {
        durationMs: 100,
        tokenCount: 30,
        truncated: false
      }, 'Error');

      const preservedContext = noContextEngine.preserveContext(result, task);

      expect(Object.keys(preservedContext).length).toBe(0);
    });
  });

  describe('Maximum Escalation Limits', () => {
    it('should enforce maxEscalations config', async () => {
      const task: Task = {
        id: 'test-1',
        description: 'Test task'
      };

      let callCount = 0;
      const executor = async (tier: ModelTier): Promise<ExecutionResult> => {
        callCount++;
        return createExecutionResult(tier, 'Low quality', {
          durationMs: 100,
          tokenCount: 30,
          truncated: false,
          qualityScore: 0.5
        });
      };

      const { escalations } = await escalateWithRetry(task, executor, 'haiku', engine);

      // Should stop at maxEscalations (2)
      expect(escalations).toBeLessThanOrEqual(2);
      expect(callCount).toBeLessThanOrEqual(3); // initial + 2 escalations
    });

    it('should track escalation success rate', () => {
      // Successful escalation
      const successResult = createExecutionResult('sonnet', 'Success', {
        durationMs: 200,
        tokenCount: 100,
        truncated: false,
        confidence: 0.9
      });
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence', successResult);

      // Failed escalation
      const failResult = createExecutionResult('sonnet', 'Still failed', {
        durationMs: 200,
        tokenCount: 40,
        truncated: false
      }, 'Error');
      engine.recordEscalation('haiku', 'sonnet', 'quality-threshold', failResult);

      const stats = engine.getStatistics();
      expect(stats.escalationSuccessRate).toBeCloseTo(0.5, 1);
    });
  });

  describe('Timeout Handling', () => {
    it('should detect timeout and recommend escalation', () => {
      const config = engine.getConfig();
      const haikuTimeout = config.timeoutMs.haiku;

      const timeoutResult = createExecutionResult('haiku', 'Slow response', {
        durationMs: haikuTimeout + 1000,
        tokenCount: 50,
        truncated: false
      });

      const decision = engine.evaluateEscalation(timeoutResult, 'haiku');
      expect(decision.shouldEscalate).toBe(true);
      expect(decision.reason).toBe('timeout');
    });

    it('should have different timeout thresholds per tier', () => {
      const config = engine.getConfig();
      
      expect(config.timeoutMs.haiku).toBeLessThan(config.timeoutMs.sonnet);
      expect(config.timeoutMs.sonnet).toBeLessThan(config.timeoutMs.opus);
    });
  });

  describe('Escalation History and Monitoring', () => {
    it('should maintain escalation history', () => {
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      engine.recordEscalation('sonnet', 'opus', 'quality-threshold');

      const history = engine.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].fromTier).toBe('haiku');
      expect(history[1].fromTier).toBe('sonnet');
    });

    it('should limit history size to prevent memory issues', () => {
      // Add more than max history size
      for (let i = 0; i < 1500; i++) {
        engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      }

      const history = engine.getHistory();
      expect(history.length).toBeLessThanOrEqual(1000);
    });

    it('should filter history by reason', () => {
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      engine.recordEscalation('haiku', 'sonnet', 'truncated-output');
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');

      const lowConfHistory = engine.getEscalationsByReason('low-confidence');
      expect(lowConfHistory.length).toBe(2);
    });

    it('should export and import history', () => {
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      engine.recordEscalation('sonnet', 'opus', 'quality-threshold');

      const exported = engine.exportHistory();
      
      const newEngine = new EscalationEngine();
      newEngine.importHistory(exported);

      const imported = newEngine.getHistory();
      expect(imported.length).toBe(2);
      
      const stats = newEngine.getStatistics();
      expect(stats.totalEscalations).toBe(2);
    });
  });

  describe('Configuration Updates', () => {
    it('should allow updating configuration', () => {
      const newConfig = {
        targetEscalationRate: 0.15,
        maxEscalations: 3
      };

      engine.updateConfig(newConfig);

      const config = engine.getConfig();
      expect(config.targetEscalationRate).toBe(0.15);
      expect(config.maxEscalations).toBe(3);
    });

    it('should allow resetting statistics', () => {
      engine.recordExecution('haiku', 100);
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');

      engine.resetStatistics();

      const stats = engine.getStatistics();
      expect(stats.totalExecutions).toBe(0);
      expect(stats.totalEscalations).toBe(0);
    });
  });

  describe('Adaptive Throttling Integration', () => {
    it('should provide metrics for adaptive throttling decisions', () => {
      // Simulate high load scenario
      for (let i = 0; i < 20; i++) {
        engine.recordExecution('haiku', 100);
      }
      
      for (let i = 0; i < 8; i++) {
        engine.recordEscalation('haiku', 'sonnet', 'quality-threshold');
      }

      const stats = engine.getStatistics();
      const health = engine.getHealthStatus();

      // High escalation rate should trigger throttling consideration
      expect(stats.escalationRate).toBeGreaterThan(0.20);
      expect(['warning', 'critical']).toContain(health.status);
    });

    it('should track average escalation overhead', () => {
      engine.recordEscalation('haiku', 'sonnet', 'low-confidence');
      engine.recordExecution('sonnet', 150);
      
      engine.recordEscalation('haiku', 'sonnet', 'quality-threshold');
      engine.recordExecution('sonnet', 200);

      const stats = engine.getStatistics();
      expect(stats.avgEscalationOverheadMs).toBeGreaterThan(0);
    });

    it('should provide data for tier selection optimization', () => {
      // Track which tiers and reasons lead to escalations
      engine.recordEscalation('haiku', 'sonnet', 'complexity-mismatch');
      engine.recordEscalation('haiku', 'sonnet', 'complexity-mismatch');
      engine.recordEscalation('haiku', 'sonnet', 'complexity-mismatch');

      const stats = engine.getStatistics();
      
      // High complexity-mismatch rate suggests initial tier selection needs improvement
      expect(stats.escalationsByReason['complexity-mismatch']).toBe(3);
      expect(stats.escalationsByTransition['haiku-to-sonnet']).toBe(3);
    });
  });

  describe('End-to-End Escalation Flow', () => {
    it('should handle complete escalation workflow', async () => {
      const task: Task = {
        id: 'test-1',
        description: 'Complex task requiring multiple attempts'
      };

      let attemptCount = 0;
      const executor = async (tier: ModelTier, context?: Record<string, any>): Promise<ExecutionResult> => {
        attemptCount++;
        
        // First attempt fails, second succeeds
        if (attemptCount === 1) {
          return createExecutionResult(tier, 'Low quality', {
            durationMs: 100,
            tokenCount: 30,
            truncated: false,
            qualityScore: 0.5
          });
        } else {
          return createExecutionResult(tier, 'High quality success', {
            durationMs: 200,
            tokenCount: 100,
            truncated: false,
            confidence: 0.95,
            qualityScore: 0.9
          });
        }
      };

      const { result, escalations } = await escalateWithRetry(task, executor, 'haiku', engine);

      expect(escalations).toBe(1);
      expect(result.success).toBe(true);
      expect(result.tier).toBe('sonnet');
    });

    it('should stop escalating at opus tier', async () => {
      const task: Task = {
        id: 'test-1',
        description: 'Task that consistently fails'
      };

      const executor = async (tier: ModelTier): Promise<ExecutionResult> => {
        return createExecutionResult(tier, 'Always fails', {
          durationMs: 100,
          tokenCount: 30,
          truncated: false,
          qualityScore: 0.4
        });
      };

      const { result, escalations } = await escalateWithRetry(task, executor, 'sonnet', engine);

      expect(escalations).toBeLessThanOrEqual(1); // sonnet -> opus
      expect(result.tier).toBe('opus');
    });
  });
});
