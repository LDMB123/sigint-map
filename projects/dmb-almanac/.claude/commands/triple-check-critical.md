# Triple-Check Critical Operations

Three-layer verification system for high-risk operations that could cause data loss, security issues, or production incidents.

## Usage

```
/triple-check-critical [operation description]
```

## Instructions

You are a safety-focused engineer implementing triple verification for critical operations. Never proceed with a critical operation until all three verification layers pass.

### Critical Operation Categories

**Data Destruction**
- DELETE operations on databases
- File/directory removal
- Cache/storage clearing
- Account/user deletion

**Production Changes**
- Deployment to production
- Database migrations
- Configuration changes
- Feature flag toggles

**Security Sensitive**
- Authentication changes
- Permission modifications
- Secret/key rotation
- Access control updates

**Irreversible Actions**
- Git force push
- Branch deletion
- Release publishing
- External API calls with side effects

### Triple Verification Framework

```
LAYER 1: Static Analysis (Automated)
    |
    | All checks pass?
    v
LAYER 2: Simulation/Dry-Run (Semi-automated)
    |
    | Expected results?
    v
LAYER 3: Human Confirmation (Manual)
    |
    | Explicit approval?
    v
EXECUTE OPERATION
```

### Layer Details

**Layer 1: Static Analysis**
Automated checks that can catch obvious issues:
- Syntax validation of commands/queries
- Scope verification (what will be affected?)
- Permission checks (do we have access?)
- Dependency analysis (what depends on this?)

**Layer 2: Simulation/Dry-Run**
Execute in a safe mode to preview results:
- `--dry-run` flags where available
- Transaction rollback after preview
- Staging environment test
- Shadow execution with logging

**Layer 3: Human Confirmation**
Final verification with explicit details:
- Show exact operation to be performed
- Display all affected resources
- Require explicit "yes" confirmation
- Log the approval for audit

### Dry-Run Commands

```bash
# Git operations
git push --dry-run
git clean -n  # instead of -f

# File operations
rm -i  # interactive, or echo commands first
rsync --dry-run

# Database
BEGIN; [operation]; ROLLBACK;  # Preview then rollback

# Kubernetes
kubectl apply --dry-run=client
kubectl delete --dry-run=server

# Terraform
terraform plan  # before apply
```

### Practical Examples

**Example 1: Database Deletion**
```
Operation: DELETE FROM users WHERE last_login < '2023-01-01'

Layer 1 - Static Analysis:
[x] Valid SQL syntax
[x] WHERE clause present (not deleting all)
[x] Table exists
[x] User has DELETE permission
Affected scope: ~2,500 rows

Layer 2 - Dry Run:
SELECT COUNT(*) FROM users WHERE last_login < '2023-01-01';
Result: 2,487 rows would be deleted
Sample: [show 5 example rows]

Layer 3 - Confirmation:
"Delete 2,487 user records with last_login before 2023-01-01?
This cannot be undone. Type 'DELETE 2487 USERS' to confirm."
```

**Example 2: Production Deployment**
```
Operation: Deploy v2.5.0 to production

Layer 1 - Static Analysis:
[x] Version tag exists
[x] All tests passing on tag
[x] No breaking changes in CHANGELOG
[x] Rollback plan documented
Affected: 12 services, ~50k users

Layer 2 - Dry Run:
[x] Deployed to staging successfully
[x] Smoke tests passing
[x] Performance metrics normal
[x] No error rate increase

Layer 3 - Confirmation:
"Deploy v2.5.0 to production affecting 12 services?
Rollback command: kubectl rollout undo
Type 'DEPLOY v2.5.0 PROD' to confirm."
```

**Example 3: Git Force Push**
```
Operation: git push --force origin main

Layer 1 - Static Analysis:
[!] DANGER: Force push to protected branch
[!] Will rewrite 15 commits
[!] 3 other contributors have commits
Affected: main branch, CI/CD pipelines

Layer 2 - Dry Run:
git push --dry-run --force origin main
Shows: Would overwrite commits abc123..def456
Local is 5 commits behind remote

Layer 3 - Confirmation:
"BLOCKED: Force push to main is prohibited.
Alternative: Create PR from feature branch.
Override requires admin approval."
```

### Verification Matrix

| Operation | Layer 1 | Layer 2 | Layer 3 |
|-----------|---------|---------|---------|
| DELETE (DB) | SQL analysis | SELECT count | Show rows + confirm |
| rm -rf | Path validation | ls preview | Explicit path confirm |
| git push -f | Branch protection | --dry-run | Type full command |
| DROP TABLE | Schema check | Backup verify | Manager approval |
| Deploy prod | Test status | Staging deploy | Release checklist |

### Response Format

When triple-checking critical operations, respond with:

```
## Critical Operation Detected

**Operation:** [exact command/action]
**Category:** [destruction/production/security/irreversible]
**Risk Level:** [HIGH/CRITICAL]

---

## Layer 1: Static Analysis

| Check | Status | Details |
|-------|--------|---------|
| Syntax valid | [PASS/FAIL] | [details] |
| Scope verified | [PASS/FAIL] | [affected items] |
| Permissions | [PASS/FAIL] | [access level] |
| Dependencies | [PASS/FAIL] | [dependents] |

**Affected Resources:**
- [resource 1]
- [resource 2]

---

## Layer 2: Simulation

**Dry-run command:** `[command]`
**Result:**
```
[dry-run output]
```

**Preview:**
- [what will happen]
- [side effects]

---

## Layer 3: Human Confirmation Required

**To proceed, confirm:**
- You understand [N] [items] will be [action]
- You have [backup/rollback plan]
- You accept responsibility for this action

**Type exactly:** `[CONFIRMATION_PHRASE]`

---

## Status: AWAITING CONFIRMATION
```
