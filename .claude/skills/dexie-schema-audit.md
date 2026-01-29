---
skill: dexie-schema-audit
description: Dexie.js IndexedDB Schema Audit
---

# Dexie.js IndexedDB Schema Audit

## Usage

```
/dexie-schema-audit [database-name] [audit-scope]
```

## Instructions

You are an expert in IndexedDB and Dexie.js with deep knowledge of schema design, index optimization, and data modeling for offline-first SvelteKit applications. You understand Dexie's declarative schema syntax, compound indexes, multi-entry indexes, and the performance implications of different indexing strategies.

Audit the Dexie.js database schema for correctness, performance, and maintainability.

## Dexie Schema Syntax Reference

| Symbol | Meaning | Example | Use Case |
|--------|---------|---------|----------|
| `++` | Auto-increment | `++id` | Primary key |
| `&` | Unique | `&email` | Unique constraint |
| `*` | Multi-entry | `*tags` | Array indexing |
| `[a+b]` | Compound | `[firstName+lastName]` | Multi-field queries |
| (none) | Indexed | `name` | Regular index |

## Index Type Comparison

| Index Type | Query Speed | Storage Cost | Update Cost | Use Case |
|------------|-------------|--------------|-------------|----------|
| Primary key | O(1) | Low | Low | ID lookups |
| Unique index | O(1) | Medium | Medium | Email, username |
| Regular index | O(log n) | Medium | Medium | Filtering |
| Compound index | O(log n) | High | High | Multi-field queries |
| Multi-entry | O(log n * m) | High | High | Array fields |

## Schema Definition Patterns

### Basic Database Setup

```typescript
// src/lib/db/index.ts
import Dexie, { type Table } from 'dexie';

// Type definitions
export interface User {
  id?: number;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id?: number;
  authorId: number;
  title: string;
  content: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id?: number;
  postId: number;
  authorId: number;
  content: string;
  createdAt: Date;
}

export interface SyncMeta {
  id?: number;
  table: string;
  lastSync: Date;
  cursor?: string;
}

// Database class
export class AppDatabase extends Dexie {
  users!: Table<User>;
  posts!: Table<Post>;
  comments!: Table<Comment>;
  syncMeta!: Table<SyncMeta>;

  constructor() {
    super('AppDatabase');

    this.version(1).stores({
      // Primary key: auto-increment id
      // Indexes: email (unique), name
      users: '++id, &email, name',

      // Primary key: auto-increment id
      // Indexes: authorId, status, [authorId+status], *tags, publishedAt
      posts: '++id, authorId, status, [authorId+status], *tags, publishedAt',

      // Primary key: auto-increment id
      // Indexes: postId, authorId, [postId+createdAt]
      comments: '++id, postId, authorId, [postId+createdAt]',

      // Primary key: auto-increment id
      // Index: table (unique)
      syncMeta: '++id, &table'
    });
  }
}

export const db = new AppDatabase();
```

### Schema Audit Utilities

```typescript
// src/lib/db/audit.ts
import Dexie from 'dexie';
import { db } from './index';

export interface SchemaAuditResult {
  tableName: string;
  primaryKey: string;
  indexes: IndexAuditResult[];
  issues: SchemaIssue[];
  suggestions: string[];
}

export interface IndexAuditResult {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
  auto: boolean;
  usage: 'high' | 'medium' | 'low' | 'unknown';
}

export interface SchemaIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

export async function auditSchema(): Promise<SchemaAuditResult[]> {
  const results: SchemaAuditResult[] = [];

  for (const table of db.tables) {
    const result = await auditTable(table);
    results.push(result);
  }

  return results;
}

async function auditTable(table: Dexie.Table): Promise<SchemaAuditResult> {
  const schema = table.schema;
  const issues: SchemaIssue[] = [];
  const suggestions: string[] = [];

  // Analyze primary key
  const primaryKey = schema.primKey;
  if (!primaryKey.auto && !primaryKey.keyPath) {
    issues.push({
      severity: 'warning',
      message: 'Table has no auto-increment or explicit primary key',
      field: 'primKey'
    });
  }

  // Analyze indexes
  const indexes: IndexAuditResult[] = [];

  for (const idx of schema.indexes) {
    const indexResult: IndexAuditResult = {
      name: idx.name,
      keyPath: idx.keyPath,
      unique: idx.unique,
      multiEntry: idx.multi,
      auto: idx.auto,
      usage: 'unknown'
    };

    // Check for potential issues
    if (idx.multi && Array.isArray(idx.keyPath)) {
      issues.push({
        severity: 'error',
        message: 'Multi-entry index cannot have compound keyPath',
        field: idx.name
      });
    }

    if (idx.unique && idx.multi) {
      issues.push({
        severity: 'warning',
        message: 'Unique multi-entry index may cause unexpected constraint violations',
        field: idx.name
      });
    }

    indexes.push(indexResult);
  }

  // Check for common patterns
  const hasCreatedAt = indexes.some(i =>
    i.keyPath === 'createdAt' ||
    (Array.isArray(i.keyPath) && i.keyPath.includes('createdAt'))
  );

  if (!hasCreatedAt) {
    suggestions.push('Consider adding createdAt index for temporal queries');
  }

  // Check index count
  if (indexes.length > 10) {
    issues.push({
      severity: 'warning',
      message: `Table has ${indexes.length} indexes which may impact write performance`
    });
  }

  return {
    tableName: table.name,
    primaryKey: typeof primaryKey.keyPath === 'string'
      ? primaryKey.keyPath
      : primaryKey.keyPath?.join('+') || 'outbound',
    indexes,
    issues,
    suggestions
  };
}

// Analyze actual index usage from query patterns
export async function analyzeIndexUsage(
  table: Dexie.Table,
  sampleQueries: Array<() => Promise<any>>
): Promise<Map<string, number>> {
  const usage = new Map<string, number>();

  // This would require instrumentation of actual queries
  // For now, return placeholder
  return usage;
}
```

### Schema Validation

```typescript
// src/lib/db/validate.ts
import { db } from './index';

export interface ValidationRule {
  table: string;
  field: string;
  rule: (value: any) => boolean;
  message: string;
}

export const validationRules: ValidationRule[] = [
  {
    table: 'users',
    field: 'email',
    rule: (v) => typeof v === 'string' && v.includes('@'),
    message: 'Invalid email format'
  },
  {
    table: 'posts',
    field: 'status',
    rule: (v) => ['draft', 'published', 'archived'].includes(v),
    message: 'Invalid status value'
  },
  {
    table: 'posts',
    field: 'tags',
    rule: (v) => Array.isArray(v),
    message: 'Tags must be an array'
  }
];

export function validateRecord(
  table: string,
  record: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const rules = validationRules.filter(r => r.table === table);

  for (const rule of rules) {
    if (rule.field in record) {
      if (!rule.rule(record[rule.field])) {
        errors.push(`${rule.field}: ${rule.message}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Add hooks for validation
db.users.hook('creating', (primKey, obj) => {
  const result = validateRecord('users', obj);
  if (!result.valid) {
    throw new Error(`Validation failed: ${result.errors.join(', ')}`);
  }
});

db.posts.hook('creating', (primKey, obj) => {
  const result = validateRecord('posts', obj);
  if (!result.valid) {
    throw new Error(`Validation failed: ${result.errors.join(', ')}`);
  }
});
```

### Query Pattern Analysis

```typescript
// src/lib/db/query-patterns.ts
import { db, type Post, type User } from './index';

// Common query patterns and their index requirements

/**
 * Pattern: Find user by email
 * Required index: &email (unique)
 * Complexity: O(1)
 */
export async function findUserByEmail(email: string): Promise<User | undefined> {
  return db.users.where('email').equals(email).first();
}

/**
 * Pattern: Get posts by author with status filter
 * Required index: [authorId+status] (compound)
 * Complexity: O(log n)
 */
export async function getPostsByAuthorAndStatus(
  authorId: number,
  status: Post['status']
): Promise<Post[]> {
  return db.posts
    .where('[authorId+status]')
    .equals([authorId, status])
    .toArray();
}

/**
 * Pattern: Find posts by tag
 * Required index: *tags (multi-entry)
 * Complexity: O(log n * avg_tags)
 */
export async function findPostsByTag(tag: string): Promise<Post[]> {
  return db.posts.where('tags').equals(tag).toArray();
}

/**
 * Pattern: Get recent published posts
 * Required index: publishedAt
 * Complexity: O(log n + k) where k is result count
 */
export async function getRecentPublishedPosts(limit: number): Promise<Post[]> {
  return db.posts
    .where('status')
    .equals('published')
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Pattern: Paginated comments for post
 * Required index: [postId+createdAt] (compound)
 * Complexity: O(log n)
 */
export async function getPaginatedComments(
  postId: number,
  offset: number,
  limit: number
) {
  return db.comments
    .where('[postId+createdAt]')
    .between([postId, Dexie.minKey], [postId, Dexie.maxKey])
    .offset(offset)
    .limit(limit)
    .toArray();
}
```

### Performance Benchmarking

```typescript
// src/lib/db/benchmark.ts
import { db } from './index';

export interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
}

export async function benchmarkOperation(
  name: string,
  operation: () => Promise<any>,
  iterations: number = 100
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < 10; i++) {
    await operation();
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await operation();
    times.push(performance.now() - start);
  }

  return {
    operation: name,
    iterations,
    totalMs: times.reduce((a, b) => a + b, 0),
    avgMs: times.reduce((a, b) => a + b, 0) / times.length,
    minMs: Math.min(...times),
    maxMs: Math.max(...times)
  };
}

export async function runBenchmarkSuite(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  // Benchmark primary key lookup
  results.push(await benchmarkOperation(
    'Primary key lookup',
    () => db.users.get(1)
  ));

  // Benchmark unique index lookup
  results.push(await benchmarkOperation(
    'Unique index lookup (email)',
    () => db.users.where('email').equals('test@example.com').first()
  ));

  // Benchmark compound index
  results.push(await benchmarkOperation(
    'Compound index query',
    () => db.posts.where('[authorId+status]').equals([1, 'published']).toArray()
  ));

  // Benchmark multi-entry index
  results.push(await benchmarkOperation(
    'Multi-entry index query (tags)',
    () => db.posts.where('tags').equals('javascript').toArray()
  ));

  // Benchmark range query
  results.push(await benchmarkOperation(
    'Range query (publishedAt)',
    () => db.posts.where('publishedAt').above(new Date('2024-01-01')).toArray()
  ));

  return results;
}
```

### Storage Analysis

```typescript
// src/lib/db/storage.ts
export interface StorageAnalysis {
  totalSize: number;
  tableBreakdown: Map<string, number>;
  indexOverhead: number;
  quota: number;
  usage: number;
}

export async function analyzeStorage(): Promise<StorageAnalysis> {
  const estimate = await navigator.storage.estimate();

  // Get approximate table sizes by counting records
  const tableBreakdown = new Map<string, number>();

  // This is an approximation - IndexedDB doesn't expose actual sizes
  for (const table of db.tables) {
    const count = await table.count();
    // Rough estimate: 1KB per record average
    tableBreakdown.set(table.name, count * 1024);
  }

  const totalSize = Array.from(tableBreakdown.values()).reduce((a, b) => a + b, 0);

  return {
    totalSize,
    tableBreakdown,
    indexOverhead: totalSize * 0.3, // Estimate 30% index overhead
    quota: estimate.quota || 0,
    usage: estimate.usage || 0
  };
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}
```

### Response Format

```markdown
## Dexie.js Schema Audit Report

### Database Overview
- Name: [Database name]
- Version: [Current version]
- Tables: [Count]
- Total indexes: [Count]

### Table Analysis

#### [Table Name]
| Property | Value |
|----------|-------|
| Primary Key | [Key definition] |
| Index Count | [Number] |
| Estimated Size | [Size] |

**Indexes:**
| Name | Type | Unique | Multi-Entry | Query Pattern |
|------|------|--------|-------------|---------------|
| [name] | [type] | Yes/No | Yes/No | [pattern] |

**Issues:**
- [Severity] [Issue description]

**Suggestions:**
- [Suggestion]

### Performance Analysis

| Query Pattern | Index Used | Complexity | Benchmark |
|---------------|------------|------------|-----------|
| [Pattern] | [Index] | O(?) | X.XX ms |

### Storage Analysis
- Total usage: [Size]
- Quota available: [Size]
- Index overhead: ~[Percentage]%

### Schema Recommendations

1. **Add Index**: [table].[field]
   - Reason: [Why needed]
   - Impact: [Performance improvement]

2. **Remove Index**: [table].[field]
   - Reason: [Why unused]
   - Impact: [Write performance improvement]

3. **Compound Index**: [table].[field1+field2]
   - Reason: [Query pattern]
   - Impact: [Performance improvement]

### Optimized Schema
```typescript
this.version(X).stores({
  // Optimized schema
});
```

### Migration Required
- [ ] Yes / [ ] No
- Breaking changes: [List]
```
