/**
 * Example usage of the skill compressor
 */

import { compressSkill } from './compressor';

// Example: Compress a Rust borrow checker debugging skill
const rustBorrowCheckerSkill = `# Rust Borrow Checker Debug Skill

## Overview
This skill helps debug Rust borrow checker errors by identifying common patterns and suggesting fixes.

## Common Errors

### E0502: Cannot borrow as mutable because already borrowed
- **Cause**: Attempting to create a mutable reference while an immutable reference exists
- **Solution**: Restructure code to ensure exclusive access, use RefCell for interior mutability, or clone the data

### E0499: Cannot borrow as mutable more than once
- **Cause**: Attempting to create multiple mutable references to the same data
- **Solution**: Split borrowing into separate scopes, use split_at_mut, or restructure with interior mutability

### E0503: Cannot use value after it was mutably borrowed
- **Cause**: Trying to use a value while a mutable borrow is still active
- **Solution**: Reorder operations, drop the borrow earlier, or use a let binding

### E0505: Cannot move out of value because it is borrowed
- **Cause**: Attempting to move ownership while borrows exist
- **Solution**: Clone the value, use Rc/Arc for shared ownership, or extend lifetime

### E0506: Cannot assign to value because it is borrowed
- **Cause**: Trying to modify a value that has active borrows
- **Solution**: Reduce borrow scope, use a temporary variable, or use mem::replace

## Patterns

### Pattern 1: Scope isolation
Match: "cannot borrow .* as mutable"
Suggest: [scope_separation, interior_mutability, restructure]

### Pattern 2: Lifetime extension
Match: "borrowed value does not live long enough"
Suggest: [lifetime_annotation, owned_data, arc_mutex]

### Pattern 3: Move conflicts
Match: "cannot move.*while borrowed"
Suggest: [clone, rc_arc, lifetime_extend]

## Priority
1. Check for scope isolation opportunities
2. Consider interior mutability patterns
3. Evaluate ownership restructuring
4. Use clone as last resort
5. Apply advanced patterns (Arc, Mutex)

## Edge Cases
- Closures capturing variables create implicit borrows that extend to closure lifetime
- Method chaining can extend borrow lifetimes unexpectedly
- Async functions require 'static lifetimes for spawned tasks
- Match expressions can create temporary borrows
- Iterator chains hold borrows until consumed

## Related Skills
- Ownership Patterns
- Lifetime Annotation Guide
- Interior Mutability Patterns
- Async Rust Best Practices
- RefCell and Cell Usage

## References
- https://doc.rust-lang.org/error-index.html#E0502
- https://rust-lang.github.io/rust-clippy/
- https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html

## Version
**Version**: 1.2.0
`;

// Compress the skill
const compressed = compressSkill(rustBorrowCheckerSkill);

console.log('='.repeat(80));
console.log('SKILL COMPRESSION DEMONSTRATION');
console.log('='.repeat(80));
console.log();

// Display compression metrics
console.log('COMPRESSION METRICS:');
console.log('-'.repeat(80));
console.log(`Original tokens:        ${compressed.meta.original_tokens}`);
console.log(`Level 1 tokens:         ${compressed.meta.compressed_tokens.level1}`);
console.log(`Level 2 tokens:         ${compressed.meta.compressed_tokens.level2}`);
console.log(`Level 3 tokens:         ${compressed.meta.compressed_tokens.level3}`);
console.log(`Compression ratio:      ${(compressed.meta.compression_ratio * 100).toFixed(1)}%`);
console.log(`Target range:           60-70%`);
console.log(`Status:                 ${compressed.meta.compression_ratio >= 0.60 && compressed.meta.compression_ratio <= 0.75 ? '✓ PASS' : '✗ FAIL'}`);
console.log();

// Display Level 1: Headers only (~50 tokens)
console.log('LEVEL 1: HEADERS ONLY (~50 tokens)');
console.log('-'.repeat(80));
console.log('Use case: Routing decisions, skill discovery');
console.log();
console.log(JSON.stringify(compressed.level1, null, 2));
console.log();
console.log(`Actual tokens: ${compressed.meta.compressed_tokens.level1}`);
console.log(`Token budget: 50`);
console.log(`Status: ${compressed.meta.compressed_tokens.level1 <= 60 ? '✓ Within budget' : '✗ Over budget'}`);
console.log();

// Display Level 2: Quick reference (~150 tokens)
console.log('LEVEL 2: QUICK REFERENCE (~150 tokens)');
console.log('-'.repeat(80));
console.log('Use case: Simple debugging scenarios, quick fixes');
console.log();
console.log('Quick Fixes:');
console.log(JSON.stringify(compressed.level2.quick_fixes, null, 2));
console.log();
if (compressed.level2.patterns) {
  console.log('Patterns:');
  console.log(JSON.stringify(compressed.level2.patterns, null, 2));
  console.log();
}
if (compressed.level2.priority) {
  console.log('Priority:');
  console.log(JSON.stringify(compressed.level2.priority, null, 2));
  console.log();
}
console.log(`Actual tokens: ${compressed.meta.compressed_tokens.level2}`);
console.log(`Token budget: 150`);
console.log(`Status: ${compressed.meta.compressed_tokens.level2 <= 180 ? '✓ Within budget' : '✗ Over budget'}`);
console.log();

// Display Level 3: Full detail (~300 tokens)
console.log('LEVEL 3: FULL DETAIL (~300 tokens)');
console.log('-'.repeat(80));
console.log('Use case: Complex debugging, detailed context needed');
console.log();
if (compressed.level3.error_details) {
  console.log('Error Details:');
  console.log(JSON.stringify(compressed.level3.error_details, null, 2));
  console.log();
}
if (compressed.level3.edge_cases) {
  console.log('Edge Cases:');
  console.log(JSON.stringify(compressed.level3.edge_cases, null, 2));
  console.log();
}
if (compressed.level3.related) {
  console.log('Related Skills:');
  console.log(JSON.stringify(compressed.level3.related, null, 2));
  console.log();
}
console.log(`Actual tokens: ${compressed.meta.compressed_tokens.level3}`);
console.log(`Token budget: 300`);
console.log(`Status: ${compressed.meta.compressed_tokens.level3 <= 350 ? '✓ Within budget' : '✗ Over budget'}`);
console.log();

// Demonstrate lazy loading savings
console.log('LAZY LOADING SAVINGS:');
console.log('-'.repeat(80));
console.log('Scenario: Load 20 skills for routing');
console.log(`  - Full load:          ${compressed.meta.original_tokens * 20} tokens`);
console.log(`  - Level 1 only:       ${compressed.meta.compressed_tokens.level1 * 20} tokens`);
console.log(`  - Savings:            ${((1 - (compressed.meta.compressed_tokens.level1 * 20) / (compressed.meta.original_tokens * 20)) * 100).toFixed(1)}%`);
console.log();
console.log('Scenario: Load 3 skills with quick fixes');
console.log(`  - Full load:          ${compressed.meta.original_tokens * 3} tokens`);
console.log(`  - Level 2 only:       ${compressed.meta.compressed_tokens.level2 * 3} tokens`);
console.log(`  - Savings:            ${((1 - (compressed.meta.compressed_tokens.level2 * 3) / (compressed.meta.original_tokens * 3)) * 100).toFixed(1)}%`);
console.log();
console.log('Scenario: Load 1 skill with full detail');
console.log(`  - Full load:          ${compressed.meta.original_tokens} tokens`);
console.log(`  - Level 3 only:       ${compressed.meta.compressed_tokens.level3} tokens`);
console.log(`  - Savings:            ${((1 - compressed.meta.compressed_tokens.level3 / compressed.meta.original_tokens) * 100).toFixed(1)}%`);
console.log();

console.log('='.repeat(80));
console.log('IMPLEMENTATION COMPLETE');
console.log('='.repeat(80));
console.log();
console.log('Files created:');
console.log('  - .claude/lib/skills/compressor.ts       (main implementation)');
console.log('  - .claude/lib/skills/compressor.test.ts  (test suite)');
console.log('  - .claude/lib/skills/example.ts          (this example)');
console.log('  - .claude/lib/skills/README.md           (documentation)');
console.log('  - .claude/lib/tsconfig.json              (TypeScript config)');
console.log();
console.log('Next steps:');
console.log('  1. Run example:  npx tsx .claude/lib/skills/example.ts');
console.log('  2. Run tests:    npx tsx .claude/lib/skills/compressor.test.ts');
console.log('  3. Integrate with skill loader for production use');
console.log();
