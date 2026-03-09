use super::*;

#[path = "pages_curated_render.rs"]
mod render;
#[path = "pages_curated_support.rs"]
mod support;

use render::{render_curated_list_cards, render_curated_list_detail_content};
#[cfg(test)]
pub(super) use support::curated_item_href;
use support::{load_curated_list_items_source, load_curated_list_meta, load_curated_lists_source};

#[must_use]
pub fn curated_lists_page() -> impl IntoView {
    let items = unit_resource(load_curated_lists_source);

    view! {
        <section class="page">
            <h1>"Curated Lists"</h1>
            <p class="lead">"Featured playlists, fan picks, and themed collections."</p>
            <Suspense
                fallback=move || {
                    loading_state(
                        "Loading curated lists",
                        "Fetching featured and themed collections.",
                    )
                }
            >
                {move || render_curated_list_cards(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

#[must_use]
pub fn curated_list_detail_page() -> impl IntoView {
    let list_id = route_param_or_default("listId");
    let seed_data_state = use_seed_data_state();
    let active_filter = RwSignal::new("all".to_string());
    let query = RwSignal::new(String::new());

    let list = Resource::new(list_id, |raw: String| async move {
        match parse_positive_i32_param(&raw, "listId") {
            Ok(id) => load_curated_list_meta(id).await,
            Err(_) => None,
        }
    });

    let items = Resource::new(list_id, |raw: String| async move {
        match parse_positive_i32_param(&raw, "listId") {
            Ok(id) => load_curated_list_items_source(id, 200).await,
            Err(_) => Vec::new(),
        }
    });

    #[cfg(feature = "hydrate")]
    {
        reset_filter_and_query_on_route_change(list_id, active_filter, query);
    }

    view! {
        <section class="page">
            {detail_nav("/lists", "Back to curated lists")}
            <h1>"Curated List Details"</h1>
            <p class="lead">"Highlights, context, and quick filtering for every item in this collection."</p>
            {move || render_route_param_subhead(
                "List ID",
                &list_id(),
                |raw: &str| parse_positive_i32_param(raw, "listId"),
            )}
            <Suspense
                fallback=move || {
                    loading_state(
                        "Loading curated list",
                        "Fetching list metadata and up to 200 ranked items.",
                    )
                }
            >
                {move || {
                    let list_meta = list.get().unwrap_or(None);
                    let list_items = items.get().unwrap_or_default();
                    if let Some(list_val) = list_meta {
                        render_curated_list_detail_content(list_val, list_items, active_filter, query)
                            .into_any()
                    } else if parse_positive_i32_param(&list_id(), "listId").is_err() {
                        view! {
                            <section class="status-card status-card--empty">
                                <p class="status-title">"Invalid list id"</p>
                                <p class="muted">
                                    "Use a positive integer list id in the URL to open list details."
                                </p>
                                <p><a class="result-label" href="/lists">"Browse curated lists"</a></p>
                            </section>
                        }
                            .into_any()
                    } else {
                        render_import_or_missing_with_link(
                            seed_data_state,
                            "Curated list details are still loading",
                            "List not found",
                            "This curated list id could not be resolved.",
                            "/lists",
                            "Browse curated lists",
                        )
                    }
                }}
            </Suspense>
        </section>
    }
}
