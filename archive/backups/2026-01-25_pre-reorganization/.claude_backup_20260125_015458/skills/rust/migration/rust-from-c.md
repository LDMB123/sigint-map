# Skill: C/C++ to Rust Migration

**ID**: `rust-from-c`
**Category**: Migration
**Agent**: Rust Migration Engineer

---

## When to Use

- Porting C/C++ code to safe Rust
- Creating safe wrappers around C libraries
- Replacing manual memory management with RAII

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| c_code | string | Yes | C/C++ code to migrate |
| approach | string | No | rewrite, bindgen, or wrapper |

---

## Type Mappings

| C/C++ | Rust | Notes |
|-------|------|-------|
| `int` | `i32` | |
| `unsigned int` | `u32` | |
| `long` | `i64` | Platform-dependent in C |
| `size_t` | `usize` | |
| `char` | `i8` or `u8` | |
| `char*` | `*const c_char`, `CString`, `&str` | |
| `void*` | `*mut c_void` | |
| `T*` | `*mut T`, `&mut T`, `Box<T>` | |
| `const T*` | `*const T`, `&T` | |
| `T[]` | `[T; N]`, `Vec<T>`, `&[T]` | |
| `nullptr` / `NULL` | `std::ptr::null()`, `None` | |
| `struct` | `struct` | |
| `union` | `union` (unsafe) | |
| `enum` | `enum` | C enums are integers |

---

## Pattern Translations

### Memory Allocation

```c
// C
int* arr = (int*)malloc(100 * sizeof(int));
if (arr == NULL) {
    return ERROR;
}
// ... use arr ...
free(arr);
```

```rust
// Rust - automatic memory management
let arr: Vec<i32> = Vec::with_capacity(100);
// ... use arr ...
// Automatically freed when arr goes out of scope

// Or for fixed-size array
let arr: Box<[i32; 100]> = Box::new([0; 100]);
```

### String Handling

```c
// C
char* str = malloc(256);
strcpy(str, "Hello");
strcat(str, " World");
printf("%s\n", str);
free(str);
```

```rust
// Rust
let mut str = String::from("Hello");
str.push_str(" World");
println!("{}", str);
// Automatically freed
```

### Error Handling

```c
// C
int read_file(const char* path, char** out_data, size_t* out_len) {
    FILE* f = fopen(path, "r");
    if (f == NULL) {
        return -1;
    }
    // ... read file ...
    fclose(f);
    return 0;
}

// Usage
char* data;
size_t len;
if (read_file("test.txt", &data, &len) < 0) {
    perror("Failed to read");
    return;
}
// ... use data ...
free(data);
```

```rust
// Rust
fn read_file(path: &str) -> Result<Vec<u8>, std::io::Error> {
    std::fs::read(path)
}

// Usage
match read_file("test.txt") {
    Ok(data) => {
        // ... use data ...
    }
    Err(e) => {
        eprintln!("Failed to read: {}", e);
    }
}
```

### Structs and Methods

```c
// C
typedef struct {
    int x;
    int y;
} Point;

Point* point_new(int x, int y) {
    Point* p = malloc(sizeof(Point));
    if (p) {
        p->x = x;
        p->y = y;
    }
    return p;
}

void point_free(Point* p) {
    free(p);
}

double point_distance(const Point* p1, const Point* p2) {
    int dx = p2->x - p1->x;
    int dy = p2->y - p1->y;
    return sqrt(dx*dx + dy*dy);
}
```

```rust
// Rust
#[derive(Debug, Clone, Copy)]
struct Point {
    x: i32,
    y: i32,
}

impl Point {
    fn new(x: i32, y: i32) -> Self {
        Self { x, y }
    }

    fn distance(&self, other: &Point) -> f64 {
        let dx = (other.x - self.x) as f64;
        let dy = (other.y - self.y) as f64;
        (dx * dx + dy * dy).sqrt()
    }
}
// No point_free needed - automatic cleanup
```

### Linked List

```c
// C
struct Node {
    int data;
    struct Node* next;
};

struct Node* list_prepend(struct Node* head, int data) {
    struct Node* new_node = malloc(sizeof(struct Node));
    new_node->data = data;
    new_node->next = head;
    return new_node;
}

void list_free(struct Node* head) {
    while (head) {
        struct Node* next = head->next;
        free(head);
        head = next;
    }
}
```

```rust
// Rust - using Box for ownership
struct Node {
    data: i32,
    next: Option<Box<Node>>,
}

impl Node {
    fn prepend(head: Option<Box<Node>>, data: i32) -> Box<Node> {
        Box::new(Node { data, next: head })
    }
}
// Automatic recursive cleanup via Drop

// Or just use Vec<T> or VecDeque<T> for most cases!
let list = vec![1, 2, 3, 4, 5];
```

### Function Pointers / Callbacks

```c
// C
typedef int (*Comparator)(const void*, const void*);

void sort(void* arr, size_t len, size_t elem_size, Comparator cmp) {
    qsort(arr, len, elem_size, cmp);
}
```

```rust
// Rust - use generics and Fn traits
fn sort<T, F>(arr: &mut [T], compare: F)
where
    F: Fn(&T, &T) -> std::cmp::Ordering,
{
    arr.sort_by(compare);
}

// Usage
let mut numbers = vec![3, 1, 4, 1, 5];
sort(&mut numbers, |a, b| a.cmp(b));
```

---

## bindgen for FFI

```toml
# Cargo.toml
[build-dependencies]
bindgen = "0.69"

[dependencies]
libc = "0.2"
```

```rust
// build.rs
fn main() {
    println!("cargo:rerun-if-changed=wrapper.h");

    let bindings = bindgen::Builder::default()
        .header("wrapper.h")
        .parse_callbacks(Box::new(bindgen::CargoCallbacks::new()))
        .generate()
        .expect("Unable to generate bindings");

    let out_path = std::path::PathBuf::from(std::env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("Couldn't write bindings!");
}
```

```rust
// src/lib.rs
#![allow(non_upper_case_globals)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]

include!(concat!(env!("OUT_DIR"), "/bindings.rs"));

// Safe wrapper
pub fn safe_function(input: &str) -> Result<String, Error> {
    let c_str = std::ffi::CString::new(input)?;

    let result = unsafe {
        // SAFETY: c_str is valid, null-terminated
        c_function(c_str.as_ptr())
    };

    // Convert result back to Rust string
    // ...
}
```

---

## Safety Patterns

### Replacing Raw Pointers

```c
// C - manual null checks
void process(int* data, size_t len) {
    if (data == NULL || len == 0) return;
    for (size_t i = 0; i < len; i++) {
        data[i] *= 2;
    }
}
```

```rust
// Rust - type system prevents null
fn process(data: &mut [i32]) {
    for item in data.iter_mut() {
        *item *= 2;
    }
}
```

### Replacing goto Error Handling

```c
// C
int process(const char* path) {
    int ret = -1;
    FILE* f = NULL;
    char* buf = NULL;

    f = fopen(path, "r");
    if (!f) goto cleanup;

    buf = malloc(1024);
    if (!buf) goto cleanup;

    // ... process ...
    ret = 0;

cleanup:
    if (buf) free(buf);
    if (f) fclose(f);
    return ret;
}
```

```rust
// Rust - RAII and ? operator
fn process(path: &str) -> Result<(), Error> {
    let f = File::open(path)?;
    let buf = vec![0u8; 1024];

    // ... process ...

    Ok(())
    // f and buf automatically cleaned up
}
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Rust code | ./ | Safe implementation |
| FFI bindings | bindings.rs | If using bindgen |

---

## Output Template

```markdown
## Migration Report: C to Rust

### Original C
```c
[c code]
```

### Migrated Rust
```rust
[rust code]
```

### Safety Improvements
- Manual memory management → RAII
- Null pointers → Option<T>
- Error codes → Result<T, E>

### Testing
```bash
cargo test
```
```
