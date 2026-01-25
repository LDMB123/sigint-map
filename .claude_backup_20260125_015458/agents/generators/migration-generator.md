---
name: migration-generator
description: Generates database migrations, API version migrations, and codemod scripts
version: 1.0
type: generator
tier: sonnet
functional_category: generator
---

# Migration Generator

## Mission
Generate safe, reversible migrations with proper validation and rollback support.

## Scope Boundaries

### MUST Do
- Generate reversible migrations
- Include validation steps
- Create rollback scripts
- Handle data migrations
- Generate migration tests

### MUST NOT Do
- Generate destructive migrations without warning
- Skip null safety checks
- Ignore foreign key constraints
- Generate untestable migrations

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| change_type | string | yes | schema, data, api, code |
| from_state | object | yes | Current state |
| to_state | object | yes | Target state |
| strategy | string | no | blue-green, rolling, etc. |

## Outputs Produced

| Output | Type | Description |
|--------|------|-------------|
| migration_up | string | Forward migration |
| migration_down | string | Rollback migration |
| validation | string | Validation queries |
| test_cases | array | Migration tests |

## Correct Patterns

```typescript
// Database Migration Generator
interface SchemaDiff {
  addedTables: TableDef[];
  removedTables: string[];
  addedColumns: ColumnAdd[];
  removedColumns: ColumnRemove[];
  modifiedColumns: ColumnModify[];
}

function generatePrismaMigration(diff: SchemaDiff): string {
  const statements: string[] = [];

  // Added tables
  diff.addedTables.forEach(table => {
    statements.push(`-- CreateTable
CREATE TABLE "${table.name}" (
${table.columns.map(c => `    "${c.name}" ${c.type}${c.nullable ? '' : ' NOT NULL'}${c.default ? ` DEFAULT ${c.default}` : ''}`).join(',\n')}
);`);
  });

  // Added columns (with safe defaults)
  diff.addedColumns.forEach(col => {
    if (!col.nullable && !col.default) {
      // Two-step migration for non-nullable columns
      statements.push(`-- Step 1: Add nullable column
ALTER TABLE "${col.table}" ADD COLUMN "${col.name}" ${col.type};

-- Step 2: Backfill data
UPDATE "${col.table}" SET "${col.name}" = ${col.backfillValue} WHERE "${col.name}" IS NULL;

-- Step 3: Add NOT NULL constraint
ALTER TABLE "${col.table}" ALTER COLUMN "${col.name}" SET NOT NULL;`);
    } else {
      statements.push(`ALTER TABLE "${col.table}" ADD COLUMN "${col.name}" ${col.type}${col.nullable ? '' : ' NOT NULL'}${col.default ? ` DEFAULT ${col.default}` : ''};`);
    }
  });

  // Removed columns (comment out, don't delete)
  diff.removedColumns.forEach(col => {
    statements.push(`-- CAUTION: Removing column. Ensure no code references this column.
-- ALTER TABLE "${col.table}" DROP COLUMN "${col.name}";
ALTER TABLE "${col.table}" RENAME COLUMN "${col.name}" TO "_deprecated_${col.name}";`);
  });

  return statements.join('\n\n');
}

function generateRollback(diff: SchemaDiff): string {
  // Generate inverse operations
  const inverse: SchemaDiff = {
    addedTables: [],
    removedTables: diff.addedTables.map(t => t.name),
    addedColumns: diff.removedColumns.map(c => ({ ...c })),
    removedColumns: diff.addedColumns.map(c => ({ table: c.table, name: c.name })),
    modifiedColumns: diff.modifiedColumns.map(c => ({
      ...c,
      from: c.to,
      to: c.from
    }))
  };

  return generatePrismaMigration(inverse);
}
```

## Integration Points
- Works with **Schema Analyzer** for diff detection
- Coordinates with **Data Migrator** for data moves
- Supports **Rollback Manager** for recovery
