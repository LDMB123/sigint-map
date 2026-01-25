# Skill: Concise Prompts

**ID**: `concise-prompts`
**Category**: Prompting
**Agent**: Token Optimizer

---

## When to Use
- Every interaction with Claude
- Reducing token usage
- Improving response speed
- Getting more precise answers

## Prompt Compression Techniques

### 1. Remove Filler Words
```
❌ VERBOSE (45 tokens):
"I would like you to please help me by reviewing the following
code and providing me with your detailed analysis of any
potential issues that you might find."

✅ CONCISE (12 tokens):
"Review this code. List issues as: line, severity, issue, fix."
```

### 2. Use Structured Output Requests
```
❌ VERBOSE (30 tokens):
"Please analyze this and tell me what you think about it,
including any problems you see and how to fix them."

✅ CONCISE (15 tokens):
"Analyze. Return JSON: {issues: [{problem, solution}]}"
```

### 3. Reference Instead of Repeat
```
❌ VERBOSE (500+ tokens):
[Full project context repeated in every message]

✅ CONCISE (20 tokens):
"Using project context from message 1, review this new file:"
```

### 4. Use Abbreviations/Shorthand
```
❌ VERBOSE: "TypeScript", "function", "component"
✅ CONCISE: "TS", "fn", "cmp"

❌ VERBOSE: "Please implement a function that..."
✅ CONCISE: "Impl fn:"
```

### 5. Specify Format Upfront
```
❌ VERBOSE (50 tokens):
"Can you help me understand what this code does? I'd like
a detailed explanation covering the main functionality,
any important patterns used, and potential improvements."

✅ CONCISE (20 tokens):
"Explain code. Format:
1. Purpose (1 line)
2. Key patterns
3. Improvements"
```

## Prompt Templates

### Code Review
```
Review: [paste code]
Format: {issues: [{line, type, issue, fix}]}
Types: security|perf|quality|a11y
```

### Bug Fix
```
Bug: [description]
Code: [relevant section only]
Fix: [return fixed code only]
```

### Feature Implementation
```
Impl: [requirement]
Context: [file signatures only]
Return: [code only, no explanation]
```

### Explanation
```
Explain: [code/concept]
Level: [junior|mid|senior]
Length: [1-3 sentences]
```

## Token Savings Examples

| Task | Verbose | Concise | Savings |
|------|---------|---------|---------|
| Code review | 500 | 50 | 90% |
| Bug fix | 300 | 40 | 87% |
| Feature | 400 | 60 | 85% |
| Explanation | 200 | 30 | 85% |

## Quick Reference Card

```yaml
prompt_patterns:
  review: "Review: [code]. JSON: {issues: []}"
  fix: "Fix: [bug]. Code: [section]. Return fixed only."
  impl: "Impl: [req]. Return code only."
  explain: "Explain [x] in [n] sentences."
  validate: "Valid? [code]. Yes/No + reason."
  list: "List [n] [things]. Format: bullet points."

avoid:
  - "I would like you to..."
  - "Please help me..."
  - "Can you..."
  - "I was wondering if..."
  - Repeating context
  - Explaining what you want explained
```
