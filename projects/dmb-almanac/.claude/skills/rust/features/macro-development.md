# Skill: Macro Development

**ID**: `macro-development`
**Category**: Features
**Agent**: Rust Metaprogramming Engineer

---

## When to Use

- Reducing repetitive boilerplate code
- Creating domain-specific syntax
- Implementing derive macros
- Code generation at compile time
- Building internal DSLs

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| goal | string | Yes | What the macro should accomplish |
| examples | string | No | Example usage of desired macro |

---

## Steps

### Step 1: Choose Macro Type

| Type | Syntax | Use Case |
|------|--------|----------|
| Declarative | `macro_rules!` | Pattern-based substitution |
| Function-like proc | `#[proc_macro]` | Complex parsing |
| Derive | `#[proc_macro_derive]` | Auto-implement traits |
| Attribute | `#[proc_macro_attribute]` | Transform items |

### Step 2: Declarative Macros

```rust
// Basic macro
macro_rules! say_hello {
    () => {
        println!("Hello!");
    };
}

// With arguments
macro_rules! create_function {
    ($func_name:ident) => {
        fn $func_name() {
            println!("Called {:?}()", stringify!($func_name));
        }
    };
}

// Multiple patterns
macro_rules! print_result {
    ($expression:expr) => {
        println!("{:?} = {:?}", stringify!($expression), $expression);
    };
    ($expression:expr, $format:literal) => {
        println!($format, $expression);
    };
}
```

#### Fragment Specifiers

| Specifier | Matches | Example |
|-----------|---------|---------|
| `$e:expr` | Expression | `1 + 2`, `foo()` |
| `$i:ident` | Identifier | `foo`, `Bar` |
| `$t:ty` | Type | `i32`, `Vec<T>` |
| `$p:pat` | Pattern | `Some(x)`, `_` |
| `$s:stmt` | Statement | `let x = 1;` |
| `$b:block` | Block | `{ ... }` |
| `$l:literal` | Literal | `42`, `"hello"` |
| `$tt:tt` | Token tree | Any single token |
| `$m:meta` | Meta item | `derive(Debug)` |

#### Repetition

```rust
macro_rules! vec_of {
    // Zero or more ($(...),*)
    ($($element:expr),*) => {
        {
            let mut v = Vec::new();
            $(
                v.push($element);
            )*
            v
        }
    };
}

// One or more ($(...),+)
macro_rules! min {
    ($x:expr $(, $xs:expr)+) => {
        {
            let mut min = $x;
            $(
                if $xs < min { min = $xs; }
            )+
            min
        }
    };
}

// Optional ($(...)?))
macro_rules! with_trailing_comma {
    ($($element:expr),* $(,)?) => {
        // Handles both `[1, 2, 3]` and `[1, 2, 3,]`
    };
}
```

### Step 3: Procedural Macros

```toml
# Cargo.toml for proc-macro crate
[lib]
proc-macro = true

[dependencies]
syn = { version = "2", features = ["full"] }
quote = "1"
proc-macro2 = "1"
```

#### Function-like Proc Macro

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, LitStr};

#[proc_macro]
pub fn make_answer(_input: TokenStream) -> TokenStream {
    quote! {
        fn answer() -> u32 { 42 }
    }.into()
}

// Usage: make_answer!();
// Expands to: fn answer() -> u32 { 42 }
```

#### Derive Macro

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput};

#[proc_macro_derive(HelloMacro)]
pub fn hello_macro_derive(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = &input.ident;

    quote! {
        impl HelloMacro for #name {
            fn hello_macro() {
                println!("Hello, Macro! My name is {}!", stringify!(#name));
            }
        }
    }.into()
}

// Usage:
// #[derive(HelloMacro)]
// struct Pancakes;
```

#### Derive with Helper Attributes

```rust
#[proc_macro_derive(Builder, attributes(builder))]
pub fn derive_builder(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    // Parse #[builder(...)] attributes on fields
    // ...
}

// Usage:
// #[derive(Builder)]
// struct Command {
//     #[builder(each = "arg")]
//     args: Vec<String>,
// }
```

#### Attribute Macro

```rust
#[proc_macro_attribute]
pub fn route(attr: TokenStream, item: TokenStream) -> TokenStream {
    let attr = parse_macro_input!(attr as LitStr);
    let input = parse_macro_input!(item as ItemFn);

    let fn_name = &input.sig.ident;
    let fn_block = &input.block;
    let vis = &input.vis;

    quote! {
        #vis fn #fn_name(req: Request) -> Response {
            println!("Route: {}", #attr);
            #fn_block
        }
    }.into()
}

// Usage:
// #[route("/api/users")]
// fn get_users() { ... }
```

### Step 4: Debugging Macros

```bash
# Expand all macros
cargo expand

# Expand specific module
cargo expand module_name

# Expand specific function
cargo expand --lib function_name
```

```rust
// In proc macro: print debug info
#[proc_macro]
pub fn debug_macro(input: TokenStream) -> TokenStream {
    eprintln!("INPUT: {}", input);

    let output = quote! { /* ... */ };
    eprintln!("OUTPUT: {}", output);

    output.into()
}
```

### Step 5: Best Practices

```rust
// Good: Clear syntax, helpful errors
macro_rules! ensure {
    ($cond:expr, $msg:literal) => {
        if !($cond) {
            return Err($msg.into());
        }
    };
    ($cond:expr, $fmt:literal, $($arg:expr),*) => {
        if !($cond) {
            return Err(format!($fmt, $($arg),*).into());
        }
    };
}

// Good: Use full paths for hygiene
macro_rules! my_vec {
    ($($e:expr),*) => {
        {
            let mut v = ::std::vec::Vec::new();
            $(
                v.push($e);
            )*
            v
        }
    };
}

// Good: Document macro syntax
/// Creates a HashMap with the given key-value pairs.
///
/// # Syntax
///
/// ```
/// hash_map! { key1 => value1, key2 => value2 }
/// ```
///
/// # Examples
///
/// ```
/// let map = hash_map! { "a" => 1, "b" => 2 };
/// ```
macro_rules! hash_map { /* ... */ }
```

---

## Common Patterns

### Counting

```rust
macro_rules! count {
    () => (0usize);
    ($x:tt $($xs:tt)*) => (1usize + count!($($xs)*));
}

let size = count!(a b c);  // 3
```

### Recursive Descent

```rust
macro_rules! tuple_impls {
    () => {};
    ($head:ident $(, $tail:ident)*) => {
        impl<$head $(, $tail)*> MyTrait for ($head, $($tail,)*)
        where
            $head: MyTrait,
            $($tail: MyTrait,)*
        { }

        tuple_impls!($($tail),*);
    };
}

tuple_impls!(A, B, C, D);
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Macro code | stdout | Implementation |
| Usage examples | stdout | How to use |

---

## Output Template

```markdown
## Macro Implementation

### Type
[declarative / function-like / derive / attribute]

### Definition
```rust
[macro code]
```

### Usage
```rust
[usage example]
```

### Expansion
```rust
// Input
my_macro!(input);

// Expands to
[expanded code]
```

### Testing
```bash
cargo expand
cargo test
```
```
