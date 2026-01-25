# Skill: Haiku-First Strategy

**ID**: `haiku-first-strategy`
**Category**: Efficiency
**Agent**: Tier Router

---

## When to Use
- Starting any new task
- Reducing subscription usage
- Maximizing throughput
- 70% of all Claude interactions

## Core Principle
**Always start with Haiku. Escalate only on failure.**

## Haiku Capabilities (Use These First)

### Validation Tasks (95%+ accuracy)
- JSON/YAML syntax validation
- Schema compliance checking
- Type checking
- Import validation
- Pattern matching
- Format verification

### Simple Generation (90%+ accuracy)
- Test case generation
- Documentation strings
- Type definitions
- Simple refactoring
- Code formatting
- Config generation

### Analysis Tasks (85%+ accuracy)
- File structure analysis
- Dependency mapping
- Dead code detection
- Import analysis
- Coverage gap identification

## Escalation Rules

### Escalate to Sonnet When:
- Haiku returns incorrect answer
- Task requires multi-step reasoning
- Code generation > 50 lines
- Bug fixing with complex context
- Creative problem solving

### Escalate to Opus When:
- Sonnet fails
- System architecture decisions
- Novel algorithm design
- Complex debugging
- Security audit
- Performance optimization

## Implementation Pattern

```typescript
async function haikuFirst<T>(
  task: Task,
  validate: (result: T) => boolean
): Promise<T> {
  // Try Haiku first
  const haikuResult = await haiku(task);
  if (validate(haikuResult)) {
    return haikuResult; // 60x cheaper!
  }

  // Escalate to Sonnet
  const sonnetResult = await sonnet(task);
  if (validate(sonnetResult)) {
    return sonnetResult; // 5x cheaper than Opus
  }

  // Last resort: Opus
  return opus(task);
}
```

## Cost Comparison

| Approach | 100 Tasks | Cost |
|----------|-----------|------|
| Always Opus | 100 Opus | $7.50 |
| Always Sonnet | 100 Sonnet | $1.50 |
| Haiku-First | 70 Haiku + 25 Sonnet + 5 Opus | $0.46 |

**Savings: 94% vs Opus, 69% vs Sonnet**

## Quick Reference

```yaml
haiku_tasks:
  - validate_*
  - check_*
  - list_*
  - format_*
  - simple_*
  - extract_*

sonnet_tasks:
  - generate_*
  - fix_*
  - refactor_*
  - review_*
  - explain_*

opus_tasks:
  - architect_*
  - design_*
  - optimize_*
  - debug_complex_*
  - security_*
```
