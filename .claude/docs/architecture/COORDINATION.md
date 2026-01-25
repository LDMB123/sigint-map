# Claude Code Toolkit Coordination Standards

**Version**: 1.0
**Last Updated**: 2026-01-25
**Scope**: All agents, skills, and their interactions

---

## Purpose

This document defines HOW our 1,000-component Claude Code toolkit coordinates:
- **Routing policy**: Who does what, when
- **Handoff contracts**: Standard formats for delegation
- **Skill behavior**: How skills interact with agents
- **Model policy**: Which tier for which work (see MODEL_POLICY.md)

**Goal**: Predictable, efficient coordination with minimal overhead.

---

## I. Capability Lanes (Routing Policy)

We organize work into **6 capability lanes**. Each lane has:
- **Primary agents**: Responsible for that type of work
- **Primary skills**: On-demand tools for that lane
- **Out of scope**: What this lane explicitly does NOT handle

### Lane 1: Explore & Index (Read-Only Intelligence)

**Purpose**: Understand codebases, gather context, map dependencies

**Primary Agents**:
- `Explore` (built-in general-purpose explorer)
- `architecture-analyzer`
- `dependency-analyzer`
- `coverage-analyzer`
- `complexity-analyzer`

**Primary Skills**:
- `/dependency-analysis`
- `/code-complexity-analysis`

**Model Tier**: `haiku` (fast, cheap scanning)

**Out of Scope**:
- ❌ No code changes
- ❌ No file writes
- ❌ No architecture decisions (that's Lane 2)

**When to Use**: User asks "where", "what", "how does X work", "find", "analyze"

---

### Lane 2: Design & Plan (Architecture & Strategy)

**Purpose**: Design solutions, evaluate tradeoffs, create implementation plans

**Primary Agents**:
- `Plan` (built-in planning agent)
- `system-architect`
- `rust-project-architect`
- `sveltekit-orchestrator`
- `wasm-lead-orchestrator`
- Domain-specific architects (PWA, MCP, Apple Silicon, etc.)

**Primary Skills**:
- Domain planning skills (project-specific)

**Model Tier**: `opus` or `opusplan` (deep reasoning)

**Out of Scope**:
- ❌ No implementation (that's Lane 3)
- ❌ No testing (that's Lane 5)

**When to Use**:
- User asks "should I", "which approach", "design", "plan"
- Task requires choosing between multiple approaches
- Architectural decisions needed before coding

**Deliverable**: Plan document with phases, tradeoffs, proposed actions

---

### Lane 3: Implement (Code Changes)

**Purpose**: Write code, refactor, fix bugs, implement features

**Primary Agents**:
- Domain engineers: `sveltekit-engineer`, `rust-semantics-engineer`, `pwa-engineer`
- Specialist engineers: `svelte-component-engineer`, `vite-sveltekit-engineer`
- Transformation agents: `code-refactorer`, `migration-generator`

**Primary Skills**:
- Technology-specific skills (rust/*, wasm/*, sveltekit/*, etc.)
- Implementation patterns

**Model Tier**: `sonnet` (balanced quality/cost for code)

**Out of Scope**:
- ❌ No deep architecture (Lane 2 does that first)
- ❌ No quality assurance (Lane 4 does that)
- ❌ No testing (Lane 5 does that)

**When to Use**:
- User says "implement", "add", "refactor", "fix bug"
- Plan has been approved

**Deliverable**: Code changes with verification commands

---

### Lane 4: Review & Security (Quality Assurance)

**Purpose**: Review code, audit security, check best practices

**Primary Agents**:
- `code-reviewer`
- `security-scanner`
- `rust-safety-auditor`
- `compliance-checker`
- `threat-modeler`

**Primary Skills**:
- `/security-audit`
- `/auth-audit`
- Domain-specific audit skills

**Model Tier**: `opus` (thoroughness matters)

**Out of Scope**:
- ❌ No implementation (review only)
- ❌ Can suggest fixes, but Lane 3 implements them

**When to Use**:
- After implementation, before commit
- User asks for "review", "audit", "check security"
- Pre-release validation

**Deliverable**: Review findings with severity levels, fix recommendations

---

### Lane 5: QA & Verify (Testing & Validation)

**Purpose**: Run tests, validate behavior, reproduce bugs

**Primary Agents**:
- `unit-test-generator`
- `integration-test-generator`
- `e2e-test-generator`
- `test-coverage-analyzer`
- `sveltekit-qa-engineer`, `rust-qa-engineer`, `wasm-testing-specialist`

**Primary Skills**:
- `/test-generate`
- `/coverage`
- `/visual-regression`
- Testing framework skills

**Model Tier**: `sonnet` (needs to understand code, but not ultra-complex)

**Out of Scope**:
- ❌ No fixes (report to Lane 3)
- ❌ No architecture (Lane 2)

**When to Use**:
- After implementation
- User says "test", "verify", "reproduce bug"
- CI/CD validation

**Deliverable**: Test results, coverage reports, verification status

---

### Lane 6: Release & Ops (Side-Effectful Operations)

**Purpose**: Manual-only side-effectful actions (commits, PRs, deployments)

**Primary Agents**: NONE (manual-only to prevent accidents)

**Primary Skills**:
- `/commit` (manual-only)
- `/pr-review` (manual-only)
- `/release-manager` (manual-only)
- Deployment skills (all manual-gated)

**Model Tier**: `sonnet` (balanced, but human confirmation required)

**Out of Scope**:
- ❌ NEVER auto-invoke
- ❌ No autonomous commits/pushes/deploys

**When to Use**: User explicitly requests with full context

**Safety**: All Lane 6 skills MUST have confirmation gates

---

## I-B. Specialized Sub-Lanes (Domain-Specific Organization)

**Purpose**: The "unknown" lane has been organized into 24 specialized sub-lanes for domain-specific components.

### Sub-Lane Organization

**Domain-Specific Analysis** (30+ components each):
- **DMB Analysis**: Dave Matthews Band almanac, setlist analysis, tour data specialists
  - Model tier: Mixed (haiku for scanners, sonnet for analyzers, opus for coordinators)
  - Examples: dmb-show-analyzer, dmb-setlist-pattern-analyzer, dmb-expert

**Agent Infrastructure** (10+ components each):
- **Agent Ecosystem**: Meta-agents managing the agent ecosystem itself
  - Examples: agent-matcher, task-router, skill-recommender, pattern-learner
- **Meta/Orchestration**: High-level orchestration and fusion agents
  - Examples: fusion orchestrators, swarm-commander, parallel-universe-executor

**Development Tooling** (5-12 components each):
- **Code Quality/Linting**: Linters, validators, and code quality checkers
  - Examples: eslint-rule-consistency-checker, react-hook-linter, complexity-calculator
- **Debugging Specialists**: Specialized debugging agents for different contexts
  - Examples: javascript-debugger, nodejs-debugger, memory-leak-detective
- **DevOps/Tooling**: Build tools, package managers, infrastructure
  - Examples: npm-ecosystem-specialist, dockerfile-linter, migration-risk-scorer
- **Frontend Specialists**: Frontend-specific tools and validators
  - Examples: react-hydration-checker, pwa-analytics-specialist, i18n-specialist

**Performance & Reliability** (3-11 components each):
- **Performance Optimization**: Cache, batch processing, speculation
  - Examples: cache-orchestrator, speculative-executor, session-prewarmer
- **Performance Diagnostics**: Memory leaks, N+1 queries, performance profiling
  - Examples: memory-leak-detective, n-plus-one-detector, memory-snapshot-parser
- **Reliability Engineering**: Circuit breakers, failure detection, auto-recovery
  - Examples: circuit-breaker-controller, failure-mode-simulator
- **Monitoring/Observability**: System monitoring and health tracking
  - Examples: codebase-health-monitor, distributed-tracing-specialist

**Platform-Specific** (5-7 components each):
- **Apple/macOS**: Apple Silicon, Metal, Core ML, macOS-specific
  - Examples: apple-silicon-optimizer, swift-metal-performance-engineer
- **Google APIs**: Google Workspace, AI APIs, OAuth
  - Examples: gemini-integration-specialist, veo-video-generation-specialist

**Business Domains** (2-12 components each):
- **E-commerce**: Etsy, Shopify, Amazon, inventory, pricing
  - Examples: etsy-specialist, shopify-specialist, pricing-strategist
- **Live Events**: Ticketing, tours, venues, VIP packages
  - Examples: ticketing-operations-specialist, tour-manager
- **Marketing/Growth**: Content, SEO, social media, growth strategies
  - Examples: content-strategist, seo-specialist, growth-hacker
- **Business/Ops**: HR, finance, operations, project management
  - Examples: scrum-master, technical-program-manager, operations-manager

**Technical Infrastructure** (2-4 components each):
- **ML/AI Infrastructure**: Prompt engineering, vector DBs, model monitoring
  - Examples: prompt-engineer, rag-architect, llm-guardrails-engineer
- **Data Engineering**: Pipelines, quality, analytics
  - Examples: data-pipeline-architect, data-quality-engineer
- **Backend/Infrastructure**: Servers, databases, microservices
  - Examples: stream-processing-agent, monorepo-tooling-specialist
- **Security Validation**: Security-specific validators
  - Examples: sql-injection-detector, input-sanitization-checker

**Creative & Content** (1-2 components each):
- **Design/Creative**: Creative direction and design leadership
  - Examples: creative-director
- **Content/Creative Tools**: Specialized creative tooling
  - Examples: tailwind-v4-specialist, short-form-video-strategist
- **Product Management**: Product and program management
  - Examples: product-manager, technical-program-manager

### Using Sub-Lanes

**Routing**: Sub-lanes help route specialized requests to domain experts without cluttering the main 6 capability lanes.

**Model Tiers**: Sub-lanes inherit recommended model tiers from their parent lane, with domain-specific overrides where appropriate.

**Discovery**: Use sub-lane categorization to find the right specialist for domain-specific work.

---

## II. Handoff Contract ("Context Pack")

When an agent delegates back to main session or to another agent, it MUST return a **Context Pack** with these sections:

### Required Sections

#### 1. Summary (3-6 bullets)
```markdown
## Summary
- Analyzed 47 files across 3 domains
- Found 12 security issues (3 high, 9 medium)
- Performance bottleneck identified in data layer
```

#### 2. Findings (with file refs)
```markdown
## Findings
### High Severity
- **SQL Injection Risk** in `src/api/users.ts:42`
  - Raw query construction without parameterization
- **XSS Vulnerability** in `src/components/UserProfile.svelte:88`
  - Unescaped user input in {@html}

### Medium Severity
- Missing input validation (9 instances)
  - `src/api/posts.ts:12`, `src/api/comments.ts:34`, ...
```

#### 3. Proposed Actions (ordered, minimal)
```markdown
## Proposed Actions
1. Fix SQL injection in users API (HIGH)
2. Replace {@html} with safe rendering (HIGH)
3. Add input validation middleware (MEDIUM)
4. Run security audit again to verify (VERIFY)
```

#### 4. Verification Commands
```markdown
## Verification
```bash
# Run security scanner
npm run security:audit

# Run affected tests
npm test -- users.test.ts profiles.test.ts

# Check for remaining vulnerabilities
grep -r "raw query" src/api/
```
```

#### 5. Risks/Assumptions
```markdown
## Risks & Assumptions
- **Assumption**: PostgreSQL with parameterized query support
- **Risk**: Database query changes may affect performance
- **Dependency**: Requires `pg` library v8.0+
```

### Example Context Pack (Full)

```markdown
# Security Audit: DMB Almanac API Layer

## Summary
- Audited 23 API endpoints across `src/routes/api/`
- Found 12 security issues (3 HIGH, 9 MEDIUM, 0 LOW)
- All HIGH issues in database query layer
- Authentication flows are secure

## Findings

### HIGH Severity (3)

**SQL Injection Risk** - `src/routes/api/shows/+server.ts:42`
- Raw query construction: `db.query(\`SELECT * FROM shows WHERE id = ${id}\`)`
- User-controlled `id` parameter not sanitized
- **Impact**: Full database access

**SQL Injection Risk** - `src/routes/api/venues/search/+server.ts:18`
- LIKE query without escaping: `WHERE name LIKE '%${search}%'`
- **Impact**: Database enumeration

**XSS in User Content** - `src/routes/profile/[id]/+page.svelte:88`
- {@html userBio} renders unsanitized content
- **Impact**: Stored XSS attack

### MEDIUM Severity (9)

**Missing Rate Limiting** - All API routes
- No rate limiting middleware
- **Impact**: DoS vulnerability

**Missing Input Validation** (8 instances)
- `src/routes/api/shows/+server.ts:12` - missing date validation
- `src/routes/api/venues/+server.ts:34` - missing name length check
- ... (6 more)

## Proposed Actions

1. **Fix SQL injection in shows API** (HIGH)
   - Replace with parameterized query: `db.query('SELECT * FROM shows WHERE id = $1', [id])`
   - File: `src/routes/api/shows/+server.ts:42`

2. **Fix SQL injection in venue search** (HIGH)
   - Use pg-format or parameterized LIKE
   - File: `src/routes/api/venues/search/+server.ts:18`

3. **Replace {@html} with safe rendering** (HIGH)
   - Use `{userBio}` with DOMPurify if HTML needed
   - File: `src/routes/profile/[id]/+page.svelte:88`

4. **Add rate limiting middleware** (MEDIUM)
   - Install `@sveltejs/kit-rate-limit`
   - Apply to all `/api/*` routes

5. **Add input validation** (MEDIUM)
   - Create validation schemas with Zod
   - Apply to affected routes

## Verification

```bash
# Run security scanner
npm run security:audit

# Run affected tests
npm test -- src/routes/api/shows/

# Check for SQL injection patterns
grep -r "db.query(\`" src/routes/

# Verify XSS fix
grep -r "{@html" src/
```

## Risks & Assumptions

- **Assumption**: Using PostgreSQL with pg library
- **Assumption**: DOMPurify acceptable for user content sanitization
- **Risk**: Rate limiting may affect legitimate high-volume users
- **Dependency**: `@sveltejs/kit-rate-limit` must be compatible with SvelteKit 2.x
```

---

## III. Skill Output Contract

Skills follow the SAME Context Pack format when they produce results.

### Inline Skills

**Behavior**: Execute in main session context, return results directly

**Format**: Use Context Pack sections as appropriate

**Example** (`/security-audit`):
```markdown
# Security Audit Results

## Summary
- Scanned 47 files
- 12 issues found (3 HIGH, 9 MEDIUM)

## Findings
[Same as Context Pack format]

## Verification
[Commands to verify fixes]
```

### Fork-Context Skills

**Behavior**: Execute in dedicated agent subprocess (via `context: fork`)

**Frontmatter**:
```yaml
---
name: complex-migration
context: fork
agent: migration-specialist
model: inherit
---
```

**Agent Interaction**:
1. Skill invoked: `/complex-migration`
2. System spawns `migration-specialist` agent
3. Agent receives skill content as instructions
4. Agent returns Context Pack
5. Main session receives result

**Rules for Fork-Context Skills**:
- MUST specify `agent:` in frontmatter
- That agent MUST exist and be accessible
- Agent MUST have appropriate tools/permissions
- Result follows Context Pack format

---

## IV. Skills in Subagents

### Critical Rule: Skills Don't Inherit

**Subagents do NOT inherit skills from main session.**

If an agent needs skills, you MUST:

#### Option A: Preload in Agent Frontmatter
```yaml
---
name: rust-migration-engineer
model: sonnet
skills:
  - rust-from-python
  - rust-from-js
  - dependency-audit-migration
---
```

**Effect**: Skills are injected into agent's context at launch

**Use When**: Agent needs multiple related skills

#### Option B: Pass Skills Dynamically
```python
Task(
    description="Migrate Python to Rust",
    subagent_type="rust-migration-engineer",
    # Pass skill content directly if needed
)
```

**Use When**: One-off skill usage

#### Option C: Agent Uses Read Tool
```markdown
<!-- In agent instructions -->
If you need skill content, use the Read tool:
Read("/Users/.../

.claude/skills/rust/migration/rust-from-python.md")
```

**Use When**: Agent needs skill content conditionally

### Testing Skill Access

**Verification Commands**:
```bash
# Check if agent preloads skills
grep "skills:" .claude/agents/domain/agent-name.md

# Validate skill paths exist
for skill in $(grep "skills:" .claude/agents/domain/agent-name.md | grep -o "'[^']*'"); do
  test -f ".claude/skills/$skill.md" || echo "Missing: $skill"
done
```

---

## V. Model Policy (Brief)

See `MODEL_POLICY.md` for full details. Quick reference:

| Lane | Model Tier | Rationale |
|------|-----------|-----------|
| 1. Explore & Index | `haiku` | Fast, cheap scanning |
| 2. Design & Plan | `opus` or `opusplan` | Deep reasoning |
| 3. Implement | `sonnet` | Balanced code quality |
| 4. Review & Security | `opus` | Thoroughness critical |
| 5. QA & Verify | `sonnet` | Understand code, not ultra-complex |
| 6. Release & Ops | `sonnet` | Human-gated anyway |

**Never use**: `default` (ambiguous, varies by account)

---

## VI. Orchestrator Coordination

### Hierarchy

```
User Request
    ↓
[Main Session] (Sonnet 4.5)
    ↓
Routing Decision
    ↓
    ├─→ Lane 1: Explore (haiku agents)
    ├─→ Lane 2: Plan (opus agents)
    ├─→ Lane 3: Implement (sonnet agents)
    ├─→ Lane 4: Review (opus agents)
    ├─→ Lane 5: QA (sonnet agents)
    └─→ Lane 6: Manual-only skills
```

### Domain Orchestrators

**Rust Workflow**:
```
rust-lead-orchestrator (Opus)
    ├─→ rust-project-architect (Opus) - Lane 2
    ├─→ rust-semantics-engineer (Sonnet) - Lane 3
    ├─→ rust-safety-auditor (Opus) - Lane 4
    ├─→ rust-qa-engineer (Sonnet) - Lane 5
    └─→ rust-parallel-coordinator (Haiku) - Swarm management
```

**WASM Workflow**:
```
wasm-lead-orchestrator (Opus)
    ├─→ wasm-rust-compiler (Sonnet) - Lane 3
    ├─→ wasm-optimizer (Opus) - Lane 2/4
    ├─→ wasm-testing-specialist (Sonnet) - Lane 5
    └─→ wasm-js-interop-engineer (Sonnet) - Lane 3
```

**SvelteKit Workflow**:
```
sveltekit-orchestrator (Opus)
    ├─→ sveltekit-engineer (Sonnet) - Lane 3
    ├─→ pwa-engineer (Sonnet) - Lane 3
    ├─→ performance-optimizer (Opus) - Lane 2/4
    └─→ sveltekit-qa-engineer (Sonnet) - Lane 5
```

### Delegation Rules

1. **Orchestrator responsibilities**:
   - Parse user request
   - Choose appropriate lane + specialist
   - Coordinate multi-agent workflows
   - Aggregate Context Packs from specialists
   - Return final Context Pack to user

2. **Specialist responsibilities**:
   - Execute assigned work
   - Stay in lane (don't exceed scope)
   - Return Context Pack to orchestrator

3. **No circular delegation**:
   - Orchestrator → Specialist (OK)
   - Specialist → Orchestrator (BAD - creates loops)
   - Specialist → Another Specialist (ONLY via orchestrator)

---

## VII. Precedence & Scope Rules

### Scope Precedence (Claude Code behavior)

**Loading Order** (highest to lowest):
1. **Project-level**: `.claude/` in current project folder
2. **User-level**: `.claude/` in `~/` or designated user folder
3. **Built-in**: System-provided agents/skills

**Shadowing**: If same name exists in multiple scopes, higher precedence wins.

**Implication**:
- Project-specific customizations override user defaults
- User defaults override built-ins
- Duplicates at lower precedence WASTE context (loaded but shadowed)

### Scope Strategy (Post-Deduplication)

**User-Level** (`.claude/skills/`, `.claude/agents/`):
- Cross-project, reusable components
- Web Platform APIs (Web Locks, Web Bluetooth, etc.)
- Chromium features (CSS if(), View Transitions, etc.)
- Accessibility patterns (WCAG, focus management)
- General-purpose analyzers/validators

**Project-Level** (`projects/dmb-almanac/app/.claude/`):
- Project-specific agents (DMB domain experts)
- Project-specific skills (DMB business logic)
- Customizations of user-level components
- Domain team structures (Rust team, WASM team, SvelteKit team)

**Rule**: If it's useful across multiple projects → user-level. If it's DMB-specific → project-level.

---

## VIII. Side-Effect Safety

### Manual-Only Skills

**Lane 6 skills MUST have manual-only gates:**

```yaml
---
name: commit
manual-only: true
confirmation-required: true
---
```

**Behavior**:
- Can NEVER auto-invoke
- Must be explicitly called by user: `/commit`
- Should prompt for confirmation before executing

**Examples**:
- `/commit` - Git commits
- `/pr-review` - Create/update pull requests
- `/deploy` - Deployments
- `/release-manager` - Release actions
- Database migrations with data loss

### Verification

```bash
# Find skills missing manual-only gates
for skill in .claude/skills/release/*.md .claude/skills/git/*.md; do
  if ! grep -q "manual-only: true" "$skill"; then
    echo "Missing manual-only: $skill"
  fi
done
```

---

## IX. Testing & Validation

### Coordination Validation Script

See `.claude/audit/validate-coordination.py` (generated in Phase 6)

**Validates**:
- No duplicate names causing shadowing
- All skill→agent references valid
- All agents using explicit models (no `default`)
- Manual-only gates on side-effect skills
- Context Pack format in agent outputs

### Demo Workflow (Integration Test)

**Scenario**: Security audit → Fix → Verify

```bash
# 1. Explore (Lane 1)
User: "Analyze the API security"
→ Spawns: architecture-analyzer (haiku)
→ Returns: Context Pack with findings

# 2. Review (Lane 4)
User: "Do a security audit"
→ Spawns: security-scanner (opus)
→ Returns: Context Pack with vulnerabilities + fix recommendations

# 3. Implement (Lane 3)
User: "Fix the SQL injection issues"
→ Spawns: sveltekit-engineer (sonnet)
→ Returns: Context Pack with code changes + verification commands

# 4. QA (Lane 5)
User: "Run security tests"
→ Spawns: sveltekit-qa-engineer (sonnet)
→ Returns: Context Pack with test results

# 5. Release (Lane 6 - MANUAL)
User: "/commit -m 'fix: SQL injection vulnerabilities'"
→ Prompts user for confirmation
→ Executes commit
```

**Expected**:
- ✅ Each agent stays in lane
- ✅ Each returns proper Context Pack
- ✅ No circular delegation
- ✅ Appropriate models used
- ✅ Manual-only skills require confirmation

---

## X. Maintenance & Evolution

### Adding New Agents

**Checklist**:
- [ ] Assign to capability lane (1-6)
- [ ] Choose appropriate model tier (see MODEL_POLICY.md)
- [ ] Define clear scope (what's IN, what's OUT)
- [ ] Document Context Pack output format
- [ ] Add to relevant orchestrator's delegation list
- [ ] Check for name conflicts (search existing agents)
- [ ] Test delegation flow

### Adding New Skills

**Checklist**:
- [ ] Decide scope: user-level or project-level?
- [ ] If `context: fork`, specify `agent:` that exists
- [ ] Choose model (usually `inherit`)
- [ ] Document expected output
- [ ] If side-effectful, add `manual-only: true`
- [ ] Check for name conflicts

### Deprecating Components

**Process**:
1. Mark deprecated in frontmatter: `deprecated: true`
2. Add deprecation notice in file
3. Update orchestrators to use replacement
4. After 30 days, delete file
5. Update COORDINATION.md to reflect changes

---

## XI. Troubleshooting

### "Wrong agent invoked"

**Symptoms**: User expects agent A, gets agent B

**Debug**:
```bash
# Check for duplicate names
python3 .claude/audit/parse-toolkit.py
# Review coordination-map.json for duplicates

# Check scope precedence
ls -la .claude/agents/*/agent-name.md
ls -la projects/dmb-almanac/app/.claude/agents/*/agent-name.md
```

**Fix**: Rename or delete lower-precedence duplicate

### "Skill not found in agent"

**Symptoms**: Agent says "skill XYZ not available"

**Debug**:
```bash
# Check if agent preloads skill
grep "skills:" .claude/agents/domain/agent-name.md

# Check if skill exists
ls -la .claude/skills/path/to/skill.md
```

**Fix**: Add skill to agent's `skills:` list OR use Read tool in agent

### "Context cost too high"

**Symptoms**: Slow routing, high token usage

**Debug**:
```bash
# Run redundancy analysis
python3 .claude/audit/redundancy-analysis.py

# Check total context
python3 .claude/audit/parse-toolkit.py
```

**Fix**: Deduplicate, compress large files, implement lazy loading

---

## XII. Quick Reference

### Capability Lanes

| Lane | Purpose | Model | Manual-Only? |
|------|---------|-------|--------------|
| 1 | Explore & Index | haiku | No |
| 2 | Design & Plan | opus/opusplan | No |
| 3 | Implement | sonnet | No |
| 4 | Review & Security | opus | No |
| 5 | QA & Verify | sonnet | No |
| 6 | Release & Ops | sonnet | **YES** |

### Context Pack Sections

1. Summary (3-6 bullets)
2. Findings (with file:line refs)
3. Proposed Actions (ordered)
4. Verification (commands)
5. Risks/Assumptions

### Scope Precedence

Project > User > Built-in

### Model Policy

- Scan/Index → haiku
- Code/Refactor → sonnet
- Reasoning/Arch → opus
- Mixed Plan→Impl → opusplan

---

**End of Coordination Standards**

**Next**: See `MODEL_POLICY.md` for detailed model tier recommendations
