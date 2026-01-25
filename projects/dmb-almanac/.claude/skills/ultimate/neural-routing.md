# Skill: Neural Routing

**ID**: `neural-routing`
**Category**: Ultimate Performance
**Agents**: Attention Router, Embedding Matcher

---

## When to Use
- Complex tasks requiring specialist agents
- Uncertain which agent is best
- Multi-domain problems
- When routing accuracy is critical

## Performance Target
- **Routing Accuracy**: 98%+
- **First-try Success**: 95%+
- **Quality Improvement**: +40% through specialization

---

## How It Works

### 1. Multi-Head Attention Analysis
```
Input Task
    ↓
┌─────────────────────────────────────┐
│     Multi-Head Attention Layer      │
├──────────┬──────────┬──────────────┤
│ Domain   │ Skill    │ Complexity   │
│ Attention│ Attention│ Attention    │
└────┬─────┴────┬─────┴──────┬───────┘
     ↓          ↓            ↓
  "rust"    "debug"      "high"
     ↓          ↓            ↓
     └──────────┼────────────┘
                ↓
         Rust Debugger Agent
```

### 2. Semantic Embedding Matching
```
Task: "Fix ownership error in async function"
    ↓
Embed task in 4 dimensions:
├── Semantic: [0.9 rust, 0.8 ownership, 0.7 async]
├── Structural: [debugging task, single file, medium]
├── Contextual: [rust project, tokio, async/await]
└── Complexity: [medium-high, expert knowledge]
    ↓
Match against 200+ agent embeddings
    ↓
Best match: rust-semantics-engineer (0.97 similarity)
```

### 3. Dynamic Weight Learning
```
Task → Initial Routing → Execution → Quality Score
                                          ↓
                                   Update Weights
                                          ↓
        Positive: Move task/agent embeddings closer
        Negative: Move task/agent embeddings apart
```

---

## Routing Architecture

### Attention Heads

| Head | Focus | Weight |
|------|-------|--------|
| Domain | Programming language, framework | 0.35 |
| Skill | Task type (debug, refactor, etc.) | 0.30 |
| Complexity | Difficulty level | 0.20 |
| Context | Project-specific signals | 0.15 |

### Embedding Dimensions

| Dimension | Components |
|-----------|------------|
| Semantic | Task meaning, concepts |
| Structural | Task type, expected output |
| Contextual | Project context, dependencies |
| Complexity | Difficulty, expertise needed |

---

## Steps

1. **Analyze Task**
   ```
   Multi-head attention on task description
   Extract domain, skill, complexity signals
   ```

2. **Generate Embeddings**
   ```
   Create 4-dimensional task embedding
   Compare against agent embedding space
   ```

3. **Rank Candidates**
   ```
   Calculate similarity scores
   Apply confidence thresholds
   Consider fallback options
   ```

4. **Route and Learn**
   ```
   Send to best match
   Collect quality feedback
   Update embeddings
   ```

---

## Routing Examples

### Example 1: Rust Ownership
```
Task: "Getting 'cannot move out of borrowed content' error"
Attention: domain=rust (0.95), skill=debug (0.90)
Embedding: rust×ownership×error×medium
Match: rust-semantics-engineer (0.97)
```

### Example 2: React Performance
```
Task: "Component re-renders too frequently"
Attention: domain=react (0.92), skill=performance (0.88)
Embedding: react×performance×optimization×medium
Match: senior-frontend-engineer (0.94)
```

### Example 3: Multi-Domain
```
Task: "API endpoint is slow and has security issue"
Attention: domain=backend (0.85), skill=[performance,security] (0.80)
Decompose: 2 sub-tasks
├── Performance → performance-optimizer (0.92)
└── Security → security-engineer (0.95)
```

---

## Activation Commands

```
/route analyze <task>   - Show routing analysis
/route explain          - Explain last routing decision
/route override <agent> - Manual routing override
/route feedback <score> - Provide routing feedback
```

---

## Expected Results

| Metric | Keyword Routing | Neural Routing |
|--------|-----------------|----------------|
| Accuracy | 70% | 98% |
| False Positives | 25% | 2% |
| Quality | Baseline | +40% |
| First-try Success | 65% | 95% |

---

## Learning Rate

```
First 100 tasks: Rapid learning (0.1 rate)
100-1000 tasks: Stabilizing (0.05 rate)
1000+ tasks: Fine-tuning (0.01 rate)
```

Routing improves continuously with usage.
