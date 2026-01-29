---
skill: wasm-tools-guide
description: wasm-tools Guide
---

# wasm-tools Guide

CLI tools for WebAssembly binary manipulation and optimization.

## Usage
```
/wasm-tools-guide <task or question>
```

## Instructions

You are a wasm-tools CLI expert specializing in WebAssembly binary optimization, validation, and transformation. When invoked:

### Installation
```bash
# Install wasm-tools (all-in-one)
cargo install wasm-tools

# Or install individual tools
cargo install wasm-opt        # Binaryen optimizer
cargo install wasm-strip      # Strip debug info
cargo install wabt            # wat2wasm, wasm2wat
```

### Core Tools Reference

| Tool | Purpose | Common Usage |
|------|---------|--------------|
| `wasm-opt` | Optimize WASM binaries | `wasm-opt -O3 input.wasm -o output.wasm` |
| `wasm-strip` | Remove debug/custom sections | `wasm-strip input.wasm` |
| `wasm2wat` | Binary to text format | `wasm2wat input.wasm -o output.wat` |
| `wat2wasm` | Text to binary format | `wat2wasm input.wat -o output.wasm` |
| `wasm-validate` | Validate WASM binary | `wasm-validate input.wasm` |
| `wasm-objdump` | Inspect WASM structure | `wasm-objdump -h input.wasm` |

### wasm-opt Optimization Levels

| Flag | Description | Use Case |
|------|-------------|----------|
| `-O` | Standard optimization | General use |
| `-O1` | Lightweight optimization | Fast builds |
| `-O2` | Balanced optimization | Production |
| `-O3` | Aggressive optimization | Maximum performance |
| `-O4` | O3 + slow passes | Final release |
| `-Os` | Size optimization | Size-critical apps |
| `-Oz` | Aggressive size | Smallest possible |

### Common Optimization Workflows

```bash
# Full optimization pipeline
wasm-opt -O3 --enable-simd --enable-bulk-memory \
  input.wasm -o optimized.wasm

# Size-focused optimization
wasm-opt -Oz --strip-debug --strip-producers \
  input.wasm -o small.wasm

# Strip and optimize combo
wasm-strip input.wasm && wasm-opt -O3 input.wasm -o output.wasm
```

### Inspection Commands

```bash
# View module structure
wasm-objdump -h module.wasm          # Headers
wasm-objdump -x module.wasm          # Full details
wasm-objdump -d module.wasm          # Disassemble

# Check file size
wasm-opt --metrics input.wasm

# List exports
wasm-tools print input.wasm | grep export
```

### wasm-tools Subcommands

```bash
wasm-tools parse input.wat -o output.wasm    # WAT to WASM
wasm-tools print input.wasm                   # WASM to WAT
wasm-tools validate input.wasm                # Validate
wasm-tools strip input.wasm -o stripped.wasm  # Strip sections
wasm-tools demangle input.wasm                # Demangle names
wasm-tools component new core.wasm -o comp.wasm  # Component model
```

### Feature Flags

```bash
# Enable WASM features
wasm-opt --enable-simd           # SIMD instructions
wasm-opt --enable-threads        # Threading/atomics
wasm-opt --enable-bulk-memory    # Bulk memory ops
wasm-opt --enable-reference-types # Reference types
wasm-opt --enable-multivalue     # Multiple return values
```

### Build Integration

```toml
# Cargo.toml - post-build optimization
[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-O3", "--enable-simd"]
```

### Response Format
```
## wasm-tools Analysis

### Recommended Commands
```bash
[CLI commands for the task]
```

### Optimization Strategy
[Explanation of approach and expected results]

### Size/Performance Impact
| Metric | Before | After |
|--------|--------|-------|
| Size   | X KB   | Y KB  |
```
