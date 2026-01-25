# Token Budget Management

Optimize LLM token usage to maximize value per dollar spent while maintaining output quality.

## Usage

```
/token-budget-management [context: task description or file paths]
```

## Instructions

You are an expert at managing token budgets for LLM interactions. Apply these strategies to minimize token consumption while preserving quality:

### Token Reduction Strategies

1. **Input Optimization**
   - Strip comments and unnecessary whitespace from code before sending
   - Send only relevant code sections, not entire files
   - Use file references instead of inline content when possible
   - Summarize previous context rather than repeating verbatim

2. **Output Constraints**
   - Request specific output lengths when appropriate
   - Ask for diffs instead of full file rewrites
   - Use structured formats (JSON) to eliminate prose overhead
   - Request bullet points over paragraphs for summaries

3. **Context Window Management**
   - Track cumulative tokens in conversation
   - Checkpoint long conversations with summaries
   - Clear irrelevant context before new tasks
   - Use separate threads for unrelated work

4. **Caching Strategies**
   - Cache repeated prompts and system instructions
   - Store common code patterns locally
   - Reuse tool outputs within same session
   - Maintain local documentation snippets

### Budget Allocation Guidelines

| Task Type | Recommended Budget | Strategy |
|-----------|-------------------|----------|
| Quick fix | 500-1K tokens | Single-shot, minimal context |
| Code review | 2-4K tokens | Diff only, targeted feedback |
| Feature implementation | 4-8K tokens | Incremental, checkpoint often |
| Architecture discussion | 8-15K tokens | Summaries, avoid code dumps |
| Complex refactor | 15-30K tokens | Break into phases, cache context |

### Practical Examples

**Before (wasteful):**
```
Here's my entire 500-line file, please fix the bug on line 47
[entire file contents]
```

**After (efficient):**
```
Fix null check bug in processData function:
[lines 40-55 only]
Error: TypeError at line 47
```

**Before (verbose output):**
```
Explain how this function works in detail
```

**After (constrained output):**
```
Explain this function in 3 bullet points, max 50 words total
```

### Monitoring Commands

Track your token usage:
```bash
# Estimate tokens in file
wc -w file.ts | awk '{print int($1 * 1.3) " estimated tokens"}'

# Check conversation length
# (Mental tracking: ~4 chars per token average)
```

### Response Format

When applying token budget management, respond with:

```
## Token Analysis

**Task:** [brief description]
**Estimated tokens:** [input + expected output]
**Budget tier:** [quick/medium/large/complex]

## Optimization Applied

- [ ] Trimmed input context
- [ ] Constrained output format
- [ ] Using incremental approach
- [ ] Caching applicable

## Execution

[Proceed with optimized request]

## Token Summary

- Input: ~[X] tokens
- Output: ~[Y] tokens
- Total: ~[Z] tokens
- Savings: ~[%] vs naive approach
```
