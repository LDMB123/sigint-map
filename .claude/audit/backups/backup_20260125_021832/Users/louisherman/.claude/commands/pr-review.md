# Pull Request Review

Conduct a comprehensive review of the specified pull request.

## Target: $ARGUMENTS

## Review Process

1. **Understand context**: Read PR description, linked issues
2. **Check CI status**: Are tests passing? Any warnings?
3. **Review file changes**: Examine each changed file
4. **Test locally** (if needed): Checkout and run
5. **Provide feedback**: Constructive, actionable comments

## PR Review Checklist

### Code Quality
- [ ] Code is readable and self-documenting
- [ ] No unnecessary complexity
- [ ] Follows project conventions
- [ ] No dead code or commented-out code
- [ ] Appropriate error handling

### Functionality
- [ ] Solves the stated problem
- [ ] Edge cases handled
- [ ] No regressions introduced
- [ ] Works as described in PR

### Testing
- [ ] Tests added for new functionality
- [ ] Tests cover edge cases
- [ ] All tests passing
- [ ] Test names are descriptive

### Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] No SQL/XSS vulnerabilities
- [ ] Auth/authz properly enforced

### Performance
- [ ] No obvious performance issues
- [ ] No N+1 queries
- [ ] Appropriate caching
- [ ] No memory leaks

### Documentation
- [ ] Code comments where needed
- [ ] README updated if needed
- [ ] API docs updated if needed

## Review Comment Types

### Blocking (Request Changes)
```markdown
**[BLOCKING]** This will cause a runtime error when `user` is null.

```typescript
// Current
return user.name;

// Suggested
return user?.name ?? 'Unknown';
```
```

### Suggestion (Non-blocking)
```markdown
**[SUGGESTION]** Consider extracting this to a helper function for reusability.
```

### Question
```markdown
**[QUESTION]** What happens if the API returns an empty array here?
```

### Nitpick
```markdown
**[NIT]** Minor: could use destructuring here.
```

### Praise
```markdown
**[PRAISE]** Nice use of the builder pattern here! 👍
```

## Commands

```bash
# Fetch PR locally
gh pr checkout <number>

# View PR diff
gh pr diff <number>

# View PR status
gh pr status

# View PR checks
gh pr checks <number>

# Add review comment
gh pr review <number> --comment --body "Comment"

# Approve PR
gh pr review <number> --approve --body "LGTM!"

# Request changes
gh pr review <number> --request-changes --body "See comments"
```

## Output Format

```markdown
## PR Review: #123 - [PR Title]

### Summary
Brief overview of the changes and their purpose.

### CI Status
| Check | Status |
|-------|--------|
| Tests | ✅ Passing |
| Lint | ✅ Passing |
| Build | ✅ Passing |

### Files Changed
| File | Changes | Risk |
|------|---------|------|
| src/auth/login.ts | +45 -12 | Medium |
| src/api/users.ts | +20 -5 | Low |

### Review Findings

#### Critical Issues (Must Fix)
1. **[BLOCKING]** SQL injection vulnerability in user search
   - **File**: `src/api/users.ts:42`
   - **Issue**: User input directly concatenated into query
   - **Fix**: Use parameterized query

#### Suggestions (Should Consider)
1. **[SUGGESTION]** Extract validation logic
   - **File**: `src/auth/login.ts:15-30`
   - **Reason**: Improves testability and reuse

#### Nitpicks (Optional)
1. **[NIT]** Could use optional chaining
   - **File**: `src/utils/format.ts:8`

### What's Good
- Clean separation of concerns
- Good test coverage
- Clear commit messages

### Recommendation
- [ ] **Approve** - Ready to merge
- [x] **Request Changes** - Needs fixes before merge
- [ ] **Comment** - Questions/discussion needed

### Suggested Commit Message for Squash
```
feat(auth): add two-factor authentication

- Add TOTP-based 2FA setup flow
- Add 2FA verification on login
- Add backup codes generation

Closes #456
```
```

## Review Best Practices

1. **Be constructive**: Suggest solutions, not just problems
2. **Explain why**: Help the author learn
3. **Prioritize**: Focus on important issues first
4. **Be timely**: Don't block PRs unnecessarily
5. **Acknowledge good work**: Positive feedback matters
6. **Ask questions**: Understand before criticizing
7. **Use suggestions**: GitHub's suggestion feature for small fixes

## Common Issues to Watch For

- **Security**: SQL injection, XSS, hardcoded secrets
- **Performance**: N+1 queries, missing indexes, memory leaks
- **Reliability**: Missing error handling, race conditions
- **Maintainability**: Complex logic, poor naming, missing tests
