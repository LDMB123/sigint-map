# Skill: Go to Rust Migration

**ID**: `rust-from-go`
**Category**: Migration
**Agent**: Rust Migration Engineer

---

## When to Use

- Porting Go services to Rust for performance
- Replacing Go's garbage collector with Rust's ownership
- Translating goroutines to async Rust

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| go_code | string | Yes | Go code to migrate |
| async_runtime | string | No | tokio (default) or async-std |

---

## Type Mappings

| Go | Rust | Notes |
|----|------|-------|
| `int` | `isize` | Platform-dependent |
| `int32` | `i32` | |
| `int64` | `i64` | |
| `uint64` | `u64` | |
| `float64` | `f64` | |
| `string` | `String`, `&str` | Go strings are UTF-8 |
| `[]T` | `Vec<T>`, `&[T]` | |
| `[N]T` | `[T; N]` | |
| `map[K]V` | `HashMap<K, V>` | |
| `chan T` | `mpsc::channel`, `tokio::sync::mpsc` | |
| `interface{}` | `Box<dyn Any>`, generics, enums | |
| `error` | `Result<T, E>` | |
| `*T` | `&T`, `&mut T`, `Box<T>` | |
| `nil` | `None`, `Option<T>` | |

---

## Pattern Translations

### Error Handling

```go
// Go
func readFile(path string) ([]byte, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("failed to read %s: %w", path, err)
    }
    return data, nil
}

// Usage
data, err := readFile("config.json")
if err != nil {
    log.Fatal(err)
}
```

```rust
// Rust
fn read_file(path: &str) -> Result<Vec<u8>, std::io::Error> {
    std::fs::read(path)
}

// With context using anyhow
fn read_file(path: &str) -> anyhow::Result<Vec<u8>> {
    std::fs::read(path)
        .with_context(|| format!("failed to read {}", path))
}

// Usage
let data = read_file("config.json")?;
// Or with match for explicit handling
match read_file("config.json") {
    Ok(data) => { /* use data */ }
    Err(e) => eprintln!("Error: {}", e),
}
```

### Goroutines to Async

```go
// Go
func fetchAll(urls []string) []string {
    results := make(chan string, len(urls))

    for _, url := range urls {
        go func(u string) {
            resp, _ := http.Get(u)
            body, _ := io.ReadAll(resp.Body)
            results <- string(body)
        }(url)
    }

    var data []string
    for range urls {
        data = append(data, <-results)
    }
    return data
}
```

```rust
// Rust with tokio
async fn fetch_all(urls: Vec<String>) -> Vec<String> {
    let futures: Vec<_> = urls.into_iter()
        .map(|url| {
            tokio::spawn(async move {
                reqwest::get(&url)
                    .await
                    .ok()
                    .and_then(|r| r.text().await.ok())
                    .unwrap_or_default()
            })
        })
        .collect();

    let mut results = Vec::new();
    for future in futures {
        if let Ok(result) = future.await {
            results.push(result);
        }
    }
    results
}
```

### Channels

```go
// Go
func producer(ch chan<- int) {
    for i := 0; i < 10; i++ {
        ch <- i
    }
    close(ch)
}

func consumer(ch <-chan int) {
    for val := range ch {
        fmt.Println(val)
    }
}

func main() {
    ch := make(chan int, 5)
    go producer(ch)
    consumer(ch)
}
```

```rust
// Rust with tokio
use tokio::sync::mpsc;

async fn producer(tx: mpsc::Sender<i32>) {
    for i in 0..10 {
        if tx.send(i).await.is_err() {
            break;
        }
    }
    // Channel closed when tx is dropped
}

async fn consumer(mut rx: mpsc::Receiver<i32>) {
    while let Some(val) = rx.recv().await {
        println!("{}", val);
    }
}

#[tokio::main]
async fn main() {
    let (tx, rx) = mpsc::channel(5);

    tokio::spawn(producer(tx));
    consumer(rx).await;
}
```

### Select Statement

```go
// Go
select {
case msg := <-ch1:
    process(msg)
case msg := <-ch2:
    process(msg)
case <-time.After(time.Second):
    fmt.Println("timeout")
}
```

```rust
// Rust with tokio
use tokio::select;
use tokio::time::{timeout, Duration};

select! {
    Some(msg) = rx1.recv() => {
        process(msg);
    }
    Some(msg) = rx2.recv() => {
        process(msg);
    }
    _ = tokio::time::sleep(Duration::from_secs(1)) => {
        println!("timeout");
    }
}
```

### Defer

```go
// Go
func process() error {
    f, err := os.Open("file.txt")
    if err != nil {
        return err
    }
    defer f.Close()

    // ... use f ...
    return nil
}
```

```rust
// Rust - RAII handles this automatically
fn process() -> Result<(), std::io::Error> {
    let f = File::open("file.txt")?;
    // ... use f ...
    Ok(())
    // f is closed when it goes out of scope
}

// For custom cleanup, use Drop trait or scopeguard
use scopeguard::defer;

fn process() {
    defer! {
        println!("cleanup");
    }
    // ... do work ...
}
```

### Structs and Methods

```go
// Go
type Server struct {
    host string
    port int
}

func NewServer(host string, port int) *Server {
    return &Server{host: host, port: port}
}

func (s *Server) Address() string {
    return fmt.Sprintf("%s:%d", s.host, s.port)
}

func (s *Server) Start() error {
    // ...
    return nil
}
```

```rust
// Rust
struct Server {
    host: String,
    port: u16,
}

impl Server {
    fn new(host: impl Into<String>, port: u16) -> Self {
        Self { host: host.into(), port }
    }

    fn address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }

    fn start(&self) -> Result<(), Error> {
        // ...
        Ok(())
    }
}
```

### Interfaces to Traits

```go
// Go
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type ReadWriter interface {
    Reader
    Writer
}
```

```rust
// Rust
trait Read {
    fn read(&mut self, buf: &mut [u8]) -> Result<usize, Error>;
}

trait Write {
    fn write(&mut self, buf: &[u8]) -> Result<usize, Error>;
}

// Trait bounds for combined functionality
fn copy<R: Read, W: Write>(reader: &mut R, writer: &mut W) -> Result<usize, Error> {
    // ...
}

// Or use supertraits
trait ReadWrite: Read + Write {}
```

### Mutex and Sync

```go
// Go
type Counter struct {
    mu    sync.Mutex
    value int
}

func (c *Counter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.value++
}
```

```rust
// Rust
use std::sync::Mutex;

struct Counter {
    value: Mutex<i32>,
}

impl Counter {
    fn new() -> Self {
        Self { value: Mutex::new(0) }
    }

    fn increment(&self) {
        let mut value = self.value.lock().unwrap();
        *value += 1;
        // Lock released when value goes out of scope
    }
}
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Rust code | ./ | Migrated implementation |
| Async setup | ./ | Tokio configuration |

---

## Output Template

```markdown
## Migration Report: Go to Rust

### Original Go
```go
[go code]
```

### Migrated Rust
```rust
[rust code]
```

### Concurrency Mappings
| Go | Rust |
|----|------|
| `goroutine` | `tokio::spawn` |
| `chan T` | `mpsc::channel` |
| `select` | `tokio::select!` |
| `sync.Mutex` | `std::sync::Mutex` |

### Testing
```bash
cargo test
```
```
