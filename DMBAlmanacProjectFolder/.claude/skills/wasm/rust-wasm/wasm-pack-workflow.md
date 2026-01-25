# wasm-pack Workflow Guide

Complete guide to using wasm-pack for building, testing, and publishing Rust WebAssembly packages.

## Overview

wasm-pack is a one-stop shop for building, testing, and publishing Rust-generated WebAssembly. It orchestrates the entire workflow from Rust source to npm package.

**Key Features:**
- Builds Rust to WebAssembly with optimizations
- Generates JavaScript bindings and TypeScript definitions
- Runs tests in headless browsers
- Publishes to npm registry
- Supports multiple build targets (web, nodejs, bundler, no-modules)

## Project Setup

### Initial Project Creation

```bash
# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Or with cargo
cargo install wasm-pack

# Create new project using template
cargo generate --git https://github.com/rustwasm/wasm-pack-template

# Or manually create project
cargo new --lib my-wasm-project
cd my-wasm-project
```

### Cargo.toml Configuration

```toml
[package]
name = "my-wasm-project"
version = "0.1.0"
authors = ["Your Name <you@example.com>"]
edition = "2021"
description = "A sample WebAssembly project"
license = "MIT OR Apache-2.0"
repository = "https://github.com/username/my-wasm-project"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
wasm-bindgen-futures = "0.4"
js-sys = "0.3"
web-sys = { version = "0.3", features = ["console"] }
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"

# Optional: For better panic messages
console_error_panic_hook = { version = "0.1", optional = true }

# Optional: For logging
wasm-logger = { version = "0.2", optional = true }

[dev-dependencies]
wasm-bindgen-test = "0.3"

# Features for conditional compilation
[features]
default = ["console_error_panic_hook"]

# Optimize for size in release builds
[profile.release]
opt-level = "s"        # Optimize for size
lto = true             # Link-time optimization
codegen-units = 1      # Reduce parallel codegen for better optimization
panic = "abort"        # Remove unwinding support

# Optimize for debug builds (faster compile times)
[profile.dev]
opt-level = 0

# Profile for release with debug info
[profile.release-with-debug]
inherits = "release"
debug = true
```

### Package.json Configuration

```json
{
  "name": "my-wasm-project",
  "version": "0.1.0",
  "description": "WebAssembly project built with Rust",
  "main": "index.js",
  "types": "index.d.ts",
  "files": [
    "index.js",
    "index.d.ts",
    "index_bg.wasm",
    "index_bg.wasm.d.ts"
  ],
  "scripts": {
    "build": "wasm-pack build --target bundler",
    "build:web": "wasm-pack build --target web",
    "build:nodejs": "wasm-pack build --target nodejs",
    "test": "wasm-pack test --headless --firefox --chrome",
    "pack": "wasm-pack pack",
    "publish": "wasm-pack publish"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/username/my-wasm-project"
  },
  "keywords": [
    "wasm",
    "webassembly",
    "rust"
  ],
  "author": "Your Name",
  "license": "MIT OR Apache-2.0",
  "devDependencies": {
    "@wasm-tool/wasm-pack-plugin": "^1.7.0"
  }
}
```

## Build Targets

### Target: bundler (Default)

**Use Case:** For use with webpack, rollup, parcel, etc.

```bash
wasm-pack build --target bundler
```

**Generated Files:**
```
pkg/
├── package.json
├── README.md
├── index.js              # ES modules with bundler imports
├── index.d.ts            # TypeScript definitions
├── index_bg.wasm         # WebAssembly binary
└── index_bg.wasm.d.ts    # WASM TypeScript definitions
```

**Usage in JavaScript:**
```javascript
// With webpack, vite, etc.
import init, { greet } from './pkg/index.js';

async function run() {
  await init();  // Initialize WASM module
  const result = greet('World');
  console.log(result);
}

run();
```

**Webpack Configuration:**
```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  experiments: {
    asyncWebAssembly: true,
  },
  mode: 'production',
};
```

### Target: web

**Use Case:** For direct usage in browsers via ES modules (no bundler required).

```bash
wasm-pack build --target web
```

**Usage in Browser:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>WASM Example</title>
</head>
<body>
    <script type="module">
        import init, { greet } from './pkg/index.js';

        async function run() {
            // Pass the path to the .wasm file
            await init('./pkg/index_bg.wasm');

            const result = greet('World');
            console.log(result);
        }

        run();
    </script>
</body>
</html>
```

**With CDN:**
```html
<script type="module">
    import init, { greet } from 'https://cdn.example.com/my-wasm-project/index.js';

    await init();
    greet('World');
</script>
```

### Target: nodejs

**Use Case:** For Node.js applications.

```bash
wasm-pack build --target nodejs
```

**Usage in Node.js:**
```javascript
// CommonJS
const { greet } = require('./pkg/index.js');
console.log(greet('Node.js'));

// ES Modules (with "type": "module" in package.json)
import { greet } from './pkg/index.js';
console.log(greet('Node.js'));
```

**Package.json for Node:**
```json
{
  "dependencies": {
    "my-wasm-project": "file:./pkg"
  }
}
```

### Target: no-modules

**Use Case:** For legacy browsers without ES module support.

```bash
wasm-pack build --target no-modules
```

**Usage:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>WASM Example</title>
    <script src="./pkg/index.js"></script>
</head>
<body>
    <script>
        // Access via global wasm_bindgen object
        const { greet } = wasm_bindgen;

        async function run() {
            await wasm_bindgen('./pkg/index_bg.wasm');
            console.log(greet('World'));
        }

        run();
    </script>
</body>
</html>
```

## Build Options and Flags

### Common Build Options

```bash
# Basic build
wasm-pack build

# Specify target
wasm-pack build --target web

# Release mode (default)
wasm-pack build --release

# Debug mode (faster builds, larger size, includes debug info)
wasm-pack build --dev

# Profile mode (optimized with debug info)
wasm-pack build --profiling

# Specify output directory
wasm-pack build --out-dir custom-pkg

# Specify output name
wasm-pack build --out-name my-wasm

# Scope package (for npm organizations)
wasm-pack build --scope myorg

# Don't generate package.json
wasm-pack build --no-pack

# Specific cargo features
wasm-pack build --features "feature1 feature2"

# All features
wasm-pack build --all-features

# No default features
wasm-pack build --no-default-features
```

### Advanced Build Configuration

```bash
# Custom profile from Cargo.toml
wasm-pack build --profiling

# Weak references (experimental, smaller binaries)
wasm-pack build -- --weak-refs

# Reference types (experimental)
wasm-pack build -- --reference-types

# Multiple targets in one go
wasm-pack build --target bundler && \
wasm-pack build --target web --out-dir pkg-web && \
wasm-pack build --target nodejs --out-dir pkg-node
```

### Size Optimization

```bash
# Build with maximum optimization
wasm-pack build --release

# Use wasm-opt for additional optimization
wasm-pack build --release
wasm-opt -Oz -o pkg/index_bg_optimized.wasm pkg/index_bg.wasm

# Strip debug info (if not using profiling)
wasm-strip pkg/index_bg.wasm
```

**Advanced Cargo.toml optimizations:**
```toml
[profile.release]
opt-level = "z"        # Optimize aggressively for size
lto = true             # Link-time optimization
codegen-units = 1      # Better optimization, slower compile
panic = "abort"        # Remove unwinding support
strip = true           # Strip symbols (Rust 1.59+)

# Additional flags
[profile.release.package."*"]
opt-level = "z"
```

## Testing with wasm-pack test

### Basic Test Setup

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

// tests/web.rs or in src/lib.rs
#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    // Configure test to run in browser
    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn test_add() {
        assert_eq!(add(2, 2), 4);
    }

    #[wasm_bindgen_test]
    fn test_add_negative() {
        assert_eq!(add(-1, 1), 0);
    }

    #[wasm_bindgen_test]
    async fn test_async_function() {
        // Test async functions
        let result = async_operation().await;
        assert!(result.is_ok());
    }
}
```

### Running Tests

```bash
# Run tests in headless Chrome
wasm-pack test --headless --chrome

# Run tests in headless Firefox
wasm-pack test --headless --firefox

# Run tests in both browsers
wasm-pack test --headless --chrome --firefox

# Run tests in Safari (macOS only)
wasm-pack test --headless --safari

# Run tests with visible browser (for debugging)
wasm-pack test --chrome

# Run tests in Node.js
wasm-pack test --node

# Run specific test
wasm-pack test --headless --chrome -- --test specific_test

# Run with test filter
wasm-pack test --headless --chrome -- test_add
```

### Testing DOM Interactions

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen_test::*;
use web_sys::{Document, Element};

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn test_dom_manipulation() {
    let window = web_sys::window().expect("no global window");
    let document = window.document().expect("no global document");

    let element = document
        .create_element("div")
        .expect("failed to create element");

    element.set_inner_html("Hello, WASM!");
    assert_eq!(element.inner_html(), "Hello, WASM!");
}

#[wasm_bindgen_test]
fn test_body_exists() {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let body = document.body().unwrap();

    assert!(body.is_instance_of::<web_sys::HtmlElement>());
}
```

### Testing with Console Output

```rust
use wasm_bindgen_test::*;
use web_sys::console;

#[wasm_bindgen_test]
fn test_with_console_output() {
    console::log_1(&"Starting test".into());

    let result = 2 + 2;
    console::log_2(&"Result:".into(), &result.into());

    assert_eq!(result, 4);
}
```

## Publishing to npm

### Pre-publish Checklist

1. **Update version in Cargo.toml**
```toml
[package]
version = "0.2.0"
```

2. **Update CHANGELOG.md**
```markdown
## [0.2.0] - 2026-01-21
### Added
- New feature X
### Changed
- Improved performance of Y
### Fixed
- Bug in Z
```

3. **Ensure README.md is comprehensive**
```markdown
# My WASM Project

Description of your project.

## Installation

\`\`\`bash
npm install my-wasm-project
\`\`\`

## Usage

\`\`\`javascript
import init, { greet } from 'my-wasm-project';

await init();
console.log(greet('World'));
\`\`\`

## API Documentation

...
```

### Build for Publishing

```bash
# Build optimized release
wasm-pack build --release --target bundler

# Verify package contents
wasm-pack pack

# This creates a tarball in pkg/
ls pkg/*.tgz
```

### Publishing Workflow

```bash
# Login to npm (first time only)
npm login

# Publish using wasm-pack
wasm-pack publish

# Or publish manually from pkg directory
cd pkg
npm publish

# For scoped packages
wasm-pack publish --access public

# For beta/alpha versions
wasm-pack build --release
cd pkg
npm version prerelease --preid=beta
npm publish --tag beta
```

### Package.json Customization

Create `pkg/package.json` or use build-time generation:

```json
{
  "name": "@myorg/my-wasm-project",
  "collaborators": ["Your Name <you@example.com>"],
  "description": "A powerful WebAssembly library",
  "version": "0.1.0",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/my-wasm-project"
  },
  "homepage": "https://github.com/username/my-wasm-project#readme",
  "bugs": {
    "url": "https://github.com/username/my-wasm-project/issues"
  },
  "keywords": [
    "wasm",
    "webassembly",
    "rust",
    "performance"
  ],
  "main": "index.js",
  "types": "index.d.ts",
  "sideEffects": false
}
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          profile: minimal
          toolchain: stable
          override: true

      - name: Install wasm-pack
        run: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

      - name: Run tests
        run: wasm-pack test --headless --firefox --chrome

      - name: Build
        run: wasm-pack build --release

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: wasm-package
          path: pkg/

  publish:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v3

      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          profile: minimal
          toolchain: stable

      - name: Install wasm-pack
        run: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

      - name: Build
        run: wasm-pack build --release

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Publish to npm
        run: wasm-pack publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### GitLab CI/CD

```yaml
# .gitlab-ci.yml
image: rust:latest

stages:
  - test
  - build
  - deploy

variables:
  CARGO_HOME: $CI_PROJECT_DIR/.cargo

cache:
  paths:
    - .cargo/
    - target/

before_script:
  - curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
  - export PATH=$PATH:$HOME/.cargo/bin

test:
  stage: test
  script:
    - wasm-pack test --headless --firefox
  only:
    - merge_requests
    - main

build:
  stage: build
  script:
    - wasm-pack build --release
  artifacts:
    paths:
      - pkg/
    expire_in: 1 week

deploy:
  stage: deploy
  image: node:18
  script:
    - cd pkg
    - echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
    - npm publish
  only:
    - main
  when: manual
```

### Travis CI

```yaml
# .travis.yml
language: rust
rust:
  - stable

cache: cargo

before_install:
  - curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

script:
  - wasm-pack test --headless --firefox --chrome
  - wasm-pack build --release

deploy:
  provider: npm
  email: you@example.com
  api_key: $NPM_TOKEN
  skip_cleanup: true
  local_dir: pkg
  on:
    tags: true
```

## Advanced Workflows

### Multi-Target Build Script

```bash
#!/bin/bash
# build-all.sh

set -e

echo "Building for all targets..."

# Clean previous builds
rm -rf pkg pkg-*

# Build for bundler (default)
echo "Building for bundler..."
wasm-pack build --release --target bundler --out-dir pkg-bundler

# Build for web
echo "Building for web..."
wasm-pack build --release --target web --out-dir pkg-web

# Build for Node.js
echo "Building for nodejs..."
wasm-pack build --release --target nodejs --out-dir pkg-nodejs

# Build for no-modules
echo "Building for no-modules..."
wasm-pack build --release --target no-modules --out-dir pkg-no-modules

echo "All builds complete!"
echo "Packages generated in:"
echo "  - pkg-bundler"
echo "  - pkg-web"
echo "  - pkg-nodejs"
echo "  - pkg-no-modules"
```

### Watch Mode for Development

```bash
#!/bin/bash
# watch.sh

# Install cargo-watch if not present
command -v cargo-watch >/dev/null 2>&1 || cargo install cargo-watch

# Watch for changes and rebuild
cargo watch -i pkg -s "wasm-pack build --dev --target web"
```

### Size Analysis Script

```bash
#!/bin/bash
# analyze-size.sh

echo "Building and analyzing WASM size..."

wasm-pack build --release

echo ""
echo "Package sizes:"
ls -lh pkg/*.wasm

echo ""
echo "Detailed WASM analysis:"
wasm-opt --print-size pkg/*_bg.wasm

echo ""
echo "Top 10 largest functions:"
twiggy top pkg/*_bg.wasm | head -10

echo ""
echo "Unused code analysis:"
twiggy garbage pkg/*_bg.wasm
```

## Best Practices

### 1. Version Management

```toml
# Keep versions in sync
# Cargo.toml
[package]
version = "0.1.0"

# Use cargo-release for automated versioning
# cargo install cargo-release
# cargo release patch/minor/major
```

### 2. Optimization Checklist

- Use `--release` for production builds
- Enable LTO in Cargo.toml
- Set `opt-level = "s"` or `"z"` for size
- Run `wasm-opt` post-build for additional optimization
- Use `wasm-strip` to remove debug symbols
- Minimize dependencies
- Use `cargo tree` to analyze dependency tree

### 3. Documentation

```rust
//! # My WASM Library
//!
//! This library provides...
//!
//! ## Usage
//!
//! ```javascript
//! import init, { greet } from 'my-wasm-lib';
//! await init();
//! greet('World');
//! ```

/// Greets a person by name.
///
/// # Arguments
///
/// * `name` - The name to greet
///
/// # Examples
///
/// ```javascript
/// const message = greet('Alice');
/// console.log(message); // "Hello, Alice!"
/// ```
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}
```

### 4. Testing Strategy

- Write unit tests for Rust logic
- Write integration tests with wasm-bindgen-test
- Test in multiple browsers (Chrome, Firefox, Safari)
- Test in Node.js if targeting Node
- Use CI to run tests automatically
- Include visual/manual testing for UI components

### 5. Error Handling

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn safe_divide(a: f64, b: f64) -> Result<f64, JsValue> {
    if b == 0.0 {
        Err(JsValue::from_str("Division by zero"))
    } else {
        Ok(a / b)
    }
}
```

## Troubleshooting

### Common Issues

**Issue: "wasm-pack not found"**
```bash
# Reinstall wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

**Issue: "error: linking with `rust-lld` failed"**
```bash
# Update Rust toolchain
rustup update
```

**Issue: "Package size too large"**
```bash
# Enable all optimizations in Cargo.toml
[profile.release]
opt-level = "z"
lto = true
codegen-units = 1

# Run wasm-opt
wasm-opt -Oz pkg/*_bg.wasm -o pkg/*_bg.wasm
```

**Issue: "Tests fail in headless browser"**
```bash
# Update browser drivers
# Chrome
webdriver-manager update

# Or test in visible browser for debugging
wasm-pack test --chrome
```

## Related Skills
- /Users/louisherman/ClaudeCodeProjects/.claude/skills/wasm/rust-wasm/wasm-bindgen-guide.md
- /Users/louisherman/ClaudeCodeProjects/.claude/skills/wasm/rust-wasm/rust-wasm-debugging.md
