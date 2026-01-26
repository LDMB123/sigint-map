/**
 * Task Decomposer
 * Decomposes complex tasks into 10-100 subtasks with dependency tracking
 * Supports map-reduce, scatter-gather, and pipeline execution patterns
 */

import { analyzeComplexity, type Task as ComplexityTask } from '../tiers/complexity-analyzer';

/**
 * Subtask interface
 */
export interface Subtask {
  id: string;
  description: string;
  type: SubtaskType;
  dependencies: string[]; // IDs of tasks that must complete before this one
  estimatedComplexity: number; // 0-100 complexity score
  priority: number; // 0-100, higher = more critical
  metadata?: Record<string, any>;
  tags?: string[];
}

/**
 * Subtask type for pattern-based execution
 */
export type SubtaskType =
  | 'atomic'        // Independent task, can run immediately
  | 'sequential'    // Must run after dependencies complete
  | 'parallel'      // Can run in parallel with siblings
  | 'reducer'       // Combines results from multiple tasks
  | 'mapper'        // Transforms data in parallel
  | 'scatter'       // Distributes work to multiple workers
  | 'gather'        // Collects results from scatter
  | 'pipeline';     // Part of a sequential pipeline

/**
 * Execution pattern for task orchestration
 */
export type ExecutionPattern =
  | 'sequential'      // One task at a time
  | 'parallel'        // All tasks in parallel
  | 'map-reduce'      // Map phase, then reduce phase
  | 'scatter-gather'  // Scatter work, then gather results
  | 'pipeline'        // Sequential stages with data flow
  | 'hybrid';         // Mix of patterns

/**
 * Task decomposition result
 */
export interface DecompositionResult {
  subtasks: Subtask[];
  executionPattern: ExecutionPattern;
  estimatedTotalComplexity: number;
  dependencyGraph: DependencyGraph;
  stages?: Stage[]; // For pipeline patterns
  validation: ValidationResult;
}

/**
 * Dependency graph for visualizing task relationships
 */
export interface DependencyGraph {
  nodes: Array<{
    id: string;
    label: string;
    complexity: number;
    type: SubtaskType;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: 'depends' | 'flows' | 'reduces';
  }>;
}

/**
 * Pipeline stage for sequential execution
 */
export interface Stage {
  name: string;
  subtasks: string[]; // Subtask IDs in this stage
  parallelizable: boolean; // Can subtasks in this stage run in parallel?
}

/**
 * Validation result for decomposition completeness
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  coverage: number; // 0-100, how well subtasks cover original task
  subtaskCount: number;
}

/**
 * Decomposition options
 */
export interface DecompositionOptions {
  minSubtasks?: number; // Minimum number of subtasks (default: 10)
  maxSubtasks?: number; // Maximum number of subtasks (default: 100)
  targetGranularity?: 'coarse' | 'medium' | 'fine'; // Task granularity
  preferredPattern?: ExecutionPattern; // Hint for execution pattern
  context?: Record<string, any>; // Additional context
  allowParallelization?: boolean; // Enable parallel execution (default: true)
}

/**
 * Task Decomposer class
 */
export class TaskDecomposer {
  private readonly defaultOptions: Required<DecompositionOptions> = {
    minSubtasks: 10,
    maxSubtasks: 100,
    targetGranularity: 'medium',
    preferredPattern: 'hybrid',
    context: {},
    allowParallelization: true,
  };

  /**
   * Decompose a complex task into subtasks
   */
  decompose(
    taskDescription: string,
    options: DecompositionOptions = {}
  ): DecompositionResult {
    const opts = { ...this.defaultOptions, ...options };

    // Step 1: Analyze task complexity
    const complexity = this.analyzeTaskComplexity(taskDescription, opts.context);

    // Step 2: Identify task structure and domain
    const structure = this.identifyTaskStructure(taskDescription);

    // Step 3: Determine optimal execution pattern
    const executionPattern = this.determineExecutionPattern(
      structure,
      opts.preferredPattern,
      opts.allowParallelization
    );

    // Step 4: Generate subtasks based on pattern
    const subtasks = this.generateSubtasks(
      taskDescription,
      structure,
      executionPattern,
      complexity,
      opts
    );

    // Step 5: Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(subtasks);

    // Step 6: Identify pipeline stages if applicable
    const stages = this.identifyStages(subtasks, executionPattern);

    // Step 7: Validate decomposition
    const validation = this.validateDecomposition(
      taskDescription,
      subtasks,
      opts
    );

    return {
      subtasks,
      executionPattern,
      estimatedTotalComplexity: complexity,
      dependencyGraph,
      stages,
      validation,
    };
  }

  /**
   * Analyze task complexity using existing complexity analyzer
   */
  private analyzeTaskComplexity(
    description: string,
    context: Record<string, any>
  ): number {
    const task: ComplexityTask = { description, context };
    return analyzeComplexity(task);
  }

  /**
   * Identify task structure and characteristics
   */
  private identifyTaskStructure(description: string): TaskStructure {
    const lower = description.toLowerCase();

    // Identify if task involves multiple phases
    const hasPhases = /\b(phase|stage|step|first|then|finally|after)\b/gi.test(lower);

    // Identify if task involves data transformation
    const hasTransformation = /\b(transform|convert|map|process|parse|format)\b/gi.test(lower);

    // Identify if task involves aggregation
    const hasAggregation = /\b(combine|merge|aggregate|summarize|reduce|collect)\b/gi.test(lower);

    // Identify if task involves distribution
    const hasDistribution = /\b(distribute|scatter|split|divide|partition)\b/gi.test(lower);

    // Identify if task involves multiple files or components
    const hasMultipleTargets = /\b(all|each|every|multiple|several)\b/gi.test(lower) ||
      (description.match(/\band\b/gi) || []).length > 2;

    // Identify task domain
    const domain = this.identifyDomain(description);

    // Identify if task is primarily CRUD or implementation
    const isCRUD = /\b(create|read|update|delete|add|remove|list)\b/gi.test(lower);
    const isImplementation = /\b(implement|build|develop|code|write)\b/gi.test(lower);
    const isRefactoring = /\b(refactor|restructure|reorganize|improve)\b/gi.test(lower);
    const isTesting = /\b(test|verify|validate|check)\b/gi.test(lower);

    return {
      hasPhases,
      hasTransformation,
      hasAggregation,
      hasDistribution,
      hasMultipleTargets,
      domain,
      isCRUD,
      isImplementation,
      isRefactoring,
      isTesting,
    };
  }

  /**
   * Identify task domain
   */
  private identifyDomain(description: string): string {
    const lower = description.toLowerCase();
    const domains = [
      { pattern: /\b(react|vue|angular|svelte|frontend|ui|component)\b/gi, name: 'frontend' },
      { pattern: /\b(api|backend|server|endpoint|route)\b/gi, name: 'backend' },
      { pattern: /\b(database|schema|query|migration|postgres|mongodb)\b/gi, name: 'database' },
      { pattern: /\b(test|testing|jest|vitest|playwright|cypress)\b/gi, name: 'testing' },
      { pattern: /\b(deploy|ci|cd|docker|kubernetes|pipeline)\b/gi, name: 'devops' },
      { pattern: /\b(security|auth|authentication|authorization|oauth)\b/gi, name: 'security' },
      { pattern: /\b(performance|optimize|benchmark|profile)\b/gi, name: 'performance' },
    ];

    for (const { pattern, name } of domains) {
      if (pattern.test(lower)) {
        return name;
      }
    }

    return 'general';
  }

  /**
   * Determine optimal execution pattern
   */
  private determineExecutionPattern(
    structure: TaskStructure,
    preferred: ExecutionPattern,
    allowParallel: boolean
  ): ExecutionPattern {
    // If pattern is explicitly preferred, use it (unless incompatible)
    if (preferred !== 'hybrid') {
      return preferred;
    }

    // Map-reduce pattern: transformation + aggregation
    if (structure.hasTransformation && structure.hasAggregation && structure.hasMultipleTargets) {
      return allowParallel ? 'map-reduce' : 'sequential';
    }

    // Scatter-gather pattern: distribution + collection
    if (structure.hasDistribution && structure.hasAggregation) {
      return allowParallel ? 'scatter-gather' : 'sequential';
    }

    // Pipeline pattern: clear phases/stages
    if (structure.hasPhases) {
      return 'pipeline';
    }

    // Parallel pattern: multiple independent targets
    if (structure.hasMultipleTargets && allowParallel) {
      return 'parallel';
    }

    // Default to sequential for single-phase tasks
    return 'sequential';
  }

  /**
   * Generate subtasks based on execution pattern
   */
  private generateSubtasks(
    description: string,
    structure: TaskStructure,
    pattern: ExecutionPattern,
    complexity: number,
    options: Required<DecompositionOptions>
  ): Subtask[] {
    const subtasks: Subtask[] = [];

    // Determine target number of subtasks based on complexity and granularity
    const targetCount = this.calculateTargetSubtaskCount(
      complexity,
      options.targetGranularity,
      options.minSubtasks,
      options.maxSubtasks
    );

    switch (pattern) {
      case 'map-reduce':
        this.generateMapReduceSubtasks(subtasks, description, structure, targetCount, complexity);
        break;
      case 'scatter-gather':
        this.generateScatterGatherSubtasks(subtasks, description, structure, targetCount, complexity);
        break;
      case 'pipeline':
        this.generatePipelineSubtasks(subtasks, description, structure, targetCount, complexity);
        break;
      case 'parallel':
        this.generateParallelSubtasks(subtasks, description, structure, targetCount, complexity);
        break;
      case 'sequential':
        this.generateSequentialSubtasks(subtasks, description, structure, targetCount, complexity);
        break;
      case 'hybrid':
        this.generateHybridSubtasks(subtasks, description, structure, targetCount, complexity);
        break;
    }

    return subtasks;
  }

  /**
   * Calculate target subtask count based on complexity and granularity
   */
  private calculateTargetSubtaskCount(
    complexity: number,
    granularity: 'coarse' | 'medium' | 'fine',
    min: number,
    max: number
  ): number {
    // Base count on complexity (0-100 maps to min-max)
    let baseCount = Math.floor(min + (complexity / 100) * (max - min));

    // Adjust for granularity
    const granularityMultiplier = {
      coarse: 0.6,  // Fewer, larger subtasks
      medium: 1.0,  // Balanced
      fine: 1.4,    // More, smaller subtasks
    };

    const adjusted = Math.floor(baseCount * granularityMultiplier[granularity]);

    // Ensure within bounds
    return Math.max(min, Math.min(max, adjusted));
  }

  /**
   * Generate map-reduce subtasks
   */
  private generateMapReduceSubtasks(
    subtasks: Subtask[],
    description: string,
    structure: TaskStructure,
    targetCount: number,
    complexity: number
  ): void {
    // Setup phase (1 task)
    subtasks.push({
      id: this.generateId('setup'),
      description: 'Initialize and prepare data for processing',
      type: 'atomic',
      dependencies: [],
      estimatedComplexity: Math.min(complexity * 0.1, 20),
      priority: 100,
      tags: ['setup', 'initialization'],
    });

    // Map phase (targetCount * 0.7 tasks)
    const mapCount = Math.max(Math.floor(targetCount * 0.7), 8);
    const mapTaskIds: string[] = [];

    for (let i = 0; i < mapCount; i++) {
      const id = this.generateId(`map-${i}`);
      mapTaskIds.push(id);
      subtasks.push({
        id,
        description: `Process and transform data chunk ${i + 1}/${mapCount}`,
        type: 'mapper',
        dependencies: [subtasks[0].id],
        estimatedComplexity: Math.min(complexity * 0.6 / mapCount, 15),
        priority: 80,
        tags: ['map', 'transform', 'parallel'],
      });
    }

    // Reduce phase (targetCount * 0.2 tasks)
    const reduceCount = Math.max(Math.floor(targetCount * 0.2), 2);
    const reduceTaskIds: string[] = [];

    for (let i = 0; i < reduceCount; i++) {
      const id = this.generateId(`reduce-${i}`);
      reduceTaskIds.push(id);
      subtasks.push({
        id,
        description: `Combine and aggregate results from map phase (stage ${i + 1}/${reduceCount})`,
        type: 'reducer',
        dependencies: mapTaskIds,
        estimatedComplexity: Math.min(complexity * 0.2 / reduceCount, 20),
        priority: 90,
        tags: ['reduce', 'aggregate', 'combine'],
      });
    }

    // Finalize phase (1 task)
    subtasks.push({
      id: this.generateId('finalize'),
      description: 'Finalize results and perform cleanup',
      type: 'sequential',
      dependencies: reduceTaskIds,
      estimatedComplexity: Math.min(complexity * 0.1, 15),
      priority: 95,
      tags: ['finalize', 'cleanup'],
    });
  }

  /**
   * Generate scatter-gather subtasks
   */
  private generateScatterGatherSubtasks(
    subtasks: Subtask[],
    description: string,
    structure: TaskStructure,
    targetCount: number,
    complexity: number
  ): void {
    // Scatter task (1 task)
    subtasks.push({
      id: this.generateId('scatter'),
      description: 'Distribute work across parallel workers',
      type: 'scatter',
      dependencies: [],
      estimatedComplexity: Math.min(complexity * 0.15, 25),
      priority: 100,
      tags: ['scatter', 'distribute'],
    });

    // Worker tasks (targetCount * 0.8 tasks)
    const workerCount = Math.max(Math.floor(targetCount * 0.8), 8);
    const workerTaskIds: string[] = [];

    for (let i = 0; i < workerCount; i++) {
      const id = this.generateId(`worker-${i}`);
      workerTaskIds.push(id);
      subtasks.push({
        id,
        description: `Process assigned work unit ${i + 1}/${workerCount}`,
        type: 'parallel',
        dependencies: [subtasks[0].id],
        estimatedComplexity: Math.min(complexity * 0.7 / workerCount, 18),
        priority: 85,
        tags: ['worker', 'parallel', 'execute'],
      });
    }

    // Gather task (1 task)
    subtasks.push({
      id: this.generateId('gather'),
      description: 'Collect and consolidate results from all workers',
      type: 'gather',
      dependencies: workerTaskIds,
      estimatedComplexity: Math.min(complexity * 0.15, 25),
      priority: 95,
      tags: ['gather', 'consolidate'],
    });
  }

  /**
   * Generate pipeline subtasks
   */
  private generatePipelineSubtasks(
    subtasks: Subtask[],
    description: string,
    structure: TaskStructure,
    targetCount: number,
    complexity: number
  ): void {
    // Identify pipeline stages based on common patterns
    const stages = this.identifyPipelineStages(description, structure);
    const stageCount = Math.max(stages.length, 3);
    const subtasksPerStage = Math.max(Math.floor(targetCount / stageCount), 3);

    let previousStageIds: string[] = [];

    for (let stageIdx = 0; stageIdx < stageCount; stageIdx++) {
      const stage = stages[stageIdx] || { name: `Stage ${stageIdx + 1}`, description: '' };
      const stageTaskIds: string[] = [];

      for (let taskIdx = 0; taskIdx < subtasksPerStage; taskIdx++) {
        const id = this.generateId(`stage${stageIdx}-task${taskIdx}`);
        stageTaskIds.push(id);

        subtasks.push({
          id,
          description: `${stage.name}: Task ${taskIdx + 1}/${subtasksPerStage}`,
          type: 'pipeline',
          dependencies: taskIdx === 0 ? previousStageIds : [stageTaskIds[taskIdx - 1]],
          estimatedComplexity: Math.min(complexity / targetCount, 12),
          priority: 100 - (stageIdx * 10),
          tags: ['pipeline', stage.name.toLowerCase().replace(/\s+/g, '-')],
        });
      }

      previousStageIds = stageTaskIds;
    }
  }

  /**
   * Generate parallel subtasks
   */
  private generateParallelSubtasks(
    subtasks: Subtask[],
    description: string,
    structure: TaskStructure,
    targetCount: number,
    complexity: number
  ): void {
    // All tasks can run in parallel
    for (let i = 0; i < targetCount; i++) {
      subtasks.push({
        id: this.generateId(`parallel-${i}`),
        description: `Execute independent task ${i + 1}/${targetCount}`,
        type: 'parallel',
        dependencies: [],
        estimatedComplexity: Math.min(complexity / targetCount, 15),
        priority: 90,
        tags: ['parallel', 'independent'],
      });
    }
  }

  /**
   * Generate sequential subtasks
   */
  private generateSequentialSubtasks(
    subtasks: Subtask[],
    description: string,
    structure: TaskStructure,
    targetCount: number,
    complexity: number
  ): void {
    // Each task depends on the previous one
    for (let i = 0; i < targetCount; i++) {
      const dependencies = i > 0 ? [subtasks[i - 1].id] : [];
      subtasks.push({
        id: this.generateId(`seq-${i}`),
        description: `Execute sequential task ${i + 1}/${targetCount}`,
        type: 'sequential',
        dependencies,
        estimatedComplexity: Math.min(complexity / targetCount, 12),
        priority: 100 - (i * 2),
        tags: ['sequential'],
      });
    }
  }

  /**
   * Generate hybrid subtasks (mix of patterns)
   */
  private generateHybridSubtasks(
    subtasks: Subtask[],
    description: string,
    structure: TaskStructure,
    targetCount: number,
    complexity: number
  ): void {
    // Use domain-specific heuristics to create a hybrid pattern
    if (structure.domain === 'frontend' || structure.domain === 'backend') {
      this.generateFeatureImplementationSubtasks(subtasks, description, targetCount, complexity);
    } else if (structure.domain === 'database') {
      this.generateDatabaseTaskSubtasks(subtasks, description, targetCount, complexity);
    } else if (structure.isTesting) {
      this.generateTestingSubtasks(subtasks, description, targetCount, complexity);
    } else {
      // Default hybrid: setup, parallel work, finalize
      this.generateDefaultHybridSubtasks(subtasks, description, targetCount, complexity);
    }
  }

  /**
   * Generate feature implementation subtasks (common full-stack pattern)
   */
  private generateFeatureImplementationSubtasks(
    subtasks: Subtask[],
    description: string,
    targetCount: number,
    complexity: number
  ): void {
    // Phase 1: Design and planning (10%)
    const planningCount = Math.max(Math.floor(targetCount * 0.1), 2);
    const planningIds: string[] = [];

    for (let i = 0; i < planningCount; i++) {
      const id = this.generateId(`plan-${i}`);
      planningIds.push(id);
      subtasks.push({
        id,
        description: i === 0 ? 'Define data models and API contracts' : 'Design UI components and state flow',
        type: 'sequential',
        dependencies: i > 0 ? [planningIds[i - 1]] : [],
        estimatedComplexity: Math.min(complexity * 0.1 / planningCount, 18),
        priority: 100,
        tags: ['planning', 'design'],
      });
    }

    // Phase 2: Parallel implementation (60%)
    const implCount = Math.max(Math.floor(targetCount * 0.6), 6);
    const implIds: string[] = [];

    for (let i = 0; i < implCount; i++) {
      const id = this.generateId(`impl-${i}`);
      implIds.push(id);
      subtasks.push({
        id,
        description: `Implement component/feature ${i + 1}/${implCount}`,
        type: 'parallel',
        dependencies: planningIds,
        estimatedComplexity: Math.min(complexity * 0.6 / implCount, 15),
        priority: 85,
        tags: ['implementation', 'parallel'],
      });
    }

    // Phase 3: Integration (20%)
    const integCount = Math.max(Math.floor(targetCount * 0.2), 2);
    const integIds: string[] = [];

    for (let i = 0; i < integCount; i++) {
      const id = this.generateId(`integ-${i}`);
      integIds.push(id);
      subtasks.push({
        id,
        description: `Wire up and integrate component ${i + 1}/${integCount}`,
        type: 'sequential',
        dependencies: i === 0 ? implIds : [integIds[i - 1]],
        estimatedComplexity: Math.min(complexity * 0.2 / integCount, 20),
        priority: 90,
        tags: ['integration', 'wiring'],
      });
    }

    // Phase 4: Testing and validation (10%)
    const testCount = Math.max(Math.floor(targetCount * 0.1), 1);

    for (let i = 0; i < testCount; i++) {
      subtasks.push({
        id: this.generateId(`test-${i}`),
        description: i === 0 ? 'Add unit and integration tests' : 'Perform end-to-end testing',
        type: 'sequential',
        dependencies: i === 0 ? integIds : [subtasks[subtasks.length - 1].id],
        estimatedComplexity: Math.min(complexity * 0.1 / testCount, 18),
        priority: 95,
        tags: ['testing', 'validation'],
      });
    }
  }

  /**
   * Generate database task subtasks
   */
  private generateDatabaseTaskSubtasks(
    subtasks: Subtask[],
    description: string,
    targetCount: number,
    complexity: number
  ): void {
    const phases = [
      { name: 'Schema design', ratio: 0.2, type: 'sequential' as const },
      { name: 'Migration creation', ratio: 0.3, type: 'sequential' as const },
      { name: 'Query implementation', ratio: 0.3, type: 'parallel' as const },
      { name: 'Testing and validation', ratio: 0.2, type: 'sequential' as const },
    ];

    let prevPhaseIds: string[] = [];

    for (const phase of phases) {
      const phaseCount = Math.max(Math.floor(targetCount * phase.ratio), 1);
      const phaseIds: string[] = [];

      for (let i = 0; i < phaseCount; i++) {
        const id = this.generateId(`${phase.name.toLowerCase().replace(/\s+/g, '-')}-${i}`);
        phaseIds.push(id);

        const dependencies = phase.type === 'parallel'
          ? prevPhaseIds
          : i > 0 ? [phaseIds[i - 1]] : prevPhaseIds;

        subtasks.push({
          id,
          description: `${phase.name}: Task ${i + 1}/${phaseCount}`,
          type: phase.type,
          dependencies,
          estimatedComplexity: Math.min(complexity * phase.ratio / phaseCount, 18),
          priority: 100 - (phases.indexOf(phase) * 15),
          tags: [phase.name.toLowerCase().replace(/\s+/g, '-'), 'database'],
        });
      }

      prevPhaseIds = phaseIds;
    }
  }

  /**
   * Generate testing subtasks
   */
  private generateTestingSubtasks(
    subtasks: Subtask[],
    description: string,
    targetCount: number,
    complexity: number
  ): void {
    // Setup test infrastructure (10%)
    const setupCount = Math.max(Math.floor(targetCount * 0.1), 1);
    const setupIds: string[] = [];

    for (let i = 0; i < setupCount; i++) {
      const id = this.generateId(`setup-${i}`);
      setupIds.push(id);
      subtasks.push({
        id,
        description: 'Set up test fixtures and mocks',
        type: 'sequential',
        dependencies: i > 0 ? [setupIds[i - 1]] : [],
        estimatedComplexity: Math.min(complexity * 0.1 / setupCount, 20),
        priority: 100,
        tags: ['setup', 'fixtures'],
      });
    }

    // Write tests in parallel (80%)
    const testCount = Math.max(Math.floor(targetCount * 0.8), 6);
    const testIds: string[] = [];

    for (let i = 0; i < testCount; i++) {
      const id = this.generateId(`test-${i}`);
      testIds.push(id);
      subtasks.push({
        id,
        description: `Write test suite ${i + 1}/${testCount}`,
        type: 'parallel',
        dependencies: setupIds,
        estimatedComplexity: Math.min(complexity * 0.8 / testCount, 15),
        priority: 90,
        tags: ['test-writing', 'parallel'],
      });
    }

    // Validate and report (10%)
    const validateCount = Math.max(Math.floor(targetCount * 0.1), 1);

    for (let i = 0; i < validateCount; i++) {
      subtasks.push({
        id: this.generateId(`validate-${i}`),
        description: 'Run test suite and validate coverage',
        type: 'sequential',
        dependencies: testIds,
        estimatedComplexity: Math.min(complexity * 0.1 / validateCount, 18),
        priority: 95,
        tags: ['validation', 'coverage'],
      });
    }
  }

  /**
   * Generate default hybrid subtasks
   */
  private generateDefaultHybridSubtasks(
    subtasks: Subtask[],
    description: string,
    targetCount: number,
    complexity: number
  ): void {
    // Setup (15%)
    const setupCount = Math.max(Math.floor(targetCount * 0.15), 2);
    const setupIds: string[] = [];

    for (let i = 0; i < setupCount; i++) {
      const id = this.generateId(`setup-${i}`);
      setupIds.push(id);
      subtasks.push({
        id,
        description: `Prepare and initialize ${i + 1}/${setupCount}`,
        type: 'sequential',
        dependencies: i > 0 ? [setupIds[i - 1]] : [],
        estimatedComplexity: Math.min(complexity * 0.15 / setupCount, 18),
        priority: 100,
        tags: ['setup'],
      });
    }

    // Parallel execution (70%)
    const execCount = Math.max(Math.floor(targetCount * 0.7), 6);
    const execIds: string[] = [];

    for (let i = 0; i < execCount; i++) {
      const id = this.generateId(`exec-${i}`);
      execIds.push(id);
      subtasks.push({
        id,
        description: `Execute work item ${i + 1}/${execCount}`,
        type: 'parallel',
        dependencies: setupIds,
        estimatedComplexity: Math.min(complexity * 0.7 / execCount, 14),
        priority: 85,
        tags: ['execution', 'parallel'],
      });
    }

    // Finalize (15%)
    const finalCount = Math.max(Math.floor(targetCount * 0.15), 1);

    for (let i = 0; i < finalCount; i++) {
      subtasks.push({
        id: this.generateId(`final-${i}`),
        description: `Finalize and validate ${i + 1}/${finalCount}`,
        type: 'sequential',
        dependencies: i === 0 ? execIds : [subtasks[subtasks.length - 1].id],
        estimatedComplexity: Math.min(complexity * 0.15 / finalCount, 18),
        priority: 95,
        tags: ['finalize'],
      });
    }
  }

  /**
   * Identify pipeline stages from task description
   */
  private identifyPipelineStages(
    description: string,
    structure: TaskStructure
  ): Array<{ name: string; description: string }> {
    const stages: Array<{ name: string; description: string }> = [];

    // Look for explicit stage markers
    const stagePatterns = [
      /phase\s+\d+:?\s*([^\n.]+)/gi,
      /stage\s+\d+:?\s*([^\n.]+)/gi,
      /step\s+\d+:?\s*([^\n.]+)/gi,
      /\d+\.\s*([^\n.]+)/g,
    ];

    for (const pattern of stagePatterns) {
      const matches = [...description.matchAll(pattern)];
      if (matches.length >= 2) {
        for (const match of matches) {
          stages.push({
            name: match[1].trim(),
            description: match[1].trim(),
          });
        }
        break;
      }
    }

    // If no explicit stages, use domain defaults
    if (stages.length === 0) {
      if (structure.isImplementation) {
        stages.push(
          { name: 'Design', description: 'Design and plan implementation' },
          { name: 'Implement', description: 'Implement core functionality' },
          { name: 'Test', description: 'Add tests and validation' },
          { name: 'Polish', description: 'Refine and optimize' }
        );
      } else if (structure.isRefactoring) {
        stages.push(
          { name: 'Analyze', description: 'Analyze current code' },
          { name: 'Plan', description: 'Plan refactoring approach' },
          { name: 'Execute', description: 'Perform refactoring' },
          { name: 'Validate', description: 'Validate correctness' }
        );
      } else {
        stages.push(
          { name: 'Prepare', description: 'Prepare and initialize' },
          { name: 'Execute', description: 'Execute main work' },
          { name: 'Finalize', description: 'Finalize and validate' }
        );
      }
    }

    return stages;
  }

  /**
   * Build dependency graph from subtasks
   */
  private buildDependencyGraph(subtasks: Subtask[]): DependencyGraph {
    const nodes = subtasks.map((task) => ({
      id: task.id,
      label: task.description.slice(0, 50),
      complexity: task.estimatedComplexity,
      type: task.type,
    }));

    const edges: DependencyGraph['edges'] = [];

    for (const task of subtasks) {
      for (const depId of task.dependencies) {
        const depTask = subtasks.find((t) => t.id === depId);
        const edgeType = task.type === 'reducer' ? 'reduces' :
                        task.type === 'pipeline' ? 'flows' : 'depends';

        edges.push({
          from: depId,
          to: task.id,
          type: edgeType,
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Identify pipeline stages from subtasks
   */
  private identifyStages(
    subtasks: Subtask[],
    pattern: ExecutionPattern
  ): Stage[] | undefined {
    if (pattern !== 'pipeline') {
      return undefined;
    }

    // Group tasks into stages based on dependencies
    const stages: Stage[] = [];
    const visited = new Set<string>();
    const taskMap = new Map(subtasks.map((t) => [t.id, t]));

    // Find tasks with no dependencies (stage 0)
    const rootTasks = subtasks.filter((t) => t.dependencies.length === 0);

    if (rootTasks.length === 0) {
      return undefined;
    }

    let currentLevel = rootTasks.map((t) => t.id);
    let stageNum = 1;

    while (currentLevel.length > 0 && stageNum <= 20) {
      // Mark visited
      currentLevel.forEach((id) => visited.add(id));

      // Create stage
      stages.push({
        name: `Stage ${stageNum}`,
        subtasks: currentLevel,
        parallelizable: currentLevel.length > 1,
      });

      // Find next level (tasks whose dependencies are all visited)
      const nextLevel: string[] = [];
      for (const task of subtasks) {
        if (!visited.has(task.id) &&
            task.dependencies.every((depId) => visited.has(depId))) {
          nextLevel.push(task.id);
        }
      }

      currentLevel = nextLevel;
      stageNum++;
    }

    return stages;
  }

  /**
   * Validate decomposition completeness
   */
  private validateDecomposition(
    originalTask: string,
    subtasks: Subtask[],
    options: Required<DecompositionOptions>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check subtask count bounds
    if (subtasks.length < options.minSubtasks) {
      errors.push(`Subtask count (${subtasks.length}) is below minimum (${options.minSubtasks})`);
    }

    if (subtasks.length > options.maxSubtasks) {
      errors.push(`Subtask count (${subtasks.length}) exceeds maximum (${options.maxSubtasks})`);
    }

    // Check for cycles in dependency graph
    const hasCycle = this.detectCycle(subtasks);
    if (hasCycle) {
      errors.push('Circular dependency detected in subtask graph');
    }

    // Check for orphaned tasks (no path from root to task)
    const orphans = this.findOrphanedTasks(subtasks);
    if (orphans.length > 0) {
      warnings.push(`${orphans.length} orphaned tasks found: ${orphans.join(', ')}`);
    }

    // Check for missing dependencies (referenced IDs that don't exist)
    const allIds = new Set(subtasks.map((t) => t.id));
    for (const task of subtasks) {
      for (const depId of task.dependencies) {
        if (!allIds.has(depId)) {
          errors.push(`Task ${task.id} references non-existent dependency ${depId}`);
        }
      }
    }

    // Estimate coverage (how well subtasks cover the original task)
    const coverage = this.estimateCoverage(originalTask, subtasks);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      coverage,
      subtaskCount: subtasks.length,
    };
  }

  /**
   * Detect cycles in dependency graph using DFS
   */
  private detectCycle(subtasks: Subtask[]): boolean {
    const taskMap = new Map(subtasks.map((t) => [t.id, t]));
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (taskId: string): boolean => {
      visited.add(taskId);
      recursionStack.add(taskId);

      const task = taskMap.get(taskId);
      if (!task) return false;

      for (const depId of task.dependencies) {
        if (!visited.has(depId)) {
          if (hasCycleDFS(depId)) {
            return true;
          }
        } else if (recursionStack.has(depId)) {
          return true; // Cycle detected
        }
      }

      recursionStack.delete(taskId);
      return false;
    };

    for (const task of subtasks) {
      if (!visited.has(task.id)) {
        if (hasCycleDFS(task.id)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Find orphaned tasks (no path from root tasks)
   */
  private findOrphanedTasks(subtasks: Subtask[]): string[] {
    const taskMap = new Map(subtasks.map((t) => [t.id, t]));
    const reachable = new Set<string>();

    // Find root tasks (no dependencies)
    const rootTasks = subtasks.filter((t) => t.dependencies.length === 0);

    // DFS from each root
    const visitDFS = (taskId: string) => {
      if (reachable.has(taskId)) return;
      reachable.add(taskId);

      // Visit all tasks that depend on this task
      for (const task of subtasks) {
        if (task.dependencies.includes(taskId)) {
          visitDFS(task.id);
        }
      }
    };

    for (const root of rootTasks) {
      visitDFS(root.id);
    }

    // Find unreachable tasks
    const orphans: string[] = [];
    for (const task of subtasks) {
      if (!reachable.has(task.id)) {
        orphans.push(task.id);
      }
    }

    return orphans;
  }

  /**
   * Estimate how well subtasks cover the original task
   */
  private estimateCoverage(originalTask: string, subtasks: Subtask[]): number {
    // Extract key concepts from original task
    const originalConcepts = this.extractConcepts(originalTask);

    // Extract concepts from all subtasks
    const subtaskConcepts = new Set<string>();
    for (const task of subtasks) {
      const concepts = this.extractConcepts(task.description);
      concepts.forEach((c) => subtaskConcepts.add(c));
    }

    // Calculate overlap
    let matchCount = 0;
    for (const concept of originalConcepts) {
      if (subtaskConcepts.has(concept)) {
        matchCount++;
      }
    }

    const coverage = originalConcepts.size > 0
      ? (matchCount / originalConcepts.size) * 100
      : 100;

    return Math.round(coverage);
  }

  /**
   * Extract key concepts from text
   */
  private extractConcepts(text: string): Set<string> {
    const concepts = new Set<string>();

    // Extract nouns and verbs (simplified)
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3); // Ignore short words

    // Common stop words to filter out
    const stopWords = new Set([
      'this', 'that', 'with', 'from', 'have', 'will', 'would',
      'should', 'could', 'about', 'which', 'their', 'there', 'when',
      'where', 'what', 'how', 'task', 'tasks', 'work', 'item'
    ]);

    for (const word of words) {
      if (!stopWords.has(word)) {
        concepts.add(word);
      }
    }

    return concepts;
  }

  /**
   * Generate unique task ID
   */
  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Export decomposition as JSON
   */
  exportJSON(result: DecompositionResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Export decomposition as Mermaid diagram
   */
  exportMermaid(result: DecompositionResult): string {
    let mermaid = 'graph TD\n';

    // Add nodes
    for (const node of result.dependencyGraph.nodes) {
      const shape = this.getMermaidShape(node.type);
      const label = node.label.replace(/"/g, "'");
      mermaid += `  ${node.id}${shape[0]}"${label}"${shape[1]}\n`;
    }

    // Add edges
    for (const edge of result.dependencyGraph.edges) {
      const arrow = edge.type === 'flows' ? '-->' : '-.->';
      mermaid += `  ${edge.from} ${arrow} ${edge.to}\n`;
    }

    return mermaid;
  }

  /**
   * Get Mermaid shape for task type
   */
  private getMermaidShape(type: SubtaskType): [string, string] {
    switch (type) {
      case 'mapper':
      case 'reducer':
        return ['[/', '/]'];
      case 'scatter':
      case 'gather':
        return ['{{', '}}'];
      case 'pipeline':
        return ['[', ']'];
      default:
        return ['(', ')'];
    }
  }
}

/**
 * Task structure interface (internal)
 */
interface TaskStructure {
  hasPhases: boolean;
  hasTransformation: boolean;
  hasAggregation: boolean;
  hasDistribution: boolean;
  hasMultipleTargets: boolean;
  domain: string;
  isCRUD: boolean;
  isImplementation: boolean;
  isRefactoring: boolean;
  isTesting: boolean;
}

// Export singleton instance
export const decomposer = new TaskDecomposer();

// Export convenience function
export function decomposeTask(
  taskDescription: string,
  options?: DecompositionOptions
): DecompositionResult {
  return decomposer.decompose(taskDescription, options);
}
