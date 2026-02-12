# Skill Cross-References: Compressed Relationship Map

**Original:** 64,449 bytes (~16K tokens)
**Compressed:** ~6K tokens
**Compression Ratio:** 62.5% reduction
**Date:** 2026-02-02
**Strategy:** Reference-based with relationship preservation

---

## Ecosystem Structure (13 Total)

```
Web Platform (120 skills)
├─ UI/UX (32) → Performance, PWA, CSS, Accessibility
├─ PWA (22) → UI/UX, Performance, Web APIs, Accessibility
├─ Web APIs (16) → PWA, Security, API Integration, Performance
├─ Chromium 143+ (15) → CSS, Performance, UI/UX, HTML
├─ Chromium (8) → Chromium 143+, UI/UX, CSS, Performance
├─ CSS (7) → Chromium 143+, UI/UX, Performance, PWA
├─ HTML (9) → Accessibility, UI/UX, Chromium, Performance
├─ Performance (5) → All web ecosystems
├─ Accessibility (7) → UI/UX, HTML, CSS, PWA
├─ Scraping (3) → MCP, Performance, DMB
└─ Visualization (1) → DMB, Performance, UI/UX

Backend & Infrastructure (58 skills)
├─ MCP (12) → API Integration, Security, Web APIs, Scraping
├─ API Integration (6) → MCP, Security, Web APIs, Performance
└─ Security (1) → All ecosystems (8+)

Languages & Frameworks (62 skills)
├─ Rust (40) → WebAssembly, Performance, Security
├─ WebAssembly (22) → Rust, Performance, SvelteKit
└─ SvelteKit (17) → PWA, Performance, Accessibility, Web APIs

Domain-Specific (8)
└─ DMB (8) → Visualization, Scraping, Performance
```

---

## Relationship Map: Skill Calling Patterns

### Performance Hub (5 skills - Used by 15+ others)
- **devtools-profiling**: UI/UX (motion) → Performance, PWA, SvelteKit, CSS, Rust
- **lcp-debugging**: UI/UX (loading), PWA, HTML, CSS, Web APIs
- **inp-debugging**: UI/UX (micro), CSS, HTML, Performance
- **long-task-detection**: UI/UX, PWA, Web APIs, MCP, CSS
- **memory-leak-hunt**: PWA, SvelteKit, Web APIs, Visualization, Rust

### Security Hub (1 skill - Used by 8+ ecosystems)
- **web-security-audit**: MCP, API Integration, Web APIs, PWA, Performance

### UI/UX Hub (32 skills - Core to web platform)
Key relationships:
- **focus-management** ← Accessibility, HTML, PWA (8+ links)
- **motion-excellence** ← CSS, Performance, Chromium (6+ links)
- **color-mastery** ← Accessibility, CSS, UI/UX
- **interaction-feedback** ← PWA, Performance, Web APIs
- **responsive-excellence** ← CSS, HTML, Accessibility

### API Integration Hub (6 skills)
- **auth-providers** → MCP-security, Web APIs (credential), Stripe
- **webhook-patterns** → MCP-api-gateway, API Integration
- **stripe-integration** → Web APIs (payment-request)
- **openai-api-integration** ↔ anthropic-api-integration
- **google-apis-integration** → auth-providers

### MCP Hub (12 skills)
- **mcp-server-setup** → All other MCP skills
- **mcp-client-integration** ← mcp-server-setup
- **mcp-security** (mandatory for all)
- **mcp-browser** → Scraping, Performance
- **mcp-api-gateway** → API Integration (webhook, OAuth)
- **mcp-database** → DMB skills
- **mcp-memory** → SvelteKit, Web APIs (storage)

---

## Direct Cross-Ecosystem Links (89+ total)

### UI/UX ↔ Performance (7)
- micro-interactions ↔ long-task-detection
- motion-excellence ↔ devtools-profiling
- loading-experience ↔ lcp-debugging
- interaction-feedback ↔ inp-debugging
- focus-management ↔ keyboard-nav-audit
- color-mastery ↔ color-contrast-audit
- input-excellence ↔ native-form-validation

### PWA ↔ Performance (5)
- offline-queue-pattern ↔ long-task-detection
- sw-memory-leak-detection ↔ memory-leak-hunt
- pwa-performance-m-series ↔ devtools-profiling
- pwa-badging-notifications ↔ interaction-feedback
- sw-race-condition-fix ↔ offline-queue-pattern

### Web APIs ↔ PWA (5)
- file-system-access ↔ offline-queue-pattern
- storage-api ↔ pwa-offline-resilience
- broadcast-channel ↔ sw-debugging-checklist
- web-share ↔ pwa-share-target
- credential-management ↔ pwa-desktop-integration

### CSS ↔ Chromium 143+ (6)
- css-nesting ↔ css-if
- logical-properties ↔ css-text-wrap-pretty
- scroll-driven-animations ↔ scroll-state-container-queries
- js-to-css-audit ↔ css-light-dark
- (All CSS form foundation for Cr143+)

### HTML ↔ Accessibility (6)
- semantic-structure ↔ screen-reader-testing
- native-dialog ↔ keyboard-nav-audit
- fieldset-legend ↔ focus-management
- input-types ↔ input-excellence
- native-form-validation ↔ color-contrast-audit
- lazy-loading ↔ lcp-debugging

### Rust ↔ WebAssembly (3)
- rust-wasm-scaffold ↔ wasm-bindgen-guide
- async-patterns ↔ wasm-performance-tuning
- rust-benchmarking ↔ wasm-size-optimization

### Chromium 143+ ↔ Chromium (Build relationships)
- view-transition-types extends view-transitions
- interest-invokers builds on popover-api
- css-if related to container-queries

### SvelteKit ↔ PWA (3)
- service-worker-integration ↔ sw-debugging-checklist
- offline-navigation-strategy ↔ offline-queue-pattern
- manifest-route-verification ↔ pwa-desktop-integration

### SvelteKit ↔ Performance (3)
- bundle-analyzer ↔ lcp-debugging
- cache-debug ↔ memory-leak-hunt
- performance-trace-capture ↔ devtools-profiling

### DMB ↔ Visualization (3)
- setlist-analysis ↔ d3-optimization
- rarity-scoring ↔ d3-optimization
- tour-analysis ↔ d3-optimization

### MCP ↔ API Integration (3)
- mcp-api-gateway ↔ webhook-patterns
- mcp-security ↔ auth-providers
- mcp-custom-tools ↔ stripe-integration

### MCP ↔ Scraping (2)
- mcp-browser ↔ playwright-scraper-architecture
- mcp-browser ↔ scraper-debugging

---

## Dependency Chains (Multi-step paths)

### E-Commerce Chain
```
HTML: semantic-structure
  → HTML: native-form-validation
  → UI/UX: input-excellence
  → Accessibility: keyboard-nav-audit
  → API Integration: stripe-integration
  → Security: web-security-audit
  → Performance: devtools-profiling
```

### PWA Excellence Chain
```
PWA: sw-debugging-checklist
  → PWA: offline-queue-pattern
  → PWA: pwa-desktop-integration
  → Performance: devtools-profiling + lcp-debugging
  → CSS: apple-silicon-optimization
```

### Accessibility Chain
```
HTML: semantic-structure
  → Accessibility: wcag-aa-audit
  → Accessibility: color-contrast-audit
  → Accessibility: keyboard-nav-audit
  → Accessibility: focus-management
  → UI/UX: focus-management
```

### AI Integration Chain (MCP)
```
MCP: mcp-server-setup
  → MCP: mcp-client-integration
  → MCP: mcp-security
  → MCP: mcp-custom-tools + mcp-api-gateway
  → API Integration: anthropic-api-integration
  → Performance: devtools-profiling
```

### High-Performance Web Chain
```
HTML: semantic-structure
  → CSS: js-to-css-audit
  → UI/UX: responsive-excellence
  → Performance: devtools-profiling
  → Performance: lcp-debugging
  → Performance: inp-debugging
  → Performance: long-task-detection
```

---

## Value Multipliers (Skill Combinations)

| Combo | Skills | Synergy | Multiplier |
|-------|--------|---------|------------|
| Performance Trinity | devtools-profiling + lcp-debugging + inp-debugging | Diagnose → fix perceived → fix interaction | 3x |
| Accessibility Quartet | wcag-aa-audit + keyboard-nav-audit + focus-management + screen-reader-testing | Audit → keyboard → style → SR test | 2.5x |
| PWA Power Trio | sw-debugging + offline-queue + pwa-desktop | Diagnose → architecture → UX | 2.5x |
| API Mastery Stack | auth-providers + webhook-patterns + mcp-api-gateway | Auth → events → orchestration | 2x |
| CSS Modernization | js-to-css-audit + scroll-driven-animations | Eliminate JS + modern animations | 2x |

---

## High-Impact Skills (Connection Count)

| Skill | Connects To | Count |
|-------|------------|-------|
| web-security-audit | All ecosystems | 8+ |
| devtools-profiling | 10+ ecosystems | 15+ |
| focus-management | UI/UX, A11y, HTML, PWA | 8+ |
| lcp-debugging | PWA, CSS, HTML, Performance, UI/UX | 7+ |
| motion-excellence | UI/UX, CSS, Performance, Chromium | 6+ |
| mcp-security | All MCP + API Integration | 6+ |
| offline-queue-pattern | PWA, Performance, Web APIs | 5+ |

---

## Effort vs Effort-to-Learn

**Quick Wins** (< 1h): color-contrast-audit, keyboard-nav-audit, js-to-css-audit, web-share

**Half-Day** (1-3h): focus-management, sw-debugging-checklist, input-excellence, native-dialog

**Full-Day** (3-8h): offline-queue-pattern, pwa-desktop-integration, lcp-debugging, stripe-integration

**Multi-Day** (8+h): mcp-server-setup + mcp-security, comprehensive accessibility, performance audit

---

## Quick Reference: By Use Case

**Building E-Commerce?** → HTML → Accessibility → API Integration (Stripe) → Security → Performance

**Building PWA?** → PWA (sw-debugging) → Performance → CSS (M-series) → Accessibility

**Building with MCP?** → MCP (setup → security) → API Integration → Performance

**Building Accessible Site?** → HTML (semantic) → Accessibility (WCAG) → UI/UX (focus)

**Building High-Performance App?** → CSS (js-to-css) → UI/UX → Performance (LCP + INP)

---

## Full Skill Inventory (226 Total)

- **UI/UX (32)**: responsive-excellence, typography-craft, color-mastery, motion-excellence, micro-interactions, spatial-harmony, pixel-perfection, focus-management, touch-precision, interaction-feedback, error-elegance, loading-experience, native-feel, simplicity-audit, button-craft, card-architecture, input-excellence, icon-perfection, image-presentation, divider-spacing, + font and manifest skills

- **PWA (22)**: sw-debugging-checklist, sw-race-condition-fix, sw-memory-leak-detection, offline-queue-pattern, pwa-performance-m-series, pwa-offline-resilience, pwa-badging-notifications, pwa-shortcuts, pwa-protocol-handlers, pwa-share-target, pwa-file-handlers, pwa-desktop-integration, window-controls-overlay, + reference docs

- **MCP (12)**: mcp-server-setup, mcp-client-integration, Desktop Commander, mcp-github, mcp-database, mcp-browser, mcp-memory, mcp-api-gateway, mcp-custom-tools, mcp-security, + reference

- **Web APIs (16)**: screen-wake-lock, barcode-detection, eyedropper, web-hid, web-serial, web-usb, web-bluetooth, credential-management, payment-request, web-share, compression-streams, file-system-access, storage-api, broadcast-channel, web-locks, + README

- **Chromium 143+ (15)**: css-if, css-light-dark, css-text-wrap-pretty, css-field-sizing, css-interpolate-size, css-reading-flow, long-animation-frames, document-pip, view-transition-types, scroll-state-container-queries, interest-invokers, invoker-commands, + manifest

- **Chromium (8)**: anchor-positioning, speculation-rules, container-queries, popover-api, view-transitions, scheduler-yield, navigation-api, + README

- **HTML (9)**: native-dialog, input-types, media-elements, fieldset-legend, native-form-validation, output-meter-progress, semantic-structure, template-slot, details-summary, lazy-loading, inert-attribute

- **API Integration (6)**: auth-providers, webhook-patterns, stripe-integration, openai-api-integration, anthropic-api-integration, google-apis-integration

- **Performance (5)**: devtools-profiling, inp-debugging, lcp-debugging, memory-leak-hunt, long-task-detection

- **Accessibility (7)**: wcag-aa-audit, focus-management, screen-reader-testing, color-contrast-audit, keyboard-nav-audit, + manifest

- **CSS (7)**: js-to-css-audit, logical-properties, scroll-driven-animations, apple-silicon-optimization, css-nesting, + manifest

- **Scraping (3)**: playwright-scraper-architecture, scraper-debugging, + README

- **DMB (8)**: setlist-analysis, rarity-scoring, guest-appearance-tracking, tour-analysis, song-statistics, venue-intelligence, show-rating, liberation-predictor

- **Rust (40)**: Across debugging, features, scaffolding, migration, performance, testing, ecosystem categories

- **WebAssembly (22)**: Across foundations, Rust-WASM, JS interop, optimization, frameworks, tooling

- **SvelteKit (17)**: Across PWA, accessibility, performance, database, routing, linting, testing

- **Security (1)**: web-security-audit

- **Visualization (1)**: d3-optimization

- **Shared (1)**: git-rollback-plan

**Total: 226 Skills** | **Updated:** January 2026 | **Maintained by:** Technical Writing Team

---

## Access Original

Full documentation with detailed descriptions, learning paths, prerequisite chains, and decision trees: `.claude/docs/reference/SKILL_CROSS_REFERENCES.md`
