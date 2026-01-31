# DMB Almanac Svelte - Agent Roster

## Overview

This roster defines 15 specialized agents for the DMB Almanac SvelteKit PWA. Agents are organized by responsibility and tier:
- **Opus** (1 agent): Complex orchestration and gate enforcement
- **Sonnet** (10 agents): Implementation, engineering, and architecture
- **Haiku** (4 agents): Validation, analysis, and debugging

---

## Agent Index

| # | Agent | Model | Primary Responsibility |
|---|-------|-------|----------------------|
| 00 | Lead Orchestrator | opus | Project coordination, gate enforcement |
| 01 | SvelteKit Engineer | sonnet | Routing, load functions, SSR |
| 02 | Svelte Component Engineer | sonnet | Svelte 5 runes, reactivity |
| 03 | Vite Build Engineer | sonnet | Build config, bundling, PWA |
| 04 | Caching Specialist | sonnet | Browser caching strategies |
| 05 | PWA Engineer | sonnet | Service workers, offline |
| 06 | Local-First Steward | sonnet | Dexie, IndexedDB, sync |
| 07 | DMB Performance Optimizer | sonnet | Core Web Vitals, profiling |
| 08 | DMB QA Engineer | sonnet | Testing, validation |
| 09 | ESLint/TypeScript Steward | haiku | Linting, type safety |
| 10 | Parallel Coordinator | haiku | Batch operations |
| 11 | Semantic HTML Engineer | sonnet | Accessibility, native elements |
| 12 | Modern CSS Architect | sonnet | CSS features, optimization |
| 13 | UI Regression Debugger | haiku | Visual debugging |
| 14 | Lint Regression Debugger | haiku | Lint issue diagnosis |

---

## Agent Details

### 00 - Lead Orchestrator
- **File**: `agents/00-lead-orchestrator.md`
- **Model**: opus
- **Responsibilities**:
  - Gate enforcement (build, lint, test)
  - Work coordination between agents
  - Quality checkpoints
  - Final approval

### 01 - SvelteKit Engineer
- **File**: `agents/01-sveltekit-engineer.md`
- **Model**: sonnet
- **Responsibilities**:
  - Route structure (`+page.svelte`, `+layout.svelte`)
  - Load functions (server vs universal)
  - SSR/CSR boundaries
  - Form actions

### 02 - Svelte Component Engineer
- **File**: `agents/02-svelte-component-engineer.md`
- **Model**: sonnet
- **Responsibilities**:
  - Svelte 5 runes ($state, $derived, $effect)
  - Component architecture
  - D3 integration patterns
  - Reactivity optimization

### 03 - Vite Build Engineer
- **File**: `agents/03-vite-build-engineer.md`
- **Model**: sonnet
- **Responsibilities**:
  - vite.config.ts optimization
  - Bundle analysis and splitting
  - vite-plugin-pwa configuration
  - Dev server performance

### 04 - Caching Specialist
- **File**: `agents/04-caching-specialist.md`
- **Model**: sonnet
- **Responsibilities**:
  - Cache-Control headers
  - Stale-while-revalidate patterns
  - CDN caching strategies

### 05 - PWA Engineer
- **File**: `agents/05-pwa-engineer.md`
- **Model**: sonnet
- **Responsibilities**:
  - Service worker lifecycle
  - Offline functionality
  - Install prompts
  - Background sync

### 06 - Local-First Steward
- **File**: `agents/06-local-first-steward.md`
- **Model**: sonnet
- **Responsibilities**:
  - Dexie.js schema and migrations
  - IndexedDB optimization
  - Offline-first data patterns
  - Sync strategies

### 07 - Performance Optimizer
- **File**: `agents/07-performance-optimizer.md`
- **Model**: sonnet
- **Responsibilities**:
  - Core Web Vitals (LCP, INP, CLS)
  - Lighthouse audits
  - Performance profiling
  - Bundle optimization

### 08 - QA Engineer
- **File**: `agents/08-qa-engineer.md`
- **Model**: sonnet
- **Responsibilities**:
  - Test coverage
  - E2E testing (Playwright)
  - Unit testing (Vitest)
  - Regression testing

### 09 - ESLint/TypeScript Steward
- **File**: `agents/09-eslint-typescript-steward.md`
- **Model**: haiku
- **Responsibilities**:
  - ESLint configuration
  - TypeScript strict mode
  - svelte-eslint-parser
  - Type coverage

### 10 - Parallel Coordinator
- **File**: `agents/10-parallel-coordinator.md`
- **Model**: haiku
- **Responsibilities**:
  - Batch file operations
  - Parallel validation
  - Work distribution

### 11 - Semantic HTML Engineer
- **File**: `agents/11-semantic-html-engineer.md`
- **Model**: sonnet
- **Responsibilities**:
  - Native HTML elements
  - ARIA patterns
  - Accessibility compliance

### 12 - Modern CSS Architect
- **File**: `agents/12-modern-css-architect.md`
- **Model**: sonnet
- **Responsibilities**:
  - CSS custom properties
  - Container queries
  - Modern CSS features

### 13 - UI Regression Debugger
- **File**: `agents/13-ui-regression-debugger.md`
- **Model**: haiku
- **Responsibilities**:
  - Visual regression analysis
  - Layout debugging
  - Cross-browser issues

### 14 - Lint Regression Debugger
- **File**: `agents/14-lint-regression-debugger.md`
- **Model**: haiku
- **Responsibilities**:
  - Lint error diagnosis
  - Rule conflict resolution
  - Auto-fix strategies

---

## Communication Flow

```
Lead Orchestrator (00)
    ├── SvelteKit Engineer (01) ─── Svelte Component Engineer (02)
    │                                        │
    │                                        v
    │                               Vite Build Engineer (03)
    │
    ├── PWA Engineer (05) ─────── Local-First Steward (06)
    │         │
    │         v
    │   Caching Specialist (04)
    │
    ├── Performance Optimizer (07)
    │
    ├── QA Engineer (08) ─────── UI Regression Debugger (13)
    │
    ├── ESLint/TypeScript Steward (09) ── Lint Regression Debugger (14)
    │
    ├── Semantic HTML Engineer (11)
    │
    └── Modern CSS Architect (12)

    Parallel Coordinator (10) ── [Assists all agents with batch ops]
```

---

## Gate Checklist

Before any release:
- [ ] **Gate 1**: Build passes (`npm run build`)
- [ ] **Gate 2**: Types pass (`npm run check`)
- [ ] **Gate 3**: Tests pass (`npm test`)
- [ ] **Gate 4**: Lighthouse > 90 all categories
- [ ] **Gate 5**: No a11y violations
- [ ] **Gate 6**: Bundle size within budget
