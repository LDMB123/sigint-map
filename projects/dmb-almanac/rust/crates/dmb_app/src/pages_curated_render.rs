use super::support::{
    curated_item_context, curated_item_href, curated_item_matches_query, curated_item_title,
    curated_item_type_counts, curated_item_type_label, normalized_curated_item_type,
};
use super::*;

pub(super) fn render_curated_list_cards(list: Vec<CuratedList>) -> impl IntoView {
    if list.is_empty() {
        return empty_state(
            "No curated lists available",
            "Featured list metadata is currently unavailable.",
        )
        .into_any();
    }
    let count = list.len();
    view! {
        <>
            <p class="list-summary">{format!("Showing {count} curated lists")}</p>
            <ul class="result-list">
                {list
                    .into_iter()
                    .map(|list| {
                        let href = format!("/lists/{}", list.id);
                        let item_count = list.item_count.unwrap_or(0);
                        view! {
                            <li class="result-card">
                                <span class="pill">{list.category.clone()}</span>
                                <div class="result-body">
                                    <a class="result-label" href=href>{list.title.clone()}</a>
                                    <span class="result-meta">{list.description.clone().unwrap_or_default()}</span>
                                </div>
                                <span class="result-score">{format!("{item_count} items")}</span>
                            </li>
                        }
                    })
                    .collect::<Vec<_>>()}
            </ul>
        </>
    }
    .into_any()
}

fn render_curated_filter_buttons(
    type_counts: Vec<(String, usize)>,
    active_filter: RwSignal<String>,
) -> impl IntoView {
    type_counts
        .into_iter()
        .map(|(type_key, count)| {
            let type_label = curated_item_type_label(&type_key);
            let key_for_class = type_key.clone();
            let key_for_aria = type_key.clone();
            let key_for_click = type_key.clone();
            view! {
                <button
                    type="button"
                    class="result-filter pill pill--ghost"
                    class:result-filter--active=move || active_filter.get() == key_for_class
                    aria-pressed=move || active_filter.get() == key_for_aria
                    on:click=move |_| active_filter.set(key_for_click.clone())
                >
                    {format!("{type_label} ({count})")}
                </button>
            }
        })
        .collect::<Vec<_>>()
}

fn render_curated_empty_state(
    has_filters: bool,
    active_filter: RwSignal<String>,
    query: RwSignal<String>,
) -> impl IntoView {
    view! {
        <section class="status-card status-card--empty">
            <p class="status-title">"No items match this view"</p>
            <p class="muted">"Try a different filter or clear the search query."</p>
            {has_filters.then(|| {
                view! {
                    <div class="pill-row">
                        <button
                            type="button"
                            class="pill pill--ghost"
                            on:click=move |_| {
                                active_filter.set("all".to_string());
                                query.set(String::new());
                            }
                        >
                            "Clear filters"
                        </button>
                    </div>
                }
            })}
        </section>
    }
    .into_any()
}

fn render_curated_item_rows(filtered_items: Vec<CuratedListItem>) -> impl IntoView {
    view! {
        <ol id="curated-list-results" class="tracklist" aria-label="Curated list items">
            {filtered_items
                .into_iter()
                .map(|item| {
                    let item_type = normalized_curated_item_type(&item.item_type);
                    let item_type_label = curated_item_type_label(&item_type);
                    let title = curated_item_title(&item);
                    let href = curated_item_href(&item);
                    let context = curated_item_context(&item);
                    let notes = item
                        .notes
                        .as_deref()
                        .map(str::trim)
                        .filter(|notes| !notes.is_empty())
                        .map(ToString::to_string);

                    let title_view = match href {
                        Some(href) => view! {
                            <a class="tracklist-title result-label" href=href>{title.clone()}</a>
                        }
                        .into_any(),
                        None => view! { <span class="tracklist-title">{title.clone()}</span> }.into_any(),
                    };

                    view! {
                        <li class="tracklist-item">
                            <span class="tracklist-pos">{item.position}</span>
                            <div class="tracklist-main">
                                {title_view}
                                {context.map(|context_line| view! {
                                    <span class="tracklist-context">{context_line}</span>
                                })}
                                {notes.map(|notes_line| view! {
                                    <span class="tracklist-note">{notes_line}</span>
                                })}
                            </div>
                            <span class="setlist-slot">{item_type_label}</span>
                        </li>
                    }
                })
                .collect::<Vec<_>>()}
        </ol>
    }
    .into_any()
}

pub(super) fn render_curated_list_detail_content(
    list: CuratedList,
    items: Vec<CuratedListItem>,
    active_filter: RwSignal<String>,
    query: RwSignal<String>,
) -> impl IntoView {
    let CuratedList {
        title,
        category,
        description,
        is_featured,
        ..
    } = list;

    let description = description
        .as_deref()
        .map(str::trim)
        .filter(|description| !description.is_empty())
        .unwrap_or("No description is available for this list.")
        .to_string();
    let total_count = items.len();
    let type_counts = curated_item_type_counts(&items);
    let active_key = active_filter.get();
    let query_text = query.get().trim().to_string();
    let query_normalized = query_text.to_ascii_lowercase();

    let filtered_items = items
        .into_iter()
        .filter(|item| {
            let item_type = normalized_curated_item_type(&item.item_type);
            let matches_type = active_key == "all" || item_type == active_key;
            matches_type && curated_item_matches_query(item, &query_normalized)
        })
        .collect::<Vec<_>>();

    let filtered_count = filtered_items.len();
    let has_filters = active_key != "all" || !query_text.is_empty();
    let active_label = if active_key == "all" {
        "items".to_string()
    } else {
        let base = curated_item_type_label(&active_key).to_ascii_lowercase();
        if filtered_count == 1 {
            base
        } else {
            format!("{base}s")
        }
    };
    let summary = if query_text.is_empty() {
        format!("Showing {filtered_count} of {total_count} {active_label}")
    } else {
        format!(
            "Showing {filtered_count} of {total_count} {active_label} matching \"{query_text}\""
        )
    };

    view! {
        <div class="detail-list-head">
            <div class="detail-list-head__copy">
                <h2>{title.clone()}</h2>
                <p class="muted">{description}</p>
            </div>
            <div class="pill-row detail-list-head__meta">
                <span class="pill">{category.clone()}</span>
                {is_featured.unwrap_or(false).then(|| view! { <span class="pill">"Featured"</span> })}
                <span class="pill pill--ghost">{format!("{total_count} items")}</span>
            </div>
        </div>

        <div class="detail-list-controls">
            <label class="visually-hidden" for="curated-list-search">"Filter list items"</label>
            <input
                id="curated-list-search"
                class="search-input"
                type="search"
                placeholder="Filter by title, item type, or notes"
                prop:value=move || query.get()
                on:input=move |ev| query.set(event_target_value(&ev))
            />
            <div
                class="result-filters"
                role="group"
                aria-label="Curated list item filters"
                aria-controls="curated-list-results"
            >
                <button
                    type="button"
                    class="result-filter pill pill--ghost"
                    class:result-filter--active=move || active_filter.get() == "all"
                    aria-pressed=move || active_filter.get() == "all"
                    on:click=move |_| active_filter.set("all".to_string())
                >
                    {format!("All ({total_count})")}
                </button>
                {render_curated_filter_buttons(type_counts, active_filter)}
            </div>
        </div>

        <p class="list-summary" role="status" aria-live="polite">
            {summary}
        </p>

        {if filtered_items.is_empty() {
            render_curated_empty_state(has_filters, active_filter, query).into_any()
        } else {
            render_curated_item_rows(filtered_items).into_any()
        }}
    }
}
