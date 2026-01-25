---
name: Web Security Audit
description: Comprehensive security review of web applications for OWASP Top 10 vulnerabilities, input validation, authentication security, and secure configuration
version: 1.0.0
author: Security Engineer
tags:
  - security
  - audit
  - owasp
  - vulnerability-assessment
  - web-security
  - input-validation
  - authentication
  - csp
  - cors
  - xss
  - injection
when_to_use:
  - Security code review of new features
  - Pre-deployment security assessment
  - Investigating potential vulnerabilities
  - Implementing authentication/authorization
  - Configuring security headers (CSP, CORS)
  - File upload functionality review
  - URL redirect/protocol handler implementation
  - Web Worker or Service Worker security
  - Third-party integration security review
related_skills:
  - pwa-security
  - authentication-design
  - api-security
---

# Web Security Audit Skill

## Overview

This skill provides systematic security assessment methodology for web applications, focusing on OWASP Top 10 vulnerabilities, secure coding patterns, and defense-in-depth strategies. Based on real-world security fixes in production PWA applications.

## Security Assessment Framework

### 1. Threat Modeling

Before reviewing code, establish context:

```
1. What assets are we protecting?
   - User data (PII, credentials, session tokens)
   - Application data (database, files, API keys)
   - System resources (memory, CPU, storage)

2. Who are the adversaries?
   - External attackers (anonymous, authenticated)
   - Malicious insiders
   - Compromised dependencies

3. What's the attack surface?
   - Client-side: Forms, file uploads, URL parameters, LocalStorage
   - Server-side: APIs, database queries, file system access
   - Third-party: CDNs, OAuth providers, analytics

4. What are trust boundaries?
   - User input → Application logic
   - Client → Server
   - Application → Database
   - Application → External services
```

### 2. OWASP Top 10 2021 Checklist

**A01: Broken Access Control**
- [ ] Open redirect vulnerabilities
- [ ] Insecure Direct Object References (IDOR)
- [ ] Path traversal in file operations
- [ ] Missing function-level access control
- [ ] Privilege escalation possibilities

**A02: Cryptographic Failures**
- [ ] Sensitive data transmitted over HTTP
- [ ] Weak encryption algorithms
- [ ] Hardcoded secrets/credentials
- [ ] Insecure password storage
- [ ] Missing HTTPS enforcement

**A03: Injection**
- [ ] SQL injection in database queries
- [ ] NoSQL injection
- [ ] OS command injection
- [ ] Template injection
- [ ] LDAP injection
- [ ] XSS (reflected, stored, DOM-based)

**A04: Insecure Design**
- [ ] Missing rate limiting
- [ ] No input validation strategy
- [ ] Lack of defense-in-depth
- [ ] Insecure by default configuration

**A05: Security Misconfiguration**
- [ ] Missing security headers (CSP, X-Frame-Options, etc.)
- [ ] Debug mode enabled in production
- [ ] Default credentials
- [ ] Unnecessary features enabled
- [ ] Verbose error messages

**A06: Vulnerable Components**
- [ ] Outdated dependencies with known CVEs
- [ ] Unmaintained packages
- [ ] Missing dependency integrity checks (SRI)

**A07: Authentication Failures**
- [ ] Weak password requirements
- [ ] Session fixation vulnerabilities
- [ ] Missing session timeout
- [ ] Credential stuffing protection
- [ ] Insecure password recovery

**A08: Software and Data Integrity**
- [ ] Missing code signing
- [ ] Insecure deserialization
- [ ] Untrusted CI/CD pipelines
- [ ] Missing integrity checks

**A09: Logging and Monitoring**
- [ ] Sensitive data in logs
- [ ] Missing security event logging
- [ ] No alerting on suspicious activity

**A10: Server-Side Request Forgery (SSRF)**
- [ ] User-controlled URLs fetched by server
- [ ] Missing URL validation
- [ ] Access to internal services

## Critical Security Patterns

### Input Validation

**Defense Pattern: Validate, Sanitize, Encode**

```typescript
// 1. VALIDATION: Check format and constraints
function validateInput(input: any): { valid: boolean; error?: string } {
  // Type checking
  if (typeof input !== 'string') {
    return { valid: false, error: 'Invalid type: expected string' };
  }

  // Length limits
  const MIN_LENGTH = 1;
  const MAX_LENGTH = 200;
  if (input.length < MIN_LENGTH || input.length > MAX_LENGTH) {
    return { valid: false, error: `Length must be ${MIN_LENGTH}-${MAX_LENGTH} chars` };
  }

  // Format validation with regex
  const VALID_FORMAT = /^[a-z0-9-]+$/i;
  if (!VALID_FORMAT.test(input)) {
    return { valid: false, error: 'Invalid format: alphanumeric and hyphens only' };
  }

  // Allow-listing (most secure)
  const ALLOWED_VALUES = ['value1', 'value2', 'value3'];
  if (!ALLOWED_VALUES.includes(input)) {
    return { valid: false, error: 'Value not in allowed list' };
  }

  return { valid: true };
}

// 2. SANITIZATION: Remove dangerous characters
function sanitizeInput(input: string): string {
  // Remove null bytes (path traversal)
  let clean = input.replace(/\0/g, '');

  // Remove path traversal sequences
  clean = clean.replace(/\.\./g, '');

  // Trim and remove leading/trailing slashes
  clean = clean.trim().replace(/^\/+|\/+$/g, '');

  return clean;
}

// 3. ENCODING: Escape for output context
function encodeForHTML(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Usage example
const userInput = getUserInput();
const validation = validateInput(userInput);
if (!validation.valid) {
  return { error: validation.error };
}

const sanitized = sanitizeInput(userInput);
const safeForHTML = encodeForHTML(sanitized);
```

### XSS Prevention

**Critical Rules:**
1. Never use `innerHTML`, `eval()`, or `Function()` with user content
2. Use `textContent` or framework-safe methods (Svelte bindings)
3. Encode output based on context (HTML, URL, JavaScript, CSS)
4. Implement Content Security Policy (CSP)

```typescript
// ❌ DANGEROUS: XSS vulnerability
element.innerHTML = userInput;
eval(userCode);
new Function(userCode)();

// ✅ SAFE: Use textContent
element.textContent = userInput;

// ✅ SAFE: Svelte automatic escaping
// <p>{userInput}</p>

// ✅ SAFE: Explicit encoding
element.textContent = encodeForHTML(userInput);

// ✅ SAFE: CSP headers
// Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'
```

### Open Redirect Prevention

**Attack Vector:** Attacker crafts URL that redirects to malicious site

```typescript
// ❌ VULNERABLE: Direct redirect
redirect(302, userProvidedUrl);

// ✅ SECURE: Allow-list validation
const ALLOWED_ROUTES = ['/shows/', '/songs/', '/venues/', '/search'];

function isAllowedRoute(route: string): boolean {
  // Must start with /
  if (!route.startsWith('/')) {
    return false;
  }

  // Block path traversal
  if (route.includes('..') || route.includes('//') || route.includes('\\')) {
    return false;
  }

  // Block absolute URLs
  if (route.includes(':') && !route.startsWith('/')) {
    return false;
  }

  // Check against whitelist
  return ALLOWED_ROUTES.some(allowed => route.startsWith(allowed));
}

// Safe redirect
function safeRedirect(targetRoute: string) {
  if (!isAllowedRoute(targetRoute)) {
    throw new Error('Unauthorized redirect attempt');
  }
  redirect(302, targetRoute);
}
```

### Protocol Handler Security

**Risk:** Custom URL schemes (`web+app://`) can be exploited for redirects

```typescript
// Example: web+dmb://song/../../admin/delete-all

function processProtocolUrl(url: string): { status: string; error?: string } {
  // Decode URL-encoded attempts
  const decodedUrl = decodeURIComponent(url);

  // 1. Validate protocol
  if (!decodedUrl.startsWith('web+dmb://')) {
    return { status: 'invalid_protocol', error: 'Invalid protocol' };
  }

  // 2. Remove protocol prefix
  const path = decodedUrl.replace('web+dmb://', '');

  // 3. Block path traversal
  if (path.includes('..') || path.includes('//') || path.includes('\\')) {
    return { status: 'invalid_format', error: 'Path traversal detected' };
  }

  // 4. Parse action and identifier
  const parts = path.split('/');
  const action = parts[0]; // e.g., "song", "show"
  const id = parts[1];     // e.g., "ants-marching", "1991-03-23"

  // 5. Validate action against whitelist
  const ALLOWED_ACTIONS = ['song', 'show', 'venue', 'guest', 'tour'];
  if (!ALLOWED_ACTIONS.includes(action)) {
    return { status: 'invalid_action', error: 'Action not allowed' };
  }

  // 6. Sanitize identifier
  const cleanId = sanitizeIdentifier(id);

  // 7. Validate identifier format per action
  const validation = validateIdentifierFormat(action, cleanId);
  if (!validation.valid) {
    return { status: 'invalid_id', error: validation.error };
  }

  // 8. Construct and validate final route
  const targetRoute = `/${action}s/${cleanId}`;
  if (!isAllowedRoute(targetRoute)) {
    return { status: 'route_blocked', error: 'Route not allowed' };
  }

  // 9. Safe to redirect
  redirect(302, targetRoute);
  return { status: 'success' };
}

function validateIdentifierFormat(action: string, id: string): { valid: boolean; error?: string } {
  switch (action) {
    case 'show':
      // YYYY-MM-DD format only
      if (!/^\d{4}-\d{2}-\d{2}$/.test(id)) {
        return { valid: false, error: 'Invalid show date format' };
      }
      break;

    case 'song':
      // Alphanumeric and hyphens, max 200 chars
      if (!/^[a-z0-9-]+$/i.test(id) || id.length > 200) {
        return { valid: false, error: 'Invalid song identifier' };
      }
      break;

    case 'venue':
    case 'guest':
    case 'tour':
      // Numeric only, max 20 digits
      if (!/^\d+$/.test(id) || id.length > 20) {
        return { valid: false, error: 'Invalid numeric identifier' };
      }
      break;
  }

  return { valid: true };
}
```

### File Upload Security

**Critical Validations:**
1. File size limits (DoS prevention)
2. File type whitelist (extension + MIME type)
3. Filename sanitization (path traversal)
4. Content validation (schema, structure)
5. Virus scanning (if applicable)

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['json', 'dmb', 'setlist'];
const MAX_FILENAME_LENGTH = 255;

async function validateFile(
  file: File,
  fileHandle: FileSystemFileHandle
): Promise<{ valid: boolean; error?: string }> {

  // 1. Check file size
  if (fileHandle.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum ${MAX_FILE_SIZE / 1024 / 1024}MB`
    };
  }

  if (fileHandle.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  // 2. Check filename length
  if (file.name.length > MAX_FILENAME_LENGTH) {
    return { valid: false, error: 'Filename too long' };
  }

  // 3. Validate file extension
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
    };
  }

  // 4. Check for path traversal in filename
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return { valid: false, error: 'Invalid filename' };
  }

  // 5. Read and validate content
  let fileText: string;
  try {
    fileText = await fileHandle.text();
  } catch (error) {
    return { valid: false, error: 'Failed to read file' };
  }

  // 6. Parse JSON safely
  let fileData: any;
  try {
    fileData = JSON.parse(fileText);
  } catch (error) {
    return { valid: false, error: 'Invalid JSON format' };
  }

  // 7. Validate JSON schema
  const schemaValidation = validateJsonSchema(fileData, fileExtension);
  if (!schemaValidation.valid) {
    return schemaValidation;
  }

  return { valid: true };
}

function validateJsonSchema(data: any, fileType: string): { valid: boolean; error?: string } {
  // Type-specific validation
  switch (fileType) {
    case 'show':
      if (typeof data.date !== 'string' || !data.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return { valid: false, error: 'Invalid show: missing or malformed date' };
      }
      if (typeof data.venue !== 'string' || data.venue.length === 0) {
        return { valid: false, error: 'Invalid show: missing venue' };
      }
      break;

    case 'batch':
      if (!Array.isArray(data)) {
        return { valid: false, error: 'Batch must be an array' };
      }
      if (data.length > 1000) {
        return { valid: false, error: 'Batch too large: max 1000 items' };
      }
      break;

    // Additional types...
  }

  return { valid: true };
}
```

### Web Worker Security

**Risk:** Workers run in separate thread with access to sensitive operations

```typescript
const MAX_NODES = 10000;
const MAX_LINKS = 50000;
const MAX_DIMENSION = 10000;

// Validate incoming messages
self.onmessage = (event: MessageEvent) => {
  try {
    // 1. Validate message structure
    const messageValidation = isValidMessage(event.data);
    if (!messageValidation.valid) {
      self.postMessage({ type: 'error', error: messageValidation.error });
      return;
    }

    const { type, data } = event.data;

    // 2. Process by type
    switch (type) {
      case 'init':
        const configValidation = isValidSimulationConfig(data);
        if (!configValidation.valid) {
          self.postMessage({ type: 'error', error: configValidation.error });
          return;
        }
        initSimulation(data);
        break;

      case 'drag':
        const dragValidation = isValidDragData(data);
        if (!dragValidation.valid) {
          self.postMessage({ type: 'error', error: dragValidation.error });
          return;
        }
        handleDrag(data);
        break;

      default:
        self.postMessage({ type: 'error', error: 'Unknown message type' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    self.postMessage({ type: 'error', error: errorMessage });
  }
};

function isValidMessage(message: any): { valid: boolean; error?: string } {
  if (!message || typeof message !== 'object') {
    return { valid: false, error: 'Invalid message format' };
  }

  if (typeof message.type !== 'string') {
    return { valid: false, error: 'Message type must be a string' };
  }

  const ALLOWED_TYPES = ['init', 'drag', 'stop', 'reheat'];
  if (!ALLOWED_TYPES.includes(message.type)) {
    return { valid: false, error: `Invalid message type: ${message.type}` };
  }

  return { valid: true };
}

function isValidSimulationConfig(config: any): { valid: boolean; error?: string } {
  // Validate dimensions
  if (typeof config.width !== 'number' || config.width <= 0 || config.width > MAX_DIMENSION) {
    return { valid: false, error: `Invalid width: 0-${MAX_DIMENSION}` };
  }

  if (typeof config.height !== 'number' || config.height <= 0 || config.height > MAX_DIMENSION) {
    return { valid: false, error: `Invalid height: 0-${MAX_DIMENSION}` };
  }

  // Validate nodes
  if (!Array.isArray(config.nodes)) {
    return { valid: false, error: 'Nodes must be an array' };
  }

  if (config.nodes.length > MAX_NODES) {
    return { valid: false, error: `Too many nodes: max ${MAX_NODES}` };
  }

  // Validate each node
  for (let i = 0; i < config.nodes.length; i++) {
    const node = config.nodes[i];

    if (typeof node.id !== 'number') {
      return { valid: false, error: `Node ${i}: id must be number` };
    }

    if (typeof node.totalAppearances !== 'number' || node.totalAppearances < 0) {
      return { valid: false, error: `Node ${i}: totalAppearances must be non-negative` };
    }
  }

  // Validate links
  if (!Array.isArray(config.links)) {
    return { valid: false, error: 'Links must be an array' };
  }

  if (config.links.length > MAX_LINKS) {
    return { valid: false, error: `Too many links: max ${MAX_LINKS}` };
  }

  // Validate link references
  const nodeIds = new Set(config.nodes.map((n: any) => n.id));
  for (let i = 0; i < config.links.length; i++) {
    const link = config.links[i];

    if (!nodeIds.has(link.source)) {
      return { valid: false, error: `Link ${i}: source node ${link.source} not found` };
    }

    if (!nodeIds.has(link.target)) {
      return { valid: false, error: `Link ${i}: target node ${link.target} not found` };
    }
  }

  return { valid: true };
}
```

### Cookie Security

**Critical Attributes:**
- `HttpOnly`: Prevent JavaScript access (XSS protection)
- `Secure`: HTTPS only
- `SameSite=Strict|Lax`: CSRF protection
- `Path=/`: Scope limitation
- `Max-Age`: Expiration

```typescript
// ✅ SECURE: Session cookie
response.headers.set('Set-Cookie',
  `session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`
);

// ❌ INSECURE: Missing security attributes
response.headers.set('Set-Cookie', `session=${sessionId}`);
```

### Content Security Policy (CSP)

**Defense:** Prevent XSS by restricting resource sources

```html
<!-- Strict CSP for PWA -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'nonce-{RANDOM_NONCE}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

**CSP Directives Explained:**
- `default-src 'self'`: Only load resources from same origin
- `script-src 'self' 'nonce-{random}'`: Scripts from same origin or with nonce
- `style-src 'self' 'unsafe-inline'`: Styles (allow inline for frameworks)
- `img-src 'self' data: https:`: Images from self, data URIs, or HTTPS
- `connect-src 'self' https://api`: XHR/fetch to same origin or API
- `frame-ancestors 'none'`: Prevent clickjacking (like X-Frame-Options: DENY)
- `base-uri 'self'`: Prevent base tag injection
- `form-action 'self'`: Forms submit to same origin only

### CORS Configuration

**Risk:** Overly permissive CORS allows credential theft

```typescript
// ❌ DANGEROUS: Allow all origins
response.headers.set('Access-Control-Allow-Origin', '*');
response.headers.set('Access-Control-Allow-Credentials', 'true');

// ✅ SECURE: Whitelist specific origins
const ALLOWED_ORIGINS = ['https://app.example.com', 'https://admin.example.com'];

function setCORSHeaders(request: Request, response: Response) {
  const origin = request.headers.get('Origin');

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }
}
```

### Authentication Security

**Best Practices:**

```typescript
// Password requirements
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_REQUIRE_COMPLEXITY = true; // uppercase, lowercase, number, symbol

// Session management
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SESSION_ABSOLUTE_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours

// Rate limiting
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Token security
function generateSecureToken(): string {
  // Use cryptographically secure random
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Password hashing (server-side)
import bcrypt from 'bcryptjs';

async function hashPassword(password: string): Promise<string> {
  const SALT_ROUNDS = 12;
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
```

## Security Headers Checklist

Essential HTTP security headers:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

## Secrets Management

**Never commit:**
- API keys
- Passwords
- Private keys (`.pem`, `.key`)
- Service account credentials
- Database connection strings with passwords
- Session secrets
- OAuth client secrets

**Best practices:**

```bash
# .gitignore patterns
.env
.env.*
!.env.example
*.pem
*.key
credentials*.json
service-account*.json
*.db
*.sqlite
```

```typescript
// ✅ GOOD: Use environment variables
const API_KEY = process.env.API_KEY;

// ❌ BAD: Hardcoded secret
const API_KEY = 'sk_live_abc123xyz789';
```

## Security Audit Workflow

### 1. Pre-Audit Setup
```bash
# Check for secrets in codebase
git grep -i "api_key\|password\|secret\|token" src/

# Check dependencies for vulnerabilities
npm audit --audit-level=moderate

# Run type checker
npm run check

# Check for TODO/FIXME security notes
git grep -i "TODO.*security\|FIXME.*security"
```

### 2. Manual Code Review

Focus areas in priority order:

1. **Authentication/Authorization**: Login, session management, access control
2. **Input Validation**: All user input points (forms, URLs, file uploads)
3. **Output Encoding**: Anywhere user data is displayed
4. **Redirects**: All `redirect()` calls, protocol handlers
5. **Database Queries**: Check for SQL injection
6. **File Operations**: Uploads, downloads, path construction
7. **API Integrations**: External service calls, webhooks
8. **Error Handling**: Information leakage in errors

### 3. Security Testing

```typescript
// Example security test suite
describe('Security', () => {
  describe('Input Validation', () => {
    test('rejects path traversal in file paths', () => {
      expect(() => validatePath('../../../etc/passwd')).toThrow();
    });

    test('rejects script injection in user input', () => {
      const input = '<script>alert("xss")</script>';
      expect(sanitizeInput(input)).not.toContain('<script>');
    });

    test('rejects SQL injection patterns', () => {
      expect(() => buildQuery("1'; DROP TABLE users--")).toThrow();
    });
  });

  describe('Authentication', () => {
    test('enforces password complexity', () => {
      expect(isValidPassword('password')).toBe(false);
      expect(isValidPassword('P@ssw0rd123!')).toBe(true);
    });

    test('rate limits login attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await attemptLogin('user', 'wrong');
      }
      await expect(attemptLogin('user', 'wrong')).rejects.toThrow('Account locked');
    });
  });

  describe('Authorization', () => {
    test('prevents access to unauthorized routes', async () => {
      const response = await fetch('/admin', { headers: { Authorization: 'Bearer user_token' } });
      expect(response.status).toBe(403);
    });
  });
});
```

### 4. Reporting Format

```markdown
## Security Assessment Summary
- **Scope**: [Features/files reviewed]
- **Overall Risk**: Critical | High | Medium | Low
- **Findings**: X critical, Y high, Z medium

## Findings

### [CRITICAL] Finding Title
**Location**: `src/path/to/file.ts:123`
**Vulnerability Type**: CWE-XXX: Description
**OWASP Category**: A0X:2021 - Category

#### Description
Clear explanation of the vulnerability.

#### Attack Scenario
1. Attacker does X
2. System responds with Y
3. Attacker achieves Z

#### Impact
- Data breach / Code execution / Denial of Service
- Specific consequences for this application

#### Remediation
```typescript
// Before (vulnerable)
// code

// After (secure)
// code
```

#### Testing
How to verify the fix works.

---

## Positive Findings
- Security controls working well

## Recommendations
1. Immediate fixes required
2. Short-term improvements
3. Long-term security enhancements
```

## Common Pitfalls

### What NOT to Do

```typescript
// ❌ NEVER: Trust user input
redirect(302, userInput);
element.innerHTML = userContent;
db.query(`SELECT * FROM users WHERE id = ${userId}`);

// ❌ NEVER: Use weak randomness for security
Math.random(); // Not cryptographically secure

// ❌ NEVER: Log sensitive data
console.log('User password:', password);
console.log('Session token:', session.token);

// ❌ NEVER: Return detailed errors to client
catch (error) {
  return { error: error.stack }; // Leaks implementation details
}

// ❌ NEVER: Disable security features
helmet({ contentSecurityPolicy: false });

// ❌ NEVER: Use eval or Function with user input
eval(userCode);
new Function(userInput)();
```

### What TO Do

```typescript
// ✅ ALWAYS: Validate and sanitize
const validation = validateInput(userInput);
if (!validation.valid) {
  return { error: validation.error };
}

// ✅ ALWAYS: Use cryptographically secure random
crypto.getRandomValues(array);

// ✅ ALWAYS: Log safely
console.log('Login attempt for user ID:', userId); // Don't log password

// ✅ ALWAYS: Return generic errors
catch (error) {
  console.error('Internal error:', error); // Log server-side
  return { error: 'An error occurred. Please try again.' }; // Return to client
}

// ✅ ALWAYS: Use parameterized queries
db.query('SELECT * FROM users WHERE id = ?', [userId]);

// ✅ ALWAYS: Encode output
element.textContent = userContent; // Automatic escaping
```

## Tools and Resources

### Automated Security Tools
- **npm audit**: Dependency vulnerability scanning
- **Snyk**: Continuous security monitoring
- **ESLint security plugins**: Static analysis for code patterns
- **GitHub Dependabot**: Automated dependency updates
- **OWASP ZAP**: Web application security scanner
- **Burp Suite**: Manual security testing

### Reference Documentation
- OWASP Top 10 2021: https://owasp.org/Top10/
- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/
- CWE Top 25: https://cwe.mitre.org/top25/
- MDN Web Security: https://developer.mozilla.org/en-US/docs/Web/Security
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework

### Internal Resources
- Security fixes report: `SECURITY_FIXES_REPORT.md`
- Security quick reference: `SECURITY_QUICK_REFERENCE.md`
- Agent roster: `.claude/AGENT_ROSTER.md`

## Related Skills

- **pwa-security**: PWA-specific security (Service Workers, Web App Manifest)
- **api-security**: REST API security, rate limiting, API key management
- **authentication-design**: OAuth 2.0, OIDC, session management
- **database-security**: SQL injection prevention, query parameterization
- **cryptography**: Encryption, hashing, key management

## Version History

- **1.0.0** (2026-01-21): Initial version based on DMB Almanac security audit
  - OWASP Top 10 2021 coverage
  - Real-world examples from production fixes
  - Protocol handler, file upload, Web Worker security patterns
  - CSP, CORS, cookie security guidance
