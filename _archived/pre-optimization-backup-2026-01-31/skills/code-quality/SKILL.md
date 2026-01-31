---
name: code-quality
description: >
  Code review, security auditing, and test generation workflows
  including multi-perspective review, vulnerability scanning,
  secret detection, and comprehensive test suite creation.
disable-model-invocation: true
user-invocable: true
allowed-tools:
  - Read
  - Edit
  - Grep
  - Glob
  - Bash
---

# Code Quality Skill

Combined code review, security audit, and test generation
capabilities for maintaining high-quality codebases.

## Capabilities

### Code Review
- Static analysis (syntax, style, patterns)
- Semantic review (logic, maintainability)
- Security scanning (vulnerabilities, secrets)
- Auto-fix generation for common issues

### Security Audit
- Vulnerability scanning across codebase
- Secret and credential detection
- Dependency audit (outdated, CVEs, licenses)
- Compliance checking (OWASP, SOC2, HIPAA, GDPR, PCI-DSS)

### Test Generation
- Unit test creation from source analysis
- Integration test scaffolding
- E2E test generation
- Edge case identification
- Coverage-targeted test refinement

## When to Use

- Before merging pull requests (code review)
- During security hardening phases (security audit)
- When adding test coverage to existing code (test generation)
- For compliance verification (security audit with frameworks)

## Code Review Procedure

1. Discover affected files (glob, git diff, or explicit path)
2. Run static analysis (syntax, style checks)
3. Perform semantic review (logic, maintainability) - standard/deep depth
4. Execute security scan if security is in focus
5. Aggregate and deduplicate findings
6. Prioritize by severity
7. Generate fixes for auto-fixable issues if requested

## Security Audit Procedure

1. Index all source and configuration files
2. Scan for code vulnerabilities (injection, XSS, CSRF, etc.)
3. Detect hardcoded secrets and credentials
4. Audit dependency manifests for CVEs
5. Check compliance against selected frameworks
6. Generate prioritized report with remediation steps

## Test Generation Procedure

1. Analyze source code structure (functions, classes, dependencies)
2. Generate initial test suite with mocks
3. Analyze coverage gaps
4. Refine tests to reach coverage target (iterate up to 3x)
5. Validate test quality (assertions, flaky patterns)

## Severity Levels

- **Critical**: Security vulnerabilities, data exposure, crashes
- **High**: Logic errors, performance regressions, missing validation
- **Medium**: Code smells, maintainability issues, incomplete error handling
- **Low**: Style issues, documentation gaps, naming conventions
