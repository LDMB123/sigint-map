use super::*;

#[path = "pages_assistant_route.rs"]
mod assistant;
#[path = "pages_search_results.rs"]
mod results;

pub use assistant::assistant_page;
use results::render_search_results_content;

#[must_use]
pub fn search_page() -> impl IntoView {
    let query = RwSignal::new(String::new());
    let active_filter = RwSignal::new(String::from("all"));
    let results = RwSignal::new(Vec::<SearchResult>::new());
    #[cfg(feature = "hydrate")]
    let search_url_ready = RwSignal::new(false);

    #[cfg(feature = "hydrate")]
    {
        crate::browser::runtime_warmup::trigger_lazy_runtime_warmup();
        let route_query = query.clone();
        let route_active_filter = active_filter.clone();
        let route_search_url_ready = search_url_ready.clone();
        Effect::new(move |_| {
            let route_destination = crate::browser::pwa::current_search_destination();
            let route_filter =
                normalize_search_filter(&current_search_param("type").unwrap_or_default());
            route_query.set(route_destination.query.unwrap_or_default());
            route_active_filter.set(route_filter);
            route_search_url_ready.set(true);
        });

        let sync_query = query.clone();
        let sync_active_filter = active_filter.clone();
        let sync_search_url_ready = search_url_ready.clone();
        Effect::new(move |_| {
            if !sync_search_url_ready.get() {
                return;
            }
            let query_value = sync_query.get();
            let query_trimmed = query_value.trim();
            let active_filter_value = sync_active_filter.get();
            let filter = normalize_search_filter(&active_filter_value);
            let pathname = crate::browser::runtime::location_pathname().unwrap_or_default();
            let hash = crate::browser::runtime::location_hash().unwrap_or_default();
            let next = crate::browser::pwa::build_search_location(
                &pathname,
                &hash,
                query_trimmed,
                &filter,
            );
            let current = format!(
                "{}{}{}",
                pathname,
                crate::browser::runtime::location_search().unwrap_or_default(),
                hash
            );
            if next == current {
                return;
            }
            let _ = crate::browser::runtime::history_replace_url(&next);
        });

        let embedding_index = RwSignal::new(None::<SharedEmbeddingIndex>);
        let search_run = RwSignal::new(0_u64);

        let embedding_index_signal = embedding_index.clone();
        spawn_local(async move {
            embedding_index_signal.set(crate::ai::load_embedding_index().await);
        });

        let search_query = query.clone();
        let search_results = results.clone();
        Effect::new(move |_| {
            let current_query = search_query.get();
            let current_index = embedding_index.get();
            let run_id = search_run.get_untracked().wrapping_add(1);
            search_run.set(run_id);
            let results_signal = search_results.clone();
            let search_run_signal = search_run.clone();

            spawn_local(async move {
                wait_ms(120).await;
                if search_run_signal.get_untracked() != run_id {
                    return;
                }

                let trimmed = current_query.trim().to_string();
                let items = if trimmed.is_empty() {
                    Vec::new()
                } else {
                    let prefix = dmb_idb::search_global(&trimmed).await.unwrap_or_default();
                    let semantic = if trimmed.chars().count() >= 2 {
                        if let Some(index) = current_index {
                            crate::ai::semantic_search(&trimmed, &index, 12).await
                        } else {
                            Vec::new()
                        }
                    } else {
                        Vec::new()
                    };
                    merge_search_results(prefix, semantic, 40)
                };

                if search_run_signal.get_untracked() != run_id {
                    return;
                }
                results_signal.set(items);
            });
        });
    }

    let value_query = query.clone();
    let input_query = query.clone();
    let input_filter = active_filter.clone();
    let render_query = query.clone();
    let render_filter = active_filter.clone();
    let render_results = results.clone();

    view! {
        <section class="page">
            <h1>"Search"</h1>
            <p class="lead">"Hybrid prefix + semantic search (offline-first)."</p>
            <input
                class="search-input"
                type="search"
                placeholder="Search songs, shows, venues..."
                prop:value=move || value_query.get()
                on:input=move |ev| {
                    let next = event_target_value(&ev);
                    if next.trim().is_empty() {
                        input_filter.set("all".to_string());
                    }
                    input_query.set(next);
                }
            />
            {move || {
                let query_value = render_query.get();
                render_search_results_content(
                    render_results.get(),
                    &query_value,
                    render_filter.clone(),
                )
            }}
        </section>
    }
}
