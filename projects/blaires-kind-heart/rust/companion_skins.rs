use crate::{db_client, dom};
use wasm_bindgen::prelude::*;
pub struct CompanionSkin {
    pub id: &'static str,
    pub skin_name: &'static str,
    pub unlock_badge_id: Option<&'static str>,
}
impl CompanionSkin {
    pub fn get_asset(&self, expression: &str) -> Option<&'static str> {
        crate::assets::get_companion_asset(self.id, expression)
    }
}
pub const SKINS: &[CompanionSkin] = &[
    CompanionSkin {
        id: "default",
        skin_name: "Default Sparkle",
        unlock_badge_id: None,
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
pub async fn check_and_unlock_skin(badge_id: &str) {
    if let Some(skin) = SKINS.iter().find(|s| s.unlock_badge_id == Some(badge_id)) {
        unlock_skin(skin.id).await;
    }
}
async fn unlock_skin(skin_id: &str) {
    let sql = "UPDATE companion_skins SET is_unlocked = 1 WHERE id = ?1";
    match db_client::exec(sql, vec![skin_id.into()]).await {
        Ok(()) => {
            dom::warn(&format!("[companion_skins] Unlocked skin: {skin_id}"));
            render_transformation_animation(skin_id);
        }
        Err(e) => {
            dom::warn(&format!("[companion_skins] Failed to unlock skin: {e:?}"));
        }
    }
}
fn render_transformation_animation(skin_id: &str) {
    use wasm_bindgen::JsCast;
    use web_sys::HtmlElement;
    let Some(companion_el) =
        crate::companion::get_companion().and_then(|el| el.dyn_into::<HtmlElement>().ok())
    else {
        return;
    };
    let document = crate::dom::document();
    if SKINS.iter().any(|s| s.id == skin_id) {
        let companion_el_for_store = companion_el.clone();
        let skin_id_owned = skin_id.to_string();
        let closure = Closure::once(move || {
            crate::dom::set_attr(&companion_el, "data-skin", &skin_id_owned);
            companion_el
                .style()
                .set_property("view-transition-name", "companion-transform")
                .ok();
            crate::companion::render_companion_with_skin(&skin_id_owned, "happy");
        });
        if let Ok(doc_any) = js_sys::Reflect::get(&document, &"startViewTransition".into()) {
            if doc_any.is_undefined() {
                closure
                    .as_ref()
                    .unchecked_ref::<js_sys::Function>()
                    .call0(&JsValue::NULL)
                    .ok();
            } else {
                if let Ok(func) = doc_any.dyn_into::<js_sys::Function>() {
                    js_sys::Reflect::apply(&func, &document, &js_sys::Array::of1(closure.as_ref()))
                        .ok();
                }
                let key = wasm_bindgen::JsValue::from_str("__vt_skin_closure");
                let _ = js_sys::Reflect::set(
                    &companion_el_for_store,
                    &key,
                    closure.as_ref().unchecked_ref(),
                );
            }
        }
    }
}
pub async fn get_active_skin() -> Option<String> {
    let sql = "SELECT id, is_active FROM companion_skins WHERE is_active = 1 LIMIT 1";
    match db_client::query(sql, vec![]).await {
        Ok(rows) => {
            rows.as_array()
                .and_then(|arr| arr.first())
                .and_then(|r| r.get("id"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .or_else(|| Some("default".to_string()))
        }
        Err(_) => Some("default".to_string()),
    }
}
pub async fn seed_companion_skins() {
    let count =
        match db_client::query("SELECT COUNT(*) as count FROM companion_skins", vec![]).await {
            Ok(rows) => db_client::extract_count(&rows, "count") as f64,
            Err(_) => 0.0,
        };
    if count > 0.0 {
        return;
    }
    dom::warn("[companion_skins] Seeding companion_skins table");
    for skin in SKINS {
        let is_default = i32::from(skin.id == "default");
        let sql = "INSERT INTO companion_skins (id, skin_name, unlock_badge_id, is_unlocked, is_active) VALUES (?1, ?2, ?3, ?4, ?5)";
        let params = vec![
            skin.id.to_string(),
            skin.skin_name.to_string(),
            skin.unlock_badge_id.unwrap_or("").to_string(),
            is_default.to_string(),
            is_default.to_string(),
        ];
        if let Err(e) = db_client::exec(sql, params).await {
            dom::warn(&format!(
                "[companion_skins] Failed to seed skin {}: {e:?}",
                skin.id
            ));
        }
    }
    dom::warn("[companion_skins] Seeded 6 companion skins");
}

pub fn mood_to_expression(mood: &str) -> &'static str {
    match mood {
        "excited" => "celebrate",
        "happy" => "happy",
        _ => "encourage",
    }
}
