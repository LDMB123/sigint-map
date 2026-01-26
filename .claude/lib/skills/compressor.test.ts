/**
 * Tests for skill compressor
 */

import { compressSkill, utils } from './compressor';

// Example skill markdown for testing
const exampleSkill = `# Rust Borrow Checker Debug Skill

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

## Patterns

### Pattern 1: Scope isolation
- Match: "cannot borrow .* as mutable"
- Suggest: [scope_separation, interior_mutability, restructure]

### Pattern 2: Lifetime extension
- Match: "borrowed value does not live long enough"
- Suggest: [lifetime_annotation, owned_data, arc_mutex]

## Edge Cases
- Closures capturing variables create implicit borrows
- Method chaining can extend borrow lifetimes unexpectedly
- Async functions require 'static lifetimes for spawned tasks

## Related Skills
- Ownership Patterns
- Lifetime Annotation
- Interior Mutability Patterns

## References
- https://doc.rust-lang.org/error-index.html#E0502
- https://rust-lang.github.io/rust-clippy/

## Version
**Version**: 1.0.0
`;

function testCompression() {
  console.log('Testing skill compression...\n');

  const compressed = compressSkill(exampleSkill);

  console.log('=== LEVEL 1: Headers Only ===');
  console.log(JSON.stringify(compressed.level1, null, 2));
  console.log(`\nTokens: ${compressed.meta.compressed_tokens.level1}`);

  console.log('\n=== LEVEL 2: Quick Reference ===');
  console.log(JSON.stringify(compressed.level2, null, 2));
  console.log(`\nTokens: ${compressed.meta.compressed_tokens.level2}`);

  console.log('\n=== LEVEL 3: Full Detail ===');
  console.log(JSON.stringify(compressed.level3, null, 2));
  console.log(`\nTokens: ${compressed.meta.compressed_tokens.level3}`);

  console.log('\n=== COMPRESSION METRICS ===');
  console.log(`Original tokens: ${compressed.meta.original_tokens}`);
  console.log(`Compressed tokens (L3): ${compressed.meta.compressed_tokens.level3}`);
  console.log(`Compression ratio: ${(compressed.meta.compression_ratio * 100).toFixed(1)}%`);
  console.log(`Target: 60-70%`);

  // Verify compression target
  const ratio = compressed.meta.compression_ratio;
  if (ratio >= 0.60 && ratio <= 0.75) {
    console.log('\n✓ Compression ratio within target range!');
  } else {
    console.log('\n⚠ Compression ratio outside target range');
  }

  // Verify token budgets
  console.log('\n=== TOKEN BUDGETS ===');
  console.log(`Level 1 target: ~50 tokens, actual: ${compressed.meta.compressed_tokens.level1}`);
  console.log(`Level 2 target: ~150 tokens, actual: ${compressed.meta.compressed_tokens.level2}`);
  console.log(`Level 3 target: ~300 tokens, actual: ${compressed.meta.compressed_tokens.level3}`);
}

function testUtils() {
  console.log('\n=== UTILITY TESTS ===\n');

  // Test kebab-case conversion
  console.log('kebab-case:', utils.toKebabCase('Rust Borrow Checker Debug'));

  // Test abbreviation
  console.log('abbreviate:', utils.abbreviate('mutable reference to immutable variable'));

  // Test solution compression
  const longSolution = 'You can restructure your code to ensure exclusive access by splitting the mutable borrow into a separate scope or using RefCell for interior mutability';
  console.log('compress:', utils.compressSolution(longSolution));

  // Test token estimation
  console.log('tokens:', utils.estimateTokens('Hello world'));
}

// Run tests
if (require.main === module) {
  testCompression();
  testUtils();
}

export { testCompression, testUtils };
