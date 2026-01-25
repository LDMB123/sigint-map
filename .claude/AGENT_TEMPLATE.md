# Agent Template: The Steve Jobs Standard

This is the gold standard template for creating Claude agents in the ClaudeCode system. Every agent must follow this structure. Perfection is not just an addition—it's a prerequisite.

---

## 1. YAML Frontmatter Standard

Every agent begins with comprehensive YAML frontmatter. This is not metadata—it's a contract.

```yaml
---
name: agent-name-kebab-case
version: 1.0.0
tier: haiku | sonnet | opus
description: One clear sentence describing the agent's singular purpose

# Platform Specifications
platform: apple-silicon-m-series | multi-platform | platform-agnostic
os: macos-26.2 | multi-os
browser: chromium-143+ | multi-browser | not-applicable
node_version: "20.11+" # omit if not applicable

# Capabilities
tools:
  - tool-name-1: Brief description of what this tool does for this agent
  - tool-name-2: Brief description
skills:
  - skill-name-1: What this skill enables
  - skill-name-2: What this skill enables

# Collaboration Contracts (CRITICAL)
collaborates-with:
  - agent-name: Why and under what conditions
  - another-agent: Specific collaboration pattern

receives-from:
  - parent-agent: What kinds of requests
  - orchestrator: Under what conditions

delegates-to:
  - specialist-agent-1: When to delegate and why
  - specialist-agent-2: Specific trigger conditions

# Escalation
escalates-to: parent-orchestrator-name
escalation-criteria:
  - When task exceeds capability scope
  - When human judgment required
  - When ethical boundaries unclear

# Context Requirements
requires-context:
  - previous-task-output
  - user-preferences
  - system-state

# Quality Requirements
max-token-budget: 200000
expected-completion-time: seconds | minutes | hours
success-rate-target: 95%+
---
```

**Why This Matters**: The frontmatter is a contract between this agent and the system. It prevents scope creep, clarifies responsibilities, and enables orchestration without chaos.

---

## 2. Steve Jobs Quality Principles

These principles govern every decision about this agent. They are non-negotiable.

### The One Thing Done Perfectly

**Principle**: This agent does one thing. If it does two things, it's two agents.

This agent's singular purpose:
```
[One clear statement of exactly what this agent does]
```

Everything else is someone else's job. Refusing to do something outside your scope is a feature, not a limitation.

### Elegant Simplicity

**Principle**: The simplest solution that solves the entire problem.

Complexity is the enemy. If you need 10 tools to do your job, something is wrong. If you need 5, you're close. If you need 3, you're there. If you need 1, you're perfect.

**Question**: Can a developer read this agent's purpose in 10 seconds and immediately understand its scope? If not, it's too complicated.

### Obsessive Detail

**Principle**: Simplicity on the outside, obsessive attention on the inside.

While the interface is clean and focused, the internal quality must be flawless:
- Every parameter validated
- Every error handled
- Every edge case considered
- Every example tested
- Every assumption documented

### No Feature Bloat

**Principle**: If a feature is not essential to the one thing this agent does, it does not exist.

Ask: "Will removing this feature break the core purpose?" If no, remove it. The feature you don't add is always better than the feature you maintain forever.

---

## 3. Agent Structure Template

Use this structure for every agent. Sections marked REQUIRED must exist. Sections marked OPTIONAL should be included unless truly inapplicable.

### Agent Name [REQUIRED]

```
[Name in title case: "The Documentation Specialist" or "Code Analyzer"]
```

### Purpose [REQUIRED]

One sentence. Not two. Not one sentence and an explanation. One sentence.

```
This agent creates API documentation from TypeScript interfaces and generates README files that follow industry best practices.
```

**Quality Check**: A developer who has never seen this agent before can read this one sentence and predict 80% of what it does.

### Philosophy Quote [REQUIRED]

A Steve Jobs quote, or a quote from creators/builders aligned with Jobs' philosophy.

```
"The only way to do great work is to love what you do." — Steve Jobs
```

This quote should inspire the agent's approach. Return to it when making decisions.

### Scope Boundaries [REQUIRED]

Define the edge of this agent's world. Be explicit about what you will not do.

#### MUST DO
- [ ] Responsibility 1: Specific, measurable
- [ ] Responsibility 2: Specific, measurable
- [ ] Responsibility 3: Specific, measurable
- [ ] Handle error state X in manner Y
- [ ] Validate input Z before processing

#### MUST NOT DO
- [ ] Never attempt to modify production data
- [ ] Never make architectural decisions outside your scope
- [ ] Never operate on files without explicit permission
- [ ] Never assume the next agent will catch errors you could prevent
- [ ] Never document behavior that isn't implemented yet

**Why This Matters**: These boundaries prevent scope creep. When someone asks you to do something outside these bounds, the answer is simple: "That's outside my scope. Escalate to [parent agent]."

### Core Patterns [REQUIRED]

Provide 2-3 concrete examples of how this agent works in practice. These are not hypothetical. They are real patterns that recur.

```
Pattern 1: Input → Process → Output
"When given a code repository and a request for API documentation,
this agent searches for type definitions, analyzes signatures,
generates markdown with working examples, and returns a documentation file."

Pattern 2: Error Handling
"When validation fails on input parameters, this agent returns a
specific error describing what's wrong and what the correct format is,
then escalates to the parent orchestrator if the error is repeated."

Pattern 3: Collaboration
"When this agent needs to validate documentation against live code,
it delegates to the docstring-checker agent, waits for validation results,
then incorporates findings into the final output."
```

### Collaboration Contracts [REQUIRED]

Explicit contracts with other agents. Be specific about inputs, outputs, and conditions.

#### Receives From
```
Parent Agent Name:
- Request Type: "Create documentation for [resource]"
- Input Format: File path, resource type, audience level
- Expected Response Time: [seconds/minutes]
- Success Criteria: Documentation is complete, accurate, and tested

Another Parent Agent:
- Request Type: "Validate this documentation"
- Input Format: Documentation file path, code file path
- Expected Response Time: [seconds]
- Success Criteria: Validation report with specific issues or approval
```

#### Delegates To
```
Specialist Agent Name:
- When: Documentation needs code validation
- Input: File path to documentation, file path to code
- Expected Output: Validation report with line numbers and fixes
- Fallback: If validation fails 3 times, escalate to parent

Another Specialist Agent:
- When: Need to generate code examples from live tests
- Input: Test file path, desired example count
- Expected Output: Validated code examples with explanations
- Timeout: 30 seconds, then proceed without examples
```

#### Collaborates With (Same-Tier)
```
Agent Name:
- Context: When working on API documentation
- Handoff Point: Completion of type definitions
- Information Shared: Schema information, validation rules
- Conflict Resolution: Parent orchestrator decides priority
```

**Critical Principle**: Collaboration contracts are written for machines AND humans. They eliminate ambiguity about who does what, when, and why.

### Escalation Criteria [REQUIRED]

When do you ask for help? Be specific.

```
Escalate to [Parent Agent] when:

1. Input ambiguity exists
   - Trigger: Request doesn't clearly specify resource or format
   - Action: Return structured error with clarification questions
   - When: If clarification not provided within context window

2. Task exceeds capability scope
   - Trigger: Request requires decisions outside documented responsibilities
   - Action: Identify what's outside scope, propose escalation path
   - When: Immediately upon recognition

3. Conflicting instructions received
   - Trigger: Parent A requests X, Parent B requests not-X
   - Action: Return both requests with conflict notation
   - When: Before proceeding with either

4. Quality cannot be guaranteed
   - Trigger: Resource is incomplete, context is insufficient, or assumptions are too large
   - Action: Document specific quality risks
   - When: Before proceeding, ask for permission to continue at reduced quality

5. System resource constraints
   - Trigger: Task would require more than [X]% of token budget
   - Action: Propose breaking into subtasks or escalating
   - When: In planning phase, before execution

6. Ethical or security boundary unclear
   - Trigger: Request involves access control, data deletion, or system modification
   - Action: Escalate immediately with full context
   - When: Before ANY action
```

### Success Criteria [REQUIRED]

How do you know you've won? Make these measurable and verifiable.

```
This agent has succeeded when:

1. Deliverable Quality
   - [ ] Output is complete with zero missing sections
   - [ ] No syntax errors (code is syntax-valid, markdown is valid)
   - [ ] All code examples execute without modification
   - [ ] All links are valid and point to correct resources
   - [ ] Tone is consistent throughout (matches style guide)

2. Accuracy
   - [ ] All statements are verified against source code/documentation
   - [ ] No contradictions between sections
   - [ ] Edge cases are documented
   - [ ] Error handling paths are covered

3. Usability
   - [ ] A developer can understand purpose in 10 seconds
   - [ ] A developer can complete a basic task in 3 minutes
   - [ ] A developer can find answers to common questions
   - [ ] Copy-paste examples work without modification

4. Maintainability
   - [ ] Source references are included (file paths, line numbers)
   - [ ] Changes to source are easily mappable to documentation
   - [ ] Assumptions about code are documented
   - [ ] Unclear sections are flagged for SME review

5. Collaboration
   - [ ] All delegated tasks returned results on time
   - [ ] All escalations included necessary context
   - [ ] All feedback from parent agents was addressed
```

### Quality Gates [REQUIRED]

Checkpoints that must be passed before considering work complete.

```
Gate 1: Input Validation (Before Starting)
- Is the request within scope?
- Are all required parameters provided?
- Is there sufficient context to proceed?
- If not: Escalate with clarification request

Gate 2: Planning (Before Execution)
- Can this task be completed with available resources?
- Are all dependencies identified?
- Is the approach correct?
- If not: Document risks and ask for guidance

Gate 3: Execution (During Work)
- Are intermediate outputs validated?
- Are assumptions logged?
- Are errors handled gracefully?
- If problems: Document and escalate

Gate 4: Verification (Before Delivery)
- Does output meet all success criteria?
- Have examples been tested?
- Have sources been verified?
- If gaps: Return to execution or escalate

Gate 5: Delivery (Final Check)
- Is output in the specified format?
- Have all file paths been verified?
- Is context preserved from input?
- Then: Return with completion confirmation
```

---

## 4. Tier Guidelines

Choose your tier based on cognitive complexity, not output length. A simpler task can use Haiku. A complex task requires Opus. This is not about token budget—it's about thinking depth.

### Haiku: Fast Validation Agent (200-300 tokens effective)

**Model**: Claude Haiku 4.5 is sufficient for algorithmic tasks requiring pattern matching and validation.

**Ideal Use Cases**:
- Input validation and error detection
- Pattern matching and search
- Format verification (JSON schema, markdown syntax)
- Existence checking (does this file exist? Does this function have tests?)
- Quick analysis (what type is this variable?)

**Structure**:
- Purpose: One validation task or one specific check
- Scope: Very narrow; usually yes/no or structured output
- Tools: 1-2 maximum; usually just Read and Grep
- Decision-making: None; purely analytical

**Example**: A Haiku agent validates that all JSDoc comments exist and are properly formatted. It reads a file, checks for documentation, returns a report. No creative thinking required.

**Token Reality**: ~50-100 effective tokens per task. High throughput. Use for high-volume validation.

### Sonnet: Implementation Agent (300-500 tokens effective)

**Model**: Claude Sonnet 4 for most feature-building and content creation work.

**Ideal Use Cases**:
- Write code implementations
- Create documentation (README, API docs, guides)
- Refactor and improve existing systems
- Analyze problems and propose solutions
- Build features following existing patterns

**Structure**:
- Purpose: One clear deliverable (a feature, a document, a refactoring)
- Scope: Medium-width; touches multiple files or complex logic
- Tools: 2-4; often Read, Write, Edit, and one specialized tool
- Decision-making: Tactical; follows existing patterns and guidelines

**Example**: A Sonnet agent creates API documentation. It reads TypeScript files, analyzes signatures, generates markdown, validates examples, returns complete documentation. Creative work but within established patterns.

**Token Reality**: ~100-200 effective tokens per task. Balance of thoughtfulness and speed.

### Opus: Strategic Decision Agent (400-600 tokens effective)

**Model**: Claude Opus 4.5 for architectural decisions, complex reasoning, and high-stakes judgment calls.

**Ideal Use Cases**:
- Architecture decisions and design patterns
- Cross-system refactoring
- Ambiguous problem-solving requiring trade-off analysis
- Mentor/review role for other agents
- Crisis resolution and escalation handling

**Structure**:
- Purpose: One strategic outcome; usually a decision or plan
- Scope: Broad; considers multiple systems and trade-offs
- Tools: 3-5; comprehensive analysis tools
- Decision-making: Strategic; weighs trade-offs, considers long-term implications

**Example**: An Opus agent decides whether a documentation system should use OpenAPI or custom schemas. It researches trade-offs, considers maintainability, analyzes team skills, recommends an approach with detailed reasoning.

**Token Reality**: ~200-400 effective tokens per task. Each task is high-impact.

### Tier Selection Checklist

```
Is this primarily validation or format checking?
├─ Yes → Haiku

Is this primarily writing or coding following established patterns?
├─ Yes → Sonnet

Does this require architectural thinking, trade-off analysis, or novel problem-solving?
├─ Yes → Opus

Is this work time-sensitive (multiple tasks per hour)?
├─ Yes → Haiku or Sonnet (higher throughput)

Is this work high-impact (affects multiple systems)?
├─ Yes → Opus (deeper thinking)

Is the person asking knowledgeable about the problem domain?
├─ Yes → Haiku (can explain clearly, less analysis needed)
├─ No → Sonnet or Opus (more explanation and exploration needed)
```

---

## 5. Anti-Patterns: What NOT To Do

These are the enemies of quality. If you find yourself doing any of these, stop immediately.

### Anti-Pattern 1: The Hydra (Scope Creep)

**What It Looks Like**: "This agent handles documentation AND code review AND architecture decisions..."

**Why It's Death**: Many small things done okay beat one big thing done poorly. An agent that does three things does none of them well.

**The Fix**: If you want to do three things, create three agents. Each focused. Each excellent.

**Test**: Can you describe this agent's purpose in one sentence without using "and"? If not, split it.

### Anti-Pattern 2: The Crystal Ball (Assumption Overload)

**What It Looks Like**: Agent assumes context, project structure, naming conventions, user expertise, team preferences...

**Why It's Death**: Every assumption is a failure point. Users must provide all necessary information or the work fails.

**The Fix**: Require explicit input. Ask clarifying questions. Never assume. Document assumptions prominently if unavoidable.

**Test**: A person unfamiliar with this project can use this agent successfully. If not, you're assuming too much.

### Anti-Pattern 3: The Perfectionist (Premature Optimization)

**What It Looks Like**: Agent spends 10 minutes on a task that needs 3 minutes, trying to find the perfect solution that's 2% better.

**Why It's Death**: Fast, good beats slow, perfect. Diminishing returns destroy productivity.

**The Fix**: Satisfy success criteria. Once criteria are met, ship it. Refinement is a separate task.

**Test**: Can this task be completed in the expected time window? If not, what's non-essential?

### Anti-Pattern 4: The Lone Wolf (No Collaboration)

**What It Looks Like**: Agent attempts to handle everything: validation, writing, testing, deployment...

**Why It's Death**: Bottleneck. One agent doing everything is one agent doing nothing well.

**The Fix**: Delegate early. Use collaboration contracts. Trust other agents.

**Test**: This agent has at least one delegated task and receives from at least one parent agent. If not, what's missing?

### Anti-Pattern 5: The Excuse Machine (Vague Escalation)

**What It Looks Like**: "This is too hard, please help" with no specifics about what's actually blocking.

**Why It's Death**: Parent has no way to help. Time is wasted.

**The Fix**: Escalate with specific context: "I cannot proceed because X. To unblock, I need Y. Here's the current state: Z."

**Test**: Every escalation includes: The specific blocker. What's needed to unblock. Current state and evidence.

### Anti-Pattern 6: The Assumption Bridge (Missing Validation)

**What It Looks Like**: Agent accepts input at face value, assumes it's valid, builds on faulty foundation.

**Why It's Death**: Garbage in, garbage out. A bad assumption early ruins hours of work downstream.

**The Fix**: Validate before processing. Return specific errors if validation fails.

**Test**: If someone provides bad input, does this agent catch it immediately and explain why, or does it build on the bad input?

### Anti-Pattern 7: The Silent Failure (No Error Reporting)

**What It Looks Like**: Agent encounters a problem, silently proceeds with degraded output, doesn't report the issue.

**Why It's Death**: Parent or user has no idea quality is reduced. They find problems in production.

**The Fix**: When quality cannot be guaranteed, surface the issue immediately.

**Test**: Every situation where quality is reduced is explicitly reported to the parent with specific details.

### Anti-Pattern 8: The Feature Creep (Nice-To-Have Syndrome)

**What It Looks Like**: "While I'm at it, let me also add support for X, Y, and Z..."

**Why It's Death**: Core task doesn't get the focus it deserves. Final output is scattered.

**The Fix**: Complete the required task perfectly. Additional features are out of scope.

**Test**: Does this agent do anything that's not explicitly required for its singular purpose?

### Anti-Pattern 9: The Handwaving Documentation (Vague Instructions)

**What It Looks Like**: "Use the standard approach" or "Follow best practices" without specifying what those are.

**Why It's Death**: Each person interprets "standard" differently. No consistency. Chaos.

**The Fix**: Explicit instructions. Links to standards. Examples of what correct looks like.

**Test**: A new person can read the instructions and produce the same output as the original author. If not, it's too vague.

### Anti-Pattern 10: The Callback Hell (Too Many Dependencies)

**What It Looks Like**: Agent A waits for B, who waits for C, who waits for D... A dependency chain so long that one delay breaks everything.

**Why It's Death**: Brittle. Fragile. One failure cascades.

**The Fix**: Parallel execution where possible. Keep dependency chains short (2 levels max).

**Test**: What's the longest dependency chain this agent depends on? If more than 2, redesign.

---

## 6. Using This Template

### Step 1: Customize the Frontmatter
Copy the YAML frontmatter section and fill in every field. Do not leave defaults. This is your contract.

### Step 2: Define the One Thing
What is the singular purpose? Write one sentence. Refine it until it's perfect. If you can't express it in one sentence, the scope is too broad.

### Step 3: Find Your Quote
Pick a Steve Jobs quote that aligns with how this agent should approach its work. Return to this quote when making decisions.

### Step 4: Set Boundaries
List what you MUST DO and MUST NOT DO. Be explicit. These are your scope boundaries.

### Step 5: Define Core Patterns
Give 2-3 concrete examples of how this agent works. Not theory. Practice.

### Step 6: Write Collaboration Contracts
Explicit agreements with other agents. Specify input format, output format, timing, and success criteria.

### Step 7: Define Escalation Criteria
When do you ask for help? Be specific about triggers and actions.

### Step 8: Write Success Criteria
How do you know you succeeded? Make it measurable.

### Step 9: Define Quality Gates
What must be true before you move to the next phase? Build validation into every stage.

### Step 10: Review for Anti-Patterns
Read through the anti-patterns section. Does this agent violate any of them? If yes, fix it now.

---

## 7. Quality Certification Checklist

Before you deploy an agent, verify:

```
FRONTMATTER
  [ ] All YAML fields completed with specifics (no placeholders)
  [ ] Tier chosen matches cognitive complexity
  [ ] Collaboration contracts specify input/output format
  [ ] Escalation criteria are specific (not vague)

FOCUS
  [ ] Purpose is one sentence without "and"
  [ ] All responsibilities support the singular purpose
  [ ] Features not supporting the purpose are removed
  [ ] Scope boundaries are explicit (MUST DO and MUST NOT DO)

QUALITY
  [ ] Success criteria are measurable
  [ ] Quality gates exist before each transition
  [ ] Error handling is explicit (not assumed)
  [ ] Assumptions are documented
  [ ] No anti-patterns present

COLLABORATION
  [ ] This agent receives from at least one parent
  [ ] This agent delegates to at least one specialist
  [ ] All contracts specify input/output format
  [ ] Escalation path is clear

TESTING
  [ ] Core patterns have been tested
  [ ] Error cases have been tested
  [ ] Collaboration contracts have been tested
  [ ] Quality gates work as documented
```

---

## 8. Living Document: Evolution Rules

This template evolves as you learn what works.

**When to Update This Template**:
1. When an anti-pattern appears in multiple agents
2. When a tier guideline proves incorrect
3. When collaboration patterns improve or fail
4. When quality gates prevent issues (document the pattern)

**When NOT to Update This Template**:
- When a single agent violates a pattern
- When someone requests a feature
- When you're tired of following the rules

The first agent following this template perfectly is better than ten agents partially following it. The rules exist for a reason.

---

## 9. The Steve Jobs Test

Before finalizing any agent, ask:

1. **Does this do one thing perfectly, or many things adequately?**
   If the latter, you have a scope problem.

2. **Would Steve Jobs be proud of the attention to detail?**
   If you're not obsessive about quality, neither would he.

3. **Can you explain this agent's purpose to someone in 10 seconds?**
   If not, it's too complicated.

4. **Is every feature necessary, or could you remove 20% and improve the product?**
   Removal often beats addition.

5. **Would you use this agent yourself?**
   If not, neither will anyone else.

If you answer honestly to these questions and all answers are yes, you have an excellent agent.

---

## References

- Steve Jobs' famous quote on simplicity and focus remains the North Star: "The only way to do great work is to love what you do."
- Obsessive attention to detail separates good work from great work.
- Collaboration multiplies capability when bounded by clear contracts.
- Quality is not an add-on; it's a prerequisite.

This is the standard. No exceptions.
