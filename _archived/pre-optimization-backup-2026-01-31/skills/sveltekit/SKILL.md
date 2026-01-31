---
name: sveltekit
description: >
  SvelteKit development patterns including accessibility testing,
  performance optimization, PWA features, database management,
  and component migration for modern web applications.
disable-model-invocation: true
user-invocable: true
allowed-tools:
  - Read
  - Edit
  - Grep
  - Glob
  - Bash
---

# SvelteKit Development Skill

Comprehensive SvelteKit development toolkit covering accessibility,
performance, PWA integration, database patterns, and testing.

## Capabilities

- **Accessibility Testing**: Keyboard navigation, focus management, ARIA patterns, screen reader testing
- **Performance Optimization**: Bundle analysis, cache debugging, unnecessary JS removal, trace capture
- **PWA Features**: Service worker integration, offline navigation, manifest verification, update UX
- **Database Management**: Dexie.js schema audit, migration safety, IndexedDB patterns
- **Component Migration**: Native HTML element migration (details, dialog), JS-to-native mapping
- **Quality Assurance**: ESLint baseline audit, visual regression checks, E2E test harness
- **Deployment**: Rollback planning, production safety checks

## When to Use

- Building or maintaining SvelteKit applications
- Implementing accessibility (WCAG 2.1 AA) compliance
- Optimizing PWA offline capabilities
- Managing Dexie.js/IndexedDB data layer
- Migrating from JS widgets to native HTML elements
- Performance profiling and optimization

## Procedure

### Accessibility Keyboard Testing
1. Test focus visibility on all interactive elements
2. Verify logical tab order (left-to-right, top-to-bottom)
3. Test dialog/modal focus trap (Enter to open, Tab cycles, Escape closes)
4. Test popover/dropdown behavior
5. Verify menu keyboard navigation (Arrow keys, Home, End)
6. Test accordion/details toggle behavior
7. Run screen reader testing (VoiceOver on macOS)
8. Execute Playwright automated keyboard tests

### Bundle Analysis
1. Run `npx vite-bundle-visualizer` to generate treemap
2. Identify largest chunks and unused imports
3. Check for duplicate dependencies
4. Verify code splitting at route boundaries
5. Measure before/after sizes

### Service Worker Integration
1. Verify SW registration in `src/service-worker.js`
2. Test offline fallback pages
3. Validate cache strategies (stale-while-revalidate, cache-first)
4. Test SW update notification UX
5. Verify precache manifest

### Dexie Schema Audit
1. Review all `db.version()` declarations
2. Verify migration functions for each version bump
3. Test upgrade path from oldest to newest version
4. Check for breaking index changes
5. Validate data integrity after migration

## Browser Targets
- Chrome/Chromium 143+
- Safari 17.2+
- Firefox (latest)
- Edge (latest)

## WCAG Compliance Target
- Level AA minimum
- Focus Visible (2.4.7)
- Keyboard (2.1.1)
- No Keyboard Trap (2.1.2)
- Focus Order (2.4.3)

## Supporting Reference Files

See the following files in this directory for detailed reference:

- `a11y-testing-reference.md` - Detailed keyboard and screen reader test procedures
- `pwa-patterns-reference.md` - Service worker, offline, and manifest patterns
- `performance-reference.md` - Bundle analysis, caching, and trace capture
- `database-reference.md` - Dexie.js schema audit and migration patterns
- `migration-reference.md` - Native HTML element migration checklists
