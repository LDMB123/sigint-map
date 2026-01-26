/**
 * QualityAssessor Test Suite
 *
 * Comprehensive tests for the unified quality and complexity assessment module.
 * Validates complexity scoring, quality assessment, threshold validation, and edge cases.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  QualityAssessor,
  getQualityAssessor,
  DEFAULT_QUALITY_THRESHOLDS,
  TIER_THRESHOLDS,
  ComplexityAssessment,
  QualityAssessment,
  Task,
  QualityAssessmentInput,
} from './quality-assessor';

describe('QualityAssessor', () => {
  let assessor: QualityAssessor;

  beforeEach(() => {
    assessor = new QualityAssessor();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getQualityAssessor();
      const instance2 = getQualityAssessor();
      expect(instance1).toBe(instance2);
    });

    it('should allow creating new instances', () => {
      const instance1 = new QualityAssessor();
      const instance2 = new QualityAssessor();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Complexity Assessment', () => {
    describe('Simple Tasks (Haiku Tier)', () => {
      it('should score simple task as low complexity', () => {
        const task: Task = {
          id: 'test-1',
          description: 'Read the file config.json',
          type: 'read',
        };

        const result = assessor.assessComplexity(task);

        expect(result.score).toBeLessThan(30);
        expect(result.tier).toBe('haiku');
        expect(result.signals.tokenCount).toBeLessThan(10);
        expect(result.signals.questionCount).toBe(0);
        expect(result.signals.stepCount).toBe(0);
      });

      it('should handle minimal description', () => {
        const task: Task = {
          id: 'test-2',
          description: 'List files',
          type: 'list',
        };

        const result = assessor.assessComplexity(task);

        expect(result.score).toBeLessThan(20);
        expect(result.tier).toBe('haiku');
      });

      it('should detect single file operation', () => {
        const task: Task = {
          id: 'test-3',
          description: 'Update the version in package.json to 2.0.0',
          type: 'edit',
        };

        const result = assessor.assessComplexity(task);

        expect(result.signals.fileCount).toBe(1);
        expect(result.score).toBeLessThan(30);
        expect(result.tier).toBe('haiku');
      });
    });

    describe('Medium Tasks (Sonnet Tier)', () => {
      it('should score multi-step task as medium complexity', () => {
        const task: Task = {
          id: 'test-4',
          description: 'First, read the schema. Then create migration file. Finally, update the README with the changes.',
          type: 'multi-step',
        };

        const result = assessor.assessComplexity(task);

        expect(result.score).toBeGreaterThanOrEqual(25);
        expect(result.score).toBeLessThanOrEqual(70);
        expect(result.tier).toBe('sonnet');
        expect(result.signals.stepCount).toBe(3);
      });

      it('should detect multiple questions', () => {
        const task: Task = {
          id: 'test-5',
          description: 'What are the performance bottlenecks? How can we optimize the query? Should we add caching?',
          type: 'analysis',
        };

        const result = assessor.assessComplexity(task);

        expect(result.signals.questionCount).toBeGreaterThanOrEqual(3);
        expect(result.score).toBeGreaterThanOrEqual(25);
        expect(result.tier).toBe('sonnet');
      });

      it('should detect multi-file operations', () => {
        const task: Task = {
          id: 'test-6',
          description: 'Update schema.ts, migrate data.ts, and update tests in schema.test.ts and migration.test.ts',
          type: 'refactor',
        };

        const result = assessor.assessComplexity(task);

        expect(result.signals.fileCount).toBe(4);
        expect(result.score).toBeGreaterThanOrEqual(30);
        expect(result.tier).toBe('sonnet');
      });

      it('should detect multi-domain task', () => {
        const task: Task = {
          id: 'test-7',
          description: 'Design the database schema, create the API endpoints, and build the React UI components',
          type: 'feature',
        };

        const result = assessor.assessComplexity(task);

        expect(result.signals.domainCount).toBeGreaterThanOrEqual(2);
        expect(result.score).toBeGreaterThanOrEqual(35);
      });
    });

    describe('Complex Tasks (Opus Tier)', () => {
      it('should score complex architectural task as high complexity', () => {
        const task: Task = {
          id: 'test-8',
          description: `Design and implement a distributed caching system with:
            1. Redis cluster for primary cache
            2. Multi-tier caching strategy (memory -> Redis -> database)
            3. Cache invalidation patterns
            4. Monitoring and metrics collection
            5. Fallback mechanisms for cache failures
            6. Performance benchmarking suite

            Consider edge cases, implement comprehensive tests, and document the architecture.`,
          type: 'architecture',
        };

        const result = assessor.assessComplexity(task);

        expect(result.score).toBeGreaterThanOrEqual(65);
        expect(result.tier).toBe('opus');
        expect(result.signals.stepCount).toBeGreaterThanOrEqual(6);
        expect(result.signals.domainCount).toBeGreaterThanOrEqual(3);
      });

      it('should detect high abstraction level', () => {
        const task: Task = {
          id: 'test-9',
          description: 'Architect a scalable microservices system with event sourcing, CQRS patterns, distributed tracing, and eventual consistency guarantees',
          type: 'design',
        };

        const result = assessor.assessComplexity(task);

        expect(result.signals.abstractionLevel).toBeGreaterThanOrEqual(3);
        expect(result.score).toBeGreaterThanOrEqual(65);
        expect(result.tier).toBe('opus');
      });

      it('should handle very long descriptions', () => {
        const task: Task = {
          id: 'test-10',
          description: 'Lorem ipsum '.repeat(200), // ~2400 chars
          type: 'complex',
        };

        const result = assessor.assessComplexity(task);

        expect(result.signals.tokenCount).toBeGreaterThan(500);
        expect(result.score).toBeGreaterThan(40);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty description', () => {
        const task: Task = {
          id: 'test-11',
          description: '',
          type: 'unknown',
        };

        const result = assessor.assessComplexity(task);

        expect(result.score).toBe(0);
        expect(result.tier).toBe('haiku');
        expect(result.signals.tokenCount).toBe(0);
      });

      it('should handle missing description', () => {
        const task: Task = {
          id: 'test-12',
          type: 'unknown',
        };

        const result = assessor.assessComplexity(task);

        expect(result.score).toBe(0);
        expect(result.tier).toBe('haiku');
      });

      it('should detect implicit questions', () => {
        const task: Task = {
          id: 'test-13',
          description: 'We should consider adding rate limiting. Could we implement caching? How to improve performance?',
          type: 'consideration',
        };

        const result = assessor.assessComplexity(task);

        expect(result.signals.questionCount).toBeGreaterThanOrEqual(3);
      });

      it('should handle boundary tier scores', () => {
        // Test Haiku/Sonnet boundary (30)
        const task1: Task = {
          id: 'test-14',
          description: 'Task with exactly 30 complexity',
          type: 'boundary',
        };

        const result1 = assessor.assessComplexity(task1);
        expect(['haiku', 'sonnet']).toContain(result1.tier);

        // Test Sonnet/Opus boundary (70)
        const task2: Task = {
          id: 'test-15',
          description: 'Complex architectural task requiring deep analysis and multi-step implementation across several domains',
          type: 'boundary',
        };

        const result2 = assessor.assessComplexity(task2);
        expect(['sonnet', 'opus']).toContain(result2.tier);
      });
    });

    describe('Signal Extraction', () => {
      it('should count step indicators correctly', () => {
        const task: Task = {
          id: 'test-16',
          description: 'First do A, then B, next C, finally D',
          type: 'steps',
        };

        const result = assessor.assessComplexity(task);
        expect(result.signals.stepCount).toBe(4);
      });

      it('should count domain-specific terms', () => {
        const task: Task = {
          id: 'test-17',
          description: 'Update the database schema, modify API endpoints, refactor React components',
          type: 'multi-domain',
        };

        const result = assessor.assessComplexity(task);
        expect(result.signals.domainCount).toBeGreaterThanOrEqual(2);
      });

      it('should detect file path patterns', () => {
        const task: Task = {
          id: 'test-18',
          description: 'Modify src/app.ts, tests/app.test.ts, and config/settings.json',
          type: 'files',
        };

        const result = assessor.assessComplexity(task);
        expect(result.signals.fileCount).toBe(3);
      });
    });
  });

  describe('Quality Assessment', () => {
    describe('High Quality Outputs', () => {
      it('should score complete, confident output as high quality', () => {
        const input: QualityAssessmentInput = {
          output: 'This is a complete and coherent response with detailed analysis.',
          confidence: 0.95,
          metadata: {
            truncated: false,
            error: undefined,
          },
        };

        const result = assessor.assessQuality(input);

        expect(result.score).toBeGreaterThan(0.85);
        expect(result.meetsThresholds).toBe(true);
        expect(result.dimensions.confidence).toBe(0.95);
        expect(result.dimensions.completeness).toBe(1.0);
        expect(result.dimensions.coherence).toBe(1.0);
        expect(result.dimensions.correctness).toBe(1.0);
      });

      it('should handle perfect quality', () => {
        const input: QualityAssessmentInput = {
          output: 'Perfect response',
          confidence: 1.0,
          metadata: {
            truncated: false,
          },
        };

        const result = assessor.assessQuality(input);

        expect(result.score).toBe(1.0);
        expect(result.meetsThresholds).toBe(true);
      });
    });

    describe('Low Quality Outputs', () => {
      it('should score truncated output as low quality', () => {
        const input: QualityAssessmentInput = {
          output: 'This response was cut off...',
          confidence: 0.8,
          metadata: {
            truncated: true,
          },
        };

        const result = assessor.assessQuality(input);

        expect(result.dimensions.completeness).toBe(0.0);
        expect(result.score).toBeLessThan(0.75);
        expect(result.meetsThresholds).toBe(false);
      });

      it('should score low confidence as low quality', () => {
        const input: QualityAssessmentInput = {
          output: 'I am not sure about this answer',
          confidence: 0.3,
          metadata: {
            truncated: false,
          },
        };

        const result = assessor.assessQuality(input);

        expect(result.dimensions.confidence).toBe(0.3);
        expect(result.score).toBeLessThan(0.70);
        expect(result.meetsThresholds).toBe(false);
      });

      it('should detect incoherent output', () => {
        const input: QualityAssessmentInput = {
          output: '[ERROR] Failed to process request. undefined is not a function',
          confidence: 0.8,
          metadata: {
            truncated: false,
          },
        };

        const result = assessor.assessQuality(input);

        expect(result.dimensions.coherence).toBeLessThan(1.0);
        expect(result.score).toBeLessThan(0.75);
      });

      it('should detect validation errors', () => {
        const input: QualityAssessmentInput = {
          output: 'Result generated',
          confidence: 0.8,
          metadata: {
            truncated: false,
            error: 'Schema validation failed: missing required field',
          },
        };

        const result = assessor.assessQuality(input);

        expect(result.dimensions.correctness).toBeLessThan(1.0);
        expect(result.score).toBeLessThan(0.75);
      });

      it('should detect parse errors', () => {
        const input: QualityAssessmentInput = {
          output: 'Malformed output',
          confidence: 0.8,
          metadata: {
            truncated: false,
            error: 'JSON parse error at line 5',
          },
        };

        const result = assessor.assessQuality(input);

        expect(result.dimensions.correctness).toBeLessThan(1.0);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty output', () => {
        const input: QualityAssessmentInput = {
          output: '',
          metadata: {
            truncated: false,
          },
        };

        const result = assessor.assessQuality(input);

        expect(result.dimensions.completeness).toBe(1.0); // Not truncated
        expect(result.dimensions.confidence).toBe(0.75); // Default
      });

      it('should handle missing confidence', () => {
        const input: QualityAssessmentInput = {
          output: 'Output without confidence score',
          metadata: {
            truncated: false,
          },
        };

        const result = assessor.assessQuality(input);

        expect(result.dimensions.confidence).toBe(0.75); // Default
      });

      it('should handle missing metadata', () => {
        const input: QualityAssessmentInput = {
          output: 'Output without metadata',
        };

        const result = assessor.assessQuality(input);

        expect(result.dimensions.completeness).toBe(1.0);
        expect(result.dimensions.coherence).toBe(1.0);
        expect(result.dimensions.correctness).toBe(1.0);
      });

      it('should handle multiple quality issues', () => {
        const input: QualityAssessmentInput = {
          output: '[ERROR] Truncated response with undefined...',
          confidence: 0.4,
          metadata: {
            truncated: true,
            error: 'Validation error: schema mismatch',
          },
        };

        const result = assessor.assessQuality(input);

        expect(result.dimensions.confidence).toBe(0.4);
        expect(result.dimensions.completeness).toBe(0.0);
        expect(result.dimensions.coherence).toBeLessThan(1.0);
        expect(result.dimensions.correctness).toBeLessThan(1.0);
        expect(result.score).toBeLessThan(0.5);
        expect(result.meetsThresholds).toBe(false);
      });
    });

    describe('Threshold Validation', () => {
      it('should validate meetsThresholds correctly', () => {
        const goodInput: QualityAssessmentInput = {
          output: 'High quality response',
          confidence: 0.85,
          metadata: { truncated: false },
        };

        const badInput: QualityAssessmentInput = {
          output: 'Low quality response',
          confidence: 0.5,
          metadata: { truncated: true },
        };

        expect(assessor.meetsThresholds(goodInput)).toBe(true);
        expect(assessor.meetsThresholds(badInput)).toBe(false);
      });

      it('should use DEFAULT_QUALITY_THRESHOLDS', () => {
        expect(DEFAULT_QUALITY_THRESHOLDS.minQualityScore).toBe(0.75);
        expect(DEFAULT_QUALITY_THRESHOLDS.minConfidence).toBe(0.7);
        expect(DEFAULT_QUALITY_THRESHOLDS.minCompleteness).toBe(0.9);
        expect(DEFAULT_QUALITY_THRESHOLDS.maxTruncationRatio).toBe(0.05);
      });
    });
  });

  describe('Tier Recommendation', () => {
    it('should recommend Haiku for simple tasks', () => {
      const task: Task = {
        id: 'test-tier-1',
        description: 'Read file.txt',
        type: 'read',
      };

      const tier = assessor.getRecommendedTier(task);
      expect(tier).toBe('haiku');
    });

    it('should recommend Sonnet for medium tasks', () => {
      const task: Task = {
        id: 'test-tier-2',
        description: 'Analyze the codebase, identify performance bottlenecks, and create a report with recommendations',
        type: 'analysis',
      };

      const tier = assessor.getRecommendedTier(task);
      expect(tier).toBe('sonnet');
    });

    it('should recommend Opus for complex tasks', () => {
      const task: Task = {
        id: 'test-tier-3',
        description: `Design a complete microservices architecture with:
          - Event sourcing patterns
          - CQRS implementation
          - Distributed tracing
          - Service mesh integration
          - Chaos engineering strategy
          - Security hardening
          Consider scalability, reliability, and maintainability`,
        type: 'architecture',
      };

      const tier = assessor.getRecommendedTier(task);
      expect(tier).toBe('opus');
    });

    it('should use TIER_THRESHOLDS constants', () => {
      expect(TIER_THRESHOLDS.haiku.max).toBe(30);
      expect(TIER_THRESHOLDS.sonnet.min).toBe(25);
      expect(TIER_THRESHOLDS.sonnet.max).toBe(70);
      expect(TIER_THRESHOLDS.opus.min).toBe(65);
    });
  });

  describe('Integration Scenarios', () => {
    describe('TierSelector Use Case', () => {
      it('should support tier selection workflow', () => {
        const tasks: Task[] = [
          { id: '1', description: 'List files', type: 'simple' },
          { id: '2', description: 'Refactor authentication module', type: 'medium' },
          { id: '3', description: 'Design distributed system architecture', type: 'complex' },
        ];

        const results = tasks.map(task => ({
          task,
          complexity: assessor.assessComplexity(task),
          tier: assessor.getRecommendedTier(task),
        }));

        expect(results[0].tier).toBe('haiku');
        expect(results[1].tier).toBe('sonnet');
        expect(results[2].tier).toBe('opus');
      });
    });

    describe('EscalationEngine Use Case', () => {
      it('should support quality failure detection', () => {
        const outputs: QualityAssessmentInput[] = [
          {
            output: 'High quality result',
            confidence: 0.9,
            metadata: { truncated: false },
          },
          {
            output: 'Low quality result',
            confidence: 0.5,
            metadata: { truncated: true },
          },
          {
            output: '[ERROR] Failed',
            confidence: 0.3,
            metadata: { error: 'Validation failed' },
          },
        ];

        const results = outputs.map(output => ({
          quality: assessor.assessQuality(output),
          shouldEscalate: !assessor.meetsThresholds(output),
        }));

        expect(results[0].shouldEscalate).toBe(false);
        expect(results[1].shouldEscalate).toBe(true);
        expect(results[2].shouldEscalate).toBe(true);
      });
    });

    describe('SpeculationExecutor Use Case', () => {
      it('should support cache validation', () => {
        const cachedResults: QualityAssessmentInput[] = [
          {
            output: 'Valid cached result',
            confidence: 0.85,
            metadata: { truncated: false },
          },
          {
            output: 'Stale cached result',
            confidence: 0.6,
            metadata: { truncated: false },
          },
        ];

        const results = cachedResults.map(result => ({
          quality: assessor.assessQuality(result),
          isValid: assessor.meetsThresholds(result),
        }));

        expect(results[0].isValid).toBe(true);
        expect(results[1].isValid).toBe(false);
      });
    });

    describe('ResultAggregator Use Case', () => {
      it('should support swarm result filtering', () => {
        const swarmResults: QualityAssessmentInput[] = [
          {
            output: 'Worker 1 result',
            confidence: 0.9,
            metadata: { truncated: false },
          },
          {
            output: 'Worker 2 result',
            confidence: 0.8,
            metadata: { truncated: false },
          },
          {
            output: 'Worker 3 result',
            confidence: 0.5,
            metadata: { truncated: true },
          },
        ];

        const qualityResults = swarmResults
          .map(result => assessor.assessQuality(result))
          .filter(assessment => assessment.meetsThresholds);

        expect(qualityResults).toHaveLength(2);
        expect(qualityResults[0].score).toBeGreaterThan(0.75);
        expect(qualityResults[1].score).toBeGreaterThan(0.75);
      });
    });
  });

  describe('Performance', () => {
    it('should assess complexity quickly', () => {
      const task: Task = {
        id: 'perf-1',
        description: 'Medium complexity task with several steps',
        type: 'test',
      };

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        assessor.assessComplexity(task);
      }
      const end = performance.now();
      const avgTime = (end - start) / 1000;

      expect(avgTime).toBeLessThan(1); // <1ms per assessment
    });

    it('should assess quality quickly', () => {
      const input: QualityAssessmentInput = {
        output: 'Test output for performance measurement',
        confidence: 0.8,
        metadata: { truncated: false },
      };

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        assessor.assessQuality(input);
      }
      const end = performance.now();
      const avgTime = (end - start) / 1000;

      expect(avgTime).toBeLessThan(1); // <1ms per assessment
    });
  });
});
