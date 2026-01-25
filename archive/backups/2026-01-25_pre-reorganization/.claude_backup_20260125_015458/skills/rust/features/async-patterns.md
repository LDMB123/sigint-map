# Skill: Async Rust Patterns

**ID**: `async-patterns`
**Category**: Features
**Agent**: Rust Async Specialist

---

## When to Use

- Implementing async functions and traits
- Choosing async runtime (Tokio, async-std)
- Designing concurrent systems
- Handling cancellation and timeouts
- Avoiding common async pitfalls

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| use_case | string | Yes | What async behavior is needed |
| runtime | string | No | Preferred runtime (tokio/async-std) |

---

## Steps

### Step 1: Understand Async Basics

```rust
// Async functions return a Future
async fn fetch_data(url: &str) -> Result<String, Error> {
    let response = reqwest::get(url).await?;
    response.text().await
}

// Futures are lazy - they don't run until awaited
let future = fetch_data("https://example.com");  // Not running yet
let result = future.await;  // Now it runs

// Async blocks
let future = async {
    let a = fetch_a().await;
    let b = fetch_b().await;
    a + b
};
```

### Step 2: Concurrent Execution

```rust
use tokio::join;

// Sequential (slow)
async fn sequential() {
    let a = fetch_a().await;  // Wait for a
    let b = fetch_b().await;  // Then wait for b
}

// Concurrent with join! (fast)
async fn concurrent() {
    let (a, b) = join!(fetch_a(), fetch_b());  // Both at once
}

// Concurrent with try_join! (stops on first error)
use tokio::try_join;
async fn concurrent_fallible() -> Result<(A, B), Error> {
    try_join!(fetch_a(), fetch_b())
}
```

### Step 3: Spawning Tasks

```rust
use tokio::task;

// Spawn a task (runs independently)
let handle = task::spawn(async {
    expensive_computation().await
});

// Wait for result
let result = handle.await?;

// Spawn blocking work
let result = task::spawn_blocking(|| {
    // Synchronous, CPU-intensive work
    compute_hash(data)
}).await?;

// Spawn on current thread (for !Send futures)
let result = task::spawn_local(async {
    // Can use non-Send types
}).await?;
```

### Step 4: Common Patterns

#### Select (First to Complete)

```rust
use tokio::select;

async fn with_timeout() -> Result<Data, Error> {
    select! {
        result = fetch_data() => result,
        _ = tokio::time::sleep(Duration::from_secs(10)) => {
            Err(Error::Timeout)
        }
    }
}

// Select with loops
async fn process_events(mut rx: Receiver<Event>, mut shutdown: Receiver<()>) {
    loop {
        select! {
            Some(event) = rx.recv() => {
                handle_event(event).await;
            }
            _ = shutdown.recv() => {
                println!("Shutting down");
                break;
            }
        }
    }
}
```

#### Timeout

```rust
use tokio::time::{timeout, Duration};

async fn with_timeout() -> Result<Data, Error> {
    match timeout(Duration::from_secs(5), fetch_data()).await {
        Ok(Ok(data)) => Ok(data),
        Ok(Err(e)) => Err(e),
        Err(_) => Err(Error::Timeout),
    }
}
```

#### Rate Limiting

```rust
use tokio::time::{interval, Duration};

async fn rate_limited_requests(urls: Vec<String>) {
    let mut interval = interval(Duration::from_millis(100));  // 10/sec

    for url in urls {
        interval.tick().await;
        tokio::spawn(async move {
            fetch(&url).await
        });
    }
}
```

#### Buffered Streams

```rust
use futures::stream::{self, StreamExt};

async fn process_many(items: Vec<Item>) {
    stream::iter(items)
        .map(|item| async move { process(item).await })
        .buffer_unordered(10)  // Up to 10 concurrent
        .for_each(|result| async {
            handle_result(result);
        })
        .await;
}
```

### Step 5: Channels

```rust
use tokio::sync::{mpsc, oneshot, broadcast, watch};

// mpsc: Multiple producers, single consumer
let (tx, mut rx) = mpsc::channel(100);
tx.send(value).await?;
let received = rx.recv().await;

// oneshot: Single value
let (tx, rx) = oneshot::channel();
tx.send(value)?;  // No await, can only fail if rx dropped
let received = rx.await?;

// broadcast: Multiple consumers, all get all messages
let (tx, mut rx1) = broadcast::channel(100);
let mut rx2 = tx.subscribe();
tx.send(value)?;
// Both rx1 and rx2 receive value

// watch: Latest value, multiple consumers
let (tx, mut rx) = watch::channel(initial_value);
tx.send(new_value)?;
let value = rx.borrow().clone();
```

### Step 6: Cancellation Safety

```rust
// Cancellation-safe: Can be cancelled without losing data
async fn cancellation_safe(rx: &mut Receiver<Item>) {
    // recv() is cancellation-safe
    if let Some(item) = rx.recv().await {
        process(item);
    }
}

// NOT cancellation-safe: May lose data
async fn not_cancellation_safe(reader: &mut AsyncRead) {
    let mut buf = [0u8; 1024];
    // If cancelled during read, partial data is lost!
    reader.read(&mut buf).await?;
}

// Make cancellation-safe with buffering
struct BufferedReader {
    reader: AsyncRead,
    buffer: Vec<u8>,
}

impl BufferedReader {
    async fn read(&mut self) -> Result<&[u8], Error> {
        if self.buffer.is_empty() {
            // Only read if buffer empty
            self.reader.read_buf(&mut self.buffer).await?;
        }
        Ok(&self.buffer)
    }
}
```

### Step 7: Async Traits

```rust
// Using async-trait crate
use async_trait::async_trait;

#[async_trait]
trait AsyncDatabase {
    async fn get(&self, key: &str) -> Option<Value>;
    async fn set(&self, key: &str, value: Value) -> Result<(), Error>;
}

#[async_trait]
impl AsyncDatabase for MyDb {
    async fn get(&self, key: &str) -> Option<Value> {
        self.inner.get(key).await
    }

    async fn set(&self, key: &str, value: Value) -> Result<(), Error> {
        self.inner.set(key, value).await
    }
}

// Native async traits (Rust 1.75+)
trait AsyncRead {
    async fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize>;
}
```

---

## Common Pitfalls

### Blocking in Async

```rust
// WRONG: Blocks the runtime
async fn bad() {
    std::thread::sleep(Duration::from_secs(1));  // Blocks!
    std::fs::read_to_string("file.txt");  // Blocks!
}

// CORRECT: Use async equivalents
async fn good() {
    tokio::time::sleep(Duration::from_secs(1)).await;
    tokio::fs::read_to_string("file.txt").await?;
}

// For unavoidable blocking
async fn with_blocking() {
    tokio::task::spawn_blocking(|| {
        blocking_operation()
    }).await?;
}
```

### Holding Lock Across Await

```rust
// WRONG: Holds mutex across await
async fn bad(mutex: &Mutex<Data>) {
    let guard = mutex.lock().await;
    async_operation().await;  // Guard held during await!
    guard.update();
}

// CORRECT: Release before await
async fn good(mutex: &Mutex<Data>) {
    let data = {
        let guard = mutex.lock().await;
        guard.clone()
    };  // Guard released
    async_operation().await;
    // Re-acquire if needed
}
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Pattern code | stdout | Implementation example |
| Analysis | stdout | Trade-offs and considerations |

---

## Output Template

```markdown
## Async Pattern Recommendation

### Use Case
[Description]

### Pattern
[Pattern name]

### Implementation
```rust
[code]
```

### Cancellation Safety
[Is it cancellation-safe? How to handle?]

### Error Handling
[How errors are propagated]

### Performance Notes
- Concurrency level: [X]
- Backpressure: [How handled]
```
