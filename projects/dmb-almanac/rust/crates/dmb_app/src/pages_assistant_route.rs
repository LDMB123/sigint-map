use super::*;

#[must_use]
pub fn assistant_page() -> impl IntoView {
    let (query, set_query) = signal(String::new());
    let embedding_index = RwSignal::new(None::<SharedEmbeddingIndex>);
    let results = RwSignal::new(Vec::<dmb_core::SearchResult>::new());

    #[cfg(feature = "hydrate")]
    {
        crate::browser::runtime_warmup::trigger_lazy_runtime_warmup();
        let embedding_index_signal = embedding_index.clone();
        spawn_local(async move {
            embedding_index_signal.set(crate::ai::load_embedding_index().await);
        });

        let index_signal = embedding_index.clone();
        let results_signal = results.clone();
        Effect::new(move |_| {
            let current_query = query.get();
            let current_index = index_signal.get();
            spawn_local(async move {
                let trimmed = current_query.trim().to_string();
                let items = if trimmed.len() < 2 {
                    Vec::new()
                } else if let Some(index) = current_index {
                    crate::ai::semantic_search(&trimmed, &index, 8).await
                } else {
                    Vec::new()
                };
                results_signal.set(items);
            });
        });
    }

    view! {
        <section class="page">
            <h1>"AI Assistant"</h1>
            <p class="lead">"Offline-first semantic recommendations and answers."</p>
            {move || {
                match embedding_index.get() {
                    None => {
                        loading_state(
                            "Loading embedding index",
                            "Preparing local vector search.",
                        )
                            .into_any()
                    }
                    Some(index) => view! {
                        <p class="list-summary">
                            "Embedding vectors loaded: "
                            {index.records.len()}
                            " (dim "
                            {index.dim}
                            ")"
                        </p>
                    }
                    .into_any(),
                }
            }}

            <div class="assistant-search">
                <input
                    class="search-input"
                    type="search"
                    placeholder="Ask about a song, show, venue..."
                    prop:value=move || query.get()
                    on:input=move |ev| set_query.set(event_target_value(&ev))
                />
            </div>
            {move || render_assistant_results(&query.get(), results.get())}
        </section>
    }
}

fn render_assistant_results(query: &str, items: Vec<dmb_core::SearchResult>) -> impl IntoView {
    let trimmed = query.trim().to_string();
    if trimmed.len() < 2 {
        return empty_state(
            "Ask a question",
            "Type at least two characters to see semantic recommendations.",
        )
        .into_any();
    }
    if items.is_empty() {
        return empty_state(
            "No semantic matches yet",
            "Try a broader phrase, song title, venue name, or year.",
        )
        .into_any();
    }
    let count = items.len();
    view! {
        <>
            <p class="list-summary">
                {format!("Showing {count} semantic matches for \"{trimmed}\"")}
            </p>
            <ul class="result-list">
                {items
                    .into_iter()
                    .map(|item| {
                        let label = item.label.clone();
                        let kind = item.result_type.clone();
                        let href = search_result_href(&item);
                        view! {
                            <li class="result-card">
                                <span class="pill">{kind}</span>
                                <div class="result-body">
                                    {move || match &href {
                                        Some(link) => view! {
                                            <a class="result-label" href=link.clone()>{label.clone()}</a>
                                        }
                                        .into_any(),
                                        None => view! { <span class="result-label">{label.clone()}</span> }.into_any(),
                                    }}
                                </div>
                                <span class="result-score">{format!("{:.2}", item.score)}</span>
                            </li>
                        }
                    })
                    .collect::<Vec<_>>()}
            </ul>
        </>
    }
    .into_any()
}
