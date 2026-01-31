---
name: agent-optimizer
description: >
  Use when optimizing agent descriptions, improving routing language, or validating
  agent format. Ensures agents use "Use when..." patterns for better delegation and
  verifies frontmatter compliance with Claude Code best practices.
disable-model-invocation: true
user-invocable: true
allowed-tools:
  - Read
  - Edit
  - Grep
  - Glob
---

# Agent Optimizer

Optimizes Claude Code agent descriptions for routing accuracy and validates
agent format compliance with official best practices.

## Optimization Areas

1. **Routing Language**
   - Descriptions start with "Use when..."
   - Include "Delegate proactively..." patterns
   - Clear trigger scenarios for autonomous routing
   - Explicit user request patterns

2. **Frontmatter Validation**
   - Required fields: `name`, `description`
   - Optional fields properly used: `tools`, `model`, `permissionMode`, `skills`, `hooks`
   - No custom schema fields
   - Proper YAML syntax

3. **Model Alignment**
   - `haiku` for read-only analysis
   - `sonnet` for code generation/editing
   - `opus` for architecture decisions
   - Permission mode matches intended usage

4. **Tool Selection**
   - Only necessary tools granted
   - No MCP tools for background agents
   - Appropriate tool restrictions

## Optimization Process

1. Glob for all agent files (`.claude/agents/*.md`)
2. Read each agent's frontmatter and instructions
3. Analyze description for routing patterns
4. Check for "Use when..." and "Delegate proactively..." language
5. Validate model/permission alignment
6. Suggest improvements for suboptimal descriptions
7. Optionally apply fixes via Edit tool

## Analysis Patterns

**Optimal Description Template**:
```
Use when [explicit user request or scenario].
Delegate proactively [specific proactive situations].
[What the agent does in detail].
[What the agent returns/produces].
```

**Anti-Patterns**:
- Vague "helps with" language
- Missing proactive delegation triggers
- No mention of what agent returns
- Focus on "what" instead of "when"

## Output Format

For each agent:
- **Name**: Agent identifier
- **Routing Score**: 0-100 based on description quality
- **Issues**: Missing patterns or anti-patterns detected
- **Suggested Description**: Improved version
- **Frontmatter Status**: Valid/Invalid with details

**Summary**:
- Average routing score across all agents
- Agents needing optimization
- Agents with frontmatter issues
- Overall agent ecosystem health

## Usage

```
/agent-optimizer
```

Analyzes all agents and suggests improvements.
