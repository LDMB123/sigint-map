# DMB Almanac - WASM Data Transformation

High-performance Rust implementation for transforming raw JSON data into Dexie-compatible formats.

## Overview

This module replaces expensive JavaScript data transformation operations with optimized Rust code compiled to WebAssembly, providing significant performance improvements for large datasets.

### Performance Targets

| Dataset | Items | Target | Improvement vs JS |
|---------|-------|--------|-------------------|
| Songs | ~1,300 | < 5ms | 5-10x |
| Venues | ~1,000 | < 3ms | 5-10x |
| Shows | ~5,000 | < 15ms | 5-10x |
| Setlist Entries | ~150,000 | < 100ms | 10-20x |
| FK Validation | All | < 50ms | 10x |

## Building

### Prerequisites

1. Install Rust: https://rustup.rs/
2. Install wasm-pack:
   ```bash
   cargo install wasm-pack
   ```

### Build Commands

```bash
# Development build (faster compile, larger output)
wasm-pack build --target web --dev

# Production build (optimized, smaller output)
wasm-pack build --target web --release

# Build for bundler (webpack, vite, etc.)
wasm-pack build --target bundler --release

# Build for Node.js
wasm-pack build --target nodejs --release
```

### Output

Built files are placed in `pkg/`:
- `dmb_transform.js` - JavaScript glue code
- `dmb_transform_bg.wasm` - WebAssembly binary
- `dmb_transform.d.ts` - TypeScript definitions

## Integration

### SvelteKit / Vite

1. Copy `pkg/` contents to `src/lib/wasm/dmb-transform/`
2. Use the wrapper module at `src/lib/wasm/transform.ts`

```typescript
import { transformSongs, preloadWasm } from '$lib/wasm/transform';

// Preload WASM on app init
preloadWasm();

// Transform data (auto-fallback to JS if WASM fails)
const result = await transformSongs(serverSongs);
console.log(`Transformed ${result.data.length} songs using ${result.source} in ${result.durationMs}ms`);
```

### Direct WASM Usage

```typescript
import init, { transform_songs, version } from './pkg/dmb_transform.js';

// Initialize WASM module
await init();

console.log('WASM version:', version());

// Transform data
const songs = transform_songs(JSON.stringify(serverSongs));
```

## API Reference

### Transformation Functions

| Function | Input | Output |
|----------|-------|--------|
| `transform_songs(json)` | Server song JSON | `DexieSong[]` |
| `transform_venues(json)` | Server venue JSON | `DexieVenue[]` |
| `transform_tours(json)` | Server tour JSON | `DexieTour[]` |
| `transform_shows(json)` | Server show JSON | `DexieShow[]` |
| `transform_setlist_entries(json)` | Server setlist JSON | `DexieSetlistEntry[]` |
| `transform_guests(json)` | Server guest JSON | `DexieGuest[]` |
| `transform_liberation_list(json)` | Server liberation JSON | `DexieLiberationEntry[]` |
| `transform_full_sync(json)` | Full sync response | `TransformedSyncData` |

### Validation Functions

| Function | Description |
|----------|-------------|
| `validate_foreign_keys(...)` | Validate referential integrity |

### Utility Functions

| Function | Description |
|----------|-------------|
| `generate_song_search_text(title, artist?)` | Generate song search text |
| `generate_venue_search_text(name, city, state?, country)` | Generate venue search text |
| `extract_year_from_date(date)` | Extract year from ISO date |
| `categorize_slot(position, total, setName)` | Categorize slot type |
| `version()` | Get WASM module version |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      JavaScript/TypeScript                  │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────┐   │
│  │  Raw JSON Data  │───▶│  WASM Transform Wrapper     │   │
│  │  (Server API)   │    │  ($lib/wasm/transform.ts)   │   │
│  └─────────────────┘    └─────────────┬───────────────┘   │
│                                       │                    │
└───────────────────────────────────────│────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     WebAssembly (Rust)                      │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────┐   │
│  │  JSON Parsing   │───▶│  Type Transformation        │   │
│  │  (serde_json)   │    │  (snake_case → camelCase)   │   │
│  └─────────────────┘    └─────────────┬───────────────┘   │
│                                       │                    │
│                         ┌─────────────▼───────────────┐   │
│                         │  Computed Fields            │   │
│                         │  (searchText, year, etc.)   │   │
│                         └─────────────┬───────────────┘   │
│                                       │                    │
│                         ┌─────────────▼───────────────┐   │
│                         │  Validation (ahash sets)    │   │
│                         └─────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     IndexedDB (Dexie.js)                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Dexie-formatted objects ready for bulkPut()        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Development

### Running Tests

```bash
# Rust tests
cargo test

# WASM tests (in browser)
wasm-pack test --headless --chrome
```

### Benchmarking

```bash
cargo bench
```

### Debugging

Enable console logging:
```rust
#[wasm_bindgen]
pub fn debug_log(msg: &str) {
    web_sys::console::log_1(&msg.into());
}
```

## Optimization Techniques

### Size Optimization
- `opt-level = "s"` - Optimize for size
- `lto = true` - Link-time optimization
- `panic = "abort"` - Remove panic infrastructure
- `strip = "debuginfo"` - Remove debug symbols

### Performance Optimization
- Zero-copy string operations where possible
- Pre-allocated vectors based on input size
- Inline functions for hot paths
- ahash for faster HashSet operations
- Single-pass transformations

### Memory Management
- No runtime allocation for small strings (SmolStr)
- Batch processing with main thread yielding
- Efficient serde deserialization

## Troubleshooting

### WASM Not Loading
1. Check browser console for errors
2. Verify WASM file is served with `application/wasm` MIME type
3. Check Content-Security-Policy allows `wasm-unsafe-eval`

### Performance Issues
1. Profile with browser DevTools
2. Check JSON.stringify overhead
3. Consider streaming large datasets

### TypeScript Errors
1. Regenerate types: `wasm-pack build --target web`
2. Check imports match generated code

## License

MIT
