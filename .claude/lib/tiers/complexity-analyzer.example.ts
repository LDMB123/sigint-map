/**
 * Example usage of Complexity Analyzer
 * Run with: npx tsx complexity-analyzer.example.ts
 */

import {
  analyzeTier,
  analyzeComplexity,
  type Task
} from './complexity-analyzer';

console.log('\n=== Complexity Analyzer Examples ===\n');

const examples: Array<{ name: string; task: Task }> = [
  {
    name: 'Simple validation (expected: HAIKU)',
    task: {
      description: 'Fix typo in README.md'
    }
  },
  {
    name: 'Syntax checking (expected: HAIKU)',
    task: {
      description: 'Validate JSON syntax in config files'
    }
  },
  {
    name: 'Feature implementation (expected: SONNET)',
    task: {
      description: `
Implement user authentication feature:
- Create database schema for users table
- Add JWT token generation
- Build login and signup endpoints
- Write integration tests
      `
    }
  },
  {
    name: 'Multi-file refactoring (expected: SONNET)',
    task: {
      description: `
Refactor the authentication system across auth.ts, user.ts, and middleware.ts.
Update TypeScript types and add proper error handling.
      `
    }
  },
  {
    name: 'Architecture design (expected: OPUS)',
    task: {
      description: `
Design a microservices architecture for an e-commerce platform.
How should we handle service communication? What about data consistency?
Consider scalability, fault tolerance, and deployment strategies.
Plan migration from monolith to microservices with minimal downtime.
Address concerns: database per service, API gateway, service mesh, event-driven patterns.
      `
    }
  },
  {
    name: 'Complex debugging (expected: SONNET)',
    task: {
      description: `
Investigate performance degradation across the system.
What bottlenecks exist in the database queries?
How can we optimize the React rendering?
Should we implement caching? Where?
Analyze the entire architecture and propose optimization strategy.
      `
    }
  },
  {
    name: 'Full system architecture (expected: OPUS)',
    task: {
      description: `
Design and implement a distributed event-driven microservices architecture for a high-scale e-commerce platform.

Questions to address:
- How should services communicate (synchronous vs asynchronous)?
- What patterns for data consistency (saga orchestration vs choreography)?
- Which message broker should we use (Kafka vs RabbitMQ vs NATS)?
- How to handle circuit breakers, retries, and fallbacks?
- What database per service (Postgres vs MongoDB vs Redis)?
- How to implement API gateway and service mesh?
- What observability strategy (tracing, metrics, logging)?

Implementation plan:
First, design the service boundaries and domain models.
Then, implement the event sourcing and CQRS patterns.
Next, build the API gateway with rate limiting and authentication.
After that, implement the saga coordinator for distributed transactions.
Finally, deploy with Kubernetes and set up monitoring.

Technical requirements:
- TypeScript with NestJS for backend services
- React with Next.js for frontend
- Postgres for transactional data, MongoDB for product catalog
- Redis for caching and session management
- Docker and Kubernetes for orchestration
- AWS infrastructure with multi-region support

Migration strategy:
Plan zero-downtime migration from monolith to microservices.
Consider strangler fig pattern, database decomposition, and gradual rollout.

Files involved: 20+ services across user.service.ts, order.service.ts, payment.service.ts,
inventory.service.ts, notification.service.ts, gateway.ts, saga-coordinator.ts, etc.
      `,
      context: {
        fileCount: 25
      }
    }
  }
];

examples.forEach(({ name, task }) => {
  const result = analyzeTier(task);
  const description = task.description.trim().replace(/\n\s+/g, ' ').substring(0, 100);

  console.log(`\n${name}`);
  console.log('='.repeat(60));
  console.log(`Description: ${description}${description.length >= 100 ? '...' : ''}`);
  console.log(`\nRecommended Tier: ${result.tier.toUpperCase()}`);
  console.log(`Complexity Score: ${result.score.toFixed(2)}/100`);
  console.log('\nSignals:');
  console.log(`  - Token Count: ${result.breakdown.signals.tokenCount}`);
  console.log(`  - Question Count: ${result.breakdown.signals.questionCount}`);
  console.log(`  - Step Count: ${result.breakdown.signals.stepCount}`);
  console.log(`  - Domain Count: ${result.breakdown.signals.domainCount}`);
  console.log(`  - File Count: ${result.breakdown.signals.fileCount}`);
  console.log(`  - Abstraction Level: ${result.breakdown.signals.abstractionLevel}/5`);
  console.log('\nScore Contributions:');
  console.log(`  - Token Count: ${result.breakdown.contributions.tokenCount.toFixed(2)}`);
  console.log(`  - Question Count: ${result.breakdown.contributions.questionCount.toFixed(2)}`);
  console.log(`  - Step Count: ${result.breakdown.contributions.stepCount.toFixed(2)}`);
  console.log(`  - Domain Count: ${result.breakdown.contributions.domainCount.toFixed(2)}`);
  console.log(`  - File Count: ${result.breakdown.contributions.fileCount.toFixed(2)}`);
  console.log(`  - Abstraction Level: ${result.breakdown.contributions.abstractionLevel.toFixed(2)}`);
});

console.log('\n\n=== Tier Thresholds ===');
console.log('Haiku (simple):  0-30');
console.log('Sonnet (medium): 25-70  (overlap zone: 25-30)');
console.log('Opus (complex):  65+    (overlap zone: 65-70)');
console.log('\nOverlap zones allow graceful degradation - try lower tier first, escalate if needed.\n');
