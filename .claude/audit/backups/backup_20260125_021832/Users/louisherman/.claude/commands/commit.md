# Smart Commit

Generate a well-structured commit message for staged changes.

## Analysis Steps

1. **Check staged changes**: `git diff --cached`
2. **Identify change type**: feat, fix, refactor, docs, etc.
3. **Determine scope**: What area of the codebase is affected
4. **Write message**: Following conventional commits format

## Conventional Commit Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
| Type | When to Use |
|------|-------------|
| `feat` | New feature for users |
| `fix` | Bug fix for users |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring, no behavior change |
| `perf` | Performance improvement |
| `test` | Adding/fixing tests |
| `chore` | Build, CI, dependencies |

### Scope Examples
- `auth`, `api`, `ui`, `db`, `config`
- Component names: `button`, `modal`, `form`
- Feature areas: `checkout`, `profile`, `search`

## Good Commit Messages

```bash
# Feature
feat(auth): add Google OAuth login

# Bug fix with issue reference
fix(cart): prevent duplicate items

Closes #123

# Breaking change
feat(api)!: change response format for /users endpoint

BREAKING CHANGE: Response now returns { data: users } instead of users array directly.
Migration: Update client code to access response.data

# Refactoring
refactor(utils): extract date formatting to shared module

# Multiple related changes
feat(ui): redesign settings page

- Add dark mode toggle
- Improve accessibility of form inputs
- Update color scheme for better contrast
```

## Bad Commit Messages (Avoid)

```bash
# Too vague
fix: bug fix
update: changes
wip

# Too long for subject
fix(authentication): fixed the bug where users could not log in when they had special characters in their password because the validation regex was wrong

# No type
added new feature
fixed issue with login
```

## Commands

```bash
# See what's staged
git diff --cached --stat

# See detailed changes
git diff --cached

# Stage specific files
git add <file>

# Stage hunks interactively (if needed)
git add -p

# Commit with message
git commit -m "type(scope): description"

# Commit with body (multiline)
git commit -m "type(scope): description" -m "Body with more details"
```

## Output Format

```markdown
## Commit Analysis

### Staged Changes
| File | Changes | Type |
|------|---------|------|
| src/auth/login.ts | +45 -12 | Modified |
| src/auth/oauth.ts | +120 | Added |

### Recommended Commit

```bash
git commit -m "feat(auth): add OAuth2 authentication flow

- Add Google OAuth provider
- Add callback handler for OAuth redirect
- Store OAuth tokens securely in session

Implements #456"
```

### Alternative Messages
1. If this should be multiple commits:
   - `feat(auth): add Google OAuth provider`
   - `feat(auth): add OAuth callback handler`

2. If this is a fix instead:
   - `fix(auth): resolve OAuth token storage issue`
```

## Tips

- **Subject line**: Max 50 characters, imperative mood ("add" not "added")
- **Body**: Wrap at 72 characters, explain what and why (not how)
- **Footer**: Reference issues, note breaking changes
- **Atomic commits**: One logical change per commit
- **Present tense**: "add feature" not "added feature"

## Quick Reference

```bash
# Feature
git commit -m "feat(scope): add something"

# Fix
git commit -m "fix(scope): resolve something"

# Breaking change (note the !)
git commit -m "feat(scope)!: change something

BREAKING CHANGE: description of what breaks"

# With issue reference
git commit -m "fix(scope): resolve issue

Fixes #123"
```
