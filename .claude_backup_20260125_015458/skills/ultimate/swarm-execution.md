# Skill: Swarm Execution

**ID**: `swarm-execution`
**Category**: Ultimate Performance
**Agents**: Swarm Intelligence Orchestrator, Massive Parallel Coordinator, Hierarchical Decomposer

---

## When to Use
- Complex multi-file refactoring
- Large-scale code analysis
- Comprehensive testing across modules
- Mass migrations or transformations
- Any task that can be parallelized

## Performance Target
- **Throughput**: 100-1000x single agent
- **Emergent Quality**: 10x individual capability
- **Parallelism**: 500+ simultaneous workers

---

## How It Works

### 1. Problem Decomposition
```
Complex Task
    ↓
Hierarchical Decomposer
    ↓
    ├── Subtask A (independent)
    ├── Subtask B (independent)
    ├── Subtask C (depends on A)
    ├── Subtask D (depends on A, B)
    └── Subtask E (independent)
```

### 2. Swarm Distribution
```
Level 1 (parallel): [A, B, E] → 200 Haiku workers each
Level 2 (after A): [C] → 200 Haiku workers
Level 3 (after A, B): [D] → 200 Haiku workers
```

### 3. Emergent Synthesis
```
Individual Results → Pheromone Trails → Pattern Detection → Synthesis
                          ↓
              "300 agents found similar solution"
                          ↓
              High confidence in approach
                          ↓
              Synthesize best elements
```

---

## Swarm Configurations

### Validation Swarm (Fast)
```
Workers: 50 Haiku
Use: Quick validation across files
Throughput: 50x
Cost: ~1 Sonnet equivalent
```

### Analysis Swarm (Medium)
```
Workers: 200 Haiku
Use: Deep code analysis
Throughput: 180x
Cost: ~3 Sonnet equivalent
```

### Transformation Swarm (Heavy)
```
Workers: 500 Haiku
Use: Mass refactoring/migration
Throughput: 400x
Cost: ~8 Sonnet equivalent
```

### Full Swarm (Maximum)
```
Workers: 500 Haiku + 50 Sonnet orchestrators
Use: Complex multi-domain problems
Throughput: 1000x
Emergent Intelligence: 25x
```

---

## Steps

1. **Decompose Problem**
   ```
   Task → Hierarchical Decomposer → Task Tree
   ```

2. **Analyze Dependencies**
   ```
   Task Tree → Dependency Graph → Parallel Levels
   ```

3. **Spawn Swarm**
   ```
   Parallel Levels → Worker Assignment → Execute
   ```

4. **Collect and Synthesize**
   ```
   Results → Synthesis Aggregator → Final Output
   ```

---

## Example: Refactor 1000 Files

```
Traditional: 1000 files × 30s = 8+ hours
Swarm (500): 1000 files ÷ 500 × 30s = 1 minute + synthesis

Speedup: 480x
Cost: 8 Opus calls equivalent
```

---

## Activation Commands

```
/swarm analyze <path>      - Analyze with swarm
/swarm refactor <pattern>  - Mass refactoring
/swarm validate <path>     - Parallel validation
/swarm migrate <from> <to> - Large-scale migration
```

---

## Expected Results

| Metric | Single Agent | Swarm |
|--------|--------------|-------|
| Files/minute | 2 | 500+ |
| Analysis depth | 1x | 10x (emergent) |
| Pattern detection | Limited | Comprehensive |
| Cost efficiency | 1x | 50x per dollar |
