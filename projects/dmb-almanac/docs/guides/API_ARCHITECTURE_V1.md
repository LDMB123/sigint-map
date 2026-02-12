# API Architecture V1 - DMB Almanac

## Overview
Task-driven API surface for shows, songs, venues, and telemetry. Public read endpoints focus on summary-first payloads; telemetry endpoints accept client performance data.

## Versioning
- URL versioning: /api/v1
- Deprecation window: 12 months

## Authentication
- Public read endpoints: no auth
- User-specific endpoints: token required (future)

## Standard Headers
- `X-Request-Id`: generated on server; returned on every response.
- `Idempotency-Key`: optional for POSTs that could be retried.
- `Cache-Control`: explicit on all GET endpoints.
- `Content-Language`: `en-US` for now.

## Resources

### Public Data (Future)
Base path: /api/v1

| Method | Path | Description | Auth |
| --- | --- | --- | --- |
| GET | /shows | List shows (summary) | Public |
| GET | /shows/{id} | Show summary | Public |
| GET | /shows/{id}/setlist | Full setlist | Public |
| GET | /songs | List songs (summary) | Public |
| GET | /songs/{slug} | Song summary | Public |
| GET | /songs/{slug}/history | Song history | Public |
| GET | /venues | List venues (summary) | Public |
| GET | /venues/{id} | Venue summary | Public |
| GET | /search?q= | Multi-type search | Public |

### Telemetry (Current)
Base path: /api

| Method | Path | Description | Auth |
| --- | --- | --- | --- |
| GET | /health | Health check | Public |
| POST | /analytics | Web vitals metrics | Public |
| POST | /telemetry/performance | Performance batches | Public |
| POST | /telemetry/performance-metrics | Field metrics | Public |
| POST | /telemetry/errors | Error batches | Public |
| POST | /telemetry/business | Business events | Public |
| POST | /csp-report | CSP violation reports | Public |
| POST | /share-target | PWA share target | Public |

## Response Shape

### Success
```json
{
  "data": { "success": true },
  "requestId": "req_abc123"
}
```

### Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request body contains invalid data",
    "details": [{ "field": "name", "message": "Required" }],
    "requestId": "req_abc123"
  }
}
```

## Error Codes
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `RATE_LIMITED`
- `UNAUTHORIZED` (future)
- `INTERNAL_ERROR`

## Telemetry Payloads (Current)
- `/api/analytics`: Core Web Vitals and LoAF
- `/api/telemetry/performance`: batched performance metrics
- `/api/telemetry/errors`: error batches
- `/api/telemetry/business`: business events

Each telemetry endpoint returns `{ data: { success: boolean }, requestId }`.

## Pagination
- Cursor-based pagination for large lists
- Query params: limit, cursor
 - Responses include `nextCursor` and `hasMore`

## Caching
- Public endpoints: Cache-Control public, max-age=86400, stale-while-revalidate=604800
- Telemetry endpoints: Cache-Control no-store
 - Health check: Cache-Control no-store

## Rate Limits
- Public: 1000 requests per hour
- Authenticated: 10000 requests per hour
 - Telemetry: 60 requests per minute per IP

## Security
- Input validation on all payloads
- CORS restricted to same-origin for telemetry
- Request IDs for traceability
 - CSRF validation for telemetry POSTs

## Example: GET /api/v1/shows
```json
{
  "data": {
    "items": [{ "id": 1, "date": "1993-03-14", "venue": "Trax", "summary": { "items": [] } }],
    "pagination": { "nextCursor": "abc", "hasMore": true }
  },
  "requestId": "req_123"
}
```
