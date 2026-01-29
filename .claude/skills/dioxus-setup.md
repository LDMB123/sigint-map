---
skill: dioxus-setup
description: Dioxus Cross-Platform Framework Setup
---

# Dioxus Cross-Platform Framework Setup

## Usage

```
/dioxus-setup [project-name] [platform: web|desktop|mobile|tui|fullstack]
```

## Instructions

You are a Dioxus framework expert specializing in cross-platform Rust applications. Guide the user through setting up Dioxus for web, desktop, mobile, or TUI applications with shared business logic and platform-specific rendering.

### Cargo.toml Dependencies

```toml
[package]
name = "my-dioxus-app"
version = "0.1.0"
edition = "2021"

[dependencies]
dioxus = { version = "0.5", features = ["web"] }
# Platform features (choose one or more):
# dioxus = { version = "0.5", features = ["desktop"] }
# dioxus = { version = "0.5", features = ["mobile"] }
# dioxus = { version = "0.5", features = ["tui"] }
# dioxus = { version = "0.5", features = ["fullstack"] }

dioxus-router = "0.5"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
reqwest = { version = "0.11", features = ["json"], optional = true }
tokio = { version = "1", features = ["full"], optional = true }
log = "0.4"

# Web-specific
[target.'cfg(target_arch = "wasm32")'.dependencies]
wasm-bindgen = "0.2"
console_error_panic_hook = "0.1"
wasm-logger = "0.2"
gloo-net = "0.5"

# Desktop/native-specific
[target.'cfg(not(target_arch = "wasm32"))'.dependencies]
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.11", features = ["json"] }

[features]
default = ["web"]
web = ["dioxus/web"]
desktop = ["dioxus/desktop", "tokio", "reqwest"]
fullstack = ["dioxus/fullstack"]

[profile.release]
lto = true
opt-level = 'z'
```

### Basic Component Example

```rust
// src/main.rs
use dioxus::prelude::*;

fn main() {
    // Web
    #[cfg(feature = "web")]
    {
        console_error_panic_hook::set_once();
        wasm_logger::init(wasm_logger::Config::default());
        dioxus::launch(App);
    }

    // Desktop
    #[cfg(feature = "desktop")]
    {
        dioxus::launch(App);
    }
}

#[component]
fn App() -> Element {
    rsx! {
        main {
            h1 { "Welcome to Dioxus" }
            Counter {}
        }
    }
}

#[component]
fn Counter() -> Element {
    let mut count = use_signal(|| 0);

    // Derived/computed value
    let doubled = use_memo(move || count() * 2);

    rsx! {
        div { class: "counter",
            button { onclick: move |_| count -= 1, "-1" }
            span { "Count: {count} (Double: {doubled})" }
            button { onclick: move |_| count += 1, "+1" }
        }
    }
}
```

### Advanced Patterns

```rust
// Async data fetching with use_resource
#[component]
fn UserProfile(id: i32) -> Element {
    let user = use_resource(move || async move {
        fetch_user(id).await
    });

    match &*user.read_unchecked() {
        Some(Ok(user)) => rsx! {
            div { class: "profile",
                h2 { "{user.name}" }
                p { "{user.email}" }
            }
        },
        Some(Err(e)) => rsx! { p { "Error: {e}" } },
        None => rsx! { p { "Loading..." } },
    }
}

// Global state with context
#[derive(Clone)]
struct AppState {
    theme: Signal<String>,
    user: Signal<Option<User>>,
}

#[component]
fn AppProvider() -> Element {
    let state = AppState {
        theme: use_signal(|| "light".to_string()),
        user: use_signal(|| None),
    };

    use_context_provider(|| state);

    rsx! {
        Router::<Route> {}
    }
}

// Using context in child components
#[component]
fn ThemeToggle() -> Element {
    let state = use_context::<AppState>();
    let mut theme = state.theme;

    rsx! {
        button {
            onclick: move |_| {
                let new_theme = if theme() == "light" { "dark" } else { "light" };
                theme.set(new_theme.to_string());
            },
            "Toggle Theme: {theme}"
        }
    }
}

// Server functions (fullstack)
#[cfg(feature = "fullstack")]
#[server(GetUser)]
async fn get_user(id: i32) -> Result<User, ServerFnError> {
    // This runs on the server
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
        .fetch_one(&pool)
        .await?;
    Ok(user)
}

// Form handling with validation
#[component]
fn ContactForm() -> Element {
    let mut name = use_signal(String::new);
    let mut email = use_signal(String::new);
    let mut submitted = use_signal(|| false);

    let onsubmit = move |evt: FormEvent| {
        evt.prevent_default();
        submitted.set(true);
        // Handle form submission
    };

    rsx! {
        form { onsubmit,
            input {
                r#type: "text",
                placeholder: "Name",
                value: "{name}",
                oninput: move |e| name.set(e.value())
            }
            input {
                r#type: "email",
                placeholder: "Email",
                value: "{email}",
                oninput: move |e| email.set(e.value())
            }
            button { r#type: "submit", "Submit" }
        }
    }
}
```

### Project Structure

```
my-dioxus-app/
├── Cargo.toml
├── Dioxus.toml              # Dioxus CLI config
├── index.html               # Web template
├── src/
│   ├── main.rs              # Entry point (all platforms)
│   ├── lib.rs               # Shared library
│   ├── app.rs               # Root App component
│   ├── components/
│   │   ├── mod.rs
│   │   ├── counter.rs
│   │   ├── navbar.rs
│   │   └── button.rs
│   ├── pages/
│   │   ├── mod.rs
│   │   ├── home.rs
│   │   └── about.rs
│   ├── hooks/
│   │   ├── mod.rs
│   │   └── use_fetch.rs
│   ├── state/
│   │   ├── mod.rs
│   │   └── app_state.rs
│   ├── router.rs
│   └── platform/            # Platform-specific code
│       ├── mod.rs
│       ├── web.rs
│       └── desktop.rs
├── assets/
│   ├── style.css
│   └── favicon.ico
└── dist/                    # Build output
```

### Routing Setup

```rust
use dioxus::prelude::*;
use dioxus_router::prelude::*;

#[derive(Clone, Routable, PartialEq)]
#[rustfmt::skip]
enum Route {
    #[layout(NavBar)]
        #[route("/")]
        Home {},
        #[route("/about")]
        About {},
        #[route("/user/:id")]
        User { id: i32 },
    #[end_layout]
    #[route("/:..route")]
    NotFound { route: Vec<String> },
}

#[component]
fn NavBar() -> Element {
    rsx! {
        nav {
            Link { to: Route::Home {}, "Home" }
            Link { to: Route::About {}, "About" }
        }
        Outlet::<Route> {}
    }
}

#[component]
fn Home() -> Element {
    rsx! { h1 { "Home Page" } }
}

#[component]
fn User(id: i32) -> Element {
    rsx! { h1 { "User {id}" } }
}
```

### Dioxus.toml Configuration

```toml
[application]
name = "my-dioxus-app"
default_platform = "web"

[web.app]
title = "My Dioxus App"

[web.watcher]
reload_html = true
watch_path = ["src", "assets"]

[web.resource]
dev_path = "assets"
style = ["assets/style.css"]

[web.resource.dev]
script = []

[[web.proxy]]
backend = "http://localhost:8080/api"
```

### Build Commands

```bash
# Install Dioxus CLI
cargo install dioxus-cli

# Create new project
dx new my-app

# Development server (web)
dx serve --hot-reload

# Build for web
dx build --release

# Desktop development
dx serve --platform desktop

# Build desktop app
dx build --platform desktop --release

# Bundle desktop app (creates .app/.exe/.deb)
dx bundle --platform desktop --release

# Mobile (requires additional setup)
dx serve --platform mobile
```

### Response Format

Provide setup guidance including:

1. **Project Initialization**: dx new or manual Cargo setup
2. **Platform Selection**: Web vs Desktop vs Mobile vs TUI trade-offs
3. **Component Architecture**: Signals, memos, effects patterns
4. **Cross-Platform Code**: Sharing logic between platforms
5. **Routing Configuration**: dioxus-router for navigation
6. **State Management**: Context, signals, global state
7. **Async Patterns**: use_resource, spawn, server functions
8. **Build & Bundle**: Platform-specific build commands
9. **Desktop Features**: Native menus, system tray, file dialogs
