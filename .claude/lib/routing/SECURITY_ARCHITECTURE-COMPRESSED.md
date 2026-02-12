# RouteTable Security Architecture

**Original**: 451 lines, 20KB (~5K tokens)
**Compressed**: ~130 lines, 3.1KB (~0.78K tokens)
**Ratio**: 84% reduction
**Date**: 2026-02-02

---

## Defense-in-Depth: 6-Layer Model

### Layer 1: Environment Sanitization
- REMOVE: process.env.CLAUDE_PROJECT_ROOT
- REMOVE: process.env.CLAUDE_ROUTE_TABLE_PATH
- USE: process.cwd() only
- Blocks: Env var injection attacks

### Layer 2: Path Resolution
- `resolve()` → absolute path
- `realpathSync()` → follow symlinks to destination
- Blocks: Symlink traversal attacks

### Layer 3: Boundary Validation
- Check: `path.startsWith(projectRoot + '/')`
- Blocks: `../../../etc/passwd`, `/etc/passwd`

### Layer 4: File Validation
- Extension whitelist: `.json` only
- Size limit: 10MB max
- Type check: Regular files only
- Blocks: Large file DoS, device access

### Layer 5: Secure File Read
- Read only after all layers pass
- Standard file I/O + JSON parsing

### Layer 6: Security Monitoring
- Track security violations
- Alert if violations > threshold
- Enable incident response

## Attack Scenarios

### Scenario 1: Path Traversal
```
Input: "../../../etc/passwd"
Layer 3: Blocked - path outside project
Result: SecurityError
```

### Scenario 2: Symlink Attack
```
Attacker: ln -s /etc/passwd .claude/config/route.json
Layer 2: realpathSync() → /etc/passwd
Layer 3: Blocked - resolved path outside project
Result: SecurityError
```

### Scenario 3: Environment Injection
```
Attacker: export CLAUDE_PROJECT_ROOT=/etc
Layer 1: IGNORE env var, use process.cwd()
Result: Ineffective
```

### Scenario 4: Large File DoS
```
Attack: 100MB JSON file
Layer 4: Blocked - exceeds 10MB limit
Result: SecurityError before memory exhaustion
```

## Security Controls Matrix

| Control | Type | Threat | Status |
|---------|------|--------|--------|
| Env sanitization | Preventive | Env injection | ✅ |
| Symlink resolution | Detective | Symlink traversal | ✅ |
| Path boundary | Preventive | Path traversal | ✅ |
| Directory whitelist | Preventive | Unauthorized access | ✅ |
| Extension whitelist | Preventive | File type confusion | ✅ |
| File size limit | Preventive | DoS (memory) | ✅ |
| Type validation | Preventive | Device access | ✅ |
| Violation tracking | Detective | Attack detection | ✅ |

## Threat Model

### Threat Actors
1. **External Attacker**: Path traversal, symlinks (mitigation: Layers 1-4)
2. **Malicious Dependency**: Env injection (mitigation: Layer 1)
3. **Insider Threat**: Directory traversal (mitigation: Layer 3 whitelist)
4. **DoS Attacker**: Large file exhaustion (mitigation: Layer 4)

### Assets Protected
- System config files (`/etc/*`)
- User credentials (`~/.ssh/*`, `~/.aws/*`)
- Application secrets (`.env`, credentials)
- System binaries (`/bin/*`)
- System memory

## Risk Assessment

**Before**: Path traversal (CRITICAL), Env injection (HIGH), Symlink (HIGH)
**After**: All risks reduced to LOW

## Performance Impact

```
Layer 1: ~0.5ms (one-time)
Layer 2: ~0.3ms (realpathSync)
Layer 3: ~0.1ms (boundary checks)
Layer 4: ~0.2ms (validation)
Layer 5: ~1.0ms (file read)
─────────────────
Total: ~2.1ms (acceptable, one-time init)
```

## Usage Examples

### Secure (default)
```typescript
const routeTable = new RouteTable();
const routeTable = new RouteTable('.claude/config/route-table.json');
```

### Blocked Attacks
```typescript
// ❌ Path traversal
new RouteTable('../../../etc/passwd');  // SecurityError

// ❌ Absolute path
new RouteTable('/etc/passwd');          // SecurityError

// ❌ Environment injection (ignored)
process.env.CLAUDE_PROJECT_ROOT = '/etc';
const routeTable = new RouteTable();    // Uses cwd() instead
```

## Compliance

- [x] OWASP Top 10 2021 (A01, A03, A04, A05, A09)
- [x] CWE Coverage (CWE-22, CWE-59, CWE-400)
- [x] SOC 2 Type II (CC6.1, CC6.6, CC7.2)
- [x] GDPR Article 32 (Technical controls)

## Monitoring Dashboard

```
Security Violations: 3 (all-time) ⚠️
Last Hour: 0
Project Root: /Users/project
Allowed Dirs: 3
Max File Size: 10 MB
Allowed Ext: .json
```

## Maintenance

### Reviews: Every 6 months
### Update when:
- New config locations added → Update `allowedDirectories`
- New file types needed → Update `ALLOWED_EXTENSIONS`
- New system paths → Update `isSensitiveSystemPath()`

### Monitoring
- Track `securityViolations` in production
- Alert if violations > 10/hour
- Investigate all violations

---

References: OWASP Path Traversal, CWE-22, Node.js Security Guide
