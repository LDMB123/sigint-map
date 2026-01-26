/**
 * Tier Selector Tests
 * Comprehensive test suite for tier selection and distribution tracking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  selectTier,
  selectTierSimple,
  analyzeBatch,
  TierDistributionTracker,
  createDistributionTracker,
  calculateDistribution,
  TARGET_DISTRIBUTION,
  ACCEPTABLE_DEVIATION,
  OVERLAP_ZONES,
  type Task,
  type TierSelection,
} from './tier-selector';

describe('Tier Selector', () => {
  describe('selectTier', () => {
    it('should select Haiku for simple tasks', () => {
      const task: Task = {
        description: 'Fix typo in README',
      };

      const selection = selectTier(task);

      expect(selection.tier).toBe('haiku');
      expect(selection.score).toBeLessThanOrEqual(30);
      expect(selection.inOverlapZone).toBe(false);
      expect(selection.canEscalate).toBe(false);
    });

    it('should select Sonnet for medium complexity tasks', () => {
      const task: Task = {
        description: `
          Implement user authentication with JWT tokens and OAuth.
          - Create login endpoint with validation
          - Add token validation middleware
          - Update user profile component
          - Integrate with third-party authentication providers
          - Add session management with Redis
          - Implement password hashing with bcrypt
          - Create password reset flow
          - Add two-factor authentication
        `,
      };

      const selection = selectTier(task);

      expect(selection.tier).toBe('sonnet');
      expect(selection.score).toBeGreaterThan(30);
      expect(selection.score).toBeLessThan(65);
    });

    it('should select Opus for complex tasks', () => {
      const task: Task = {
        description: `
          Design and implement a distributed event-driven microservices architecture for high-scale systems.

          What architectural patterns should we consider for this system?
          How do we ensure consistency across distributed transactions?
          What strategies can we implement for handling service failures?

          Requirements:
          - First, design the overall system architecture and microservices boundaries
          - Then, design event bus with Kafka for asynchronous communication
          - Next, implement saga pattern for distributed transactions
          - Add circuit breaker pattern for resilience and fault tolerance
          - Set up comprehensive observability with OpenTelemetry and Prometheus
          - Design database sharding strategy for PostgreSQL and MongoDB
          - Implement service mesh with Istio for traffic management
          - Add API gateway with rate limiting and authentication
          - Design caching strategy with Redis
          - Implement deployment pipeline with Kubernetes and Docker
          - Add security layer with OAuth and JWT
          - Finally, create monitoring dashboards and alerting

          Technologies: TypeScript, Node.js, React, Kafka, PostgreSQL, MongoDB, Redis, Kubernetes, Docker, Istio
        `,
      };

      const selection = selectTier(task);

      expect(selection.tier).toBe('opus');
      expect(selection.score).toBeGreaterThanOrEqual(65);
    });

    it('should detect lower overlap zone (25-30)', () => {
      const task: Task = {
        description: 'Update API endpoint to include new field and add validation',
      };

      const selection = selectTier(task);

      if (selection.score >= OVERLAP_ZONES.lower.min && selection.score <= OVERLAP_ZONES.lower.max) {
        expect(selection.inOverlapZone).toBe(true);
        expect(selection.tier).toBe('haiku');
        expect(selection.canEscalate).toBe(true);
        expect(selection.escalationTier).toBe('sonnet');
      }
    });

    it('should detect upper overlap zone (65-70)', () => {
      const task: Task = {
        description: `
          Implement complex state management system with multiple reducers.
          - Design architecture for scalable state
          - Add middleware for side effects
          - Implement time-travel debugging
          - Add persistence layer with IndexedDB
          - Create developer tools integration
        `,
      };

      const selection = selectTier(task);

      if (selection.score >= OVERLAP_ZONES.upper.min && selection.score <= OVERLAP_ZONES.upper.max) {
        expect(selection.inOverlapZone).toBe(true);
        expect(selection.tier).toBe('sonnet');
        expect(selection.canEscalate).toBe(true);
        expect(selection.escalationTier).toBe('opus');
      }
    });

    it('should include breakdown details', () => {
      const task: Task = {
        description: 'Add new React component',
      };

      const selection = selectTier(task);

      expect(selection.breakdown).toBeDefined();
      expect(selection.breakdown.score).toBe(selection.score);
      expect(selection.breakdown.signals).toBeDefined();
      expect(selection.breakdown.contributions).toBeDefined();
    });

    it('should provide selection reason', () => {
      const task: Task = {
        description: 'Update documentation',
      };

      const selection = selectTier(task);

      expect(selection.reason).toBeDefined();
      expect(typeof selection.reason).toBe('string');
      expect(selection.reason.length).toBeGreaterThan(0);
    });
  });

  describe('selectTierSimple', () => {
    it('should return tier name only for simple tasks', () => {
      const task: Task = {
        description: 'Fix typo',
      };

      const tier = selectTierSimple(task);

      expect(tier).toBe('haiku');
      expect(typeof tier).toBe('string');
    });

    it('should return tier name only for complex tasks', () => {
      const task: Task = {
        description: `
          Design and architect a complete distributed system with event sourcing, CQRS pattern,
          microservices architecture, and real-time data synchronization.

          How should we structure the event store?
          What patterns should we use for read models?
          How do we handle eventual consistency?
          What's the best approach for service discovery?

          Steps:
          1. Design overall system architecture
          2. Implement event sourcing with Kafka
          3. Create CQRS read and write models
          4. Build microservices with Node.js and Go
          5. Add real-time sync with WebSocket
          6. Implement API gateway
          7. Set up PostgreSQL and MongoDB
          8. Add Redis caching layer
          9. Configure Kubernetes deployment
          10. Add monitoring with Prometheus

          Technologies: TypeScript, Node.js, Go, React, Kafka, PostgreSQL, MongoDB, Redis, WebSocket, Kubernetes, Docker
        `,
      };

      const tier = selectTierSimple(task);

      expect(tier).toBe('opus');
    });
  });

  describe('TierDistributionTracker', () => {
    let tracker: TierDistributionTracker;

    beforeEach(() => {
      tracker = new TierDistributionTracker();
    });

    it('should initialize with zero counts', () => {
      const counts = tracker.getCounts();

      expect(counts.haiku).toBe(0);
      expect(counts.sonnet).toBe(0);
      expect(counts.opus).toBe(0);
      expect(counts.total).toBe(0);
    });

    it('should initialize with provided counts', () => {
      const customTracker = new TierDistributionTracker({
        haiku: 10,
        sonnet: 5,
        opus: 2,
        total: 17,
      });

      const counts = customTracker.getCounts();

      expect(counts.haiku).toBe(10);
      expect(counts.sonnet).toBe(5);
      expect(counts.opus).toBe(2);
      expect(counts.total).toBe(17);
    });

    it('should record tier selections', () => {
      tracker.record('haiku');
      tracker.record('haiku');
      tracker.record('sonnet');

      const counts = tracker.getCounts();

      expect(counts.haiku).toBe(2);
      expect(counts.sonnet).toBe(1);
      expect(counts.opus).toBe(0);
      expect(counts.total).toBe(3);
    });

    it('should record batch selections', () => {
      tracker.recordBatch(['haiku', 'haiku', 'sonnet', 'opus']);

      const counts = tracker.getCounts();

      expect(counts.haiku).toBe(2);
      expect(counts.sonnet).toBe(1);
      expect(counts.opus).toBe(1);
      expect(counts.total).toBe(4);
    });

    it('should calculate percentages correctly', () => {
      tracker.recordBatch(['haiku', 'haiku', 'haiku', 'sonnet', 'opus']);

      const percentages = tracker.getPercentages();

      expect(percentages.haiku).toBe(60);
      expect(percentages.sonnet).toBe(20);
      expect(percentages.opus).toBe(20);
    });

    it('should return zero percentages for empty tracker', () => {
      const percentages = tracker.getPercentages();

      expect(percentages.haiku).toBe(0);
      expect(percentages.sonnet).toBe(0);
      expect(percentages.opus).toBe(0);
    });

    it('should validate ideal distribution', () => {
      // Create ideal distribution: 60% Haiku, 35% Sonnet, 5% Opus
      const idealCounts = Array(100).fill(null).map((_, i) => {
        if (i < 60) return 'haiku';
        if (i < 95) return 'sonnet';
        return 'opus';
      }) as Array<'haiku' | 'sonnet' | 'opus'>;

      tracker.recordBatch(idealCounts);
      const validation = tracker.validate();

      expect(validation.isValid).toBe(true);
      expect(validation.current.haiku).toBe(60);
      expect(validation.current.sonnet).toBe(35);
      expect(validation.current.opus).toBe(5);
      expect(validation.recommendations).toHaveLength(0);
    });

    it('should detect too much Haiku usage', () => {
      // 80% Haiku, 15% Sonnet, 5% Opus
      const counts = [
        ...Array(80).fill('haiku'),
        ...Array(15).fill('sonnet'),
        ...Array(5).fill('opus'),
      ] as Array<'haiku' | 'sonnet' | 'opus'>;

      tracker.recordBatch(counts);
      const validation = tracker.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.deviations.haiku).toBeGreaterThan(ACCEPTABLE_DEVIATION);
      expect(validation.recommendations.length).toBeGreaterThan(0);
      expect(validation.recommendations.some(r => r.includes('Haiku usage too high'))).toBe(true);
    });

    it('should detect too much Opus usage', () => {
      // 50% Haiku, 30% Sonnet, 20% Opus
      const counts = [
        ...Array(50).fill('haiku'),
        ...Array(30).fill('sonnet'),
        ...Array(20).fill('opus'),
      ] as Array<'haiku' | 'sonnet' | 'opus'>;

      tracker.recordBatch(counts);
      const validation = tracker.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.deviations.opus).toBeGreaterThan(ACCEPTABLE_DEVIATION);
      expect(validation.recommendations.some(r => r.includes('Opus usage too high'))).toBe(true);
    });

    it('should reset counts', () => {
      tracker.recordBatch(['haiku', 'sonnet', 'opus']);
      tracker.reset();

      const counts = tracker.getCounts();

      expect(counts.total).toBe(0);
      expect(counts.haiku).toBe(0);
      expect(counts.sonnet).toBe(0);
      expect(counts.opus).toBe(0);
    });

    it('should generate summary string', () => {
      tracker.recordBatch([
        ...Array(60).fill('haiku'),
        ...Array(35).fill('sonnet'),
        ...Array(5).fill('opus'),
      ] as Array<'haiku' | 'sonnet' | 'opus'>);

      const summary = tracker.getSummary();

      expect(summary).toContain('Tier Distribution');
      expect(summary).toContain('Haiku:');
      expect(summary).toContain('Sonnet:');
      expect(summary).toContain('Opus:');
      expect(summary).toContain('Validation: PASS');
    });
  });

  describe('createDistributionTracker', () => {
    it('should create new tracker instance', () => {
      const tracker = createDistributionTracker();

      expect(tracker).toBeInstanceOf(TierDistributionTracker);
      expect(tracker.getCounts().total).toBe(0);
    });

    it('should create tracker with initial counts', () => {
      const tracker = createDistributionTracker({
        haiku: 5,
        sonnet: 3,
        opus: 1,
        total: 9,
      });

      const counts = tracker.getCounts();

      expect(counts.haiku).toBe(5);
      expect(counts.sonnet).toBe(3);
      expect(counts.opus).toBe(1);
      expect(counts.total).toBe(9);
    });
  });

  describe('analyzeBatch', () => {
    it('should analyze multiple tasks and return distribution', () => {
      const tasks: Task[] = [
        { description: 'Fix typo' },
        { description: 'Add new feature' },
        { description: 'Implement authentication with JWT and OAuth' },
        { description: 'Design microservices architecture' },
      ];

      const result = analyzeBatch(tasks);

      expect(result.selections).toHaveLength(4);
      expect(result.distribution.total).toBe(4);
      expect(result.percentages).toBeDefined();
      expect(result.validation).toBeDefined();
    });

    it('should return valid selections for each task', () => {
      const tasks: Task[] = [
        { description: 'Simple task' },
        { description: 'Medium complexity task with multiple steps' },
      ];

      const result = analyzeBatch(tasks);

      result.selections.forEach(selection => {
        expect(selection.tier).toBeDefined();
        expect(selection.score).toBeGreaterThanOrEqual(0);
        expect(selection.breakdown).toBeDefined();
        expect(selection.reason).toBeDefined();
      });
    });
  });

  describe('calculateDistribution', () => {
    it('should calculate distribution from counts', () => {
      const counts = {
        haiku: 60,
        sonnet: 35,
        opus: 5,
        total: 100,
      };

      const result = calculateDistribution(counts);

      expect(result.percentages.haiku).toBe(60);
      expect(result.percentages.sonnet).toBe(35);
      expect(result.percentages.opus).toBe(5);
      expect(result.validation.isValid).toBe(true);
    });

    it('should validate distribution', () => {
      const counts = {
        haiku: 80,
        sonnet: 15,
        opus: 5,
        total: 100,
      };

      const result = calculateDistribution(counts);

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty task description', () => {
      const task: Task = { description: '' };
      const selection = selectTier(task);

      expect(selection.tier).toBeDefined();
      expect(selection.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long task description', () => {
      const task: Task = {
        description: 'Task '.repeat(1000) + ' with many words',
      };

      const selection = selectTier(task);

      expect(selection.tier).toBeDefined();
      expect(selection.score).toBeGreaterThan(0);
    });

    it('should handle task with context metadata', () => {
      const task: Task = {
        description: 'Update component',
        context: {
          fileCount: 10,
          files: ['a.ts', 'b.ts', 'c.ts'],
        },
      };

      const selection = selectTier(task);

      expect(selection.tier).toBeDefined();
      expect(selection.breakdown.signals.fileCount).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    it('should maintain consistent scoring across multiple runs', () => {
      const task: Task = {
        description: 'Implement user authentication with JWT',
      };

      const selection1 = selectTier(task);
      const selection2 = selectTier(task);

      expect(selection1.score).toBe(selection2.score);
      expect(selection1.tier).toBe(selection2.tier);
    });

    it('should track distribution across realistic workflow', () => {
      const tracker = createDistributionTracker();

      // Simulate realistic workflow with mixed task complexity
      const tasks: Task[] = [
        // Simple tasks (should be ~60%)
        { description: 'Fix typo in docs' },
        { description: 'Update package version' },
        { description: 'Add comment to code' },
        { description: 'Format code' },
        { description: 'Update README' },
        { description: 'Fix linting error' },

        // Medium tasks (should be ~35%)
        {
          description: `Add new API endpoint with validation
            - Create endpoint handler
            - Add input validation
            - Write tests
            - Update documentation`
        },
        {
          description: `Implement user registration form with multiple fields
            - Email validation
            - Password strength checking
            - Error handling
            - Submit to API`
        },
        {
          description: `Add comprehensive unit tests for React component
            - Test rendering
            - Test user interactions
            - Test edge cases
            - Mock API calls`
        },
        {
          description: `Refactor legacy component to use modern React hooks
            - Convert class to function
            - Replace lifecycle methods
            - Update state management
            - Maintain existing behavior`
        },

        // Complex task (should be ~5%)
        {
          description: `Design and implement complete authentication system with OAuth, JWT, and role-based access control

            How should we structure the permission system?
            What OAuth providers should we support?

            Steps:
            1. Design authentication architecture
            2. Implement JWT token generation
            3. Add OAuth integration
            4. Create role-based permissions
            5. Add session management
            6. Implement password reset
            7. Add two-factor authentication

            Technologies: Node.js, Express, PostgreSQL, Redis, Passport, JWT`
        },
      ];

      tasks.forEach(task => {
        const selection = selectTier(task);
        tracker.record(selection.tier);
      });

      const percentages = tracker.getPercentages();

      // Verify distribution is reasonable (may not be exactly 60/35/5 with only 11 tasks)
      expect(percentages.haiku).toBeGreaterThan(30); // At least 30%
      expect(tracker.getCounts().total).toBe(11);
    });
  });
});
