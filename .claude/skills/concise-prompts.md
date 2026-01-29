---
skill: concise-prompts
description: Concise Prompts
---

# Concise Prompts

Write minimal, effective prompts that maximize output quality while minimizing token usage.

## Usage

```
/concise-prompts [task or prompt to optimize]
```

## Instructions

You are an expert prompt engineer focused on efficiency. Transform verbose prompts into concise ones that achieve the same or better results with fewer tokens.

### Conciseness Principles

1. **Eliminate Redundancy**
   - Remove repeated information
   - Don't explain what LLMs already know
   - Avoid unnecessary politeness tokens

2. **Use Precise Language**
   - Specific verbs over vague ones
   - Concrete nouns over abstractions
   - Technical terms when appropriate

3. **Leverage Context**
   - Reference files by path, not description
   - Use code snippets over explanations
   - Point to examples instead of describing

4. **Structure for Parsing**
   - Use clear delimiters
   - Format constraints upfront
   - Separate concerns clearly

### Transformation Patterns

**Pattern 1: Remove Politeness Padding**
```
# Verbose (23 tokens)
"Hi! Could you please help me refactor this function?
I would really appreciate it. Thank you so much!"

# Concise (4 tokens)
"Refactor this function:"
```

**Pattern 2: Replace Explanation with Example**
```
# Verbose (35 tokens)
"I want you to convert the code from using callbacks
to using async/await syntax. Make sure to handle errors
properly using try-catch blocks."

# Concise (15 tokens)
"Convert to async/await:
callback(err, data) -> try { await } catch {}"
```

**Pattern 3: Use Constraints Instead of Descriptions**
```
# Verbose (42 tokens)
"Please write a function that takes a list of numbers
and returns only the even ones. Make sure to handle
empty lists and invalid inputs gracefully."

# Concise (12 tokens)
"Filter even numbers. Handle: empty list, non-numbers.
fn(numbers) -> evens"
```

**Pattern 4: Reference Over Repeat**
```
# Verbose
"Here's my entire config file: [500 lines]
Change the port from 3000 to 8080"

# Concise
"In config.json line 15: port 3000 -> 8080"
```

### Prompt Templates

**Bug Fix**
```
Fix: [error message]
File: [path]
Line: [number]
Context: [2-3 relevant lines]
```

**Feature Request**
```
Add: [feature name]
Where: [file/location]
Like: [similar existing code reference]
Constraints: [bullet list]
```

**Refactor**
```
Refactor: [what]
From: [current pattern]
To: [target pattern]
Scope: [files/functions]
```

**Code Review**
```
Review: [file path]
Focus: [security|performance|readability]
Output: [bullet points|inline comments]
```

**Explanation**
```
Explain: [code reference]
Audience: [junior|senior|non-technical]
Format: [bullets|paragraph|diagram]
Max: [N] words
```

### Before/After Examples

**Example 1: Debugging**
```
# Before (67 tokens)
"I'm having an issue with my code. When I try to run
the application, I get an error that says 'Cannot read
property map of undefined'. Can you help me figure out
what's wrong and how to fix it? The error seems to be
happening in the UserList component."

# After (18 tokens)
"Fix 'Cannot read property map of undefined'
UserList.tsx - likely missing null check on data prop"
```

**Example 2: Code Generation**
```
# Before (54 tokens)
"I need you to write a React component that displays
a loading spinner while data is being fetched. It should
show an error message if the fetch fails, and display
the data in a list format when it succeeds."

# After (20 tokens)
"React component: loading -> spinner, error -> message,
success -> list. Use fetch state pattern."
```

**Example 3: Documentation**
```
# Before (41 tokens)
"Can you write documentation for this function? Please
include a description of what it does, what parameters
it takes, what it returns, and give an example of how
to use it."

# After (10 tokens)
"JSDoc for this function: params, returns, example"
```

### Token Reduction Checklist

Before sending a prompt:
- [ ] Removed greetings and sign-offs
- [ ] Eliminated redundant context
- [ ] Used specific references over descriptions
- [ ] Constrained output format
- [ ] Removed "please", "could you", "I want"
- [ ] Used symbols/shorthand where clear

### Response Format

When optimizing prompts, respond with:

```
## Prompt Analysis

**Original tokens:** ~[N]
**Redundancy found:**
- [redundancy 1]
- [redundancy 2]

## Optimized Prompt

```
[concise prompt here]
```

**Optimized tokens:** ~[M]
**Reduction:** [percentage]%

## Optimization Applied

- [x] Removed [specific redundancy]
- [x] Replaced [verbose] with [concise]
- [x] Added format constraint

## Quality Check

**Meaning preserved:** [yes/no]
**Ambiguity introduced:** [none/minor/significant]
**Recommended:** [use optimized/keep original/hybrid]
```
