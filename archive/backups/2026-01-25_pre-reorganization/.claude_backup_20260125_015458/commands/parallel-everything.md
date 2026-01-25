# Parallel Everything

Maximize throughput by parallelizing all independent operations in Claude Code workflows.

## Usage

```
/parallel-everything [task or operation list]
```

## Instructions

You are an expert at identifying and executing parallel operations. Your goal is to minimize total execution time by running independent tasks concurrently.

### Parallelization Principles

1. **Identify Independence**
   - Operations are independent if neither uses the other's output
   - Read operations on different files are always parallel-safe
   - Write operations to different files are parallel-safe
   - Analysis tasks without shared state can parallelize

2. **Dependency Graph Construction**
   - Map all operations and their inputs/outputs
   - Draw edges between dependent operations
   - Operations without edges can run in parallel
   - Group operations by dependency level

3. **Batch Similar Operations**
   - Group file reads together
   - Group file writes together
   - Group API calls together
   - Execute each batch in parallel

### Parallel Patterns in Claude Code

**File Operations**
```
# Sequential (slow):
Read file A -> Read file B -> Read file C

# Parallel (fast):
Read files A, B, C simultaneously
```

**Search Operations**
```
# Sequential:
Grep pattern1 -> Grep pattern2 -> Glob *.ts

# Parallel:
[Grep pattern1] + [Grep pattern2] + [Glob *.ts]
```

**Analysis Tasks**
```
# Sequential:
Analyze module A -> Analyze module B -> Summarize

# Parallel:
[Analyze A] + [Analyze B] -> Summarize (after both complete)
```

### When to Parallelize

**Always Parallelize:**
- Multiple file reads
- Independent search queries
- Separate linting/type-checking
- Test runs on different modules
- Documentation generation for different files

**Never Parallelize:**
- Operations with data dependencies
- Write after read to same file
- Sequential business logic
- Operations that share mutable state

**Conditionally Parallelize:**
- API calls (respect rate limits)
- Heavy computations (respect resource limits)
- Database operations (respect connection pools)

### Practical Examples

**Example 1: Code Review Setup**
```
# Before (sequential): ~6 tool calls
Read src/auth.ts
Read src/api.ts
Read src/utils.ts
Grep "TODO" src/
Glob "*.test.ts"
Read package.json

# After (parallel): ~2 tool calls
[Read auth.ts + api.ts + utils.ts + package.json] + [Grep TODO + Glob tests]
```

**Example 2: Dependency Analysis**
```
Parallel batch 1:
- Read package.json
- Read Cargo.toml
- Read requirements.txt

Parallel batch 2 (after batch 1):
- Analyze npm dependencies
- Analyze cargo dependencies
- Analyze pip dependencies

Final (after batch 2):
- Generate unified dependency report
```

**Example 3: Multi-File Refactor**
```
Phase 1 (parallel reads):
[Read all affected files]

Phase 2 (parallel analysis):
[Identify all change locations]

Phase 3 (parallel writes):
[Write all modified files]

Phase 4 (parallel verification):
[Run tests + type check + lint]
```

### Parallelization Checklist

Before executing, verify:
- [ ] Identified all operations needed
- [ ] Mapped dependencies between operations
- [ ] Grouped independent operations
- [ ] No write-after-read conflicts
- [ ] Resource limits respected

### Response Format

When applying parallel execution, respond with:

```
## Operation Analysis

**Total operations:** [N]
**Independent groups:** [M]
**Dependency chain depth:** [D]

## Execution Plan

### Batch 1 (parallel)
- [Operation A]
- [Operation B]
- [Operation C]

### Batch 2 (depends on Batch 1)
- [Operation D]
- [Operation E]

### Batch 3 (depends on Batch 2)
- [Operation F]

## Execution

[Execute batches, showing parallel tool calls]

## Performance Summary

- Sequential time: ~[X] operations
- Parallel time: ~[Y] batches
- Speedup: [X/Y]x faster
```
