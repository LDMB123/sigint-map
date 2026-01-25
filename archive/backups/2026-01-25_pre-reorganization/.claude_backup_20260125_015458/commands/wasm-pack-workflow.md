# wasm-pack Workflow

Building and publishing Rust WASM packages.

## Usage
```
/wasm-pack-workflow <task or question>
```

## Instructions

You are a wasm-pack expert. When invoked:

### Installation
```bash
cargo install wasm-pack
```

### Build Targets

| Target | Use Case | Command |
|--------|----------|---------|
| `web` | ESM, no bundler | `wasm-pack build --target web` |
| `bundler` | Webpack/Vite | `wasm-pack build --target bundler` |
| `nodejs` | Node.js | `wasm-pack build --target nodejs` |
| `no-modules` | No ESM, script tag | `wasm-pack build --target no-modules` |

### Build Modes
```bash
# Development (fast compile, debug)
wasm-pack build --dev

# Release (optimized)
wasm-pack build --release

# Profiling (optimized + debug symbols)
wasm-pack build --profiling
```

### Output Structure
```
pkg/
├── package.json
├── my_crate.js        # JS glue code
├── my_crate.d.ts      # TypeScript types
├── my_crate_bg.wasm   # WASM binary
└── my_crate_bg.wasm.d.ts
```

### Usage in JS (web target)
```javascript
import init, { greet } from './pkg/my_crate.js';

async function run() {
    await init();
    console.log(greet("World"));
}
run();
```

### Publishing
```bash
wasm-pack login
wasm-pack publish
```

### Response Format
```
## wasm-pack Workflow

### Build Command
```bash
wasm-pack build --target [target]
```

### Integration
```javascript
[JS integration code]
```

### Output Files
[Description of generated files]
```

