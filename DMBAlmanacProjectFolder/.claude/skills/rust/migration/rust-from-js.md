# Skill: JavaScript/TypeScript to Rust Migration

**ID**: `rust-from-js`
**Category**: Migration
**Agent**: Rust Migration Engineer

---

## When to Use

- Porting Node.js/JS code to Rust for performance
- Creating Rust native addons for Node.js (napi-rs)
- Compiling Rust to WebAssembly for browser

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| js_code | string | Yes | JavaScript/TypeScript code |
| target | string | No | native, wasm, or napi |

---

## Type Mappings

| TypeScript | Rust | Notes |
|------------|------|-------|
| `number` | `f64` or `i32` | JS numbers are f64; use i32 for integers |
| `string` | `String`, `&str` | |
| `boolean` | `bool` | |
| `null/undefined` | `Option<T>` | |
| `T[]` | `Vec<T>` | |
| `Record<K, V>` | `HashMap<K, V>` | |
| `Map<K, V>` | `HashMap<K, V>` | |
| `Set<T>` | `HashSet<T>` | |
| `Promise<T>` | `Future<Output = Result<T, E>>` | |
| `T \| null` | `Option<T>` | |

---

## Pattern Translations

### Array Methods

```typescript
// TypeScript
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(x => x * 2);
const evens = numbers.filter(x => x % 2 === 0);
const sum = numbers.reduce((acc, x) => acc + x, 0);
const found = numbers.find(x => x > 3);
const hasLarge = numbers.some(x => x > 3);
const allPositive = numbers.every(x => x > 0);
```

```rust
// Rust
let numbers = vec![1, 2, 3, 4, 5];
let doubled: Vec<i32> = numbers.iter().map(|x| x * 2).collect();
let evens: Vec<i32> = numbers.iter().filter(|&x| x % 2 == 0).copied().collect();
let sum: i32 = numbers.iter().sum();
let found = numbers.iter().find(|&&x| x > 3);
let has_large = numbers.iter().any(|&x| x > 3);
let all_positive = numbers.iter().all(|&x| x > 0);
```

### Object Destructuring

```typescript
// TypeScript
const { name, age = 0 } = person;
const [first, ...rest] = items;
```

```rust
// Rust
let Person { name, age } = person;
// Default values need Option
let age = person.age.unwrap_or(0);

// Slice patterns
let [first, rest @ ..] = &items[..] else { panic!() };
// Or with split
let (first, rest) = items.split_first().unwrap();
```

### Optional Chaining

```typescript
// TypeScript
const name = user?.profile?.name ?? "Anonymous";
const value = obj?.nested?.deeply?.value;
```

```rust
// Rust
let name = user
    .as_ref()
    .and_then(|u| u.profile.as_ref())
    .map(|p| p.name.as_str())
    .unwrap_or("Anonymous");

// Or with ? in a function returning Option
fn get_value(obj: &Option<Obj>) -> Option<&Value> {
    obj.as_ref()?.nested.as_ref()?.deeply.as_ref()?.value.as_ref()
}
```

### Classes

```typescript
// TypeScript
class Counter {
    private value: number = 0;

    constructor(initial: number = 0) {
        this.value = initial;
    }

    increment(): void {
        this.value++;
    }

    getValue(): number {
        return this.value;
    }

    static create(): Counter {
        return new Counter();
    }
}
```

```rust
// Rust
pub struct Counter {
    value: i32,
}

impl Counter {
    pub fn new(initial: i32) -> Self {
        Self { value: initial }
    }

    pub fn increment(&mut self) {
        self.value += 1;
    }

    pub fn get_value(&self) -> i32 {
        self.value
    }

    pub fn create() -> Self {
        Self::new(0)
    }
}

impl Default for Counter {
    fn default() -> Self {
        Self::new(0)
    }
}
```

### Async/Await

```typescript
// TypeScript
async function fetchData(url: string): Promise<Data> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }
    return response.json();
}

async function fetchMultiple(urls: string[]): Promise<Data[]> {
    return Promise.all(urls.map(url => fetchData(url)));
}
```

```rust
// Rust with tokio and reqwest
async fn fetch_data(url: &str) -> Result<Data, Error> {
    let response = reqwest::get(url).await?;
    if !response.status().is_success() {
        return Err(Error::Http(response.status().as_u16()));
    }
    let data = response.json().await?;
    Ok(data)
}

async fn fetch_multiple(urls: Vec<String>) -> Result<Vec<Data>, Error> {
    let futures: Vec<_> = urls.iter()
        .map(|url| fetch_data(url))
        .collect();
    futures::future::try_join_all(futures).await
}
```

### Error Handling

```typescript
// TypeScript
function parseNumber(s: string): number {
    const n = parseInt(s, 10);
    if (isNaN(n)) {
        throw new Error(`Invalid number: ${s}`);
    }
    return n;
}

try {
    const n = parseNumber(input);
    console.log(n);
} catch (e) {
    console.error(e.message);
}
```

```rust
// Rust
fn parse_number(s: &str) -> Result<i32, ParseIntError> {
    s.parse()
}

// Usage
match parse_number(input) {
    Ok(n) => println!("{}", n),
    Err(e) => eprintln!("Error: {}", e),
}

// Or with ? operator
fn process(input: &str) -> Result<(), Box<dyn std::error::Error>> {
    let n = parse_number(input)?;
    println!("{}", n);
    Ok(())
}
```

---

## napi-rs Integration

```toml
# Cargo.toml
[package]
name = "my-native"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
napi = "2"
napi-derive = "2"

[build-dependencies]
napi-build = "2"
```

```rust
// src/lib.rs
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub fn sum(a: i32, b: i32) -> i32 {
    a + b
}

#[napi]
pub struct Counter {
    value: i32,
}

#[napi]
impl Counter {
    #[napi(constructor)]
    pub fn new() -> Self {
        Counter { value: 0 }
    }

    #[napi]
    pub fn increment(&mut self) {
        self.value += 1;
    }

    #[napi(getter)]
    pub fn value(&self) -> i32 {
        self.value
    }
}

#[napi]
pub async fn fetch_data(url: String) -> Result<String> {
    reqwest::get(&url)
        .await
        .map_err(|e| Error::from_reason(e.to_string()))?
        .text()
        .await
        .map_err(|e| Error::from_reason(e.to_string()))
}
```

```javascript
// Usage in Node.js
const { sum, Counter, fetchData } = require('./index.node');

console.log(sum(1, 2)); // 3

const counter = new Counter();
counter.increment();
console.log(counter.value); // 1

const data = await fetchData('https://api.example.com');
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Rust code | ./ | Migrated implementation |
| TypeScript types | index.d.ts | For napi-rs |

---

## Output Template

```markdown
## Migration Report: TypeScript to Rust

### Original TypeScript
```typescript
[ts code]
```

### Migrated Rust
```rust
[rust code]
```

### Pattern Mappings
| TypeScript Pattern | Rust Equivalent |
|--------------------|-----------------|
| `.map()` | `.iter().map().collect()` |
| `?.` | `.and_then()` or `?` |
| `async/await` | `async/await` with tokio |

### Testing
```bash
cargo test
npm test  # For napi-rs
```
```
