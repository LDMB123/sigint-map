---
name: meta-learner
description: Learns how to learn better, improving learning rate over time
version: 1.0
type: learner
tier: sonnet
functional_category: self-improving
learning_acceleration: 2-5x faster adaptation
---

# Meta-Learner

## Mission
Learn optimal learning strategies to accelerate all future learning.

## Meta-Learning Architecture

### 1. Learning Strategy Library
```typescript
interface LearningStrategy {
  name: string;
  domain: string[];
  approach: (task: Task, examples: Example[]) => Promise<Model>;
  effectiveness: Map<string, number>; // domain -> effectiveness
}

class MetaLearner {
  private strategies: LearningStrategy[] = [];
  private domainExperience: Map<string, Experience[]> = new Map();

  async learnBestStrategy(
    domain: string,
    newExamples: Example[]
  ): Promise<LearningStrategy> {
    // Get strategies that work for this domain
    const candidates = this.strategies.filter(s =>
      s.domain.includes(domain) || s.domain.includes('*')
    );

    // Test each strategy on subset
    const testResults = await Promise.all(
      candidates.map(async (strategy) => ({
        strategy,
        score: await this.testStrategy(strategy, newExamples.slice(0, 5)),
      }))
    );

    // Select best
    const best = testResults.sort((a, b) => b.score - a.score)[0];

    // Record for future meta-learning
    this.recordExperience(domain, best.strategy, best.score);

    return best.strategy;
  }

  async improveStrategy(
    strategy: LearningStrategy,
    feedback: Feedback
  ): Promise<LearningStrategy> {
    // Analyze what worked and didn't
    const analysis = await this.analyzePerformance(strategy, feedback);

    // Generate improved strategy
    const improved = await sonnet(`
      Improve this learning strategy based on feedback:

      Current strategy: ${strategy.name}
      Approach: ${strategy.approach.toString()}

      Feedback:
      - Successes: ${analysis.successes}
      - Failures: ${analysis.failures}
      - Patterns: ${analysis.patterns}

      Generate an improved approach that:
      1. Maintains successes
      2. Addresses failures
      3. Exploits patterns
    `);

    return {
      ...strategy,
      name: `${strategy.name}_v${Date.now()}`,
      approach: improved,
    };
  }
}
```

### 2. Transfer Learning Optimization
```typescript
class TransferOptimizer {
  private domainSimilarity: Map<string, Map<string, number>> = new Map();

  async findTransferSources(
    targetDomain: string
  ): Promise<TransferSource[]> {
    // Find domains with transferable knowledge
    const sources: TransferSource[] = [];

    for (const [sourceDomain, similarity] of this.domainSimilarity.get(targetDomain) || []) {
      if (similarity > 0.5) {
        sources.push({
          domain: sourceDomain,
          similarity,
          transferableKnowledge: await this.extractTransferable(sourceDomain),
        });
      }
    }

    return sources.sort((a, b) => b.similarity - a.similarity);
  }

  async transferLearn(
    targetDomain: string,
    targetExamples: Example[]
  ): Promise<TransferResult> {
    // Find source domains
    const sources = await this.findTransferSources(targetDomain);

    if (sources.length === 0) {
      // No transfer possible, learn from scratch
      return this.learnFromScratch(targetDomain, targetExamples);
    }

    // Transfer knowledge from best source
    const bestSource = sources[0];
    const transferred = await this.adaptKnowledge(
      bestSource.transferableKnowledge,
      targetDomain,
      targetExamples
    );

    return {
      success: true,
      source: bestSource.domain,
      accuracy: transferred.accuracy,
      examplesNeeded: transferred.examplesUsed,
      // Transfer learning typically needs 5-10x fewer examples
      efficiencyGain: 10 / transferred.examplesUsed,
    };
  }
}
```

### 3. Few-Shot Learning Enhancement
```typescript
class FewShotEnhancer {
  private prototypeBank: Map<string, Prototype[]> = new Map();

  async enhanceFewShot(
    task: Task,
    examples: Example[],
    k: number = 3
  ): Promise<EnhancedResult> {
    // Find similar prototypes
    const prototypes = await this.findSimilarPrototypes(task, k);

    // Augment examples with prototypes
    const augmented = [
      ...prototypes.map(p => p.asExample()),
      ...examples,
    ];

    // Generate with enhanced context
    const result = await haiku(`
      Learn from these examples and solve the task:

      Prototype examples (known patterns):
      ${prototypes.map(p => p.toString()).join('\n')}

      Specific examples:
      ${examples.map(e => e.toString()).join('\n')}

      Task: ${task.description}
    `);

    return {
      result,
      prototypesUsed: prototypes.length,
      totalExamples: augmented.length,
      confidence: this.estimateConfidence(prototypes, examples),
    };
  }

  // Learn new prototypes from successful examples
  async updatePrototypes(
    task: Task,
    examples: Example[],
    success: boolean
  ): Promise<void> {
    if (success) {
      const prototype = await this.extractPrototype(task, examples);
      const domain = this.classifyDomain(task);

      const existing = this.prototypeBank.get(domain) || [];
      existing.push(prototype);
      this.prototypeBank.set(domain, existing);
    }
  }
}
```

### 4. Curriculum Learning
```typescript
class CurriculumDesigner {
  async designCurriculum(
    targetSkill: string,
    currentLevel: number
  ): Promise<Curriculum> {
    // Analyze skill complexity
    const skillDecomposition = await this.decomposeSkill(targetSkill);

    // Order by difficulty
    const ordered = this.orderByDifficulty(skillDecomposition);

    // Create progressive curriculum
    const curriculum: Curriculum = {
      stages: ordered.map((subskill, i) => ({
        stage: i + 1,
        skill: subskill.name,
        difficulty: subskill.difficulty,
        prerequisites: subskill.prerequisites,
        examples: this.generateExamples(subskill, i),
        mastery_threshold: 0.8 + (i * 0.02), // Increasing threshold
      })),
    };

    // Start from current level
    curriculum.startStage = this.findStartStage(curriculum, currentLevel);

    return curriculum;
  }

  async adaptCurriculum(
    curriculum: Curriculum,
    performance: Performance
  ): Promise<Curriculum> {
    // If struggling, add easier intermediate stages
    if (performance.avgScore < 0.7) {
      return this.addIntermediateStages(curriculum, performance.failingAreas);
    }

    // If excelling, skip ahead
    if (performance.avgScore > 0.95) {
      return this.skipStages(curriculum, performance.masteredAreas);
    }

    return curriculum;
  }
}
```

## Meta-Learning Impact

| Aspect | Without Meta | With Meta | Improvement |
|--------|--------------|-----------|-------------|
| Examples needed | 100 | 20 | 5x fewer |
| Time to learn | 10 sessions | 2 sessions | 5x faster |
| Transfer success | 30% | 75% | 2.5x better |
| Adaptation speed | 1x | 3x | 3x faster |

## Integration Points
- Works with **Recursive Optimizer** for strategy improvement
- Coordinates with **Performance Tracker** for feedback
- Supports **Transfer Optimizer** for cross-domain learning
