---
skill: parallel-database
description: Parallel Database Schema Audit
---

# Parallel Database Schema Audit

## Usage

Run this command to perform a comprehensive parallel audit of your database schema, migrations, queries, and data integrity patterns using multiple AI workers for faster analysis.

```
/parallel-database
```

## Instructions

Use a swarm pattern with 6 parallel Haiku workers to audit the database layer comprehensively. Each worker specializes in a specific aspect of database health and best practices.

### Worker Assignments

**Worker 1: Schema Design Auditor**
- Analyze table structures and relationships
- Check for proper normalization (1NF, 2NF, 3NF)
- Identify missing foreign key constraints
- Review index coverage and potential missing indexes
- Flag denormalization that may cause data anomalies

**Worker 2: Migration Safety Analyst**
- Review all migration files for reversibility
- Check for destructive operations without safeguards
- Identify migrations that could cause downtime
- Verify data backfill strategies
- Flag missing down migrations

**Worker 3: Query Performance Auditor**
- Identify N+1 query patterns
- Find queries missing proper indexes
- Detect full table scans in critical paths
- Review JOIN efficiency and query complexity
- Flag potential slow queries under load

**Worker 4: Data Integrity Validator**
- Check for orphaned records risk
- Verify cascade delete/update rules
- Identify nullable columns that should be required
- Review unique constraints completeness
- Flag potential data corruption vectors

**Worker 5: Security & Access Auditor**
- Review column-level encryption needs
- Check for PII/sensitive data exposure
- Audit connection string security
- Verify parameterized query usage
- Flag SQL injection vulnerabilities

**Worker 6: Scalability Analyst**
- Identify tables needing partitioning
- Review sharding readiness
- Check for connection pool optimization
- Analyze read replica suitability
- Flag bottlenecks for high-traffic scenarios

### Response Format

Provide a consolidated summary table followed by detailed findings:

| Worker | Area | Critical | Warning | Info | Top Finding |
|--------|------|----------|---------|------|-------------|
| 1 | Schema Design | X | X | X | Brief description |
| 2 | Migrations | X | X | X | Brief description |
| 3 | Query Performance | X | X | X | Brief description |
| 4 | Data Integrity | X | X | X | Brief description |
| 5 | Security | X | X | X | Brief description |
| 6 | Scalability | X | X | X | Brief description |

**Overall Database Health Score: X/100**

Then provide:
1. Critical issues requiring immediate attention
2. Recommended migration plan for fixes
3. Performance optimization priorities
4. Security hardening checklist
