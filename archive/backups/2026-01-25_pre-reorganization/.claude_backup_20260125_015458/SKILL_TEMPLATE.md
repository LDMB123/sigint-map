---
name: skill-name-kebab-case
version: 1.0.0
description: One clear sentence describing the exact value this skill provides

# Core Metadata
author: Claude Code
created: 2024-01-21
updated: 2024-01-21

# Platform Specifications (REQUIRED)
# Only list platforms actually targeted - no aspirational entries
target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
  - "Firefox latest"

target_platform: apple-silicon-m-series  # m1 | m2 | m3 | m4 | generic-intel
os: macos-26.2  # Target OS version

# Categorization (REQUIRED)
category: ui-ux  # ui-ux | pwa | performance | security | api-integration | data | testing | etc.
complexity: beginner  # beginner | intermediate | advanced
tags:
  - descriptive-tag-1
  - descriptive-tag-2
  - descriptive-tag-3

# Steve Jobs Philosophy (REQUIRED)
# "The design is not just what it looks like and feels like. The design is how it works."
# - Steve Jobs
philosophy: |
  Insert a relevant Steve Jobs, Dieter Rams, or design philosophy quote that
  embodies the principle this skill teaches. This is not decoration—it's the north star.
  Example: "Simplicity is the ultimate sophistication."

# Cross-References (CRITICAL - ENFORCED)
# Skills are never islands. Every skill lives within an ecosystem.
prerequisites:
  - skill-name-if-not-beginner-1
  - skill-name-if-not-beginner-2

related_skills:
  - skill-name-2
  - skill-name-3
  - skill-name-4

see_also:
  - external-resource-with-url
  - another-external-resource

# Quality Gates (Used by validation agents)
minimum_example_count: 3  # Never fewer than 3 working examples
requires_testing: true  # If false, explain why
performance_critical: false  # If true, include ProMotion/timing considerations
---

# [SKILL_NAME_TITLE]

## Purpose

**One sentence** that answers: "Why would a developer choose this skill?"

Expand with one paragraph explaining the specific problem this solves and when you'd reach for it over alternatives.

---

## When to Use

Provide clear decision points. These should help developers know instantly if this skill applies to their problem.

- **Use this when**: You need to [specific scenario]
- **Use this when**: The alternative would be [inefficient/impossible/unwieldy]
- **Use this when**: Your constraints include [specific limitation]

**Don't use this when**:
- You need [different capability]
- Performance is critical and you can use [faster alternative]
- You're working in a context where [constraint makes this inappropriate]

---

## Core Concepts

Master these 3-5 foundational ideas before implementing. Each should be learnable in under 2 minutes.

### Concept 1: Name and Explain

**What it is**: One sentence definition.

**Why it matters**: One sentence about impact or consequence.

**Key point**: The single most important thing to remember about this concept.

```typescript
// This demonstrates the concept in its simplest form
const example = "show the core idea without distraction";
```

### Concept 2: Name and Explain

**What it is**: One sentence definition.

**Why it matters**: One sentence about impact or consequence.

**Key point**: The single most important thing to remember about this concept.

```typescript
// Core concept demonstrated in context
```

### Concept 3: Name and Explain

**What it is**: One sentence definition.

**Why it matters**: One sentence about impact or consequence.

**Key point**: The single most important thing to remember about this concept.

---

## Implementation Guide

Follow these patterns in this exact order of complexity. Each builds on the previous.

### Pattern 1: The Foundation (Absolute Beginner)

**When to use**: First-time implementation, low-complexity needs, learning purposes.

**What you get**: A working example you can copy-paste immediately.

```typescript
// TypeScript example - precise and modern (ES2024+)
// No polyfills, no legacy syntax, no backward compatibility cruft

// Clear comment explaining the "why" not the "what"
// The code should be obvious about what it does
const example = () => {
  // This approach is straightforward because...
  return "result";
};

// You'd use it like this:
const result = example();
console.log(result);  // "result"
```

**Checklist before using**:
- [ ] You understand what each line does
- [ ] You can explain why this pattern exists
- [ ] You've considered if this scales to your use case

**Common mistakes**:
- Mistake 1: Explanation
- Mistake 2: Explanation

---

### Pattern 2: Production-Ready Implementation

**When to use**: Real application code, moderate complexity, performance matters.

**What you get**: A pattern that scales and handles edge cases.

```typescript
// This example includes error handling, type safety, and optimization
// Notice: We're explicit about assumptions and constraints

interface Config {
  timeout: number;
  retries: number;
  // Configuration options that affect behavior
}

class SkillImplementation {
  private config: Config;

  constructor(config: Config) {
    // Validate configuration at construction time
    if (config.timeout < 0) {
      throw new Error("Timeout must be positive");
    }
    this.config = config;
  }

  async execute(): Promise<string> {
    try {
      // The actual implementation with proper error handling
      return "success";
    } catch (error) {
      // Thoughtful error handling strategy
      throw new Error(`Operation failed: ${error.message}`);
    }
  }
}

// Usage:
const impl = new SkillImplementation({ timeout: 5000, retries: 3 });
const result = await impl.execute();
```

**Why this pattern**:
- Type safety prevents categories of bugs
- Error handling is explicit, not assumed
- Configuration is validated upfront
- The intent is clear from structure

**When to add complexity**:
- Your timeout requirements exceed 30 seconds
- You need to retry transient failures
- Multiple consumers need different configurations

---

### Pattern 3: Advanced / Optimized Implementation

**When to use**: High-performance scenarios, complex orchestration, production at scale.

**What you get**: A pattern that minimizes resource usage and handles failure gracefully.

```typescript
// This example demonstrates advanced considerations:
// - Resource management
// - Observability
// - Failure modes
// - ProMotion/timing optimization (if relevant to skill)

import { EventEmitter } from 'events';

interface ExecutionMetrics {
  duration: number;
  memoryUsed: number;
  cacheHits: number;
}

class OptimizedSkillImplementation extends EventEmitter {
  private cache = new Map<string, unknown>();
  private metrics: ExecutionMetrics = {
    duration: 0,
    memoryUsed: 0,
    cacheHits: 0,
  };

  async execute(key: string): Promise<unknown> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      // Check cache first - fail fast on hits
      if (this.cache.has(key)) {
        this.metrics.cacheHits++;
        return this.cache.get(key);
      }

      // If not cached, execute with proper cleanup
      const result = await this.performExpensiveOperation(key);

      // Cache aggressively for frequently accessed items
      this.cache.set(key, result);

      // Record metrics for monitoring
      this.metrics.duration = performance.now() - startTime;
      this.metrics.memoryUsed = process.memoryUsage().heapUsed - startMemory;

      // Emit for observability
      this.emit('execution', { key, metrics: this.metrics });

      return result;
    } catch (error) {
      // Distinguish between recoverable and fatal errors
      if (this.isRecoverable(error)) {
        this.emit('warning', { key, error });
        return this.getFallback(key);
      }
      this.emit('error', { key, error });
      throw error;
    }
  }

  private async performExpensiveOperation(key: string): Promise<unknown> {
    // Actual implementation details
    return { key, timestamp: Date.now() };
  }

  private isRecoverable(error: unknown): boolean {
    // Determine if we can recover from this error
    return error instanceof TypeError === false;
  }

  private getFallback(key: string): unknown {
    // Return degraded experience instead of failure
    return { key, cached: true, stale: true };
  }

  getMetrics(): ExecutionMetrics {
    return { ...this.metrics };
  }
}

// Usage with proper lifecycle management:
const optimized = new OptimizedSkillImplementation();

optimized.on('execution', (event) => {
  console.log(`Executed ${event.key} in ${event.metrics.duration}ms`);
});

optimized.on('warning', (event) => {
  console.warn(`Recovered from error for ${event.key}: ${event.error.message}`);
});

const result = await optimized.execute('data-key');
console.log(optimized.getMetrics());
```

**Advanced considerations**:
- Cache invalidation strategy must be documented
- Metrics help identify bottlenecks in production
- Graceful degradation > hard failure
- Event-driven for loose coupling

**Performance notes for Apple Silicon**:
- M-series chips handle memory pressure well; use aggressive caching
- ProMotion displays can smooth animations; timing precision matters
- Parallel execution is efficient; consider Promise.all() over sequential

---

## Anti-Patterns

These approaches look right but are subtly wrong. Avoid them.

### Anti-Pattern 1: [Name]

**The mistake**: Code that looks like this:

```typescript
// DON'T DO THIS
const badApproach = () => {
  // This is wrong because...
  return "result";
};
```

**Why it's wrong**:
- Specific technical reason 1
- Specific technical reason 2
- Consequence: [What breaks when you do this]

**What to do instead**:
Use Pattern 2 above, which handles this case correctly by [explanation].

**Real example of the failure**:
```typescript
// This looks fine initially but fails when...
const willFail = async () => {
  // At scale, this breaks because:
  return await expensiveOperation();  // No timeout, no retry, no error handling
};

// Fails with: "Operation timeout after 5 minutes"
```

---

### Anti-Pattern 2: [Name]

**The mistake**: [Description with code]

**Why it's wrong**:
- Technical reason
- Consequence

**What to do instead**: [Link to correct pattern]

---

## Quality Checklist

Use this before considering your implementation complete. All items are non-negotiable.

### Code Quality (REQUIRED)

- [ ] All code examples actually run and produce expected output
- [ ] No polyfills, no legacy syntax, modern JavaScript/TypeScript only (ES2024+)
- [ ] Every code block includes language identifier (typescript, javascript, jsx, etc.)
- [ ] Every significant line has a comment explaining "why," not "what"
- [ ] Type safety is enforced: no `any` types without detailed explanation
- [ ] Error handling is explicit and documented
- [ ] No hardcoded values or magic numbers (use constants with clear names)
- [ ] Performance implications are documented where relevant

### Documentation Quality (REQUIRED)

- [ ] Purpose statement is one sentence answering "why not alternatives"
- [ ] "When to use" section has at least 3 use cases
- [ ] "When NOT to use" section is included
- [ ] All concepts are explained in 2 minutes or less
- [ ] Every code example is runnable and produces expected output
- [ ] Anti-patterns are included with consequences explained
- [ ] All terminology is consistent throughout (no synonym drift)
- [ ] External resources are recent (last 2 years) and authoritative

### Platform & Browser Compliance (REQUIRED)

- [ ] All APIs used are available in Chromium 143+, Safari 17.2+, Firefox latest
- [ ] No feature detection hacks; modern browsers support these features natively
- [ ] If Apple Silicon optimization matters to this skill, it's documented
- [ ] ProMotion 120Hz implications are noted if animations/timing are involved
- [ ] No fallback code for >95% supported features

### Cross-Reference Completeness (REQUIRED)

- [ ] Minimum 2 related skills are linked
- [ ] If not beginner level, minimum 1 prerequisite is listed
- [ ] Each related skill link is verified to exist
- [ ] Each prerequisite is actually required before attempting this skill
- [ ] "See also" section includes relevant external resources
- [ ] Skills are organized by logical dependency (not alphabetically)

### Metadata Accuracy (REQUIRED)

- [ ] `name` is in kebab-case with no spaces
- [ ] `version` follows semver (1.0.0 format)
- [ ] `description` is one clear sentence
- [ ] `category` is one of: ui-ux, pwa, performance, security, api-integration, data, testing
- [ ] `complexity` matches actual content (if you need prerequisites, it's not beginner)
- [ ] `philosophy` quote is attributed and relevant to the skill's core value
- [ ] `target_browsers` lists only truly supported versions
- [ ] `target_platform` is specific (m1, m2, m3, m4, or generic-intel)

### Testing & Validation (REQUIRED)

- [ ] Code examples have been tested in actual browser environment
- [ ] Examples work in all listed target browsers
- [ ] Performance characteristics are measured or explained
- [ ] Edge cases are handled or documented
- [ ] Potential errors are documented with resolution steps

---

## Real-World Example

Show how a developer would actually use this skill end-to-end. Include:
- Setup/initialization
- Normal usage
- Error case handling
- Monitoring/observability

```typescript
// Complete example showing real usage

// Step 1: Setup
const skillInstance = new SkillImplementation({
  timeout: 5000,
  retries: 3,
});

// Step 2: Normal operation
async function handleUserAction() {
  try {
    const result = await skillInstance.execute('user-data');
    return result;
  } catch (error) {
    // Handle specific error types
    if (error instanceof TimeoutError) {
      console.error('Operation took too long');
      return fallbackData;
    }
    throw error;  // Re-throw unknown errors
  }
}

// Step 3: Monitoring
skillInstance.on('metric', (metric) => {
  if (metric.duration > 1000) {
    console.warn('Slow operation:', metric);
  }
});

// Step 4: Cleanup
// Ensure resources are released when done
skillInstance.destroy();
```

---

## Related Skills

These skills are closely related and often used together:

- **[Related Skill 1]** - Use this first if you're unfamiliar with [foundation concept]
- **[Related Skill 2]** - Combine this with [current skill] for [combined benefit]
- **[Related Skill 3]** - Use this after mastering current skill for [advanced scenario]

---

## Troubleshooting

Document the most likely failure modes and how to fix them.

### Issue: [Error Message or Symptom]

**Cause**: Explanation of what went wrong

**Solution**:
```typescript
// Here's the correct approach:
```

**Prevention**: How to avoid this in the future

---

## Browser & Platform Support

**Minimum versions**:
- Chromium: 143+
- Safari: 17.2+
- Firefox: Latest (ESR 128+)

**Why these versions**: These versions introduce [specific feature] that this skill depends on.

**Apple Silicon considerations**:
- M-series optimization: [If relevant]
- ProMotion 120Hz: [If timing/animation relevant]
- Memory pressure: [If relevant to implementation]

**What's NOT supported**:
- Legacy browsers (IE11, old Safari versions) - No polyfills will be provided
- Node.js versions below 20.x - If this skill includes server-side code

---

## Performance Characteristics

Include if relevant to the skill.

| Operation | Complexity | Apple Silicon | Intel | Notes |
|-----------|-----------|---------------|-------|-------|
| [Operation] | O(n) | ~2ms | ~3ms | [Context] |
| [Operation] | O(n²) | ~50ms | ~100ms | [Context] |

**Optimization opportunities**:
- Use caching for frequently accessed [resource]
- Parallel execution is safe for [operations]
- Avoid [expensive operation] in hot loops

---

## References & Resources

Authoritative sources that support and extend this skill.

### Official Documentation
- [Resource Title](https://link) - Author, Year
- [Resource Title](https://link) - Author, Year

### Further Learning
- [Advanced Topic](https://link) - Author, Year
- [Related Pattern](https://link) - Author, Year

### Tools & Utilities
- [Tool Name](https://link) - Purpose
- [Tool Name](https://link) - Purpose

---

## Contributing to This Skill

If you improve this skill, update the version number and document your changes:

- **Version 1.0.0**: Initial release with core patterns
- **Version 1.1.0**: [Date] - Added [specific improvement]
- **Version 2.0.0**: [Date] - Breaking change: [what changed]

---

## Revision Notes

Document evolution of this skill over time:

**Last reviewed**: [Date]
**Last updated**: [Date]
**Status**: Active | Deprecated | Experimental

If deprecated: Explain the recommended alternative and migration path.
