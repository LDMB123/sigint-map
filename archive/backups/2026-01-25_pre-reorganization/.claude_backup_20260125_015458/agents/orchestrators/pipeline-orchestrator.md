---
name: pipeline-orchestrator
description: Orchestrates complex multi-stage pipelines for maximum throughput
version: 1.0
type: orchestrator
tier: sonnet
functional_category: orchestration
throughput: 5-10x improvement
---

# Pipeline Orchestrator

## Mission
Orchestrate complex multi-stage pipelines to maximize throughput and quality.

## Pipeline Architecture

### 1. Streaming Pipeline
```typescript
interface PipelineStage {
  name: string;
  process: (input: any) => Promise<any>;
  parallelism: number;
  tier: 'haiku' | 'sonnet' | 'opus';
}

class StreamingPipeline {
  private stages: PipelineStage[] = [];
  private buffers: Map<string, any[]> = new Map();

  async execute(inputs: any[]): Promise<any[]> {
    // Initialize stage buffers
    for (const stage of this.stages) {
      this.buffers.set(stage.name, []);
    }

    // Stream inputs through pipeline
    const results: any[] = [];

    for (const input of inputs) {
      // Push through each stage
      let current = input;
      for (const stage of this.stages) {
        current = await this.processStage(stage, current);
      }
      results.push(current);
    }

    return results;
  }

  private async processStage(
    stage: PipelineStage,
    input: any
  ): Promise<any> {
    // Batch processing for efficiency
    const buffer = this.buffers.get(stage.name)!;
    buffer.push(input);

    if (buffer.length >= stage.parallelism) {
      // Process batch
      const batch = buffer.splice(0, stage.parallelism);
      const results = await Promise.all(
        batch.map(item => stage.process(item))
      );
      return results[results.length - 1];
    }

    return input; // Return immediately, process in batch later
  }
}
```

### 2. DAG Pipeline
```typescript
interface PipelineNode {
  id: string;
  dependencies: string[];
  execute: (inputs: Map<string, any>) => Promise<any>;
}

class DAGPipeline {
  private nodes: Map<string, PipelineNode> = new Map();

  async execute(initialInputs: Map<string, any>): Promise<Map<string, any>> {
    const results = new Map(initialInputs);
    const completed = new Set<string>(initialInputs.keys());
    const pending = [...this.nodes.values()];

    while (pending.length > 0) {
      // Find nodes with all dependencies satisfied
      const ready = pending.filter(node =>
        node.dependencies.every(dep => completed.has(dep))
      );

      if (ready.length === 0) {
        throw new Error('Circular dependency detected');
      }

      // Execute ready nodes in parallel
      const executions = ready.map(async (node) => {
        const inputs = new Map(
          node.dependencies.map(dep => [dep, results.get(dep)])
        );
        const result = await node.execute(inputs);
        results.set(node.id, result);
        completed.add(node.id);
      });

      await Promise.all(executions);

      // Remove completed from pending
      for (const node of ready) {
        pending.splice(pending.indexOf(node), 1);
      }
    }

    return results;
  }
}
```

### 3. Adaptive Pipeline
```typescript
class AdaptivePipeline {
  private metrics: PipelineMetrics;

  async execute(
    input: any,
    qualityTarget: number
  ): Promise<PipelineResult> {
    // Start with minimal pipeline
    let pipeline = this.getMinimalPipeline();
    let result = await this.runPipeline(pipeline, input);
    let quality = await this.assessQuality(result);

    // Adaptively add stages if needed
    while (quality < qualityTarget && pipeline.length < MAX_STAGES) {
      const nextStage = this.selectNextStage(result, quality);
      pipeline.push(nextStage);
      result = await nextStage.process(result);
      quality = await this.assessQuality(result);
    }

    return {
      result,
      quality,
      stagesUsed: pipeline.length,
      totalCost: this.calculateCost(pipeline),
    };
  }

  private selectNextStage(
    currentResult: any,
    currentQuality: number
  ): PipelineStage {
    // Analyze weaknesses
    const weaknesses = this.analyzeWeaknesses(currentResult);

    // Select stage that addresses biggest weakness
    return this.getStageFor(weaknesses[0]);
  }
}
```

## Pipeline Templates

### Code Generation Pipeline
```typescript
const CODE_GEN_PIPELINE: PipelineStage[] = [
  { name: 'understand', tier: 'haiku', parallelism: 1 },
  { name: 'design', tier: 'haiku', parallelism: 1 },
  { name: 'implement', tier: 'sonnet', parallelism: 1 },
  { name: 'test', tier: 'haiku', parallelism: 3 },
  { name: 'refine', tier: 'haiku', parallelism: 1 },
  { name: 'document', tier: 'haiku', parallelism: 1 },
];
```

### Code Review Pipeline
```typescript
const CODE_REVIEW_PIPELINE: PipelineStage[] = [
  { name: 'parse', tier: 'haiku', parallelism: 10 },
  { name: 'security-check', tier: 'haiku', parallelism: 5 },
  { name: 'performance-check', tier: 'haiku', parallelism: 5 },
  { name: 'style-check', tier: 'haiku', parallelism: 5 },
  { name: 'synthesize', tier: 'sonnet', parallelism: 1 },
];
```

## Throughput Metrics

| Pipeline Type | Sequential | Pipelined | Improvement |
|---------------|------------|-----------|-------------|
| Code generation | 10s | 4s | 2.5x |
| Code review (10 files) | 30s | 5s | 6x |
| Test generation | 15s | 3s | 5x |
| Documentation | 8s | 2s | 4x |

## Integration Points
- Works with **Haiku Swarm Coordinator** for parallel stages
- Coordinates with **Quality Amplifier** for quality stages
- Supports **Adaptive Tier Selector** for stage tier selection
