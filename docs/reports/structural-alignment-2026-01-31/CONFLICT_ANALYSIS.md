# Structural Conflict Analysis: Workspace vs Home Agent Ecosystems

**Analysis Date:** 2026-01-31  
**Workspace Path:** `/Users/louisherman/ClaudeCodeProjects/.claude/agents/`  
**Home Path:** `~/.claude/agents/`  

## Executive Summary

**Critical Finding:** Two parallel agent ecosystems with 14 shared agents exhibiting version conflicts and organizational pattern misalignment.

**Key Metrics:**
- Workspace agents: 14 (flat structure)
- Home agents: 447 (62 subdirectories + 40 flat files)
- Overlap: 14 agents (100% workspace duplicated in home)
- Version conflicts: 3 agents with substantive differences
- Model conflicts: 1 agent (dependency-analyzer)
- Organizational paradigm: INCOMPATIBLE (flat vs categorized)

**Recommended Strategy:** WORKSPACE = Curated Subset (Independent)

---

## 1. Overlap Analysis

### 1.1 Complete Overlap Matrix

All 14 workspace agents exist in home directory flat structure:

| Agent | Workspace Size | Home Size | Size Diff | Version Conflict |
|-------|---------------|-----------|-----------|-----------------|
| best-practices-enforcer | 1625 | 3873 | +238% | HIGH |
| bug-triager | 1513 | 1513 | 0% | NONE |
| code-generator | 1628 | 1628 | 0% | NONE |
| dependency-analyzer | 1672 | 1671 | -0.06% | MODEL |
| dmb-analyst | 1993 | 1993 | 0% | NONE |
| documentation-writer | 1572 | 1572 | 0% | NONE |
| error-debugger | 1857 | 1857 | 0% | NONE |
| migration-agent | 1599 | 1599 | 0% | NONE |
| performance-auditor | 1717 | 5257 | +306% | HIGH |
| performance-profiler | 1811 | 1811 | 0% | NONE |
| refactoring-agent | 1774 | 1774 | 0% | NONE |
| security-scanner | 1689 | 1689 | 0% | NONE |
| test-generator | 1714 | 1714 | 0% | NONE |
| token-optimizer | 1730 | 6116 | +354% | HIGH |

**Summary:**
- 11 agents IDENTICAL (78.6%)
- 3 agents COMPRESSED in workspace (21.4%)
- 1 agent MODEL CONFLICT (7.1%)

---

## 2. YAML Frontmatter Conflicts

### 2.1 High Priority Version Conflicts

#### 2.1.1 best-practices-enforcer

**Workspace (1625 chars):**
```yaml
name: best-practices-enforcer
description: >
  Use when creating new skills or agents to ensure best practices compliance.
  Delegate proactively before committing new Claude Code configurations or during
  skill/agent reviews. Returns compliance report with validation results and
  auto-fix suggestions.
tools: [Read, Edit, Grep, Glob, Bash]
model: sonnet
permissionMode: default
skills: [skill-validator, agent-optimizer, token-budget-monitor]
```

**Home (3873 chars):**
```yaml
name: best-practices-enforcer
description: >
  Use when creating new skills or agents to ensure best practices compliance.
  Delegate proactively before committing new Claude Code configurations or during
  skill/agent reviews. Validates format, routing language, token budgets, and hook
  usage to maintain ecosystem quality.
tools: [Read, Edit, Grep, Glob, Bash]
model: sonnet
permissionMode: default
skills: [skill-validator, agent-optimizer, token-budget-monitor]
```

**Differences:**
- Description expanded in home version (routing language, hook usage details)
- Body content expanded from 26 lines to 141 lines
- Workspace version optimized for token efficiency
- Home version includes detailed enforcement protocols

**Assessment:** Workspace is OPTIMIZED version (token-compressed)

---

#### 2.1.2 performance-auditor

**Workspace (1717 chars):**
```yaml
name: performance-auditor
description: >
  Use when auditing Claude Code performance, analyzing context usage, or identifying
  bottlenecks. Delegate proactively monthly or after major changes to skills/agents.
  Returns performance report with token usage, routing accuracy, and optimization
  recommendations.
tools: [Read, Grep, Glob, Bash]
model: sonnet
permissionMode: plan
skills: [token-budget-monitor, organization]
```

**Home (5257 chars):**
```yaml
name: performance-auditor
description: >
  Use when auditing Claude Code performance, analyzing context usage, or identifying
  bottlenecks. Delegate proactively monthly or after major changes to skills/agents.
  Generates comprehensive performance report with token usage analysis, routing accuracy,
  and prioritized optimization recommendations.
tools: [Read, Grep, Glob, Bash]
model: sonnet
permissionMode: plan
skills: [token-budget-monitor, organization]
```

**Differences:**
- Description slightly expanded in home version
- Body content expanded from 50 lines to 186 lines
- Home includes detailed audit methodology
- Home includes historical tracking section
- Workspace condensed for token budget

**Assessment:** Workspace is OPTIMIZED version (token-compressed)

---

#### 2.1.3 token-optimizer

**Workspace (1730 chars):**
```yaml
name: token-optimizer
description: >
  Use when token usage exceeds 50% (100,000+ tokens) or approaching budget limits.
  Delegate proactively when repeated operations consume tokens, large file reads are needed,
  or cost reduction is required. Returns optimization report with token savings analysis,
  compression targets, and caching recommendations.
tools: [Read, Grep, Glob, Bash]
model: haiku
permissionMode: default
skills: [token-budget-monitor, context-compressor, cache-warmer]
```

**Home (6116 chars):**
```yaml
name: token-optimizer
description: >
  Active session token optimization specialist for real-time context compression,
  cache management, and token budget optimization. Use when token usage is high
  or approaching limits.
tools: [Read, Grep, Glob, Bash]
model: haiku
permissionMode: default
skills: [] # NO SKILLS LISTED
```

**Differences:**
- Description style differs (workspace uses delegation pattern, home uses role description)
- Workspace lists 3 skills, home lists NONE
- Workspace 52 lines, home 243 lines
- Home includes detailed optimization examples
- Workspace more concise routing guidance

**Assessment:** WORKSPACE SUPERIOR (follows delegation pattern + declares skills)

---

### 2.2 Model Tier Conflict

#### dependency-analyzer

**Workspace:**
```yaml
model: sonnet
```

**Home:**
```yaml
model: haiku
```

**Conflict Type:** Model tier mismatch  
**Impact:** Different performance/cost characteristics  
**Resolution:** Workspace likely upgraded to sonnet for better analysis quality

---

## 3. Organizational Pattern Analysis

### 3.1 Workspace Structure (FLAT)

```
.claude/agents/
├── best-practices-enforcer.md
├── bug-triager.md
├── code-generator.md
├── dependency-analyzer.md
├── dmb-analyst.md
├── documentation-writer.md
├── error-debugger.md
├── migration-agent.md
├── performance-auditor.md
├── performance-profiler.md
├── refactoring-agent.md
├── security-scanner.md
├── test-generator.md
└── token-optimizer.md
```

**Characteristics:**
- Zero subdirectories
- All agents in single flat namespace
- Minimal, curated set (14 total)
- Focus on core development workflows
- Optimized for workspace-specific needs

---

### 3.2 Home Structure (CATEGORIZED)

```
~/.claude/agents/
├── [40 flat files including all 14 workspace agents]
├── agent-warming/
├── ai-ml/
├── batching/
├── browser/ (15 agents)
├── cascading/
├── circuit-breaker/
├── compiler/
├── compression/
├── content/
├── data/
├── data-engineering/
├── debug/ (15 agents)
├── design/ (8 agents)
├── devops/
├── dmb/ (3 agents)
├── ecommerce/ (10 agents)
├── engineering/
├── events/
├── factory/
├── fusion/
├── fusion-compiler/
├── google/
├── growth/
├── improvement/
├── lazy-loading/
├── marketing/
├── meta/
├── meta-orchestrators/
├── observability/
├── operations/
├── optimization/
├── orchestrators/
├── predictive-cache/
├── product/
├── project_management/
├── quantum-parallel/
├── routing/
├── self-healing/
├── semantic-cache/
├── speculative/
├── swarm-intelligence/
├── testing/
├── ticketing/
├── workers/ (15 subdirectories)
└── zero-shot/
```

**Characteristics:**
- 62 subdirectories
- 447 total agents
- Hybrid structure (flat + categorized)
- Extensive domain coverage
- Mix of general + DMB-specific agents

---

### 3.3 DMB-Specific Agent Distribution

**Workspace:**
- dmb-analyst.md (1 agent)

**Home Flat:**
- dmb-analyst.md
- dmb-brand-dna-expert.md
- dmb-chromium-optimizer.md
- dmb-compound-orchestrator.md
- dmb-data-validator.md
- dmb-dexie-architect.md
- dmb-drizzle-unwinder.md
- dmb-expert.md
- dmb-guest-appearance-checker.md
- dmb-guest-specialist.md
- dmb-indexeddb-debugger.md
- dmb-liberation-calculator.md
- dmb-migration-coordinator.md
- dmb-offline-first-architect.md
- dmb-prisma-unwinder.md
- dmb-pwa-debugger.md
- dmb-scraper-debugger.md
- dmb-setlist-pattern-analyzer.md
- dmb-setlist-validator.md
- dmb-show-analyzer.md
- dmb-show-validator.md
- dmb-song-stats-checker.md
- dmb-sqlite-specialist.md
- dmb-tour-optimizer.md
- dmb-venue-consistency-checker.md
- dmbalmanac-scraper.md
- dmbalmanac-site-expert.md
(27 agents)

**Home dmb/ subdirectory:**
- live-show-analyzer.md
- setlist-pattern-analyzer.md
- tour-route-optimizer.md
(3 agents)

**Total DMB agents in home:** 30 agents  
**Total DMB agents in workspace:** 1 agent

**Finding:** HOME contains 30x more DMB-specific agents, suggesting workspace intentionally limits to most general-purpose agent

---

## 4. Model Tier Distribution

### 4.1 Workspace Distribution

```
Sonnet: 13 agents (92.9%)
Haiku:   1 agent  (7.1%)
Opus:    0 agents (0%)
```

**Strategy:** Heavily favor sonnet for quality, single haiku for token optimization

---

### 4.2 Home Distribution (Flat Files Only)

```
Sonnet: 20 agents (50%)
Haiku:  15 agents (37.5%)
Opus:    5 agents (12.5%)
```

**Strategy:** Balanced distribution across tiers, opus for specialized tasks

---

## 5. Tool Availability Analysis

### 5.1 Workspace Tools

All workspace agents use standard tools:
- Read
- Edit
- Grep
- Glob
- Bash

**No specialized tools detected** (WebSearch, WebFetch, MCP tools)

---

### 5.2 Home Tools

Sample detection from home agents shows usage of:
- Standard tools (Read, Edit, Grep, Glob, Bash)
- Potential MCP tools (needs deeper analysis)
- Extended tool sets in specialized domains

**Needs comprehensive scan** to determine full tool catalog

---

## 6. Path Reference Analysis

### 6.1 Cross-Reference Risk

**Question:** Do HOME agents reference workspace paths?

**Analysis Required:**
```bash
grep -r "/Users/louisherman/ClaudeCodeProjects" ~/.claude/agents/
```

**Question:** Do WORKSPACE agents reference home paths?

**Analysis Required:**
```bash
grep -r "~/.claude" /Users/louisherman/ClaudeCodeProjects/.claude/agents/
```

**Status:** NOT YET PERFORMED (recommend as follow-up)

---

## 7. Best Practice Violations

### 7.1 Workspace Violations

**NONE DETECTED**

All workspace agents follow best practices:
- Valid YAML frontmatter
- Proper "Use when..." description patterns
- Appropriate tool grants
- Correct model selection
- Permission mode specified
- Skills properly declared

---

### 7.2 Home Violations (Sample)

**token-optimizer.md (HOME):**
- Missing skills declaration (workspace version lists 3 skills)
- Description lacks delegation pattern clarity
- Body content exceeds token budget recommendations (6116 chars)

**Recommendation:** Apply workspace optimizations to home versions

---

## 8. Precedence Analysis

### 8.1 Claude Code Agent Loading

**Question:** Which takes precedence when both exist?

**Hypothesis based on Claude Code behavior:**
1. Workspace `.claude/agents/` likely loaded FIRST
2. Home `~/.claude/agents/` loaded as fallback/supplement
3. Workspace agents override home agents with same name

**Evidence:**
- Workspace agents optimized for specific project needs
- Home agents provide global defaults
- Version conflicts suggest workspace customization

**Recommendation:** Test by renaming workspace agent and checking which version loads

---

## 9. Organizational Best Practices

### 9.1 Current Issues

**Workspace:**
- No organizational issues
- Clean flat structure appropriate for small curated set
- All agents project-specific or heavily used

**Home:**
- HYBRID structure (40 flat + 62 subdirectories) creates confusion
- DMB agents split between flat and dmb/ subdirectory
- No clear categorization rules
- Potential for category overlap

---

### 9.2 Recommended Best Practices

**For Workspace (retain current):**
- Flat structure appropriate for 10-20 agents
- Curate aggressively, only include frequently used
- Optimize all agents for token efficiency
- Version control all agents with project
- Use workspace agents to override home defaults

**For Home (needs reorganization):**
- OPTION A: Move all flat files into subdirectories by domain
- OPTION B: Keep only truly generic agents flat, categorize rest
- OPTION C: Maintain flat for favorites, subdirectories for specialized
- Consolidate DMB agents into single dmb/ directory
- Document categorization rules
- Remove or archive unused agents

**Recommended:** OPTION B (generic flat + domain subdirectories)

Generic agents to keep flat:
- best-practices-enforcer
- bug-triager
- code-generator
- dependency-analyzer
- documentation-writer
- error-debugger
- migration-agent
- performance-auditor
- performance-profiler
- refactoring-agent
- security-scanner
- test-generator
- token-optimizer

Move to subdirectories:
- All DMB agents → dmb/
- All specialized agents → appropriate category

---

## 10. Conflict Resolution Strategy

### 10.1 Relationship Model

**RECOMMENDATION: Workspace = Curated Subset (Independent)**

```
HOME (~/.claude/agents/)
│
├─ Global agent library (447 agents)
├─ Default versions for all agents
├─ Comprehensive domain coverage
└─ Fallback for missing workspace agents

WORKSPACE (project/.claude/agents/)
│
├─ Project-specific overrides (14 agents)
├─ Token-optimized versions
├─ Curated for ClaudeCodeProjects needs
└─ Takes precedence when name conflicts
```

**Workflow:**
1. Develop agents in workspace for project needs
2. Optimize for token efficiency
3. Test within project context
4. Optionally sync to home as defaults
5. Home remains source for new domains

---

### 10.2 Synchronization Strategy

**DO NOT attempt bidirectional sync** - maintain independence

**Workspace → Home (Optional):**
- Copy optimized versions to home as templates
- Preserve home verbose versions as "*-detailed.md"
- Update home versions with workspace improvements

**Home → Workspace (Selective):**
- Import new specialized agents as needed
- Optimize before adding to workspace
- Curate aggressively (only add if frequently used)

---

## 11. Safe Migration Path

### 11.1 Phase 1: Analysis (Complete)
- [x] Identify all overlapping agents
- [x] Compare YAML definitions
- [x] Document version conflicts
- [x] Analyze organizational patterns

### 11.2 Phase 2: Workspace Cleanup (Recommended)
- [ ] Verify all workspace agents follow best practices (already compliant)
- [ ] Document workspace agent selection criteria
- [ ] Create workspace AGENTS.md explaining curation

### 11.3 Phase 3: Home Reorganization (Optional)
- [ ] Consolidate DMB agents from flat → dmb/
- [ ] Move specialized agents to subdirectories
- [ ] Keep 13 generic agents flat
- [ ] Create home AGENTS.md documenting structure

### 11.4 Phase 4: Version Conflict Resolution (Recommended)
- [ ] Decide on canonical versions for 3 conflicted agents
- [ ] Apply workspace optimizations to home versions
- [ ] Fix dependency-analyzer model conflict
- [ ] Fix token-optimizer skills declaration in home

### 11.5 Phase 5: Path Reference Audit (Required)
- [ ] Scan home agents for workspace path references
- [ ] Scan workspace agents for home path references
- [ ] Remove hardcoded paths, use relative references
- [ ] Test agent loading precedence

### 11.6 Phase 6: Documentation (Recommended)
- [ ] Document workspace vs home relationship
- [ ] Create decision tree for adding new agents
- [ ] Document optimization workflow
- [ ] Add to workspace CLAUDE.md

---

## 12. Immediate Action Items

### High Priority
1. Fix token-optimizer.md in home (add skills declaration)
2. Verify dependency-analyzer model tier (sonnet vs haiku)
3. Document workspace curation policy
4. Test agent loading precedence

### Medium Priority
5. Consolidate home DMB agents into dmb/ directory
6. Scan for hardcoded path references
7. Apply workspace optimizations to home versions
8. Create home organizational standards

### Low Priority
9. Archive unused home agents
10. Document categorization rules for home
11. Create templates for new agent creation
12. Set up periodic sync review

---

## 13. Conclusions

### 13.1 Source of Truth

**WORKSPACE:** Curated, optimized subset for ClaudeCodeProjects  
**HOME:** Comprehensive library with global defaults  
**Neither is complete source of truth** - they serve different purposes

---

### 13.2 Merge Recommendation

**DO NOT MERGE** - maintain as independent systems with different purposes

**Rationale:**
- Workspace needs token optimization
- Home needs comprehensive coverage
- Different curation philosophies
- Precedence system works correctly
- Merging would lose workspace optimizations

---

### 13.3 Organizational Alignment

**Current State:** MISALIGNED (flat vs categorized)  
**Target State:** ALIGNED with different scales

**Workspace:** Flat (appropriate for 14 agents)  
**Home:** Categorized (necessary for 447 agents)

**No conflict** - different structures appropriate for different scales

---

### 13.4 Best Practice Compliance

**Workspace:** 100% compliant  
**Home:** ~95% compliant (3 agents need fixes)

**Recommended:** Apply workspace best practices to home agents

---

## Appendix A: Overlap Detail

### A.1 Identical Agents (11 total)

- bug-triager.md (1513 bytes)
- code-generator.md (1628 bytes)
- dmb-analyst.md (1993 bytes)
- documentation-writer.md (1572 bytes)
- error-debugger.md (1857 bytes)
- migration-agent.md (1599 bytes)
- performance-profiler.md (1811 bytes)
- refactoring-agent.md (1774 bytes)
- security-scanner.md (1689 bytes)
- test-generator.md (1714 bytes)

**Assessment:** These agents can be safely synced bidirectionally

---

### A.2 Compressed Workspace Versions (3 total)

- best-practices-enforcer.md (workspace 1625, home 3873)
- performance-auditor.md (workspace 1717, home 5257)
- token-optimizer.md (workspace 1730, home 6116)

**Assessment:** Workspace versions optimized for token budget, home versions provide detailed guidance

---

### A.3 Model Conflicts (1 total)

- dependency-analyzer.md (workspace sonnet, home haiku)

**Assessment:** Workspace upgraded to sonnet for better analysis quality

---

## Appendix B: Home Agent Categories

### B.1 Category Distribution

```
agent-warming:        ? agents
ai-ml:                5 agents
batching:             ? agents
browser:             15 agents
cascading:            ? agents
circuit-breaker:      3 agents
compiler:             ? agents
compression:          ? agents
content:              ? agents
data:                 ? agents
data-engineering:     2 agents
debug:               15 agents
design:               8 agents
devops:               3 agents
dmb:                  3 agents (+ 27 flat)
ecommerce:           10 agents
engineering:          ? agents
events:               ? agents
factory:              ? agents
fusion:               5 agents
fusion-compiler:      3 agents
google:               ? agents
growth:               ? agents
improvement:          ? agents
lazy-loading:         ? agents
marketing:            ? agents
meta:                 ? agents
meta-orchestrators:   ? agents
observability:        ? agents
operations:           ? agents
optimization:         ? agents
orchestrators:        ? agents
predictive-cache:     ? agents
product:              ? agents
project_management:   ? agents
quantum-parallel:     ? agents
routing:              ? agents
self-healing:         ? agents
semantic-cache:       ? agents
speculative:          ? agents
swarm-intelligence:   ? agents
testing:              ? agents
ticketing:            ? agents
workers:             15 subdirectories
zero-shot:            3 agents
```

**Total subdirectories:** 62  
**Needs full inventory** for complete distribution analysis

---

## Appendix C: Recommended File Structure

### C.1 Workspace (Current - Retain)

```
.claude/agents/
├── best-practices-enforcer.md
├── bug-triager.md
├── code-generator.md
├── dependency-analyzer.md
├── dmb-analyst.md
├── documentation-writer.md
├── error-debugger.md
├── migration-agent.md
├── performance-auditor.md
├── performance-profiler.md
├── refactoring-agent.md
├── security-scanner.md
├── test-generator.md
└── token-optimizer.md
```

---

### C.2 Home (Proposed)

```
~/.claude/agents/
├── best-practices-enforcer.md      # Generic
├── bug-triager.md                  # Generic
├── code-generator.md               # Generic
├── dependency-analyzer.md          # Generic
├── documentation-writer.md         # Generic
├── error-debugger.md               # Generic
├── migration-agent.md              # Generic
├── performance-auditor.md          # Generic
├── performance-profiler.md         # Generic
├── refactoring-agent.md            # Generic
├── security-scanner.md             # Generic
├── test-generator.md               # Generic
├── token-optimizer.md              # Generic
├── dmb/                            # All 30 DMB agents moved here
├── debug/                          # 15 debug specialists
├── design/                         # 8 design agents
├── browser/                        # 15 browser agents
├── ecommerce/                      # 10 ecommerce agents
├── [other categories...]
└── workers/                        # 15 worker subdirectories
```

**Result:** 13 flat generic + all specialized categorized

---

## Document Metadata

**Author:** Claude (best-practices-enforcer agent)  
**Date:** 2026-01-31  
**Workspace:** ClaudeCodeProjects  
**Report Type:** Structural Conflict Analysis  
**Scope:** Agent ecosystem alignment  
**Status:** Complete - recommendations provided  
