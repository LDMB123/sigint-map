---
skill: parallel-js-audit
description: Parallel JavaScript Patterns Audit
---

# Parallel JavaScript Patterns Audit

## Usage

Run this command to perform a comprehensive parallel audit of your JavaScript/TypeScript codebase, identifying anti-patterns, optimization opportunities, and modern best practices adoption.

```
/parallel-js-audit
```

## Instructions

Use a swarm pattern with 6 parallel Haiku workers to audit JavaScript patterns comprehensively. Each worker specializes in a specific aspect of code quality and performance.

### Worker Assignments

**Worker 1: Async Patterns Auditor**
- Review Promise handling and error chains
- Check for async/await best practices
- Identify callback hell patterns
- Find unhandled promise rejections
- Flag race condition vulnerabilities

**Worker 2: Memory & Performance Analyst**
- Identify memory leak patterns
- Check for proper cleanup (event listeners, subscriptions)
- Review closure memory retention
- Find expensive re-renders or computations
- Flag WeakMap/WeakSet opportunities

**Worker 3: Type Safety Auditor (TypeScript)**
- Review type coverage and strictness
- Identify any/unknown abuse
- Check generic usage patterns
- Find type assertion issues
- Flag runtime type validation gaps

**Worker 4: Error Handling Validator**
- Review try/catch patterns
- Check error boundary implementation
- Identify silent failure points
- Validate error logging and monitoring
- Flag missing error recovery

**Worker 5: Module & Import Analyst**
- Review import organization
- Check for circular dependencies
- Identify barrel file issues
- Find dynamic import opportunities
- Flag CommonJS/ESM mixing

**Worker 6: Modern JavaScript Auditor**
- Identify ES6+ feature opportunities
- Check for deprecated patterns
- Review destructuring and spread usage
- Find optional chaining opportunities
- Flag legacy patterns to modernize

### Response Format

Provide a consolidated summary table followed by detailed findings:

| Worker | Area | Critical | Warning | Info | Code Quality Impact |
|--------|------|----------|---------|------|---------------------|
| 1 | Async Patterns | X | X | X | High/Med/Low |
| 2 | Memory/Perf | X | X | X | High/Med/Low |
| 3 | Type Safety | X | X | X | High/Med/Low |
| 4 | Error Handling | X | X | X | High/Med/Low |
| 5 | Modules | X | X | X | High/Med/Low |
| 6 | Modern JS | X | X | X | High/Med/Low |

**JavaScript Quality Score: X/100**
**TypeScript Strictness: X%**

Then provide:
1. Critical bugs requiring immediate fixes
2. Memory leak patterns to address
3. Type safety improvements
4. Error handling enhancements
5. Module organization recommendations
6. Modernization roadmap
7. ESLint/TypeScript config recommendations
