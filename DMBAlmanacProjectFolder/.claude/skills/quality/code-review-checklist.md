# Skill: Code Review Checklist

**ID**: `code-review-checklist`
**Category**: Quality
**Agent**: Review Orchestrator

---

## When to Use
- Reviewing pull requests
- Pre-commit validation
- Code quality assessment
- Onboarding review training

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| files | array | yes | Files to review |
| depth | string | no | quick, standard, thorough |

## Checklist

### Security
- [ ] No hardcoded credentials or secrets
- [ ] Input validation on all user inputs
- [ ] SQL queries use parameterized statements
- [ ] No sensitive data in logs
- [ ] Proper authentication/authorization checks

### Performance
- [ ] No N+1 query patterns
- [ ] Large lists are paginated
- [ ] Expensive operations are cached
- [ ] No blocking operations in event loop
- [ ] Bundle size impact considered

### Code Quality
- [ ] Functions are small and focused (< 30 lines)
- [ ] Clear naming (variables, functions, classes)
- [ ] No magic numbers (use constants)
- [ ] DRY - no significant code duplication
- [ ] Proper error handling with meaningful messages

### Testing
- [ ] New code has test coverage
- [ ] Edge cases are tested
- [ ] Tests are isolated (no shared state)
- [ ] Meaningful test names
- [ ] No flaky tests introduced

### Documentation
- [ ] Public APIs have JSDoc comments
- [ ] Complex logic has inline comments
- [ ] README updated if needed
- [ ] Breaking changes documented

### TypeScript
- [ ] No `any` types without justification
- [ ] Proper null checking
- [ ] Generic types used appropriately
- [ ] Type exports for public APIs

## Output Template
```markdown
## Code Review: PR #123

### Summary
- **Files Changed**: 5
- **Lines Added**: 120
- **Lines Removed**: 45

### Issues Found
1. 🔴 **Security**: SQL query at line 45 uses string concatenation
2. 🟡 **Performance**: N+1 query pattern in getUserPosts()
3. 🟡 **Quality**: Function exceeds 50 lines

### Suggestions
- Consider extracting validation logic to separate function
- Add error boundary around new component

### Approval Status: Changes Requested
```
