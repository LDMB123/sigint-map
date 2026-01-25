# Dioxus Framework Setup and Patterns

## Overview

Dioxus is a portable, performant, and ergonomic framework for building cross-platform user interfaces in Rust. It supports web (WASM), desktop, mobile, and TUI applications with a single codebase.

## Platform Setup

### Web Setup

```bash
# Install dioxus CLI
cargo install dioxus-cli

# Create new web project
dx new my-app --template web
cd my-app

# Development server
dx serve

# Build for production
dx build --release
```

### Desktop Setup

```bash
# Create desktop project
dx new my-app --template desktop
cd my-app

# Run desktop app
dx serve --platform desktop

# Or use cargo directly
cargo run
```

### Mobile Setup

```bash
# Create mobile project
dx new my-app --template mobile
cd my-app

# Android
dx serve --platform android

# iOS
dx serve --platform ios
```

### Universal Project (All Platforms)

```bash
# Create universal project
dx new my-app --template fullstack
cd my-app
```

## Project Configuration

### Cargo.toml (Web)

```toml
[package]
name = "dioxus-app"
version = "0.1.0"
edition = "2021"

[dependencies]
dioxus = { version = "0.5", features = ["web"] }
dioxus-web = "0.5"

[profile.release]
opt-level = 'z'
lto = true
codegen-units = 1
```

### Cargo.toml (Desktop)

```toml
[package]
name = "dioxus-desktop-app"
version = "0.1.0"
edition = "2021"

[dependencies]
dioxus = { version = "0.5", features = ["desktop"] }
dioxus-desktop = "0.5"

[profile.release]
opt-level = 3
lto = true
```

### Cargo.toml (Universal)

```toml
[package]
name = "dioxus-universal"
version = "0.1.0"
edition = "2021"

[dependencies]
dioxus = "0.5"

[features]
default = []
web = ["dioxus/web"]
desktop = ["dioxus/desktop"]
mobile = ["dioxus/mobile"]

[[bin]]
name = "web"
required-features = ["web"]

[[bin]]
name = "desktop"
required-features = ["desktop"]
```

### Dioxus.toml

```toml
[application]
name = "My Dioxus App"
default_platform = "web"

[web.app]
title = "Dioxus App"
base_path = "/"

[web.watcher]
watch_path = ["src", "assets"]
index_on_404 = true

[web.resource]
style = ["assets/style.css"]
script = []

[web.proxy]
backend = "http://localhost:8000"
```

## Component Patterns

### Basic Component

```rust
use dioxus::prelude::*;

fn App() -> Element {
    rsx! {
        div {
            h1 { "Hello, World!" }
            p { "Welcome to Dioxus" }
        }
    }
}

fn main() {
    #[cfg(feature = "web")]
    dioxus_web::launch(App);

    #[cfg(feature = "desktop")]
    dioxus_desktop::launch(App);
}
```

### Component with Props

```rust
use dioxus::prelude::*;

#[component]
fn Greeting(name: String, message: Option<String>) -> Element {
    let msg = message.unwrap_or_else(|| "Hello".to_string());

    rsx! {
        div {
            h2 { "{msg}, {name}!" }
        }
    }
}

fn App() -> Element {
    rsx! {
        Greeting {
            name: "Alice".to_string(),
            message: Some("Welcome".to_string())
        }
    }
}
```

### Component with Children

```rust
use dioxus::prelude::*;

#[component]
fn Card(title: Option<String>, children: Element) -> Element {
    rsx! {
        div { class: "card",
            if let Some(title) = title {
                div { class: "card-header",
                    h3 { "{title}" }
                }
            }
            div { class: "card-body",
                {children}
            }
        }
    }
}

fn App() -> Element {
    rsx! {
        Card {
            title: Some("My Card".to_string()),
            p { "Card content goes here" }
            button { "Click me" }
        }
    }
}
```

### Generic Components

```rust
use dioxus::prelude::*;

#[component]
fn List<T: Clone + 'static>(
    items: Vec<T>,
    render_item: impl Fn(T) -> Element + 'static
) -> Element {
    rsx! {
        ul {
            for item in items {
                li { {render_item(item)} }
            }
        }
    }
}

fn App() -> Element {
    let items = vec!["Apple", "Banana", "Cherry"];

    rsx! {
        List {
            items: items.into_iter().map(|s| s.to_string()).collect(),
            render_item: |item: String| rsx! { span { "{item}" } }
        }
    }
}
```

## State Management

### use_signal (Local State)

```rust
use dioxus::prelude::*;

fn Counter() -> Element {
    let mut count = use_signal(|| 0);

    rsx! {
        div {
            p { "Count: {count}" }
            button {
                onclick: move |_| count += 1,
                "Increment"
            }
            button {
                onclick: move |_| count -= 1,
                "Decrement"
            }
            button {
                onclick: move |_| count.set(0),
                "Reset"
            }
        }
    }
}
```

### use_signal with Complex State

```rust
use dioxus::prelude::*;

#[derive(Clone, PartialEq)]
struct Todo {
    id: u32,
    title: String,
    completed: bool,
}

fn TodoList() -> Element {
    let mut todos = use_signal(|| vec![
        Todo { id: 1, title: "Learn Rust".to_string(), completed: false },
        Todo { id: 2, title: "Build with Dioxus".to_string(), completed: false },
    ]);

    let toggle_todo = move |id: u32| {
        todos.write().iter_mut()
            .find(|t| t.id == id)
            .map(|t| t.completed = !t.completed);
    };

    rsx! {
        ul {
            for todo in todos.read().iter() {
                li {
                    key: "{todo.id}",
                    class: if todo.completed { "completed" } else { "" },
                    onclick: move |_| toggle_todo(todo.id),
                    "{todo.title}"
                }
            }
        }
    }
}
```

### use_resource (Async Data)

```rust
use dioxus::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
struct User {
    id: u32,
    name: String,
}

async fn fetch_user(id: u32) -> Result<User, String> {
    // Simulate API call
    Ok(User {
        id,
        name: format!("User {}", id),
    })
}

fn UserProfile(user_id: u32) -> Element {
    let user = use_resource(move || async move {
        fetch_user(user_id).await
    });

    rsx! {
        div {
            match user.read().as_ref() {
                Some(Ok(user)) => rsx! {
                    div {
                        h2 { "{user.name}" }
                        p { "ID: {user.id}" }
                    }
                },
                Some(Err(e)) => rsx! {
                    p { class: "error", "Error: {e}" }
                },
                None => rsx! {
                    p { "Loading..." }
                }
            }
        }
    }
}
```

### use_context (Shared State)

```rust
use dioxus::prelude::*;

#[derive(Clone, Copy)]
struct AppState {
    user: Signal<Option<String>>,
    theme: Signal<Theme>,
}

#[derive(Clone, Copy, PartialEq)]
enum Theme {
    Light,
    Dark,
}

fn App() -> Element {
    let state = AppState {
        user: use_signal(|| None),
        theme: use_signal(|| Theme::Light),
    };

    use_context_provider(|| state);

    rsx! {
        div {
            Header {}
            MainContent {}
        }
    }
}

fn Header() -> Element {
    let mut state = use_context::<AppState>();

    let toggle_theme = move |_| {
        let current = state.theme.read();
        state.theme.set(match *current {
            Theme::Light => Theme::Dark,
            Theme::Dark => Theme::Light,
        });
    };

    rsx! {
        header {
            button {
                onclick: toggle_theme,
                "Toggle Theme"
            }
            if let Some(user) = state.user.read().as_ref() {
                span { "Welcome, {user}" }
            }
        }
    }
}

fn MainContent() -> Element {
    let state = use_context::<AppState>();
    let theme = state.theme.read();

    rsx! {
        main {
            class: match *theme {
                Theme::Light => "light",
                Theme::Dark => "dark",
            },
            p { "Main content here" }
        }
    }
}
```

### use_memo (Derived State)

```rust
use dioxus::prelude::*;

fn ComputedValues() -> Element {
    let mut count = use_signal(|| 0);

    // Memoized derived value
    let doubled = use_memo(move || count() * 2);
    let is_even = use_memo(move || count() % 2 == 0);

    rsx! {
        div {
            p { "Count: {count}" }
            p { "Doubled: {doubled}" }
            p { "Is Even: {if is_even() { \"Yes\" } else { \"No\" }}" }
            button {
                onclick: move |_| count += 1,
                "Increment"
            }
        }
    }
}
```

### use_effect (Side Effects)

```rust
use dioxus::prelude::*;

fn EffectExample() -> Element {
    let mut count = use_signal(|| 0);

    // Effect runs when dependencies change
    use_effect(move || {
        println!("Count changed to: {}", count());
    });

    // Effect with cleanup
    use_effect(move || {
        let interval = set_interval(move || {
            count += 1;
        }, std::time::Duration::from_secs(1));

        // Return cleanup function
        move || {
            interval.cancel();
        }
    });

    rsx! {
        div { "Count: {count}" }
    }
}
```

## Event Handling

### Basic Events

```rust
use dioxus::prelude::*;

fn EventExample() -> Element {
    let mut text = use_signal(String::new);
    let mut clicked = use_signal(|| false);

    rsx! {
        div {
            input {
                r#type: "text",
                value: "{text}",
                oninput: move |evt| text.set(evt.value().clone()),
            }
            button {
                onclick: move |_| clicked.set(true),
                "Click me"
            }
            if clicked() {
                p { "Button was clicked!" }
            }
            p { "You typed: {text}" }
        }
    }
}
```

### Form Handling

```rust
use dioxus::prelude::*;

fn ContactForm() -> Element {
    let mut name = use_signal(String::new);
    let mut email = use_signal(String::new);
    let mut errors = use_signal(Vec::new);
    let mut submitted = use_signal(|| false);

    let on_submit = move |evt: FormEvent| {
        evt.prevent_default();

        let mut errs = Vec::new();
        if name.read().is_empty() {
            errs.push("Name is required".to_string());
        }
        if !email.read().contains('@') {
            errs.push("Invalid email".to_string());
        }

        if errs.is_empty() {
            // Submit form
            submitted.set(true);
            errors.set(Vec::new());
        } else {
            errors.set(errs);
        }
    };

    rsx! {
        div {
            if submitted() {
                p { class: "success", "Form submitted successfully!" }
            }

            if !errors.read().is_empty() {
                ul { class: "errors",
                    for error in errors.read().iter() {
                        li { "{error}" }
                    }
                }
            }

            form {
                onsubmit: on_submit,
                div {
                    label { "Name:" }
                    input {
                        r#type: "text",
                        value: "{name}",
                        oninput: move |evt| name.set(evt.value().clone()),
                    }
                }
                div {
                    label { "Email:" }
                    input {
                        r#type: "email",
                        value: "{email}",
                        oninput: move |evt| email.set(evt.value().clone()),
                    }
                }
                button {
                    r#type: "submit",
                    "Submit"
                }
            }
        }
    }
}
```

## Routing (Web & Desktop)

### Basic Router

```rust
use dioxus::prelude::*;

#[derive(Clone, Routable, PartialEq)]
#[rustfmt::skip]
enum Route {
    #[route("/")]
    Home {},
    #[route("/about")]
    About {},
    #[route("/users/:id")]
    UserProfile { id: u32 },
}

fn App() -> Element {
    rsx! {
        Router::<Route> {}
    }
}

#[component]
fn Home() -> Element {
    rsx! {
        div {
            h1 { "Home Page" }
            Link { to: Route::About {}, "Go to About" }
        }
    }
}

#[component]
fn About() -> Element {
    rsx! {
        div {
            h1 { "About Page" }
            Link { to: Route::Home {}, "Go Home" }
        }
    }
}

#[component]
fn UserProfile(id: u32) -> Element {
    rsx! {
        div {
            h1 { "User Profile #{id}" }
            Link { to: Route::Home {}, "Go Home" }
        }
    }
}
```

### Nested Routes

```rust
use dioxus::prelude::*;

#[derive(Clone, Routable, PartialEq)]
#[rustfmt::skip]
enum Route {
    #[route("/")]
    Home {},

    #[nest("/dashboard")]
        #[route("/")]
        Dashboard {},
        #[route("/analytics")]
        Analytics {},
        #[route("/settings")]
        Settings {},
    #[end_nest]
}

#[component]
fn Dashboard() -> Element {
    rsx! {
        div { class: "dashboard",
            aside {
                nav {
                    Link { to: Route::Dashboard {}, "Home" }
                    Link { to: Route::Analytics {}, "Analytics" }
                    Link { to: Route::Settings {}, "Settings" }
                }
            }
            main {
                Outlet::<Route> {}
            }
        }
    }
}
```

## Platform-Specific Features

### Desktop Window Configuration

```rust
use dioxus::prelude::*;
use dioxus_desktop::{Config, WindowBuilder};

fn main() {
    dioxus_desktop::launch_cfg(
        App,
        Config::new()
            .with_window(
                WindowBuilder::new()
                    .with_title("My Dioxus App")
                    .with_resizable(true)
                    .with_inner_size(dioxus_desktop::LogicalSize::new(800, 600))
            )
    );
}

fn App() -> Element {
    rsx! {
        div {
            h1 { "Desktop App" }
        }
    }
}
```

### Desktop Native APIs

```rust
use dioxus::prelude::*;
use dioxus_desktop::use_window;

fn DesktopFeatures() -> Element {
    let window = use_window();

    rsx! {
        div {
            button {
                onclick: move |_| window.devtool(),
                "Open DevTools"
            }
            button {
                onclick: move |_| {
                    window.set_title("New Title");
                },
                "Change Title"
            }
            button {
                onclick: move |_| {
                    window.set_minimized(true);
                },
                "Minimize"
            }
        }
    }
}
```

### Mobile Configuration

```rust
use dioxus::prelude::*;

#[cfg(target_os = "android")]
fn main() {
    dioxus_mobile::launch(App);
}

#[cfg(target_os = "ios")]
fn main() {
    dioxus_mobile::launch(App);
}

fn App() -> Element {
    rsx! {
        div {
            h1 { "Mobile App" }
            p { "Running on mobile!" }
        }
    }
}
```

## Complete Example: Todo App (Universal)

```rust
// src/main.rs
use dioxus::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
struct Todo {
    id: u32,
    title: String,
    completed: bool,
}

fn main() {
    #[cfg(feature = "web")]
    dioxus_web::launch(App);

    #[cfg(feature = "desktop")]
    dioxus_desktop::launch(App);

    #[cfg(feature = "mobile")]
    dioxus_mobile::launch(App);
}

fn App() -> Element {
    let mut todos = use_signal(|| vec![
        Todo { id: 1, title: "Learn Rust".to_string(), completed: false },
        Todo { id: 2, title: "Build with Dioxus".to_string(), completed: false },
    ]);

    let mut new_title = use_signal(String::new);
    let mut next_id = use_signal(|| 3u32);

    let add_todo = move |_| {
        let title = new_title.read().clone();
        if !title.is_empty() {
            let id = next_id();
            todos.write().push(Todo {
                id,
                title,
                completed: false,
            });
            next_id += 1;
            new_title.set(String::new());
        }
    };

    let toggle_todo = move |id: u32| {
        todos.write()
            .iter_mut()
            .find(|t| t.id == id)
            .map(|t| t.completed = !t.completed);
    };

    let delete_todo = move |id: u32| {
        todos.write().retain(|t| t.id != id);
    };

    let active_count = use_memo(move || {
        todos.read().iter().filter(|t| !t.completed).count()
    });

    rsx! {
        div { class: "app",
            style { {include_str!("../assets/style.css")} }

            h1 { "Todo List" }

            div { class: "input-section",
                input {
                    r#type: "text",
                    placeholder: "What needs to be done?",
                    value: "{new_title}",
                    oninput: move |evt| new_title.set(evt.value().clone()),
                    onkeypress: move |evt| {
                        if evt.key() == Key::Enter {
                            add_todo(());
                        }
                    }
                }
                button {
                    onclick: add_todo,
                    disabled: new_title.read().is_empty(),
                    "Add"
                }
            }

            div { class: "stats",
                p { "{active_count()} items left" }
            }

            ul { class: "todo-list",
                for todo in todos.read().iter() {
                    TodoItem {
                        key: "{todo.id}",
                        todo: todo.clone(),
                        on_toggle: move |id| toggle_todo(id),
                        on_delete: move |id| delete_todo(id),
                    }
                }
            }
        }
    }
}

#[component]
fn TodoItem(
    todo: Todo,
    on_toggle: EventHandler<u32>,
    on_delete: EventHandler<u32>,
) -> Element {
    let id = todo.id;

    rsx! {
        li {
            class: if todo.completed { "completed" } else { "" },
            div { class: "todo-content",
                input {
                    r#type: "checkbox",
                    checked: todo.completed,
                    onchange: move |_| on_toggle.call(id),
                }
                span {
                    onclick: move |_| on_toggle.call(id),
                    "{todo.title}"
                }
            }
            button {
                class: "delete",
                onclick: move |_| on_delete.call(id),
                "×"
            }
        }
    }
}
```

### Style.css

```css
/* assets/style.css */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #f5f5f5;
    padding: 20px;
}

.app {
    max-width: 600px;
    margin: 0 auto;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

h1 {
    text-align: center;
    color: #333;
    margin-bottom: 20px;
}

.input-section {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

input[type="text"] {
    flex: 1;
    padding: 10px;
    border: 2px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
}

button {
    padding: 10px 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
}

button:hover {
    background: #0056b3;
}

button:disabled {
    background: #ccc;
    cursor: not-allowed;
}

.stats {
    margin-bottom: 10px;
    color: #666;
}

.todo-list {
    list-style: none;
}

li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid #eee;
}

li:hover {
    background: #f9f9f9;
}

li.completed span {
    text-decoration: line-through;
    color: #999;
}

.todo-content {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
}

.todo-content span {
    cursor: pointer;
}

input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
}

.delete {
    background: #dc3545;
    padding: 5px 10px;
    font-size: 20px;
}

.delete:hover {
    background: #c82333;
}
```

## Best Practices

1. **Signal Usage**: Use `use_signal` for mutable state, `use_memo` for derived values
2. **Resource Loading**: Use `use_resource` for async data fetching
3. **Context**: Share state via context for deeply nested components
4. **Keys**: Always provide keys for dynamic lists
5. **Platform Detection**: Use `cfg` attributes for platform-specific code
6. **Event Handlers**: Clone signals before moving into closures
7. **Performance**: Use memoization for expensive computations
8. **Styling**: Use inline styles or CSS files via `style` elements

## Resources

- Documentation: https://dioxuslabs.com
- Book: https://dioxuslabs.com/learn/0.5
- Examples: https://github.com/DioxusLabs/dioxus/tree/master/examples
- Discord: https://discord.gg/XgGxMSkvUM
- Awesome Dioxus: https://github.com/DioxusLabs/awesome-dioxus
