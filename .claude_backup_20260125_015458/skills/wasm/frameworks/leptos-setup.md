# Leptos Framework Setup and Patterns

## Overview

Leptos is a full-stack, isomorphic Rust web framework that provides fine-grained reactivity, server functions, and excellent performance with a small WASM bundle size.

## Project Scaffolding

### Create New Project

```bash
# Install cargo-leptos CLI tool
cargo install cargo-leptos

# Create new Leptos project
cargo leptos new my-app

# Project templates available:
# - spa: Client-side only SPA
# - csr: Client-side rendered (with routing)
# - ssr: Server-side rendered (recommended)
# - hydrate: SSR with hydration

# Navigate to project
cd my-app

# Development server with hot reload
cargo leptos watch

# Build for production
cargo leptos build --release
```

### Manual Setup (Cargo.toml)

```toml
[package]
name = "leptos-app"
version = "0.1.0"
edition = "2021"

[dependencies]
leptos = { version = "0.6", features = ["csr"] }
leptos_meta = { version = "0.6", features = ["csr"] }
leptos_router = { version = "0.6", features = ["csr"] }
console_error_panic_hook = "0.1"
wasm-bindgen = "0.2"

[features]
hydrate = ["leptos/hydrate", "leptos_meta/hydrate", "leptos_router/hydrate"]
ssr = [
    "leptos/ssr",
    "leptos_meta/ssr",
    "leptos_router/ssr",
]

[profile.release]
opt-level = 'z'
lto = true
codegen-units = 1

[[bin]]
name = "leptos-app"
required-features = ["ssr"]

[lib]
crate-type = ["cdylib", "rlib"]
```

## Component Patterns

### Basic Component

```rust
use leptos::*;

#[component]
pub fn HelloWorld() -> impl IntoView {
    view! {
        <div>
            <h1>"Hello, World!"</h1>
            <p>"Welcome to Leptos"</p>
        </div>
    }
}
```

### Component with Props

```rust
use leptos::*;

#[component]
pub fn Greeting(
    /// The name to greet
    name: String,
    /// Optional custom message
    #[prop(optional)]
    message: Option<String>,
    /// Callback when clicked
    #[prop(into)]
    on_click: Callback<()>,
) -> impl IntoView {
    let message = message.unwrap_or_else(|| "Hello".to_string());

    view! {
        <div on:click=move |_| on_click.call(())>
            <h2>{format!("{}, {}!", message, name)}</h2>
        </div>
    }
}

// Usage
#[component]
fn App() -> impl IntoView {
    view! {
        <Greeting
            name="Alice".to_string()
            message="Welcome".to_string()
            on_click=Callback::new(|_| {
                log!("Clicked!");
            })
        />
    }
}
```

### Generic Components

```rust
use leptos::*;

#[component]
pub fn List<T, F, IV>(
    /// Items to render
    items: Vec<T>,
    /// Render function for each item
    #[prop(into)]
    render_item: F,
) -> impl IntoView
where
    T: Clone + 'static,
    F: Fn(T) -> IV + 'static,
    IV: IntoView,
{
    view! {
        <ul>
            {items.into_iter().map(|item| {
                view! {
                    <li>{render_item(item)}</li>
                }
            }).collect_view()}
        </ul>
    }
}

// Usage
#[component]
fn App() -> impl IntoView {
    let items = vec!["Apple", "Banana", "Cherry"];

    view! {
        <List
            items=items.into_iter().map(|s| s.to_string()).collect()
            render_item=|item: String| view! { <span>{item}</span> }
        />
    }
}
```

## Signals and Reactivity

### Basic Signals

```rust
use leptos::*;

#[component]
pub fn Counter() -> impl IntoView {
    // Create a reactive signal
    let (count, set_count) = create_signal(0);

    view! {
        <div>
            <p>"Count: " {count}</p>
            <button on:click=move |_| set_count.update(|n| *n += 1)>
                "Increment"
            </button>
            <button on:click=move |_| set_count.set(0)>
                "Reset"
            </button>
        </div>
    }
}
```

### Derived Signals (Memos)

```rust
use leptos::*;

#[component]
pub fn ComputedValues() -> impl IntoView {
    let (count, set_count) = create_signal(0);

    // Memoized derived value - only recalculates when count changes
    let doubled = create_memo(move |_| count() * 2);

    // Another derived computation
    let is_even = create_memo(move |_| count() % 2 == 0);

    view! {
        <div>
            <p>"Count: " {count}</p>
            <p>"Doubled: " {doubled}</p>
            <p>"Is Even: " {move || if is_even() { "Yes" } else { "No" }}</p>
            <button on:click=move |_| set_count.update(|n| *n += 1)>
                "Increment"
            </button>
        </div>
    }
}
```

### Effects and Side Effects

```rust
use leptos::*;

#[component]
pub fn EffectExample() -> impl IntoView {
    let (count, set_count) = create_signal(0);

    // Effect runs whenever dependencies change
    create_effect(move |_| {
        log!("Count changed to: {}", count());
    });

    // Effect with cleanup
    create_effect(move |prev_cleanup| {
        let handle = set_interval(
            move || set_count.update(|n| *n += 1),
            1000
        );

        // Return cleanup function
        prev_cleanup.and_then(|cleanup: Box<dyn FnOnce()>| {
            cleanup();
            None
        });

        Some(Box::new(move || {
            clear_interval(handle);
        }) as Box<dyn FnOnce()>)
    });

    view! {
        <div>"Count: " {count}</div>
    }
}
```

### Resources (Async Data)

```rust
use leptos::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct User {
    pub id: u32,
    pub name: String,
}

#[component]
pub fn UserProfile(user_id: u32) -> impl IntoView {
    // Create a resource that loads asynchronously
    let user = create_resource(
        move || user_id,
        |id| async move {
            fetch_user(id).await
        },
    );

    view! {
        <div>
            <Suspense fallback=move || view! { <p>"Loading..."</p> }>
                {move || user.get().map(|user| match user {
                    Ok(user) => view! {
                        <div>
                            <h2>{user.name}</h2>
                            <p>"ID: " {user.id}</p>
                        </div>
                    }.into_view(),
                    Err(e) => view! {
                        <p>"Error: " {e.to_string()}</p>
                    }.into_view(),
                })}
            </Suspense>
        </div>
    }
}

async fn fetch_user(id: u32) -> Result<User, String> {
    // Fetch from API
    Ok(User {
        id,
        name: format!("User {}", id),
    })
}
```

### Context API (Shared State)

```rust
use leptos::*;

#[derive(Clone)]
pub struct AppState {
    pub user: RwSignal<Option<String>>,
    pub theme: RwSignal<Theme>,
}

#[derive(Clone, Copy, PartialEq)]
pub enum Theme {
    Light,
    Dark,
}

#[component]
pub fn App() -> impl IntoView {
    let state = AppState {
        user: create_rw_signal(None),
        theme: create_rw_signal(Theme::Light),
    };

    // Provide context to all children
    provide_context(state);

    view! {
        <div>
            <Header/>
            <MainContent/>
        </div>
    }
}

#[component]
fn Header() -> impl IntoView {
    // Access context
    let state = expect_context::<AppState>();

    let toggle_theme = move |_| {
        state.theme.update(|t| {
            *t = match *t {
                Theme::Light => Theme::Dark,
                Theme::Dark => Theme::Light,
            };
        });
    };

    view! {
        <header>
            <button on:click=toggle_theme>
                "Toggle Theme"
            </button>
        </header>
    }
}
```

## Server Functions

### Basic Server Function

```rust
use leptos::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Todo {
    pub id: u32,
    pub title: String,
    pub completed: bool,
}

// Server function - runs on server in SSR mode
#[server(GetTodos, "/api")]
pub async fn get_todos() -> Result<Vec<Todo>, ServerFnError> {
    use sqlx::PgPool;

    let pool = use_context::<PgPool>()
        .ok_or_else(|| ServerFnError::ServerError("No database pool".to_string()))?;

    let todos = sqlx::query_as!(
        Todo,
        "SELECT id, title, completed FROM todos ORDER BY id"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| ServerFnError::ServerError(e.to_string()))?;

    Ok(todos)
}

#[server(CreateTodo, "/api")]
pub async fn create_todo(title: String) -> Result<Todo, ServerFnError> {
    use sqlx::PgPool;

    let pool = use_context::<PgPool>()
        .ok_or_else(|| ServerFnError::ServerError("No database pool".to_string()))?;

    let todo = sqlx::query_as!(
        Todo,
        "INSERT INTO todos (title, completed) VALUES ($1, false) RETURNING id, title, completed",
        title
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| ServerFnError::ServerError(e.to_string()))?;

    Ok(todo)
}

// Client component using server functions
#[component]
pub fn TodoList() -> impl IntoView {
    let (todos, set_todos) = create_signal(Vec::new());
    let (new_title, set_new_title) = create_signal(String::new());

    // Create action for adding todos
    let add_todo = create_action(|title: &String| {
        let title = title.clone();
        async move { create_todo(title).await }
    });

    // Load todos on mount
    create_effect(move |_| {
        spawn_local(async move {
            match get_todos().await {
                Ok(todos_data) => set_todos.set(todos_data),
                Err(e) => log!("Error loading todos: {:?}", e),
            }
        });
    });

    // Watch for successful todo creation
    create_effect(move |_| {
        if let Some(Ok(new_todo)) = add_todo.value().get() {
            set_todos.update(|todos| todos.push(new_todo));
        }
    });

    let on_submit = move |ev: web_sys::Event| {
        ev.prevent_default();
        add_todo.dispatch(new_title.get());
        set_new_title.set(String::new());
    };

    view! {
        <div>
            <h1>"Todo List"</h1>
            <form on:submit=on_submit>
                <input
                    type="text"
                    placeholder="New todo"
                    prop:value=new_title
                    on:input=move |ev| set_new_title.set(event_target_value(&ev))
                />
                <button type="submit">"Add"</button>
            </form>
            <ul>
                <For
                    each=move || todos.get()
                    key=|todo| todo.id
                    children=move |todo: Todo| {
                        view! {
                            <li>
                                {todo.title}
                                {if todo.completed { " ✓" } else { "" }}
                            </li>
                        }
                    }
                />
            </ul>
        </div>
    }
}
```

## SSR/Hydration Setup

### Main Entry Point (src/main.rs)

```rust
#[cfg(feature = "ssr")]
#[tokio::main]
async fn main() {
    use axum::{
        body::Body as AxumBody,
        extract::{Path, State},
        http::Request,
        response::{IntoResponse, Response},
        routing::get,
        Router,
    };
    use leptos::*;
    use leptos_axum::{generate_route_list, LeptosRoutes};
    use sqlx::postgres::PgPoolOptions;
    use tower_http::services::ServeDir;

    simple_logger::init_with_level(log::Level::Info).unwrap();

    // Database setup
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&std::env::var("DATABASE_URL").unwrap())
        .await
        .expect("Could not connect to database");

    // Build Leptos configuration
    let conf = get_configuration(None).await.unwrap();
    let leptos_options = conf.leptos_options;
    let addr = leptos_options.site_addr;
    let routes = generate_route_list(App);

    // Build Axum router
    let app = Router::new()
        .leptos_routes_with_context(
            &leptos_options,
            routes,
            move || provide_context(pool.clone()),
            App,
        )
        .fallback(leptos_axum::file_and_error_handler(App))
        .with_state(leptos_options)
        .nest_service("/pkg", ServeDir::new("target/site/pkg"));

    log::info!("Listening on http://{}", &addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

#[cfg(not(feature = "ssr"))]
pub fn main() {
    // Client-side entry point
}
```

### App Root (src/app.rs)

```rust
use leptos::*;
use leptos_meta::*;
use leptos_router::*;

#[component]
pub fn App() -> impl IntoView {
    provide_meta_context();

    view! {
        <Stylesheet id="leptos" href="/pkg/style.css"/>
        <Title text="Leptos App"/>
        <Meta name="description" content="A Leptos application"/>

        <Router>
            <nav>
                <A href="/">"Home"</A>
                <A href="/about">"About"</A>
                <A href="/todos">"Todos"</A>
            </nav>
            <main>
                <Routes>
                    <Route path="/" view=Home/>
                    <Route path="/about" view=About/>
                    <Route path="/todos" view=TodoList/>
                    <Route path="/*any" view=NotFound/>
                </Routes>
            </main>
        </Router>
    }
}

#[component]
fn Home() -> impl IntoView {
    view! {
        <h1>"Welcome to Leptos!"</h1>
    }
}

#[component]
fn About() -> impl IntoView {
    view! {
        <h1>"About"</h1>
    }
}

#[component]
fn NotFound() -> impl IntoView {
    view! {
        <h1>"404 - Page Not Found"</h1>
    }
}
```

### Hydration (src/lib.rs)

```rust
use leptos::*;

pub mod app;
use app::*;

#[cfg(feature = "hydrate")]
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn hydrate() {
    // Set up panic hook for better error messages
    console_error_panic_hook::set_once();

    // Hydrate the app
    leptos::mount_to_body(App);
}
```

## Routing

### Basic Routing

```rust
use leptos::*;
use leptos_router::*;

#[component]
pub fn App() -> impl IntoView {
    view! {
        <Router>
            <Routes>
                <Route path="/" view=Home/>
                <Route path="/users" view=UserList/>
                <Route path="/users/:id" view=UserProfile/>
                <Route path="/settings/*any" view=Settings/>
            </Routes>
        </Router>
    }
}

#[component]
fn UserProfile() -> impl IntoView {
    let params = use_params_map();
    let id = move || {
        params.with(|params| {
            params.get("id")
                .cloned()
                .unwrap_or_default()
        })
    };

    view! {
        <div>
            <h1>"User Profile"</h1>
            <p>"User ID: " {id}</p>
        </div>
    }
}
```

### Nested Routes

```rust
use leptos::*;
use leptos_router::*;

#[component]
pub fn App() -> impl IntoView {
    view! {
        <Router>
            <Routes>
                <Route path="/dashboard" view=Dashboard>
                    <Route path="" view=DashboardHome/>
                    <Route path="analytics" view=Analytics/>
                    <Route path="settings" view=Settings/>
                </Route>
            </Routes>
        </Router>
    }
}

#[component]
fn Dashboard() -> impl IntoView {
    view! {
        <div class="dashboard">
            <aside>
                <nav>
                    <A href="/dashboard">"Home"</A>
                    <A href="/dashboard/analytics">"Analytics"</A>
                    <A href="/dashboard/settings">"Settings"</A>
                </nav>
            </aside>
            <main>
                <Outlet/>
            </main>
        </div>
    }
}
```

### Route Guards and Navigation

```rust
use leptos::*;
use leptos_router::*;

#[component]
pub fn ProtectedRoute(children: Children) -> impl IntoView {
    let navigate = use_navigate();
    let user = expect_context::<RwSignal<Option<String>>>();

    create_effect(move |_| {
        if user.get().is_none() {
            navigate("/login", Default::default());
        }
    });

    view! {
        <Show
            when=move || user.get().is_some()
            fallback=|| view! { <p>"Redirecting..."</p> }
        >
            {children()}
        </Show>
    }
}

// Usage
#[component]
fn App() -> impl IntoView {
    view! {
        <Router>
            <Routes>
                <Route path="/login" view=Login/>
                <Route path="/dashboard" view=|| view! {
                    <ProtectedRoute>
                        <Dashboard/>
                    </ProtectedRoute>
                }/>
            </Routes>
        </Router>
    }
}
```

## Complete Example: Todo App

```rust
// src/lib.rs
use leptos::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Todo {
    pub id: u32,
    pub title: String,
    pub completed: bool,
}

#[cfg(feature = "ssr")]
pub mod ssr {
    use super::*;
    use sqlx::PgPool;

    pub async fn get_pool() -> Result<PgPool, ServerFnError> {
        use_context::<PgPool>()
            .ok_or_else(|| ServerFnError::ServerError("No database pool".to_string()))
    }
}

#[server]
pub async fn list_todos() -> Result<Vec<Todo>, ServerFnError> {
    let pool = ssr::get_pool().await?;

    let todos = sqlx::query_as!(
        Todo,
        "SELECT id, title, completed FROM todos ORDER BY id"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| ServerFnError::ServerError(e.to_string()))?;

    Ok(todos)
}

#[server]
pub async fn add_todo(title: String) -> Result<Todo, ServerFnError> {
    let pool = ssr::get_pool().await?;

    let todo = sqlx::query_as!(
        Todo,
        "INSERT INTO todos (title, completed) VALUES ($1, false) RETURNING *",
        title
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| ServerFnError::ServerError(e.to_string()))?;

    Ok(todo)
}

#[server]
pub async fn toggle_todo(id: u32) -> Result<Todo, ServerFnError> {
    let pool = ssr::get_pool().await?;

    let todo = sqlx::query_as!(
        Todo,
        "UPDATE todos SET completed = NOT completed WHERE id = $1 RETURNING *",
        id as i32
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| ServerFnError::ServerError(e.to_string()))?;

    Ok(todo)
}

#[component]
pub fn TodoApp() -> impl IntoView {
    let (new_title, set_new_title) = create_signal(String::new());

    // Resource loads todos from server
    let todos = create_resource(|| (), |_| async { list_todos().await });

    // Actions for mutations
    let add_action = create_action(|title: &String| {
        let title = title.clone();
        async move { add_todo(title).await }
    });

    let toggle_action = create_action(|id: &u32| {
        let id = *id;
        async move { toggle_todo(id).await }
    });

    // Refetch todos when actions complete
    create_effect(move |_| {
        if add_action.value().get().is_some() {
            todos.refetch();
        }
    });

    create_effect(move |_| {
        if toggle_action.value().get().is_some() {
            todos.refetch();
        }
    });

    let on_submit = move |ev: web_sys::Event| {
        ev.prevent_default();
        let title = new_title.get();
        if !title.is_empty() {
            add_action.dispatch(title);
            set_new_title.set(String::new());
        }
    };

    view! {
        <div class="todo-app">
            <h1>"Todo List"</h1>

            <form on:submit=on_submit>
                <input
                    type="text"
                    placeholder="What needs to be done?"
                    prop:value=new_title
                    on:input=move |ev| set_new_title.set(event_target_value(&ev))
                />
                <button type="submit" disabled=move || new_title.get().is_empty()>
                    "Add"
                </button>
            </form>

            <Suspense fallback=move || view! { <p>"Loading todos..."</p> }>
                {move || todos.get().map(|todos| match todos {
                    Ok(todos) => view! {
                        <ul class="todo-list">
                            <For
                                each=move || todos.clone()
                                key=|todo| todo.id
                                children=move |todo: Todo| {
                                    let id = todo.id;
                                    view! {
                                        <li class:completed=todo.completed>
                                            <input
                                                type="checkbox"
                                                prop:checked=todo.completed
                                                on:change=move |_| toggle_action.dispatch(id)
                                            />
                                            <span>{todo.title}</span>
                                        </li>
                                    }
                                }
                            />
                        </ul>
                    }.into_view(),
                    Err(e) => view! {
                        <p class="error">"Error loading todos: " {e.to_string()}</p>
                    }.into_view(),
                })}
            </Suspense>
        </div>
    }
}
```

## Best Practices

1. **Fine-Grained Reactivity**: Use signals for truly reactive data, memos for derived values
2. **Server Functions**: Keep business logic on the server, minimize client-side bundle
3. **Suspense Boundaries**: Wrap async resources in Suspense for loading states
4. **Type Safety**: Leverage Rust's type system, share types between client and server
5. **Performance**: Use `create_memo` for expensive computations, `For` for lists
6. **Context API**: Use for dependency injection and shared state
7. **Error Handling**: Handle both client and server errors appropriately
8. **SSR**: Enable SSR for better SEO and initial load performance

## Common Patterns

### Form Handling

```rust
#[component]
fn ContactForm() -> impl IntoView {
    let (name, set_name) = create_signal(String::new());
    let (email, set_email) = create_signal(String::new());
    let (errors, set_errors) = create_signal(Vec::new());

    let submit = create_action(|data: &(String, String)| {
        let (name, email) = data.clone();
        async move { submit_contact(name, email).await }
    });

    let on_submit = move |ev: web_sys::Event| {
        ev.prevent_default();
        set_errors.set(Vec::new());

        let mut errs = Vec::new();
        if name.get().is_empty() {
            errs.push("Name is required".to_string());
        }
        if !email.get().contains('@') {
            errs.push("Invalid email".to_string());
        }

        if errs.is_empty() {
            submit.dispatch((name.get(), email.get()));
        } else {
            set_errors.set(errs);
        }
    };

    view! {
        <form on:submit=on_submit>
            <Show when=move || !errors.get().is_empty()>
                <ul class="errors">
                    <For
                        each=move || errors.get()
                        key=|e| e.clone()
                        children=|err| view! { <li>{err}</li> }
                    />
                </ul>
            </Show>

            <input
                type="text"
                placeholder="Name"
                prop:value=name
                on:input=move |ev| set_name.set(event_target_value(&ev))
            />
            <input
                type="email"
                placeholder="Email"
                prop:value=email
                on:input=move |ev| set_email.set(event_target_value(&ev))
            />
            <button type="submit">"Submit"</button>
        </form>
    }
}
```

## Resources

- Documentation: https://leptos.dev
- Book: https://book.leptos.dev
- Examples: https://github.com/leptos-rs/leptos/tree/main/examples
- Discord: https://discord.gg/leptos
