# wasm-tools CLI Guide

Low-level WebAssembly binary manipulation and inspection toolkit.

## Installation

```bash
# Install via cargo
cargo install wasm-tools

# Or via Homebrew (macOS)
brew install wasm-tools

# Verify installation
wasm-tools --version
```

## wasm-tools parse

Convert WebAssembly text format (WAT) to binary format (WASM).

### Basic Parsing

```bash
# Parse WAT to WASM
wasm-tools parse input.wat -o output.wasm

# Parse from stdin
cat module.wat | wasm-tools parse -o module.wasm

# Verbose output with validation details
wasm-tools parse input.wat -o output.wasm -v
```

### Advanced Options

```bash
# Skip validation during parsing (faster but unsafe)
wasm-tools parse --no-validate input.wat -o output.wasm

# Enable specific proposals (multi-memory, threads, etc.)
wasm-tools parse --features=multi-memory,threads input.wat -o output.wasm

# Parse component model syntax
wasm-tools parse --component input.wat -o component.wasm
```

## wasm-tools validate

Validate WebAssembly binary format according to spec.

### Basic Validation

```bash
# Validate a WASM module
wasm-tools validate module.wasm

# Validate with verbose output
wasm-tools validate module.wasm -v

# Validate and show all errors (don't stop at first)
wasm-tools validate module.wasm --all
```

### Feature-Specific Validation

```bash
# Validate with specific WebAssembly proposals enabled
wasm-tools validate --features=threads,bulk-memory module.wasm

# Validate component model
wasm-tools validate --component component.wasm

# Check all available features
wasm-tools validate --features=all module.wasm

# Common feature flags:
# - threads: Thread and atomic operations
# - simd: SIMD instructions
# - bulk-memory: Bulk memory operations
# - reference-types: Reference types proposal
# - multi-value: Multi-value returns
# - tail-call: Tail call optimization
```

### Validation Output

```bash
# Exit codes:
# 0 = valid
# non-zero = invalid

# Use in scripts
if wasm-tools validate module.wasm 2>/dev/null; then
  echo "Valid WebAssembly module"
else
  echo "Invalid module"
fi
```

## wasm-tools print

Convert WebAssembly binary to human-readable text format.

### Basic Printing

```bash
# Print WASM as WAT
wasm-tools print module.wasm

# Save to file
wasm-tools print module.wasm -o module.wat

# Print with custom indentation
wasm-tools print --indent=4 module.wasm
```

### Output Formatting

```bash
# Compact output (minimal whitespace)
wasm-tools print --compact module.wasm

# Include binary offsets in comments
wasm-tools print --offsets module.wasm

# Show skeleton only (no function bodies)
wasm-tools print --skeleton module.wasm

# Print specific sections only
wasm-tools print --section=import module.wasm
wasm-tools print --section=export module.wasm
```

### Inspection Use Cases

```bash
# Inspect exports
wasm-tools print module.wasm | grep -A 5 "export"

# Find imported functions
wasm-tools print module.wasm | grep -A 3 "import"

# Check memory configuration
wasm-tools print module.wasm | grep "memory"

# View function signatures
wasm-tools print --skeleton module.wasm
```

## wasm-tools strip

Remove debug information and custom sections from WASM binaries.

### Basic Stripping

```bash
# Strip all debug info (names, source maps)
wasm-tools strip module.wasm -o module.stripped.wasm

# Strip in-place (overwrites original)
wasm-tools strip module.wasm

# Verbose output showing what was stripped
wasm-tools strip -v module.wasm -o output.wasm
```

### Selective Stripping

```bash
# Strip only name section
wasm-tools strip --only name module.wasm -o output.wasm

# Strip specific custom sections
wasm-tools strip --delete "producers" --delete "build_id" module.wasm -o output.wasm

# Keep only specific sections
wasm-tools strip --keep "name" module.wasm -o output.wasm

# Strip everything except DWARF debug info
wasm-tools strip --keep ".debug_*" module.wasm -o output.wasm
```

### Size Optimization

```bash
# Before/after comparison
ls -lh module.wasm
wasm-tools strip module.wasm -o module.stripped.wasm
ls -lh module.stripped.wasm

# Strip as part of build pipeline
wasm-tools strip target/wasm32-unknown-unknown/release/app.wasm \
  -o dist/app.wasm
```

## wasm-tools component

Work with WebAssembly Component Model.

### Component Creation

```bash
# Create a component from a core module
wasm-tools component new module.wasm -o component.wasm

# Specify adapters for WASI preview1 to preview2
wasm-tools component new module.wasm \
  --adapt wasi_snapshot_preview1=adapter.wasm \
  -o component.wasm

# Embed component type
wasm-tools component new module.wasm \
  --wit wit/ \
  -o component.wasm
```

### Component Inspection

```bash
# Print component structure
wasm-tools component wit component.wasm

# Extract WIT from component
wasm-tools component wit component.wasm -o interface.wit

# Validate component
wasm-tools validate --component component.wasm

# Print component as WAT
wasm-tools print component.wasm
```

### Component Composition

```bash
# Compose multiple components
wasm-tools compose component1.wasm \
  --component component2.wasm \
  -o composed.wasm

# Link components with config
wasm-tools compose component.wasm \
  --config config.yml \
  -o output.wasm

# Merge component definitions
wasm-tools component embed component.wasm \
  --wit-path ./wit \
  -o embedded.wasm
```

### Component Metadata

```bash
# Extract component metadata
wasm-tools component wit component.wasm --json

# List component exports
wasm-tools print component.wasm | grep "export"

# Show component imports
wasm-tools print component.wasm | grep "import"
```

## Common Workflows

### Development Inspection

```bash
# Full module inspection pipeline
wasm-tools validate module.wasm && \
wasm-tools print module.wasm > module.wat && \
cat module.wat | less

# Quick size check
wasm-tools strip --dry-run module.wasm
```

### Production Build

```bash
# Validate, strip, and optimize
wasm-tools validate module.wasm && \
wasm-tools strip module.wasm -o module.stripped.wasm && \
wasm-opt -Oz module.stripped.wasm -o module.optimized.wasm
```

### CI/CD Integration

```bash
#!/bin/bash
# validate-wasm.sh

set -e

MODULE=$1

echo "Validating $MODULE..."
wasm-tools validate "$MODULE"

echo "Checking size..."
SIZE=$(wc -c < "$MODULE")
echo "Size: $SIZE bytes"

if [ $SIZE -gt 1048576 ]; then
  echo "Warning: Module larger than 1MB"
fi

echo "Extracting exports..."
wasm-tools print "$MODULE" | grep "export"

echo "Validation complete!"
```

### Debug vs Release

```bash
# Debug build - keep all debug info
cargo build --target wasm32-unknown-unknown
wasm-tools validate target/wasm32-unknown-unknown/debug/app.wasm

# Release build - strip and validate
cargo build --release --target wasm32-unknown-unknown
wasm-tools strip target/wasm32-unknown-unknown/release/app.wasm \
  -o dist/app.wasm
wasm-tools validate dist/app.wasm
```

## Advanced Topics

### Custom Sections

```bash
# List all custom sections
wasm-tools print module.wasm | grep "custom"

# Add custom section
wasm-tools custom add module.wasm \
  --section-name "build_info" \
  --section-data "version=1.0.0" \
  -o output.wasm

# Extract custom section
wasm-tools custom extract module.wasm \
  --section-name "producers" \
  -o producers.json
```

### Feature Detection

```bash
# Check which features a module uses
wasm-tools validate module.wasm -v 2>&1 | grep "feature"

# Test module against different feature sets
for feature in threads simd bulk-memory; do
  echo "Testing with $feature..."
  wasm-tools validate --features=$feature module.wasm
done
```

### Batch Processing

```bash
# Validate all WASM files in directory
find . -name "*.wasm" -exec wasm-tools validate {} \; -print

# Strip all WASM files
for f in *.wasm; do
  wasm-tools strip "$f" -o "stripped/$f"
done

# Convert all to WAT
mkdir -p wat
for f in *.wasm; do
  wasm-tools print "$f" -o "wat/${f%.wasm}.wat"
done
```

## Integration with Other Tools

### With wasm-pack

```bash
# Build with wasm-pack then validate
wasm-pack build --target web
wasm-tools validate pkg/package_bg.wasm
```

### With wasm-opt

```bash
# Strip then optimize
wasm-tools strip input.wasm -o temp.wasm
wasm-opt -Oz temp.wasm -o output.wasm
wasm-tools validate output.wasm
rm temp.wasm
```

### With wasm-bindgen

```bash
# Generate bindings then inspect
wasm-bindgen input.wasm --out-dir pkg
wasm-tools print pkg/package_bg.wasm > inspected.wat
```

## Troubleshooting

### Common Validation Errors

```bash
# "invalid magic number" - not a WASM file
file module.wasm  # Check file type

# "unknown section" - newer proposal needed
wasm-tools validate --features=all module.wasm

# "type mismatch" - incompatible function signatures
wasm-tools print module.wasm | grep -A 10 "func"
```

### Performance Issues

```bash
# Large modules slow to validate
time wasm-tools validate large.wasm

# Skip validation during development
wasm-tools parse --no-validate input.wat -o output.wasm

# Use parallel processing for batch operations
find . -name "*.wasm" | parallel wasm-tools validate
```

## Best Practices

1. **Always validate** after transformations
2. **Strip debug info** in production builds
3. **Version control WAT files** for critical modules
4. **Check features** before deployment
5. **Use CI/CD** to validate all WASM artifacts
6. **Monitor sizes** to catch bloat early
7. **Document custom sections** in your project
8. **Test components** thoroughly with validate

## Resources

- GitHub: https://github.com/bytecodealliance/wasm-tools
- WebAssembly Spec: https://webassembly.github.io/spec/
- Component Model: https://github.com/WebAssembly/component-model
- WAT Reference: https://webassembly.github.io/spec/core/text/
