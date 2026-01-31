# Security Library

## Overview

This directory contains security utilities and documentation for protecting against common web application vulnerabilities, with a focus on Regular Expression Denial of Service (ReDoS) attacks.

## Files

### `regex-safe.ts`
Comprehensive ReDoS protection utilities providing:
- Regex execution with timeout protection
- Input and output size limits
- Pattern validation for vulnerability detection
- Bounded quantifier conversion
- Fast-path for pre-validated patterns

### `regex-safe.test.ts`
Complete test suite covering:
- Normal operation
- Attack scenarios
- Performance benchmarks
- Edge cases
- Real-world vulnerability simulations

### `REDOS_SECURITY_AUDIT.md`
Detailed security audit documentation including:
- Vulnerability identification
- Remediation steps
- Attack surface analysis
- Compliance mapping (OWASP, CWE)
- Production recommendations

## Quick Start

### Basic Usage

```typescript
import { safeRegexTest, safeRegexMatch } from '@/lib/security/regex-safe';

// Safe regex test
const isValid = safeRegexTest(/\d+/, userInput);

// Safe regex match with limits
const match = safeRegexMatch(/tier:\s{0,50}(\w+)/, content, {
  maxInputSize: 1024,
  maxMatchSize: 500,
  timeout: 100
});
```

### Fast Path (Pre-validated Patterns)

```typescript
import { fastSafeRegexMatch } from '@/lib/security/regex-safe';

// For patterns audited and confirmed safe
const match = fastSafeRegexMatch(
  /tier:\s{0,50}(opus|sonnet|haiku)/i,
  content,
  1024, // max input size
  100   // max match size
);
```

### Pattern Validation

```typescript
import { validateRegexPattern } from '@/lib/security/regex-safe';

const pattern = /^(a+)+$/;
const result = validateRegexPattern(pattern);

if (!result.safe) {
  console.warn('Unsafe pattern:', result.warnings);
}
// Output: ["Nested quantifiers detected (e.g., (a+)+) - potential ReDoS risk"]
```

### Convert to Bounded Quantifiers

```typescript
import { boundRegexQuantifiers } from '@/lib/security/regex-safe';

const unsafe = /tier:\s*(opus|sonnet|haiku)/i;
const safe = boundRegexQuantifiers(unsafe, 50);
// Result: /tier:\s{0,50}(opus|sonnet|haiku)/i
```

## Security Principles

### Defense in Depth

Multiple layers of protection:

1. **Input Validation**: Size limits before regex execution
2. **Bounded Quantifiers**: Prevent catastrophic backtracking
3. **Timeout Protection**: Kill runaway regex executions
4. **Output Sanitization**: Limit match result sizes
5. **Pattern Validation**: Detect risky patterns at development time

### Secure by Default

- Conservative size limits (1KB input, 500 char matches)
- Timeout enabled by default (100ms)
- Fail-safe behavior (returns null/false on timeout)

### Performance Optimized

- Fast-path for pre-validated patterns (no timeout overhead)
- Negligible overhead for normal operations (<0.1ms)
- Caching recommended for frequently used patterns

## Common Patterns

### Safe Patterns ✅

```typescript
// Word boundaries - inherently safe
/\b(rust|wasm|svelte)\b/i

// Bounded quantifiers
/tier:\s{0,50}(opus|sonnet|haiku)/i
/description:\s{0,20}(.{0,500})/i

// Character classes with bounds
/^[a-zA-Z0-9_-]{1,100}$/

// Exact counts
/\d{4}-\d{2}-\d{2}/
```

### Unsafe Patterns ⚠️

```typescript
// Nested quantifiers - CATASTROPHIC
/^(a+)+$/
/^(a*)*$/

// Unbounded with backtracking
/tier:\s*(opus|sonnet|haiku)/  // Use \s{0,50} instead

// Greedy dot quantifiers
/.*test.*/                      // Use .{0,100}test.{0,100} instead

// Overlapping alternations
/(a|a)*/                        // Simplify to /a*/
```

## Vulnerability Examples

### Example 1: Tier Extraction (FIXED)

**Vulnerable**:
```typescript
const match = content.match(/tier:\s*(opus|sonnet|haiku)/i);
```

**Attack**:
```typescript
const malicious = 'tier:' + ' '.repeat(10000) + 'invalid';
// Causes catastrophic backtracking
```

**Fixed**:
```typescript
const match = fastSafeRegexMatch(
  /tier:\s{0,50}(opus|sonnet|haiku)/i,
  content,
  1024,
  100
);
```

### Example 2: Description Extraction (FIXED)

**Vulnerable**:
```typescript
const match = content.match(/description:\s*(.+)/i);
```

**Attack**:
```typescript
const malicious = 'description:' + 'a'.repeat(100000);
// Unbounded .+ causes excessive memory and CPU
```

**Fixed**:
```typescript
const match = fastSafeRegexMatch(
  /description:\s{0,20}(.{0,500})/i,
  content,
  1024,
  500
);
```

## Testing

```bash
# Run security tests
npm test -- regex-safe.test.ts

# Run with coverage
npm test -- --coverage regex-safe.test.ts

# Benchmark performance
npm test -- --run regex-safe.test.ts | grep "Performance Benchmarks"
```

## Production Recommendations

### 1. Use RE2 for Critical Paths

```typescript
import RE2 from 're2';

// Guaranteed O(n) time complexity
const pattern = new RE2('tier:\\s*(opus|sonnet|haiku)', 'i');
pattern.test(input); // No ReDoS possible
```

### 2. Implement Monitoring

```typescript
import { safeRegexMatch } from '@/lib/security/regex-safe';

function monitoredRegexMatch(pattern: RegExp, input: string) {
  const start = Date.now();
  const result = safeRegexMatch(pattern, input);
  const duration = Date.now() - start;

  if (duration > 50) {
    logger.warn('Slow regex execution', {
      pattern: pattern.source,
      duration,
      inputLength: input.length
    });
  }

  return result;
}
```

### 3. Add Rate Limiting

```typescript
const rateLimit = require('express-rate-limit');

const regexLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Max 100 regex operations per minute
  message: 'Too many regex operations'
});

app.use('/api/parse', regexLimiter);
```

### 4. Content Security Policy

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
    }
  }
}));
```

## Compliance

### OWASP Top 10 2021

- **A03:2021 - Injection**: ✅ Input validation, bounded quantifiers
- **A04:2021 - Insecure Design**: ✅ Defense in depth, secure defaults
- **A05:2021 - Security Misconfiguration**: ✅ Secure by default

### CWE Coverage

- **CWE-1333**: Inefficient Regular Expression Complexity - ✅ MITIGATED
- **CWE-400**: Uncontrolled Resource Consumption - ✅ MITIGATED
- **CWE-20**: Improper Input Validation - ✅ MITIGATED

## API Reference

### `safeRegexTest(pattern, input, options?)`
Execute regex test with full protection (timeout, size limits).

**Parameters**:
- `pattern`: RegExp - Pattern to test
- `input`: string - Input to test against
- `options`: Object (optional)
  - `maxInputSize`: number (default: 1024) - Max input size in bytes
  - `timeout`: number (default: 100) - Timeout in milliseconds
  - `throwOnTimeout`: boolean (default: false) - Throw on timeout

**Returns**: `boolean` - Test result (false on timeout/error)

---

### `safeRegexMatch(pattern, input, options?)`
Execute regex match with full protection (timeout, size limits).

**Parameters**:
- `pattern`: RegExp - Pattern to match
- `input`: string - Input to match against
- `options`: Object (optional)
  - `maxInputSize`: number (default: 1024)
  - `timeout`: number (default: 100)
  - `maxMatchSize`: number (default: 500)
  - `throwOnTimeout`: boolean (default: false)

**Returns**: `RegExpMatchArray | null` - Match result (null on timeout/error)

---

### `fastSafeRegexTest(pattern, input, maxInputSize?)`
Fast-path regex test for pre-validated patterns (no timeout overhead).

**Parameters**:
- `pattern`: RegExp - Pre-validated safe pattern
- `input`: string - Input to test
- `maxInputSize`: number (default: 1024)

**Returns**: `boolean` - Test result

---

### `fastSafeRegexMatch(pattern, input, maxInputSize?, maxMatchSize?)`
Fast-path regex match for pre-validated patterns (no timeout overhead).

**Parameters**:
- `pattern`: RegExp - Pre-validated safe pattern
- `input`: string - Input to match
- `maxInputSize`: number (default: 1024)
- `maxMatchSize`: number (default: 500)

**Returns**: `RegExpMatchArray | null` - Match result

---

### `validateRegexPattern(pattern)`
Validate regex pattern for ReDoS vulnerabilities.

**Parameters**:
- `pattern`: RegExp - Pattern to validate

**Returns**: `{ safe: boolean; warnings: string[] }`

---

### `boundRegexQuantifiers(pattern, maxRepetitions?)`
Convert unbounded quantifiers to bounded ones.

**Parameters**:
- `pattern`: RegExp - Pattern to convert
- `maxRepetitions`: number (default: 10)

**Returns**: `RegExp` - Pattern with bounded quantifiers

---

### `escapeRegex(input)`
Escape special regex characters for literal matching.

**Parameters**:
- `input`: string - String to escape

**Returns**: `string` - Escaped string

## Support

For security concerns or questions:
- Review `REDOS_SECURITY_AUDIT.md` for detailed vulnerability information
- Check test suite `regex-safe.test.ts` for usage examples
- Consult [OWASP ReDoS Guide](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)

## License

MIT - See project root LICENSE file
