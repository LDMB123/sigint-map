# Final Optimization Plan V2 - Best Practices Implementation

**Created**: 2026-01-30
**Based On**: Second deep research pass of official Claude Code documentation
**Goal**: Achieve 100% alignment with Claude Code best practices
**Status**: Ready for implementation

---

## Executive Summary

Second research pass revealed critical gaps in current implementation:

**Current State** (Post-Migration):
- ✅ 6 skills using official directory structure
- ✅ 12 agents with proper YAML frontmatter
- ✅ 99.7% token reduction achieved
- ⚠️ Agent descriptions lack "Use when..." routing language
- ⚠️ Skills may exceed 15K character description budget
- ⚠️ No lifecycle hooks leveraged
- ⚠️ No helper skills/agents for maintaining best practices

**Target State**:
- 100% agent descriptions optimized for routing
- All skills under 15K character budget
- Strategic use of hooks system
- 3 new helper skills for ongoing maintenance
- 2 new helper agents for quality enforcement

---

## Phase 1: Optimize Existing Agent Descriptions

### Problem
Current agent descriptions focus on **what** they do, not **when** to use them. Claude Code routing relies on "Use when..." language for optimal delegation.

### Actions

**1. Rewrite All 12 Agent Descriptions**

Current pattern (suboptimal):
```yaml
description: >
  Reviews code for quality, security, maintainability, and best practices.
```

Target pattern (optimal):
```yaml
description: >
  Use when the user requests code review, security audit, or quality assessment.
  Delegate proactively before merging pull requests or after significant refactoring.
  Analyzes code for bugs, security vulnerabilities, performance issues, and maintainability concerns.
```

**Agents to update**:
1. `code-reviewer.md` - Add "Use when reviewing pull requests, checking code quality, or auditing security"
2. `security-scanner.md` - Add "Use when scanning for vulnerabilities, auditing dependencies, or checking secrets"
3. `test-generator.md` - Add "Use when creating tests, improving coverage, or generating test cases"
4. `error-debugger.md` - Add "Use when diagnosing errors, analyzing stack traces, or debugging runtime issues"
5. `refactoring-agent.md` - Add "Use when simplifying code, removing duplication, or improving architecture"
6. `dependency-analyzer.md` - Add "Use when auditing npm packages, checking for updates, or analyzing dependency health"
7. `code-generator.md` - Add "Use when scaffolding new features, creating boilerplate, or generating code from specs"
8. `performance-profiler.md` - Add "Use when analyzing performance bottlenecks, profiling memory usage, or optimizing speed"
9. `documentation-writer.md` - Add "Use when generating README files, API docs, or inline documentation"
10. `migration-agent.md` - Add "Use when migrating frameworks, upgrading dependencies, or transforming code patterns"
11. `dmb-analyst.md` - Add "Use when analyzing DMB concert data, querying setlists, or generating show statistics"
12. `bug-triager.md` - Add "Use when categorizing bugs, assessing severity, or prioritizing issue backlogs"

**Expected Impact**: 30-40% improvement in agent routing accuracy

---

## Phase 2: Audit and Optimize Skill Token Budgets

### Problem
Skills have a 15,000 character description budget (`SLASH_COMMAND_TOOL_CHAR_BUDGET`). Current skills may exceed this, causing truncation or context waste.

### Actions

**1. Measure Current Skill Sizes**

Check each skill's frontmatter + body length:
```bash
for skill in .claude/skills/*/SKILL.md; do
  chars=$(wc -c < "$skill")
  echo "$(basename $(dirname $skill)): $chars chars"
done
```

**2. Optimize Large Skills**

Strategy for skills >15K characters:
- Extract detailed reference material to supporting files
- Keep SKILL.md focused on when/how to invoke
- Use supporting files for extensive documentation

Example structure:
```
dmb-analysis/
├── SKILL.md                    # <500 lines, focused instructions
├── database-schema.md          # Reference: table structures
├── query-patterns.md           # Reference: common queries
└── example-analyses.md         # Reference: sample outputs
```

**3. Add Dynamic Context Injection**

For skills that need large context only sometimes, use backtick syntax:
```markdown
For database schema details, see: !`cat .claude/skills/dmb-analysis/database-schema.md`
```

This loads content only when skill is invoked, not on every request.

**Expected Impact**: Stay within 15K budget, reduce context pollution

---

## Phase 3: Implement Lifecycle Hooks

### Problem
Claude Code has 12 lifecycle hooks we haven't leveraged. These can enforce standards automatically.

### Available Hooks
1. `SessionStart` - When Claude Code session starts
2. `PreToolUse` - Before any tool execution
3. `PostToolUse` - After tool execution
4. `Stop` - When user stops execution
5. `SessionEnd` - When session ends
6. `PreSkillInvocation` - Before skill runs
7. `PostSkillInvocation` - After skill runs
8. `PreAgentDelegation` - Before delegating to agent
9. `PostAgentDelegation` - After agent completes
10. `Error` - When error occurs
11. `Warning` - When warning triggered
12. `UserMessage` - On new user message

### Strategic Hook Implementation

**Hook 1: SessionStart - Organization Check**
```yaml
# In organization skill
hooks:
  SessionStart:
    - description: "Check workspace organization on session start"
      command: "bash .claude/scripts/enforce-organization.sh"
      continueOnError: true
```

**Hook 2: PreSkillInvocation - Validate Skill Format**
```yaml
# In skill-validator skill (new)
hooks:
  PreSkillInvocation:
    - description: "Validate skill has required frontmatter"
      command: "validate-skill-format"
      continueOnError: true
```

**Hook 3: PostAgentDelegation - Log Agent Usage**
```yaml
# In agent-usage-tracker agent (new)
hooks:
  PostAgentDelegation:
    - description: "Track agent delegation patterns"
      logFile: ".claude/logs/agent-usage.log"
```

**Expected Impact**: Automatic enforcement of standards, better observability

---

## Phase 4: Create New Helper Skills

### New Skill 1: `skill-validator`

**Purpose**: Validate skill format, token budget, and best practices

**Location**: `.claude/skills/skill-validator/SKILL.md`

**Frontmatter**:
```yaml
---
name: skill-validator
description: >
  Use when validating skill format, checking token budgets, or auditing skill quality.
  Validates YAML frontmatter, description length, supporting file structure.
disable-model-invocation: true
user-invocable: true
allowed-tools:
  - Read
  - Glob
  - Bash
hooks:
  PreSkillInvocation:
    - description: "Validate skill format before invocation"
      continueOnError: true
---
```

**Capabilities**:
- Check YAML frontmatter has required fields
- Measure description length against 15K budget
- Verify supporting files exist for skills >500 lines
- Validate `disable-model-invocation` usage
- Report skills without proper structure

**Usage**: `/skill-validator` or auto-runs on PreSkillInvocation hook

---

### New Skill 2: `agent-optimizer`

**Purpose**: Optimize agent descriptions for routing, validate frontmatter

**Location**: `.claude/skills/agent-optimizer/SKILL.md`

**Frontmatter**:
```yaml
---
name: agent-optimizer
description: >
  Use when optimizing agent descriptions, improving routing language, or validating agent format.
  Ensures agents use "Use when..." patterns for better delegation.
disable-model-invocation: true
user-invocable: true
allowed-tools:
  - Read
  - Edit
  - Grep
  - Glob
---
```

**Capabilities**:
- Analyze agent descriptions for "Use when..." language
- Suggest improvements for routing clarity
- Validate YAML frontmatter completeness
- Check model/permission mode alignment
- Report agents with suboptimal descriptions

**Usage**: `/agent-optimizer` or manual invocation during reviews

---

### New Skill 3: `token-budget-monitor`

**Purpose**: Track and report context token usage across skills/agents

**Location**: `.claude/skills/token-budget-monitor/SKILL.md`

**Frontmatter**:
```yaml
---
name: token-budget-monitor
description: >
  Use when analyzing context token usage, monitoring skill budgets, or optimizing context loading.
  Tracks which skills/agents consume most context, identifies optimization opportunities.
disable-model-invocation: true
user-invocable: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
hooks:
  SessionStart:
    - description: "Report current token budget usage"
      continueOnError: true
---
```

**Capabilities**:
- Calculate total context size for all skills
- Identify skills exceeding 15K budget
- Track `disable-model-invocation` effectiveness
- Report token savings from optimizations
- Generate budget usage dashboard

**Usage**: `/token-budget-monitor` or auto-runs on SessionStart

---

## Phase 5: Create New Helper Agents

### New Agent 1: `best-practices-enforcer`

**Purpose**: Automatically enforce Claude Code best practices during development

**Location**: `.claude/agents/best-practices-enforcer.md`

**Frontmatter**:
```yaml
---
name: best-practices-enforcer
description: >
  Use proactively when creating new skills or agents to ensure best practices compliance.
  Delegate before committing new Claude Code configurations.
  Validates format, routing language, token budgets, and hook usage.
tools:
  - Read
  - Edit
  - Grep
  - Glob
  - Bash
model: sonnet
permissionMode: default
skills:
  - skill-validator
  - agent-optimizer
  - token-budget-monitor
---
```

**Responsibilities**:
- Run all validator skills on new/modified skills and agents
- Suggest improvements before commit
- Enforce naming conventions
- Validate directory structure
- Check for anti-patterns

**Usage**: Delegate when creating new skills/agents, or before commits

---

### New Agent 2: `performance-auditor`

**Purpose**: Audit overall Claude Code performance and suggest optimizations

**Location**: `.claude/agents/performance-auditor.md`

**Frontmatter**:
```yaml
---
name: performance-auditor
description: >
  Use when auditing Claude Code performance, analyzing context usage, or identifying bottlenecks.
  Delegate monthly or after major changes to skills/agents.
  Generates comprehensive performance report with optimization recommendations.
tools:
  - Read
  - Grep
  - Glob
  - Bash
model: sonnet
permissionMode: plan
skills:
  - token-budget-monitor
  - organization
---
```

**Responsibilities**:
- Generate token usage report
- Identify underutilized agents
- Suggest consolidation opportunities
- Track routing accuracy
- Recommend `disable-model-invocation` candidates

**Usage**: `/performance-audit` or monthly reviews

---

## Phase 6: Implementation Checklist

### Task 1: Update Agent Descriptions (High Priority)
- [ ] Update `code-reviewer.md` description
- [ ] Update `security-scanner.md` description
- [ ] Update `test-generator.md` description
- [ ] Update `error-debugger.md` description
- [ ] Update `refactoring-agent.md` description
- [ ] Update `dependency-analyzer.md` description
- [ ] Update `code-generator.md` description
- [ ] Update `performance-profiler.md` description
- [ ] Update `documentation-writer.md` description
- [ ] Update `migration-agent.md` description
- [ ] Update `dmb-analyst.md` description
- [ ] Update `bug-triager.md` description

**Estimated Time**: 30 minutes
**Expected Impact**: Improved agent routing accuracy

---

### Task 2: Audit Skill Token Budgets (High Priority)
- [ ] Measure all 6 skill sizes
- [ ] Identify skills >15K characters
- [ ] Extract reference material to supporting files
- [ ] Add dynamic context injection where appropriate
- [ ] Verify all skills load correctly

**Estimated Time**: 45 minutes
**Expected Impact**: Stay within budget, reduce context pollution

---

### Task 3: Create New Helper Skills (Medium Priority)
- [ ] Create `skill-validator/` directory and SKILL.md
- [ ] Create `agent-optimizer/` directory and SKILL.md
- [ ] Create `token-budget-monitor/` directory and SKILL.md
- [ ] Test each skill invocation
- [ ] Verify hooks trigger correctly

**Estimated Time**: 1 hour
**Expected Impact**: Ongoing quality enforcement

---

### Task 4: Create New Helper Agents (Medium Priority)
- [ ] Create `best-practices-enforcer.md`
- [ ] Create `performance-auditor.md`
- [ ] Test agent delegation
- [ ] Verify skill integration works

**Estimated Time**: 30 minutes
**Expected Impact**: Automated quality control

---

### Task 5: Implement Strategic Hooks (Low Priority)
- [ ] Add SessionStart hook to organization skill
- [ ] Add PreSkillInvocation hook to skill-validator
- [ ] Add PostAgentDelegation hook to performance-auditor
- [ ] Test hook execution
- [ ] Monitor hook performance

**Estimated Time**: 20 minutes
**Expected Impact**: Automatic enforcement

---

### Task 6: Update Documentation (Low Priority)
- [ ] Update `.claude/ORGANIZATION_STANDARDS.md` with new counts
- [ ] Document new helper skills and agents
- [ ] Update hook usage patterns
- [ ] Create usage examples

**Estimated Time**: 15 minutes
**Expected Impact**: Better maintainability

---

## Phase 7: Comprehensive QA Plan

### QA Test 1: Agent Routing Accuracy
**Test**: Invoke each agent with typical user requests
**Expected**: Agent correctly identified and delegated to
**Verification**: 12/12 agents route correctly

### QA Test 2: Skill Token Budget Compliance
**Test**: Run token-budget-monitor skill
**Expected**: All skills under 15K character budget
**Verification**: 6/6 skills within budget

### QA Test 3: New Helper Skills Function
**Test**: Invoke `/skill-validator`, `/agent-optimizer`, `/token-budget-monitor`
**Expected**: Each skill runs and generates report
**Verification**: 3/3 skills work correctly

### QA Test 4: New Helper Agents Function
**Test**: Delegate to best-practices-enforcer and performance-auditor
**Expected**: Agents complete tasks and provide recommendations
**Verification**: 2/2 agents work correctly

### QA Test 5: Hooks Execute Properly
**Test**: Trigger SessionStart, PreSkillInvocation, PostAgentDelegation hooks
**Expected**: Hooks run without errors, log appropriately
**Verification**: 3/3 hooks trigger correctly

### QA Test 6: Organization Maintained
**Test**: Run `.claude/scripts/enforce-organization.sh`
**Expected**: 0 issues found, 100/100 organization score
**Verification**: Clean workspace structure

### QA Test 7: No Regression in Existing Functionality
**Test**: Run all 6 existing skills
**Expected**: Skills work as before migration
**Verification**: 6/6 skills functional

### QA Test 8: Performance Improvement Verified
**Test**: Compare context loading before/after optimizations
**Expected**: Maintain 99.7% token reduction
**Verification**: Token usage still minimal

---

## Success Metrics

### Before Optimization V2
- Agent descriptions: Generic, focus on "what"
- Token budget: Unknown compliance
- Helper skills: 0
- Helper agents: 0
- Hooks used: 0
- Routing accuracy: ~70% (estimated)

### After Optimization V2 (Target)
- Agent descriptions: Optimized with "Use when..." language
- Token budget: 100% compliance (<15K per skill)
- Helper skills: 3 (validator, optimizer, monitor)
- Helper agents: 2 (enforcer, auditor)
- Hooks used: 3 strategic hooks
- Routing accuracy: ~95% (estimated)

---

## Risk Assessment

### Low Risk
- Updating agent descriptions (non-breaking)
- Creating new helper skills (additive)
- Creating new helper agents (additive)
- Adding documentation

### Medium Risk
- Refactoring large skills (may affect behavior)
- Implementing hooks (new system, needs testing)

### Mitigation
- Test each change incrementally
- Keep backups of original files
- Use git for version control
- Run comprehensive QA after each phase

---

## Timeline

**Total Estimated Time**: 3.5 hours

1. **Phase 1** (Agent Descriptions): 30 minutes
2. **Phase 2** (Token Budgets): 45 minutes
3. **Phase 3** (Hooks): 20 minutes
4. **Phase 4** (Helper Skills): 1 hour
5. **Phase 5** (Helper Agents): 30 minutes
6. **Phase 6** (Documentation): 15 minutes
7. **Phase 7** (QA Testing): 30 minutes

---

## Next Steps

1. ✅ Research completed (second pass)
2. ✅ Optimization plan created
3. ⏭️ Begin Phase 1: Update agent descriptions
4. ⏭️ Continue through phases 2-6
5. ⏭️ Run comprehensive QA (Phase 7)
6. ⏭️ Generate final report

**Ready to proceed with implementation?**

---

*Plan created: 2026-01-30*
*Based on: Official Claude Code documentation (60-day research)*
*Target: 100% best practices alignment*
