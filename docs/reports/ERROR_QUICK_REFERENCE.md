# Error Pattern Quick Reference

**System Health:** 97/100 | **Date:** 2026-01-31

## Top 5 Errors by Frequency

```
1. Agent YAML tools malformed   240   CRITICAL   ✅ FIXED
2. Missing implementations       40   HIGH       🟡 ONGOING
3. Naming conventions           323   MEDIUM     📝 DOCUMENTED
4. Missing routing patterns     194   LOW        📝 DOCUMENTED
5. Database initialization        6   MEDIUM     🟡 ONGOING
```

## Critical Fixes Applied

**1. Agent YAML (240 fixed)**
```yaml
# Before: tools: Read, Write
# After:
tools:
  - Read
  - Write
```

**2. ReDoS (2 fixed)**
```javascript
# Before: /tier:\s*(opus|sonnet|haiku)/i
# After:  /tier:\s{0,50}(opus|sonnet|haiku)/i
```

## Ongoing Issues

**errorLogger Missing Methods (40 test failures)**
```javascript
clearLogs()              // 11+ failures
getLogs(limit)           // 15+ failures
enableVerboseLogging()   // 1 failure
getDiagnosticReport()    // 2+ failures
```
Fix: Implement full ErrorLogger class

**Database Init (6 errors)**
```javascript
ReferenceError: Cannot access 'unsubscribe' before initialization
TypeError: db.getSyncMeta is not a function
TypeError: Failed to parse URL from /data/venues.json.br
```
Fix: TDZ, missing method, URL construction

## Health by Layer

```
Agent System:    100/100  ✅
Skills:          100/100  ✅
Routing:         100/100  ✅
Application:      60/100  🟡
MCP:              78/100  🟢
Security:        100/100  ✅
Organization:    100/100  ✅
```

## P0 Actions (This Week)

```
Implement errorLogger  4h   HIGH
Fix database init      2h   HIGH
Fix signature          30m  MEDIUM
```

## Full Reports

```
/docs/reports/ERROR_PATTERN_ANALYSIS_2026-01-31.md
/docs/reports/ERROR_ANALYSIS_EXECUTIVE_SUMMARY.md
/docs/reports/ERROR_MATRIX.md
/docs/reports/RUNTIME_ERROR_ANALYSIS.md
```
