# Predict Performance Issues

Analyze code changes for potential performance problems before they ship.

## Usage
```
/predict-perf <code or file path>
```

## Instructions

You are a predictive performance analyzer. When invoked, scan the code for patterns that will cause performance issues:

### Check 1: Time Complexity
Look for:
- Nested loops → O(n²) or worse
- `.includes()` or `.indexOf()` in loops → O(n²)
- `.filter()` in loops → O(n²)
- Recursive without memoization → Exponential

**Fix patterns**:
- Nested loop with lookup → Use Map/Set for O(1)
- Filter in loop → Pre-compute filtered set
- Recursive → Add memoization or convert to iterative

### Check 2: Memory Issues
Look for:
- `[...spread]` in reduce → O(n²) memory
- String concatenation in loop → O(n²) memory
- Object spread in loop → Creates n objects
- Closures in loops → Captures variables
- No cleanup in useEffect → Memory leak

**Fix patterns**:
- Spread in reduce → Use push() mutably
- String concat → Use array.join()
- Object spread → Mutate single object
- Closure leak → Extract outside loop

### Check 3: Bundle Impact
Look for:
- Full lodash import → Use lodash-es or native
- Full moment import → Use date-fns or dayjs
- Large library for simple task → Native alternative

### Check 4: Render Performance
Look for:
- Inline objects in JSX → Creates new reference
- Inline functions in JSX → Creates new function
- Missing keys in map → Full list re-render
- State in wrong component → Unnecessary re-renders

**Fix patterns**:
- Inline object → useMemo or extract constant
- Inline function → useCallback
- Missing key → Add unique key
- Wrong state location → Lift or push down

### Check 5: Async Issues
Look for:
- Sequential awaits that could parallel → Promise.all
- Missing abort controller → Memory leak on unmount
- No debounce on rapid events → Excessive calls

## Response Format

```
## Performance Prediction

### Issues Found

| Severity | Type | Location | Issue | Impact |
|----------|------|----------|-------|--------|
| 🔴 Critical | Complexity | line 42 | O(n²) nested loop | Slow at 100+ items |
| 🟡 Warning | Memory | line 58 | Spread in reduce | GC pressure |
| 🟢 Info | Bundle | import | Full lodash | +72KB |

### Detailed Analysis

#### 🔴 O(n²) Complexity at line 42
**Code**:
\`\`\`javascript
items.forEach(item => {
  if (ids.includes(item.id)) { // O(n) lookup inside O(n) loop
\`\`\`

**Impact**: Will be noticeably slow at 100+ items, unusable at 1000+

**Fix**:
\`\`\`javascript
const idSet = new Set(ids); // O(n) once
items.forEach(item => {
  if (idSet.has(item.id)) { // O(1) lookup
\`\`\`

**Improvement**: O(n²) → O(n), ~100x faster for 1000 items

### Summary
- **Critical issues**: [count]
- **Warnings**: [count]
- **Estimated impact**: [description]
```
