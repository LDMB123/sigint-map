# Phase 2: Redundancy & Coordination Audit

---

## Model Tier Misalignment

Found 223 agents using incorrect model tier for their lane.

### `dmb-chromium-optimizer` - implement
- **Current**: haiku
- **Expected**: sonnet
- **Path**: /Users/louisherman/.claude/agents/dmb-chromium-optimizer.md
- **Reason**: Lane implement should use sonnet

### `dmb-setlist-pattern-analyzer` - explore-index
- **Current**: sonnet
- **Expected**: haiku
- **Path**: /Users/louisherman/.claude/agents/dmb-setlist-pattern-analyzer.md
- **Reason**: Lane explore-index should use haiku

### `dmb-show-validator` - qa-verify
- **Current**: haiku
- **Expected**: sonnet
- **Path**: /Users/louisherman/.claude/agents/dmb-show-validator.md
- **Reason**: Lane qa-verify should use sonnet

### `dmb-data-validator` - qa-verify
- **Current**: haiku
- **Expected**: sonnet
- **Path**: /Users/louisherman/.claude/agents/dmb-data-validator.md
- **Reason**: Lane qa-verify should use sonnet

### `DMBAlmanac Site Expert` - design-plan
- **Current**: haiku
- **Expected**: opus
- **Path**: /Users/louisherman/.claude/agents/DMBAlmanac Site Expert.md
- **Reason**: Lane design-plan should use opus

### `dmb-offline-first-architect` - design-plan
- **Current**: sonnet
- **Expected**: opus
- **Path**: /Users/louisherman/.claude/agents/dmb-offline-first-architect.md
- **Reason**: Lane design-plan should use opus

### `dmb-dexie-architect` - design-plan
- **Current**: sonnet
- **Expected**: opus
- **Path**: /Users/louisherman/.claude/agents/dmb-dexie-architect.md
- **Reason**: Lane design-plan should use opus

### `dmb-sqlite-specialist` - design-plan
- **Current**: haiku
- **Expected**: opus
- **Path**: /Users/louisherman/.claude/agents/dmb-sqlite-specialist.md
- **Reason**: Lane design-plan should use opus

### `dmb-show-analyzer` - explore-index
- **Current**: sonnet
- **Expected**: haiku
- **Path**: /Users/louisherman/.claude/agents/dmb-show-analyzer.md
- **Reason**: Lane explore-index should use haiku

### `dmb-compound-orchestrator` - design-plan
- **Current**: sonnet
- **Expected**: opus
- **Path**: /Users/louisherman/.claude/agents/dmb-compound-orchestrator.md
- **Reason**: Lane design-plan should use opus

### `dmb-setlist-validator` - qa-verify
- **Current**: haiku
- **Expected**: sonnet
- **Path**: /Users/louisherman/.claude/agents/dmb-setlist-validator.md
- **Reason**: Lane qa-verify should use sonnet

### `AI Product Fusion Agent` - design-plan
- **Current**: sonnet
- **Expected**: opus
- **Path**: /Users/louisherman/.claude/agents/fusion/AI Product Fusion Agent.md
- **Reason**: Lane design-plan should use opus

### `Performance Security Fusion Agent` - review-security
- **Current**: sonnet
- **Expected**: opus
- **Path**: /Users/louisherman/.claude/agents/fusion/Performance Security Fusion Agent.md
- **Reason**: Lane review-security should use opus

### `Runtime Fuser` - review-security
- **Current**: haiku
- **Expected**: opus
- **Path**: /Users/louisherman/.claude/agents/fusion-compiler/Runtime Fuser.md
- **Reason**: Lane review-security should use opus

### `Fusion Orchestrator` - design-plan
- **Current**: sonnet
- **Expected**: opus
- **Path**: /Users/louisherman/.claude/agents/fusion-compiler/Fusion Orchestrator.md
- **Reason**: Lane design-plan should use opus

### `UX Designer` - design-plan
- **Current**: haiku
- **Expected**: opus
- **Path**: /Users/louisherman/.claude/agents/design/UX Designer.md
- **Reason**: Lane design-plan should use opus

### `Design Lead` - design-plan
- **Current**: haiku
- **Expected**: opus
- **Path**: /Users/louisherman/.claude/agents/design/Design Lead.md
- **Reason**: Lane design-plan should use opus

### `UI Designer` - design-plan
- **Current**: haiku
- **Expected**: opus
- **Path**: /Users/louisherman/.claude/agents/design/UI Designer.md
- **Reason**: Lane design-plan should use opus

### `Brand Designer` - design-plan
- **Current**: haiku
- **Expected**: opus
- **Path**: /Users/louisherman/.claude/agents/design/Brand Designer.md
- **Reason**: Lane design-plan should use opus

### `Web Designer` - design-plan
- **Current**: haiku
- **Expected**: opus
- **Path**: /Users/louisherman/.claude/agents/design/Web Designer.md
- **Reason**: Lane design-plan should use opus

... and 203 more misaligned agents

## Description Overlaps (Potential Redundancy)

Found 2 groups of agents with similar descriptions.

### 2 agents with similar description
**Description**: "you are a dmb guest appearance specialist with comprehensive knowledge of every ..."

**Agents**:
- `dmb-guest-specialist` - /Users/louisherman/.claude/agents/dmb-guest-specialist.md
- `guest-appearance-specialist` - /Users/louisherman/.claude/agents/dmb/guest-appearance-specialist.md

### 2 agents with similar description
**Description**: "--- collaboration: receives_from: - commander: "task delegation and coordination..."

**Agents**:
- `recursive-optimizer` - /Users/louisherman/ClaudeCodeProjects/.claude/agents/self-improving/recursive-optimizer.md
- `ARCHITECTURE` - /Users/louisherman/ClaudeCodeProjects/.claude/agents/dmb/ARCHITECTURE.md

## Naming Patterns (Role Groups)

### Pattern: `prefix:dmb` (22 agents)
dmb-chromium-optimizer, dmb-compound-orchestrator, dmb-data-validator, dmb-dexie-architect, dmb-drizzle-unwinder, dmb-guest-appearance-checker, dmb-guest-specialist, dmb-indexeddb-debugger, dmb-liberation-calculator, dmb-migration-coordinator

### Pattern: `specialist` (17 agents)
async-debugging-specialist, console-devtools-specialist, css-anchor-positioning-specialist, css-modern-specialist, css-scroll-animation-specialist, devtools-mcp-specialist, dmb-guest-specialist, dmb-sqlite-specialist, error-boundary-specialist, guest-appearance-specialist

### Pattern: `validator` (15 agents)
autoscaling-config-validator, cdn-cache-header-validator, chaos-scenario-validator, chromium-feature-validator, cli-usability-validator, dmb-data-validator, dmb-setlist-validator, dmb-show-validator, fine-tuning-config-validator, iam-policy-validator

### Pattern: `debugger` (14 agents)
chrome-devtools-debugger, css-debugger, dmb-indexeddb-debugger, dmb-pwa-debugger, dmb-scraper-debugger, esm-cjs-compatibility-debugger, indexeddb-debugger, javascript-debugger, network-debugger, nodejs-debugger

### Pattern: `checker` (12 agents)
dmb-guest-appearance-checker, dmb-song-stats-checker, dmb-venue-consistency-checker, error-message-clarity-checker, eslint-rule-consistency-checker, flag-coverage-checker, metric-schema-checker, package-outdated-checker, react-hydration-checker, service-mesh-config-checker

### Pattern: `analyzer` (10 agents)
context-window-analyzer, database-connection-pool-analyzer, dmb-setlist-pattern-analyzer, dmb-show-analyzer, live-show-analyzer, native-api-analyzer, onboarding-complexity-analyzer, project-context-analyzer, promise-chain-analyzer, setlist-pattern-analyzer

### Pattern: `detector` (9 agents)
auto-parallelization-detector, closure-leak-detector, cloud-cost-anomaly-detector, coverage-regression-detector, flag-cleanup-detector, hallucination-pattern-detector, lockfile-drift-detector, request-similarity-detector, snapshot-drift-detector

### Pattern: `optimizer` (8 agents)
apple-silicon-browser-optimizer, css-apple-silicon-optimizer, dmb-chromium-optimizer, dmb-tour-optimizer, feedback-loop-optimizer, recursive-optimizer, tour-route-optimizer, wave-function-optimizer

### Pattern: `prefix:css` (6 agents)
css-anchor-positioning-specialist, css-apple-silicon-optimizer, css-container-query-architect, css-debugger, css-modern-specialist, css-scroll-animation-specialist

### Pattern: `auditor` (5 agents)
agent-prompt-auditor, debug-experience-auditor, event-listener-auditor, npm-security-auditor, typescript-strictness-auditor

### Pattern: `architect` (3 agents)
css-container-query-architect, dmb-dexie-architect, dmb-offline-first-architect

### Pattern: `orchestrator` (3 agents)
dmb-compound-orchestrator, ecommerce-orchestrator, token-economy-orchestrator

## Lane Distribution Analysis

### UNKNOWN (421 components)
- **Agents**: 172
- **Commands**: 249
- **Model Distribution**: {'haiku': 137, 'sonnet': 30, 'opus': 1, 'unknown': 4}
- **Examples**: dmb-indexeddb-debugger, dmb-liberation-calculator, dmb-migration-coordinator, DMB Brand DNA Expert, DMBAlmanac Scraper

### DESIGN-PLAN (98 components)
- **Agents**: 98
- **Commands**: 0
- **Expected Model**: `opus`
- **Model Distribution**: {'haiku': 41, 'sonnet': 52, 'opus': 3, 'unknown': 2}
- **Examples**: DMBAlmanac Site Expert, dmb-offline-first-architect, dmb-dexie-architect, dmb-sqlite-specialist, dmb-compound-orchestrator

### IMPLEMENT (73 components)
- **Agents**: 73
- **Commands**: 0
- **Expected Model**: `sonnet`
- **Model Distribution**: {'haiku': 55, 'sonnet': 18}
- **Examples**: dmb-chromium-optimizer, Security DevOps Fusion Agent, Data Analytics Fusion Agent, Super Agent Generator, Platform Engineer

### EXPLORE-INDEX (48 components)
- **Agents**: 48
- **Commands**: 0
- **Expected Model**: `haiku`
- **Model Distribution**: {'sonnet': 5, 'haiku': 42, 'opus': 1}
- **Examples**: dmb-setlist-pattern-analyzer, dmb-show-analyzer, UX Researcher, Etsy Specialist, live-show-analyzer

### QA-VERIFY (43 components)
- **Agents**: 43
- **Commands**: 0
- **Expected Model**: `sonnet`
- **Model Distribution**: {'haiku': 42, 'sonnet': 1}
- **Examples**: dmb-show-validator, dmb-data-validator, dmb-setlist-validator, Google AI Studio Guide, Flaky Test Detector

### REVIEW-SECURITY (21 components)
- **Agents**: 21
- **Commands**: 0
- **Expected Model**: `opus`
- **Model Distribution**: {'sonnet': 2, 'haiku': 19}
- **Examples**: Performance Security Fusion Agent, Runtime Fuser, Intent Predictor, PWA Security Specialist, Full Stack Auditor

### RELEASE-OPS (7 components)
- **Agents**: 7
- **Commands**: 0
- **Expected Model**: `sonnet`
- **Model Distribution**: {'haiku': 6, 'unknown': 1}
- **Examples**: FinOps Specialist, GitOps Agent, Finance Ops, Cost Optimization Specialist, HR-People Ops

## Missing Manual-Only Gates

Found 9 side-effectful commands without manual-only gates.

- **release-manager** (Lane: unknown, Risk: high)
  - Path: /Users/louisherman/.claude/commands/release-manager.md
  - Recommendation: Add manual-only: true to frontmatter

- **migrate** (Lane: unknown, Risk: high)
  - Path: /Users/louisherman/.claude/commands/migrate.md
  - Recommendation: Add manual-only: true to frontmatter

- **deployment-strategy** (Lane: unknown, Risk: high)
  - Path: /Users/louisherman/.claude/commands/deployment-strategy.md
  - Recommendation: Add manual-only: true to frontmatter

- **commit** (Lane: unknown, Risk: high)
  - Path: /Users/louisherman/.claude/commands/commit.md
  - Recommendation: Add manual-only: true to frontmatter

- **cloud-deploy** (Lane: unknown, Risk: high)
  - Path: /Users/louisherman/.claude/commands/cloud-deploy.md
  - Recommendation: Add manual-only: true to frontmatter

- **dexie-migrate** (Lane: unknown, Risk: high)
  - Path: /Users/louisherman/.claude/commands/dexie-migrate.md
  - Recommendation: Add manual-only: true to frontmatter

- **k8s-deploy** (Lane: unknown, Risk: high)
  - Path: /Users/louisherman/.claude/commands/k8s-deploy.md
  - Recommendation: Add manual-only: true to frontmatter

- **migrate** (Lane: unknown, Risk: high)
  - Path: /Users/louisherman/ClaudeCodeProjects/.claude/commands/migrate.md
  - Recommendation: Add manual-only: true to frontmatter

- **verify-before-commit** (Lane: unknown, Risk: high)
  - Path: /Users/louisherman/ClaudeCodeProjects/.claude/commands/verify-before-commit.md
  - Recommendation: Add manual-only: true to frontmatter

## Top Consolidation Opportunities

No obvious consolidation opportunities found.

