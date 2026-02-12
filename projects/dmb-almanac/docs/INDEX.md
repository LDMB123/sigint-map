# DMB Almanac Documentation Index

## Quick Start
- [DMB_START_HERE.md](./guides/DMB_START_HERE.md) - Project entry point
- [DEPLOYMENT_REFERENCE.md](./guides/DEPLOYMENT_REFERENCE.md) - Build, deploy, verify

## Directories

| Directory | Content |
|-----------|---------|
| `guides/` | Deployment, testing, a11y, CSS, rollback, UI/UX, ML |
| `reports/` | Roadmap, performance, security, modernization |
| `audits/` | Domain references (chromium, database, security) |
| `migration/` | Milestones and migration notes (Rust-first) |
| `gpu/` | WebGPU compute notes (Rust-first) |
| `wasm/` | Rust/WASM reference |
| `scraping/` | Rust scraping pipeline reference |
| `quick-references/` | Consolidated cheat sheet |
| `api/` | OpenAPI contract |
| `references/` | Compressed references (database, modules, data bundle) |

## Key Reports
- `reports/STRATEGIC_ROADMAP_2026.md` - Project direction
- `reports/PERFORMANCE_COMPARISON.md` - Performance benchmarks
- `reports/ENCRYPTION_SECURITY_POLICY.md` - Security policy
- `reports/DMB_DEPENDENCY_ELIMINATION_MASTER_PLAN.md` - Dep elimination
- `reports/DEVILS_ADVOCATE_STACK_DECISIONS_2026-02-04.md` - Risk review and decision stress test
- `reports/REVISED_RUST_WASM_PLAN_2026-02-04.md` - Updated rebuild plan

## Guides
- `guides/DEPLOYMENT_REFERENCE.md` - Build, deploy, verify (merged from 3 docs)
- `guides/DMB_START_HERE.md` - Project onboarding
- `guides/ACCESSIBILITY_GUIDE.md` - WCAG compliance, screen readers
- `guides/CSS_MODERNIZATION_QUICK_REFERENCE.md` - Modern CSS patterns
- `guides/CSS_MODERNIZATION_DEEP_DIVE.md` - Chromium 143+ CSS patterns and mapping
- `guides/ROLLBACK_PROCEDURE.md` - Deployment rollback
- `guides/TESTING_CHECKLIST.md` - Test procedures
- `guides/DESIGN_SYSTEM_V2.md` - Design system v2 spec
- `guides/UI_UX_MIGRATION_CHECKLIST.md` - Route-by-route migration
- `guides/UI_UX_ROUTE_TEMPLATES.md` - Route template map
- `guides/UI_UX_TOKEN_MAP.md` - Token inventory and mapping
- `guides/UI_UX_RISK_REGISTER.md` - UI/UX risk register
- `guides/FIRST_PRINCIPLES_PRODUCT_DECONSTRUCTION.md` - Product fundamentals and assumptions
- `guides/UX_RESEARCH_PROTOCOL_2026.md` - Research plan and script
- `guides/UX_DESIGN_BLUEPRINT_2026.md` - IA and interaction blueprint
- `guides/BRAND_SYSTEM_V2.md` - Brand system spec
- `guides/API_ARCHITECTURE_V1.md` - Task-driven API surface
- `guides/ML_PIPELINE_PLAYBOOK.md` - ML pipeline plan and deployment stages
- `guides/CACHE_WARMING_STRATEGY.md` - Predictive cache + data warming strategy
- `CODEX_CACHE_WARMING_STRATEGY.md` - Codex context cache strategy + exclusions

## Audits (1 reference per domain)
- `audits/chromium/CHROMIUM_AUDIT_REFERENCE.md`
- `audits/database/DATABASE_AUDIT_REFERENCE.md`
- `audits/security/SECURITY_AUDIT_REFERENCE.md`

## Full Audits (Large)
- `reports/_full_audits/` - exhaustive audits (prefer `reports/*_SUMMARY.md`)

## Migration
- `migration/FEATURE_FREEZE.md`
- `migration/MIGRATION_LOG.md`
- `migration/BASELINES.md`
- `migration/MIGRATION_MILESTONES.md`
- `migration/JS_ELIMINATION_MAP.md`
- `migration/NATIVE_API_REPLACEMENT.md`
- `migration/COMPOSITOR_BUDGET.md`
- `migration/DATA_BUNDLE.md`
- `migration/RAG_PIPELINE.md`

## API
- `api/OPENAPI_V1.yaml` - OpenAPI contract for public endpoints
