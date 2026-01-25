# Skill: Serde Serialization Patterns

**ID**: `serde-patterns`
**Category**: Ecosystem
**Agent**: Rust Async Specialist

---

## When to Use

- Serializing/deserializing data
- Custom serialization logic
- Working with JSON, TOML, YAML, etc.
- Handling optional fields and defaults

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| data_type | string | Yes | Struct or enum to serialize |
| format | string | No | json, toml, yaml, etc. |

---

## Steps

### Step 1: Basic Setup

```toml
# Cargo.toml
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

```rust
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
struct User {
    name: String,
    age: u32,
    email: String,
}

// Serialize
let user = User { name: "Alice".into(), age: 30, email: "alice@example.com".into() };
let json = serde_json::to_string(&user)?;
let pretty = serde_json::to_string_pretty(&user)?;

// Deserialize
let user: User = serde_json::from_str(&json)?;
```

### Step 2: Field Attributes

```rust
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
struct Config {
    // Rename field in serialization
    #[serde(rename = "serverHost")]
    server_host: String,

    // Rename all fields (camelCase, snake_case, etc.)
    // #[serde(rename_all = "camelCase")] at struct level

    // Default value if missing
    #[serde(default)]
    port: u16,

    // Default with custom function
    #[serde(default = "default_timeout")]
    timeout: u64,

    // Skip serialization
    #[serde(skip)]
    internal_state: i32,

    // Skip if None
    #[serde(skip_serializing_if = "Option::is_none")]
    optional_field: Option<String>,

    // Flatten nested struct
    #[serde(flatten)]
    metadata: Metadata,

    // Alias for deserialization
    #[serde(alias = "db_url", alias = "database_url")]
    connection_string: String,
}

fn default_timeout() -> u64 {
    30
}

#[derive(Debug, Serialize, Deserialize)]
struct Metadata {
    version: String,
    author: String,
}
```

### Step 3: Enum Serialization

```rust
use serde::{Serialize, Deserialize};

// Default: {"Type": {fields}}
#[derive(Debug, Serialize, Deserialize)]
enum Message {
    Text(String),
    Image { url: String, width: u32 },
    File { name: String, size: u64 },
}

// Externally tagged (default): {"Text": "hello"}
#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
enum Event {
    Click { x: i32, y: i32 },
    KeyPress { key: String },
}
// {"type": "Click", "x": 10, "y": 20}

// Adjacently tagged
#[derive(Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
enum Response {
    Success(Data),
    Error(String),
}
// {"type": "Success", "data": {...}}

// Untagged (tries each variant)
#[derive(Serialize, Deserialize)]
#[serde(untagged)]
enum Value {
    Integer(i64),
    Float(f64),
    String(String),
}
```

### Step 4: Custom Serialization

```rust
use serde::{Serialize, Deserialize, Serializer, Deserializer};

#[derive(Debug)]
struct MyDate(chrono::NaiveDate);

impl Serialize for MyDate {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let s = self.0.format("%Y-%m-%d").to_string();
        serializer.serialize_str(&s)
    }
}

impl<'de> Deserialize<'de> for MyDate {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        chrono::NaiveDate::parse_from_str(&s, "%Y-%m-%d")
            .map(MyDate)
            .map_err(serde::de::Error::custom)
    }
}

// Or use serde_with for common cases
use serde_with::{serde_as, DisplayFromStr};

#[serde_as]
#[derive(Serialize, Deserialize)]
struct Record {
    #[serde_as(as = "DisplayFromStr")]
    id: u64,  // Serializes as string
}
```

### Step 5: Handling Unknown Fields

```rust
use serde::{Serialize, Deserialize};
use serde_json::Value;
use std::collections::HashMap;

// Deny unknown fields (strict)
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct StrictConfig {
    name: String,
}

// Capture unknown fields
#[derive(Deserialize)]
struct FlexibleConfig {
    name: String,
    #[serde(flatten)]
    extra: HashMap<String, Value>,
}
```

### Step 6: Validation During Deserialization

```rust
use serde::{Deserialize, Deserializer};

#[derive(Debug, Deserialize)]
struct ValidatedUser {
    #[serde(deserialize_with = "validate_email")]
    email: String,

    #[serde(deserialize_with = "validate_age")]
    age: u32,
}

fn validate_email<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    if s.contains('@') {
        Ok(s)
    } else {
        Err(serde::de::Error::custom("invalid email"))
    }
}

fn validate_age<'de, D>(deserializer: D) -> Result<u32, D::Error>
where
    D: Deserializer<'de>,
{
    let age = u32::deserialize(deserializer)?;
    if age <= 150 {
        Ok(age)
    } else {
        Err(serde::de::Error::custom("age must be <= 150"))
    }
}
```

### Step 7: Different Formats

```toml
# Cargo.toml
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"     # JSON
toml = "0.8"         # TOML
serde_yaml = "0.9"   # YAML
rmp-serde = "1"      # MessagePack
bincode = "1"        # Binary
```

```rust
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
struct Config {
    name: String,
    port: u16,
}

// JSON
let json = serde_json::to_string(&config)?;
let config: Config = serde_json::from_str(&json)?;

// TOML
let toml_str = toml::to_string(&config)?;
let config: Config = toml::from_str(&toml_str)?;

// YAML
let yaml = serde_yaml::to_string(&config)?;
let config: Config = serde_yaml::from_str(&yaml)?;

// MessagePack (binary)
let bytes = rmp_serde::to_vec(&config)?;
let config: Config = rmp_serde::from_slice(&bytes)?;

// Bincode (binary)
let bytes = bincode::serialize(&config)?;
let config: Config = bincode::deserialize(&bytes)?;
```

---

## Common Patterns

### Optional with Default
```rust
#[derive(Deserialize)]
struct Config {
    #[serde(default = "default_port")]
    port: u16,
}

fn default_port() -> u16 { 8080 }
```

### String or Struct
```rust
#[derive(Deserialize)]
#[serde(untagged)]
enum StringOrStruct {
    String(String),
    Struct(DetailedConfig),
}
```

### Seconds as Duration
```rust
#[serde_as]
#[derive(Deserialize)]
struct Config {
    #[serde_as(as = "serde_with::DurationSeconds<u64>")]
    timeout: std::time::Duration,
}
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Struct definitions | stdout | Serde-enabled types |
| Example usage | stdout | Serialization code |

---

## Output Template

```markdown
## Serde Implementation

### Type
```rust
[struct/enum definition]
```

### JSON Example
```json
[example output]
```

### Usage
```rust
let json = serde_json::to_string(&value)?;
let value: Type = serde_json::from_str(&json)?;
```
```
