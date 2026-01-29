---
skill: leptos-setup
description: Leptos Reactive WASM Framework Setup
---

# Leptos Reactive WASM Framework Setup

## Usage

```
/leptos-setup [project-name] [features: ssr|csr|hydration|islands]
```

## Instructions

You are a Leptos framework expert specializing in fine-grained reactivity, server-side rendering, and full-stack Rust web applications. Guide the user through setting up a production-ready Leptos project with proper architecture.

### Cargo.toml Dependencies

```toml
[package]
name = "my-leptos-app"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
leptos = { version = "0.6", features = ["csr", "nightly"] }
leptos_meta = { version = "0.6", features = ["csr"] }
leptos_router = { version = "0.6", features = ["csr"] }
console_error_panic_hook = "0.1"
wasm-bindgen = "0.2"

# For SSR (optional)
# leptos_actix = { version = "0.6", optional = true }
# actix-web = { version = "4", optional = true }
# actix-files = { version = "0.6", optional = true }

[features]
default = ["csr"]
csr = ["leptos/csr", "leptos_meta/csr", "leptos_router/csr"]
ssr = ["leptos/ssr", "leptos_meta/ssr", "leptos_router/ssr"]
hydrate = ["leptos/hydrate", "leptos_meta/hydrate", "leptos_router/hydrate"]

[profile.release]
lto = true
opt-level = 'z'
codegen-units = 1
```

### Basic Component Example

```rust
// src/lib.rs
use leptos::*;

#[component]
pub fn App() -> impl IntoView {
    view! {
        <main>
            <h1>"Welcome to Leptos"</h1>
            <Counter/>
        </main>
    }
}

#[component]
fn Counter() -> impl IntoView {
    // Create a reactive signal
    let (count, set_count) = create_signal(0);

    // Derived signal (automatically updates)
    let double_count = move || count() * 2;

    view! {
        <div class="counter">
            <button on:click=move |_| set_count.update(|n| *n -= 1)>"-1"</button>
            <span>"Count: " {count} " (Double: " {double_count} ")"</span>
            <button on:click=move |_| set_count.update(|n| *n += 1)>"+1"</button>
        </div>
    }
}

// src/main.rs (for CSR)
use leptos::*;
use my_leptos_app::App;

fn main() {
    console_error_panic_hook::set_once();
    mount_to_body(|| view! { <App/> });
}
```

### Advanced Patterns

```rust
// Async resources with loading states
#[component]
fn UserProfile(id: i32) -> impl IntoView {
    let user = create_resource(
        move || id,
        |id| async move { fetch_user(id).await }
    );

    view! {
        <Suspense fallback=move || view! { <p>"Loading..."</p> }>
            {move || user.get().map(|u| view! { <p>{u.name}</p> })}
        </Suspense>
    }
}

// Server functions (SSR)
#[server(GetUser, "/api")]
pub async fn get_user(id: i32) -> Result<User, ServerFnError> {
    // Runs on server, called from client
    db::get_user(id).await.map_err(|e| ServerFnError::ServerError(e.to_string()))
}
```

### Project Structure

```
my-leptos-app/
├── Cargo.toml
├── index.html
├── src/
│   ├── lib.rs           # Component library
│   ├── main.rs          # CSR entry point
│   ├── app.rs           # Root App component
│   ├── components/
│   │   ├── mod.rs
│   │   ├── counter.rs
│   │   └── nav.rs
│   ├── pages/
│   │   ├── mod.rs
│   │   ├── home.rs
│   │   └── about.rs
│   └── server/          # SSR server functions
│       └── mod.rs
├── style/
│   └── main.css
└── public/
    └── favicon.ico
```

### Build Commands

```bash
# Install trunk for CSR
cargo install trunk

# Development with hot reload
trunk serve --open

# Production build
trunk build --release

# For SSR with cargo-leptos
cargo install cargo-leptos
cargo leptos watch
cargo leptos build --release
```

### Response Format

Provide setup guidance including:

1. **Project Initialization**: cargo new and dependency setup
2. **Feature Selection**: CSR vs SSR vs Hydration trade-offs
3. **Component Architecture**: Signals, derived state, effects
4. **Routing Setup**: leptos_router configuration
5. **Styling Integration**: CSS modules or Tailwind setup
6. **Build Pipeline**: trunk or cargo-leptos configuration
7. **Deployment Options**: Static hosting vs server deployment
