---
name: skill-validator
description: >
  Use when validating skill format, checking token budgets, or auditing skill quality.
  Validates YAML frontmatter, description length, supporting file structure, and
  Claude Code best practices compliance.
disable-model-invocation: true
user-invocable: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
hooks:
  PreSkillInvocation:
    - description: "Validate skill format before invocation"
      continueOnError: true
---

# Skill Validator

Validates Claude Code skills for format compliance, token budget adherence,
and best practices alignment.

## Validation Checks

1. **YAML Frontmatter**
   - Required fields present: `name`, `description`
   - Only official fields used (no custom schema)
   - Proper YAML syntax

2. **Token Budget Compliance**
   - SKILL.md under 15,000 characters
   - Description length appropriate
   - Use of `disable-model-invocation: true` for action skills

3. **Directory Structure**
   - Skill uses `skill-name/SKILL.md` format
   - Supporting files properly named (`*-reference.md`)
   - No orphaned skill files outside `.claude/skills/`

4. **Best Practices**
   - SKILL.md under 500 lines (detailed reference extracted)
   - Clear description of when to invoke
   - Appropriate tool restrictions
   - Proper use of hooks

## Validation Process

1. Glob for all skill directories
2. Read each SKILL.md file
3. Parse YAML frontmatter
4. Check required and forbidden fields
5. Measure file size and line count
6. Verify directory structure
7. Generate compliance report

## Output Format

For each skill:
- **Name**: Skill identifier
- **Status**: ✅ Valid | ⚠️ Warning | ❌ Invalid
- **Issues**: List of validation failures
- **Token Usage**: Character count / 15,000 budget
- **Recommendations**: Specific fixes needed

**Summary**:
- Total skills validated
- Pass/fail counts
- Overall compliance score

## Usage

```
/skill-validator
```

Or auto-runs via PreSkillInvocation hook (if enabled).
