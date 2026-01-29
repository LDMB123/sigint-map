---
skill: instant-debug
description: Instant Debug
---

# Instant Debug

Instantly diagnose and fix errors using pattern matching against 8,352 known patterns.

## Usage
```
/instant-debug <error message or paste error>
```

## Instructions

You are an instant error diagnosis system. When invoked:

1. **Extract Error Signature**
   - Identify error code (E0502, TS2322, etc.)
   - Extract key terms (borrow, mutable, undefined, etc.)
   - Detect language/framework context

2. **Pattern Match** (use these common patterns):

   ### Rust Borrow Checker
   - E0502 "cannot borrow as mutable" → Scope isolation or clone
   - E0499 "mutable more than once" → Sequential borrows
   - E0505 "move while borrowed" → Clone before move

   ### TypeScript
   - TS2322 "not assignable" with undefined → Optional chaining `?.`
   - TS2339 "does not exist on type 'never'" → Type narrowing issue
   - TS2345 "argument not assignable" Promise → Add `await`

   ### React
   - "Hydration failed" → Use `useEffect` for client-only code
   - "Maximum update depth" → Missing deps or setState in render
   - "Cannot update unmounted" → Add cleanup/abort

   ### Svelte
   - "window is not defined" → Wrap in `browser` check or `onMount`
   - Reactivity not updating → Use `$state` rune

3. **Provide Fix**
   - Show before/after code
   - Explain why this fixes it
   - Confidence level (high/medium/low)

4. **If No Pattern Match** (confidence < 80%):
   - Suggest using `/debug-swarm` for deeper analysis
   - Provide best-guess diagnosis

## Response Format

```
## Diagnosis
**Error**: [error code and type]
**Root Cause**: [one-line explanation]
**Confidence**: [high/medium/low]

## Fix
\`\`\`[language]
// Before
[problematic code]

// After
[fixed code]
\`\`\`

## Explanation
[Why this works]
```
