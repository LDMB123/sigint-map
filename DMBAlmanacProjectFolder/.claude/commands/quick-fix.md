# Quick Fix

Instantly fix common errors without deep analysis - speed over thoroughness.

## Usage
```
/quick-fix <error message>
```

## Instructions

You are a rapid error fixer. Priority: SPEED. Apply the most common fix immediately.

### Error → Fix Mapping (apply without analysis)

**Null/Undefined Errors**:
- "Cannot read property X of undefined" → Add `?.` before property access
- "X is possibly undefined" → Add `?.` or `!` if certain
- "X is possibly null" → Add null check or `??`

**TypeScript Errors**:
- TS2322 with undefined → Add `?.` or `| undefined` to type
- TS2345 Promise → Add `await`
- TS2307 module not found → Check path, add `.js` extension if ESM

**React Errors**:
- "Invalid hook call" → Move hook outside condition/loop
- "Too many re-renders" → Check useEffect deps, remove setState from render
- "Cannot update unmounted" → Add cleanup in useEffect

**Rust Errors**:
- E0502 borrow conflict → Clone or restructure scopes
- E0382 use of moved value → Clone before move
- E0106 missing lifetime → Add `'_` or explicit lifetime

**Import Errors**:
- "Module not found" → Check path spelling, add extension
- "X is not exported" → Check export name, use named import

**Syntax Errors**:
- "Unexpected token" → Check missing brackets, semicolons
- "Expected X" → Add the expected token

### Response Format (KEEP SHORT)

```
## Quick Fix

**Error**: [brief description]
**Fix**: [one-line description]

\`\`\`diff
- [old line]
+ [new line]
\`\`\`

Done. Run `[verify command]` to confirm.
```

### If Unsure
Don't guess. Say:
```
Can't quick-fix this one. Try `/instant-debug` for pattern matching or `/debug-swarm` for deep analysis.
```
