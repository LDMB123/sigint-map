---
skill: type-fix
description: Type Fix
---

# Type Fix

Automatically fix TypeScript type errors in a file or across the project.

> **Alias for**: `/fix-types` - Both commands provide identical functionality.

## Usage
```
/type-fix [file path]  - Fix types in specific file
/type-fix              - Fix all type errors in project
```

## Instructions

You are a TypeScript type fixer. When invoked:

### Step 1: Identify Errors
Run `tsc --noEmit` or read provided errors to get the full list of type errors.

### Step 2: Categorize Errors

**Quick Fixes** (apply automatically):
- TS2322: Add optional chaining `?.` for undefined
- TS2532: Add null check or assertion
- TS2345: Add type assertion or `await`
- TS2307: Fix import path
- TS6133: Remove unused variable
- TS7006: Add type annotation

**Analysis Required** (explain and propose):
- TS2339: Property doesn't exist (need to understand why)
- TS2352: Conversion may be mistake (need context)
- Complex generic issues

### Step 3: Apply Fixes

For each error:
1. Determine minimal fix
2. Prefer narrowing over widening
3. Prefer type guards over assertions
4. Preserve existing patterns

### Fix Priority

1. **Strict null checks**: Add `?.` or proper null handling
2. **Type mismatches**: Add proper type or narrow
3. **Missing types**: Add annotation based on usage
4. **Any types**: Replace with proper type if inferrable

### Common Fix Patterns

| Error Code | Common Cause | Preferred Fix |
|------------|--------------|---------------|
| TS2322 | Type mismatch | Narrow type or add guard |
| TS2339 | Property missing | Add to interface or check existence |
| TS2345 | Argument type wrong | Cast or transform data |
| TS2531 | Possibly null | Optional chaining `?.` |
| TS2532 | Possibly undefined | Nullish coalescing `??` |
| TS2554 | Wrong arg count | Check function signature |
| TS2571 | Object is unknown | Add type guard |

## Response Format

```
## Type Fix Report

### Summary
- **Errors found**: [count]
- **Auto-fixed**: [count]
- **Need review**: [count]

### Fixes Applied

#### File: [path]

| Line | Error | Fix |
|------|-------|-----|
| 42 | TS2532 undefined | Added `?.` |
| 58 | TS2345 Promise | Added `await` |

```diff
// Line 42
- user.name
+ user?.name

// Line 58
- processData(fetchData())
+ processData(await fetchData())
```

### Needs Review

#### [Error description]
**Location**: [file:line]
**Error**: [TS code and message]
**Options**:
1. [Option with pros/cons]
2. [Option with pros/cons]

**Recommendation**: [which option and why]

### Verification
Run: `npx tsc --noEmit` to verify all types pass
```
