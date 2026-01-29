---
skill: inventory-unnecessary-js
description: Inventory Unnecessary JavaScript
---

# Inventory Unnecessary JavaScript

Find and eliminate unnecessary JavaScript in SvelteKit applications including unused code, redundant dependencies, and over-bundled modules.

## Usage

```bash
/inventory-unnecessary-js [path] [options]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `path` | No | Specific directory or file to analyze (default: entire project) |
| `options` | No | Flags: `--deps`, `--dead-code`, `--polyfills`, `--duplicates`, `--fix` |

## Instructions

You are a JavaScript bundle optimization expert specializing in dead code elimination, dependency auditing, and modern browser targeting for SvelteKit/Vite applications.

Systematically identify unnecessary JavaScript code, unused dependencies, redundant polyfills, and opportunities to reduce bundle size.

### Analysis Categories

| Category | Description | Typical Savings |
|----------|-------------|-----------------|
| Dead code | Unreachable/unused code | 5-20% |
| Unused exports | Exported but never imported | 3-10% |
| Unused dependencies | Installed but not used | 10-40% |
| Duplicate packages | Multiple versions | 5-15% |
| Unnecessary polyfills | Modern browsers don't need | 10-30% |
| Over-bundled imports | Could be tree-shaken | 5-25% |

### Dead Code Detection

```typescript
// knip.config.ts - Dead code finder
export default {
  entry: [
    'src/routes/**/+*.{js,ts,svelte}',
    'src/lib/index.ts',
    'src/hooks.*.ts',
  ],
  project: ['src/**/*.{js,ts,svelte}'],
  ignore: ['**/*.d.ts', '**/generated/**'],
  svelte: {
    entry: ['src/routes/**/+*.svelte'],
  },
};

// Run: npx knip
```

```bash
# Find unused exports
npx ts-prune --project tsconfig.json

# Dead code in Svelte components
npx svelte-check --fail-on-warnings
```

### Unused Dependencies Detection

```bash
# Check for unused dependencies
npx depcheck --ignores="@sveltejs/*,vite"

# Alternative with more detail
npx npm-check -u

# Check for outdated + unused
npx taze major
```

```typescript
// Custom unused import finder
// scripts/find-unused-imports.ts
import { globSync } from 'glob';
import { readFileSync } from 'fs';

const files = globSync('src/**/*.{ts,js,svelte}');
const imports = new Map<string, Set<string>>();

for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  const matches = content.matchAll(/import\s+(?:{[^}]+}|[\w]+)\s+from\s+['"]([^'"]+)['"]/g);

  for (const match of matches) {
    const pkg = match[1];
    if (!imports.has(pkg)) imports.set(pkg, new Set());
    imports.get(pkg)!.add(file);
  }
}

// Compare with package.json dependencies
const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

for (const dep of Object.keys(allDeps)) {
  if (!imports.has(dep) && !dep.startsWith('@types/')) {
    console.log(`Potentially unused: ${dep}`);
  }
}
```

### Polyfill Analysis

```typescript
// vite.config.ts - Modern browser targeting
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    target: 'es2022', // Modern browsers only
    // Or specific browsers
    // target: ['chrome100', 'firefox100', 'safari15']
  },
  optimizeDeps: {
    // Exclude polyfills if targeting modern browsers
    exclude: ['core-js', 'regenerator-runtime'],
  },
});
```

| Polyfill | Needed For | Modern Alternative | Drop If |
|----------|-----------|-------------------|---------|
| `core-js` | ES6+ features | Native | ES2020+ target |
| `regenerator-runtime` | async/await | Native | ES2017+ target |
| `whatwg-fetch` | Fetch API | Native | All modern browsers |
| `promise-polyfill` | Promises | Native | IE11 not needed |
| `intersection-observer` | IO API | Native | Safari 12.1+ |
| `resize-observer-polyfill` | RO API | Native | Safari 13.1+ |

### Duplicate Package Detection

```bash
# Find duplicates in node_modules
npx npm-dedupe

# Detailed duplicate analysis
npx bundle-wizard build

# Check why a package is installed multiple times
npm why lodash
pnpm why lodash
```

```typescript
// vite.config.ts - Force deduplication
export default defineConfig({
  resolve: {
    dedupe: ['svelte', 'lodash', 'date-fns'],
  },
  optimizeDeps: {
    include: ['lodash-es'], // Force single copy
  },
});
```

### Tree-Shaking Verification

```typescript
// BAD: Imports entire library
import _ from 'lodash';
const result = _.map(arr, fn);

// GOOD: Import only what's needed
import map from 'lodash-es/map';
const result = map(arr, fn);

// BAD: Barrel file imports everything
import { Button } from '$lib/components';

// GOOD: Direct import
import Button from '$lib/components/Button.svelte';
```

```typescript
// Check if a package is tree-shakeable
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
      },
    },
  },
});
```

### Common Unnecessary JS Patterns

| Pattern | Problem | Solution |
|---------|---------|----------|
| Moment.js with locales | Bundles all locales | Use date-fns or dayjs |
| Full lodash import | No tree-shaking | Use lodash-es |
| Icon library imports | All icons bundled | Import individual icons |
| UI framework barrel | Entire lib loaded | Direct component imports |
| Unused route chunks | Dead route code | Remove routes |
| Console logs in prod | Debug code shipped | Use build-time removal |

### Automated Removal Tools

```bash
# Remove unused imports
npx eslint --fix --rule 'unused-imports/no-unused-imports: error'

# Remove console statements
npx vite build -- --mode production  # with plugin

# Remove dead code
npx ts-prune --remove
```

```typescript
// vite.config.ts - Production cleanup
import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    drop: ['console', 'debugger'], // Remove in production
    pure: ['console.log', 'console.info'], // Tree-shake these calls
  },
  define: {
    'import.meta.env.DEV': JSON.stringify(false),
  },
});
```

### Response Format

```markdown
## Unnecessary JavaScript Inventory

### Summary
- **Total Analyzed Files**: [N]
- **Estimated Removable Code**: [X] KB
- **Unused Dependencies**: [N] packages
- **Dead Code Locations**: [N] files

### Bundle Impact Analysis

| Category | Current Size | Removable | Savings |
|----------|-------------|-----------|---------|
| Dead code | [X] KB | [Y] KB | [Z]% |
| Unused deps | [X] KB | [Y] KB | [Z]% |
| Polyfills | [X] KB | [Y] KB | [Z]% |
| Duplicates | [X] KB | [Y] KB | [Z]% |
| **Total** | [X] KB | [Y] KB | [Z]% |

### Unused Dependencies

| Package | Size Impact | Used By | Action |
|---------|-------------|---------|--------|
| [package] | [X] KB | Nothing | Remove |
| [package] | [X] KB | 1 file | Review |

\`\`\`bash
# Remove unused dependencies
npm uninstall [package1] [package2]
\`\`\`

### Dead Code Locations

| File | Line(s) | Type | Description |
|------|---------|------|-------------|
| [path] | [lines] | Unused export | [fn name] |
| [path] | [lines] | Dead code | [description] |

\`\`\`typescript
// [file:line] - Remove this unused function
[code snippet to remove]
\`\`\`

### Unnecessary Polyfills

| Polyfill | Current Size | Target Browsers | Remove? |
|----------|-------------|-----------------|---------|
| [name] | [X] KB | [browsers] | Yes/No |

\`\`\`typescript
// vite.config.ts update
export default defineConfig({
  build: {
    target: 'es2022',
  },
});
\`\`\`

### Duplicate Packages

| Package | Versions | Locations | Resolution |
|---------|----------|-----------|------------|
| [name] | v1, v2 | [deps] | Dedupe to v2 |

\`\`\`bash
# Force resolution
npm dedupe
# or add to package.json:
# "overrides": { "[package]": "^[version]" }
\`\`\`

### Import Optimization Opportunities

| Current Import | Size Impact | Optimized Import |
|----------------|-------------|------------------|
| `import _ from 'lodash'` | 70KB | `import map from 'lodash-es/map'` |
| `import { Icon } from 'icons'` | 200KB | `import Icon from 'icons/Check.svelte'` |

### Barrel File Issues

| Barrel File | Exports | Actually Used | Waste |
|-------------|---------|---------------|-------|
| $lib/components/index.ts | 50 | 5 | 90% |
| $lib/utils/index.ts | 20 | 3 | 85% |

### Action Plan

#### Immediate (< 1 hour)
1. Remove unused dependencies
   \`\`\`bash
   npm uninstall [packages]
   \`\`\`

2. Delete dead code files
   \`\`\`bash
   rm [files]
   \`\`\`

#### Short-term (1-4 hours)
1. Refactor barrel imports
2. Update polyfill strategy
3. Deduplicate packages

#### Medium-term (4+ hours)
1. Replace heavy dependencies
2. Implement dynamic imports
3. Add bundle monitoring

### Verification Commands

\`\`\`bash
# Check bundle size after changes
npm run build && du -sh .svelte-kit/output/client

# Verify no unused deps
npx depcheck

# Verify no dead code
npx knip

# Compare bundle sizes
npx source-map-explorer .svelte-kit/output/client/_app/immutable/chunks/*.js
\`\`\`

### Monitoring Setup

\`\`\`yaml
# .github/workflows/bundle-check.yml
name: Bundle Size Check
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - run: npx bundlewatch --config bundlewatch.config.json
\`\`\`
```
