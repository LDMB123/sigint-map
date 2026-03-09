use super::*;

#[path = "pages_stats_charts.rs"]
mod charts;
#[path = "pages_stats_sections.rs"]
mod sections;

const STATS_TABS: [(u8, &str); 5] = [
    (0, "Overview"),
    (1, "Songs"),
    (2, "Shows & Tours"),
    (3, "Venues"),
    (4, "Guests"),
];
const STATS_TAB_COUNT: u8 = 5;

pub(super) fn render_stats_tabs(active_tab: RwSignal<u8>) -> impl IntoView {
    view! {
        <nav
            class="stats-tabs"
            role="tablist"
            aria-label="Statistics sections"
            aria-orientation="horizontal"
        >
            {STATS_TABS
                .into_iter()
                .map(|(idx, name)| {
                    let tab_id = format!("stats-tab-{idx}");
                    let panel_id = format!("stats-panel-{idx}");
                    let class_active_tab = active_tab.clone();
                    let aria_active_tab = active_tab.clone();
                    let tabindex_active_tab = active_tab.clone();
                    let click_active_tab = active_tab.clone();
                    let keydown_active_tab = active_tab.clone();

                    view! {
                        <button
                            type="button"
                            role="tab"
                            id=tab_id
                            aria-controls=panel_id
                            class:active=move || class_active_tab.get() == idx
                            aria-selected=move || aria_active_tab.get() == idx
                            tabindex=move || if tabindex_active_tab.get() == idx { 0 } else { -1 }
                            on:click=move |_| click_active_tab.set(idx)
                            on:keydown=move |ev| {
                                let key = ev.key();
                                let next = match key.as_str() {
                                    "ArrowRight" => Some((idx + 1) % STATS_TAB_COUNT),
                                    "ArrowLeft" => {
                                        Some(if idx == 0 { STATS_TAB_COUNT - 1 } else { idx - 1 })
                                    }
                                    "Home" => Some(0),
                                    "End" => Some(STATS_TAB_COUNT - 1),
                                    _ => None,
                                };
                                if let Some(next_idx) = next {
                                    ev.prevent_default();
                                    keydown_active_tab.set(next_idx);
                                    #[cfg(feature = "hydrate")]
                                    {
                                        let tab_id = format!("stats-tab-{next_idx}");
                                        let _ = crate::browser::runtime::focus_element_by_id(&tab_id);
                                    }
                                    #[cfg(not(feature = "hydrate"))]
                                    {
                                        let _ = next_idx;
                                    }
                                }
                            }
                        >
                            {name}
                        </button>
                    }
                })
                .collect::<Vec<_>>()}
        </nav>
    }
}

pub(super) fn render_stats_panel<T, F, V>(
    active_tab: RwSignal<u8>,
    idx: u8,
    loading_title: &'static str,
    loading_desc: &'static str,
    data: Resource<T>,
    render: F,
) -> impl IntoView
where
    T: Clone + Default + Send + Sync + 'static,
    F: Fn(T) -> V + Copy + Send + Sync + 'static,
    V: IntoView + 'static,
{
    let hidden_active_tab = active_tab.clone();
    let display_active_tab = active_tab.clone();
    let content_data = data.clone();
    let panel_id = format!("stats-panel-{idx}");
    let tab_id = format!("stats-tab-{idx}");

    view! {
        <div
            class="stats-panel"
            id=panel_id
            role="tabpanel"
            aria-labelledby=tab_id
            hidden=move || hidden_active_tab.get() != idx
            style:display=move || if display_active_tab.get() == idx { "block" } else { "none" }
        >
            <Suspense fallback=move || loading_state(loading_title, loading_desc)>
                {move || render(content_data.get().unwrap_or_default())}
            </Suspense>
        </div>
    }
}

pub(super) fn render_stats_overview_content(data: StatsOverview) -> impl IntoView {
    sections::render_stats_overview_content(data)
}

pub(super) fn render_stats_songs_content(data: StatsSongs) -> impl IntoView {
    sections::render_stats_songs_content(data)
}

pub(super) fn render_stats_shows_content(data: StatsShows) -> impl IntoView {
    sections::render_stats_shows_content(data)
}

pub(super) fn render_stats_venues_content(data: StatsVenues) -> impl IntoView {
    sections::render_stats_venues_content(data)
}

pub(super) fn render_stats_guests_content(data: StatsGuests) -> impl IntoView {
    sections::render_stats_guests_content(data)
}
