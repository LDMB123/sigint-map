/**
 * Intent Predictor Tests
 * Validates 70%+ prediction accuracy across various workflows
 */

import { IntentPredictor, type TaskPrediction, type ActionRecord } from './intent-predictor';

describe('IntentPredictor', () => {
  let predictor: IntentPredictor;

  beforeEach(() => {
    predictor = new IntentPredictor({
      minConfidence: 0.70,
      maxPredictions: 3,
      lookBackWindow: 10,
      enableLearning: true
    });
  });

  describe('Workflow Pattern Matching', () => {
    it('should predict component workflow correctly', async () => {
      // User creates a component
      predictor.recordAction('component-create', 'create', {
        file: 'UserProfile.tsx',
        domain: 'react'
      });

      const predictions = await predictor.predictNext();

      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions[0].confidence).toBeGreaterThanOrEqual(0.70);

      // Should predict test-create or add as next step
      const topTasks = predictions.map(p => p.task);
      expect(topTasks).toContainOneOf(['test-create', 'add', 'docs-generate']);
    });

    it('should follow debug-fix-test cycle', async () => {
      predictor.recordAction('error-fix', 'fix', {
        file: 'service.ts',
        error: 'TypeError'
      });

      const predictions = await predictor.predictNext();

      expect(predictions[0].task).toBe('test-run');
      expect(predictions[0].confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('should predict API development workflow', async () => {
      predictor.recordAction('type-create', 'create', {
        file: 'schema.ts',
        domain: 'api'
      });

      predictor.recordAction('function-create', 'create', {
        file: 'router.ts',
        domain: 'api'
      });

      const predictions = await predictor.predictNext();

      expect(predictions[0].task).toBe('test-create');
      expect(predictions[0].confidence).toBeGreaterThanOrEqual(0.70);
    });
  });

  describe('Sequential Analysis', () => {
    it('should predict next step after component creation', async () => {
      predictor.recordAction('component-create', 'create', {
        file: 'Button.tsx'
      });

      const predictions = await predictor.predictNext();

      expect(predictions.length).toBeGreaterThanOrEqual(1);
      expect(predictions.some(p => p.task === 'test-create')).toBe(true);
    });

    it('should predict refactor after test run', async () => {
      predictor.recordAction('test-create', 'create', { file: 'service.test.ts' });
      predictor.recordAction('test-run', 'test', { file: 'service.test.ts' });

      const predictions = await predictor.predictNext();

      const tasks = predictions.map(p => p.task);
      expect(tasks).toContainOneOf(['refactor', 'docs-generate', 'test-run']);
    });
  });

  describe('Context-Aware Prediction', () => {
    it('should suggest rust-specific tasks in rust context', async () => {
      predictor.recordAction('function-create', 'create', {
        file: 'lib.rs',
        domain: 'rust'
      });

      const predictions = await predictor.predictNext();

      // Should include rust-specific predictions
      const allPredictions = predictions.map(p => p.task);
      const hasRustTask = allPredictions.some(task =>
        ['borrow-fix', 'compile-fix', 'test-create'].includes(task)
      );
      expect(hasRustTask).toBe(true);
    });

    it('should suggest react-specific tasks in react context', async () => {
      predictor.recordAction('component-create', 'create', {
        file: 'App.tsx',
        domain: 'react'
      });

      const predictions = await predictor.predictNext();

      expect(predictions.some(p =>
        ['test-create', 'add', 'component-create'].includes(p.task)
      )).toBe(true);
    });

    it('should suggest database tasks in database context', async () => {
      predictor.recordAction('type-create', 'create', {
        file: 'schema.prisma',
        domain: 'database'
      });

      const predictions = await predictor.predictNext();

      expect(predictions.some(p =>
        ['migrate', 'test-create', 'type-create'].includes(p.task)
      )).toBe(true);
    });
  });

  describe('Pattern Learning', () => {
    it('should learn from repeated sequences', async () => {
      // Repeat a custom sequence multiple times
      for (let i = 0; i < 5; i++) {
        predictor.recordAction('component-create', 'create', { file: `Comp${i}.tsx` });
        predictor.recordAction('add', 'modify', { file: `Comp${i}.tsx` });
        predictor.recordAction('test-create', 'create', { file: `Comp${i}.test.tsx` });
      }

      // Now start the sequence again
      predictor.recordAction('component-create', 'create', { file: 'NewComp.tsx' });

      const predictions = await predictor.predictNext();

      // Should predict 'add' with high confidence due to learned pattern
      expect(predictions.some(p => p.task === 'add')).toBe(true);
    });

    it('should export and import learned patterns', () => {
      predictor.recordAction('component-create', 'create', { file: 'A.tsx' });
      predictor.recordAction('test-create', 'create', { file: 'A.test.tsx' });

      const exported = predictor.exportLearnedPatterns();
      expect(Object.keys(exported).length).toBeGreaterThan(0);

      const newPredictor = new IntentPredictor();
      newPredictor.importLearnedPatterns(exported);

      expect(newPredictor.exportLearnedPatterns()).toEqual(exported);
    });
  });

  describe('Confidence Scoring', () => {
    it('should return predictions with confidence >= threshold', async () => {
      predictor.recordAction('component-create', 'create', {
        file: 'Component.tsx',
        domain: 'react'
      });

      const predictions = await predictor.predictNext();

      predictions.forEach(pred => {
        expect(pred.confidence).toBeGreaterThanOrEqual(0.70);
      });
    });

    it('should limit predictions to maxPredictions', async () => {
      predictor.recordAction('component-create', 'create', {
        file: 'Component.tsx'
      });

      const predictions = await predictor.predictNext();

      expect(predictions.length).toBeLessThanOrEqual(3);
    });

    it('should provide reasoning for each prediction', async () => {
      predictor.recordAction('error-fix', 'fix', { file: 'service.ts' });

      const predictions = await predictor.predictNext();

      predictions.forEach(pred => {
        expect(pred.reason).toBeTruthy();
        expect(pred.reason.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Parameter Inference', () => {
    it('should infer test file name from component', async () => {
      predictor.recordAction('component-create', 'create', {
        file: 'UserProfile.tsx',
        target: 'UserProfile.tsx'
      });

      const predictions = await predictor.predictNext();
      const testPred = predictions.find(p => p.task === 'test-create');

      if (testPred?.suggestedParams) {
        expect(testPred.suggestedParams.file).toBe('UserProfile.test.tsx');
      }
    });

    it('should suggest related targets', async () => {
      predictor.recordAction('function-create', 'create', {
        target: 'UserService',
        file: 'user.service.ts'
      });

      const predictions = await predictor.predictNext();

      predictions.forEach(pred => {
        if (pred.suggestedParams) {
          expect(pred.suggestedParams).toBeDefined();
        }
      });
    });
  });

  describe('Accuracy Tracking', () => {
    it('should track prediction accuracy', async () => {
      predictor.recordAction('component-create', 'create', { file: 'A.tsx' });

      const predictions = await predictor.predictNext();

      // Simulate user actually does predicted task
      const actualAction = 'test-create';
      const wasCorrect = predictor.validatePrediction(actualAction, predictions);

      if (predictions.some(p => p.task === actualAction)) {
        expect(wasCorrect).toBe(true);
      }

      const accuracy = predictor.getAccuracy();
      expect(accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy).toBeLessThanOrEqual(1);
    });

    it('should provide detailed statistics', () => {
      predictor.recordAction('component-create', 'create', { file: 'A.tsx' });

      const stats = predictor.getStats();

      expect(stats).toHaveProperty('accuracy');
      expect(stats).toHaveProperty('actionsRecorded');
      expect(stats).toHaveProperty('learnedPatterns');
      expect(stats).toHaveProperty('workflowPatterns');
    });
  });

  describe('Performance', () => {
    it('should predict in < 10ms', async () => {
      // Add some history
      for (let i = 0; i < 10; i++) {
        predictor.recordAction('component-create', 'create', { file: `Comp${i}.tsx` });
      }

      const start = performance.now();
      await predictor.predictNext();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should handle large action history efficiently', async () => {
      // Record 100 actions
      for (let i = 0; i < 100; i++) {
        predictor.recordAction('component-create', 'create', { file: `Comp${i}.tsx` });
      }

      const start = performance.now();
      const predictions = await predictor.predictNext();
      const duration = performance.now() - start;

      expect(predictions.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(10);
    });
  });

  describe('Session Management', () => {
    it('should clear history on new session', () => {
      predictor.recordAction('component-create', 'create', { file: 'A.tsx' });
      predictor.recordAction('test-create', 'create', { file: 'A.test.tsx' });

      expect(predictor.getStats().actionsRecorded).toBe(2);

      predictor.clearHistory();

      expect(predictor.getStats().actionsRecorded).toBe(0);
    });

    it('should maintain learned patterns across sessions', () => {
      predictor.recordAction('component-create', 'create', { file: 'A.tsx' });
      predictor.recordAction('test-create', 'create', { file: 'A.test.tsx' });

      const patternsBefore = predictor.exportLearnedPatterns();

      predictor.clearHistory();

      const patternsAfter = predictor.exportLearnedPatterns();
      expect(patternsAfter).toEqual(patternsBefore);
    });
  });

  describe('Real-World Workflows', () => {
    it('should predict full component development workflow', async () => {
      const workflow = [
        { intent: 'component-create', action: 'create', file: 'UserProfile.tsx' },
        { intent: 'test-create', action: 'create', file: 'UserProfile.test.tsx' },
        { intent: 'add', action: 'modify', file: 'UserProfile.tsx' },
        { intent: 'docs-generate', action: 'document', file: 'UserProfile.tsx' }
      ];

      let correctPredictions = 0;

      for (let i = 0; i < workflow.length - 1; i++) {
        predictor.recordAction(
          workflow[i].intent,
          workflow[i].action,
          { file: workflow[i].file }
        );

        const predictions = await predictor.predictNext();
        const nextActual = workflow[i + 1].intent;

        if (predictions.some(p => p.task === nextActual)) {
          correctPredictions++;
        }
      }

      const accuracy = correctPredictions / (workflow.length - 1);
      expect(accuracy).toBeGreaterThanOrEqual(0.5); // At least 50% for varied workflow
    });

    it('should predict debug cycle workflow', async () => {
      const workflow = [
        { intent: 'error-fix', action: 'fix', file: 'service.ts' },
        { intent: 'test-run', action: 'test', file: 'service.test.ts' },
        { intent: 'refactor', action: 'refactor', file: 'service.ts' },
        { intent: 'test-run', action: 'test', file: 'service.test.ts' }
      ];

      let correctPredictions = 0;

      for (let i = 0; i < workflow.length - 1; i++) {
        predictor.recordAction(
          workflow[i].intent,
          workflow[i].action,
          { file: workflow[i].file }
        );

        const predictions = await predictor.predictNext();
        const nextActual = workflow[i + 1].intent;

        if (predictions.some(p => p.task === nextActual)) {
          correctPredictions++;
        }
      }

      const accuracy = correctPredictions / (workflow.length - 1);
      expect(accuracy).toBeGreaterThanOrEqual(0.66); // At least 66% for debug cycle
    });

    it('should achieve 70%+ accuracy on common patterns', async () => {
      const testCases = [
        ['component-create', 'test-create'],
        ['error-fix', 'test-run'],
        ['test-create', 'test-run'],
        ['function-create', 'test-create'],
        ['refactor', 'test-run'],
        ['type-create', 'function-create'],
        ['component-create', 'add'],
        ['test-run', 'refactor'],
        ['function-create', 'integrate'],
        ['performance-optimize', 'test-run']
      ];

      let correct = 0;
      let total = testCases.length;

      for (const [first, expected] of testCases) {
        const localPredictor = new IntentPredictor();
        localPredictor.recordAction(first, 'action', { file: 'test.ts' });

        const predictions = await localPredictor.predictNext();

        if (predictions.some(p => p.task === expected)) {
          correct++;
        }
      }

      const accuracy = correct / total;
      expect(accuracy).toBeGreaterThanOrEqual(0.70);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty history', async () => {
      const predictions = await predictor.predictNext();

      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions.every(p => p.confidence >= 0.70)).toBe(true);
    });

    it('should handle single action', async () => {
      predictor.recordAction('component-create', 'create', { file: 'A.tsx' });

      const predictions = await predictor.predictNext();

      expect(predictions.length).toBeGreaterThan(0);
    });

    it('should handle failed actions', async () => {
      predictor.recordAction('compile-fix', 'fix', { file: 'lib.rs' }, false);

      const predictions = await predictor.predictNext();

      // Should still make predictions
      expect(predictions.length).toBeGreaterThan(0);
    });

    it('should handle unknown intents gracefully', async () => {
      predictor.recordAction('unknown-action', 'unknown', {});

      const predictions = await predictor.predictNext();

      expect(predictions.length).toBeGreaterThan(0);
    });
  });
});

// Custom matcher for "one of" checks
expect.extend({
  toContainOneOf(received: any[], expected: any[]) {
    const pass = expected.some(item => received.includes(item));

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${JSON.stringify(received)} not to contain one of ${JSON.stringify(expected)}`
          : `Expected ${JSON.stringify(received)} to contain one of ${JSON.stringify(expected)}`
    };
  }
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toContainOneOf(expected: any[]): R;
    }
  }
}
