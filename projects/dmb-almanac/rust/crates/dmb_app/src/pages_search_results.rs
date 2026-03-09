use super::*;

#[derive(Clone, Copy, Default)]
struct SearchResultCounts {
    all: usize,
    songs: usize,
    shows: usize,
    venues: usize,
    tours: usize,
    guests: usize,
    releases: usize,
}

fn render_search_filter_buttons(
    active_filter: RwSignal<String>,
    counts: SearchResultCounts,
) -> impl IntoView {
    let button_data = [
        ("all", "All", counts.all, false),
        ("song", "Songs", counts.songs, counts.songs == 0),
        ("show", "Shows", counts.shows, counts.shows == 0),
        ("venue", "Venues", counts.venues, counts.venues == 0),
        ("tour", "Tours", counts.tours, counts.tours == 0),
        ("guest", "Guests", counts.guests, counts.guests == 0),
        ("release", "Releases", counts.releases, counts.releases == 0),
    ];

    view! {
        <div
            class="result-filters"
            role="group"
            aria-label="Search result filters"
            aria-controls="search-results-list"
        >
            {button_data
                .into_iter()
                .map(|(value, label, count, disabled)| {
                    let class_active_filter = active_filter.clone();
                    let aria_active_filter = active_filter.clone();
                    let click_active_filter = active_filter.clone();

                    view! {
                        <button
                            type="button"
                            class="result-filter pill pill--ghost"
                            class:result-filter--active=move || {
                                class_active_filter.get() == value
                            }
                            aria-pressed=move || aria_active_filter.get() == value
                            disabled=disabled
                            on:click=move |_| click_active_filter.set(value.to_string())
                        >
                            {format!("{label} ({count})")}
                        </button>
                    }
                })
                .collect::<Vec<_>>()}
        </div>
    }
}

pub(super) fn render_search_results_content(
    items: Vec<SearchResult>,
    query: &str,
    active_filter: RwSignal<String>,
) -> impl IntoView {
    let query = query.to_string();

    if items.is_empty() && !query.is_empty() {
        return empty_state("No results", "Try a different query or shorter phrase.").into_any();
    }
    if items.is_empty() {
        return empty_state(
            "Start typing",
            "Search songs, shows, venues, guests, tours, and releases.",
        )
        .into_any();
    }

    let mut counts = SearchResultCounts {
        all: items.len(),
        ..SearchResultCounts::default()
    };
    for item in &items {
        match item.result_type.as_str() {
            "song" => counts.songs += 1,
            "show" => counts.shows += 1,
            "venue" => counts.venues += 1,
            "tour" => counts.tours += 1,
            "guest" => counts.guests += 1,
            "release" => counts.releases += 1,
            _ => {}
        }
    }
    let selected_filter = normalize_search_filter(&active_filter.get());
    let selected_filter_ref = selected_filter.as_str();
    let filtered_items: Vec<_> = items
        .into_iter()
        .filter(|item| selected_filter_ref == "all" || item.result_type == selected_filter_ref)
        .collect();
    let filtered_count = filtered_items.len();
    let summary_label = match selected_filter.as_str() {
        "all" => "all results",
        "song" => "songs",
        "venue" => "venues",
        "tour" => "tours",
        "guest" => "guests",
        "release" => "releases",
        "show" => "shows",
        _ => "results",
    };
    let filtered_results = if filtered_items.is_empty() {
        let reset_filter = active_filter.clone();
        view! {
            <section class="status-card status-card--empty">
                <p class="status-title">"No results in this category"</p>
                <p class="muted">"Try another filter or switch back to All results."</p>
                <p>
                    <button
                        type="button"
                        class="pill pill--ghost"
                        on:click=move |_| reset_filter.set("all".to_string())
                    >
                        "Show all results"
                    </button>
                </p>
            </section>
        }
        .into_any()
    } else {
        view! {
            <ul id="search-results-list" class="result-list">
                {filtered_items
                    .into_iter()
                    .map(|item| {
                        let href = search_result_href(&item);
                        let SearchResult {
                            result_type: kind,
                            label,
                            score,
                            ..
                        } = item;
                        let label_view = match href {
                            Some(link) => {
                                view! { <a class="result-label" href=link>{label}</a> }.into_any()
                            }
                            None => {
                                view! { <span class="result-label">{label}</span> }.into_any()
                            }
                        };
                        let score_text = format!("{score:.2}");
                        view! {
                            <li class="result-card">
                                <span class="pill">{kind}</span>
                                <div class="result-body">
                                    {label_view}
                                </div>
                                <span class="result-score">{score_text}</span>
                            </li>
                        }
                    })
                    .collect::<Vec<_>>()}
            </ul>
        }
        .into_any()
    };

    view! {
        <>
            {render_search_filter_buttons(active_filter.clone(), counts)}
            <p class="list-summary" role="status" aria-live="polite">
                {format!("Showing {filtered_count} {summary_label} for \"{query}\"")}
            </p>
            {filtered_results}
        </>
    }
    .into_any()
}
