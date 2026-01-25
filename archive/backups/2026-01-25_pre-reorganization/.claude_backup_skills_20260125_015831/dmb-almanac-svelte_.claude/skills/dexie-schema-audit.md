# Skill: Dexie Schema & Index Audit

**ID**: `dexie-schema-audit`
**Category**: Local-First / IndexedDB
**Agent**: Local-First Data Steward

---

## When to Use

- Before adding new tables or indexes
- Performance issues with queries
- Schema version upgrade planning
- Data integrity concerns

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to project root |

---

## Steps

### Step 1: Locate Schema Definition

```bash
# Find Dexie schema files
find . -name "*.ts" -exec grep -l "Dexie\|stores\(" {} \;

# For DMB Almanac
cat lib/db/dexie/schema.ts
```

### Step 2: Document Current Schema

```typescript
// Extract schema definition
// Look for: db.version(N).stores({...})

// Current schema (v3):
const SCHEMA = {
  venues: '&id, name, city, state, country, searchText',
  songs: '&id, &slug, sortTitle, totalPerformances, searchText',
  shows: '&id, date, venueId, tourId, year, [venueId+date], [tourId+date]',
  setlistEntries: '&id, showId, songId, [showId+position], [songId+year]',
  // ... more tables
};
```

### Step 3: Analyze Index Usage

```typescript
// Check which indexes are actually used
// Search for .where() and .orderBy() calls

// Good: Using compound index
db.shows.where('[venueId+date]').between([venueId, minDate], [venueId, maxDate])

// Bad: Not using any index (full scan)
db.shows.filter(show => show.venueId === venueId && show.date > minDate)
```

### Step 4: Identify Index Issues

```markdown
## Index Audit Checklist

### Unused Indexes
Look for indexes defined but never queried:
- [ ] Check all .where() calls match defined indexes
- [ ] Check all .orderBy() calls use indexed fields
- [ ] Remove unused indexes (reduces storage)

### Missing Indexes
Look for queries that would benefit from indexes:
- [ ] Frequent .filter() calls on specific fields
- [ ] Slow queries (> 100ms for < 10K records)
- [ ] Compound queries that scan instead of seek

### Low-Selectivity Indexes
Avoid indexing:
- [ ] Boolean fields (isActive, isDeleted)
- [ ] Fields with < 10 unique values
- [ ] Frequently updated fields
```

### Step 5: Check Primary Key Design

```typescript
// Good: Server-assigned ID for synced data
shows: '&id, ...'  // & = unique, non-auto

// Good: Auto-increment for local data
userFavorites: '++id, ...'  // ++ = auto-increment

// Bad: String primary key (slower)
shows: '&slug, ...'  // Avoid if numeric ID available
```

### Step 6: Validate Foreign Key References

```typescript
// Check referential integrity manually
async function validateFK() {
  const errors: string[] = [];

  // Check show → venue FK
  const shows = await db.shows.toArray();
  const venueIds = new Set((await db.venues.toArray()).map(v => v.id));

  for (const show of shows) {
    if (!venueIds.has(show.venueId)) {
      errors.push(`Show ${show.id} → invalid venue ${show.venueId}`);
    }
  }

  return errors;
}
```

### Step 7: Generate Recommendations

---

## Index Types in Dexie

| Syntax | Type | Use Case |
|--------|------|----------|
| `id` | Simple index | Single field queries |
| `&id` | Unique index | Primary key, unique constraints |
| `++id` | Auto-increment | Local-only data |
| `*tags` | Multi-entry | Array fields |
| `[a+b]` | Compound | Multi-field queries |

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| schema-audit.md | `.claude/artifacts/` | Full audit report |
| schema-diagram.txt | `.claude/artifacts/` | Visual schema |
| index-recommendations.md | `.claude/artifacts/` | Optimization suggestions |

---

## Output Template

```markdown
## Dexie Schema Audit Report

### Date: [YYYY-MM-DD]

### Schema Version: [N]

### Tables Summary
| Table | Records | Indexes | Size Est. |
|-------|---------|---------|-----------|
| venues | [N] | [N] | [X]MB |
| songs | [N] | [N] | [X]MB |
| shows | [N] | [N] | [X]MB |

### Index Analysis

#### Used Indexes
| Table | Index | Queries Using |
|-------|-------|---------------|
| shows | [venueId+date] | getShowsByVenue() |
| songs | slug | getSongBySlug() |

#### Unused Indexes
| Table | Index | Recommendation |
|-------|-------|----------------|
| [table] | [index] | Remove |

#### Missing Indexes
| Table | Suggested Index | Query |
|-------|-----------------|-------|
| [table] | [a+b] | [function] |

### Primary Key Audit
| Table | PK | Type | Status |
|-------|-----|------|--------|
| shows | id | numeric unique | ✅ Good |
| venues | id | numeric unique | ✅ Good |

### Foreign Key Integrity
- Errors found: [N]
- [List of errors if any]

### Recommendations
1. **Add index**: `[table].[field]` for query [X]
2. **Remove index**: `[table].[field]` (unused)
3. **Consider compound**: `[a+b]` for query [X]

### Schema Migration Plan
```typescript
db.version(4).stores({
  // Updated schema
});
```
```
