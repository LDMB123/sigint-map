---
name: sveltekit-dexie-schema-audit
description: "sveltekit dexie schema audit for DMB Almanac project"
tags: ['project-specific', 'dmb-almanac']
---
# Skill: Dexie Schema & Index Audit

**ID**: `dexie-schema-audit`
**Category**: Database / IndexedDB
**Framework**: SvelteKit

---

## When to Use

- Before adding new tables or indexes to Dexie schema
- Performance issues with IndexedDB queries
- Schema version upgrade planning
- Data integrity concerns
- Optimizing local-first database performance

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to SvelteKit project root |
| schema_file_path | string | No | Path to Dexie schema file (defaults to lib/db/schema.ts) |

---

## Steps

### Step 1: Locate Schema Definition

Search for Dexie schema files in the project.

```bash
# Find files containing Dexie schema definitions
find . -name "*.ts" -exec grep -l "Dexie\|\.stores(" {} \;
```

Common locations:
- `src/lib/db/schema.ts`
- `src/lib/db/dexie/schema.ts`
- `src/lib/database/index.ts`

### Step 2: Document Current Schema

Extract and document the current schema version and table definitions.

```typescript
// Extract schema definition
// Look for: db.version(N).stores({...})

// Example schema (v3):
const SCHEMA = {
  users: '&id, email, *roles, createdAt',
  posts: '&id, authorId, slug, publishedAt, [authorId+publishedAt]',
  comments: '&id, postId, userId, [postId+createdAt]',
  tags: '&id, name',
  postTags: '&id, [postId+tagId]',
};
```

Document:
- Current version number
- All tables and their indexes
- Primary key strategy (auto-increment vs. server-assigned)
- Any compound indexes

### Step 3: Analyze Index Usage

Search the codebase for all Dexie query patterns to identify which indexes are actually used.

```typescript
// Search for .where() and .orderBy() calls
// Good: Using defined index
db.posts.where('slug').equals(slug)

// Good: Using compound index
db.posts.where('[authorId+publishedAt]').between(
  [authorId, startDate],
  [authorId, endDate]
)

// Bad: Not using any index (full table scan)
db.posts.filter(post => post.authorId === authorId && post.publishedAt > startDate)

// Bad: Using .filter() when index exists
db.posts.filter(post => post.slug === slug)  // Should use .where('slug')
```

### Step 4: Identify Index Issues

Use this checklist to identify schema optimization opportunities.

#### Unused Indexes
Indexes that are defined but never queried:
- [ ] Compare all defined indexes against .where() calls
- [ ] Check all .orderBy() calls use indexed fields
- [ ] Remove unused indexes to reduce storage overhead

#### Missing Indexes
Queries that would benefit from indexes:
- [ ] Frequent .filter() calls on specific fields
- [ ] Slow queries (> 100ms for < 10,000 records)
- [ ] Compound queries that perform full scans instead of seeks
- [ ] Foreign key fields frequently used in joins

#### Low-Selectivity Indexes
Avoid indexing fields with low selectivity:
- [ ] Boolean fields (isActive, isDeleted, isPublished)
- [ ] Fields with < 10 unique values
- [ ] Frequently updated fields (updatedAt with real-time changes)

### Step 5: Check Primary Key Design

Evaluate primary key strategies for each table.

```typescript
// Good: Server-assigned ID for synced data
users: '&id, ...'  // & = unique, non-auto-increment

// Good: Auto-increment for local-only data
userPreferences: '++id, ...'  // ++ = auto-increment primary key

// Consider: UUID for offline-first with sync
sessions: '&uuid, ...'  // String UUIDs work but are slower

// Avoid: String primary key when numeric ID available
posts: '&slug, ...'  // Slower than numeric; use secondary index instead
posts: '&id, slug, ...'  // Better: numeric PK + indexed slug
```

Evaluation criteria:
- Is data server-synced or local-only?
- Are string IDs necessary (UUIDs for offline creation)?
- Can numeric IDs be used for better performance?

### Step 6: Validate Foreign Key References

Dexie doesn't enforce referential integrity, so manual validation is required.

```typescript
// Check referential integrity manually
async function validateForeignKeys() {
  const errors: string[] = [];

  // Example: Check posts → users foreign key
  const posts = await db.posts.toArray();
  const userIds = new Set((await db.users.toArray()).map(u => u.id));

  for (const post of posts) {
    if (!userIds.has(post.authorId)) {
      errors.push(`Post ${post.id} references invalid user ${post.authorId}`);
    }
  }

  // Example: Check many-to-many integrity
  const postTags = await db.postTags.toArray();
  const postIds = new Set((await db.posts.toArray()).map(p => p.id));
  const tagIds = new Set((await db.tags.toArray()).map(t => t.id));

  for (const pt of postTags) {
    if (!postIds.has(pt.postId)) {
      errors.push(`PostTag ${pt.id} references invalid post ${pt.postId}`);
    }
    if (!tagIds.has(pt.tagId)) {
      errors.push(`PostTag ${pt.id} references invalid tag ${pt.tagId}`);
    }
  }

  return errors;
}
```

### Step 7: Generate Recommendations

Compile audit findings into actionable recommendations.

Categories:
1. **Add indexes** - For frequently queried fields without indexes
2. **Remove indexes** - For indexes never used in queries
3. **Convert to compound indexes** - For queries filtering on multiple fields
4. **Fix primary keys** - For tables using inefficient PK strategies
5. **Add foreign key validation** - For relationships lacking integrity checks

---

## Index Types in Dexie

| Syntax | Type | Use Case | Example |
|--------|------|----------|---------|
| `id` | Simple index | Single field queries | `users: 'id, email'` |
| `&id` | Unique index | Primary key, unique constraints | `users: '&id, email'` |
| `++id` | Auto-increment | Local-only data | `logs: '++id, message'` |
| `*tags` | Multi-entry | Array fields (tags, categories) | `posts: '&id, *tags'` |
| `[a+b]` | Compound | Multi-field queries | `logs: '[userId+date]'` |

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| schema-audit-report.md | `.claude/artifacts/` | Complete audit report |
| schema-diagram.txt | `.claude/artifacts/` | Visual schema representation |
| index-recommendations.md | `.claude/artifacts/` | Optimization suggestions |

---

## Output Template

```markdown
## Dexie Schema Audit Report

**Date**: [YYYY-MM-DD]
**Schema Version**: [N]
**Project**: [Project Name]

---

### Tables Summary

| Table | Indexes | Est. Records | Est. Size |
|-------|---------|--------------|-----------|
| [table1] | [N] | [~X] | [X]MB |
| [table2] | [N] | [~X] | [X]MB |
| [table3] | [N] | [~X] | [X]MB |

**Total Tables**: [N]
**Total Indexes**: [N]

---

### Index Analysis

#### Used Indexes

| Table | Index | Query Pattern | Used By |
|-------|-------|---------------|---------|
| [table] | [index] | .where('[index]') | [function/component] |
| [table] | [a+b] | .where('[a+b]').between() | [function/component] |

#### Unused Indexes

| Table | Index | Recommendation |
|-------|-------|----------------|
| [table] | [index] | Remove - never queried |
| [table] | [index] | Remove - duplicate of [other] |

#### Missing Indexes

| Table | Suggested Index | Current Query Pattern | Impact |
|-------|-----------------|----------------------|--------|
| [table] | [field] | .filter(x => x.[field]) | High - full scan |
| [table] | [a+b] | .filter(x => x.[a] && x.[b]) | Medium - partial scan |

---

### Primary Key Audit

| Table | Primary Key | Type | Status | Recommendation |
|-------|-------------|------|--------|----------------|
| [table] | &id | numeric unique | ✅ Good | - |
| [table] | &slug | string unique | ⚠️ Consider | Use numeric ID + indexed slug |
| [table] | ++id | auto-increment | ✅ Good | - |

---

### Foreign Key Integrity

**Validation Status**: [✅ Pass / ❌ Failed]
**Errors Found**: [N]

#### Errors (if any)
- [Table] record [ID] references invalid [foreign_table] ID [foreign_id]
- [Table] orphaned record [ID] - parent record deleted

#### Recommendations
- Add foreign key validation in data access layer
- Implement cascading deletes for [relationship]
- Add referential integrity tests

---

### Query Performance Analysis

| Query Location | Pattern | Index Used | Est. Performance |
|----------------|---------|------------|------------------|
| [file:line] | .where('[field]') | ✅ Yes | Fast (< 10ms) |
| [file:line] | .filter() | ❌ No | Slow (> 100ms) |

---

### Recommendations

#### High Priority
1. **Add index**: `[table].[field]` for query in [location]
   - Current: Full table scan
   - Impact: Improves query from O(n) to O(log n)

#### Medium Priority
2. **Remove index**: `[table].[unused_field]`
   - Reason: Never queried in codebase
   - Benefit: Reduces storage overhead

3. **Convert to compound**: `[table].[a+b]` instead of separate indexes
   - Combines queries in [location]
   - Reduces index count

#### Low Priority
4. **Consider refactoring**: [suggestion]

---

### Schema Migration Plan

If recommendations are implemented:

```typescript
db.version([N+1]).stores({
  [table]: '[updated schema]',
  // ... other tables
});
```

---

### Next Steps

1. [ ] Review recommendations with team
2. [ ] Create migration plan for approved changes
3. [ ] Implement schema version [N+1]
4. [ ] Run migration safety tests
5. [ ] Deploy schema update
```
