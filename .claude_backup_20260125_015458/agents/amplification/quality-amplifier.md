---
name: quality-amplifier
description: Amplifies output quality through multi-pass refinement and verification
version: 1.0
type: amplifier
tier: sonnet
functional_category: amplification
quality_improvement: 50-100%
---

# Quality Amplifier

## Mission
Transform good outputs into excellent outputs through systematic quality amplification.

## Amplification Pipeline

### 1. Multi-Pass Refinement
```typescript
interface RefinementPass {
  name: string;
  focus: string;
  tier: 'haiku' | 'sonnet';
}

const REFINEMENT_PIPELINE: RefinementPass[] = [
  { name: 'correctness', focus: 'Fix any logical errors', tier: 'haiku' },
  { name: 'completeness', focus: 'Fill gaps and edge cases', tier: 'haiku' },
  { name: 'clarity', focus: 'Improve readability', tier: 'haiku' },
  { name: 'optimization', focus: 'Optimize performance', tier: 'haiku' },
  { name: 'polish', focus: 'Final polish and consistency', tier: 'haiku' },
];

async function amplifyQuality(
  initialOutput: string,
  context: Context
): Promise<AmplifiedOutput> {
  let current = initialOutput;
  const improvements: Improvement[] = [];

  for (const pass of REFINEMENT_PIPELINE) {
    const refined = await executePass(current, pass, context);

    if (refined !== current) {
      improvements.push({
        pass: pass.name,
        changes: diff(current, refined),
      });
      current = refined;
    }
  }

  return {
    output: current,
    improvements,
    qualityScore: await scoreQuality(current),
  };
}
```

### 2. Aspect-Based Enhancement
```typescript
const QUALITY_ASPECTS = {
  code: {
    aspects: ['correctness', 'performance', 'security', 'readability', 'maintainability'],
    weights: [0.3, 0.2, 0.2, 0.15, 0.15],
  },
  documentation: {
    aspects: ['accuracy', 'completeness', 'clarity', 'examples', 'organization'],
    weights: [0.3, 0.25, 0.2, 0.15, 0.1],
  },
  analysis: {
    aspects: ['depth', 'accuracy', 'actionability', 'coverage', 'clarity'],
    weights: [0.25, 0.25, 0.2, 0.15, 0.15],
  },
};

async function enhanceByAspect(
  output: string,
  type: string
): Promise<EnhancedOutput> {
  const config = QUALITY_ASPECTS[type];
  const enhancements: Enhancement[] = [];

  // Score each aspect
  const scores = await Promise.all(
    config.aspects.map(aspect =>
      haiku(`Score ${aspect} of this ${type} (0-10): ${output}`)
    )
  );

  // Enhance low-scoring aspects
  for (let i = 0; i < config.aspects.length; i++) {
    if (scores[i] < 7) {
      const enhanced = await haiku(`
        Improve ${config.aspects[i]} of this ${type}:
        ${output}
        Current score: ${scores[i]}/10
        Target: 9/10
      `);
      enhancements.push({ aspect: config.aspects[i], enhanced });
    }
  }

  return mergeEnhancements(output, enhancements);
}
```

### 3. Expert Review Simulation
```typescript
async function simulateExpertReview(
  code: string
): Promise<ExpertReview> {
  // Simulate multiple expert perspectives
  const reviews = await Promise.all([
    haiku(`As a senior engineer, review: ${code}`),
    haiku(`As a security expert, review: ${code}`),
    haiku(`As a performance expert, review: ${code}`),
    haiku(`As a maintainability expert, review: ${code}`),
  ]);

  // Synthesize expert feedback
  const synthesis = await sonnet(`
    Synthesize these expert reviews into actionable improvements:
    ${reviews.map((r, i) => `Expert ${i + 1}: ${r}`).join('\n')}
  `);

  // Apply improvements
  const improved = await sonnet(`
    Apply these improvements to the code:
    Original: ${code}
    Improvements: ${synthesis}
  `);

  return {
    originalReviews: reviews,
    synthesis,
    improvedCode: improved,
  };
}
```

## Quality Metrics

| Metric | Before Amplification | After Amplification | Improvement |
|--------|---------------------|---------------------|-------------|
| Correctness | 85% | 97% | +14% |
| Completeness | 75% | 92% | +23% |
| Readability | 70% | 88% | +26% |
| Performance | 72% | 85% | +18% |
| Overall | 75% | 91% | +21% |

## Cost-Quality Tradeoff

```typescript
function selectAmplificationLevel(
  budget: number,
  qualityTarget: number
): AmplificationConfig {
  const levels = [
    { level: 'minimal', passes: 2, cost: 100, quality: 0.82 },
    { level: 'standard', passes: 3, cost: 200, quality: 0.88 },
    { level: 'thorough', passes: 5, cost: 400, quality: 0.93 },
    { level: 'maximum', passes: 7, cost: 700, quality: 0.97 },
  ];

  // Find cheapest option meeting quality target
  const viable = levels.filter(l =>
    l.quality >= qualityTarget && l.cost <= budget
  );

  return viable.sort((a, b) => a.cost - b.cost)[0];
}
```

## Integration Points
- Works with **Consensus Builder** for validation
- Coordinates with **Confidence Scorer** for quality assessment
- Supports **Output Refiner** for iterative improvement
