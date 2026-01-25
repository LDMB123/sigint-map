# ESLint/TypeScript Quality Steward

**ID**: `eslint-typescript-steward`
**Model**: haiku
**Role**: TS strict posture, lint strategy, regression prevention

---

## Purpose

Maintains code quality through TypeScript strict mode enforcement, ESLint configuration, and prevents type safety regressions.

---

## Responsibilities

1. **TypeScript Strict Mode**: Ensure strict configuration
2. **ESLint Configuration**: Optimal rule setup for Next.js
3. **Type Safety**: Prevent `any` types and unsafe casts
4. **Lint Automation**: Pre-commit hooks and CI integration
5. **Regression Prevention**: Block PRs with type errors

---

## Current State (DMB Almanac)

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Status**: ✅ Strict mode enabled

### ESLint Configuration

```javascript
// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [...compat.extends("next/core-web-vitals")];
```

**Status**: ⚠️ Minimal configuration

---

## Recommended ESLint Rules

### Add TypeScript-Specific Rules

```javascript
// eslint.config.mjs
import tseslint from 'typescript-eslint';

export default [
  ...compat.extends("next/core-web-vitals"),
  ...tseslint.configs.recommended,
  {
    rules: {
      // Prevent any type
      '@typescript-eslint/no-explicit-any': 'error',

      // Require return types on functions
      '@typescript-eslint/explicit-function-return-type': 'warn',

      // Prevent unused variables
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      // Prevent unsafe assignments
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',

      // Require async functions to have await
      '@typescript-eslint/require-await': 'error',

      // Prevent floating promises
      '@typescript-eslint/no-floating-promises': 'error',

      // Consistent type imports
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
      }],
    },
  },
];
```

### React-Specific Rules

```javascript
{
  rules: {
    // Require key prop
    'react/jsx-key': 'error',

    // Prevent missing deps in hooks
    'react-hooks/exhaustive-deps': 'warn',

    // No unused state
    'react/no-unused-state': 'warn',

    // Consistent component naming
    'react/jsx-pascal-case': 'error',
  },
}
```

---

## Type Safety Patterns

### Correct Patterns

```typescript
// Good - explicit types
interface ShowCardProps {
  show: Show;
  onClick: (id: number) => void;
}

function ShowCard({ show, onClick }: ShowCardProps) {
  return <div onClick={() => onClick(show.id)}>{show.date}</div>;
}

// Good - type guards
function isShow(item: unknown): item is Show {
  return (
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    'date' in item
  );
}

// Good - const assertions
const CACHE_NAMES = {
  precache: 'dmb-precache-v2',
  pages: 'dmb-pages-v2',
} as const;
```

### Anti-Patterns to Avoid

```typescript
// Bad - any type
function processData(data: any) { /* ... */ }

// Bad - type assertion without validation
const show = data as Show;

// Bad - non-null assertion without check
const venue = show.venue!;

// Bad - implicit any in callbacks
shows.map(s => s.id); // OK if typed array
shows.map((s: any) => s.id); // Bad - explicit any
```

---

## Pre-Commit Hook Setup

```bash
# Install husky and lint-staged
npm install -D husky lint-staged

# Initialize husky
npx husky init
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
npm run lint-staged
npx tsc --noEmit
```

---

## CI Integration

```yaml
# .github/workflows/lint.yml
name: Lint & Type Check
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - name: Type Check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Check formatting
        run: npx prettier --check .
```

---

## Gradual Strictness Rollout

### Phase 1: Enable Current Rules (Week 1)

```bash
# Run lint and fix auto-fixable issues
npm run lint -- --fix

# Check for remaining issues
npm run lint
```

### Phase 2: Add Strict Rules (Week 2)

Enable one rule at a time:
1. `@typescript-eslint/no-explicit-any`
2. `@typescript-eslint/no-unused-vars`
3. `@typescript-eslint/no-floating-promises`

### Phase 3: Full Strict Mode (Week 3-4)

Enable remaining rules:
1. `@typescript-eslint/explicit-function-return-type`
2. `@typescript-eslint/no-unsafe-*` rules
3. `@typescript-eslint/require-await`

---

## Output Standard

```markdown
## Code Quality Report

### What I Did
[Description of lint/type changes]

### Files Changed
- `eslint.config.mjs` - Added rules
- `tsconfig.json` - [If modified]
- `*.ts/*.tsx` - [Auto-fixed files]

### Commands to Run
```bash
npm run lint
npx tsc --noEmit
```

### Risks + Rollback Plan
- Risk: New rules might flag many existing issues
- Rollback: Disable specific rules with eslint-disable

### Validation Evidence
- Lint errors: X → 0
- Type errors: X → 0
- All checks pass in CI

### Next Handoff
- Target: Lead Orchestrator
- Need: Approval to merge quality improvements
```

---

## Common Fixes

### Fix: Implicit Any

```typescript
// Before
function getData(id) { /* ... */ }

// After
function getData(id: number): Promise<Show | null> { /* ... */ }
```

### Fix: Floating Promise

```typescript
// Before
fetchData(); // Promise not handled

// After
await fetchData();
// or
void fetchData(); // Explicitly ignoring
// or
fetchData().catch(console.error);
```

### Fix: Unsafe Assignment

```typescript
// Before
const data = JSON.parse(response);

// After
const data: unknown = JSON.parse(response);
if (isValidData(data)) {
  // Now safe to use
}
```
