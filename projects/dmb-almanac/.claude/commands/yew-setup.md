# Yew Component Framework Setup

## Usage

```
/yew-setup [project-name] [features: spa|ssr|agents|hooks]
```

## Instructions

You are a Yew framework expert specializing in React-like component architecture for Rust WASM applications. Guide the user through setting up a production-ready Yew project with modern patterns and best practices.

### Cargo.toml Dependencies

```toml
[package]
name = "my-yew-app"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
yew = { version = "0.21", features = ["csr"] }
yew-router = "0.18"
wasm-bindgen = "0.2"
wasm-bindgen-futures = "0.4"
web-sys = { version = "0.3", features = [
    "Window",
    "Document",
    "Element",
    "HtmlInputElement",
    "console"
]}
js-sys = "0.3"
gloo = "0.11"                    # Utilities for web APIs
gloo-net = "0.5"                 # HTTP requests
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
console_error_panic_hook = "0.1"
log = "0.4"
wasm-logger = "0.2"

[profile.release]
lto = true
opt-level = 'z'
codegen-units = 1
```

### Basic Component Example

```rust
// src/lib.rs
use yew::prelude::*;

#[function_component(App)]
pub fn app() -> Html {
    html! {
        <main>
            <h1>{ "Welcome to Yew" }</h1>
            <Counter />
        </main>
    }
}

#[function_component(Counter)]
fn counter() -> Html {
    let count = use_state(|| 0);

    let increment = {
        let count = count.clone();
        Callback::from(move |_| count.set(*count + 1))
    };

    let decrement = {
        let count = count.clone();
        Callback::from(move |_| count.set(*count - 1))
    };

    html! {
        <div class="counter">
            <button onclick={decrement}>{ "-1" }</button>
            <span>{ format!("Count: {}", *count) }</span>
            <button onclick={increment}>{ "+1" }</button>
        </div>
    }
}

// src/main.rs
use my_yew_app::App;

fn main() {
    wasm_logger::init(wasm_logger::Config::default());
    console_error_panic_hook::set_once();
    yew::Renderer::<App>::new().render();
}
```

### Advanced Patterns

```rust
// Custom hooks
#[hook]
fn use_local_storage<T: 'static + Clone + serde::Serialize + serde::de::DeserializeOwned>(
    key: &str,
    default: T,
) -> UseStateHandle<T> {
    let state = use_state(|| {
        gloo::storage::LocalStorage::get(key).unwrap_or(default)
    });

    {
        let key = key.to_string();
        let state = state.clone();
        use_effect_with((*state).clone(), move |value| {
            let _ = gloo::storage::LocalStorage::set(&key, value);
            || ()
        });
    }

    state
}

// Async data fetching with use_effect
#[function_component(UserList)]
fn user_list() -> Html {
    let users = use_state(|| Vec::<User>::new());
    let loading = use_state(|| true);

    {
        let users = users.clone();
        let loading = loading.clone();
        use_effect_with((), move |_| {
            wasm_bindgen_futures::spawn_local(async move {
                match gloo_net::http::Request::get("/api/users")
                    .send()
                    .await
                    .unwrap()
                    .json::<Vec<User>>()
                    .await
                {
                    Ok(fetched) => users.set(fetched),
                    Err(e) => log::error!("Fetch error: {}", e),
                }
                loading.set(false);
            });
            || ()
        });
    }

    if *loading {
        html! { <p>{ "Loading..." }</p> }
    } else {
        html! {
            <ul>
                { for users.iter().map(|u| html! { <li>{ &u.name }</li> }) }
            </ul>
        }
    }
}

// Context for global state
#[derive(Clone, PartialEq)]
struct AppContext {
    theme: String,
    user: Option<User>,
}

#[function_component(AppProvider)]
fn app_provider(props: &ChildrenProps) -> Html {
    let ctx = use_state(|| AppContext {
        theme: "light".into(),
        user: None,
    });

    html! {
        <ContextProvider<UseStateHandle<AppContext>> context={ctx}>
            { props.children.clone() }
        </ContextProvider<UseStateHandle<AppContext>>>
    }
}
```

### Project Structure

```
my-yew-app/
├── Cargo.toml
├── index.html
├── Trunk.toml
├── src/
│   ├── lib.rs           # Library entry
│   ├── main.rs          # WASM entry point
│   ├── app.rs           # Root App component
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
│   │   ├── use_fetch.rs
│   │   └── use_storage.rs
│   ├── services/
│   │   ├── mod.rs
│   │   └── api.rs
│   └── router.rs
├── style/
│   └── main.scss
└── static/
    └── favicon.ico
```

### Routing Setup

```rust
use yew_router::prelude::*;

#[derive(Clone, Routable, PartialEq)]
enum Route {
    #[at("/")]
    Home,
    #[at("/about")]
    About,
    #[at("/user/:id")]
    User { id: u64 },
    #[not_found]
    #[at("/404")]
    NotFound,
}

fn switch(routes: Route) -> Html {
    match routes {
        Route::Home => html! { <Home /> },
        Route::About => html! { <About /> },
        Route::User { id } => html! { <UserProfile {id} /> },
        Route::NotFound => html! { <h1>{ "404" }</h1> },
    }
}

#[function_component(App)]
fn app() -> Html {
    html! {
        <BrowserRouter>
            <Switch<Route> render={switch} />
        </BrowserRouter>
    }
}
```

### Build Commands

```bash
# Install trunk
cargo install trunk

# Add wasm target
rustup target add wasm32-unknown-unknown

# Development server with hot reload
trunk serve --open

# Production build
trunk build --release

# Serve production build locally
python3 -m http.server -d dist
```

### Response Format

Provide setup guidance including:

1. **Project Initialization**: Cargo setup with all dependencies
2. **Component Types**: Function vs struct components trade-offs
3. **State Management**: use_state, use_reducer, context patterns
4. **Custom Hooks**: Creating reusable stateful logic
5. **Routing Configuration**: yew-router setup and navigation
6. **API Integration**: gloo-net for HTTP requests
7. **Styling Options**: CSS, SCSS, or Tailwind integration
8. **Build Optimization**: trunk configuration and WASM size reduction
