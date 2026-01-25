# DMB Almanac Svelte - Skills Library

## Overview

Skills are reusable procedures and checklists that agents invoke to complete specific tasks. This library contains 18 skills organized by category.

---

## Skills Index

| Skill | Category | Primary Agent |
|-------|----------|--------------|
| bundle-analyzer | Build | Vite Build Engineer |
| cache-debug | Performance | Caching Specialist |
| dexie-migration-safety | Database | Local-First Steward |
| dexie-schema-audit | Database | Local-First Steward |
| offline-e2e-test-harness | Testing | QA Engineer |
| performance-trace-capture | Performance | Performance Optimizer |
| service-worker-integration | PWA | PWA Engineer |
| sw-update-ux | PWA | PWA Engineer |
| offline-navigation-strategy | PWA | PWA Engineer |
| manifest-route-verification | PWA | PWA Engineer |
| a11y-keyboard-test | Accessibility | Semantic HTML Engineer |
| eslint-baseline-audit | Linting | ESLint/TypeScript Steward |
| rollback-plan | Operations | Lead Orchestrator |
| visual-regression-check | Testing | UI Regression Debugger |
| implement-dialog-migration | HTML | Semantic HTML Engineer |
| implement-details-migration | HTML | Semantic HTML Engineer |
| inventory-unnecessary-js | Optimization | Performance Optimizer |
| map-js-to-native | Optimization | Semantic HTML Engineer |

---

## Skills by Category

### Build & Bundle

#### bundle-analyzer
Analyze bundle sizes and identify optimization opportunities.
```bash
npm run build:analyze
```
- Generates visualization of chunk sizes
- Identifies large dependencies
- Suggests code splitting strategies

---

### Database (Dexie/IndexedDB)

#### dexie-schema-audit
Validate Dexie schema definition against TypeScript types.
- Check index definitions
- Verify migration paths
- Validate compound indexes

#### dexie-migration-safety
Ensure safe schema migrations.
- Version increment checks
- Data preservation validation
- Rollback capability verification

---

### PWA & Offline

#### service-worker-integration
Configure and test service worker registration.
- Workbox configuration
- Cache strategies
- Update handling

#### sw-update-ux
Implement user-friendly service worker updates.
- Update notifications
- Skip waiting patterns
- Graceful refresh

#### offline-navigation-strategy
Define offline navigation patterns.
- Cached route fallbacks
- Network-first vs cache-first decisions
- Offline indicators

#### manifest-route-verification
Validate web app manifest configuration.
- Icon sizes and formats
- Start URL accessibility
- Display mode settings

---

### Performance

#### cache-debug
Debug caching issues.
- Cache inspection
- Header analysis
- Stale data diagnosis

#### performance-trace-capture
Capture and analyze performance traces.
- DevTools Performance panel
- Core Web Vitals measurement
- Long task identification

#### inventory-unnecessary-js
Find JavaScript that can be replaced with native features.
- Library usage audit
- Native API alternatives
- Bundle impact assessment

---

### Testing

#### offline-e2e-test-harness
Set up E2E tests for offline functionality.
- Network condition simulation
- Service worker mocking
- Offline assertion helpers

#### visual-regression-check
Capture and compare visual snapshots.
- Baseline management
- Diff generation
- Threshold configuration

---

### Accessibility

#### a11y-keyboard-test
Test keyboard navigation and focus management.
- Tab order verification
- Focus visible states
- Keyboard trap detection

#### implement-dialog-migration
Migrate custom modals to native `<dialog>`.
- Dialog element patterns
- Focus management
- Backdrop styling

#### implement-details-migration
Migrate accordions to native `<details>`.
- Disclosure patterns
- Animation considerations
- Accessibility benefits

#### map-js-to-native
Map JS patterns to native HTML/CSS.
- Identify replaceable patterns
- Migration checklist
- Browser support verification

---

### Linting & Code Quality

#### eslint-baseline-audit
Establish ESLint baseline and track improvements.
- Current violation count
- Priority categorization
- Incremental fix strategy

---

### Operations

#### rollback-plan
Create rollback procedures for changes.
- Git revert commands
- Database rollback
- Feature flag toggles
- Communication templates

---

## Skill Invocation

Agents invoke skills by name in their output:

```markdown
### Invoking Skill: dexie-schema-audit

[Skill execution details...]

### Skill Result
- Schema valid: Yes
- Migrations safe: Yes
- Issues found: 0
```

---

## Adding New Skills

To add a skill:
1. Create `skills/<skill-name>.md`
2. Define purpose, steps, and validation
3. Add to this index
4. Associate with primary agent

Skill template:
```markdown
# Skill: <name>

## Purpose
[What this skill accomplishes]

## Prerequisites
- [Required tools]
- [Required access]

## Steps
1. [Step 1]
2. [Step 2]

## Validation
- [ ] [Success criterion 1]
- [ ] [Success criterion 2]

## Rollback
[How to undo if needed]
```
