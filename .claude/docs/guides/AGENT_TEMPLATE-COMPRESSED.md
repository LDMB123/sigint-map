# Agent Template (Compressed)

> **Original**: AGENT_TEMPLATE.md (~662 lines, ~16KB)
> **Compressed**: ~150 lines, ~4KB
> **Ratio**: ~75% reduction
> **Date**: 2026-02-02
> **Full details**: See AGENT_TEMPLATE.md

---

## 1. YAML Frontmatter

```yaml
---
name: kebab-case-name
version: 1.0.0
tier: haiku | sonnet | opus
description: One sentence, singular purpose

platform: apple-silicon-m-series | multi-platform | platform-agnostic
os: macos-26.2 | multi-os
browser: chromium-143+ | multi-browser | not-applicable
node_version: "20.11+"

tools:
  - tool-name: brief description
skills:
  - skill-name: what it enables

collaborates-with:
  - agent-name: why/when
receives-from:
  - parent-agent: request types
delegates-to:
  - specialist-agent: trigger conditions

escalates-to: parent-orchestrator-name
escalation-criteria:
  - Exceeds capability scope
  - Human judgment required
  - Ethical boundaries unclear

requires-context:
  - previous-task-output
  - user-preferences
  - system-state

max-token-budget: 200000
expected-completion-time: seconds | minutes | hours
success-rate-target: 95%+
---
```

## 2. Required Sections

| Section | Key Rule |
|---------|----------|
| **Name** | Title case |
| **Purpose** | One sentence only, no "and" |
| **Philosophy Quote** | Steve Jobs or aligned creator |
| **Scope: MUST DO** | Specific, measurable checklist |
| **Scope: MUST NOT DO** | Explicit prohibitions |
| **Core Patterns** | 2-3 concrete Input->Process->Output examples |
| **Collaboration Contracts** | Receives-from, Delegates-to, Collaborates-with; specify format/timing/criteria |
| **Escalation Criteria** | Specific triggers: ambiguity, out-of-scope, conflicts, quality risk, resource limits, security |
| **Success Criteria** | Measurable: deliverable quality, accuracy, usability, maintainability, collaboration |
| **Quality Gates** | 5 gates: Input Validation -> Planning -> Execution -> Verification -> Delivery |

## 3. Tier Selection

| Tier | Model | Use Case | Tools | Tokens |
|------|-------|----------|-------|--------|
| **Haiku** | Haiku 4.5 | Validation, pattern matching, format checks | 1-2 | ~50-100 |
| **Sonnet** | Sonnet 4 | Implementation, docs, refactoring, features | 2-4 | ~100-200 |
| **Opus** | Opus 4.5 | Architecture, trade-offs, cross-system, strategy | 3-5 | ~200-400 |

**Quick decision tree**:
- Validation/format checking -> Haiku
- Writing/coding established patterns -> Sonnet
- Architectural/trade-off/novel problems -> Opus

## 4. Anti-Patterns

| # | Name | Problem | Fix |
|---|------|---------|-----|
| 1 | Hydra | Multi-purpose agent | Split into focused agents |
| 2 | Crystal Ball | Assumes context | Require explicit input |
| 3 | Perfectionist | Over-optimizes | Ship when criteria met |
| 4 | Lone Wolf | No delegation | Use collaboration contracts |
| 5 | Excuse Machine | Vague escalation | Include blocker + need + state |
| 6 | Assumption Bridge | No input validation | Validate before processing |
| 7 | Silent Failure | Unreported errors | Surface issues immediately |
| 8 | Feature Creep | Nice-to-have additions | Complete required task only |
| 9 | Handwaving Docs | Vague instructions | Explicit standards + examples |
| 10 | Callback Hell | Deep dependency chains | Max 2 levels, parallelize |

## 5. Creation Steps

1. Fill ALL frontmatter fields (no placeholders)
2. Define singular purpose in one sentence
3. Pick philosophy quote
4. Set MUST DO / MUST NOT DO boundaries
5. Write 2-3 core patterns
6. Write collaboration contracts (input/output/timing/criteria)
7. Define escalation triggers + actions
8. Write measurable success criteria
9. Define quality gates per phase
10. Review against anti-patterns

## 6. Certification Checklist

- Frontmatter: all fields specific, tier matches complexity, contracts have format, escalation specific
- Focus: purpose is one sentence (no "and"), features support purpose only, boundaries explicit
- Quality: criteria measurable, gates exist, error handling explicit, assumptions documented
- Collaboration: receives from parent, delegates to specialist, contracts specify format, escalation path clear
- Testing: core patterns tested, error cases tested, contracts tested, gates verified

## 7. Evolution Rules

- **Update when**: anti-pattern recurs across agents, tier guideline proves wrong, collaboration patterns change
- **Don't update for**: single agent violations, feature requests, convenience
