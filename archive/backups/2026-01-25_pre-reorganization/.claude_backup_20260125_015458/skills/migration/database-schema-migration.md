# Skill: Database Schema Migration

**ID**: `database-schema-migration`
**Category**: Migration
**Agent**: Migration Generator

---

## When to Use
- Adding new tables or columns
- Modifying existing schema
- Data transformations
- Zero-downtime deployments

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| change_type | string | yes | add, modify, remove |
| target | string | yes | Table or column name |
| specification | object | yes | Change details |

## Steps

### 1. Generate Migration File
```bash
npx prisma migrate dev --name add_user_preferences
```

### 2. Write Safe Migration
```sql
-- Migration: add_user_preferences
-- Safe: Can be deployed without downtime

-- Step 1: Add column as nullable
ALTER TABLE users ADD COLUMN preferences JSONB;

-- Step 2: Backfill data (do this in batches for large tables)
UPDATE users SET preferences = '{}' WHERE preferences IS NULL;

-- Step 3: Add NOT NULL constraint (separate deployment)
-- ALTER TABLE users ALTER COLUMN preferences SET NOT NULL;
```

### 3. Test Migration
```bash
# Test forward migration
npx prisma migrate deploy

# Verify data integrity
psql -c "SELECT COUNT(*) FROM users WHERE preferences IS NULL"

# Test rollback
npx prisma migrate reset --skip-seed
```

### 4. Production Deployment
```bash
# 1. Deploy migration
kubectl exec -it db-pod -- psql -f migration.sql

# 2. Verify
kubectl exec -it db-pod -- psql -c "\\d users"

# 3. Monitor
kubectl logs -f app-pod | grep -i error
```

## Rollback Script
```sql
-- Rollback: add_user_preferences
ALTER TABLE users DROP COLUMN IF EXISTS preferences;
```

## Best Practices
- Always write reversible migrations
- Add columns as nullable first
- Backfill in batches for large tables
- Test on production-like data
