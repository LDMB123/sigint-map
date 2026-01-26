/**
 * Tests for Complexity Analyzer
 */

import {
  analyzeComplexity,
  analyzeComplexityDetailed,
  analyzeTier,
  extractSignals,
  calculateComplexity,
  getRecommendedTier,
  TIER_THRESHOLDS,
  type Task,
  type ComplexitySignals
} from './complexity-analyzer';

// Test cases for different complexity levels

describe('Complexity Analyzer', () => {
  describe('extractSignals', () => {
    it('should extract signals from simple task', () => {
      const task: Task = {
        description: 'Fix typo in README.md'
      };

      const signals = extractSignals(task);

      expect(signals.tokenCount).toBeGreaterThan(0);
      expect(signals.fileCount).toBeGreaterThanOrEqual(1); // README.md mentioned
      expect(signals.abstractionLevel).toBeLessThanOrEqual(2);
    });

    it('should detect multiple questions', () => {
      const task: Task = {
        description: 'How should we implement this? What pattern is best? Why use this approach?'
      };

      const signals = extractSignals(task);

      expect(signals.questionCount).toBeGreaterThanOrEqual(3);
    });

    it('should count multiple steps', () => {
      const task: Task = {
        description: `
First, create the schema.
Then, implement the API.
Next, build the frontend.
Finally, write tests.
        `
      };

      const signals = extractSignals(task);

      expect(signals.stepCount).toBeGreaterThanOrEqual(4);
    });

    it('should detect multiple domains', () => {
      const task: Task = {
        description: 'Build a Next.js app with TypeScript, Postgres, and Redis, deployed to AWS'
      };

      const signals = extractSignals(task);

      expect(signals.domainCount).toBeGreaterThanOrEqual(4);
    });

    it('should detect high abstraction level', () => {
      const task: Task = {
        description: 'Design a scalable microservices architecture with event-driven communication'
      };

      const signals = extractSignals(task);

      expect(signals.abstractionLevel).toBeGreaterThanOrEqual(4);
    });
  });

  describe('calculateComplexity', () => {
    it('should calculate score for simple signals', () => {
      const signals: ComplexitySignals = {
        tokenCount: 100,
        questionCount: 0,
        stepCount: 1,
        domainCount: 0,
        fileCount: 1,
        abstractionLevel: 1
      };

      const score = calculateComplexity(signals);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(50);
    });

    it('should calculate score for complex signals', () => {
      const signals: ComplexitySignals = {
        tokenCount: 2000,
        questionCount: 5,
        stepCount: 8,
        domainCount: 6,
        fileCount: 10,
        abstractionLevel: 5
      };

      const score = calculateComplexity(signals);

      expect(score).toBeGreaterThan(50);
    });

    it('should cap score at 100', () => {
      const signals: ComplexitySignals = {
        tokenCount: 10000,
        questionCount: 20,
        stepCount: 50,
        domainCount: 10,
        fileCount: 20,
        abstractionLevel: 5
      };

      const score = calculateComplexity(signals);

      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('getRecommendedTier', () => {
    it('should recommend haiku for low scores', () => {
      expect(getRecommendedTier(10)).toBe('haiku');
      expect(getRecommendedTier(25)).toBe('haiku');
      expect(getRecommendedTier(30)).toBe('haiku');
    });

    it('should recommend sonnet for medium scores', () => {
      expect(getRecommendedTier(35)).toBe('sonnet');
      expect(getRecommendedTier(50)).toBe('sonnet');
      expect(getRecommendedTier(65)).toBe('sonnet');
    });

    it('should recommend opus for high scores', () => {
      expect(getRecommendedTier(70)).toBe('opus');
      expect(getRecommendedTier(85)).toBe('opus');
      expect(getRecommendedTier(100)).toBe('opus');
    });
  });

  describe('analyzeComplexity', () => {
    it('should analyze simple validation task (haiku tier)', () => {
      const task: Task = {
        description: 'Check if the syntax in config.json is valid'
      };

      const score = analyzeComplexity(task);

      expect(score).toBeLessThanOrEqual(TIER_THRESHOLDS.haiku.max);
    });

    it('should analyze implementation task (sonnet tier)', () => {
      const task: Task = {
        description: `
Implement a new feature for user authentication:
1. Create database schema for users table
2. Implement JWT token generation
3. Add login and signup endpoints
4. Write integration tests
        `
      };

      const score = analyzeComplexity(task);

      expect(score).toBeGreaterThan(TIER_THRESHOLDS.haiku.max);
      expect(score).toBeLessThan(TIER_THRESHOLDS.opus.min);
    });

    it('should analyze architecture task (opus tier)', () => {
      const task: Task = {
        description: `
Design a distributed microservices architecture for a high-scale e-commerce platform.
Consider: How should services communicate? What patterns for data consistency?
Which databases for different services? How to handle eventual consistency?
Design the API gateway, service mesh, and event-driven workflows.
Plan migration strategy from monolith to microservices.
        `
      };

      const score = analyzeComplexity(task);

      expect(score).toBeGreaterThanOrEqual(TIER_THRESHOLDS.opus.min);
    });
  });

  describe('analyzeTier', () => {
    it('should return tier recommendation with breakdown', () => {
      const task: Task = {
        description: 'Refactor the authentication module to use better patterns'
      };

      const result = analyzeTier(task);

      expect(result).toHaveProperty('tier');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('breakdown');
      expect(['haiku', 'sonnet', 'opus']).toContain(result.tier);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('analyzeComplexityDetailed', () => {
    it('should return detailed breakdown', () => {
      const task: Task = {
        description: 'Create a React component with TypeScript'
      };

      const breakdown = analyzeComplexityDetailed(task);

      expect(breakdown).toHaveProperty('score');
      expect(breakdown).toHaveProperty('signals');
      expect(breakdown).toHaveProperty('contributions');
      expect(breakdown.signals).toHaveProperty('tokenCount');
      expect(breakdown.signals).toHaveProperty('questionCount');
      expect(breakdown.signals).toHaveProperty('stepCount');
      expect(breakdown.signals).toHaveProperty('domainCount');
      expect(breakdown.signals).toHaveProperty('fileCount');
      expect(breakdown.signals).toHaveProperty('abstractionLevel');
      expect(breakdown.contributions).toHaveProperty('tokenCount');
      expect(breakdown.contributions).toHaveProperty('questionCount');
    });
  });
});

// Example usage for manual testing
if (require.main === module) {
  console.log('\n=== Complexity Analyzer Examples ===\n');

  const examples: Task[] = [
    {
      description: 'Fix typo in README.md'
    },
    {
      description: 'Validate JSON syntax in config files'
    },
    {
      description: `
Implement user authentication feature:
- Create database schema
- Add JWT token generation
- Build login/signup endpoints
- Write tests
      `
    },
    {
      description: `
Design a microservices architecture for e-commerce platform.
How should we handle service communication? What about data consistency?
Consider scalability, fault tolerance, and deployment strategies.
Plan migration from monolith to microservices with minimal downtime.
      `
    }
  ];

  examples.forEach((task, index) => {
    const result = analyzeTier(task);
    console.log(`Example ${index + 1}:`);
    console.log(`Description: ${task.description.trim().substring(0, 80)}...`);
    console.log(`Tier: ${result.tier.toUpperCase()}`);
    console.log(`Score: ${result.score}`);
    console.log(`Signals:`, result.breakdown.signals);
    console.log(`Contributions:`, result.breakdown.contributions);
    console.log('---\n');
  });
}
