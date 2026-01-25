# Security Quick Reference - DMB Almanac Svelte

Quick guide for developers to maintain security best practices in this codebase.

## Files Modified (2026-01-21)

### 1. .gitignore (NEW)
**Location**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/.gitignore`
- Prevents committing secrets, env files, database files
- Keep this up to date as project evolves
- Never commit: `.env`, `*.db`, `*.key`, `credentials*.json`

### 2. Protocol Handler
**Location**: `src/routes/protocol/+page.ts`
**Changes**: Added validation, allow-listing, path traversal prevention

Key security patterns:
```typescript
// ✅ GOOD: Validate before redirect
const ALLOWED_ROUTES = ['/shows/', '/songs/', '/venues/', '/search', '/guests/', '/tours/'];

if (isAllowedRoute(targetRoute)) {
  redirect(302, targetRoute);
}

// ❌ BAD: Direct redirect without validation
redirect(302, `/songs/${id}`);
```

### 3. File Upload Handler
**Location**: `src/routes/open-file/+page.svelte`
**Changes**: Added file size limits, type validation, schema validation

Key security patterns:
```typescript
// ✅ GOOD: Validate file before processing
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['dmb', 'setlist', 'json'];

const validation = validateFile(file, fileHandle);
if (!validation.valid) {
  // Handle error
}

// ❌ BAD: Process file without validation
const fileData = JSON.parse(await fileHandle.text());
```

### 4. Web Worker
**Location**: `src/lib/workers/force-simulation.worker.ts`
**Changes**: Added message validation, bounds checking, type validation

Key security patterns:
```typescript
// ✅ GOOD: Validate message before processing
const validation = isValidMessage(event.data);
if (!validation.valid) {
  self.postMessage({ type: "error", error: validation.error });
  return;
}

// ❌ BAD: Process message without validation
const { type, data } = event.data;
initSimulation(data);
```

---

## Security Checklist for New Features

### Before Committing Code

- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] No sensitive data in logs or error messages
- [ ] All user input validated before processing
- [ ] File uploads have size limits and type checking
- [ ] Redirects use allow-listed routes only
- [ ] Database queries use parameterized statements
- [ ] Error messages don't leak implementation details

### When Adding File Upload

```typescript
// Required validations:
1. File size limit (recommend 10MB max)
2. File type whitelist (extension + MIME type)
3. Filename sanitization (no path traversal)
4. Content validation (JSON schema, etc.)
5. Size limit on encoded/processed data
6. Error handling for parse failures
```

### When Adding URL Redirects

```typescript
// Required validations:
1. Protocol validation (must be relative path)
2. Allow-list of permitted routes
3. Path traversal prevention (.., //, \\)
4. Input sanitization (remove null bytes, etc.)
5. Length limits on all parameters
6. Regex validation for identifiers
```

### When Adding Web Workers

```typescript
// Required validations:
1. Message type whitelist
2. Message structure validation
3. Data type checking (typeof checks)
4. Array/object size limits
5. Reference validation (IDs exist)
6. Numeric bounds checking (finite numbers)
7. Error handling with try-catch
```

---

## Common Security Patterns

### Input Validation Template

```typescript
function validateInput(input: any): { valid: boolean; error?: string } {
  // Check type
  if (typeof input !== 'expected_type') {
    return { valid: false, error: 'Invalid type' };
  }

  // Check length/size
  if (input.length > MAX_LENGTH) {
    return { valid: false, error: 'Input too long' };
  }

  // Check format with regex
  if (!/^[a-z0-9-]+$/i.test(input)) {
    return { valid: false, error: 'Invalid format' };
  }

  // Check against whitelist
  const ALLOWED_VALUES = ['value1', 'value2'];
  if (!ALLOWED_VALUES.includes(input)) {
    return { valid: false, error: 'Not allowed' };
  }

  return { valid: true };
}
```

### Safe Redirect Pattern

```typescript
// Define allowed routes
const ALLOWED_ROUTES = ['/shows/', '/songs/'];

function safeRedirect(path: string) {
  // Validate format
  if (path.includes('..') || !path.startsWith('/')) {
    throw new Error('Invalid path');
  }

  // Check against whitelist
  if (!ALLOWED_ROUTES.some(allowed => path.startsWith(allowed))) {
    throw new Error('Route not allowed');
  }

  redirect(302, path);
}
```

### Safe File Processing Pattern

```typescript
async function processFile(file: File) {
  // Validate size
  if (file.size > MAX_SIZE || file.size === 0) {
    throw new Error('Invalid file size');
  }

  // Validate type
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error('Invalid file type');
  }

  // Safe parse
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON');
  }

  // Validate schema
  const validation = validateSchema(data);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return data;
}
```

---

## Security Don'ts

### ❌ Never Do This

```typescript
// DON'T: Trust user input
redirect(302, userInput);

// DON'T: Parse without try-catch
const data = JSON.parse(userJson);

// DON'T: Use eval() or Function() with user input
eval(userCode);

// DON'T: Hardcode secrets
const API_KEY = "sk_live_abc123...";

// DON'T: Log sensitive data
console.log('Password:', password);

// DON'T: Return detailed errors to client
catch (error) {
  return { error: error.stack };
}

// DON'T: Use innerHTML with user content
element.innerHTML = userContent;

// DON'T: Construct SQL with string concatenation
db.query(`SELECT * FROM users WHERE id = ${userId}`);
```

### ✅ Do This Instead

```typescript
// DO: Validate and sanitize
if (isAllowedRoute(userInput)) {
  redirect(302, userInput);
}

// DO: Safe parsing
try {
  const data = JSON.parse(userJson);
  validateSchema(data);
} catch {
  return { error: 'Invalid input' };
}

// DO: Use environment variables
const API_KEY = process.env.API_KEY;

// DO: Log safely
console.log('Login attempt for user:', userId); // Don't log password

// DO: Return generic errors
catch (error) {
  console.error('Internal error:', error);
  return { error: 'An error occurred' };
}

// DO: Use textContent
element.textContent = userContent;

// DO: Use parameterized queries
db.query('SELECT * FROM users WHERE id = ?', [userId]);
```

---

## Testing Security

### Manual Tests

```bash
# Test protocol handler
# Valid
web+dmb://show/1991-03-23
web+dmb://song/ants-marching

# Should fail
web+dmb://show/../../../admin
web+dmb://show/https://evil.com

# Test file upload
# Valid: 1MB .json file with valid schema
# Should fail: 20MB file
# Should fail: .exe file
# Should fail: invalid JSON
# Should fail: valid JSON but wrong schema

# Test worker
# Valid: config with 100 nodes, 200 links
# Should fail: config with 20,000 nodes
# Should fail: links referencing invalid nodes
# Should fail: non-numeric node IDs
```

### Automated Tests

Add to your test suite:
```typescript
describe('Security', () => {
  test('protocol handler rejects path traversal', () => {
    expect(() => processProtocolUrl('web+dmb://show/../admin')).toThrow();
  });

  test('file upload rejects large files', () => {
    const largeFile = new File([new ArrayBuffer(20 * 1024 * 1024)], 'large.json');
    expect(validateFile(largeFile).valid).toBe(false);
  });

  test('worker rejects invalid message type', () => {
    expect(isValidMessage({ type: 'malicious' }).valid).toBe(false);
  });
});
```

---

## Security Resources

### Internal
- Full report: `SECURITY_FIXES_REPORT.md`
- Agent roster: `.claude/AGENT_ROSTER.md`

### External
- OWASP Top 10: https://owasp.org/Top10/
- OWASP Cheat Sheets: https://cheatsheetseries.owasp.org/
- CWE Top 25: https://cwe.mitre.org/top25/
- MDN Web Security: https://developer.mozilla.org/en-US/docs/Web/Security

### Tools
- `npm audit` - Check for vulnerable dependencies
- `svelte-check` - Type safety and static analysis
- GitHub Dependabot - Automated dependency updates
- Snyk - Continuous security monitoring

---

## Questions?

If you're unsure about security implications:
1. Check this reference guide
2. Review `SECURITY_FIXES_REPORT.md` for examples
3. Consult OWASP cheat sheets
4. Ask the security team before implementing

**Remember**: It's easier to build security in than to bolt it on later.
