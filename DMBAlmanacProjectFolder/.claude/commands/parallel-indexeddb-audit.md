# Parallel IndexedDB/Dexie Audit

## Usage

Run this command to perform a comprehensive parallel audit of your IndexedDB implementation, including Dexie.js patterns, schema design, and performance optimization.

```
/parallel-indexeddb-audit
```

## Instructions

Use a swarm pattern with 5 parallel Haiku workers to audit IndexedDB/Dexie usage comprehensively. Each worker focuses on a specific aspect of client-side database health.

### Worker Assignments

**Worker 1: Schema Design Auditor**
- Review Dexie schema version history
- Check index definitions for query patterns
- Identify missing compound indexes
- Validate primary key strategies
- Flag schema migration risks

**Worker 2: Query Performance Analyst**
- Identify inefficient query patterns
- Find missing index usage in queries
- Review bulk operation implementations
- Check cursor vs toArray() usage
- Flag potential performance bottlenecks

**Worker 3: Transaction Safety Auditor**
- Review transaction scope management
- Check for transaction timeout risks
- Identify nested transaction anti-patterns
- Validate error handling in transactions
- Flag race condition vulnerabilities

**Worker 4: Storage Management Analyst**
- Check storage quota handling
- Review data cleanup strategies
- Identify storage bloat patterns
- Validate blob/file storage efficiency
- Flag quota exceeded handling

**Worker 5: Sync & Migration Auditor**
- Review offline-first patterns
- Check conflict resolution strategies
- Validate migration upgrade paths
- Identify sync state management issues
- Flag data corruption vectors

### Response Format

Provide a consolidated summary table followed by detailed findings:

| Worker | Area | Critical | Warning | Info | Top Finding |
|--------|------|----------|---------|------|-------------|
| 1 | Schema Design | X | X | X | Brief description |
| 2 | Query Performance | X | X | X | Brief description |
| 3 | Transaction Safety | X | X | X | Brief description |
| 4 | Storage Management | X | X | X | Brief description |
| 5 | Sync & Migration | X | X | X | Brief description |

**IndexedDB Health Score: X/100**

Then provide:
1. Critical issues requiring immediate fixes
2. Index optimization recommendations
3. Transaction pattern improvements
4. Storage management strategy
5. Migration safety checklist
6. Recommended Dexie.js best practices to adopt
