# wasm-bindgen Complete Guide

Complete patterns for using wasm-bindgen to create Rust WebAssembly bindings with JavaScript interop.

## Overview

wasm-bindgen facilitates high-level interactions between Rust WebAssembly modules and JavaScript, providing:
- Automatic type conversions between Rust and JS types
- Export Rust functions and structs to JavaScript
- Import JavaScript functions and types into Rust
- Integration with web-sys and js-sys for browser APIs

## #[wasm_bindgen] Attributes

### Basic Function Export

```rust
use wasm_bindgen::prelude::*;

// Export a simple function
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

// Export with renamed JS function
#[wasm_bindgen(js_name = calculateSum)]
pub fn calculate_sum(a: i32, b: i32) -> i32 {
    a + b
}

// Skip TypeScript generation for internal functions
#[wasm_bindgen(skip_typescript)]
pub fn internal_helper() -> u32 {
    42
}
```

### Advanced Function Attributes

```rust
// Catch and return Result as JS exception
#[wasm_bindgen]
pub fn parse_number(s: &str) -> Result<i32, JsValue> {
    s.parse::<i32>()
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

// Variadic arguments using js-sys
#[wasm_bindgen]
pub fn sum_all(values: &js_sys::Array) -> f64 {
    let mut sum = 0.0;
    for i in 0..values.length() {
        if let Some(val) = values.get(i).as_f64() {
            sum += val;
        }
    }
    sum
}

// Constructor pattern
#[wasm_bindgen(constructor)]
pub fn new(initial_value: i32) -> MyStruct {
    MyStruct { value: initial_value }
}
```

## Type Conversions

### Primitive Types

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct TypeExamples;

#[wasm_bindgen]
impl TypeExamples {
    // Numbers: i8, i16, i32, u8, u16, u32, f32, f64
    pub fn add_numbers(a: i32, b: i32) -> i32 {
        a + b
    }

    // Boolean
    pub fn is_even(n: i32) -> bool {
        n % 2 == 0
    }

    // String references (borrowed)
    pub fn string_length(s: &str) -> usize {
        s.len()
    }

    // Owned String (returns to JS)
    pub fn to_uppercase(s: String) -> String {
        s.to_uppercase()
    }
}
```

### Complex Types

```rust
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

// Using JsValue for any JS type
#[wasm_bindgen]
pub fn process_value(val: JsValue) -> JsValue {
    // Check type
    if val.is_string() {
        JsValue::from_str("Got a string")
    } else if val.is_object() {
        JsValue::from_str("Got an object")
    } else {
        val
    }
}

// Using serde for complex objects
#[derive(Serialize, Deserialize)]
pub struct User {
    pub name: String,
    pub age: u32,
    pub email: String,
}

#[wasm_bindgen]
pub fn create_user(name: String, age: u32, email: String) -> JsValue {
    let user = User { name, age, email };
    serde_wasm_bindgen::to_value(&user).unwrap()
}

#[wasm_bindgen]
pub fn parse_user(js_user: JsValue) -> Result<String, JsValue> {
    let user: User = serde_wasm_bindgen::from_value(js_user)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    Ok(user.name)
}

// Arrays using js-sys
#[wasm_bindgen]
pub fn sum_array(arr: &js_sys::Array) -> f64 {
    arr.iter()
        .filter_map(|v| v.as_f64())
        .sum()
}

// Return arrays
#[wasm_bindgen]
pub fn create_array() -> js_sys::Array {
    let arr = js_sys::Array::new();
    arr.push(&JsValue::from(1));
    arr.push(&JsValue::from(2));
    arr.push(&JsValue::from(3));
    arr
}
```

### Option and Result

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct OptionExample;

#[wasm_bindgen]
impl OptionExample {
    // Option<T> becomes nullable in JS
    pub fn find_value(search: bool) -> Option<String> {
        if search {
            Some("Found!".to_string())
        } else {
            None
        }
    }

    // Result for error handling
    pub fn divide(a: f64, b: f64) -> Result<f64, JsValue> {
        if b == 0.0 {
            Err(JsValue::from_str("Division by zero"))
        } else {
            Ok(a / b)
        }
    }

    // Custom error types
    pub fn validate_email(email: &str) -> Result<(), String> {
        if email.contains('@') {
            Ok(())
        } else {
            Err("Invalid email format".to_string())
        }
    }
}
```

## Struct Exports

### Basic Struct Export

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Counter {
    value: i32,
}

#[wasm_bindgen]
impl Counter {
    // Constructor
    #[wasm_bindgen(constructor)]
    pub fn new(initial: i32) -> Counter {
        Counter { value: initial }
    }

    // Alternative constructor
    pub fn default() -> Counter {
        Counter { value: 0 }
    }

    // Getter
    #[wasm_bindgen(getter)]
    pub fn value(&self) -> i32 {
        self.value
    }

    // Setter
    #[wasm_bindgen(setter)]
    pub fn set_value(&mut self, val: i32) {
        self.value = val;
    }

    // Methods
    pub fn increment(&mut self) {
        self.value += 1;
    }

    pub fn add(&mut self, amount: i32) {
        self.value += amount;
    }

    pub fn reset(&mut self) {
        self.value = 0;
    }
}
```

### Struct with Public Fields

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[wasm_bindgen]
impl Point {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f64, y: f64) -> Point {
        Point { x, y }
    }

    pub fn distance(&self, other: &Point) -> f64 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        (dx * dx + dy * dy).sqrt()
    }
}

// For non-public fields, use getters/setters
#[wasm_bindgen]
pub struct Rectangle {
    width: f64,
    height: f64,
}

#[wasm_bindgen]
impl Rectangle {
    #[wasm_bindgen(constructor)]
    pub fn new(width: f64, height: f64) -> Rectangle {
        Rectangle { width, height }
    }

    #[wasm_bindgen(getter)]
    pub fn width(&self) -> f64 {
        self.width
    }

    #[wasm_bindgen(getter)]
    pub fn height(&self) -> f64 {
        self.height
    }

    pub fn area(&self) -> f64 {
        self.width * self.height
    }
}
```

### Struct with Lifetimes and Generic Methods

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct DataProcessor {
    data: Vec<f64>,
}

#[wasm_bindgen]
impl DataProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> DataProcessor {
        DataProcessor { data: Vec::new() }
    }

    pub fn add_value(&mut self, value: f64) {
        self.data.push(value);
    }

    pub fn clear(&mut self) {
        self.data.clear();
    }

    pub fn average(&self) -> Option<f64> {
        if self.data.is_empty() {
            None
        } else {
            Some(self.data.iter().sum::<f64>() / self.data.len() as f64)
        }
    }

    pub fn to_array(&self) -> js_sys::Float64Array {
        js_sys::Float64Array::from(&self.data[..])
    }
}
```

## Async Functions

### Basic Async Export

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, RequestMode, Response};

#[wasm_bindgen]
pub async fn fetch_data(url: String) -> Result<JsValue, JsValue> {
    let mut opts = RequestInit::new();
    opts.method("GET");
    opts.mode(RequestMode::Cors);

    let request = Request::new_with_str_and_init(&url, &opts)?;

    let window = web_sys::window().unwrap();
    let resp_value = JsFuture::from(window.fetch_with_request(&request)).await?;

    let resp: Response = resp_value.dyn_into()?;
    let json = JsFuture::from(resp.json()?).await?;

    Ok(json)
}

// Async with delay
#[wasm_bindgen]
pub async fn sleep_and_return(ms: i32, value: String) -> String {
    use wasm_bindgen_futures::JsFuture;
    use web_sys::window;

    let promise = js_sys::Promise::new(&mut |resolve, _| {
        let window = window().unwrap();
        window
            .set_timeout_with_callback_and_timeout_and_arguments_0(&resolve, ms)
            .unwrap();
    });

    JsFuture::from(promise).await.unwrap();
    format!("Delayed: {}", value)
}
```

### Async with Channels and Streams

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::spawn_local;
use futures::channel::mpsc;
use futures::StreamExt;

#[wasm_bindgen]
pub struct AsyncProcessor {
    sender: Option<mpsc::UnboundedSender<String>>,
}

#[wasm_bindgen]
impl AsyncProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> AsyncProcessor {
        AsyncProcessor { sender: None }
    }

    pub fn start(&mut self, callback: js_sys::Function) {
        let (tx, mut rx) = mpsc::unbounded();
        self.sender = Some(tx);

        spawn_local(async move {
            while let Some(msg) = rx.next().await {
                let this = JsValue::null();
                let _ = callback.call1(&this, &JsValue::from_str(&msg));
            }
        });
    }

    pub fn send_message(&self, msg: String) {
        if let Some(sender) = &self.sender {
            let _ = sender.unbounded_send(msg);
        }
    }
}
```

## Web-sys Integration

### DOM Manipulation

```rust
use wasm_bindgen::prelude::*;
use web_sys::{Document, Element, HtmlElement, Window};

#[wasm_bindgen]
pub struct DomHelper;

#[wasm_bindgen]
impl DomHelper {
    pub fn get_window() -> Result<Window, JsValue> {
        web_sys::window().ok_or_else(|| JsValue::from_str("No window"))
    }

    pub fn get_document() -> Result<Document, JsValue> {
        Self::get_window()?
            .document()
            .ok_or_else(|| JsValue::from_str("No document"))
    }

    pub fn create_element(tag: &str) -> Result<Element, JsValue> {
        Self::get_document()?.create_element(tag)
    }

    pub fn append_child(parent_id: &str, child_tag: &str) -> Result<(), JsValue> {
        let document = Self::get_document()?;
        let parent = document
            .get_element_by_id(parent_id)
            .ok_or_else(|| JsValue::from_str("Parent not found"))?;

        let child = document.create_element(child_tag)?;
        parent.append_child(&child)?;
        Ok(())
    }

    pub fn set_inner_html(element_id: &str, html: &str) -> Result<(), JsValue> {
        let document = Self::get_document()?;
        let element = document
            .get_element_by_id(element_id)
            .ok_or_else(|| JsValue::from_str("Element not found"))?;

        element.set_inner_html(html);
        Ok(())
    }
}
```

### Event Handling

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{EventTarget, HtmlElement};

#[wasm_bindgen]
pub fn setup_click_handler(element_id: &str) -> Result<(), JsValue> {
    let document = web_sys::window()
        .unwrap()
        .document()
        .unwrap();

    let element = document
        .get_element_by_id(element_id)
        .ok_or_else(|| JsValue::from_str("Element not found"))?;

    let closure = Closure::wrap(Box::new(move |event: web_sys::MouseEvent| {
        web_sys::console::log_1(&JsValue::from_str("Clicked!"));
        event.prevent_default();
    }) as Box<dyn FnMut(_)>);

    element
        .add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())?;

    closure.forget(); // Keep closure alive
    Ok(())
}

// Better pattern: Store closure in struct
#[wasm_bindgen]
pub struct ClickHandler {
    closure: Closure<dyn FnMut(web_sys::MouseEvent)>,
}

#[wasm_bindgen]
impl ClickHandler {
    #[wasm_bindgen(constructor)]
    pub fn new(element_id: String, callback: js_sys::Function) -> Result<ClickHandler, JsValue> {
        let document = web_sys::window()
            .unwrap()
            .document()
            .unwrap();

        let element = document
            .get_element_by_id(&element_id)
            .ok_or_else(|| JsValue::from_str("Element not found"))?;

        let closure = Closure::wrap(Box::new(move |event: web_sys::MouseEvent| {
            let this = JsValue::null();
            let _ = callback.call1(&this, &event);
        }) as Box<dyn FnMut(_)>);

        element
            .add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())?;

        Ok(ClickHandler { closure })
    }
}
```

### Canvas API

```rust
use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub struct Canvas {
    canvas: HtmlCanvasElement,
    context: CanvasRenderingContext2d,
}

#[wasm_bindgen]
impl Canvas {
    #[wasm_bindgen(constructor)]
    pub fn new(canvas_id: &str) -> Result<Canvas, JsValue> {
        let document = web_sys::window()
            .unwrap()
            .document()
            .unwrap();

        let canvas = document
            .get_element_by_id(canvas_id)
            .ok_or_else(|| JsValue::from_str("Canvas not found"))?
            .dyn_into::<HtmlCanvasElement>()?;

        let context = canvas
            .get_context("2d")?
            .ok_or_else(|| JsValue::from_str("Failed to get 2d context"))?
            .dyn_into::<CanvasRenderingContext2d>()?;

        Ok(Canvas { canvas, context })
    }

    pub fn draw_circle(&self, x: f64, y: f64, radius: f64, color: &str) {
        self.context.begin_path();
        self.context
            .arc(x, y, radius, 0.0, 2.0 * std::f64::consts::PI)
            .unwrap();
        self.context.set_fill_style(&JsValue::from_str(color));
        self.context.fill();
    }

    pub fn clear(&self) {
        let width = self.canvas.width() as f64;
        let height = self.canvas.height() as f64;
        self.context.clear_rect(0.0, 0.0, width, height);
    }
}
```

## js-sys Usage

### Working with JavaScript Objects

```rust
use wasm_bindgen::prelude::*;
use js_sys::{Array, Object, Reflect, Date, Math};

#[wasm_bindgen]
pub struct JsInterop;

#[wasm_bindgen]
impl JsInterop {
    // Create JavaScript objects
    pub fn create_object() -> Object {
        let obj = Object::new();
        Reflect::set(&obj, &"name".into(), &"Rust".into()).unwrap();
        Reflect::set(&obj, &"version".into(), &1.0.into()).unwrap();
        obj
    }

    // Read from JavaScript objects
    pub fn read_property(obj: &Object, key: &str) -> JsValue {
        Reflect::get(obj, &JsValue::from_str(key)).unwrap_or(JsValue::undefined())
    }

    // Work with arrays
    pub fn filter_even_numbers(arr: &Array) -> Array {
        let result = Array::new();
        for i in 0..arr.length() {
            if let Some(num) = arr.get(i).as_f64() {
                if num as i32 % 2 == 0 {
                    result.push(&JsValue::from(num));
                }
            }
        }
        result
    }

    // Use JavaScript Math
    pub fn random_in_range(min: f64, max: f64) -> f64 {
        min + Math::random() * (max - min)
    }

    // Use JavaScript Date
    pub fn current_timestamp() -> f64 {
        Date::now()
    }

    // Format date
    pub fn format_date() -> String {
        let date = Date::new_0();
        date.to_locale_string("en-US", &JsValue::undefined())
            .as_string()
            .unwrap()
    }
}
```

### Working with Promises

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use js_sys::Promise;

#[wasm_bindgen]
pub fn create_delayed_promise(ms: i32, value: String) -> Promise {
    Promise::new(&mut |resolve, _reject| {
        let window = web_sys::window().unwrap();
        let resolve_clone = resolve.clone();
        let value_clone = value.clone();

        let closure = Closure::once(move || {
            resolve_clone.call1(&JsValue::null(), &JsValue::from_str(&value_clone)).unwrap();
        });

        window
            .set_timeout_with_callback_and_timeout_and_arguments_0(
                closure.as_ref().unchecked_ref(),
                ms,
            )
            .unwrap();

        closure.forget();
    })
}

#[wasm_bindgen]
pub async fn chain_promises(p1: Promise, p2: Promise) -> Result<JsValue, JsValue> {
    let result1 = JsFuture::from(p1).await?;
    let result2 = JsFuture::from(p2).await?;

    let arr = js_sys::Array::new();
    arr.push(&result1);
    arr.push(&result2);

    Ok(arr.into())
}
```

## Best Practices

### Error Handling Pattern

```rust
use wasm_bindgen::prelude::*;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Network error: {0}")]
    Network(String),
}

impl From<AppError> for JsValue {
    fn from(err: AppError) -> JsValue {
        JsValue::from_str(&err.to_string())
    }
}

#[wasm_bindgen]
pub fn validated_operation(input: &str) -> Result<String, JsValue> {
    if input.is_empty() {
        return Err(AppError::InvalidInput("Input cannot be empty".to_string()).into());
    }

    Ok(format!("Processed: {}", input))
}
```

### Memory Management

```rust
use wasm_bindgen::prelude::*;

// Use Vec for large data
#[wasm_bindgen]
pub struct LargeDataProcessor {
    buffer: Vec<u8>,
}

#[wasm_bindgen]
impl LargeDataProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(size: usize) -> LargeDataProcessor {
        LargeDataProcessor {
            buffer: vec![0; size],
        }
    }

    // Expose buffer as typed array (zero-copy)
    pub fn get_buffer(&self) -> js_sys::Uint8Array {
        unsafe {
            js_sys::Uint8Array::view(&self.buffer)
        }
    }

    // Take ownership and free memory
    pub fn consume(self) -> usize {
        self.buffer.len()
    }
}
```

### Performance Tips

```rust
// 1. Use &str for read-only strings
#[wasm_bindgen]
pub fn process_string(s: &str) -> usize {
    s.len() // No allocation
}

// 2. Use references for large structs
#[wasm_bindgen]
pub fn compare_points(p1: &Point, p2: &Point) -> bool {
    p1.x == p2.x && p1.y == p2.y
}

// 3. Batch operations
#[wasm_bindgen]
pub fn batch_process(items: &js_sys::Array) -> js_sys::Array {
    // Process all items in one call instead of multiple JS->Rust calls
    items
        .iter()
        .map(|item| {
            // Process item
            JsValue::from(item.as_f64().unwrap() * 2.0)
        })
        .collect()
}

// 4. Use typed arrays for numeric data
#[wasm_bindgen]
pub fn sum_typed_array(arr: &js_sys::Float64Array) -> f64 {
    let vec = arr.to_vec();
    vec.iter().sum()
}
```

## Common Patterns

### Singleton Pattern

```rust
use wasm_bindgen::prelude::*;
use std::sync::Mutex;
use once_cell::sync::Lazy;

static GLOBAL_STATE: Lazy<Mutex<GlobalState>> = Lazy::new(|| {
    Mutex::new(GlobalState::new())
});

struct GlobalState {
    counter: i32,
}

impl GlobalState {
    fn new() -> Self {
        GlobalState { counter: 0 }
    }
}

#[wasm_bindgen]
pub fn increment_global() -> i32 {
    let mut state = GLOBAL_STATE.lock().unwrap();
    state.counter += 1;
    state.counter
}

#[wasm_bindgen]
pub fn get_global_counter() -> i32 {
    GLOBAL_STATE.lock().unwrap().counter
}
```

### Builder Pattern

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Config {
    name: String,
    timeout: u32,
    retries: u32,
}

#[wasm_bindgen]
pub struct ConfigBuilder {
    name: Option<String>,
    timeout: u32,
    retries: u32,
}

#[wasm_bindgen]
impl ConfigBuilder {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ConfigBuilder {
        ConfigBuilder {
            name: None,
            timeout: 5000,
            retries: 3,
        }
    }

    pub fn name(mut self, name: String) -> ConfigBuilder {
        self.name = Some(name);
        self
    }

    pub fn timeout(mut self, timeout: u32) -> ConfigBuilder {
        self.timeout = timeout;
        self
    }

    pub fn retries(mut self, retries: u32) -> ConfigBuilder {
        self.retries = retries;
        self
    }

    pub fn build(self) -> Result<Config, JsValue> {
        let name = self.name.ok_or_else(|| JsValue::from_str("Name is required"))?;
        Ok(Config {
            name,
            timeout: self.timeout,
            retries: self.retries,
        })
    }
}
```

## Cargo.toml Configuration

```toml
[package]
name = "my-wasm-project"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
wasm-bindgen-futures = "0.4"
js-sys = "0.3"
web-sys = { version = "0.3", features = [
    "console",
    "Window",
    "Document",
    "Element",
    "HtmlElement",
    "CanvasRenderingContext2d",
    "HtmlCanvasElement",
    "MouseEvent",
    "Request",
    "RequestInit",
    "RequestMode",
    "Response",
] }
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"
serde_json = "1.0"
thiserror = "1.0"
once_cell = "1.19"
futures = "0.3"

[dev-dependencies]
wasm-bindgen-test = "0.3"

[profile.release]
opt-level = "s"  # Optimize for size
lto = true       # Link-time optimization
```

## Related Skills
- /Users/louisherman/ClaudeCodeProjects/.claude/skills/wasm/rust-wasm/wasm-pack-workflow.md
- /Users/louisherman/ClaudeCodeProjects/.claude/skills/wasm/rust-wasm/rust-wasm-debugging.md
