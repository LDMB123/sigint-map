# Security Test Quick Reference

## Running the Tests

```bash
# Run all security tests
npx vitest run .claude/lib/routing/__tests__/agent-registry.security.test.ts

# Run with verbose output
npx vitest run .claude/lib/routing/__tests__/agent-registry.security.test.ts --reporter=verbose

# Run specific test category
npx vitest run .claude/lib/routing/__tests__/agent-registry.security.test.ts -t "Path Traversal"

# Watch mode for development
npx vitest watch .claude/lib/routing/__tests__/agent-registry.security.test.ts
```

---

## Test Categories (60 Tests Total)

### 1. CWE-22: Path Traversal Protection (3 tests)
- Directory traversal via ..
- Symlink escaping base directory
- Absolute path validation

### 2. Symlink Cycle Detection (2 tests)
- Circular symlink chains
- Self-referential symlinks

### 3. Recursion Depth Limit (2 tests)
- Exceeding MAX_RECURSION_DEPTH (10)
- Exactly at depth boundary

### 4. File Size Limits (3 tests)
- Files > 1MB
- Empty files (0 bytes)
- Boundary condition (exactly 1MB)

### 5. Filename Validation (4 tests)
- Parent directory references
- Path separators
- Hidden files (dot-prefixed)
- Valid patterns with hyphens/underscores

### 6. Security Event Logging (1 test)
- Warning logs for suspicious files

### 7. Defense in Depth (2 tests)
- Multiple simultaneous attacks
- Concurrent initialization security

### 8. Error Handling (3 tests)
- Non-existent directories
- Permission denied
- Malformed/binary files

### 9. Advanced Path Traversal Attacks (10 tests)
- URL-encoded traversal (%2e%2e, %2E%2E)
- Path separators (/, \, %2f, %5c)
- Multiple consecutive dots
- Complex traversal chains

### 10. ReDoS Pattern Attack Resistance (4 tests)
- Catastrophic backtracking in tier extraction
- Nested quantifiers in description extraction
- Fuzzy matching performance
- Edge case input patterns

### 11. Input Validation Bypass Attempts (8 tests)
- Null byte injection
- Control characters
- Unicode normalization
- Homoglyph attacks
- Long names (>100 chars)
- Empty/whitespace names
- Type confusion
- Registry boundary validation

### 12. Resource Exhaustion Attack Resistance (6 tests)
- MAX_AGENTS limit (10,000)
- Similarity cache exhaustion
- Concurrent initialization stress
- Fuzzy matching iteration limits
- Deep recursion prevention
- Memory efficiency (1000+ files)

### 13. Advanced Symlink Attack Vectors (3 tests)
- Multi-directory cycles
- External path resolution
- Parent directory symlinks

### 14. Edge Cases and Boundary Conditions (6 tests)
- Exact 100 character names
- 101 character rejection
- Valid character sets
- Invalid special characters
- getAgent() invalid inputs
- getFallbackAgent() invalid inputs

### 15. Denial of Service Prevention (3 tests)
- Post-dispose operation rejection
- Rapid dispose/initialize cycles
- File read operation limits

---

## Security Controls Tested

### Input Validation
- ✅ `validateAgentName()`
- ✅ `AGENT_NAME_PATTERN` regex
- ✅ `PATH_TRAVERSAL_SEQUENCES` checking
- ✅ Type guards (isNonEmptyString, isValidTier, isAgentDefinition)
- ✅ `isValidFilename()`

### Filesystem Security
- ✅ `MAX_FILE_SIZE` (1MB)
- ✅ `MAX_RECURSION_DEPTH` (10)
- ✅ `realpath()` resolution
- ✅ Base path enforcement
- ✅ Symlink cycle detection
- ✅ Empty file rejection

### Resource Management
- ✅ `MAX_AGENTS` (10,000)
- ✅ `MAX_FUZZY_MATCH_ITERATIONS` (50)
- ✅ `SIMILARITY_THRESHOLD` (0.8)
- ✅ Length pre-filtering (30%)
- ✅ Similarity cache bounds
- ✅ `initPromise` serialization
- ✅ `dispose()` cleanup

### API Boundaries
- ✅ `validateAgent()`
- ✅ `getAgent()`
- ✅ `getFallbackAgent()`
- ✅ `ensureInitialized()` guards
- ✅ No throwing on invalid input

---

## Attack Vectors Tested (50+)

| Category | Attack Type | Test Count | Status |
|----------|-------------|------------|--------|
| Path Traversal | ../, ..\\, %2e%2e, absolute paths | 13 | ✅ |
| Symlinks | Cycles, escaping, parent refs | 5 | ✅ |
| File DoS | Large files, empty files, memory | 4 | ✅ |
| ReDoS | Nested quantifiers, backtracking | 4 | ✅ |
| Input Injection | Null bytes, control chars, unicode | 12 | ✅ |
| Resource Exhaustion | Memory, CPU, stack, concurrent | 9 | ✅ |
| Validation Bypass | Type confusion, encoding, length | 13 | ✅ |

---

## Performance Benchmarks

| Operation | Limit | Actual | Status |
|-----------|-------|--------|--------|
| ReDoS pattern validation | <1000ms | <23ms | ✅ |
| Agent name validation | <100ms | <1ms | ✅ |
| Fuzzy matching (100 agents) | <500ms | <23ms | ✅ |
| 10,000 agent initialization | N/A | 1952ms | ✅ |
| 1000 agent initialization | N/A | 212ms | ✅ |
| Concurrent init (100x) | <5000ms | <11ms | ✅ |

---

## Common Test Patterns

### Testing Path Traversal
```typescript
const result = validateAgentName('../../../etc/passwd');
expect(result.valid).toBe(false);
expect(result.reason).toContain('disallowed sequence');
```

### Testing ReDoS Resistance
```typescript
const redosContent = 'tier: ' + 'a'.repeat(10000) + 'b';
const startTime = Date.now();
await registry.initialize();
const duration = Date.now() - startTime;
expect(duration).toBeLessThan(1000);
```

### Testing Resource Limits
```typescript
// Create 10,050 agents (exceeds MAX_AGENTS)
const stats = registry.getStats();
expect(stats.total).toBeLessThanOrEqual(10_000);
```

### Testing Type Confusion
```typescript
const invalidInputs: unknown[] = [null, undefined, 123, {}, []];
for (const input of invalidInputs) {
  const result = validateAgentName(input);
  expect(result.valid).toBe(false);
}
```

---

## Test Results Summary

```
Test Files  1 passed (1)
Tests       60 passed (60)
Duration    2.54s
```

### All Categories Passing ✅
- Path Traversal: 13/13
- Symlink Attacks: 5/5
- File DoS: 4/4
- ReDoS: 4/4
- Input Validation: 12/12
- Resource Exhaustion: 9/9
- Others: 13/13

---

## Files

### Test Suite
`/Users/louisherman/ClaudeCodeProjects/.claude/lib/routing/__tests__/agent-registry.security.test.ts`

### Source Under Test
`/Users/louisherman/ClaudeCodeProjects/.claude/lib/routing/agent-registry.ts`

### Documentation
- `SECURITY_TEST_COVERAGE_REPORT.md` - Detailed coverage report
- `SECURITY_TEST_QUICK_REFERENCE.md` - This file

---

## Quick Verification

```bash
# Run tests and verify 60/60 pass
npx vitest run .claude/lib/routing/__tests__/agent-registry.security.test.ts | grep -E "passed|failed"

# Expected output:
# Tests       60 passed (60)
```

---

**Last Updated**: 2026-01-30  
**Maintained By**: Test Generator Agent
