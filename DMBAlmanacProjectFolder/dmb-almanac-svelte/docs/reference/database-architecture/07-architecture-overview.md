# DMBAlmanac Database Architecture Overview

## Architecture Decision Summary

### Primary Database: PostgreSQL

**Why PostgreSQL over SQLite:**

| Factor | PostgreSQL | SQLite |
|--------|-----------|--------|
| Concurrent Users | Excellent (connection pooling) | Poor (file locking) |
| Full-Text Search | Native pg_trgm + tsvector | FTS5 (good but limited) |
| Geographic Queries | PostGIS (excellent) | Requires extension |
| JSON Support | Native JSONB with indexes | JSON (no indexes) |
| Materialized Views | Native with CONCURRENTLY | Not supported |
| Replication | Built-in streaming | Manual/third-party |
| Scalability | Horizontal + vertical | Vertical only |

**Verdict**: PostgreSQL is the clear choice for a production concert database serving multiple users with complex queries.

### Search Infrastructure: Hybrid Approach

```
User Query
    |
    v
+-------------------+
|  Query Classifier |
+-------------------+
    |
    +-- Simple typeahead --> PostgreSQL pg_trgm (< 10ms)
    |
    +-- Faceted search ----> Meilisearch (< 50ms)
    |
    +-- Semantic search ---> Vector DB + Embeddings (optional)
```

**Recommendation**:
- **Phase 1**: PostgreSQL pg_trgm for typeahead + basic search
- **Phase 2**: Add Meilisearch for faceted search, filters, instant results
- **Phase 3**: Add vector embeddings for "find similar" features

### Client-Side: IndexedDB with Dexie.js

**Storage Budget (~10MB total)**:
| Table | Records | Est. Size |
|-------|---------|-----------|
| Songs | 1,200 | 200KB |
| Venues | 1,400 | 300KB |
| Concerts | 3,700 | 800KB |
| Setlist Entries | 40,000 | 3MB |
| Guests | 1,400 | 150KB |
| Guest Appearances | 26,000 | 1.5MB |
| Search Index | - | 500KB |
| User Data | - | 100KB |

**Sync Strategy**:
- Core data (songs, venues, concerts): Always sync
- Extended data (setlists): Sync if space available
- Lyrics: On-demand fetch

## File Structure

```
dmbalmanac-database-architecture/
├── 01-server-schema.sql       # PostgreSQL schema with all tables
├── 02-common-queries.sql      # Optimized query patterns
├── 03-client-indexeddb-schema.ts  # Dexie.js client schema
├── 04-sync-service.ts         # Server-client sync logic
├── 05-search-infrastructure.ts # Meilisearch integration
├── 06-performance-patterns.sql # Optimization techniques
└── 07-architecture-overview.md # This document
```

## Schema Relationships

```
                                    +------------+
                                    |   albums   |
                                    +------------+
                                          |
                                          | 1:N
                                          v
+----------+    N:1    +------------+    +--------------+
|  songs   |<----------|  setlist   |    | album_tracks |
+----------+           |  entries   |    +--------------+
     |                 +------------+
     |                       |
     |                       | N:1
     |                       v
     |                 +------------+    N:1    +----------+
     +---------------->|  concerts  |---------->|  venues  |
                       +------------+           +----------+
                             |                        |
                             | 1:N                    |
                             v                        |
                       +----------------+             |
                       | guest          |             |
                       | appearances    |             |
                       +----------------+             |
                             |                        |
                             | N:1                    |
                             v                        |
                       +------------+                 |
                       |   guests   |                 |
                       +------------+                 |
                                                     |
                       +------------+                |
                       |   users    |                |
                       +------------+                |
                             |                       |
         +-------------------+-------------------+   |
         |                   |                   |   |
         v                   v                   v   |
+------------------+ +------------------+ +----------+
| user_attendance  | | user_favorites   | | user     |
|                  | |                  | | want_to  |
+------------------+ +------------------+ | hear     |
                                         +----------+
```

## Key Design Decisions

### 1. Denormalization Strategy

**Denormalized Fields** (updated via triggers):
- `songs.times_played` - Count of performances
- `songs.first_played_date` / `last_played_date`
- `venues.total_shows`
- `concerts.song_count`
- `guests.total_appearances`

**Rationale**: These counts are queried frequently (homepage, listings, stats) but rarely change. Denormalizing eliminates expensive COUNT queries.

### 2. Materialized Views

| View | Refresh Frequency | Use Case |
|------|-------------------|----------|
| `mv_song_statistics` | 15 min | Song detail pages |
| `mv_venue_statistics` | 1 hour | Venue pages |
| `mv_yearly_statistics` | Daily | Year browser |
| `mv_song_pairs` | Daily | "Also played with" |

### 3. Indexing Strategy

**Primary Indexes**:
- All foreign keys
- Slug columns (unique lookups)
- Date columns (range queries)

**Composite Indexes**:
- `(concert_id, set_number, position)` - Setlist ordering
- `(song_id, concert_id)` - Song history
- `(country, state_province)` - Geographic browsing

**Partial Indexes**:
- `is_opener = TRUE` - Opener statistics
- `is_closer = TRUE` - Closer statistics
- `is_bustout = TRUE` - Bustout queries
- `has_audio = TRUE` - Shows with recordings

**GIN Indexes**:
- `search_vector` - Full-text search
- `title_normalized gin_trgm_ops` - Fuzzy search

### 4. Geographic Queries (PostGIS)

```sql
-- Find venues within 100 miles of Denver
SELECT name, city,
    ST_Distance(location, ST_MakePoint(-104.99, 39.74)::geography) / 1609 AS miles
FROM venues
WHERE ST_DWithin(location, ST_MakePoint(-104.99, 39.74)::geography, 160934)
ORDER BY miles;
```

### 5. Pagination Pattern

**Keyset Pagination** (recommended for large datasets):
```sql
-- Page 1
SELECT * FROM concerts ORDER BY show_date DESC LIMIT 20;

-- Page N (use last show_date from previous page)
SELECT * FROM concerts
WHERE show_date < '2023-06-15'
ORDER BY show_date DESC LIMIT 20;
```

**Why not OFFSET**: OFFSET becomes slow for large offsets because PostgreSQL must scan and discard rows.

## API Endpoint Recommendations

| Endpoint | Method | Caching | Description |
|----------|--------|---------|-------------|
| `/concerts` | GET | 5 min | Paginated concert list |
| `/concerts/:slug` | GET | 1 hour | Concert detail with setlist |
| `/songs` | GET | 5 min | Paginated song list |
| `/songs/:slug` | GET | 30 min | Song detail with stats |
| `/songs/:slug/history` | GET | 5 min | Song performance history |
| `/venues` | GET | 1 hour | Venue list |
| `/venues/:slug` | GET | 1 hour | Venue detail |
| `/venues/nearby` | GET | No cache | Geo-based venue search |
| `/search` | GET | 1 min | Unified search |
| `/search/typeahead` | GET | 1 min | Autocomplete |
| `/stats/dashboard` | GET | 15 min | Site statistics |
| `/sync/:table` | GET | No cache | Client sync endpoint |

## Performance Benchmarks (Expected)

| Query Type | Target | Strategy |
|------------|--------|----------|
| Concert by slug | < 10ms | Index + prepared statement |
| Full setlist | < 20ms | Composite index |
| Song history (page) | < 15ms | Keyset pagination |
| Typeahead search | < 50ms | pg_trgm index |
| Faceted search | < 100ms | Meilisearch |
| Geo search (100mi) | < 50ms | PostGIS index |
| Dashboard stats | < 5ms | Materialized view |

## Monitoring Checklist

1. **Query Performance**
   - Enable `pg_stat_statements`
   - Monitor queries > 100ms
   - Check index usage weekly

2. **Connection Pool**
   - Monitor active connections
   - Track wait times
   - Adjust pool size based on load

3. **Storage**
   - Track table bloat
   - Schedule regular VACUUM
   - Monitor disk space

4. **Sync Health**
   - Track client sync failures
   - Monitor sync queue depth
   - Alert on sync delays > 1 hour

## Migration Path

### Phase 1: Core Schema
1. Create PostgreSQL database
2. Run `01-server-schema.sql`
3. Import existing data
4. Verify indexes

### Phase 2: Search
1. Deploy Meilisearch
2. Configure indexes per `05-search-infrastructure.ts`
3. Populate search indexes
4. Update API to use Meilisearch

### Phase 3: Client Sync
1. Implement `03-client-indexeddb-schema.ts`
2. Deploy sync API endpoints
3. Implement `04-sync-service.ts`
4. Test offline functionality

### Phase 4: Optimization
1. Enable materialized views
2. Configure refresh schedules
3. Tune based on actual usage patterns
4. Add monitoring/alerting

## Security Considerations

1. **Row-Level Security**: Enable for user data tables
2. **API Rate Limiting**: Especially for search endpoints
3. **Input Sanitization**: Parameterized queries throughout
4. **Sync Authentication**: JWT tokens for sync endpoints
5. **Data Validation**: Server-side validation for all user input
