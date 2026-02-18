//! Companion skin system — unlockable transformations via badge achievements.
//!
//! 6 skins total (default + 5 unlockables). Each skin has 3 expressions (happy, curious, celebrating).
//! Uses View Transitions API (Safari 26.2) for smooth transformations.
//!
//! ## Unlock Flow
//! 1. Badge earned → `check_and_unlock_skin()` checks SKINS array
//! 2. If match found → `unlock_skin()` updates DB
//! 3. Render transformation animation with View Transitions
//!
//! ## Storage
//! - Definitions: Const `SKINS` array (6 entries)
//! - State: SQLite `companion_skins` table (unlocked + active flags)
//! - Assets: WebP files in `assets/companions/` (18 total = 6 skins × 3 expressions)

use wasm_bindgen::prelude::*;
use web_sys::console;

// Companion skin definitions
pub struct CompanionSkin {
    pub id: &'static str,
    pub skin_name: &'static str,
    pub unlock_badge_id: Option<&'static str>,
}

impl CompanionSkin {
    /// Get the asset path for a specific expression
    pub fn get_asset(&self, expression: &str) -> Option<&'static str> {
        crate::assets::get_companion_asset(self.id, expression)
    }
}

pub const SKINS: &[CompanionSkin] = &[
    CompanionSkin {
        id: "default",
        skin_name: "Default Sparkle",
        unlock_badge_id: None, // Always unlocked
    },
    CompanionSkin {
        id: "unicorn",
        skin_name: "Unicorn Sparkle",
        unlock_badge_id: Some("badge-unicorn-week"),
    },
    CompanionSkin {
        id: "rainbow",
        skin_name: "Rainbow Sparkle",
        unlock_badge_id: Some("badge-super-day"),
    },
    CompanionSkin {
        id: "galaxy",
        skin_name: "Galaxy Sparkle",
        unlock_badge_id: Some("badge-30-day-streak"),
    },
    CompanionSkin {
        id: "crystal",
        skin_name: "Crystal Sparkle",
        unlock_badge_id: Some("badge-story-master"),
    },
    CompanionSkin {
        id: "golden",
        skin_name: "Golden Sparkle",
        unlock_badge_id: Some("badge-kindness-master"),
    },
];

/// Initialize companion skins module
pub fn init() {
    console::log_1(&"[companion_skins] Module initialized".into());
}

/// Check if a badge unlock should trigger a skin unlock
pub async fn check_and_unlock_skin(badge_id: &str) {
    // Find skin that unlocks with this badge
    if let Some(skin) = SKINS.iter().find(|s| s.unlock_badge_id == Some(badge_id)) {
        unlock_skin(skin.id).await;
    }
}

/// Unlock a companion skin
async fn unlock_skin(skin_id: &str) {
    use crate::db_client;

    let sql = "UPDATE companion_skins SET is_unlocked = 1 WHERE id = ?1";
    match db_client::exec(sql, vec![skin_id.into()]).await {
        Ok(_) => {
            console::log_1(&format!("[companion_skins] Unlocked skin: {}", skin_id).into());
            render_transformation_animation(skin_id);
        }
        Err(e) => {
            console::error_1(&format!("[companion_skins] Failed to unlock skin: {:?}", e).into());
        }
    }
}

/// Activate a specific skin (set as current)
#[allow(dead_code)]
pub async fn activate_skin(skin_id: &str) {
    use crate::db_client;

    // Verify skin exists and is unlocked before activating
    // SQLite stores booleans as INTEGER 0/1, which deserialize as f64 — never use as_bool()
    let check_sql = "SELECT is_unlocked FROM companion_skins WHERE id = ?1";
    let is_unlocked = match db_client::query(check_sql, vec![skin_id.into()]).await {
        Ok(rows) => rows.as_array()
            .and_then(|arr| arr.first())
            .and_then(|row| row.get("is_unlocked"))
            .and_then(|v| v.as_f64())
            .map(|n| n == 1.0)
            .unwrap_or(false),
        Err(e) => {
            console::error_1(&format!("[companion_skins] Failed to check skin unlock status: {:?}", e).into());
            return;
        }
    };

    if !is_unlocked {
        console::error_1(&format!("[companion_skins] Cannot activate locked skin: {}", skin_id).into());
        return;
    }

    // Deactivate all skins
    let _ = db_client::exec("UPDATE companion_skins SET is_active = 0", vec![]).await;

    // Activate selected skin
    let sql = "UPDATE companion_skins SET is_active = 1 WHERE id = ?1";
    match db_client::exec(sql, vec![skin_id.into()]).await {
        Ok(_) => {
            console::log_1(&format!("[companion_skins] Activated skin: {}", skin_id).into());
            render_transformation_animation(skin_id);
        }
        Err(e) => {
            console::error_1(&format!("[companion_skins] Failed to activate skin: {:?}", e).into());
        }
    }
}

/// Render transformation animation using View Transitions API
fn render_transformation_animation(skin_id: &str) {
    use wasm_bindgen::JsCast;
    use web_sys::{window, HtmlElement};

    let window = window().expect("window");
    let document = window.document().expect("document");

    // Phase 2.4: Use cached companion element with fallback
    let companion = crate::state::get_cached_companion()
        .or_else(|| {
            document
                .query_selector("[data-companion]")
                .ok()
                .flatten()
        })
        .and_then(|el| el.dyn_into::<HtmlElement>().ok());

    if let Some(companion_el) = companion {
        // Verify skin exists
        if SKINS.iter().any(|s| s.id == skin_id) {
            // Clone for use after closure moves the original
            let companion_el_for_store = companion_el.clone();
            // Use View Transitions API for smooth transformation
            let skin_id_owned = skin_id.to_string();
            let closure = Closure::once(move || {
                // Set data attribute for CSS targeting
                companion_el.set_attribute("data-skin", &skin_id_owned).ok();

                // Enable View Transition name for this element
                companion_el
                    .style()
                    .set_property("view-transition-name", "companion-transform")
                    .ok();

                // Render new skin asset using companion module function
                crate::companion::render_companion_with_skin(&skin_id_owned, "happy");
            });

            // Trigger View Transition if supported (Safari 26.2)
            if let Ok(doc_any) = js_sys::Reflect::get(&document, &"startViewTransition".into()) {
                if !doc_any.is_undefined() {
                    // Try to convert to function - gracefully fallback if API shape unexpected
                    if let Ok(func) = doc_any.dyn_into::<js_sys::Function>() {
                        js_sys::Reflect::apply(
                            &func,
                            &document,
                            &js_sys::Array::of1(closure.as_ref()),
                        )
                        .ok();
                    }

                    // Store closure on companion element instead of forget()
                    // Allows GC to clean up when element is removed
                    let key = wasm_bindgen::JsValue::from_str("__vt_skin_closure");
                    let _ = js_sys::Reflect::set(&companion_el_for_store, &key, closure.as_ref().unchecked_ref());
                } else {
                    // Fallback: immediate change without View Transition
                    closure.as_ref().unchecked_ref::<js_sys::Function>().call0(&JsValue::NULL).ok();
                }
            }
        }
    }
}

/// Get current active skin.
/// Note: SQL `WHERE is_active = 1` handles the boolean comparison at the SQLite level.
/// SQLite stores booleans as INTEGER 0/1; never use `as_bool()` on these values in Rust
/// since they deserialize as `serde_json::Number`, not `serde_json::Bool`.
pub async fn get_active_skin() -> Option<String> {
    use crate::db_client;

    let sql = "SELECT id, is_active FROM companion_skins WHERE is_active = 1 LIMIT 1";
    match db_client::query(sql, vec![]).await {
        Ok(rows) => {
            let row = rows.as_array()
                .and_then(|arr| arr.first());

            // Double-check is_active using as_f64() — SQLite INTEGER deserializes as f64, not bool
            let active = row
                .and_then(|r| r.get("is_active"))
                .and_then(|v| v.as_f64())
                .map(|n| n == 1.0)
                .unwrap_or(false);

            if active {
                row.and_then(|r| r.get("id"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .or_else(|| Some("default".to_string()))
            } else {
                Some("default".to_string())
            }
        }
        Err(_) => Some("default".to_string()),
    }
}

/// Seed companion_skins table on first boot
pub async fn seed_companion_skins() {
    use crate::db_client;

    // Check if already seeded
    let check_sql = "SELECT COUNT(*) as count FROM companion_skins";
    let count = match db_client::query(check_sql, vec![]).await {
        Ok(rows) => db_client::extract_count(&rows, "count") as f64,
        Err(_) => 0.0,
    };

    if count > 0.0 {
        return; // Already seeded
    }

    console::log_1(&"[companion_skins] Seeding companion_skins table".into());

    // Insert all skins
    for skin in SKINS {
        let is_default = if skin.id == "default" { 1 } else { 0 };
        let sql = "INSERT INTO companion_skins (id, skin_name, unlock_badge_id, is_unlocked, is_active) VALUES (?1, ?2, ?3, ?4, ?5)";
        let params = vec![
            skin.id.to_string(),
            skin.skin_name.to_string(),
            skin.unlock_badge_id.unwrap_or("").to_string(),
            is_default.to_string(),
            is_default.to_string(),
        ];

        if let Err(e) = db_client::exec(sql, params).await {
            console::error_1(&format!("[companion_skins] Failed to seed skin {}: {:?}", skin.id, e).into());
        }
    }

    console::log_1(&"[companion_skins] Seeded 6 companion skins".into());
}
