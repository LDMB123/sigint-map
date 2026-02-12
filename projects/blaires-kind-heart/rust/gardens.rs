// Gardens Module
// Quest chain gardens with 5-stage visual growth progression

use web_sys::console;
use wasm_bindgen::closure::Closure;

// Phase 4.1: Const array for stage labels (saves 5-8ms per grid render)
const STAGE_LABELS: [&str; 5] = [
    "Stage 1 of 5",
    "Stage 2 of 5",
    "Stage 3 of 5",
    "Stage 4 of 5",
    "Stage 5 of 5",
];

// Garden definition
pub struct Garden {
    pub id: &'static str,
    pub garden_name: &'static str,
    pub quest_chain_id: &'static str,
    pub theme_emoji: &'static str,
    asset_key: &'static str, // Key for looking up stages in asset manifest
}

impl Garden {
    /// Get asset path for a specific stage (1-5)
    pub fn get_stage_asset(&self, stage: u32) -> Option<&'static str> {
        crate::assets::get_garden_asset(self.asset_key, stage)
    }

    /// Get all 5 stage assets for this garden
    #[allow(dead_code)]  // Reserved for future batch preloading
    pub fn get_all_stage_assets(&self) -> [Option<&'static str>; 5] {
        crate::assets::get_garden_stages(self.asset_key)
    }
}

pub const GARDENS: &[Garden] = &[
    // Hug skill gardens (2 chains)
    Garden {
        id: "garden-hug-1",
        garden_name: "Bunny Garden",
        quest_chain_id: "chain-hug-1",
        theme_emoji: "🐰",
        asset_key: "bunny",
    },
    Garden {
        id: "garden-hug-2",
        garden_name: "Hug Garden",
        quest_chain_id: "chain-hug-2",
        theme_emoji: "🤗",
        asset_key: "hug",
    },
    // Sharing skill gardens (2 chains)
    Garden {
        id: "garden-sharing-1",
        garden_name: "Share Garden",
        quest_chain_id: "chain-sharing-1",
        theme_emoji: "🎁",
        asset_key: "share",
    },
    Garden {
        id: "garden-sharing-2",
        garden_name: "Balloon Garden",
        quest_chain_id: "chain-sharing-2",
        theme_emoji: "🎈",
        asset_key: "balloon",
    },
    // Helping skill gardens (2 chains)
    Garden {
        id: "garden-helping-1",
        garden_name: "Helper's Garden",
        quest_chain_id: "chain-helping-1",
        theme_emoji: "🆘",
        asset_key: "helper",
    },
    Garden {
        id: "garden-helping-2",
        garden_name: "Star Garden",
        quest_chain_id: "chain-helping-2",
        theme_emoji: "⭐",
        asset_key: "star",
    },
    // Nice Words skill gardens (2 chains)
    Garden {
        id: "garden-nice-words-1",
        garden_name: "Kind Words Garden",
        quest_chain_id: "chain-nice-words-1",
        theme_emoji: "💬",
        asset_key: "kind_words",
    },
    Garden {
        id: "garden-nice-words-2",
        garden_name: "Magic Garden",
        quest_chain_id: "chain-nice-words-2",
        theme_emoji: "✨",
        asset_key: "magic",
    },
    // Love skill gardens (2 chains)
    Garden {
        id: "garden-love-1",
        garden_name: "Heart Garden",
        quest_chain_id: "chain-love-1",
        theme_emoji: "❤️",
        asset_key: "heart",
    },
    Garden {
        id: "garden-love-2",
        garden_name: "Rainbow Garden",
        quest_chain_id: "chain-love-2",
        theme_emoji: "🌈",
        asset_key: "rainbow",
    },
    // Unicorn skill gardens (2 chains)
    Garden {
        id: "garden-unicorn-1",
        garden_name: "Unicorn Garden",
        quest_chain_id: "chain-unicorn-1",
        theme_emoji: "🦄",
        asset_key: "unicorn",
    },
    Garden {
        id: "garden-unicorn-2",
        garden_name: "Dream Garden",
        quest_chain_id: "chain-unicorn-2",
        theme_emoji: "💫",
        asset_key: "dream",
    },
];

/// Initialize gardens module
pub fn init() {
    console::log_1(&"[gardens] Module initialized".into());
    
    // Set up Navigation API listener for panel open event
    use wasm_bindgen::JsCast;
    let window = web_sys::window().expect("window");
    let navigation = js_sys::Reflect::get(&window, &"navigation".into())
        .ok()
        .and_then(|nav| nav.dyn_into::<web_sys::EventTarget>().ok());
    
    if let Some(nav_target) = navigation {
        // Store listener in thread_local to avoid WASM memory leak from forget()
        type NavListener = wasm_bindgen::closure::Closure<dyn FnMut(web_sys::Event)>;

        thread_local! {
            static NAV_LISTENER: std::cell::RefCell<Option<NavListener>> = const { std::cell::RefCell::new(None) };
        }

        let listener = Closure::wrap(Box::new(move |_event: web_sys::Event| {
            // Check if gardens panel is now visible
            if let Some(panel) = crate::dom::query("#panel-gardens") {
                if !panel.has_attribute("hidden") {
                    wasm_bindgen_futures::spawn_local(async {
                        populate_gardens_grid().await;
                        // Phase 4.7: Initialize lazy loading for garden images after grid is populated
                        crate::lazy_loading::init_gardens();
                    });
                }
            }
        }) as Box<dyn FnMut(_)>);

        let _ = nav_target.add_event_listener_with_callback(
            "navigate",
            listener.as_ref().unchecked_ref()
        );

        // Store in thread_local instead of forget() to avoid permanent leak
        NAV_LISTENER.with(|cell| *cell.borrow_mut() = Some(listener));
    }
    
    render_gardens_panel();
}

/// Unlock a garden (called when quest chain completes)
// Dead Code Cleanup: Unused garden progression functions (planned future features)
#[allow(dead_code)]
pub async fn unlock_garden(quest_chain_id: &str) {
    use crate::db_client;

    // Find garden for this quest chain
    if let Some(garden) = GARDENS.iter().find(|g| g.quest_chain_id == quest_chain_id) {
        let now = js_sys::Date::now() as i64;
        let sql = "INSERT OR REPLACE INTO gardens (id, garden_name, quest_chain_id, theme_emoji, growth_stage, unlocked_at) VALUES (?1, ?2, ?3, ?4, 0, ?5)";
        let params = vec![
            garden.id.into(),
            garden.garden_name.into(),
            garden.quest_chain_id.into(),
            garden.theme_emoji.into(),
            now.to_string(),
        ];

        match db_client::exec(sql, params).await {
            Ok(_) => {
                console::log_1(&format!("[gardens] Unlocked garden: {}", garden.garden_name).into());
                celebrate_garden_unlock(garden.garden_name, garden.theme_emoji);
            }
            Err(e) => {
                console::error_1(&format!("[gardens] Failed to unlock garden: {:?}", e).into());
            }
        }
    }
}

/// Grow a garden (increment growth stage).
/// Returns early with a console error if garden_id is invalid or not found in DB.
#[allow(dead_code)]
pub async fn grow_garden(garden_id: &str) {
    use crate::db_client;

    // Validate garden_id exists in static definitions
    if !GARDENS.iter().any(|g| g.id == garden_id) {
        console::error_1(&format!("[gardens] Invalid garden_id: {} — not found in GARDENS definitions", garden_id).into());
        return;
    }

    // Get current growth stage — returns None if garden row doesn't exist in DB
    let check_sql = "SELECT growth_stage FROM gardens WHERE id = ?1";
    let current_stage: Option<i32> = match db_client::query(check_sql, vec![garden_id.into()]).await {
        Ok(rows) => rows.as_array()
            .and_then(|arr| arr.first())
            .and_then(|row| row.get("growth_stage"))
            // SQLite INTEGER -> JS Number -> serde_json f64 -> explicit i32 cast
            .and_then(|v| v.as_f64().map(|n| n as i32)),
        Err(e) => {
            console::error_1(&format!("[gardens] Failed to query growth_stage for {}: {:?}", garden_id, e).into());
            return;
        }
    };

    // If no row found, the garden hasn't been unlocked yet
    let Some(current_stage) = current_stage else {
        console::error_1(&format!("[gardens] Garden {} not found in DB — has it been unlocked?", garden_id).into());
        return;
    };

    if current_stage >= 5 {
        console::log_1(&format!("[gardens] Garden {} already at max growth", garden_id).into());
        return;
    }

    let new_stage = current_stage + 1;
    let sql = "UPDATE gardens SET growth_stage = ?1 WHERE id = ?2";
    let params = vec![new_stage.to_string(), garden_id.into()];

    match db_client::exec(sql, params).await {
        Ok(_) => {
            console::log_1(&format!("[gardens] Garden {} grew to stage {}", garden_id, new_stage).into());

            // Refresh UI if panel is open
            if let Some(panel) = crate::dom::query("#panel-gardens") {
                if !panel.has_attribute("hidden") {
                    populate_gardens_grid().await;
                }
            }

            if new_stage == 5 {
                celebrate_garden_completion(garden_id);
            }
        }
        Err(e) => {
            console::error_1(&format!("[gardens] Failed to grow garden: {:?}", e).into());
        }
    }
}

/// Celebrate garden unlock with confetti + speech
fn celebrate_garden_unlock(garden_name: &str, emoji: &str) {
    use crate::{confetti, speech};

    confetti::celebrate(confetti::CelebrationTier::Epic);
    let message = format!("{} A new garden blooms! {}", emoji, garden_name);
    speech::celebrate(&message);
}

/// Celebrate garden reaching full growth
#[allow(dead_code)]
fn celebrate_garden_completion(garden_id: &str) {
    use crate::{confetti, speech};

    if let Some(garden) = GARDENS.iter().find(|g| g.id == garden_id) {
        confetti::celebrate(confetti::CelebrationTier::Epic);
        let message = format!("{} {} is in full bloom!", garden.theme_emoji, garden.garden_name);
        speech::celebrate(&message);
    }
}

/// Get all unlocked gardens with growth stages.
/// growth_stage is returned as i32 (0-5 range) to match render_garden_card's parameter type.
/// SQLite INTEGER deserializes as f64 via serde_json; explicit cast via as_f64().map(|n| n as i32).
pub async fn get_unlocked_gardens() -> Vec<(String, String, i32)> {
    use crate::db_client;

    let sql = "SELECT id, garden_name, growth_stage FROM gardens WHERE unlocked_at IS NOT NULL ORDER BY unlocked_at DESC";
    match db_client::query(sql, vec![]).await {
        Ok(rows) => rows
            .as_array()
            .map(|arr| arr
                .iter()
                .filter_map(|row| {
                    let id = row.get("id")?.as_str()?.to_string();
                    let name = row.get("garden_name")?.as_str()?.to_string();
                    // SQLite INTEGER -> JS Number -> serde_json f64 -> explicit i32 cast
                    let stage = row.get("growth_stage")?.as_f64().map(|n| n as i32)?;
                    Some((id, name, stage))
                })
                .collect()
            )
            .unwrap_or_default(),
        Err(_) => vec![],
    }
}

/// Render garden panel UI structure
fn render_gardens_panel() {
    use crate::dom;
    
    if let Some(body) = dom::query("[data-gardens-body]") {
        // Create intro paragraph
        let doc = dom::document();
        let intro = doc.create_element("p").expect("p");
        intro.set_text_content(Some("Complete quest chains to unlock beautiful gardens! Watch them grow as you practice kindness."));
        let _ = intro.set_attribute("class", "gardens-intro");
        
        // Create grid container
        let grid = doc.create_element("div").expect("div");
        let _ = grid.set_attribute("data-gardens-grid", "");
        let _ = grid.set_attribute("class", "gardens-grid");
        
        // Append to body
        let _ = body.append_child(&intro);
        let _ = body.append_child(&grid);
    }
}

/// Populate gardens grid with unlocked gardens
async fn populate_gardens_grid() {
    use crate::dom;
    
    let Some(grid) = dom::query("[data-gardens-grid]") else {
        console::error_1(&"[gardens] Grid element not found".into());
        return;
    };
    
    // Get unlocked gardens from DB
    let gardens = get_unlocked_gardens().await;
    
    // Clear grid
    grid.set_inner_html("");
    
    // Render empty state if no gardens
    if gardens.is_empty() {
        let doc = dom::document();
        let empty = doc.create_element("div").expect("div");
        let _ = empty.set_attribute("class", "gardens-empty");
        empty.set_inner_html(r#"
            <p class="gardens-empty-emoji">🌱</p>
            <p class="gardens-empty-text">Complete quest chains to unlock your first garden!</p>
        "#);
        let _ = grid.append_child(&empty);
        return;
    }
    
    // Render card for each garden
    for garden_data in gardens {
        if let Some(garden) = GARDENS.iter().find(|g| g.id == garden_data.0) {
            let card = render_garden_card(garden, garden_data.2);
            let _ = grid.append_child(&card);
        }
    }
}

/// Render individual garden card
fn render_garden_card(garden: &Garden, growth_stage: i32) -> web_sys::Element {
    use crate::dom;
    use crate::render;
    
    let doc = dom::document();
    
    // Create card container
    let card = doc.create_element("div").expect("div");
    let _ = card.set_attribute("class", "garden-card");
    let _ = card.set_attribute("data-garden-id", garden.id);
    // Phase 4.7: Mark for IntersectionObserver lazy loading
    let _ = card.set_attribute("data-garden-card", "");
    
    // Header with emoji and name
    let header = doc.create_element("div").expect("div");
    let _ = header.set_attribute("class", "garden-card-header");
    header.set_text_content(Some(&format!("{} {}", garden.theme_emoji, garden.garden_name)));
    let _ = card.append_child(&header);
    
    // Image container
    let img_container = doc.create_element("div").expect("div");
    let _ = img_container.set_attribute("class", "garden-image-container");
    
    // Map growth_stage (0-5) to stage number (1-5)
    // Clamp to valid range and convert to 1-indexed
    let stage = growth_stage.clamp(0, 5);
    let stage_num = if stage == 0 { 1 } else { stage };

    let asset_path = garden.get_stage_asset(stage_num as u32)
        .unwrap_or("assets/gardens/default_stage_1.webp");
    
    // Create image with error fallback
    let img = render::create_img(&doc, asset_path, &format!("{} garden", garden.garden_name), "");
    let _ = img.set_attribute("width", "300");
    let _ = img.set_attribute("height", "300");
    let _ = img.set_attribute("loading", "lazy");

    // Phase 4.7: Convert src to data-lazy-src for IntersectionObserver lazy loading
    if let Some(src) = img.get_attribute("src") {
        let _ = img.set_attribute("data-lazy-src", &src);
        let _ = img.remove_attribute("src");
    }
    
    // Add onerror handler for emoji fallback
    use wasm_bindgen::JsCast;
    if let Ok(html_img) = img.clone().dyn_into::<web_sys::HtmlImageElement>() {
        let emoji = garden.theme_emoji.to_string();
        let img_container_clone = img_container.clone();
        let error_closure = Closure::once(move || {
            // Use captured container reference instead of global query
            img_container_clone.set_inner_html(&format!(r#"<div class="garden-emoji-fallback">{}</div>"#, emoji));
        });
        // Use into_js_value() to transfer ownership to JS, avoiding WASM memory leak
        html_img.set_onerror(Some(error_closure.into_js_value().unchecked_ref()));
    }
    
    let _ = img_container.append_child(&img);
    let _ = card.append_child(&img_container);
    
    // Stage indicator - clamp to max 5 to prevent "Stage 6 of 5"
    let stage_text = doc.create_element("div").expect("div");
    let _ = stage_text.set_attribute("class", "garden-stage-text");
    let display_stage = std::cmp::min(growth_stage + 1, 5);
    // Phase 4.1: Use const array instead of format!() (eliminates allocation)
    let stage_label = STAGE_LABELS[(display_stage - 1) as usize];
    stage_text.set_text_content(Some(stage_label));
    let _ = card.append_child(&stage_text);
    
    // Progress bar
    let progress_bar = doc.create_element("div").expect("div");
    let _ = progress_bar.set_attribute("class", "garden-progress-bar");
    
    let progress_fill = doc.create_element("div").expect("div");
    let _ = progress_fill.set_attribute("class", "garden-progress-fill");
    let progress_percent = (growth_stage as f32 / 5.0 * 100.0) as i32;
    let _ = progress_fill.set_attribute("style", &format!("width: {}%", progress_percent));
    
    let _ = progress_bar.append_child(&progress_fill);
    let _ = card.append_child(&progress_bar);
    
    card
}

/// Seed gardens table on first boot
pub async fn seed_gardens() {
    use crate::db_client;

    // Check if already seeded
    let check_sql = "SELECT COUNT(*) as count FROM gardens";
    let count = match db_client::query(check_sql, vec![]).await {
        Ok(rows) => rows.as_array()
            .and_then(|arr| arr.first())
            .and_then(|row| row.get("count"))
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0),
        Err(_) => 0.0,
    };

    if count > 0.0 {
        console::log_1(&"[gardens] Gardens already seeded".into());
        return;
    }

    console::log_1(&"[gardens] Seeding test garden for development".into());

    let now = js_sys::Date::now() as i64;
    let sql = "INSERT INTO gardens (id, garden_name, quest_chain_id, theme_emoji, growth_stage, unlocked_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)";
    let params = vec![
        "garden-hug-1".into(),
        "Bunny Garden".into(),
        "chain-hug-1".into(),
        "🐰".into(),
        1.to_string(),
        now.to_string(),
    ];

    if let Err(e) = db_client::exec(sql, params).await {
        console::error_1(&format!("[gardens] Failed to seed: {:?}", e).into());
    }
}
