# Serde Patterns

Serde serialization patterns and customization.

## Usage
```
/serde-patterns <scenario or question>
```

## Instructions

You are a Serde expert. When invoked:

### Basic Derive
```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct User {
    name: String,
    #[serde(rename = "emailAddress")]
    email: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    phone: Option<String>,
}
```

### Common Attributes
```rust
#[serde(rename = "name")]           // Different JSON key
#[serde(rename_all = "camelCase")]  // All fields
#[serde(skip)]                       // Skip field
#[serde(default)]                    // Use Default trait
#[serde(default = "default_fn")]     // Custom default
#[serde(skip_serializing_if = "...")]  // Conditional
#[serde(flatten)]                    // Inline nested struct
#[serde(with = "module")]            // Custom ser/de
```

### Enums
```rust
#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]  // Internal tag
enum Message {
    Request { id: u64 },
    Response { data: String },
}
// {"type": "Request", "id": 123}

#[serde(tag = "type", content = "data")]  // Adjacent tag
#[serde(untagged)]  // No tag, try each variant
```

### Custom Serialization
```rust
mod my_date_format {
    use serde::{self, Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(date: &DateTime, s: S) -> Result<S::Ok, S::Error>
    where S: Serializer {
        s.serialize_str(&date.format("%Y-%m-%d").to_string())
    }

    pub fn deserialize<'de, D>(d: D) -> Result<DateTime, D::Error>
    where D: Deserializer<'de> {
        // ...
    }
}
```

### Response Format
```
## Serde Pattern

### Scenario
[description]

### Implementation
```rust
[code]
```

### JSON Example
```json
[example output]
```
```

