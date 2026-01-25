# Quality Maximization

Maximize output quality through multi-pass refinement, validation layers, and iterative improvement patterns.

## Usage

```
/quality-maximization [target] [quality-level]
```

- `target`: Code, documentation, architecture, or analysis to optimize
- `quality-level`: standard | high | maximum | perfectionist

## Instructions

### Phase 1: Initial Analysis

1. **Baseline Assessment**
   - Analyze current quality metrics
   - Identify quality dimensions: correctness, clarity, performance, maintainability
   - Establish quality thresholds for each dimension

2. **Quality Decomposition**
   - Break target into independently assessable components
   - Map dependencies between quality factors
   - Identify critical path for quality improvement

### Phase 2: Multi-Pass Refinement

Execute iterative refinement passes:

```
Pass 1: Correctness Verification
- Validate logic and behavior
- Check edge cases and error handling
- Verify type safety and contracts

Pass 2: Clarity Enhancement
- Improve naming and documentation
- Simplify complex expressions
- Enhance code structure and flow

Pass 3: Performance Optimization
- Profile and identify bottlenecks
- Apply algorithmic improvements
- Optimize resource usage

Pass 4: Maintainability Polish
- Ensure consistent patterns
- Add strategic comments
- Improve testability
```

### Phase 3: Validation Layers

Apply validation at each layer:

1. **Static Analysis**
   - Type checking
   - Linting rules
   - Security scanning

2. **Semantic Validation**
   - Business logic verification
   - Contract adherence
   - Behavioral correctness

3. **Holistic Review**
   - Architecture alignment
   - Pattern consistency
   - Future extensibility

### Phase 4: Quality Gates

Enforce quality gates before completion:

| Gate | Criteria | Threshold |
|------|----------|-----------|
| Correctness | All tests pass, no logic errors | 100% |
| Coverage | Critical paths tested | >90% |
| Clarity | Self-documenting code | Peer reviewable |
| Performance | Meets benchmarks | Within 10% of target |
| Security | No vulnerabilities | Zero high/critical |

### Patterns

**Iterative Deepening**
```
for depth in [surface, structural, semantic, holistic]:
    analyze(target, depth)
    refine(findings)
    validate(improvements)
```

**Quality Amplification**
```
candidate = generate_initial()
for round in range(max_rounds):
    critique = analyze_quality(candidate)
    candidate = improve(candidate, critique)
    if meets_threshold(candidate):
        break
```

**Ensemble Validation**
```
validators = [type_checker, linter, semantic_analyzer, security_scanner]
results = parallel_validate(target, validators)
issues = aggregate_and_prioritize(results)
```

## Response Format

### Quality Maximization Report

**Target**: [Component/file being optimized]
**Quality Level**: [Requested level]

#### Baseline Assessment
- Current Quality Score: [X/100]
- Key Deficiencies: [List]
- Improvement Potential: [Estimate]

#### Refinement Passes Completed
1. **Correctness**: [Changes made]
2. **Clarity**: [Changes made]
3. **Performance**: [Changes made]
4. **Maintainability**: [Changes made]

#### Quality Gates
| Gate | Status | Score |
|------|--------|-------|
| Correctness | [Pass/Fail] | [Score] |
| Coverage | [Pass/Fail] | [Score] |
| Clarity | [Pass/Fail] | [Score] |
| Performance | [Pass/Fail] | [Score] |

#### Final Quality Score: [X/100]

#### Deliverables
- [Optimized code/artifact]
- [Quality report]
- [Remaining improvement opportunities]
