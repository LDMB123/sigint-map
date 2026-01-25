# Yew Framework Setup and Patterns

## Overview

Yew is a modern Rust framework for creating multi-threaded frontend web apps using WebAssembly. It features a component-based architecture similar to React with hooks support.

## Project Setup

### Create New Project

```bash
# Install trunk (build tool for Yew)
cargo install trunk

# Create new project
cargo new yew-app
cd yew-app

# Add dependencies to Cargo.toml
```

### Cargo.toml Configuration

```toml
[package]
name = "yew-app"
version = "0.1.0"
edition = "2021"

[dependencies]
yew = { version = "0.21", features = ["csr"] }
yew-router = "0.18"
web-sys = "0.3"
wasm-bindgen = "0.2"
wasm-bindgen-futures = "0.4"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
gloo-net = "0.5"
gloo-timers = "0.3"
gloo-console = "0.3"
gloo-storage = "0.3"

[profile.release]
opt-level = 'z'
lto = true
codegen-units = 1
panic = 'abort'
```

### index.html

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Yew App</title>
    <link data-trunk rel="css" href="styles.css" />
  </head>
  <body></body>
</html>
```

### Development Commands

```bash
# Development server with hot reload
trunk serve

# Build for production
trunk build --release

# Build and serve production build
trunk serve --release
```

## Function Components

### Basic Component

```rust
use yew::prelude::*;

#[function_component(HelloWorld)]
pub fn hello_world() -> Html {
    html! {
        <div>
            <h1>{ "Hello, World!" }</h1>
            <p>{ "Welcome to Yew" }</p>
        </div>
    }
}
```

### Component with Props

```rust
use yew::prelude::*;

#[derive(Properties, PartialEq)]
pub struct GreetingProps {
    pub name: String,
    #[prop_or_default]
    pub message: Option<String>,
    #[prop_or_default]
    pub on_click: Option<Callback<()>>,
}

#[function_component(Greeting)]
pub fn greeting(props: &GreetingProps) -> Html {
    let message = props.message.as_deref().unwrap_or("Hello");
    let onclick = {
        let callback = props.on_click.clone();
        Callback::from(move |_| {
            if let Some(ref cb) = callback {
                cb.emit(());
            }
        })
    };

    html! {
        <div {onclick}>
            <h2>{ format!("{}, {}!", message, props.name) }</h2>
        </div>
    }
}

// Usage
#[function_component(App)]
fn app() -> Html {
    let on_click = Callback::from(|_| {
        gloo_console::log!("Clicked!");
    });

    html! {
        <Greeting
            name="Alice"
            message="Welcome"
            on_click={on_click}
        />
    }
}
```

### Children Props

```rust
use yew::prelude::*;

#[derive(Properties, PartialEq)]
pub struct CardProps {
    #[prop_or_default]
    pub title: Option<String>,
    pub children: Children,
}

#[function_component(Card)]
pub fn card(props: &CardProps) -> Html {
    html! {
        <div class="card">
            if let Some(title) = &props.title {
                <div class="card-header">
                    <h3>{ title }</h3>
                </div>
            }
            <div class="card-body">
                { for props.children.iter() }
            </div>
        </div>
    }
}

// Usage
#[function_component(App)]
fn app() -> Html {
    html! {
        <Card title="My Card">
            <p>{ "Card content goes here" }</p>
            <button>{ "Click me" }</button>
        </Card>
    }
}
```

## Hooks

### use_state Hook

```rust
use yew::prelude::*;

#[function_component(Counter)]
pub fn counter() -> Html {
    let count = use_state(|| 0);

    let increment = {
        let count = count.clone();
        Callback::from(move |_| count.set(*count + 1))
    };

    let decrement = {
        let count = count.clone();
        Callback::from(move |_| count.set(*count - 1))
    };

    let reset = {
        let count = count.clone();
        Callback::from(move |_| count.set(0))
    };

    html! {
        <div>
            <p>{ "Count: " }{ *count }</p>
            <button onclick={increment}>{ "+" }</button>
            <button onclick={decrement}>{ "-" }</button>
            <button onclick={reset}>{ "Reset" }</button>
        </div>
    }
}
```

### use_state with Complex State

```rust
use yew::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, PartialEq, Serialize, Deserialize)]
pub struct Todo {
    pub id: u32,
    pub title: String,
    pub completed: bool,
}

#[function_component(TodoList)]
pub fn todo_list() -> Html {
    let todos = use_state(|| vec![
        Todo { id: 1, title: "Learn Rust".to_string(), completed: false },
        Todo { id: 2, title: "Build with Yew".to_string(), completed: false },
    ]);

    let toggle_todo = {
        let todos = todos.clone();
        Callback::from(move |id: u32| {
            let mut new_todos = (*todos).clone();
            if let Some(todo) = new_todos.iter_mut().find(|t| t.id == id) {
                todo.completed = !todo.completed;
            }
            todos.set(new_todos);
        })
    };

    html! {
        <ul>
            { for todos.iter().map(|todo| {
                let id = todo.id;
                let onclick = {
                    let toggle = toggle_todo.clone();
                    Callback::from(move |_| toggle.emit(id))
                };

                html! {
                    <li key={todo.id} class={if todo.completed { "completed" } else { "" }}>
                        <span {onclick}>{ &todo.title }</span>
                    </li>
                }
            })}
        </ul>
    }
}
```

### use_effect Hook

```rust
use yew::prelude::*;
use gloo_timers::callback::Interval;

#[function_component(Timer)]
pub fn timer() -> Html {
    let count = use_state(|| 0);

    // Effect runs after every render
    use_effect({
        let count = count.clone();
        move || {
            gloo_console::log!("Count changed:", *count);
            || () // Cleanup function
        }
    });

    // Effect with dependencies - only runs when count changes
    use_effect_with(
        count.clone(),
        {
            move |count| {
                gloo_console::log!("Effect triggered:", **count);
                || () // Cleanup
            }
        }
    );

    // Effect with interval (runs once on mount)
    use_effect_with((), {
        let count = count.clone();
        move |_| {
            let interval = Interval::new(1000, move || {
                count.set(*count + 1);
            });

            // Cleanup: cancel interval on unmount
            move || drop(interval)
        }
    });

    html! {
        <div>
            <h1>{ "Timer: " }{ *count }</h1>
        </div>
    }
}
```

### use_reducer Hook

```rust
use yew::prelude::*;
use std::rc::Rc;

#[derive(Clone, PartialEq)]
pub struct State {
    count: i32,
    step: i32,
}

pub enum Action {
    Increment,
    Decrement,
    SetStep(i32),
    Reset,
}

impl Reducible for State {
    type Action = Action;

    fn reduce(self: Rc<Self>, action: Self::Action) -> Rc<Self> {
        match action {
            Action::Increment => Self { count: self.count + self.step, ..*self }.into(),
            Action::Decrement => Self { count: self.count - self.step, ..*self }.into(),
            Action::SetStep(step) => Self { step, ..*self }.into(),
            Action::Reset => Self { count: 0, step: 1 }.into(),
        }
    }
}

#[function_component(Counter)]
pub fn counter() -> Html {
    let state = use_reducer(|| State { count: 0, step: 1 });

    let increment = {
        let state = state.clone();
        Callback::from(move |_| state.dispatch(Action::Increment))
    };

    let decrement = {
        let state = state.clone();
        Callback::from(move |_| state.dispatch(Action::Decrement))
    };

    let on_step_change = {
        let state = state.clone();
        Callback::from(move |e: InputEvent| {
            let input: web_sys::HtmlInputElement = e.target_unchecked_into();
            if let Ok(step) = input.value().parse::<i32>() {
                state.dispatch(Action::SetStep(step));
            }
        })
    };

    html! {
        <div>
            <p>{ "Count: " }{ state.count }</p>
            <p>{ "Step: " }{ state.step }</p>
            <input
                type="number"
                value={state.step.to_string()}
                oninput={on_step_change}
            />
            <button onclick={increment}>{ "+" }</button>
            <button onclick={decrement}>{ "-" }</button>
        </div>
    }
}
```

### use_context Hook

```rust
use yew::prelude::*;

#[derive(Clone, PartialEq)]
pub struct Theme {
    pub primary_color: String,
    pub background: String,
}

#[derive(Clone, PartialEq)]
pub struct AppContext {
    pub theme: Theme,
    pub user: Option<String>,
}

#[function_component(App)]
pub fn app() -> Html {
    let context = use_state(|| AppContext {
        theme: Theme {
            primary_color: "#007bff".to_string(),
            background: "#ffffff".to_string(),
        },
        user: Some("Alice".to_string()),
    });

    html! {
        <ContextProvider<UseStateHandle<AppContext>> context={context}>
            <Header />
            <MainContent />
        </ContextProvider<UseStateHandle<AppContext>>>
    }
}

#[function_component(Header)]
fn header() -> Html {
    let context = use_context::<UseStateHandle<AppContext>>()
        .expect("No context found");

    html! {
        <header style={format!("background: {}", context.theme.primary_color)}>
            <h1>{ "Welcome " }{ context.user.as_ref().unwrap_or(&"Guest".to_string()) }</h1>
        </header>
    }
}

#[function_component(MainContent)]
fn main_content() -> Html {
    let context = use_context::<UseStateHandle<AppContext>>()
        .expect("No context found");

    html! {
        <main style={format!("background: {}", context.theme.background)}>
            <p>{ "Main content here" }</p>
        </main>
    }
}
```

### use_memo Hook

```rust
use yew::prelude::*;

#[function_component(ExpensiveComputation)]
pub fn expensive_computation() -> Html {
    let count = use_state(|| 0);
    let multiplier = use_state(|| 2);

    // Memoized expensive computation
    let result = use_memo(
        (count.clone(), multiplier.clone()),
        |(count, multiplier)| {
            gloo_console::log!("Computing...");
            // Expensive operation
            **count * **multiplier
        }
    );

    let increment = {
        let count = count.clone();
        Callback::from(move |_| count.set(*count + 1))
    };

    html! {
        <div>
            <p>{ "Count: " }{ *count }</p>
            <p>{ "Multiplier: " }{ *multiplier }</p>
            <p>{ "Result: " }{ *result }</p>
            <button onclick={increment}>{ "Increment" }</button>
        </div>
    }
}
```

### Custom Hooks

```rust
use yew::prelude::*;
use gloo_storage::{LocalStorage, Storage};
use serde::{Deserialize, Serialize};

// Custom hook for local storage
#[hook]
pub fn use_local_storage<T>(key: &'static str, initial: T) -> UseStateHandle<T>
where
    T: Serialize + for<'de> Deserialize<'de> + Clone + PartialEq + 'static,
{
    let state = use_state(|| {
        LocalStorage::get(key).unwrap_or(initial)
    });

    use_effect_with(state.clone(), move |state| {
        let _ = LocalStorage::set(key, &**state);
        || ()
    });

    state
}

// Usage
#[function_component(App)]
fn app() -> Html {
    let name = use_local_storage("user_name", "Guest".to_string());

    let oninput = {
        let name = name.clone();
        Callback::from(move |e: InputEvent| {
            let input: web_sys::HtmlInputElement = e.target_unchecked_into();
            name.set(input.value());
        })
    };

    html! {
        <div>
            <input
                type="text"
                value={(*name).clone()}
                {oninput}
            />
            <p>{ "Hello, " }{ &*name }</p>
        </div>
    }
}
```

## Message Passing (Classic Components)

```rust
use yew::prelude::*;

pub enum Msg {
    Increment,
    Decrement,
    Reset,
}

pub struct Counter {
    count: i32,
}

impl Component for Counter {
    type Message = Msg;
    type Properties = ();

    fn create(_ctx: &Context<Self>) -> Self {
        Self { count: 0 }
    }

    fn update(&mut self, _ctx: &Context<Self>, msg: Self::Message) -> bool {
        match msg {
            Msg::Increment => {
                self.count += 1;
                true // Re-render
            }
            Msg::Decrement => {
                self.count -= 1;
                true
            }
            Msg::Reset => {
                self.count = 0;
                true
            }
        }
    }

    fn view(&self, ctx: &Context<Self>) -> Html {
        let link = ctx.link();

        html! {
            <div>
                <p>{ "Count: " }{ self.count }</p>
                <button onclick={link.callback(|_| Msg::Increment)}>
                    { "+" }
                </button>
                <button onclick={link.callback(|_| Msg::Decrement)}>
                    { "-" }
                </button>
                <button onclick={link.callback(|_| Msg::Reset)}>
                    { "Reset" }
                </button>
            </div>
        }
    }
}
```

## Agents for Background Tasks

### Simple Agent

```rust
use yew::prelude::*;
use yew_agent::{Agent, AgentLink, Context, HandlerId};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub enum Request {
    StartTimer,
    StopTimer,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Response {
    Tick(u32),
}

pub struct TimerAgent {
    link: AgentLink<Self>,
    subscribers: Vec<HandlerId>,
    counter: u32,
}

impl Agent for TimerAgent {
    type Reach = Context<Self>;
    type Message = ();
    type Input = Request;
    type Output = Response;

    fn create(link: AgentLink<Self>) -> Self {
        Self {
            link,
            subscribers: Vec::new(),
            counter: 0,
        }
    }

    fn update(&mut self, _msg: Self::Message) {
        self.counter += 1;
        for sub in &self.subscribers {
            self.link.respond(*sub, Response::Tick(self.counter));
        }
    }

    fn handle_input(&mut self, msg: Self::Input, id: HandlerId) {
        match msg {
            Request::StartTimer => {
                if !self.subscribers.contains(&id) {
                    self.subscribers.push(id);
                }
            }
            Request::StopTimer => {
                self.subscribers.retain(|&sub_id| sub_id != id);
            }
        }
    }

    fn connected(&mut self, id: HandlerId) {
        self.subscribers.push(id);
    }

    fn disconnected(&mut self, id: HandlerId) {
        self.subscribers.retain(|&sub_id| sub_id != id);
    }
}

// Using the agent
use yew_agent::{Bridge, Bridged};

#[function_component(TimerDisplay)]
pub fn timer_display() -> Html {
    let counter = use_state(|| 0);
    let agent = use_state(|| {
        let counter = counter.clone();
        TimerAgent::bridge(Callback::from(move |response| {
            if let Response::Tick(count) = response {
                counter.set(count);
            }
        }))
    });

    let start = {
        let agent = agent.clone();
        Callback::from(move |_| {
            agent.send(Request::StartTimer);
        })
    };

    let stop = {
        let agent = agent.clone();
        Callback::from(move |_| {
            agent.send(Request::StopTimer);
        })
    };

    html! {
        <div>
            <p>{ "Timer: " }{ *counter }</p>
            <button onclick={start}>{ "Start" }</button>
            <button onclick={stop}>{ "Stop" }</button>
        </div>
    }
}
```

## Routing

### Basic Router Setup

```rust
use yew::prelude::*;
use yew_router::prelude::*;

#[derive(Clone, Routable, PartialEq)]
enum Route {
    #[at("/")]
    Home,
    #[at("/about")]
    About,
    #[at("/users")]
    Users,
    #[at("/users/:id")]
    UserProfile { id: u32 },
    #[not_found]
    #[at("/404")]
    NotFound,
}

#[function_component(App)]
pub fn app() -> Html {
    html! {
        <BrowserRouter>
            <nav>
                <Link<Route> to={Route::Home}>{ "Home" }</Link<Route>>
                <Link<Route> to={Route::About}>{ "About" }</Link<Route>>
                <Link<Route> to={Route::Users}>{ "Users" }</Link<Route>>
            </nav>
            <main>
                <Switch<Route> render={switch} />
            </main>
        </BrowserRouter>
    }
}

fn switch(routes: Route) -> Html {
    match routes {
        Route::Home => html! { <Home /> },
        Route::About => html! { <About /> },
        Route::Users => html! { <UserList /> },
        Route::UserProfile { id } => html! { <UserProfile {id} /> },
        Route::NotFound => html! { <h1>{ "404 - Not Found" }</h1> },
    }
}

#[function_component(Home)]
fn home() -> Html {
    html! { <h1>{ "Home Page" }</h1> }
}

#[function_component(About)]
fn about() -> Html {
    html! { <h1>{ "About Page" }</h1> }
}

#[function_component(UserList)]
fn user_list() -> Html {
    html! {
        <div>
            <h1>{ "Users" }</h1>
            <ul>
                <li><Link<Route> to={Route::UserProfile { id: 1 }}>{ "User 1" }</Link<Route>></li>
                <li><Link<Route> to={Route::UserProfile { id: 2 }}>{ "User 2" }</Link<Route>></li>
            </ul>
        </div>
    }
}

#[derive(Properties, PartialEq)]
pub struct UserProfileProps {
    pub id: u32,
}

#[function_component(UserProfile)]
fn user_profile(props: &UserProfileProps) -> Html {
    html! {
        <div>
            <h1>{ format!("User Profile #{}", props.id) }</h1>
        </div>
    }
}
```

### Navigation Hooks

```rust
use yew::prelude::*;
use yew_router::prelude::*;

#[function_component(Navigation)]
pub fn navigation() -> Html {
    let navigator = use_navigator().unwrap();

    let go_home = {
        let navigator = navigator.clone();
        Callback::from(move |_| {
            navigator.push(&Route::Home);
        })
    };

    let go_back = {
        let navigator = navigator.clone();
        Callback::from(move |_| {
            navigator.back();
        })
    };

    let history = use_location().unwrap();

    html! {
        <div>
            <p>{ "Current path: " }{ &history.path() }</p>
            <button onclick={go_home}>{ "Go Home" }</button>
            <button onclick={go_back}>{ "Go Back" }</button>
        </div>
    }
}
```

## Complete Example: Todo App with API

```rust
// src/main.rs
use yew::prelude::*;
use serde::{Deserialize, Serialize};
use gloo_net::http::Request;
use wasm_bindgen_futures::spawn_local;

#[derive(Clone, PartialEq, Serialize, Deserialize)]
pub struct Todo {
    pub id: u32,
    pub title: String,
    pub completed: bool,
}

#[function_component(App)]
pub fn app() -> Html {
    let todos = use_state(Vec::new);
    let loading = use_state(|| true);
    let error = use_state(|| None::<String>);
    let new_title = use_state(String::new);

    // Fetch todos on mount
    use_effect_with((), {
        let todos = todos.clone();
        let loading = loading.clone();
        let error = error.clone();

        move |_| {
            spawn_local(async move {
                match fetch_todos().await {
                    Ok(data) => {
                        todos.set(data);
                        error.set(None);
                    }
                    Err(e) => {
                        error.set(Some(e));
                    }
                }
                loading.set(false);
            });
            || ()
        }
    });

    let on_submit = {
        let new_title = new_title.clone();
        let todos = todos.clone();

        Callback::from(move |e: SubmitEvent| {
            e.prevent_default();

            let title = (*new_title).clone();
            if !title.is_empty() {
                let todos = todos.clone();
                let new_title = new_title.clone();

                spawn_local(async move {
                    if let Ok(todo) = create_todo(title).await {
                        let mut current = (*todos).clone();
                        current.push(todo);
                        todos.set(current);
                        new_title.set(String::new());
                    }
                });
            }
        })
    };

    let on_input = {
        let new_title = new_title.clone();
        Callback::from(move |e: InputEvent| {
            let input: web_sys::HtmlInputElement = e.target_unchecked_into();
            new_title.set(input.value());
        })
    };

    let toggle_todo = {
        let todos = todos.clone();
        Callback::from(move |id: u32| {
            let todos = todos.clone();
            spawn_local(async move {
                if let Ok(updated) = toggle_todo_api(id).await {
                    let mut current = (*todos).clone();
                    if let Some(todo) = current.iter_mut().find(|t| t.id == id) {
                        *todo = updated;
                    }
                    todos.set(current);
                }
            });
        })
    };

    html! {
        <div class="app">
            <h1>{ "Todo List" }</h1>

            if *loading {
                <p>{ "Loading..." }</p>
            } else if let Some(err) = (*error).clone() {
                <p class="error">{ format!("Error: {}", err) }</p>
            } else {
                <>
                    <form onsubmit={on_submit}>
                        <input
                            type="text"
                            placeholder="What needs to be done?"
                            value={(*new_title).clone()}
                            oninput={on_input}
                        />
                        <button type="submit" disabled={new_title.is_empty()}>
                            { "Add" }
                        </button>
                    </form>

                    <ul class="todo-list">
                        { for todos.iter().map(|todo| {
                            let id = todo.id;
                            let toggle = toggle_todo.clone();
                            let onclick = Callback::from(move |_| toggle.emit(id));

                            html! {
                                <li key={todo.id} class={if todo.completed { "completed" } else { "" }}>
                                    <input
                                        type="checkbox"
                                        checked={todo.completed}
                                        onclick={onclick}
                                    />
                                    <span>{ &todo.title }</span>
                                </li>
                            }
                        })}
                    </ul>
                </>
            }
        </div>
    }
}

async fn fetch_todos() -> Result<Vec<Todo>, String> {
    Request::get("/api/todos")
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())
}

async fn create_todo(title: String) -> Result<Todo, String> {
    Request::post("/api/todos")
        .json(&serde_json::json!({ "title": title }))
        .map_err(|e| e.to_string())?
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())
}

async fn toggle_todo_api(id: u32) -> Result<Todo, String> {
    Request::patch(&format!("/api/todos/{}", id))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())
}

fn main() {
    yew::Renderer::<App>::new().render();
}
```

## Best Practices

1. **Use Function Components**: Prefer function components with hooks over struct components
2. **Memoization**: Use `use_memo` for expensive computations
3. **Effect Dependencies**: Always specify dependencies for `use_effect_with`
4. **Clone Handles**: Clone state handles before moving into closures
5. **Key Props**: Always provide `key` prop for lists to optimize rendering
6. **Error Handling**: Handle async errors gracefully with user feedback
7. **Context**: Use context for deeply nested props (theme, auth, etc.)
8. **Custom Hooks**: Extract reusable logic into custom hooks

## Resources

- Documentation: https://yew.rs
- Examples: https://github.com/yewstack/yew/tree/master/examples
- Awesome Yew: https://github.com/jetli/awesome-yew
- Discord: https://discord.gg/VQck8X4
