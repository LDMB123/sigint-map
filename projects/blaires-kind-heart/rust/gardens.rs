use crate::{db_client, dom, render};
use std::fmt::Write;
use wasm_bindgen::{closure::Closure, JsCast};
pub struct Garden {
    pub id: &'static str,
    pub garden_name: &'static str,
    pub theme_emoji: &'static str,
    asset_key: &'static str,
}
impl Garden {
    fn get_stage_asset(&self, stage: u32) -> Option<&'static str> {
        crate::assets::get_garden_asset(self.asset_key, stage)
    }
}
pub const GARDENS: &[Garden] = &[
    Garden {
        id: "garden-hug-1",
        garden_name: "Bunny Garden",
        theme_emoji: "🐰",
        asset_key: "bunny",
    },
    Garden {
        id: "garden-hug-2",
        garden_name: "Hug Garden",
        theme_emoji: "🤗",
        asset_key: "hug",
    },
    Garden {
        id: "garden-sharing-1",
        garden_name: "Share Garden",
        theme_emoji: "🎁",
        asset_key: "share",
    },
    Garden {
        id: "garden-sharing-2",
        garden_name: "Balloon Garden",
        theme_emoji: "🎈",
        asset_key: "balloon",
    },
    Garden {
        id: "garden-helping-1",
        garden_name: "Helper's Garden",
        theme_emoji: "🆘",
        asset_key: "helper",
    },
    Garden {
        id: "garden-helping-2",
        garden_name: "Star Garden",
        theme_emoji: "⭐",
        asset_key: "star",
    },
    Garden {
        id: "garden-nice-words-1",
        garden_name: "Kind Words Garden",
        theme_emoji: "💬",
        asset_key: "kind_words",
    },
    Garden {
        id: "garden-nice-words-2",
        garden_name: "Magic Garden",
        theme_emoji: "✨",
        asset_key: "magic",
    },
    Garden {
        id: "garden-love-1",
        garden_name: "Heart Garden",
        theme_emoji: "❤️",
        asset_key: "heart",
    },
    Garden {
        id: "garden-love-2",
        garden_name: "Rainbow Garden",
        theme_emoji: "🌈",
        asset_key: "rainbow",
    },
    Garden {
        id: "garden-unicorn-1",
        garden_name: "Unicorn Garden",
        theme_emoji: "🦄",
        asset_key: "unicorn",
    },
    Garden {
        id: "garden-unicorn-2",
        garden_name: "Dream Garden",
        theme_emoji: "💫",
        asset_key: "dream",
    },
];
pub fn init() {
    let doc = dom::document();
    dom::on(
        doc.unchecked_ref(),
        crate::constants::EVENT_PANEL_OPENED,
        |event: web_sys::Event| {
            let evt: &web_sys::CustomEvent = event.unchecked_ref();
            let detail = evt.detail();
            let target = js_sys::Reflect::get(&detail, &"target_panel".into())
                .ok()
                .and_then(|v| v.as_string());
            if target.as_deref() == Some("panel-gardens") {
                crate::browser_apis::spawn_local_logged("gardens-refresh", async {
                    populate_gardens_grid().await;
                    crate::lazy_loading::init_gardens();
                    Ok(())
                });
            }
        },
    );
    render_gardens_panel();
}
async fn get_unlocked_gardens() -> Vec<(String, String, i32)> {
    let sql = "SELECT id, garden_name, growth_stage FROM gardens WHERE unlocked_at IS NOT NULL ORDER BY unlocked_at DESC";
    match db_client::query(sql, vec![]).await {
        Ok(rows) => rows
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|row| {
                        let id = row.get("id")?.as_str()?.to_string();
                        let name = row.get("garden_name")?.as_str()?.to_string();
                        let stage = row.get("growth_stage")?.as_f64().map(|n| n as i32)?;
                        Some((id, name, stage))
                    })
                    .collect()
            })
            .unwrap_or_default(),
        Err(_) => vec![],
    }
}
fn render_gardens_panel() {
    if let Some(body) = dom::query("[data-gardens-body]") {
        let doc = dom::document();
        if let Some(intro) = render::text_el(&doc, "p", "gardens-intro", "Complete quest chains to unlock beautiful gardens! Watch them grow as you practice kindness.") { let _ = body.append_child(&intro); }
        if let Some(grid) =
            render::create_el_with_data(&doc, "div", "gardens-grid", "data-gardens-grid")
        {
            let _ = body.append_child(&grid);
        }
    }
}
async fn populate_gardens_grid() {
    let Some(grid) = dom::query("[data-gardens-grid]") else {
        dom::warn("[gardens] Grid element not found");
        return;
    };
    let gardens = get_unlocked_gardens().await;
    dom::safe_set_inner_html(&grid, "");
    let doc = dom::document();
    if gardens.is_empty() {
        if let Some(empty) = render::create_el_with_class(&doc, "div", "gardens-empty") {
            dom::safe_set_inner_html(
                &empty,
                r#" <p class="gardens-empty-emoji">🌱</p> <p class="gardens-empty-text">Complete quest chains to unlock your first garden!</p> "#,
            );
            let _ = grid.append_child(&empty);
        }
        return;
    }
    let frag = doc.create_document_fragment();
    for garden_data in gardens {
        if let Some(garden) = GARDENS.iter().find(|g| g.id == garden_data.0) {
            if let Some(card) = render_garden_card(garden, garden_data.2) {
                let _ = frag.append_child(&card);
            }
        }
    }
    let _ = grid.append_child(&frag);
}
fn render_garden_card(garden: &Garden, growth_stage: i32) -> Option<web_sys::Element> {
    let doc = dom::document();
    let card = render::create_el_with_class(&doc, "div", "garden-card")?;
    dom::set_attr(&card, "data-garden-id", garden.id);
    dom::set_attr(&card, "data-garden-card", "");
    dom::with_buf(|buf| {
        let _ = write!(buf, "{} {}", garden.theme_emoji, garden.garden_name);
        render::append_text(&doc, &card, "div", "garden-card-header", buf);
    });
    let img_container = render::create_el_with_class(&doc, "div", "garden-image-container")?;
    let stage = growth_stage.clamp(0, 5);
    let stage_num = if stage == 0 { 1 } else { stage };
    let asset_path = garden
        .get_stage_asset(stage_num as u32)
        .unwrap_or("gardens/bunny_stage_1.webp");
    let img = dom::with_buf(|buf| {
        let _ = write!(buf, "{} garden", garden.garden_name);
        render::create_img(&doc, asset_path, buf, "")
    })?;
    for (k, v) in [("width", "300"), ("height", "300"), ("loading", "lazy")] {
        dom::set_attr(&img, k, v);
    }
    if let Some(src) = dom::get_attr(&img, "src") {
        dom::set_attr(&img, "data-lazy-src", &src);
        dom::remove_attr(&img, "src");
    }
    if let Ok(html_img) = img.clone().dyn_into::<web_sys::HtmlImageElement>() {
        let emoji = garden.theme_emoji.to_string();
        let img_container_clone = img_container.clone();
        let error_closure = Closure::once(move || {
            let doc = dom::document();
            if let Some(fallback) = render::create_el_with_class(&doc, "div", "garden-emoji-fallback") {
                fallback.set_text_content(Some(&emoji));
                img_container_clone.set_text_content(None); // clear broken img
                let _ = img_container_clone.append_child(&fallback);
            }
        });
        html_img.set_onerror(Some(error_closure.into_js_value().unchecked_ref()));
    }
    let _ = img_container.append_child(&img);
    let _ = card.append_child(&img_container);
    let stage_text = render::create_el_with_class(&doc, "div", "garden-stage-text")?;
    let display_stage = std::cmp::min(growth_stage + 1, 5);
    dom::with_buf(|buf| {
        let _ = write!(buf, "Stage {display_stage} of 5");
        stage_text.set_text_content(Some(buf));
    });
    let _ = card.append_child(&stage_text);
    let progress_bar = render::create_el_with_class(&doc, "div", "garden-progress-bar")?;
    let progress_fill = render::create_el_with_class(&doc, "div", "garden-progress-fill")?;
    let progress_percent = (growth_stage as f32 / 5.0 * 100.0) as i32;
    dom::with_buf(|buf| {
        let _ = write!(buf, "width: {progress_percent}%");
        dom::set_attr(&progress_fill, "style", buf);
    });
    let _ = progress_bar.append_child(&progress_fill);
    let _ = card.append_child(&progress_bar);
    Some(card)
}
pub async fn seed_gardens() {
    let check_sql = "SELECT COUNT(*) as count FROM gardens";
    let count = match db_client::query(check_sql, vec![]).await {
        Ok(rows) => db_client::extract_count(&rows, "count") as f64,
        Err(_) => 0.0,
    };
    if count > 0.0 {
        return;
    }
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
        dom::warn(&format!("[gardens] Failed to seed: {e:?}"));
    }
}
