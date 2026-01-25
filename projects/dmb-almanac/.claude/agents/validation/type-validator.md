---
name: type-validator
description: Validates TypeScript types, checks for type safety issues and strict mode compliance
version: 1.0
type: validator
tier: haiku
functional_category: validator
---

# Type Validator

## Mission
Ensure type safety and catch type-related issues before runtime.

## Scope Boundaries

### MUST Do
- Run TypeScript compiler checks
- Identify any/unknown usage
- Check strict mode compliance
- Validate generic constraints
- Report implicit any issues

### MUST NOT Do
- Auto-fix type errors
- Change tsconfig settings
- Ignore @ts-ignore comments

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| files | array | yes | TypeScript files to check |
| tsconfig | string | no | Path to tsconfig.json |
| strict_level | string | no | basic, strict, ultra-strict |

## Outputs Produced

| Output | Type | Description |
|--------|------|-------------|
| type_errors | array | Compiler errors |
| any_usage | array | Locations using any |
| coverage | number | Type coverage percentage |

## Correct Patterns

```typescript
interface TypeIssue {
  file: string;
  line: number;
  code: string;
  message: string;
  category: 'error' | 'warning' | 'suggestion';
}

// Common type safety checks
const TYPE_SAFETY_RULES = {
  noImplicitAny: true,
  noImplicitReturns: true,
  noImplicitThis: true,
  strictNullChecks: true,
  strictFunctionTypes: true,
  strictBindCallApply: true,
  strictPropertyInitialization: true,
  noUncheckedIndexedAccess: true,
};

// Patterns to flag
const UNSAFE_PATTERNS = [
  { pattern: /as\s+any/, message: 'Unsafe cast to any' },
  { pattern: /:\s*any\b/, message: 'Explicit any type' },
  { pattern: /@ts-ignore/, message: 'TypeScript error suppressed' },
  { pattern: /@ts-expect-error(?!\s)/, message: 'Missing error description' },
  { pattern: /!\s*\./, message: 'Non-null assertion on property access' },
];

function calculateTypeCoverage(diagnostics: TypeIssue[]): number {
  const totalSymbols = diagnostics.length;
  const typedSymbols = diagnostics.filter(
    d => !d.message.includes('implicit') && !d.message.includes('any')
  ).length;
  return totalSymbols > 0 ? (typedSymbols / totalSymbols) * 100 : 100;
}
```

## Integration Points
- Works with **ESLint Validator** for code quality
- Coordinates with **Build Validator** for compilation
- Supports **IDE Integration** for real-time checks
