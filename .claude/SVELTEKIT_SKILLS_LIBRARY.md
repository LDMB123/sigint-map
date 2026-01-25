# SvelteKit Skills Library

> Master index of all 18 SvelteKit development skills for Claude Code

---

## Quick Reference

| Category | Count | Primary Agent |
|----------|-------|---------------|
| [PWA](#pwa) | 4 | PWA Engineer |
| [Database](#database) | 2 | Local-First Engineer |
| [Performance](#performance) | 4 | Performance Optimizer |
| [Testing](#testing) | 2 | QA Engineer |
| [Accessibility](#accessibility) | 4 | Semantic HTML Engineer |
| [Linting](#linting) | 1 | TypeScript/ESLint Steward |
| [Routing](#routing) | 1 | SvelteKit Engineer |

**Total: 18 Skills**

---

## PWA

Progressive Web App development skills for offline-first SvelteKit applications.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `service-worker-integration` | [service-worker-integration.md](skills/sveltekit/pwa/service-worker-integration.md) | Workbox config, SW registration, caching | Setting up Service Workers |
| `sw-update-ux` | [sw-update-ux.md](skills/sveltekit/pwa/sw-update-ux.md) | Update notifications, skip waiting | Implementing SW update UX |
| `offline-navigation-strategy` | [offline-navigation-strategy.md](skills/sveltekit/pwa/offline-navigation-strategy.md) | Fallbacks, cache-first patterns | Planning offline navigation |
| `manifest-route-verification` | [manifest-route-verification.md](skills/sveltekit/pwa/manifest-route-verification.md) | Icon validation, start URL, display mode | Validating PWA manifest |

---

## Database

Dexie.js and IndexedDB skills for local-first data management.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `dexie-schema-audit` | [dexie-schema-audit.md](skills/sveltekit/database/dexie-schema-audit.md) | Index validation, TypeScript alignment | Auditing Dexie schemas |
| `dexie-migration-safety` | [dexie-migration-safety.md](skills/sveltekit/database/dexie-migration-safety.md) | Safe migrations, version increments | Planning database migrations |

---

## Performance

Performance optimization and profiling skills.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `bundle-analyzer` | [bundle-analyzer.md](skills/sveltekit/performance/bundle-analyzer.md) | Vite bundle analysis, chunk optimization | Analyzing bundle sizes |
| `cache-debug` | [cache-debug.md](skills/sveltekit/performance/cache-debug.md) | Cache inspection, stale data diagnosis | Debugging caching issues |
| `performance-trace-capture` | [performance-trace-capture.md](skills/sveltekit/performance/performance-trace-capture.md) | DevTools profiling, Core Web Vitals | Profiling performance |
| `inventory-unnecessary-js` | [inventory-unnecessary-js.md](skills/sveltekit/performance/inventory-unnecessary-js.md) | JS audit, native alternatives | Reducing JavaScript |

---

## Testing

Testing and quality assurance skills.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `offline-e2e-test-harness` | [offline-e2e-test-harness.md](skills/sveltekit/testing/offline-e2e-test-harness.md) | Network simulation, SW mocking | Testing offline functionality |
| `visual-regression-check` | [visual-regression-check.md](skills/sveltekit/testing/visual-regression-check.md) | Snapshot baselines, diff generation | Visual regression testing |

---

## Accessibility

Accessibility and semantic HTML skills.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `a11y-keyboard-test` | [a11y-keyboard-test.md](skills/sveltekit/accessibility/a11y-keyboard-test.md) | Tab order, focus visible, keyboard traps | Testing keyboard navigation |
| `implement-dialog-migration` | [implement-dialog-migration.md](skills/sveltekit/accessibility/implement-dialog-migration.md) | Native dialog patterns, focus management | Migrating to native dialog |
| `implement-details-migration` | [implement-details-migration.md](skills/sveltekit/accessibility/implement-details-migration.md) | Native details/summary, disclosures | Migrating accordions |
| `map-js-to-native` | [map-js-to-native.md](skills/sveltekit/accessibility/map-js-to-native.md) | JS to native HTML/CSS mapping | Replacing JS with native |

---

## Linting

Code quality and linting skills.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `eslint-baseline-audit` | [eslint-baseline-audit.md](skills/sveltekit/linting/eslint-baseline-audit.md) | Violation count, fix strategy | Auditing ESLint issues |

---

## Routing

Routing and operations skills.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `rollback-plan` | [rollback-plan.md](skills/sveltekit/routing/rollback-plan.md) | Git revert, database rollback, feature flags | Planning rollbacks |

---

## Usage

### Invoking Skills

```
Skill(service-worker-integration)
Skill(dexie-schema-audit)
Skill(bundle-analyzer)
```

### Skill Categories by Common Task

| Task | Recommended Skills |
|------|-------------------|
| Setting up a PWA | `service-worker-integration`, `manifest-route-verification` |
| Adding offline support | `offline-navigation-strategy`, `offline-e2e-test-harness` |
| Implementing local-first | `dexie-schema-audit`, `dexie-migration-safety` |
| Optimizing performance | `bundle-analyzer`, `performance-trace-capture` |
| Improving accessibility | `a11y-keyboard-test`, `map-js-to-native` |
| Reducing bundle size | `inventory-unnecessary-js`, `bundle-analyzer` |
| Planning releases | `rollback-plan`, `eslint-baseline-audit` |

---

## Skill-Agent Mapping

| Agent | Skills |
|-------|--------|
| PWA Engineer | `service-worker-integration`, `sw-update-ux`, `offline-navigation-strategy`, `manifest-route-verification` |
| Local-First Engineer | `dexie-schema-audit`, `dexie-migration-safety` |
| Performance Optimizer | `bundle-analyzer`, `cache-debug`, `performance-trace-capture`, `inventory-unnecessary-js` |
| QA Engineer | `offline-e2e-test-harness`, `visual-regression-check` |
| Semantic HTML Engineer | `a11y-keyboard-test`, `implement-dialog-migration`, `implement-details-migration`, `map-js-to-native` |
| TypeScript/ESLint Steward | `eslint-baseline-audit` |
| SvelteKit Orchestrator | `rollback-plan` |

---

## Cross-References

### Integration with WASM Skills

| SvelteKit Skill | Related WASM Skill |
|----------------|-------------------|
| `bundle-analyzer` | `wasm-size-optimization` |
| `performance-trace-capture` | `wasm-performance-tuning` |

### Integration with Existing Global Skills

| SvelteKit Skill | Related Global Skill |
|----------------|---------------------|
| `service-worker-integration` | Workbox/PWA skills |
| `a11y-keyboard-test` | A11y audit skills |

---

## Version

**Library Version**: 1.0.0
**Last Updated**: 2025-01-21
**Total Skills**: 18
