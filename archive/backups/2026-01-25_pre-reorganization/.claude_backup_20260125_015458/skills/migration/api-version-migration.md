# Skill: API Version Migration

**ID**: `api-version-migration`
**Category**: Migration
**Agent**: API Migrator

---

## When to Use
- Upgrading to new API versions
- Handling breaking changes
- Migrating deprecated endpoints
- Updating client libraries

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| api_name | string | yes | API to migrate |
| from_version | string | yes | Current version |
| to_version | string | yes | Target version |

## Steps

### 1. Review Breaking Changes
```bash
# Check changelog/migration guide
curl https://api.example.com/v2/migration-guide
```

### 2. Create Migration Map
```typescript
const MIGRATIONS: Record<string, MigrationRule> = {
  '/users/{id}': {
    v1: { method: 'GET', response: 'UserV1' },
    v2: { method: 'GET', response: 'UserV2', transform: transformUser },
  },
  '/users/{id}/posts': {
    v1: { method: 'GET', deprecated: true },
    v2: { method: 'GET', path: '/posts?userId={id}' }, // Moved
  },
};

function transformUser(v1Response: UserV1): UserV2 {
  return {
    ...v1Response,
    fullName: `${v1Response.firstName} ${v1Response.lastName}`,
    // Remove deprecated fields
    firstName: undefined,
    lastName: undefined,
  };
}
```

### 3. Update Client Code
```typescript
// Before (v1)
const user = await api.get(`/v1/users/${id}`);

// After (v2)
const user = await api.get(`/v2/users/${id}`);
// Or with adapter
const user = await v2Adapter.getUser(id);
```

### 4. Test Migration
```bash
# Run both versions in parallel
npm run test:api-migration
```

## Rollback Plan
1. Keep v1 client code in feature flag
2. Monitor error rates during migration
3. Revert to v1 if error rate > 1%
