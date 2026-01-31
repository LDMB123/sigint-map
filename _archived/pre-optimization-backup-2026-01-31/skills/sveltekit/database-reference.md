# SvelteKit Database Reference (Dexie.js / IndexedDB)

## Dexie Schema Audit Checklist
- [ ] All `db.version()` calls are sequential (no gaps)
- [ ] Each version bump has migration function if schema changed
- [ ] Indexes match query patterns (no unused indexes)
- [ ] Compound indexes for multi-field queries
- [ ] No breaking changes without migration path

## Migration Safety
- Always increment version number for schema changes
- Provide `upgrade()` function for data migration
- Test upgrade from version 1 to latest
- Never delete tables without migrating data first
- Keep migration functions even for old versions

## Example Migration
```javascript
db.version(2).stores({
  shows: '++id, date, venue, *songs'
}).upgrade(tx => {
  return tx.shows.toCollection().modify(show => {
    show.songs = show.setlist ? show.setlist.split(',') : [];
  });
});
```

## Query Patterns
- Use `.where()` for indexed fields (fast)
- Use `.filter()` for non-indexed fields (slow, full scan)
- Use `.sortBy()` instead of `.orderBy()` for non-indexed sorts
- Bulk operations: `bulkPut()` for upserts, `bulkAdd()` for inserts
