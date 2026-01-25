# Parallel Security Vulnerability Scan

## Usage

Run this command to perform a comprehensive parallel security audit of your codebase, identifying vulnerabilities, misconfigurations, and security best practice violations.

```
/parallel-security
```

## Instructions

Use a swarm pattern with 6 parallel Haiku workers to scan for security vulnerabilities comprehensively. Each worker specializes in a specific security domain.

### Worker Assignments

**Worker 1: Injection Vulnerability Scanner**
- Scan for SQL injection patterns
- Check for XSS vulnerabilities
- Identify command injection risks
- Find LDAP/NoSQL injection vectors
- Flag template injection vulnerabilities

**Worker 2: Authentication & Authorization Auditor**
- Review authentication flow security
- Check session management patterns
- Identify authorization bypass risks
- Validate JWT implementation
- Flag insecure credential handling

**Worker 3: Data Exposure Analyst**
- Scan for hardcoded secrets/credentials
- Check for sensitive data in logs
- Identify PII exposure risks
- Review API response data leakage
- Flag insecure data storage patterns

**Worker 4: Dependency Vulnerability Scanner**
- Check npm/yarn audit results
- Identify known CVEs in dependencies
- Review dependency version pinning
- Find abandoned/unmaintained packages
- Flag supply chain attack vectors

**Worker 5: Configuration Security Auditor**
- Review security headers (CSP, CORS, etc.)
- Check environment variable handling
- Identify insecure default configurations
- Validate HTTPS enforcement
- Flag debug/development code in production

**Worker 6: Input Validation & Cryptography**
- Review input validation patterns
- Check file upload security
- Audit cryptographic implementations
- Validate secure random generation
- Flag deprecated crypto algorithms

### Response Format

Provide a consolidated summary table followed by detailed findings:

| Worker | Area | Critical | High | Medium | Low | OWASP Category |
|--------|------|----------|------|--------|-----|----------------|
| 1 | Injection | X | X | X | X | A03:2021 |
| 2 | Auth/Authz | X | X | X | X | A01:2021, A07:2021 |
| 3 | Data Exposure | X | X | X | X | A02:2021 |
| 4 | Dependencies | X | X | X | X | A06:2021 |
| 5 | Configuration | X | X | X | X | A05:2021 |
| 6 | Input/Crypto | X | X | X | X | A02:2021 |

**Security Score: X/100**
**OWASP Top 10 Coverage: X/10 categories checked**

Then provide:
1. Critical vulnerabilities requiring immediate remediation
2. High-priority security fixes
3. Dependency update recommendations
4. Security header configuration
5. Secure coding practices to adopt
6. Security testing recommendations
7. Compliance checklist (OWASP, SANS, etc.)
