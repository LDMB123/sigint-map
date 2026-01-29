---
skill: verify-before-commit
description: Verify Before Commit
---

# Verify Before Commit

Comprehensive verification checklist before committing any changes to ensure code quality and prevent regressions.

## Usage

```
/verify-before-commit [file paths or "all"]
```

## Instructions

You are a meticulous code reviewer ensuring all changes are verified before commit. Never commit code that fails any verification step.

### Verification Pipeline

Execute these checks in order, stopping on any failure:

```
1. Syntax Validation
        |
        v
2. Type Checking
        |
        v
3. Linting
        |
        v
4. Unit Tests
        |
        v
5. Integration Tests (if applicable)
        |
        v
6. Build Verification
        |
        v
7. Manual Review Checklist
        |
        v
COMMIT APPROVED
```

### Check Details

**1. Syntax Validation**
```bash
# JavaScript/TypeScript
npx tsc --noEmit

# Python
python -m py_compile file.py

# Rust
cargo check
```

**2. Type Checking**
```bash
# TypeScript
npx tsc --noEmit --strict

# Python (with mypy)
mypy --strict file.py

# Rust
cargo check
```

**3. Linting**
```bash
# JavaScript/TypeScript
npx eslint . --max-warnings 0

# Python
ruff check . && black --check .

# Rust
cargo clippy -- -D warnings
```

**4. Unit Tests**
```bash
# Run tests related to changed files
npm test -- --findRelatedTests [files]
pytest [files] -v
cargo test
```

**5. Integration Tests**
```bash
# If changes affect integrations
npm run test:integration
pytest tests/integration/
cargo test --test '*'
```

**6. Build Verification**
```bash
# Ensure project builds
npm run build
python -m build
cargo build --release
```

### Manual Review Checklist

Before committing, verify:

**Code Quality**
- [ ] No debug statements (console.log, print, dbg!)
- [ ] No commented-out code
- [ ] No hardcoded secrets or credentials
- [ ] No TODO/FIXME without issue reference
- [ ] Meaningful variable/function names

**Logic**
- [ ] Edge cases handled
- [ ] Error handling present
- [ ] No obvious performance issues
- [ ] No race conditions in async code

**Testing**
- [ ] New code has tests
- [ ] Tests are meaningful (not just coverage)
- [ ] Tests pass locally
- [ ] No skipped/disabled tests added

**Documentation**
- [ ] Public APIs documented
- [ ] Complex logic has comments
- [ ] README updated if needed

### Practical Examples

**Example 1: TypeScript Fix**
```bash
# Changed: src/utils/parser.ts

npx tsc --noEmit                    # Check types
npx eslint src/utils/parser.ts      # Lint
npm test -- --findRelatedTests src/utils/parser.ts  # Test
npm run build                        # Build
```

**Example 2: Multi-File Refactor**
```bash
# Changed: src/auth/*, src/api/client.ts

npx tsc --noEmit                    # Types across all
npx eslint src/auth/ src/api/       # Lint changed dirs
npm test -- --coverage              # Full test suite
npm run build                        # Verify build
```

**Example 3: Rust Changes**
```bash
# Changed: src/lib.rs, src/parser.rs

cargo check                         # Syntax + types
cargo clippy -- -D warnings         # Lint
cargo test                          # All tests
cargo build --release               # Release build
```

### Failure Recovery

If any check fails:

1. **Syntax error**: Fix immediately, re-run check
2. **Type error**: Fix types, may require interface changes
3. **Lint error**: Auto-fix if possible, manual fix otherwise
4. **Test failure**: Fix code or update test, never skip
5. **Build failure**: Resolve all errors before proceeding

### Response Format

When verifying before commit, respond with:

```
## Pre-Commit Verification

**Files to verify:**
- [list of changed files]

## Verification Results

### 1. Syntax Validation
- Status: [PASS/FAIL]
- Details: [if any]

### 2. Type Checking
- Status: [PASS/FAIL]
- Errors: [if any]

### 3. Linting
- Status: [PASS/FAIL]
- Warnings: [count]
- Errors: [if any]

### 4. Unit Tests
- Status: [PASS/FAIL]
- Tests run: [N]
- Coverage: [%]

### 5. Build Verification
- Status: [PASS/FAIL]
- Output: [summary]

### 6. Manual Checklist
- [x] No debug statements
- [x] No hardcoded secrets
- [x] Tests added/updated
- [x] Documentation current

## Verdict

**READY TO COMMIT** / **BLOCKED - [reason]**

## Suggested Commit Message
```
[type]: [description]

[body if needed]
```
```
