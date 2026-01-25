# Skill: Python to Rust Migration

**ID**: `rust-from-python`
**Category**: Migration
**Agent**: Rust Migration Engineer

---

## When to Use

- Porting Python code to Rust for performance
- Creating Rust extensions for Python (PyO3)
- Replacing Python scripts with Rust binaries

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| python_code | string | Yes | Python code to migrate |
| approach | string | No | rewrite, pyo3, or both |

---

## Type Mappings

| Python | Rust | Notes |
|--------|------|-------|
| `int` | `i32`, `i64`, `isize` | Python ints are unbounded; use `num-bigint` for that |
| `float` | `f64` | Python uses double precision |
| `str` | `String`, `&str` | Owned vs borrowed |
| `bytes` | `Vec<u8>`, `&[u8]` | |
| `bool` | `bool` | |
| `None` | `Option<T>` | |
| `list` | `Vec<T>` | |
| `dict` | `HashMap<K, V>` | |
| `set` | `HashSet<T>` | |
| `tuple` | `(T1, T2, ...)` | Fixed-size tuples |
| `Optional[T]` | `Option<T>` | |
| `Union[A, B]` | `enum` or `Either` | |

---

## Pattern Translations

### List Operations

```python
# Python
numbers = [1, 2, 3, 4, 5]
squares = [x**2 for x in numbers if x % 2 == 0]
total = sum(squares)
```

```rust
// Rust
let numbers = vec![1, 2, 3, 4, 5];
let squares: Vec<i32> = numbers
    .iter()
    .filter(|&x| x % 2 == 0)
    .map(|&x| x * x)
    .collect();
let total: i32 = squares.iter().sum();
```

### Dictionary Operations

```python
# Python
word_counts = {}
for word in words:
    word_counts[word] = word_counts.get(word, 0) + 1
```

```rust
// Rust
use std::collections::HashMap;

let mut word_counts: HashMap<&str, i32> = HashMap::new();
for word in &words {
    *word_counts.entry(word).or_insert(0) += 1;
}
```

### Exception Handling

```python
# Python
def divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return None
```

```rust
// Rust - using Result
fn divide(a: f64, b: f64) -> Result<f64, &'static str> {
    if b == 0.0 {
        Err("division by zero")
    } else {
        Ok(a / b)
    }
}

// Rust - using Option for simple cases
fn divide_opt(a: f64, b: f64) -> Option<f64> {
    if b == 0.0 { None } else { Some(a / b) }
}
```

### Classes to Structs

```python
# Python
class Person:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age

    def greet(self) -> str:
        return f"Hello, I'm {self.name}"

    @classmethod
    def from_dict(cls, data: dict) -> "Person":
        return cls(data["name"], data["age"])
```

```rust
// Rust
struct Person {
    name: String,
    age: u32,
}

impl Person {
    fn new(name: impl Into<String>, age: u32) -> Self {
        Self { name: name.into(), age }
    }

    fn greet(&self) -> String {
        format!("Hello, I'm {}", self.name)
    }

    fn from_map(data: &HashMap<String, String>) -> Option<Self> {
        Some(Self {
            name: data.get("name")?.clone(),
            age: data.get("age")?.parse().ok()?,
        })
    }
}
```

### Generators to Iterators

```python
# Python
def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

for n in fibonacci():
    if n > 100:
        break
    print(n)
```

```rust
// Rust
struct Fibonacci {
    a: u64,
    b: u64,
}

impl Fibonacci {
    fn new() -> Self {
        Self { a: 0, b: 1 }
    }
}

impl Iterator for Fibonacci {
    type Item = u64;

    fn next(&mut self) -> Option<Self::Item> {
        let current = self.a;
        self.a = self.b;
        self.b = current + self.b;
        Some(current)
    }
}

// Usage
for n in Fibonacci::new().take_while(|&n| n <= 100) {
    println!("{}", n);
}
```

### Context Managers

```python
# Python
with open("file.txt") as f:
    content = f.read()
```

```rust
// Rust - RAII handles this automatically
let content = std::fs::read_to_string("file.txt")?;

// Or with explicit scope
{
    let file = File::open("file.txt")?;
    // file is closed when it goes out of scope
}
```

### Async/Await

```python
# Python
import asyncio

async def fetch_data(url: str) -> str:
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.text()
```

```rust
// Rust with tokio and reqwest
async fn fetch_data(url: &str) -> Result<String, reqwest::Error> {
    reqwest::get(url).await?.text().await
}
```

---

## PyO3 Integration

```toml
# Cargo.toml
[package]
name = "my_rust_lib"
version = "0.1.0"
edition = "2021"

[lib]
name = "my_rust_lib"
crate-type = ["cdylib"]

[dependencies]
pyo3 = { version = "0.20", features = ["extension-module"] }
```

```rust
// src/lib.rs
use pyo3::prelude::*;

/// A Python-callable function
#[pyfunction]
fn sum_as_string(a: usize, b: usize) -> PyResult<String> {
    Ok((a + b).to_string())
}

/// A Python class
#[pyclass]
struct Counter {
    value: i32,
}

#[pymethods]
impl Counter {
    #[new]
    fn new() -> Self {
        Counter { value: 0 }
    }

    fn increment(&mut self) {
        self.value += 1;
    }

    #[getter]
    fn value(&self) -> i32 {
        self.value
    }
}

/// Python module
#[pymodule]
fn my_rust_lib(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(sum_as_string, m)?)?;
    m.add_class::<Counter>()?;
    Ok(())
}
```

```bash
# Build
maturin develop

# Use in Python
python -c "import my_rust_lib; print(my_rust_lib.sum_as_string(1, 2))"
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Rust code | ./ | Migrated implementation |
| Tests | tests/ | Equivalent tests |

---

## Output Template

```markdown
## Migration Report: Python to Rust

### Original Python
```python
[python code]
```

### Migrated Rust
```rust
[rust code]
```

### Type Mappings Used
| Python | Rust |
|--------|------|
| ... | ... |

### Behavior Changes
- [Any differences in behavior]

### Testing
```bash
cargo test
```
```
