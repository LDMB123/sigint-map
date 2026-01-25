# Security Library - Usage Guide

This directory contains security utilities for the DMB Almanac PWA, implementing defense-in-depth protections against OWASP Top 10 vulnerabilities.

## Table of Contents

1. [XSS Prevention](#xss-prevention)
2. [CSRF Protection](#csrf-protection)
3. [Best Practices](#best-practices)
4. [Examples](#examples)

---

## XSS Prevention

**File**: `sanitize.ts`

### When to Use

Use these utilities whenever displaying user-generated content or dynamic data in the DOM.

### Functions

#### `escapeHtml(text: string): string`

Escapes HTML special characters to prevent XSS when inserting text into HTML context.

```typescript
import { escapeHtml } from '$lib/security/sanitize';

const userInput = '<script>alert("XSS")</script>';
const safe = escapeHtml(userInput);
// Result: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'

element.innerHTML = `<p>${safe}</p>`; // Safe
```

**When to use**: Displaying user text in HTML templates

---

#### `sanitizeHtml(html: string): string`

Strips dangerous HTML tags and attributes, allowing only safe formatting tags.

**Allowed tags**: `b`, `i`, `em`, `strong`, `u`, `br`, `p`, `span`, `div`

```typescript
import { sanitizeHtml } from '$lib/security/sanitize';

const userHtml = '<p>Hello</p><script>alert("XSS")</script>';
const safe = sanitizeHtml(userHtml);
// Result: '<p>Hello</p>' (script removed)

element.innerHTML = safe; // Safe
```

**When to use**: Displaying rich text content from users

---

#### `stripHtml(html: string): string`

Removes all HTML tags, returning plain text only. **Safest option**.

```typescript
import { stripHtml } from '$lib/security/sanitize';

const userHtml = '<p>Hello <b>World</b></p>';
const safe = stripHtml(userHtml);
// Result: 'Hello World'

element.textContent = safe; // Safest
```

**When to use**: When you don't need any HTML formatting

---

#### `sanitizeUrl(url: string): string`

Validates and sanitizes URLs, blocking dangerous protocols.

**Allowed protocols**: `http:`, `https:`, `mailto:`, `tel:`

```typescript
import { sanitizeUrl } from '$lib/security/sanitize';

const userUrl = 'javascript:alert(document.cookie)';
const safe = sanitizeUrl(userUrl);
// Result: '' (blocked)

const validUrl = 'https://example.com';
const safe2 = sanitizeUrl(validUrl);
// Result: 'https://example.com'

linkElement.href = safe2; // Safe
```

**When to use**: Setting `href` or `src` attributes from user input

---

#### `setSafeInnerHTML(element: HTMLElement, html: string): void`

Helper function that automatically sanitizes before setting innerHTML.

```typescript
import { setSafeInnerHTML } from '$lib/security/sanitize';

const userContent = '<p>Hello</p><script>alert("XSS")</script>';
setSafeInnerHTML(element, userContent);
// Element now contains: <p>Hello</p> (script removed)
```

---

#### `setSafeTextContent(element: HTMLElement, text: string): void`

Helper function for setting text content (preferred over innerHTML).

```typescript
import { setSafeTextContent } from '$lib/security/sanitize';

const userText = '<script>alert("XSS")</script>';
setSafeTextContent(element, userText);
// Element displays: <script>alert("XSS")</script> (as text, not executed)
```

---

#### `html` Tagged Template Literal

Safe template literal tag for creating HTML with automatic escaping.

```typescript
import { html } from '$lib/security/sanitize';

const userName = '<script>alert("XSS")</script>';
const userBio = 'Loves music';

const safe = html`
  <div class="profile">
    <h2>${userName}</h2>
    <p>${userBio}</p>
  </div>
`;
// userName automatically escaped, XSS prevented
```

---

### Best Practices for XSS Prevention

#### ✅ DO

```typescript
// Use textContent for plain text
element.textContent = userInput;

// Use DOM API for structured content
const p = document.createElement('p');
p.textContent = userInput;
element.appendChild(p);

// Use sanitize utilities if innerHTML is required
import { sanitizeHtml } from '$lib/security/sanitize';
element.innerHTML = sanitizeHtml(userInput);

// Use html tagged template
import { html } from '$lib/security/sanitize';
element.innerHTML = html`<p>${userInput}</p>`;
```

#### ❌ DON'T

```typescript
// NEVER do this with user input
element.innerHTML = userInput; // VULNERABLE TO XSS

// NEVER use unsafe string concatenation
element.innerHTML = '<p>' + userInput + '</p>'; // VULNERABLE

// NEVER trust user input
element.outerHTML = userInput; // VULNERABLE
```

---

## CSRF Protection

**File**: `csrf.ts`

### When to Use

Use CSRF protection for all state-changing API requests (POST, PUT, PATCH, DELETE).

### Client-Side Usage

#### Automatic Protection with `secureFetch`

**Recommended approach** - Automatically includes CSRF token:

```typescript
import { secureFetch } from '$lib/security/csrf';

// POST request with automatic CSRF token
const response = await secureFetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: 'value' })
});

// GET requests don't need CSRF tokens (automatically handled)
const response2 = await secureFetch('/api/data');
```

---

#### Manual Token Management

For custom fetch logic:

```typescript
import { getCSRFToken, addCSRFHeader } from '$lib/security/csrf';

// Get current token
const token = getCSRFToken();

// Add token to request manually
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token
  },
  credentials: 'same-origin', // Include cookies
  body: JSON.stringify(data)
});

// OR use helper to add headers
const response2 = await fetch('/api/endpoint', addCSRFHeader({
  method: 'POST',
  body: JSON.stringify(data)
}));
```

---

#### Token Lifecycle

```typescript
import { getCSRFToken, rotateCSRFToken, clearCSRFToken } from '$lib/security/csrf';

// Get or create token (automatic on first call)
const token = getCSRFToken();

// Rotate token (after login/logout)
const newToken = rotateCSRFToken();

// Clear token (on logout)
clearCSRFToken();
```

---

### Server-Side Usage

#### Validate CSRF Token in API Routes

```typescript
import type { RequestHandler } from '@sveltejs/kit';
import { validateCSRF } from '$lib/security/csrf';

export const POST: RequestHandler = async ({ request }) => {
  // CSRF validation
  const csrfError = validateCSRF(request);
  if (csrfError) {
    return csrfError; // Returns 403 Forbidden
  }

  // Token valid - process request
  // ...
};
```

---

#### Manual Token Validation

```typescript
import { validateCSRFToken } from '$lib/security/csrf';

const headerToken = request.headers.get('X-CSRF-Token');
const cookieHeader = request.headers.get('Cookie');

if (!validateCSRFToken(headerToken, cookieHeader)) {
  return new Response('Invalid CSRF token', { status: 403 });
}
```

---

### CSRF Best Practices

#### ✅ DO

```typescript
// Use secureFetch for all API calls
import { secureFetch } from '$lib/security/csrf';
await secureFetch('/api/endpoint', { method: 'POST', body });

// Validate CSRF on all state-changing endpoints
import { validateCSRF } from '$lib/security/csrf';
export const POST: RequestHandler = async ({ request }) => {
  const csrfError = validateCSRF(request);
  if (csrfError) return csrfError;
  // ...
};

// Rotate token after authentication changes
import { rotateCSRFToken } from '$lib/security/csrf';
rotateCSRFToken(); // After login/logout
```

#### ❌ DON'T

```typescript
// DON'T use regular fetch for POST requests
await fetch('/api/endpoint', { method: 'POST', body }); // Missing CSRF token

// DON'T skip CSRF validation on API routes
export const POST: RequestHandler = async ({ request }) => {
  // Missing validateCSRF() - VULNERABLE
  const data = await request.json();
  // ...
};

// DON'T expose CSRF tokens in URLs
const url = `/api/endpoint?csrf=${token}`; // WRONG
```

---

## Best Practices

### 1. Input Validation

**Always validate on server-side**, even if client validates:

```typescript
function validateEmail(email: string): boolean {
  // Validate format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return false;
  }

  // Validate length
  if (email.length > 254) {
    return false;
  }

  return true;
}
```

---

### 2. Output Encoding

**Encode based on context**:

- **HTML Context**: Use `escapeHtml()` or `textContent`
- **URL Context**: Use `sanitizeUrl()` and `encodeURIComponent()`
- **JavaScript Context**: Use `escapeJavaScript()`

```typescript
import { escapeHtml, sanitizeUrl, escapeJavaScript } from '$lib/security/sanitize';

// HTML context
element.innerHTML = `<p>${escapeHtml(userInput)}</p>`;

// URL context
const url = `/search?q=${encodeURIComponent(userInput)}`;
linkElement.href = sanitizeUrl(url);

// JavaScript context (if absolutely necessary)
const script = `var name = '${escapeJavaScript(userInput)}';`;
```

---

### 3. Defense in Depth

**Layer multiple security controls**:

```typescript
// Layer 1: Input validation
if (!validateEmail(email)) {
  throw new Error('Invalid email');
}

// Layer 2: CSRF protection
const csrfError = validateCSRF(request);
if (csrfError) return csrfError;

// Layer 3: Rate limiting (via hooks.server.ts)
// Automatically applied

// Layer 4: Output encoding
const safeEmail = escapeHtml(email);

// Layer 5: CSP headers (via hooks.server.ts)
// Automatically applied
```

---

### 4. Least Privilege

**Minimize permissions**:

```typescript
// Good: Specific permissions
const userData = {
  name: user.name,
  email: user.email
};

// Bad: Exposing entire user object
const userData = user; // May include password hash, tokens, etc.
```

---

## Examples

### Example 1: Displaying User Profile

```typescript
import { escapeHtml, sanitizeUrl } from '$lib/security/sanitize';

function renderUserProfile(user: User) {
  const name = escapeHtml(user.name);
  const bio = sanitizeHtml(user.bio); // Allow basic formatting
  const website = sanitizeUrl(user.website);

  return `
    <div class="profile">
      <h2>${name}</h2>
      <div class="bio">${bio}</div>
      <a href="${website}" target="_blank" rel="noopener noreferrer">
        Website
      </a>
    </div>
  `;
}
```

---

### Example 2: Submitting Form with CSRF Protection

```typescript
import { secureFetch } from '$lib/security/csrf';
import { escapeHtml } from '$lib/security/sanitize';

async function submitComment(comment: string) {
  try {
    // Client-side validation
    if (comment.length === 0) {
      throw new Error('Comment cannot be empty');
    }

    if (comment.length > 1000) {
      throw new Error('Comment too long');
    }

    // Submit with CSRF protection
    const response = await secureFetch('/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ comment })
    });

    if (!response.ok) {
      throw new Error('Failed to submit comment');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Comment submission failed:', error);
    throw error;
  }
}
```

---

### Example 3: Server-Side API Endpoint

```typescript
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { validateCSRF } from '$lib/security/csrf';

interface CommentRequest {
  comment: string;
}

export const POST: RequestHandler = async ({ request }) => {
  // CSRF validation
  const csrfError = validateCSRF(request);
  if (csrfError) {
    return csrfError;
  }

  // Content-Type validation
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return json({ error: 'Invalid Content-Type' }, { status: 400 });
  }

  // Parse and validate input
  let body: CommentRequest;
  try {
    body = await request.json();
  } catch (error) {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Input validation
  if (!body.comment || typeof body.comment !== 'string') {
    return json({ error: 'Comment is required' }, { status: 400 });
  }

  if (body.comment.length > 1000) {
    return json({ error: 'Comment too long' }, { status: 400 });
  }

  // Process comment (strip HTML for safety)
  const safeComment = stripHtml(body.comment);

  // Save to database
  // ...

  return json({ success: true });
};
```

---

## Testing Security Controls

### Test XSS Prevention

```typescript
import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeHtml, stripHtml } from '$lib/security/sanitize';

describe('XSS Prevention', () => {
  it('should escape HTML special characters', () => {
    const input = '<script>alert("XSS")</script>';
    const output = escapeHtml(input);
    expect(output).not.toContain('<script>');
    expect(output).toContain('&lt;script&gt;');
  });

  it('should remove dangerous tags', () => {
    const input = '<p>Safe</p><script>alert("XSS")</script>';
    const output = sanitizeHtml(input);
    expect(output).toContain('<p>Safe</p>');
    expect(output).not.toContain('<script>');
  });

  it('should strip all HTML', () => {
    const input = '<p>Hello <b>World</b></p>';
    const output = stripHtml(input);
    expect(output).toBe('Hello World');
  });
});
```

---

### Test CSRF Protection

```typescript
import { describe, it, expect } from 'vitest';
import { getCSRFToken, validateCSRFToken } from '$lib/security/csrf';

describe('CSRF Protection', () => {
  it('should generate unique tokens', () => {
    const token1 = getCSRFToken();
    const token2 = getCSRFToken();
    expect(token1).toBe(token2); // Same session should return same token
  });

  it('should validate matching tokens', () => {
    const token = getCSRFToken();
    const cookie = `csrf_token=${token}`;
    const isValid = validateCSRFToken(token, cookie);
    expect(isValid).toBe(true);
  });

  it('should reject mismatched tokens', () => {
    const token = getCSRFToken();
    const wrongCookie = 'csrf_token=different-token';
    const isValid = validateCSRFToken(token, wrongCookie);
    expect(isValid).toBe(false);
  });
});
```

---

## Additional Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [SvelteKit Security Documentation](https://kit.svelte.dev/docs/security)

---

## Support

For security concerns or questions:
- Review the security report: `/SECURITY_REPORT.md`
- Check OWASP guidelines: https://owasp.org/
- Contact security team: security@dmbalmanac.com
