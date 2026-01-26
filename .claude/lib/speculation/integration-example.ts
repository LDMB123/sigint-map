/**
 * Speculation Executor Integration Example
 *
 * Demonstrates integration with:
 * - Intent Predictor (workflow pattern recognition)
 * - Route Table (agent routing)
 * - Skill Packs (pre-warming)
 * - Cascading Tiers (Haiku → Sonnet escalation)
 *
 * @module integration-example
 */

import { SpeculationExecutor, Prediction } from './speculation-executor';
import { performance } from 'perf_hooks';

/**
 * Mock Intent Predictor
 * Analyzes workflow context and predicts next actions
 */
class IntentPredictor {
  private workflowPatterns: Map<string, Prediction[]>;

  constructor() {
    this.workflowPatterns = new Map([
      [
        'rust:borrow-error',
        [
          { action: 'run cargo check', confidence: 0.95, priority: 3 },
          { action: 'fix related errors', confidence: 0.80, priority: 2 },
          { action: 'run tests', confidence: 0.70, priority: 1 }
        ]
      ],
      [
        'rust:new-project',
        [
          { action: 'add dependencies', confidence: 0.95, priority: 3 },
          { action: 'create main.rs', confidence: 0.90, priority: 2 },
          { action: 'setup cargo.toml', confidence: 0.85, priority: 1 }
        ]
      ],
      [
        'svelte:new-component',
        [
          { action: 'add props types', confidence: 0.90, priority: 3 },
          { action: 'add styles', confidence: 0.85, priority: 2 },
          { action: 'add tests', confidence: 0.60, priority: 1 }
        ]
      ],
      [
        'typescript:refactor',
        [
          { action: 'run type check', confidence: 0.95, priority: 3 },
          { action: 'update tests', confidence: 0.85, priority: 2 },
          { action: 'update documentation', confidence: 0.70, priority: 1 }
        ]
      ]
    ]);
  }

  /**
   * Predict next actions based on current context
   */
  predict(context: {
    recentAction: string;
    projectType: string;
    currentFile?: string;
  }): Prediction[] {
    const key = `${context.projectType}:${this.normalizeAction(context.recentAction)}`;
    const predictions = this.workflowPatterns.get(key) || [];

    // Add context to predictions
    return predictions.map(p => ({
      ...p,
      context: {
        projectType: context.projectType,
        triggerAction: context.recentAction,
        currentFile: context.currentFile
      }
    }));
  }

  private normalizeAction(action: string): string {
    const normalized = action.toLowerCase();

    if (normalized.includes('borrow') || normalized.includes('lifetime')) {
      return 'borrow-error';
    }
    if (normalized.includes('new project') || normalized.includes('create project')) {
      return 'new-project';
    }
    if (normalized.includes('component')) {
      return 'new-component';
    }
    if (normalized.includes('refactor')) {
      return 'refactor';
    }

    return 'unknown';
  }
}

/**
 * Mock Router for agent selection
 */
class AgentRouter {
  route(action: string): { agentId: string; tier: 'haiku' | 'sonnet' | 'opus' } {
    const actionLower = action.toLowerCase();

    // Simple routing logic
    if (actionLower.includes('check') || actionLower.includes('validate')) {
      return { agentId: 'validator', tier: 'haiku' };
    }
    if (actionLower.includes('fix') || actionLower.includes('refactor')) {
      return { agentId: 'code-reviewer', tier: 'sonnet' };
    }
    if (actionLower.includes('design') || actionLower.includes('architecture')) {
      return { agentId: 'architect', tier: 'opus' };
    }

    return { agentId: 'general-agent', tier: 'sonnet' };
  }
}

/**
 * Mock Skill Pack Loader
 */
class SkillPackLoader {
  private loadedPacks: Set<string>;

  constructor() {
    this.loadedPacks = new Set();
  }

  preWarm(skills: string[]): void {
    skills.forEach(skill => {
      if (!this.loadedPacks.has(skill)) {
        console.log(`  [SkillPack] Pre-warming: ${skill}`);
        this.loadedPacks.add(skill);
      }
    });
  }

  isLoaded(skill: string): boolean {
    return this.loadedPacks.has(skill);
  }
}

/**
 * Integration orchestrator
 */
class SpeculativeWorkflowEngine {
  private speculationExecutor: SpeculationExecutor;
  private intentPredictor: IntentPredictor;
  private router: AgentRouter;
  private skillLoader: SkillPackLoader;

  constructor() {
    this.speculationExecutor = new SpeculationExecutor({
      enabled: true,
      budget: {
        maxSpeculations: 5,
        timeoutMs: 5000,
        maxTokens: 2000
      },
      cacheTtlSeconds: 600,
      minConfidence: 0.7,
      backgroundRefinement: true
    });

    this.intentPredictor = new IntentPredictor();
    this.router = new AgentRouter();
    this.skillLoader = new SkillPackLoader();
  }

  /**
   * Handle user action and trigger speculative execution
   */
  async onUserAction(context: {
    action: string;
    projectType: string;
    currentFile?: string;
  }): Promise<void> {
    console.log(`\n[Workflow] User action: ${context.action}`);

    // 1. Predict next actions
    const predictions = this.intentPredictor.predict({
      recentAction: context.action,
      projectType: context.projectType,
      currentFile: context.currentFile
    });

    console.log(`[Predictor] Found ${predictions.length} predictions:`);
    predictions.forEach(p => {
      console.log(`  - ${p.action} (confidence: ${p.confidence})`);
    });

    if (predictions.length === 0) {
      console.log('[Predictor] No predictions found');
      return;
    }

    // 2. Pre-warm skill packs for predicted actions
    const requiredSkills = this.extractRequiredSkills(predictions);
    if (requiredSkills.length > 0) {
      console.log(`[Integration] Pre-warming ${requiredSkills.length} skill packs...`);
      this.skillLoader.preWarm(requiredSkills);
    }

    // 3. Execute speculations
    console.log('[Executor] Starting speculative execution...');
    await this.speculationExecutor.executeSpeculations(predictions);

    // 4. Report statistics
    const stats = this.speculationExecutor.getStats();
    console.log(`[Executor] Completed: ${stats.totalSpeculations} speculations`);
  }

  /**
   * Handle user request (should hit cache if predicted)
   */
  async onUserRequest(action: string, context?: Record<string, any>): Promise<any> {
    console.log(`\n[Request] User requests: ${action}`);

    const startTime = performance.now();

    // 1. Check speculation cache
    const cachedResult = await this.speculationExecutor.getCachedResult(action, context);

    const responseTime = performance.now() - startTime;

    if (cachedResult) {
      console.log(`[Cache] HIT! Response time: ${responseTime.toFixed(2)}ms`);
      console.log(`[Cache] Model: ${cachedResult.model}`);
      console.log(`[Cache] Original execution: ${cachedResult.executionTimeMs.toFixed(2)}ms`);
      console.log(`[Cache] Speedup: ${(cachedResult.executionTimeMs / responseTime).toFixed(2)}x`);
      return cachedResult.result;
    }

    // 2. Cache miss - execute with router
    console.log(`[Cache] MISS - executing request...`);
    const route = this.router.route(action);
    console.log(`[Router] Routed to: ${route.agentId} (${route.tier})`);

    // Simulate execution
    await new Promise(resolve => setTimeout(resolve, 800));

    const totalTime = performance.now() - startTime;
    console.log(`[Request] Total time: ${totalTime.toFixed(2)}ms`);

    return { success: true, message: 'Executed without speculation' };
  }

  /**
   * Extract required skills from predictions
   */
  private extractRequiredSkills(predictions: Prediction[]): string[] {
    const skills = new Set<string>();

    predictions.forEach(p => {
      const action = p.action.toLowerCase();

      if (action.includes('cargo') || action.includes('rust')) {
        skills.add('rust-analyzer');
        skills.add('cargo-tools');
      }
      if (action.includes('test')) {
        skills.add('test-runner');
      }
      if (action.includes('type')) {
        skills.add('typescript-checker');
      }
      if (action.includes('style')) {
        skills.add('css-formatter');
      }
    });

    return Array.from(skills);
  }

  /**
   * Get engine statistics
   */
  getStatistics() {
    return this.speculationExecutor.exportStats();
  }
}

/**
 * Example workflow scenarios
 */
export async function demonstrateWorkflows() {
  console.log('=== Speculative Workflow Engine Demo ===\n');

  const engine = new SpeculativeWorkflowEngine();

  // Scenario 1: Rust borrow checker workflow
  console.log('\n--- Scenario 1: Rust Borrow Checker Workflow ---');

  // User fixes a borrow error
  await engine.onUserAction({
    action: 'Fix borrow checker error in src/lib.rs',
    projectType: 'rust',
    currentFile: 'src/lib.rs'
  });

  // Simulate short delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // User's predicted next action - should hit cache
  await engine.onUserRequest('run cargo check', {
    projectType: 'rust'
  });

  // Scenario 2: New Svelte component workflow
  console.log('\n\n--- Scenario 2: Svelte Component Workflow ---');

  await engine.onUserAction({
    action: 'Create new Button component',
    projectType: 'svelte',
    currentFile: 'src/components/Button.svelte'
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  await engine.onUserRequest('add props types', {
    projectType: 'svelte'
  });

  // Scenario 3: TypeScript refactoring workflow
  console.log('\n\n--- Scenario 3: TypeScript Refactoring Workflow ---');

  await engine.onUserAction({
    action: 'Refactor UserService class',
    projectType: 'typescript',
    currentFile: 'src/services/UserService.ts'
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  await engine.onUserRequest('run type check', {
    projectType: 'typescript'
  });

  // Scenario 4: Cache miss scenario
  console.log('\n\n--- Scenario 4: Unpredicted Action (Cache Miss) ---');

  await engine.onUserRequest('generate API documentation', {
    projectType: 'typescript'
  });

  // Final statistics
  console.log('\n\n--- Final Statistics ---');
  const stats = engine.getStatistics();
  console.log(JSON.stringify(stats, null, 2));

  // Validate performance targets
  console.log('\n--- Performance Validation ---');
  if (stats.validation.valid) {
    console.log(`✓ PASSED: Achieved ${stats.validation.speedup.toFixed(2)}x speedup`);
    console.log(`✓ Hit rate: ${(stats.validation.hitRate * 100).toFixed(1)}%`);
  } else {
    console.log('✗ FAILED: Performance targets not met');
    stats.validation.issues.forEach(issue => {
      console.log(`  - ${issue}`);
    });
  }
}

/**
 * Benchmark comparison: Traditional vs Speculative
 */
export async function benchmarkComparison() {
  console.log('\n=== Benchmark: Traditional vs Speculative ===\n');

  const engine = new SpeculativeWorkflowEngine();

  // Simulate typical workflow: 5 sequential actions
  const workflow = [
    { action: 'Fix borrow error', projectType: 'rust' },
    { action: 'Run cargo check', projectType: 'rust' },
    { action: 'Fix related errors', projectType: 'rust' },
    { action: 'Run tests', projectType: 'rust' },
    { action: 'Commit changes', projectType: 'rust' }
  ];

  // Traditional approach (no speculation)
  console.log('Traditional Approach (Sequential Execution):');
  const traditionalStart = performance.now();

  for (const step of workflow) {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate 800ms per action
  }

  const traditionalTime = performance.now() - traditionalStart;
  console.log(`  Total time: ${traditionalTime.toFixed(2)}ms`);

  // Speculative approach
  console.log('\nSpeculative Approach (With Pre-Execution):');
  const speculativeStart = performance.now();

  // First action triggers speculation
  await engine.onUserAction({
    action: workflow[0].action,
    projectType: workflow[0].projectType
  });

  // Wait briefly for speculations to complete
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Subsequent actions hit cache
  for (let i = 1; i < workflow.length; i++) {
    await engine.onUserRequest(workflow[i].action, {
      projectType: workflow[i].projectType
    });
  }

  const speculativeTime = performance.now() - speculativeStart;
  console.log(`  Total time: ${speculativeTime.toFixed(2)}ms`);

  // Comparison
  const speedup = traditionalTime / speculativeTime;
  console.log('\nComparison:');
  console.log(`  Speedup: ${speedup.toFixed(2)}x`);
  console.log(`  Time saved: ${(traditionalTime - speculativeTime).toFixed(2)}ms`);
  console.log(`  Percentage: ${((1 - speculativeTime / traditionalTime) * 100).toFixed(1)}% faster`);

  if (speedup >= 8) {
    console.log('\n  ✓ PASSED: Achieved 8x+ speedup target');
  } else {
    console.log('\n  ✗ FAILED: Below 8x speedup target');
  }
}

// Run examples if executed directly
if (require.main === module) {
  (async () => {
    await demonstrateWorkflows();
    await benchmarkComparison();
  })();
}
