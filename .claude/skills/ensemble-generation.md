---
skill: ensemble-generation
description: Ensemble Generation
---

# Ensemble Generation

Generate multiple solution candidates through diverse approaches, evaluate systematically, and select the optimal result.

## Usage

```
/ensemble-generation [problem] [ensemble-size]
```

- `problem`: The problem or task requiring solution
- `ensemble-size`: small(3) | medium(5) | large(7) | exhaustive(10+)

## Instructions

### Phase 1: Diversity Strategy

1. **Approach Diversification**
   ```
   approaches = [
       "bottom_up",      # Build from primitives
       "top_down",       # Decompose from goal
       "analogical",     # Map from similar solutions
       "contrarian",     # Challenge assumptions
       "minimal",        # Simplest possible
       "robust",         # Handle all edge cases
       "performant",     # Optimize for speed
       "elegant",        # Prioritize clarity
   ]
   ```

2. **Constraint Variation**
   ```
   for candidate in ensemble:
       vary(time_constraints)
       vary(space_constraints)
       vary(abstraction_level)
       vary(paradigm)  # functional, OOP, procedural
   ```

### Phase 2: Parallel Generation

**Generation Protocol**
```
ensemble = []
for i in range(ensemble_size):
    approach = select_approach(i, diversity_matrix)
    constraints = vary_constraints(i)
    prompt = construct_prompt(problem, approach, constraints)
    candidate = generate(prompt)
    ensemble.append({
        'solution': candidate,
        'approach': approach,
        'constraints': constraints
    })
```

**Independence Enforcement**
- Each candidate generated without knowledge of others
- Different random seeds/temperatures
- Varied prompt framings

### Phase 3: Evaluation Framework

**Multi-Criteria Scoring**
```
criteria = {
    'correctness': weight=0.30,    # Does it solve the problem?
    'completeness': weight=0.15,   # Handles all cases?
    'efficiency': weight=0.15,     # Time/space complexity
    'clarity': weight=0.15,        # Readable and maintainable
    'robustness': weight=0.15,     # Error handling, edge cases
    'elegance': weight=0.10,       # Simplicity and beauty
}

for candidate in ensemble:
    scores[candidate] = weighted_sum(
        evaluate(candidate, criterion) * weight
        for criterion, weight in criteria
    )
```

**Comparative Analysis**
```
pairwise_comparisons = compare_all_pairs(ensemble)
ranking = aggregate_rankings(pairwise_comparisons)
```

### Phase 4: Selection Strategies

**Best Single**
```
winner = max(ensemble, key=lambda c: scores[c])
```

**Hybrid Synthesis**
```
best_aspects = {}
for criterion in criteria:
    best_for_criterion = max(ensemble, key=lambda c: scores[c][criterion])
    best_aspects[criterion] = extract_approach(best_for_criterion, criterion)
synthesized = combine(best_aspects)
```

**Consensus Building**
```
common_elements = intersection(all_solutions)
validated_core = verify(common_elements)
enhanced = augment(validated_core, best_unique_elements)
```

### Phase 5: Validation

**Cross-Validation**
```
for candidate in top_candidates:
    test_against(other_candidates)
    verify_with(ground_truth)
    stress_test(edge_cases)
```

**Confidence Calibration**
```
agreement_score = measure_agreement(top_candidates)
confidence = calibrate(agreement_score, individual_scores)
```

### Patterns

**Tournament Selection**
```
while len(candidates) > 1:
    pairs = pair_up(candidates)
    winners = [compete(a, b) for a, b in pairs]
    candidates = winners
return candidates[0]
```

**Ensemble Voting**
```
for decision_point in solution:
    votes = [candidate.decision_at(point) for candidate in ensemble]
    final_decision = majority_vote(votes, weighted=True)
```

**Iterative Refinement**
```
base = select_best(initial_ensemble)
for round in range(refinement_rounds):
    variants = generate_variants(base)
    base = select_best([base] + variants)
```

## Response Format

### Ensemble Generation Report

**Problem**: [Problem description]
**Ensemble Size**: [N candidates]

#### Generation Strategy
- Approaches Used: [List of approaches]
- Diversity Measures: [How diversity was ensured]

#### Candidates Generated

| # | Approach | Key Characteristics | Initial Score |
|---|----------|---------------------|---------------|
| 1 | [Approach] | [Brief description] | [X/100] |
| 2 | [Approach] | [Brief description] | [X/100] |
| ... | ... | ... | ... |

#### Evaluation Results

**Detailed Scoring**
| Candidate | Correct | Complete | Efficient | Clear | Robust | Elegant | Total |
|-----------|---------|----------|-----------|-------|--------|---------|-------|
| 1 | [X] | [X] | [X] | [X] | [X] | [X] | [X] |
| 2 | [X] | [X] | [X] | [X] | [X] | [X] | [X] |

**Comparative Analysis**
- Strongest Overall: Candidate [N]
- Most Correct: Candidate [N]
- Most Efficient: Candidate [N]
- Most Elegant: Candidate [N]

#### Selection Decision
- Winner: Candidate [N]
- Selection Method: [Best Single / Hybrid / Consensus]
- Confidence: [X%]

#### Selected Solution
```
[The winning solution code/content]
```

#### Why This Solution Won
- [Key strengths]
- [Comparison to alternatives]
- [Trade-offs accepted]

#### Alternative Considerations
- [Notable runners-up]
- [When alternatives might be preferred]
