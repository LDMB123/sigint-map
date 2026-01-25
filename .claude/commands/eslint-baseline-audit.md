# ESLint Baseline Audit

Comprehensive ESLint configuration audit to evaluate rule coverage, identify gaps, establish baselines, and recommend improvements for code quality enforcement.

## Usage

```
/eslint-baseline-audit [scope: full|rules|plugins|performance|security]
```

## Instructions

You are an expert JavaScript/TypeScript linting specialist with deep knowledge of ESLint configurations, plugin ecosystems, and code quality best practices. When invoked, analyze the existing ESLint setup and provide actionable recommendations for improvement.

### Audit Categories

| Category | Description | Focus Areas |
|----------|-------------|-------------|
| Rules | Core and plugin rule analysis | Coverage, severity, rationale |
| Plugins | Plugin usage and compatibility | Version conflicts, overlap |
| Performance | Linting speed optimization | Rule costs, caching |
| Security | Security-focused rules | Vulnerability detection |
| Style | Code style consistency | Formatting, conventions |
| TypeScript | TS-specific configuration | Type-aware rules |

### Rule Severity Levels

| Level | ESLint Value | Use Case |
|-------|--------------|----------|
| off | 0 | Intentionally disabled |
| warn | 1 | Gradual adoption, informational |
| error | 2 | Must fix before commit |

### Audit Checklist

```markdown
## Core ESLint Rules
- [ ] no-console (appropriate for environment)
- [ ] no-debugger (error in production)
- [ ] no-unused-vars (with proper options)
- [ ] no-undef (if not using TypeScript)
- [ ] eqeqeq (strict equality)
- [ ] curly (brace style)
- [ ] no-var (prefer let/const)
- [ ] prefer-const (immutability)
- [ ] no-implicit-globals

## TypeScript Rules (@typescript-eslint)
- [ ] @typescript-eslint/no-explicit-any
- [ ] @typescript-eslint/explicit-function-return-type
- [ ] @typescript-eslint/no-unused-vars (replaces core)
- [ ] @typescript-eslint/strict-boolean-expressions
- [ ] @typescript-eslint/no-floating-promises
- [ ] @typescript-eslint/await-thenable
- [ ] @typescript-eslint/no-misused-promises

## React Rules (eslint-plugin-react)
- [ ] react/jsx-key
- [ ] react/no-array-index-key
- [ ] react/jsx-no-bind (performance)
- [ ] react/prop-types (or TypeScript)
- [ ] react/jsx-curly-brace-presence
- [ ] react-hooks/rules-of-hooks
- [ ] react-hooks/exhaustive-deps

## Import Rules (eslint-plugin-import)
- [ ] import/order (with groups)
- [ ] import/no-duplicates
- [ ] import/no-unresolved
- [ ] import/named
- [ ] import/no-cycle (with maxDepth)
- [ ] import/no-extraneous-dependencies

## Security Rules
- [ ] no-eval
- [ ] no-implied-eval
- [ ] no-new-func
- [ ] security/detect-object-injection
- [ ] security/detect-non-literal-regexp
- [ ] security/detect-possible-timing-attacks

## Accessibility Rules (eslint-plugin-jsx-a11y)
- [ ] jsx-a11y/alt-text
- [ ] jsx-a11y/anchor-has-content
- [ ] jsx-a11y/click-events-have-key-events
- [ ] jsx-a11y/no-noninteractive-element-interactions
```

### Configuration Analysis Examples

```javascript
// Example: Analyzing eslint.config.js (flat config)
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';

export default [
  // Base recommended rules
  js.configs.recommended,

  // TypeScript configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': typescript,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // Disable base rules that conflict with TS
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      // Type-aware rules (require parserServices)
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/strict-boolean-expressions': ['warn', {
        allowNullableBoolean: true,
        allowNullableString: true,
      }],

      // Strictness rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // React configuration
  {
    files: ['**/*.jsx', '**/*.tsx'],
    plugins: {
      'react': react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react/jsx-key': ['error', { checkFragmentShorthand: true }],
      'react/no-array-index-key': 'warn',
      'react/jsx-no-target-blank': 'error',
      'react/jsx-curly-brace-presence': ['warn', {
        props: 'never',
        children: 'never',
      }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Import ordering
  {
    plugins: {
      'import': importPlugin,
    },
    rules: {
      'import/order': ['error', {
        groups: [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling'],
          'index',
          'type',
        ],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      }],
      'import/no-duplicates': 'error',
      'import/no-cycle': ['error', { maxDepth: 3 }],
    },
  },

  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      '*.config.js',
      'coverage/**',
    ],
  },
];
```

### Vitest Tests for ESLint Rules

```typescript
// tests/lint/eslint-rules.test.ts
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import path from 'path';

describe('ESLint Configuration', () => {
  let eslint: ESLint;

  beforeAll(() => {
    eslint = new ESLint({
      cwd: process.cwd(),
    });
  });

  it('should load configuration without errors', async () => {
    const config = await eslint.calculateConfigForFile('src/index.ts');
    expect(config).toBeDefined();
    expect(config.rules).toBeDefined();
  });

  it('should have no-console rule configured', async () => {
    const config = await eslint.calculateConfigForFile('src/index.ts');
    expect(config.rules['no-console']).toBeDefined();
  });

  it('should catch unused variables', async () => {
    const code = `const unused = 'test';`;
    const results = await eslint.lintText(code, { filePath: 'test.ts' });

    const unusedVarError = results[0].messages.find(
      m => m.ruleId === '@typescript-eslint/no-unused-vars' || m.ruleId === 'no-unused-vars'
    );

    expect(unusedVarError).toBeDefined();
  });

  it('should enforce strict equality', async () => {
    const code = `if (a == b) {}`;
    const results = await eslint.lintText(code, { filePath: 'test.js' });

    const eqeqeqError = results[0].messages.find(m => m.ruleId === 'eqeqeq');
    expect(eqeqeqError).toBeDefined();
  });

  it('should catch floating promises in TypeScript', async () => {
    const code = `
      async function fetchData() { return 'data'; }
      function test() {
        fetchData(); // Missing await
      }
    `;
    const results = await eslint.lintText(code, { filePath: 'test.ts' });

    const floatingPromise = results[0].messages.find(
      m => m.ruleId === '@typescript-eslint/no-floating-promises'
    );

    expect(floatingPromise).toBeDefined();
  });

  it('should require jsx-key in arrays', async () => {
    const code = `
      const items = ['a', 'b'].map(item => <div>{item}</div>);
    `;
    const results = await eslint.lintText(code, { filePath: 'test.tsx' });

    const keyError = results[0].messages.find(m => m.ruleId === 'react/jsx-key');
    expect(keyError).toBeDefined();
  });

  it('should enforce exhaustive-deps for hooks', async () => {
    const code = `
      import { useEffect, useState } from 'react';
      function Component({ id }) {
        const [data, setData] = useState(null);
        useEffect(() => {
          fetch('/api/' + id).then(r => setData(r));
        }, []); // Missing id in deps
      }
    `;
    const results = await eslint.lintText(code, { filePath: 'test.tsx' });

    const depsWarning = results[0].messages.find(
      m => m.ruleId === 'react-hooks/exhaustive-deps'
    );

    expect(depsWarning).toBeDefined();
  });
});

// tests/lint/eslint-performance.test.ts
describe('ESLint Performance', () => {
  it('should lint a large file within time limit', async () => {
    const eslint = new ESLint();
    const largeFile = path.join(process.cwd(), 'src/largest-file.ts');

    const start = performance.now();
    await eslint.lintFiles([largeFile]);
    const duration = performance.now() - start;

    // Should complete in under 5 seconds
    expect(duration).toBeLessThan(5000);
  });

  it('should utilize cache effectively', async () => {
    const eslint = new ESLint({ cache: true });

    // First run (cold)
    const start1 = performance.now();
    await eslint.lintFiles(['src/**/*.ts']);
    const cold = performance.now() - start1;

    // Second run (warm cache)
    const start2 = performance.now();
    await eslint.lintFiles(['src/**/*.ts']);
    const warm = performance.now() - start2;

    // Cached run should be significantly faster
    expect(warm).toBeLessThan(cold * 0.5);
  });
});
```

### Rule Comparison Tables

```markdown
## Recommended Rule Sets Comparison

| Rule | eslint:recommended | typescript-eslint/recommended | typescript-eslint/strict |
|------|-------------------|------------------------------|-------------------------|
| no-unused-vars | error | off (use TS version) | off |
| @typescript-eslint/no-unused-vars | - | error | error |
| @typescript-eslint/no-explicit-any | - | warn | error |
| @typescript-eslint/no-floating-promises | - | - | error |
| @typescript-eslint/strict-boolean-expressions | - | - | error |

## Plugin Rule Coverage

| Plugin | Rules Available | Rules Enabled | Coverage % |
|--------|-----------------|---------------|------------|
| @typescript-eslint | 100+ | X | X% |
| eslint-plugin-react | 80+ | X | X% |
| eslint-plugin-import | 40+ | X | X% |
| eslint-plugin-jsx-a11y | 30+ | X | X% |
| eslint-plugin-security | 15 | X | X% |
```

### Performance Optimization Tips

```javascript
// eslint.config.js performance optimizations

export default [
  {
    // Limit type-aware rules to TS files only
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        // Use faster project resolution
        EXPERIMENTAL_useProjectService: true,
      },
    },
  },

  // Expensive rules to consider disabling in watch mode
  {
    rules: {
      // These require full project analysis
      'import/no-cycle': process.env.CI ? 'error' : 'off',
      '@typescript-eslint/no-unsafe-assignment': process.env.CI ? 'error' : 'off',
      '@typescript-eslint/no-unsafe-member-access': process.env.CI ? 'error' : 'off',
    },
  },

  // Ignore generated files
  {
    ignores: [
      '**/*.generated.ts',
      '**/graphql/**/*.ts',
      'dist/**',
      '.next/**',
    ],
  },
];
```

### Response Format

```
## ESLint Baseline Audit Report

### Configuration Summary

| Item | Value |
|------|-------|
| Config Format | [Flat/Legacy] |
| ESLint Version | X.X.X |
| Parser | [@typescript-eslint/parser/babel] |
| Total Rules | [enabled count] |
| Plugins | [list] |

### Rule Coverage Analysis

| Category | Enabled | Available | Coverage |
|----------|---------|-----------|----------|
| Core ESLint | X | Y | Z% |
| TypeScript | X | Y | Z% |
| React | X | Y | Z% |
| Import | X | Y | Z% |
| Security | X | Y | Z% |
| Accessibility | X | Y | Z% |

### Severity Distribution

| Severity | Count | Percentage |
|----------|-------|------------|
| error | X | X% |
| warn | X | X% |
| off | X | X% |

### Critical Findings

#### Finding 1: [Title]
- **Impact**: [High/Medium/Low]
- **Rule**: [rule-name]
- **Current**: [off/warn]
- **Recommended**: [error]
- **Rationale**: [why this matters]

### Recommended Configuration Changes

\`\`\`javascript
// Add to eslint.config.js
{
  rules: {
    // Critical additions
    '[rule-name]': 'error',

    // Warnings to promote
    '[rule-name]': ['error', { ...options }],

    // New rules to add
    '[new-rule]': ['warn', { ...options }],
  },
}
\`\`\`

### Plugin Recommendations

1. **Add**: `eslint-plugin-security` - Catches common security issues
2. **Add**: `eslint-plugin-sonarjs` - Code smell detection
3. **Update**: `@typescript-eslint` to vX.X for new rules

### Performance Analysis

| Metric | Current | Optimized |
|--------|---------|-----------|
| Full lint time | Xs | Xs |
| Cached lint time | Xs | Xs |
| Slowest rules | [list] | - |

### Commands

\`\`\`bash
# Run full lint
npm run lint

# Lint with timing info
TIMING=1 npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Generate baseline of existing issues
npx eslint --format json src/ > eslint-baseline.json

# Lint only changed files (staged)
npx lint-staged
\`\`\`

### Migration Path

1. **Week 1**: Add new rules as warnings
2. **Week 2**: Fix auto-fixable issues
3. **Week 3**: Address manual fixes
4. **Week 4**: Promote warnings to errors

### Baseline Snapshot

Total issues at time of audit:
- Errors: X
- Warnings: Y
- Files affected: Z

Save baseline: `npm run lint -- --format json > .eslint-baseline.json`
```
