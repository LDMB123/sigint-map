# Skill: Tokio Runtime Patterns

**ID**: `tokio-patterns`
**Category**: Ecosystem
**Agent**: Rust Async Specialist

---

## When to Use

- Building async applications with Tokio
- Managing concurrent tasks
- Implementing graceful shutdown
- Using Tokio channels and synchronization

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| pattern | string | No | Specific pattern needed |
| use_case | string | No | What you're building |

---

## Steps

### Step 1: Runtime Setup

```toml
# Cargo.toml
[dependencies]
tokio = { version = "1", features = ["full"] }
# Or minimal:
tokio = { version = "1", features = ["rt", "macros"] }
```

```rust
// Multi-threaded runtime (default)
#[tokio::main]
async fn main() {
    // Your async code
}

// Single-threaded runtime
#[tokio::main(flavor = "current_thread")]
async fn main() {
    // Single-threaded async code
}

// Custom runtime configuration
#[tokio::main(worker_threads = 4)]
async fn main() {
    // 4 worker threads
}

// Manual runtime setup
fn main() {
    let rt = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(4)
        .enable_all()
        .build()
        .unwrap();

    rt.block_on(async {
        // Your async code
    });
}
```

### Step 2: Task Spawning

```rust
use tokio::task;

// Spawn async task
let handle = task::spawn(async {
    // Runs on thread pool
    expensive_async_operation().await
});
let result = handle.await?;

// Spawn blocking task (for CPU-bound or sync I/O)
let result = task::spawn_blocking(|| {
    // Runs on dedicated blocking thread pool
    compute_hash(data)
}).await?;

// Spawn local (for !Send futures)
let local = task::LocalSet::new();
local.run_until(async {
    task::spawn_local(async {
        // Can use non-Send types
    }).await
}).await;
```

### Step 3: JoinSet for Structured Concurrency

```rust
use tokio::task::JoinSet;

async fn process_all(items: Vec<Item>) -> Vec<Result<Output, Error>> {
    let mut set = JoinSet::new();

    // Spawn all tasks
    for item in items {
        set.spawn(async move {
            process_item(item).await
        });
    }

    // Collect results as they complete
    let mut results = Vec::new();
    while let Some(res) = set.join_next().await {
        match res {
            Ok(output) => results.push(Ok(output)),
            Err(e) => results.push(Err(e.into())),
        }
    }

    results
}

// Abort all on first error
async fn process_all_or_fail(items: Vec<Item>) -> Result<Vec<Output>, Error> {
    let mut set = JoinSet::new();

    for item in items {
        set.spawn(async move { process_item(item).await });
    }

    let mut results = Vec::new();
    while let Some(res) = set.join_next().await {
        match res? {
            Ok(output) => results.push(output),
            Err(e) => {
                set.abort_all();  // Cancel remaining tasks
                return Err(e);
            }
        }
    }

    Ok(results)
}
```

### Step 4: Channels

```rust
use tokio::sync::{mpsc, oneshot, broadcast, watch};

// mpsc: Multiple producer, single consumer
async fn mpsc_example() {
    let (tx, mut rx) = mpsc::channel(100);  // Buffered

    // Producer
    tokio::spawn(async move {
        for i in 0..10 {
            tx.send(i).await.unwrap();
        }
    });

    // Consumer
    while let Some(value) = rx.recv().await {
        println!("Received: {}", value);
    }
}

// oneshot: Single value
async fn oneshot_example() {
    let (tx, rx) = oneshot::channel();

    tokio::spawn(async move {
        let result = compute().await;
        tx.send(result).unwrap();
    });

    let value = rx.await.unwrap();
}

// broadcast: All consumers get all messages
async fn broadcast_example() {
    let (tx, _) = broadcast::channel(16);
    let mut rx1 = tx.subscribe();
    let mut rx2 = tx.subscribe();

    tx.send("message").unwrap();

    // Both receivers get the message
    assert_eq!(rx1.recv().await.unwrap(), "message");
    assert_eq!(rx2.recv().await.unwrap(), "message");
}

// watch: Latest value
async fn watch_example() {
    let (tx, mut rx) = watch::channel("initial");

    tx.send("updated").unwrap();

    // Always gets latest value
    assert_eq!(*rx.borrow(), "updated");

    // Wait for changes
    rx.changed().await.unwrap();
}
```

### Step 5: Select

```rust
use tokio::select;

// First to complete wins
async fn first_response(urls: Vec<String>) -> Option<Response> {
    let mut handles = Vec::new();
    for url in urls {
        handles.push(tokio::spawn(async move {
            fetch(&url).await
        }));
    }

    // Race all requests
    loop {
        select! {
            result = handles[0] => return result.ok()?.ok(),
            result = handles[1] => return result.ok()?.ok(),
            // ... or use JoinSet instead
        }
    }
}

// With timeout
async fn with_timeout() -> Result<Data, Error> {
    select! {
        result = fetch_data() => result,
        _ = tokio::time::sleep(Duration::from_secs(10)) => {
            Err(Error::Timeout)
        }
    }
}

// Event loop with shutdown
async fn event_loop(
    mut rx: mpsc::Receiver<Event>,
    mut shutdown: watch::Receiver<bool>,
) {
    loop {
        select! {
            Some(event) = rx.recv() => {
                handle_event(event).await;
            }
            _ = shutdown.changed() => {
                if *shutdown.borrow() {
                    break;
                }
            }
        }
    }
}
```

### Step 6: Graceful Shutdown

```rust
use tokio::signal;
use tokio::sync::watch;

async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create shutdown signal
    let (shutdown_tx, shutdown_rx) = watch::channel(false);

    // Spawn workers
    let worker1 = tokio::spawn(worker(shutdown_rx.clone()));
    let worker2 = tokio::spawn(worker(shutdown_rx.clone()));

    // Wait for Ctrl+C
    signal::ctrl_c().await?;
    println!("Shutting down...");

    // Signal shutdown
    shutdown_tx.send(true)?;

    // Wait for workers to finish
    let _ = tokio::join!(worker1, worker2);
    println!("Shutdown complete");

    Ok(())
}

async fn worker(mut shutdown: watch::Receiver<bool>) {
    loop {
        tokio::select! {
            _ = shutdown.changed() => {
                if *shutdown.borrow() {
                    println!("Worker shutting down");
                    // Cleanup
                    break;
                }
            }
            _ = do_work() => {
                // Continue working
            }
        }
    }
}
```

### Step 7: Synchronization

```rust
use tokio::sync::{Mutex, RwLock, Semaphore, Barrier};

// Mutex (async-aware)
async fn mutex_example() {
    let data = Arc::new(Mutex::new(vec![]));

    let data_clone = data.clone();
    tokio::spawn(async move {
        let mut guard = data_clone.lock().await;
        guard.push(1);
    });
}

// RwLock
async fn rwlock_example() {
    let data = Arc::new(RwLock::new(vec![]));

    // Multiple readers
    let read_guard = data.read().await;

    // Exclusive writer
    let mut write_guard = data.write().await;
    write_guard.push(1);
}

// Semaphore (limit concurrency)
async fn semaphore_example() {
    let sem = Arc::new(Semaphore::new(10));  // Max 10 concurrent

    for task in tasks {
        let permit = sem.clone().acquire_owned().await.unwrap();
        tokio::spawn(async move {
            do_work(task).await;
            drop(permit);  // Release semaphore
        });
    }
}
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Example code | stdout | Pattern implementation |

---

## Output Template

```markdown
## Tokio Pattern Implementation

### Pattern
[Pattern name]

### Code
```rust
[implementation]
```

### Considerations
- Cancellation: [How handled]
- Backpressure: [Channel sizing]
- Shutdown: [Graceful handling]

### Testing
```bash
cargo test
```
```
