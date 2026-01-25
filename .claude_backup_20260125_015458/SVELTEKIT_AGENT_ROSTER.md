# SvelteKit Agent Roster

> 15 specialized agents for comprehensive SvelteKit development support

---

## Agent Tiers Overview

| Tier | Model | Purpose | Count |
|------|-------|---------|-------|
| **Opus** | Strategic | Orchestration, coordination | 1 |
| **Sonnet** | Implementation | Feature development, optimization | 13 |
| **Haiku** | Validation | Parallel operations | 1 |

**Total: 15 Agents**

---

## Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  SvelteKit Orchestrator (00)                     │
│                         [Opus Tier]                              │
│          Project coordination, gate enforcement                  │
└─────────────────────────────────────────────────────────────────┘
                                │
    ┌───────────────────────────┼───────────────────────────┐
    │                           │                           │
    ▼                           ▼                           ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│ Core Development  │   │ PWA & Offline     │   │ Quality           │
├───────────────────┤   ├───────────────────┤   ├───────────────────┤
│ SvelteKit (01)    │   │ PWA (04)          │   │ Performance (07)  │
│ Component (02)    │   │ Local-First (05)  │   │ QA (08)           │
│ Vite (03)         │   │ Caching (06)      │   │ TS/ESLint (09)    │
└───────────────────┘   └───────────────────┘   └───────────────────┘

    ┌───────────────────────────┼───────────────────────────┐
    │                           │                           │
    ▼                           ▼                           ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│ UI Platform       │   │ Debugging         │   │ Support           │
├───────────────────┤   ├───────────────────┤   ├───────────────────┤
│ Semantic HTML (11)│   │ UI Debugger (13)  │   │ Parallel (10)     │
│ Modern CSS (12)   │   │ Lint Debugger (14)│   │ [Haiku]           │
└───────────────────┘   └───────────────────┘   └───────────────────┘
```

---

## Tier 1: Opus (Strategic) - 1 Agent

### 00 - SvelteKit Orchestrator

| Attribute | Value |
|-----------|-------|
| **File** | [00-sveltekit-orchestrator.md](agents/sveltekit/00-sveltekit-orchestrator.md) |
| **Tier** | Opus |
| **Role** | Project coordination, quality gates, agent delegation |

**Responsibilities:**
- Coordinates multi-agent SvelteKit workflows
- Enforces quality gates (build, lint, test, Lighthouse)
- Delegates to specialist agents
- Ensures project consistency

**Delegates To:** All other SvelteKit agents

---

## Tier 2: Sonnet (Implementation) - 13 Agents

### 01 - SvelteKit Engineer

| Attribute | Value |
|-----------|-------|
| **File** | [01-sveltekit-engineer.md](agents/sveltekit/01-sveltekit-engineer.md) |
| **Tier** | Sonnet |
| **Role** | Routing, load functions, SSR |

**Responsibilities:**
- Route structure (+page.svelte, +layout.svelte)
- Load functions (server vs universal)
- SSR/CSR boundaries
- Form actions
- Error handling

---

### 02 - Svelte Component Engineer

| Attribute | Value |
|-----------|-------|
| **File** | [02-svelte-component-engineer.md](agents/sveltekit/02-svelte-component-engineer.md) |
| **Tier** | Sonnet |
| **Role** | Svelte 5 runes, reactivity |

**Responsibilities:**
- Svelte 5 runes ($state, $derived, $effect)
- Component architecture
- Reactivity optimization
- Snippet patterns

---

### 03 - Vite SvelteKit Engineer

| Attribute | Value |
|-----------|-------|
| **File** | [03-vite-sveltekit-engineer.md](agents/sveltekit/03-vite-sveltekit-engineer.md) |
| **Tier** | Sonnet |
| **Role** | Build config, bundling, PWA |

**Responsibilities:**
- vite.config.ts optimization
- Bundle analysis and splitting
- vite-plugin-pwa configuration
- Dev server performance

---

### 04 - PWA Engineer

| Attribute | Value |
|-----------|-------|
| **File** | [04-pwa-engineer.md](agents/sveltekit/04-pwa-engineer.md) |
| **Tier** | Sonnet |
| **Role** | Service workers, offline |

**Responsibilities:**
- Service worker lifecycle
- Offline functionality
- Install prompts
- Background sync

**Skills:**
- `service-worker-integration`
- `sw-update-ux`
- `offline-navigation-strategy`
- `manifest-route-verification`

---

### 05 - Local-First Engineer

| Attribute | Value |
|-----------|-------|
| **File** | [05-local-first-engineer.md](agents/sveltekit/05-local-first-engineer.md) |
| **Tier** | Sonnet |
| **Role** | Dexie, IndexedDB, sync |

**Responsibilities:**
- Dexie.js schema and migrations
- IndexedDB optimization
- Offline-first data patterns
- Sync strategies

**Skills:**
- `dexie-schema-audit`
- `dexie-migration-safety`

---

### 06 - Caching Specialist

| Attribute | Value |
|-----------|-------|
| **File** | [06-caching-specialist.md](agents/sveltekit/06-caching-specialist.md) |
| **Tier** | Sonnet |
| **Role** | Browser caching strategies |

**Responsibilities:**
- Cache-Control headers
- Stale-while-revalidate patterns
- CDN caching strategies

**Skills:**
- `cache-debug`

---

### 07 - Performance Optimizer

| Attribute | Value |
|-----------|-------|
| **File** | [07-performance-optimizer.md](agents/sveltekit/07-performance-optimizer.md) |
| **Tier** | Sonnet |
| **Role** | Core Web Vitals, profiling |

**Responsibilities:**
- Core Web Vitals (LCP, INP, CLS)
- Lighthouse audits
- Performance profiling
- Bundle optimization

**Skills:**
- `bundle-analyzer`
- `cache-debug`
- `performance-trace-capture`
- `inventory-unnecessary-js`

---

### 08 - SvelteKit QA Engineer

| Attribute | Value |
|-----------|-------|
| **File** | [08-sveltekit-qa-engineer.md](agents/sveltekit/08-sveltekit-qa-engineer.md) |
| **Tier** | Sonnet |
| **Role** | Testing, validation |

**Responsibilities:**
- Test coverage
- E2E testing (Playwright)
- Unit testing (Vitest)
- Regression testing

**Skills:**
- `offline-e2e-test-harness`
- `visual-regression-check`

---

### 09 - TypeScript/ESLint Steward

| Attribute | Value |
|-----------|-------|
| **File** | [09-typescript-eslint-steward.md](agents/sveltekit/09-typescript-eslint-steward.md) |
| **Tier** | Sonnet |
| **Role** | Linting, type safety |

**Responsibilities:**
- ESLint flat config
- TypeScript strict mode
- svelte-eslint-parser
- Type coverage

**Skills:**
- `eslint-baseline-audit`

---

### 11 - Semantic HTML Engineer

| Attribute | Value |
|-----------|-------|
| **File** | [11-semantic-html-engineer.md](agents/sveltekit/11-semantic-html-engineer.md) |
| **Tier** | Sonnet |
| **Role** | Accessibility, native elements |

**Responsibilities:**
- Native HTML elements
- ARIA patterns
- Accessibility compliance

**Skills:**
- `a11y-keyboard-test`
- `implement-dialog-migration`
- `implement-details-migration`
- `map-js-to-native`

---

### 12 - Modern CSS Architect

| Attribute | Value |
|-----------|-------|
| **File** | [12-modern-css-architect.md](agents/sveltekit/12-modern-css-architect.md) |
| **Tier** | Sonnet |
| **Role** | CSS features, optimization |

**Responsibilities:**
- CSS custom properties
- Container queries
- Modern CSS features

---

### 13 - UI Regression Debugger

| Attribute | Value |
|-----------|-------|
| **File** | [13-ui-regression-debugger.md](agents/sveltekit/13-ui-regression-debugger.md) |
| **Tier** | Sonnet |
| **Role** | Visual debugging |

**Responsibilities:**
- Visual regression analysis
- Layout debugging
- Cross-browser issues

---

### 14 - Lint Regression Debugger

| Attribute | Value |
|-----------|-------|
| **File** | [14-lint-regression-debugger.md](agents/sveltekit/14-lint-regression-debugger.md) |
| **Tier** | Sonnet |
| **Role** | Lint issue diagnosis |

**Responsibilities:**
- Lint error diagnosis
- Rule conflict resolution
- Auto-fix strategies

---

## Tier 3: Haiku (Validation) - 1 Agent

### 10 - Parallel Coordinator

| Attribute | Value |
|-----------|-------|
| **File** | [10-parallel-coordinator.md](agents/sveltekit/10-parallel-coordinator.md) |
| **Tier** | Haiku |
| **Role** | Batch operations |

**Responsibilities:**
- Batch file operations
- Parallel validation
- Work distribution

**Assists:** All agents for parallel operations

---

## Agent Selection Guide

| Task | Primary Agent | Supporting Agents |
|------|---------------|-------------------|
| New SvelteKit routes | SvelteKit Engineer | Component Engineer |
| Build configuration | Vite Engineer | Performance Optimizer |
| Add PWA support | PWA Engineer | Caching Specialist |
| Implement offline-first | Local-First Engineer | PWA Engineer |
| Fix performance issues | Performance Optimizer | Vite Engineer |
| Add tests | QA Engineer | - |
| Fix lint errors | TS/ESLint Steward | Lint Debugger |
| Improve accessibility | Semantic HTML Engineer | Modern CSS Architect |
| Debug visual issues | UI Regression Debugger | Modern CSS Architect |
| Complex multi-step task | SvelteKit Orchestrator | Various |

---

## Quality Gates

All agents enforce these gates before task completion:

```bash
# Gate 1: Build passes
npm run build

# Gate 2: Types pass
npm run check

# Gate 3: Tests pass
npm test

# Gate 4: Lighthouse > 90 all categories
npx lighthouse http://localhost:4173

# Gate 5: No a11y violations
npm run a11y

# Gate 6: Bundle size within budget
npm run build:analyze
```

---

## Integration with Other Agent Families

### With Rust Agents
- WASM integration via Rust Compiler and WASM agents
- Performance optimization collaboration

### With WASM Agents
- JS interop through WASM JS Interop Engineer
- Bundle optimization via WASM Optimizer

---

## Version

**Roster Version**: 1.0.0
**Last Updated**: 2025-01-21
**Total Agents**: 15
