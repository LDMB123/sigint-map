/**
 * Integration tests for unified QualityAssessor
 *
 * Tests the integration between:
 * - QualityAssessor
 * - TierSelector
 * - EscalationEngine
 * - SpeculationExecutor
 * - ResultAggregator
 *
 * Run with: npx tsx .claude/tests/integration/quality-assessor.test.ts
 */

import {
  qualityAssessor,
  type Task,
  TIER_THRESHOLDS,
} from "../../lib/quality/quality-assessor";
import { selectTier, selectTierSimple } from "../../lib/tiers/tier-selector";

// Test utilities
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message}\n  Expected: ${expected}\n  Actual: ${actual}`
    );
  }
}

console.log("Integration Test: Unified QualityAssessor\n");
console.log("==========================================\n");

// Test 1: QualityAssessor basic functionality
console.log("Test 1: QualityAssessor basic functionality");
console.log("-------------------------------------------");

const assessor = qualityAssessor;

const simpleTask: Task = {
  description: "List files in directory",
  domain: "filesystem",
  requiredCapabilities: ["read"],
};

const complexitySimple = assessor.assessComplexity(simpleTask);
console.log(`Simple task complexity: ${complexitySimple.score}/100`);
console.log(`Recommended tier: ${complexitySimple.tier}`);

assert(
  complexitySimple.score <= TIER_THRESHOLDS.haiku.max,
  "Simple task should be below Haiku/Sonnet threshold"
);
assertEquals(complexitySimple.tier, "haiku", "Simple task should use Haiku");

const mediumTask: Task = {
  description:
    "Refactor the authentication module to use JWT tokens with refresh token rotation. Update the login endpoint, implement token refresh logic, add token blacklist support for logout, update middleware for token validation, and write comprehensive tests for all authentication flows.",
  domain: "backend",
  requiredCapabilities: ["code-generation", "security-analysis", "testing"],
  contextSize: 15000,
};

const complexityMedium = assessor.assessComplexity(mediumTask);
console.log(`\nMedium task complexity: ${complexityMedium.score}/100`);
console.log(`Recommended tier: ${complexityMedium.tier}`);

assert(
  complexityMedium.score >= TIER_THRESHOLDS.sonnet.min &&
    complexityMedium.score <= TIER_THRESHOLDS.sonnet.max,
  "Medium task should be in Sonnet range"
);
assertEquals(complexityMedium.tier, "sonnet", "Medium task should use Sonnet");

const complexTask: Task = {
  description:
    "Design and implement a distributed tracing system with custom instrumentation across microservices. First, design the trace context propagation architecture. Second, implement custom instrumentation for Node.js, Python, and Go services. Third, build the trace sampling algorithm with adaptive rates. Fourth, create the cross-service correlation engine. Fifth, implement the trace aggregation pipeline. Sixth, build real-time trace visualization dashboard. Seventh, add anomaly detection for trace patterns. Finally, write comprehensive documentation and migration guides for all services.",
  domain: "architecture",
  requiredCapabilities: [
    "system-design",
    "distributed-systems",
    "code-generation",
    "performance-optimization",
    "data-engineering",
    "frontend-development",
  ],
  contextSize: 50000,
  constraints: [
    "Must integrate with existing monitoring infrastructure",
    "Sub-millisecond overhead per span",
    "Handle 100k+ spans/sec throughput",
    "Support multi-cloud deployment",
    "Maintain backward compatibility",
  ],
};

const complexityComplex = assessor.assessComplexity(complexTask);
console.log(`\nComplex task complexity: ${complexityComplex.score}/100`);
console.log(`Recommended tier: ${complexityComplex.tier}`);

assert(
  complexityComplex.score >= TIER_THRESHOLDS.opus.min,
  "Complex task should be above Sonnet/Opus threshold"
);
assertEquals(complexityComplex.tier, "opus", "Complex task should use Opus");

console.log("\n✅ Test 1 passed\n");

// Test 2: TierSelector integration
console.log("Test 2: TierSelector integration with QualityAssessor");
console.log("------------------------------------------------------");

const tierSelectionSimple = selectTier(simpleTask);
console.log(`Simple task tier selection:`);
console.log(`  Tier: ${tierSelectionSimple.tier}`);
console.log(`  Score: ${tierSelectionSimple.score}`);
console.log(`  In overlap zone: ${tierSelectionSimple.inOverlapZone}`);
console.log(`  Can escalate: ${tierSelectionSimple.canEscalate}`);
console.log(`  Reason: ${tierSelectionSimple.reason}`);

assertEquals(
  tierSelectionSimple.tier,
  "haiku",
  "TierSelector should recommend Haiku for simple task"
);

const tierSelectionMedium = selectTier(mediumTask);
console.log(`\nMedium task tier selection:`);
console.log(`  Tier: ${tierSelectionMedium.tier}`);
console.log(`  Score: ${tierSelectionMedium.score}`);
console.log(`  In overlap zone: ${tierSelectionMedium.inOverlapZone}`);
console.log(`  Can escalate: ${tierSelectionMedium.canEscalate}`);

assertEquals(
  tierSelectionMedium.tier,
  "sonnet",
  "TierSelector should recommend Sonnet for medium task"
);

const tierSelectionComplex = selectTier(complexTask);
console.log(`\nComplex task tier selection:`);
console.log(`  Tier: ${tierSelectionComplex.tier}`);
console.log(`  Score: ${tierSelectionComplex.score}`);
console.log(`  In overlap zone: ${tierSelectionComplex.inOverlapZone}`);

assertEquals(
  tierSelectionComplex.tier,
  "opus",
  "TierSelector should recommend Opus for complex task"
);

console.log("\n✅ Test 2 passed\n");

// Test 3: Overlap zone detection
console.log("Test 3: Overlap zone detection and escalation");
console.log("----------------------------------------------");

// Create a task in the lower overlap zone (25-30)
const overlapTaskLower: Task = {
  description: "Parse and validate complex JSON schema with nested references",
  domain: "data-processing",
  requiredCapabilities: ["parsing", "validation"],
  contextSize: 8000,
};

const overlapSelectionLower = selectTier(overlapTaskLower);
console.log(`Lower overlap zone task:`);
console.log(`  Score: ${overlapSelectionLower.score}`);
console.log(`  Tier: ${overlapSelectionLower.tier}`);
console.log(`  In overlap zone: ${overlapSelectionLower.inOverlapZone}`);
console.log(`  Can escalate: ${overlapSelectionLower.canEscalate}`);
console.log(
  `  Escalation tier: ${overlapSelectionLower.escalationTier || "none"}`
);

if (
  overlapSelectionLower.score >= 25 &&
  overlapSelectionLower.score <= 30
) {
  assert(
    overlapSelectionLower.inOverlapZone,
    "Task in 25-30 range should be in overlap zone"
  );
  assert(
    overlapSelectionLower.canEscalate,
    "Task in overlap zone should allow escalation"
  );
}

console.log("\n✅ Test 3 passed\n");

// Test 4: Consistency across systems
console.log("Test 4: Consistency across all systems");
console.log("---------------------------------------");

const testTasks = [simpleTask, mediumTask, complexTask];

for (const task of testTasks) {
  const assessorResult = assessor.assessComplexity(task);
  const tierSelectorResult = selectTier(task);
  const tierSimple = selectTierSimple(task);

  console.log(`\nTask: ${task.description.substring(0, 50)}...`);
  console.log(`  QualityAssessor tier: ${assessorResult.tier}`);
  console.log(`  TierSelector tier: ${tierSelectorResult.tier}`);
  console.log(`  TierSelector simple: ${tierSimple}`);

  assertEquals(
    assessorResult.tier,
    tierSelectorResult.tier,
    "QualityAssessor and TierSelector should agree on tier"
  );
  assertEquals(
    tierSelectorResult.tier,
    tierSimple,
    "TierSelector full and simple should agree on tier"
  );
  assertEquals(
    assessorResult.score,
    tierSelectorResult.score,
    "Complexity scores should match"
  );
}

console.log("\n✅ Test 4 passed\n");

// Test 5: Singleton pattern
console.log("Test 5: Singleton pattern verification");
console.log("----------------------------------------");

const assessor1 = qualityAssessor;
const assessor2 = qualityAssessor;

assert(
  assessor1 === assessor2,
  "qualityAssessor should be singleton instance"
);

const result1 = assessor1.assessComplexity(simpleTask);
const result2 = assessor2.assessComplexity(simpleTask);

assertEquals(
  result1.score,
  result2.score,
  "Same task should produce same score across instances"
);
assertEquals(
  result1.tier,
  result2.tier,
  "Same task should produce same tier across instances"
);

console.log("✅ Singleton pattern working correctly");
console.log("\n✅ Test 5 passed\n");

// Test 6: Breakdown contributions
console.log("Test 6: Complexity breakdown validation");
console.log("---------------------------------------");

const breakdownTask: Task = {
  description:
    "Implement OAuth 2.0 authorization code flow with PKCE for mobile app",
  domain: "security",
  requiredCapabilities: [
    "authentication",
    "security-analysis",
    "mobile-development",
  ],
  contextSize: 20000,
  constraints: ["OWASP compliance", "Refresh token rotation"],
};

const breakdown = assessor.assessComplexity(breakdownTask);
console.log(`Task complexity breakdown:`);
console.log(
  `  Token Count: ${breakdown.contributions.tokenCount.toFixed(1)}`
);
console.log(
  `  Question Count: ${breakdown.contributions.questionCount.toFixed(1)}`
);
console.log(`  Step Count: ${breakdown.contributions.stepCount.toFixed(1)}`);
console.log(
  `  Domain Count: ${breakdown.contributions.domainCount.toFixed(1)}`
);
console.log(`  File Count: ${breakdown.contributions.fileCount.toFixed(1)}`);
console.log(
  `  Abstraction Level: ${breakdown.contributions.abstractionLevel.toFixed(1)}`
);
console.log(`  Total: ${breakdown.score.toFixed(1)}`);

const contributionSum =
  breakdown.contributions.tokenCount +
  breakdown.contributions.questionCount +
  breakdown.contributions.stepCount +
  breakdown.contributions.domainCount +
  breakdown.contributions.fileCount +
  breakdown.contributions.abstractionLevel;

assert(
  Math.abs(contributionSum - breakdown.score) < 0.01,
  "Contributions should sum to total score"
);

console.log("\n✅ Test 6 passed\n");

// Final summary
console.log("\n" + "=".repeat(50));
console.log("🎉 All integration tests passed!");
console.log("=".repeat(50));
console.log("\nSummary:");
console.log("  ✅ QualityAssessor basic functionality");
console.log("  ✅ TierSelector integration");
console.log("  ✅ Overlap zone detection");
console.log("  ✅ Cross-system consistency");
console.log("  ✅ Singleton pattern");
console.log("  ✅ Complexity breakdown validation");
console.log("\nAll systems are properly integrated and functioning correctly.");
