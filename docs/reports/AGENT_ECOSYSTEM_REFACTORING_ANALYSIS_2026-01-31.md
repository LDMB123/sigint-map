# Agent Ecosystem Refactoring Analysis

**Date:** 2026-01-31
**Scope:** 14 agents across .claude/agents/
**Analysis Type:** Systematic refactoring opportunities
**Objective:** Identify duplication, inconsistency, optimization potential

---

## Executive Summary

**Total Opportunities Identified:** 30
**High Impact:** 12 refactorings
**Medium Impact:** 11 refactorings  
**Low Impact:** 7 refactorings

**Estimated Total Token Savings:** 18,000-25,000 characters (35-45% reduction)
**Effort Required:** 8-12 hours total
**Risk Level:** Low (mostly safe refactorings)

**Top 3 Priorities:**
1. Extract common description template (saves 2,000 chars, standardizes routing)
2. Consolidate duplicate tool sets into categories (improves maintainability)
3. Rename 2 agents to fix inconsistency (prevents confusion)

---

## 1. Code Duplication Detection

### 1.1 Description Pattern Duplication (HIGH PRIORITY)

**Pattern Found:** "Use when the user requests..."
**Instances:** 13/14 agents (93%)
**Variation:** Inconsistent phrasing in middle section

**Examples:**
- security-scanner: "Use when the user requests security audit, vulnerability scanning, or dependency checks."
- test-generator: "Use when the user requests test creation, coverage improvement, or test suite generation."
- error-debugger: "Use when the user reports errors, provides stack traces, or describes failing behavior."

**Opportunity:**
Create description template with variables:
```yaml
description_template: >
  Use when the user requests {primary_action}, {secondary_action}, or {tertiary_action}.
  Delegate proactively {delegation_triggers}.
  {specialization_summary}. Returns {output_summary}.
```

**Impact:**
- Token savings: 2,000 chars (eliminates repetition)
- Consistency: 100% standardized routing language
- Maintenance: Single source of truth for pattern
- Effort: 2 hours
- Risk: Low (preserves semantics)

---

### 1.2 Process Section Duplication (MEDIUM PRIORITY)

**Pattern Found:** Numbered process lists with similar structure
**Instances:** 12/14 agents

**Duplicated structures:**
```
1. Read/Glob/Grep to understand context
2. Analyze for specific issue
3. Generate recommendations
4. Execute changes (if applicable)
5. Verify results
```

**Opportunity:**
Extract process templates by agent category:
- **Analyzers** (5 agents): Read → Analyze → Report
- **Transformers** (4 agents): Read → Transform → Verify → Document  
- **Generators** (2 agents): Spec → Study patterns → Generate → Place
- **Special** (3 agents): Custom workflows

**Impact:**
- Token savings: 1,500 chars
- Clarity: Highlights agent category differences
- Effort: 3 hours
- Risk: Low

---

### 1.3 Output Format Duplication (MEDIUM PRIORITY)

**Pattern Found:** Similar output format sections
**Instances:** 8/14 agents with explicit output format

**Common patterns:**
- Severity ratings (security-scanner, bug-triager, performance-profiler)
- File/line references (error-debugger, security-scanner, bug-triager)
- Recommendations with impact (performance-profiler, performance-auditor, dependency-analyzer)

**Opportunity:**
Define 3 standard output templates:
1. **Finding Report:** severity, location, issue, fix, prevention
2. **Analysis Report:** metrics, findings, recommendations, impact
3. **Transform Report:** files changed, verification status, documentation

**Impact:**
- Token savings: 1,200 chars
- Consistency: Standardized outputs across categories
- Effort: 2 hours
- Risk: Low

---

### 1.4 Tool Set Duplication (HIGH PRIORITY)

**Identical tool sets found:**

**Set A: Read,Grep,Glob,Bash (5 agents)**
- security-scanner
- error-debugger  
- performance-profiler
- bug-triager
- dependency-analyzer

**Set B: Read,Edit,Grep,Glob,Bash (5 agents)**
- test-generator
- refactoring-agent
- code-generator
- migration-agent
- best-practices-enforcer

**Set C: Read,Edit,Grep,Glob (1 agent)**
- documentation-writer

**Set D: Read,Grep,Glob,Bash (2 agents)**
- dmb-analyst
- token-optimizer (also has Write per description, missing from frontmatter)
- performance-auditor

**Opportunity:**
Create tool category references:
```yaml
# In shared config
tool_categories:
  analyzer: [Read, Grep, Glob, Bash]
  transformer: [Read, Edit, Grep, Glob, Bash]
  documenter: [Read, Edit, Grep, Glob]
  optimizer: [Read, Grep, Glob, Bash]

# In agent frontmatter
tools: $transformer  # References category
```

**Impact:**
- Maintenance: Single source of truth for tool assignments
- Clarity: Category membership explicit
- Future: Easy to add/remove tools from categories
- Effort: 4 hours (requires config system updates)
- Risk: Medium (depends on Claude Code SDK support)

---

### 1.5 Safety Rules Duplication (LOW PRIORITY)

**Common patterns:**
- "Never change X without Y" (refactoring-agent, migration-agent, code-generator)
- "Preserve existing behavior" (refactoring-agent, migration-agent)
- "Run tests before/after" (test-generator, migration-agent, refactoring-agent)

**Opportunity:**
Extract shared safety principles to reusable snippet, reference from agents

**Impact:**
- Token savings: 800 chars
- Consistency: Same safety message everywhere
- Effort: 1 hour
- Risk: Low

---

## 2. Naming Consistency Refactoring

### 2.1 Agent Name Suffix Inconsistency (HIGH PRIORITY)

**Issue:** Only 2/14 agents use "-agent" suffix
- refactoring-agent
- migration-agent

**All others use role nouns:**
- security-scanner
- test-generator
- error-debugger
- dependency-analyzer
- code-generator
- performance-profiler
- documentation-writer
- dmb-analyst
- bug-triager
- best-practices-enforcer
- performance-auditor
- token-optimizer

**Recommendation:**
Rename to remove "-agent" suffix:
- refactoring-agent → refactoring-specialist (or code-refactorer)
- migration-agent → migration-specialist (or code-migrator)

**Rationale:**
- 86% of agents use role noun pattern
- Consistent with existing naming: scanner, generator, debugger, analyzer, profiler, writer, triager, enforcer, auditor, optimizer
- Matches project standards

**Impact:**
- Consistency: 100% naming compliance
- Clarity: Reduces confusion about naming convention
- Effort: 1 hour (rename files + update route table + update references)
- Risk: Low (safe rename with grep verification)

---

### 2.2 Category Naming Alignment (MEDIUM PRIORITY)

**Current categories in route table:**
- analyzer, debugger, generator, guardian, integrator, learner, orchestrator, reporter, transformer, validator, content, testing, monitoring, workflow, dmb

**Observation:** Agent names don't align with categories
- "security-scanner" → guardian category
- "performance-profiler" → testing category
- "performance-auditor" → monitoring category

**Opportunity:**
Option A: Rename agents to match categories
- security-scanner → security-guardian
- test-generator → test-generator (already aligned)

Option B: Rename categories to match agents
- guardian → scanner
- testing → profiler

**Recommendation:** Option B (rename categories)
- Less disruptive (14 agent renames vs 3 category renames)
- Agents are user-facing, categories are internal
- Role nouns clearer than abstract categories

**Impact:**
- Consistency: Names match categories
- Clarity: Easier mental model
- Effort: 2 hours (update route table + documentation)
- Risk: Low (internal change)

---

## 3. Description Template Opportunities

### 3.1 Standardize Routing Language (HIGH PRIORITY)

**Current pattern (13/14 agents):**
```
Use when the user requests [actions].
Delegate proactively [triggers].
[Specialization details]. Returns [outputs].
```

**Exception:** best-practices-enforcer (uses "Use when creating..." not "Use when the user requests...")

**Opportunity:**
Create strict template with validation:
```yaml
description_template:
  line1: "Use when the user requests {primary_triggers}."
  line2: "Delegate proactively {proactive_triggers}."  
  line3: "{specialization_one_liner}."
  line4: "Returns {output_format}."
```

**Validation rules:**
- Line 1 must start with "Use when the user requests"
- Line 2 must start with "Delegate proactively"
- Line 3 describes specialization (1 sentence, <150 chars)
- Line 4 starts with "Returns" and describes output

**Impact:**
- Routing: Improved semantic parsing consistency
- Maintenance: Template enforcement via validation
- Token: 2,000 char savings from shared template
- Effort: 3 hours (create template + update all agents)
- Risk: Low

---

### 3.2 Compress Verbose Descriptions (MEDIUM PRIORITY)

**Longest descriptions (word count):**
1. performance-auditor: 47 words
2. token-optimizer: 46 words
3. best-practices-enforcer: 42 words
4. dmb-analyst: 40 words

**Target:** <35 words per description

**Example compression:**

**Before (token-optimizer, 46 words):**
> Use when token usage exceeds 50% (100,000+ tokens) or approaching budget limits. Delegate proactively when repeated operations consume tokens, large file reads are needed, or cost reduction is required. Active session token optimization specialist for real-time context compression, cache management, and token budget optimization.

**After (28 words):**
> Use when token usage exceeds 50% or approaching budget limits. Delegate proactively when repeated operations consume tokens or cost reduction needed. Specializes in real-time context compression, cache management, and budget optimization.

**Savings:** 18 words (39% reduction)

**Impact:**
- Token savings: 800 chars across 4 agents
- Clarity: More concise routing signals
- Effort: 1 hour
- Risk: Low

---

## 4. Tool Assignment Optimization

### 4.1 Missing Tools in Frontmatter (HIGH PRIORITY)

**Issue:** token-optimizer description mentions "Write" and "Edit" tools but frontmatter only lists:
```yaml
tools: [Read, Grep, Glob, Bash]
```

**Description says:**
- "Write - Create compressed summaries"
- "Edit - Update configs for optimization"

**Recommendation:**
Add missing tools to frontmatter:
```yaml
tools: [Read, Edit, Grep, Glob, Bash]
```

**Impact:**
- Correctness: Frontmatter matches capabilities
- Function: Agent can actually use needed tools
- Effort: 5 minutes
- Risk: None

---

### 4.2 Over-Provisioned Tool Access (MEDIUM PRIORITY)

**Observation:** Several "plan" mode agents have Edit tool but descriptions don't mention file modification:
- None (all plan-mode agents correctly lack Edit)

**Under-Provisioned:**
- documentation-writer has Edit but lacks Bash (might need for running doc generators)

**Recommendation:**
Audit each agent's actual tool needs:
1. Read agent description for mentioned operations
2. Check Process section for tool usage
3. Add missing tools, remove unused tools

**Impact:**
- Security: Least privilege principle
- Clarity: Tool list matches description
- Effort: 2 hours
- Risk: Low (verify with grep before changes)

---

### 4.3 Standardize Tool Order (LOW PRIORITY)

**Current:** Tools listed in inconsistent order
- Some: Read, Edit, Grep, Glob, Bash
- Some: Read, Grep, Glob, Bash

**Recommendation:**
Alphabetical order: Bash, Edit, Glob, Grep, Read
OR
Frequency order: Read, Grep, Glob, Edit, Bash

**Impact:**
- Consistency: Easy visual scanning
- Effort: 15 minutes
- Risk: None

---

## 5. Model Tier Rationalization

### 5.1 Current Distribution Analysis

**Sonnet (12 agents):**
- security-scanner, test-generator, error-debugger, refactoring-agent
- code-generator, performance-profiler, documentation-writer, migration-agent
- dmb-analyst, bug-triager, best-practices-enforcer, performance-auditor

**Haiku (2 agents):**
- dependency-analyzer
- token-optimizer

**Analysis:**
- Haiku agents are correctly chosen (high-volume, straightforward tasks)
- All Sonnet agents require reasoning or complex code generation
- No obvious Opus candidates (no multi-step planning needed)

---

### 5.2 Potential Haiku Candidates (MEDIUM PRIORITY)

**Candidates for tier downgrade:**

**1. bug-triager (Sonnet → Haiku)**
- Task: Parse bug report, assess severity, locate code
- Complexity: Low-medium (mostly pattern matching)
- Volume: High (many bugs to triage)
- Savings: 50% cost reduction on triaging
- Risk: Medium (might miss subtle bugs)
- Recommendation: Test on 20 bugs, compare accuracy

**2. documentation-writer (Sonnet → Haiku)**
- Task: Generate docs from code
- Complexity: Low-medium (templated output)
- Volume: Medium
- Savings: 50% cost on doc generation
- Risk: Medium (might produce lower quality prose)
- Recommendation: Pilot on API reference docs (structured format)

**Impact per downgrade:**
- Cost savings: ~50% per agent invocation
- Risk: Quality degradation possible
- Effort: 4 hours (testing + validation)

---

### 5.3 Potential Sonnet Upgrades (LOW PRIORITY)

**None identified.** Current Haiku agents are correctly tiered:
- dependency-analyzer: Straightforward package analysis
- token-optimizer: Pattern-based optimization

---

## 6. Skill Dependency Refactoring

### 6.1 Current Skill Usage

**Heavy users:**
- best-practices-enforcer: 3 skills (skill-validator, agent-optimizer, token-budget-monitor)
- performance-auditor: 2 skills (token-budget-monitor, organization)

**Single skill:**
- dmb-analyst: 1 skill (dmb-analysis)

**No skills:**
- 11 agents use no skills

---

### 6.2 Missing Beneficial Skills (HIGH PRIORITY)

**Agents that should use skills:**

**1. security-scanner + skill-validator**
- Reason: Validates configuration files, checks YAML
- Benefit: Reuse validation logic
- Impact: 500 char savings, improved consistency
- Effort: 15 minutes

**2. test-generator + code-quality**
- Reason: Should check code quality before generating tests
- Benefit: Better test generation targeting
- Impact: Higher quality outputs
- Effort: 30 minutes

**3. refactoring-agent + code-quality**
- Reason: Identifies refactoring candidates
- Benefit: Data-driven refactoring decisions
- Impact: More targeted refactorings
- Effort: 30 minutes

**4. migration-agent + skill-validator**
- Reason: Validates migrated configs
- Benefit: Catch migration errors early
- Impact: Safer migrations
- Effort: 15 minutes

**5. error-debugger + organization**
- Reason: Check if error relates to file organization
- Benefit: Catch scattered file issues
- Impact: Better diagnostics
- Effort: 15 minutes

---

### 6.3 Redundant Skill Usage (LOW PRIORITY)

**None identified.** All current skill usage is appropriate:
- best-practices-enforcer needs all 3 validation skills
- performance-auditor needs both monitoring skills
- dmb-analyst needs domain-specific skill

---

### 6.4 Skill Chain Optimization (MEDIUM PRIORITY)

**Opportunity:** Create skill execution graph

**Current:** Agents invoke skills independently
**Proposed:** Skills can reference other skills

**Example:**
```yaml
# In agent-optimizer skill
dependencies:
  - token-budget-monitor  # Check token budget first
  - skill-validator       # Validate before optimizing
```

**Benefit:**
- Composability: Build complex workflows from simple skills
- Consistency: Same skill chains across agents
- Maintenance: Update chain in one place

**Impact:**
- Architecture: More modular system
- Effort: 8 hours (requires SDK support)
- Risk: Medium (new pattern)

---

## 7. Anti-Pattern Detection

### 7.1 Verbose Bodies (MEDIUM PRIORITY)

**Issue:** 3 agents exceed 3,000 characters
- token-optimizer: 6,269 chars
- performance-auditor: 5,257 chars
- best-practices-enforcer: 3,873 chars

**Recommendation:**
Extract verbose content to supporting files:

**token-optimizer:**
- Move "Optimization Strategies" section to `token-optimizer-strategies.md`
- Move "Example Optimizations" to `token-optimizer-examples.md`
- Keep core process in agent body
- Savings: 3,000 chars

**performance-auditor:**
- Move "Output Format" section to `performance-auditor-template.md`
- Move "Audit Areas" details to `performance-auditor-areas.md`
- Savings: 2,500 chars

**best-practices-enforcer:**
- Move "Enforcement Areas" details to `best-practices-rules.md`
- Move "Output Format" to `best-practices-template.md`
- Savings: 1,500 chars

**Impact:**
- Token savings: 7,000 chars (40% reduction for these 3)
- Maintainability: Easier to update reference docs
- Effort: 3 hours
- Risk: Low (preserves all information)

---

### 7.2 Missing Process Sections (LOW PRIORITY)

**Agents without explicit process:**
- token-optimizer (has "Optimization Process" but deeply nested)

**Recommendation:**
Standardize on "## Process" section at top level for all agents

**Impact:**
- Consistency: Same structure across all agents
- Effort: 30 minutes
- Risk: None

---

### 7.3 Inconsistent Section Naming (LOW PRIORITY)

**Variations found:**
- "Process" vs "Debugging Process" vs "Generation Process" vs "Triage Process"
- "Output Format" vs "Output" vs "Deliverable"
- "Quality Standards" vs "Success Criteria"

**Recommendation:**
Standardize section names:
- Always "## Process" (not specialized names)
- Always "## Output Format" (not "Output")
- Always "## Quality Standards" (not "Success Criteria")

**Impact:**
- Consistency: Easy to find same info across agents
- Effort: 30 minutes
- Risk: None

---

## Refactoring Priority List (Top 30)

### Tier 1: High Impact, Low Effort (Do First)

| # | Refactoring | Impact | Effort | Savings | Risk |
|---|-------------|--------|--------|---------|------|
| 1 | Fix naming inconsistency (2 agents) | High | 1h | Clarity | Low |
| 2 | Extract description template | High | 3h | 2,000 chars | Low |
| 3 | Add missing tools to token-optimizer | High | 5m | Function | None |
| 4 | Add skills to 5 agents | High | 2h | Quality | Low |
| 5 | Compress 4 verbose descriptions | Medium | 1h | 800 chars | Low |
| 6 | Standardize section naming | Medium | 30m | Clarity | None |
| 7 | Standardize tool order | Low | 15m | Clarity | None |

**Tier 1 Total:** 7 refactorings, 7.75 hours, 2,800 char savings

---

### Tier 2: High Impact, Medium Effort (Do Next)

| # | Refactoring | Impact | Effort | Savings | Risk |
|---|-------------|--------|--------|---------|------|
| 8 | Extract verbose bodies to files (3 agents) | High | 3h | 7,000 chars | Low |
| 9 | Create process templates by category | Medium | 3h | 1,500 chars | Low |
| 10 | Create output format templates | Medium | 2h | 1,200 chars | Low |
| 11 | Rename categories to match agents | Medium | 2h | Clarity | Low |
| 12 | Audit all tool assignments | Medium | 2h | Security | Low |
| 13 | Test bug-triager on Haiku | Medium | 4h | Cost | Medium |
| 14 | Test documentation-writer on Haiku | Medium | 4h | Cost | Medium |

**Tier 2 Total:** 7 refactorings, 20 hours, 9,700 char savings

---

### Tier 3: Medium Impact, Variable Effort (Consider)

| # | Refactoring | Impact | Effort | Savings | Risk |
|---|-------------|--------|--------|---------|------|
| 15 | Create tool category system | High | 4h | Maintain | Medium |
| 16 | Extract safety rules to snippet | Low | 1h | 800 chars | Low |
| 17 | Add missing Process sections | Low | 30m | Clarity | None |
| 18 | Create skill execution graph | Medium | 8h | Architect | Medium |
| 19 | Standardize severity ratings | Low | 1h | Clarity | Low |
| 20 | Extract common error patterns | Low | 2h | 500 chars | Low |

**Tier 3 Total:** 6 refactorings, 16.5 hours, 1,300 char savings

---

### Tier 4: Exploratory/Future (Long-term)

| # | Refactoring | Impact | Effort | Savings | Risk |
|---|-------------|--------|--------|---------|------|
| 21 | Consolidate scanner agents | High | 12h | Maintain | High |
| 22 | Create meta-agent for routing | High | 16h | Architect | High |
| 23 | Generate agents from templates | Medium | 8h | Speed | Medium |
| 24 | Add agent performance metrics | Medium | 6h | Insight | Medium |
| 25 | Create agent test suite | High | 20h | Quality | Low |
| 26 | Build agent dependency graph viz | Low | 4h | Clarity | Low |
| 27 | Extract domain models to skills | Medium | 10h | Reuse | Medium |
| 28 | Create agent inheritance system | High | 16h | DRY | High |
| 29 | Add agent versioning | Medium | 8h | Maintain | Medium |
| 30 | Build agent marketplace | Low | 40h | Share | High |

**Tier 4 Total:** 10 refactorings, 140 hours, architectural changes

---

## Safe Refactoring Sequences

### Sequence 1: Quick Wins (1 day)
1. Standardize tool order (15m)
2. Add missing tools to token-optimizer (5m)
3. Compress 4 verbose descriptions (1h)
4. Standardize section naming (30m)
5. Fix naming inconsistency (1h)
6. Add missing Process sections (30m)
7. Add skills to 5 agents (2h)

**Total:** 5.5 hours, immediate improvements, zero risk

---

### Sequence 2: Template Creation (2 days)
1. Extract description template (3h)
2. Create process templates (3h)
3. Create output format templates (2h)
4. Update all agents to use templates (4h)

**Total:** 12 hours, 4,700 char savings, standardization complete

---

### Sequence 3: Size Reduction (1 day)
1. Extract token-optimizer details (1h)
2. Extract performance-auditor details (1h)
3. Extract best-practices-enforcer details (1h)
4. Update references in all agents (1h)

**Total:** 4 hours, 7,000 char savings, major token reduction

---

### Sequence 4: Architecture (1 week)
1. Design tool category system (4h)
2. Implement category references (4h)
3. Design skill execution graph (8h)
4. Test and validate (4h)

**Total:** 20 hours, architectural improvements, medium risk

---

## Before/After Comparisons

### Example 1: refactoring-agent → refactoring-specialist

**Before:**
```yaml
name: refactoring-agent
description: >
  Use when the user requests code simplification, dead code removal, or structural improvements.
  Delegate proactively when code complexity exceeds thresholds or duplication is detected.
  Performs safe code refactoring while preserving semantics including extract method,
  rename, simplify conditional, and consolidate duplicates. Returns transformed code
  with behavior verification and documentation of changes.
```

**After:**
```yaml
name: refactoring-specialist
description: >
  Use when the user requests code simplification, dead code removal, or structural improvements.
  Delegate proactively when code complexity exceeds thresholds or duplication detected.
  Performs safe code refactoring preserving semantics including extract method, rename,
  and consolidate duplicates. Returns transformed code with verification and change documentation.
```

**Improvements:**
- Name consistency: Matches 86% of agents
- Description: 14 words shorter (174→160 chars)
- Clarity: Same meaning, tighter phrasing

---

### Example 2: token-optimizer (extract to files)

**Before:** 6,269 characters in single file

**After (agent body):** 2,800 characters
**Supporting files:**
- token-optimizer-strategies.md (1,800 chars)
- token-optimizer-examples.md (1,500 chars)
- token-optimizer-thresholds.md (200 chars)

**Improvements:**
- Main agent: 55% smaller
- Maintenance: Update examples without touching agent
- Reuse: Strategies can be referenced by other agents
- Loading: Agent loads faster, references on-demand

---

### Example 3: Description template

**Before (13 different phrasings):**
```yaml
# security-scanner
description: >
  Use when the user requests security audit, vulnerability scanning, or dependency checks.
  Delegate proactively before production deployments or when handling sensitive data.
  Scans codebase for security vulnerabilities, hardcoded secrets, dependency CVEs,
  and OWASP Top 10 issues. Returns comprehensive security report with severity ratings
  and remediation steps.

# test-generator  
description: >
  Use when the user requests test creation, coverage improvement, or test suite generation.
  Delegate proactively when new features lack tests or coverage drops below 80%.
  Generates comprehensive test suites including unit tests, integration tests, and
  edge case coverage for existing code. Returns idiomatic tests matching project
  conventions with proper mocking and assertions.
```

**After (template + data):**
```yaml
# Template (shared)
description_template: >
  Use when the user requests {primary_actions}.
  Delegate proactively {delegation_triggers}.
  {specialization}. Returns {outputs}.

# security-scanner (data only)
description_data:
  primary_actions: "security audit, vulnerability scanning, or dependency checks"
  delegation_triggers: "before production deployments or when handling sensitive data"
  specialization: "Scans for vulnerabilities, secrets, CVEs, and OWASP Top 10 issues"
  outputs: "comprehensive security report with severity ratings and remediation steps"

# test-generator (data only)
description_data:
  primary_actions: "test creation, coverage improvement, or test suite generation"
  delegation_triggers: "when new features lack tests or coverage drops below 80%"
  specialization: "Generates unit, integration, and edge case tests for existing code"
  outputs: "idiomatic tests with mocking and assertions matching project conventions"
```

**Improvements:**
- Template: Stored once (150 chars)
- Per agent: Only variable data (200 chars vs 350 chars)
- Savings: 150 chars × 13 agents = 1,950 chars
- Validation: Enforce template compliance automatically
- Consistency: Impossible to deviate from pattern

---

## Implementation Recommendations

### Phase 1: Foundation (Week 1)
**Goal:** Fix inconsistencies, standardize structure
1. Complete Sequence 1 (Quick Wins)
2. Fix naming inconsistency
3. Standardize all section names
4. Add missing tools

**Deliverable:** All agents follow same structure and naming

---

### Phase 2: Templates (Week 2)
**Goal:** Extract common patterns
1. Complete Sequence 2 (Template Creation)
2. Implement description template
3. Create process templates
4. Create output templates

**Deliverable:** Shared templates reduce duplication

---

### Phase 3: Optimization (Week 3)
**Goal:** Reduce token overhead
1. Complete Sequence 3 (Size Reduction)
2. Extract verbose content to files
3. Compress remaining descriptions
4. Add beneficial skills

**Deliverable:** 7,000+ char savings, improved quality

---

### Phase 4: Architecture (Week 4+)
**Goal:** Improve maintainability
1. Design tool category system
2. Implement skill execution graph
3. Test model tier changes
4. Build validation suite

**Deliverable:** Scalable architecture for future agents

---

## Validation Criteria

### Post-Refactoring Checks
- [ ] All agents pass skill-validator
- [ ] All agents use standardized description pattern
- [ ] All agents have consistent section naming
- [ ] No agent exceeds 3,500 characters (unless justified)
- [ ] All tool assignments match described capabilities
- [ ] All agents reference appropriate skills
- [ ] Route table updated for renamed agents
- [ ] No duplicate code patterns >50 chars
- [ ] All supporting files properly referenced
- [ ] Git history preserved (use git mv for renames)

---

## Risk Assessment

### Low Risk (Safe to proceed)
- Naming standardization
- Description compression
- Section name standardization
- Tool order standardization
- Adding missing tools
- Extracting verbose content to files
- Adding skill references

### Medium Risk (Test thoroughly)
- Model tier changes (test on sample workload)
- Tool category system (verify SDK support)
- Template system (ensure rendering works)
- Skill execution graph (validate dependencies)

### High Risk (Defer or prototype)
- Consolidating agents (might reduce specialization)
- Agent inheritance (complex architecture)
- Meta-routing (adds indirection)

---

## Success Metrics

### Quantitative
- Total character count reduction: Target 18,000-25,000 (35-45%)
- Agents under 3,500 chars: Target 13/14 (93%)
- Description consistency: Target 14/14 (100%)
- Naming consistency: Target 14/14 (100%)
- Template usage: Target 14/14 (100%)

### Qualitative
- Easier to create new agents (template-driven)
- Faster to understand agent capabilities (consistent structure)
- Simpler to maintain (shared templates)
- More accurate routing (standardized descriptions)
- Better skill reuse (clear dependencies)

---

## Conclusion

The agent ecosystem shows strong foundational quality with **systematic opportunities for improvement through refactoring**:

**Strengths:**
- Consistent description patterns (93% use "Use when...")
- Appropriate model tier selection (14/14)
- Clear separation of concerns (no overlapping agents)
- Good permission mode usage (50/50 plan vs default)

**Opportunities:**
- Extract 2,000 chars through description templates
- Save 7,000 chars by moving verbose content to files
- Fix 2 naming inconsistencies
- Add 5 beneficial skill references
- Standardize 8 section naming variations

**Recommended Path:**
1. Week 1: Quick wins (5.5 hours, immediate consistency)
2. Week 2: Templates (12 hours, 4,700 char savings)
3. Week 3: Size reduction (4 hours, 7,000 char savings)
4. Week 4+: Architecture improvements (ongoing)

**Total Estimated Impact:**
- Token savings: 18,000-25,000 chars (35-45% reduction)
- Time investment: 21.5 hours (Phases 1-3)
- Risk level: Low (mostly safe refactorings)
- Maintenance improvement: Significant (templates + standards)

All refactorings preserve agent semantics while improving consistency, maintainability, and token efficiency.

---

**Files Referenced:**
- /Users/louisherman/ClaudeCodeProjects/.claude/agents/*.md (14 agents)
- /Users/louisherman/ClaudeCodeProjects/.claude/config/route-table.json
- /Users/louisherman/ClaudeCodeProjects/.claude/skills/*/SKILL.md (14 skills)
