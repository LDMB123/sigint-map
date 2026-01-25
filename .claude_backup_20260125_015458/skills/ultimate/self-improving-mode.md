# Skill: Self-Improving Mode

**ID**: `self-improving-mode`
**Category**: Ultimate Performance
**Agents**: Recursive Optimizer, Meta-Learner, Feedback Loop Optimizer

---

## When to Use
- Long-running sessions (multiple hours)
- Recurring similar tasks
- Projects with established patterns
- When quality needs to compound over time

## Performance Target
- **Per-Session Improvement**: 5-10%
- **Compounding**: 2x performance after 10 sessions
- **Adaptation Speed**: 2-5x faster learning

---

## How It Works

### 1. Continuous Learning Loop
```
Task Execution → Performance Metrics → Analysis → Strategy Update
       ↓                                              ↓
    Results                                    Improved Prompts
       ↓                                              ↓
    Feedback ←←←←←←←←←←←←←←←←←←←←←←←←←←← Next Task
```

### 2. Meta-Learning
```
Session 1: Learn task patterns → 75% quality
Session 2: Apply learned patterns → 82% quality (+9%)
Session 3: Learn learning patterns → 88% quality (+7%)
Session 4: Transfer to new domains → 91% quality (+3%)
Session 5: Optimize optimization → 94% quality (+3%)
```

### 3. Automatic A/B Testing
```
Hypothesis: "Structured prompts improve code quality"
    ↓
Variant A: Original prompt
Variant B: Structured prompt
    ↓
Run until 95% confidence
    ↓
Deploy winner automatically
```

---

## Improvement Dimensions

### Strategy Optimization
- Route to best agents for task type
- Adjust tier selection thresholds
- Optimize parallel vs sequential execution

### Prompt Refinement
- Learn effective prompt patterns
- Adapt to user preferences
- Improve context selection

### Architecture Tuning
- Adjust cache sizes
- Optimize pipeline stages
- Tune feedback loop parameters

---

## Steps

1. **Enable Learning Mode**
   ```
   Activate feedback collection
   Track all quality metrics
   Record successful patterns
   ```

2. **Analyze Patterns**
   ```
   Every 100 tasks:
   - Identify successful strategies
   - Find failure patterns
   - Calculate improvement opportunities
   ```

3. **Update Strategies**
   ```
   Apply gradients:
   - Increase weight on successful patterns
   - Decrease weight on failure patterns
   - Explore new variations
   ```

4. **Validate Improvements**
   ```
   A/B test changes
   Rollback if quality decreases
   Persist successful updates
   ```

---

## Compounding Effect

```
Session 1:  100% baseline
Session 2:  105% (+5%)
Session 3:  112% (+7% - learning compounds)
Session 4:  121% (+8% - patterns transfer)
Session 5:  133% (+10% - meta-learning kicks in)
...
Session 10: 200% (2x improvement)
Session 20: 400% (4x improvement)
```

---

## Activation Commands

```
/self-improve on       - Enable continuous improvement
/self-improve status   - Show improvement trajectory
/self-improve reset    - Reset to baseline (keep patterns)
/self-improve export   - Export learned patterns
```

---

## Expected Results

| Metric | Session 1 | Session 10 | Session 20 |
|--------|-----------|------------|------------|
| Quality Score | 75% | 90% | 95% |
| Task Completion | 85% | 95% | 99% |
| Efficiency | 1x | 1.5x | 2x |
| Error Rate | 15% | 5% | 2% |

---

## Persistence

Learned patterns are saved to:
```
~/.claude/learned-patterns/
├── prompt-templates.json
├── routing-weights.json
├── success-patterns.json
└── user-preferences.json
```

Patterns transfer across sessions and projects.
