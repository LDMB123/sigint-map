# RouteTable Security Quick Reference

## Safe Usage

### ✅ Secure Patterns

```typescript
// Let RouteTable use default secure path
const routeTable = new RouteTable();

// Use relative path from project root (automatically validated)
const routeTable = new RouteTable('.claude/config/route-table.json');

// Check security stats
const stats = routeTable.getStats();
console.log(`Security violations: ${stats.securityViolations}`);
```

### ❌ Anti-Patterns (Blocked by Security Controls)

```typescript
// ❌ Path traversal - BLOCKED
new RouteTable('../../../etc/passwd');

// ❌ Absolute paths outside project - BLOCKED
new RouteTable('/etc/passwd');

// ❌ Environment variable injection - IGNORED
process.env.CLAUDE_PROJECT_ROOT = '/tmp/malicious';
new RouteTable(); // Uses process.cwd() instead

// ❌ Non-JSON files - BLOCKED
new RouteTable('.claude/config/script.sh');

// ❌ Files outside whitelist - BLOCKED
new RouteTable('some/random/directory/file.json');
```

## Security Controls

### 1. Path Validation
- All paths resolved to absolute paths
- Symlinks resolved via `realpathSync()`
- Paths must be within project root
- Paths must be in allowed directories

### 2. Allowed Directories (Whitelist)
- `.claude/config/`
- `.claude/lib/routing/`
- `config/`

### 3. File Restrictions
- **Extension**: Only `.json` files
- **Max Size**: 10MB
- **Type**: Regular files only (no devices, sockets, directories)

### 4. Environment Protection
- `CLAUDE_PROJECT_ROOT` - NOT TRUSTED (uses `process.cwd()`)
- `CLAUDE_ROUTE_TABLE_PATH` - NOT TRUSTED (removed)

## Security Monitoring

```typescript
const stats = routeTable.getStats();

// Monitor for attacks
if (stats.securityViolations > 0) {
  console.warn(`⚠️ Security violations detected: ${stats.securityViolations}`);
}

// Verify configuration
console.log(`Project root: ${stats.projectRoot}`);
console.log(`Allowed directories: ${stats.allowedDirectoryCount}`);
```

## Attack Prevention

| Attack Type | Protection | Status |
|-------------|------------|--------|
| Path traversal (`../`) | Path boundary check | ✅ Blocked |
| Absolute paths | Project root validation | ✅ Blocked |
| Symlink attacks | `realpathSync()` resolution | ✅ Resolved |
| Environment injection | No env var trust | ✅ Blocked |
| File size DoS | 10MB limit | ✅ Blocked |
| Wrong file type | Extension whitelist | ✅ Blocked |
| Unauthorized directories | Directory whitelist | ✅ Blocked |

## Error Messages

```typescript
// Path traversal detected
// "Security: Path traversal detected - path outside project: ../../etc/passwd"

// Invalid extension
// "Security: Invalid file extension - only .json allowed: .sh"

// File too large
// "Security: File too large (15728640 bytes > 10485760 bytes): large.json"

// Not in whitelist
// "Security: Path not in allowed directories: /some/random/path"

// Not a file
// "Security: Path is not a regular file: /some/directory"
```

## Testing Security

```bash
# Run manual security tests
node .claude/lib/routing/__tests__/security-manual-test.cjs

# Expected: All security controls pass
# ✓ Path traversal blocked
# ✓ Extension validation working
# ✓ Size limits enforced
# ✓ Whitelist enforced
```

## When to Add to Whitelist

Only add directories if:
1. They contain route configuration files
2. They are within the project boundary
3. They are controlled by the application (not user-writable)

```typescript
// To modify whitelist, update constructor:
this.allowedDirectories = new Set([
  join(this.projectRoot, '.claude', 'config'),
  join(this.projectRoot, '.claude', 'lib', 'routing'),
  join(this.projectRoot, 'config'),
  // Add new directory here
  join(this.projectRoot, 'safe', 'directory')
]);
```

## Security Checklist

Before deploying:
- [ ] Route table files in allowed directories
- [ ] No environment variables used for paths
- [ ] File size < 10MB
- [ ] Only `.json` files
- [ ] Monitor `securityViolations` metric
- [ ] Test with security test suite
- [ ] Review logs for violation attempts

## Incident Response

If `securityViolations` counter increases:

1. **Investigate**: Check application logs for violation details
2. **Assess**: Determine if it's an attack or misconfiguration
3. **Respond**: Block malicious source if attack detected
4. **Review**: Audit route table file permissions
5. **Update**: Strengthen controls if new attack vector found

## Contact

For security issues:
- Review: `/Users/louisherman/ClaudeCodeProjects/.claude/lib/routing/SECURITY_AUDIT_REPORT.md`
- Tests: `/Users/louisherman/ClaudeCodeProjects/.claude/lib/routing/__tests__/security-manual-test.cjs`
