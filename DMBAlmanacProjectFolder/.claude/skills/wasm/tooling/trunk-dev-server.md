# Trunk Development Server

Build and bundling tool for Rust WebAssembly applications with live reload.

## Installation

```bash
# Install via cargo
cargo install --locked trunk

# Or via cargo-binstall (faster)
cargo binstall trunk

# Install with all features
cargo install --locked trunk --features=vendored

# Verify installation
trunk --version
```

## Quick Start

```bash
# Initialize new project
cargo new --lib my-wasm-app
cd my-wasm-app

# Add to Cargo.toml
# [lib]
# crate-type = ["cdylib"]

# Create index.html
cat > index.html << 'EOF'
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>My WASM App</title>
  </head>
  <body></body>
</html>
EOF

# Start dev server
trunk serve
```

## Basic Commands

### Development Server

```bash
# Start dev server on default port (8080)
trunk serve

# Custom port
trunk serve --port 3000

# Custom address
trunk serve --address 0.0.0.0 --port 8080

# Open browser automatically
trunk serve --open

# Verbose logging
trunk serve -v
```

### Building

```bash
# Build for development
trunk build

# Build for production (optimized)
trunk build --release

# Custom output directory
trunk build --dist ./output

# Public URL for assets
trunk build --public-url /app/
```

### Watching

```bash
# Watch and rebuild (no server)
trunk watch

# Watch specific files
trunk watch --watch src/ --watch assets/

# Ignore specific paths
trunk watch --ignore target/ --ignore node_modules/
```

### Cleaning

```bash
# Clean build artifacts
trunk clean

# Clean specific dist directory
trunk clean --dist ./output

# Clean and rebuild
trunk clean && trunk build --release
```

## Trunk.toml Configuration

### Basic Configuration

```toml
# Trunk.toml

[build]
# Target index.html file
target = "index.html"

# Output directory
dist = "dist"

# Public URL prefix for assets
public_url = "/"

# Build in release mode by default
release = false

# Number of file watcher threads
filehash = true
```

### Advanced Build Settings

```toml
[build]
target = "index.html"
dist = "dist"
release = false

# Enable minification
minify = "always"  # "never", "on_release", "always"

# Offline mode (no CDN links)
offline = true

# Frozen lockfile (fail if Cargo.lock changes)
frozen = true

# Don't use cargo workspaces
no_workspace = false

# Inject scripts into HTML
inject_scripts = true

# Preload WASM module
preload = true

# Cross-origin isolation headers
cross_origin_isolation = false
```

### Server Configuration

```toml
[serve]
# Port to serve on
port = 8080

# Address to bind to
address = "127.0.0.1"

# Open browser on start
open = false

# Don't show build progress
no_autoreload = false

# WebSocket port for live reload
ws_port = 8081

# Serve over HTTPS
tls = false
tls_key_path = "key.pem"
tls_cert_path = "cert.pem"
```

### Watch Configuration

```toml
[watch]
# Watch specific paths
watch = ["src/", "assets/", "styles/"]

# Ignore specific paths
ignore = ["target/", "node_modules/", ".git/"]

# Debounce delay in milliseconds
poll_interval = 500
```

### Proxy Configuration

```toml
[[proxy]]
# Proxy /api requests to backend
backend = "http://localhost:8000/api"
rewrite = "/api"

[[proxy]]
# WebSocket proxy
backend = "ws://localhost:9000"
ws = true
```

## Asset Pipeline

### HTML Processing

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>My App</title>

    <!-- Trunk will bundle CSS -->
    <link data-trunk rel="css" href="styles/main.css" />

    <!-- Trunk will bundle Sass/SCSS -->
    <link data-trunk rel="sass" href="styles/app.scss" />

    <!-- Trunk will optimize images -->
    <link data-trunk rel="icon" href="assets/favicon.ico" />

    <!-- Trunk will copy files -->
    <link data-trunk rel="copy-file" href="assets/robots.txt" />

    <!-- Trunk will inline files -->
    <link data-trunk rel="inline" href="critical.css" />

    <!-- External scripts -->
    <link data-trunk rel="js" href="scripts/analytics.js" />
  </head>
  <body>
    <!-- Rust WASM will initialize here -->
  </body>
</html>
```

### CSS/Sass Processing

```html
<!-- Link CSS file -->
<link data-trunk rel="css" href="style.css" />

<!-- Link Sass/SCSS file -->
<link data-trunk rel="sass" href="styles/main.scss" />

<!-- Inline CSS -->
<link data-trunk rel="inline" type="css" href="critical.css" />

<!-- With integrity hash -->
<link data-trunk rel="css" href="style.css" data-integrity="sha384" />
```

### Image Optimization

```html
<!-- Copy and optimize image -->
<link data-trunk rel="icon" href="favicon.png" />

<!-- Copy to specific path -->
<link data-trunk rel="copy-file" href="logo.svg" data-target-path="assets/logo.svg" />

<!-- Inline small images as data URLs -->
<link data-trunk rel="inline" href="small-icon.png" />
```

### Static Assets

```html
<!-- Copy directory -->
<link data-trunk rel="copy-dir" href="public/" />

<!-- Copy single file -->
<link data-trunk rel="copy-file" href="manifest.json" />

<!-- Copy with custom target -->
<link data-trunk rel="copy-file" href="worker.js" data-target-path="sw.js" />
```

### JavaScript Files

```html
<!-- Bundle external JS -->
<link data-trunk rel="js" href="src/utils.js" />

<!-- Load from CDN with fallback -->
<link data-trunk rel="js" href="https://cdn.example.com/lib.js" />

<!-- Module script -->
<link data-trunk rel="js" href="module.js" data-type="module" />

<!-- Defer loading -->
<link data-trunk rel="js" href="analytics.js" data-defer />
```

## Watch Mode

### Basic Watching

```bash
# Watch and serve with live reload
trunk serve

# Watch without serving
trunk watch

# Watch with custom poll interval
trunk watch --poll 1000
```

### Custom Watch Paths

```toml
# Trunk.toml
[watch]
watch = [
    "src/",
    "styles/",
    "assets/",
    "index.html"
]

ignore = [
    "target/",
    "dist/",
    ".git/",
    "*.tmp"
]
```

### Watch-Triggered Hooks

```toml
# Trunk.toml
[build]
target = "index.html"

# Run commands before build
pre_build = ["npm run lint", "cargo fmt --check"]

# Run commands after build
post_build = ["npm run test"]
```

## Proxying Requests

### Basic Proxy

```toml
# Trunk.toml
[[proxy]]
# Proxy /api/* to backend server
backend = "http://localhost:8000"
rewrite = "/api"
```

### Multiple Proxies

```toml
# API server
[[proxy]]
backend = "http://localhost:8000"
rewrite = "/api"

# WebSocket server
[[proxy]]
backend = "ws://localhost:9000"
rewrite = "/ws"
ws = true

# Static assets from CDN
[[proxy]]
backend = "https://cdn.example.com"
rewrite = "/cdn"
```

### Advanced Proxy Configuration

```toml
[[proxy]]
# Backend URL
backend = "http://localhost:8000"

# URL path to proxy
rewrite = "/api"

# WebSocket support
ws = false

# Insecure HTTPS (dev only!)
insecure = false

# No rewrite (preserve path)
no_system_proxy = false

# Custom headers
[proxy.headers]
"X-Custom-Header" = "value"
```

### Proxy Examples

```toml
# Proxy GraphQL endpoint
[[proxy]]
backend = "http://localhost:4000/graphql"
rewrite = "/graphql"

# Proxy authentication service
[[proxy]]
backend = "http://localhost:8080"
rewrite = "/auth"
[proxy.headers]
"X-API-Key" = "dev-key"

# Proxy file uploads
[[proxy]]
backend = "http://localhost:3000/uploads"
rewrite = "/uploads"

# WebSocket for real-time updates
[[proxy]]
backend = "ws://localhost:6000"
rewrite = "/live"
ws = true
```

## Production Builds

### Optimized Build

```bash
# Production build with all optimizations
trunk build --release

# With custom public URL
trunk build --release --public-url https://cdn.example.com/app/

# Clean build
trunk clean && trunk build --release
```

### Build Configuration

```toml
# Trunk.toml
[build]
target = "index.html"
dist = "dist"
release = true
minify = "always"
offline = true

# Production public URL
public_url = "/app/"

# Enable all optimizations
filehash = true
```

### Post-Build Optimization

```bash
# Build with Trunk
trunk build --release

# Further optimize WASM
wasm-opt -Oz dist/*.wasm -o dist/optimized.wasm

# Compress for serving
gzip -9 dist/*.wasm
brotli -9 dist/*.wasm

# Generate integrity hashes
shasum -a 384 dist/*.wasm | cut -d ' ' -f 1 | xxd -r -p | base64
```

## Advanced Features

### Cross-Origin Isolation

```toml
# Trunk.toml
[build]
# Enable SharedArrayBuffer and other features
cross_origin_isolation = true
```

```html
<!-- Trunk adds these headers automatically:
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
-->
```

### Custom Cargo Features

```bash
# Build with specific cargo features
trunk build --features "feature1,feature2"

# Build without default features
trunk build --no-default-features

# Combined
trunk build --no-default-features --features "minimal"
```

### Environment Variables

```bash
# Set environment for build
RUSTFLAGS="-C link-arg=-s" trunk build --release

# Custom wasm-bindgen path
WASM_BINDGEN=/usr/local/bin/wasm-bindgen trunk build

# Trunk-specific environment
TRUNK_BUILD_PUBLIC_URL=/app/ trunk build --release
```

### Hooks and Scripts

```toml
# Trunk.toml
[build]
pre_build = [
    "cargo fmt --check",
    "cargo clippy -- -D warnings"
]

post_build = [
    "ls -lh dist/",
    "./scripts/deploy.sh"
]
```

## Integration Examples

### With Yew Framework

```toml
# Cargo.toml
[package]
name = "yew-app"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
yew = { version = "0.21", features = ["csr"] }
```

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Yew App</title>
    <link data-trunk rel="sass" href="styles/app.scss" />
  </head>
  <body></body>
</html>
```

```bash
trunk serve --open
```

### With Tailwind CSS

```toml
# Trunk.toml
[build]
target = "index.html"

[[hooks]]
stage = "pre_build"
command = "npx"
command_arguments = ["tailwindcss", "-i", "input.css", "-o", "output.css"]
```

```html
<!-- index.html -->
<link data-trunk rel="css" href="output.css" />
```

### With Web Workers

```html
<!-- index.html -->
<link data-trunk rel="rust" href="Cargo.toml" data-wasm-opt="z" />
<link data-trunk rel="rust" href="Cargo.toml"
      data-bin="worker"
      data-type="worker" />
```

```toml
# Cargo.toml
[[bin]]
name = "worker"
path = "src/worker.rs"
```

## Troubleshooting

### Common Issues

```bash
# Port already in use
trunk serve --port 3001

# WASM build fails
cargo clean
rm -rf target/
trunk clean
trunk build

# Live reload not working
trunk serve --ws-port 8081

# Slow builds
trunk build --release --no-default-features

# Cache issues
trunk clean
rm -rf ~/.cargo/registry/cache/
```

### Debug Mode

```bash
# Verbose logging
trunk -v serve

# Very verbose
trunk -vv build

# Log file output
trunk serve 2>&1 | tee trunk.log
```

### Performance Optimization

```toml
# Trunk.toml
[build]
# Reduce rebuilds
filehash = true

# Faster linking
[profile.dev]
opt-level = 1

[profile.release]
lto = true
opt-level = "z"
```

## Best Practices

1. **Use Trunk.toml** for project-specific configuration
2. **Enable filehash** for better caching
3. **Proxy API calls** during development
4. **Optimize assets** in production builds
5. **Version control** Trunk.toml but not dist/
6. **Use release builds** for deployment
7. **Enable minification** for production
8. **Test with --offline** mode
9. **Use hooks** for linting and testing
10. **Monitor build times** and optimize

## Common Workflows

### Development

```bash
# Start development
trunk serve --open

# In another terminal, run tests
cargo test
cargo clippy
```

### Pre-commit

```bash
# Verify build before commit
trunk build --release
cargo test
cargo fmt --check
cargo clippy -- -D warnings
```

### CI/CD

```bash
#!/bin/bash
# ci-build.sh

set -e

echo "Installing trunk..."
cargo install --locked trunk

echo "Building application..."
trunk build --release

echo "Running tests..."
cargo test

echo "Checking bundle size..."
SIZE=$(wc -c < dist/*.wasm)
if [ $SIZE -gt 2097152 ]; then
  echo "Warning: WASM bundle > 2MB"
fi

echo "Build complete!"
```

## Resources

- GitHub: https://github.com/trunk-rs/trunk
- Documentation: https://trunkrs.dev/
- Yew Integration: https://yew.rs/docs/getting-started/build-a-sample-app
- Examples: https://github.com/trunk-rs/trunk/tree/main/examples
