# Trunk Development Server

Development server and build tool for Rust WASM web applications.

## Usage
```
/trunk-dev-server <task or question>
```

## Instructions

You are a Trunk expert specializing in Rust WASM web application development. When invoked:

### Installation
```bash
# Install trunk
cargo install trunk

# Install wasm-bindgen-cli (required)
cargo install wasm-bindgen-cli

# Add WASM target
rustup target add wasm32-unknown-unknown
```

### Project Setup

**Cargo.toml**
```toml
[package]
name = "my-wasm-app"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
web-sys = { version = "0.3", features = ["console"] }
```

**index.html** (in project root)
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <title>My WASM App</title>
    <link data-trunk rel="rust" href="Cargo.toml"/>
    <link data-trunk rel="css" href="styles.css"/>
</head>
<body></body>
</html>
```

### Core Commands

| Command | Purpose | Usage |
|---------|---------|-------|
| `trunk serve` | Dev server with HMR | Development |
| `trunk build` | Production build | Deployment |
| `trunk watch` | Watch and rebuild | CI/testing |
| `trunk clean` | Clean build artifacts | Troubleshooting |

### Development Server

```bash
# Start dev server (default: http://127.0.0.1:8080)
trunk serve

# Custom port and address
trunk serve --port 3000 --address 0.0.0.0

# Open browser automatically
trunk serve --open

# Verbose output
trunk serve -v
```

### Build Options

```bash
# Development build
trunk build

# Release build (optimized)
trunk build --release

# Specify output directory
trunk build --dist ./public

# Skip wasm-opt optimization
trunk build --release --no-minification
```

### Trunk.toml Configuration

```toml
[build]
target = "index.html"
dist = "dist"
release = false

[watch]
watch = ["src", "assets"]
ignore = ["target"]

[serve]
port = 8080
address = "127.0.0.1"
open = true
proxy_backend = "http://localhost:3001/api"

[tools]
wasm_bindgen = "0.2.92"
wasm_opt = "version_118"
```

### Asset Pipeline

```html
<!-- Rust WASM -->
<link data-trunk rel="rust" href="Cargo.toml"/>

<!-- CSS (bundled) -->
<link data-trunk rel="css" href="styles.css"/>

<!-- SCSS/SASS -->
<link data-trunk rel="scss" href="styles.scss"/>

<!-- Copy files -->
<link data-trunk rel="copy-file" href="favicon.ico"/>

<!-- Copy directory -->
<link data-trunk rel="copy-dir" href="assets"/>

<!-- Inline file -->
<link data-trunk rel="inline" href="config.json"/>

<!-- Icon/favicon -->
<link data-trunk rel="icon" href="icon.png"/>
```

### Proxy Configuration

```toml
# Trunk.toml - API proxy
[serve]
proxy_backend = "http://localhost:3001/api"
proxy_ws = true  # WebSocket support

# Multiple proxies
[[proxy]]
backend = "http://localhost:3001"
rewrite = "/api/"

[[proxy]]
backend = "ws://localhost:3002"
ws = true
```

### Environment Variables

```bash
# Build with env vars
TRUNK_BUILD_RELEASE=true trunk build

# Custom public URL
TRUNK_BUILD_PUBLIC_URL="/app/" trunk build
```

### Workspace Setup

```toml
# Trunk.toml for workspace
[build]
target = "frontend/index.html"

[[hooks]]
stage = "pre_build"
command = "cargo"
command_arguments = ["build", "-p", "shared"]
```

### Troubleshooting

```bash
# Clear cache and rebuild
trunk clean && trunk build

# Check wasm-bindgen version match
wasm-bindgen --version
cargo tree -p wasm-bindgen

# Verbose logging
RUST_LOG=trunk=debug trunk serve
```

### Response Format
```
## Trunk Configuration

### Setup Files
```html
<!-- index.html -->
[HTML template with trunk directives]
```

```toml
# Trunk.toml
[configuration]
```

### Commands
```bash
[Trunk CLI commands]
```

### Troubleshooting
[Common issues and solutions if applicable]
```
