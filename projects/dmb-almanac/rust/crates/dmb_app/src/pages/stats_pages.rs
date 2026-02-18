use super::*;

// ---------------------------------------------------------------------------
// Stats page structs
// ---------------------------------------------------------------------------

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
struct StatsOverview {
    show_count: u32,
    song_count: u32,
    venue_count: u32,
    tour_count: u32,
    guest_count: u32,
    setlist_count: u32,
    avg_songs_per_show: f32,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
struct StatsSongs {
    top_played: Vec<Song>,
    top_openers: Vec<Song>,
    top_closers: Vec<Song>,
    top_encores: Vec<Song>,
    debuts_by_year: Vec<(u32, u32)>,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
struct StatsShows {
    shows_by_year: Vec<(u32, u32)>,
    shows_by_decade: Vec<(u32, u32)>,
    rarity_min: f64,
    rarity_q1: f64,
    rarity_median: f64,
    rarity_q3: f64,
    rarity_max: f64,
    recent_tours: Vec<Tour>,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
struct StatsVenues {
    top_venues: Vec<Venue>,
    shows_by_country: Vec<(String, u32)>,
    shows_by_state: Vec<(String, u32)>,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
struct StatsGuests {
    top_guests: Vec<Guest>,
    appearances_by_year: Vec<(u32, u32)>,
}

// ---------------------------------------------------------------------------
// JS type converters (hydrate only)
// ---------------------------------------------------------------------------

#[cfg(feature = "hydrate")]
fn js_map_to_u32_pairs(map: &js_sys::Map) -> Vec<(u32, u32)> {
    let mut result = Vec::new();
    map.for_each(&mut |value, key| {
        if let (Some(k), Some(v)) = (key.as_f64(), value.as_f64()) {
            result.push((k as u32, v as u32));
        }
    });
    result.sort_by_key(|&(k, _)| k);
    result
}

// ---------------------------------------------------------------------------
// Stats data loaders
// ---------------------------------------------------------------------------

async fn load_stats_overview() -> StatsOverview {
    #[cfg(feature = "hydrate")]
    {
        let counts = spawn_local_to_send(async move {
            let stores = [
                dmb_idb::TABLE_SHOWS,
                dmb_idb::TABLE_SONGS,
                dmb_idb::TABLE_VENUES,
                dmb_idb::TABLE_TOURS,
                dmb_idb::TABLE_GUESTS,
                dmb_idb::TABLE_SETLIST_ENTRIES,
            ];

            let mut counts_by_store: HashMap<String, u32> = HashMap::new();
            if let Ok((entries, _missing)) = dmb_idb::count_stores_with_missing(&stores).await {
                for (store, count) in entries {
                    counts_by_store.insert(store, count);
                }
            }

            let shows = counts_by_store
                .get(dmb_idb::TABLE_SHOWS)
                .copied()
                .unwrap_or(0);
            let songs = counts_by_store
                .get(dmb_idb::TABLE_SONGS)
                .copied()
                .unwrap_or(0);
            let venues = counts_by_store
                .get(dmb_idb::TABLE_VENUES)
                .copied()
                .unwrap_or(0);
            let tours = counts_by_store
                .get(dmb_idb::TABLE_TOURS)
                .copied()
                .unwrap_or(0);
            let guests = counts_by_store
                .get(dmb_idb::TABLE_GUESTS)
                .copied()
                .unwrap_or(0);
            let setlists = counts_by_store
                .get(dmb_idb::TABLE_SETLIST_ENTRIES)
                .copied()
                .unwrap_or(0);
            (shows, songs, venues, tours, guests, setlists)
        })
        .await;

        let (shows, songs, venues, tours, guests, setlists) = counts;
        let avg = if shows > 0 {
            setlists as f32 / shows as f32
        } else {
            0.0
        };
        StatsOverview {
            show_count: shows,
            song_count: songs,
            venue_count: venues,
            tour_count: tours,
            guest_count: guests,
            setlist_count: setlists,
            avg_songs_per_show: avg,
        }
    }

    #[cfg(not(feature = "hydrate"))]
    {
        StatsOverview::default()
    }
}

async fn load_stats_songs() -> StatsSongs {
    #[cfg(feature = "hydrate")]
    {
        let data = spawn_local_to_send(async move {
            let top_played = dmb_idb::stats_top_songs(25).await.unwrap_or_default();
            let top_openers = dmb_idb::stats_top_openers(10).await.unwrap_or_default();
            let top_closers = dmb_idb::stats_top_closers(10).await.unwrap_or_default();
            let top_encores = dmb_idb::stats_top_encores(10).await.unwrap_or_default();

            // Debut histogram via WASM aggregation
            let debuts_by_year = {
                let setlists: Vec<SetlistEntry> = dmb_idb::list_all(dmb_idb::TABLE_SETLIST_ENTRIES)
                    .await
                    .unwrap_or_default();
                if setlists.is_empty() {
                    Vec::new()
                } else {
                    let json = serde_json::to_string(&setlists).unwrap_or_default();
                    match dmb_wasm::calculate_song_debuts_with_count(&json) {
                        Ok(map) => js_map_to_u32_pairs(&map),
                        Err(_) => Vec::new(),
                    }
                }
            };

            (
                top_played,
                top_openers,
                top_closers,
                top_encores,
                debuts_by_year,
            )
        })
        .await;

        StatsSongs {
            top_played: data.0,
            top_openers: data.1,
            top_closers: data.2,
            top_encores: data.3,
            debuts_by_year: data.4,
        }
    }

    #[cfg(not(feature = "hydrate"))]
    {
        StatsSongs::default()
    }
}

async fn load_stats_shows() -> StatsShows {
    #[cfg(feature = "hydrate")]
    {
        let data = spawn_local_to_send(async move {
            let shows: Vec<Show> = dmb_idb::list_all(dmb_idb::TABLE_SHOWS)
                .await
                .unwrap_or_default();
            let tours = dmb_idb::list_recent_tours(25).await.unwrap_or_default();

            let years: Vec<u32> = shows.iter().map(|s| s.year as u32).collect();
            let rarity_values: Vec<f64> = shows
                .iter()
                .filter_map(|s| s.rarity_index.map(|r| r as f64))
                .collect();

            let shows_by_year = if years.is_empty() {
                Vec::new()
            } else {
                let map = dmb_wasm::aggregate_by_year(&years);
                js_map_to_u32_pairs(&map)
            };

            let shows_by_decade = if years.is_empty() {
                Vec::new()
            } else {
                let map = dmb_wasm::aggregate_by_decade(&years);
                js_map_to_u32_pairs(&map)
            };

            let (rmin, rq1, rmed, rq3, rmax) = if rarity_values.is_empty() {
                (0.0, 0.0, 0.0, 0.0, 0.0)
            } else {
                match dmb_wasm::calculate_quartiles(&rarity_values) {
                    Ok(obj) => {
                        let get = |key: &str| -> f64 {
                            js_sys::Reflect::get(&obj, &JsValue::from_str(key))
                                .ok()
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0)
                        };
                        (get("min"), get("q1"), get("median"), get("q3"), get("max"))
                    }
                    Err(_) => (0.0, 0.0, 0.0, 0.0, 0.0),
                }
            };

            (
                shows_by_year,
                shows_by_decade,
                rmin,
                rq1,
                rmed,
                rq3,
                rmax,
                tours,
            )
        })
        .await;

        StatsShows {
            shows_by_year: data.0,
            shows_by_decade: data.1,
            rarity_min: data.2,
            rarity_q1: data.3,
            rarity_median: data.4,
            rarity_q3: data.5,
            rarity_max: data.6,
            recent_tours: data.7,
        }
    }

    #[cfg(not(feature = "hydrate"))]
    {
        StatsShows::default()
    }
}

async fn load_stats_venues() -> StatsVenues {
    #[cfg(feature = "hydrate")]
    {
        let data = spawn_local_to_send(async move {
            let top_venues = dmb_idb::list_top_venues(25).await.unwrap_or_default();
            let all_venues: Vec<Venue> = dmb_idb::list_all(dmb_idb::TABLE_VENUES)
                .await
                .unwrap_or_default();

            // Group by country
            let mut country_map: std::collections::HashMap<String, u32> =
                std::collections::HashMap::new();
            let mut state_map: std::collections::HashMap<String, u32> =
                std::collections::HashMap::new();
            for v in &all_venues {
                let total = v.total_shows.unwrap_or(0) as u32;
                *country_map.entry(v.country.clone()).or_insert(0) += total;
                if v.country == "US" || v.country == "United States" {
                    if let Some(ref state) = v.state {
                        if !state.is_empty() {
                            *state_map.entry(state.clone()).or_insert(0) += total;
                        }
                    }
                }
            }

            let mut by_country: Vec<(String, u32)> = country_map.into_iter().collect();
            by_country.sort_by(|a, b| b.1.cmp(&a.1));

            let mut by_state: Vec<(String, u32)> = state_map.into_iter().collect();
            by_state.sort_by(|a, b| b.1.cmp(&a.1));

            (top_venues, by_country, by_state)
        })
        .await;

        StatsVenues {
            top_venues: data.0,
            shows_by_country: data.1,
            shows_by_state: data.2,
        }
    }

    #[cfg(not(feature = "hydrate"))]
    {
        StatsVenues::default()
    }
}

async fn load_stats_guests() -> StatsGuests {
    #[cfg(feature = "hydrate")]
    {
        let data = spawn_local_to_send(async move {
            let top_guests = dmb_idb::list_top_guests(25).await.unwrap_or_default();
            let appearances: Vec<GuestAppearance> =
                dmb_idb::list_all(dmb_idb::TABLE_GUEST_APPEARANCES)
                    .await
                    .unwrap_or_default();

            let years: Vec<u32> = appearances
                .iter()
                .filter_map(|a| a.year.map(|y| y as u32))
                .collect();

            let appearances_by_year = if years.is_empty() {
                Vec::new()
            } else {
                let map = dmb_wasm::aggregate_by_year(&years);
                js_map_to_u32_pairs(&map)
            };

            (top_guests, appearances_by_year)
        })
        .await;

        StatsGuests {
            top_guests: data.0,
            appearances_by_year: data.1,
        }
    }

    #[cfg(not(feature = "hydrate"))]
    {
        StatsGuests::default()
    }
}

// ---------------------------------------------------------------------------
// Stats page component
// ---------------------------------------------------------------------------

pub fn stats_page() -> impl IntoView {
    let active_tab = RwSignal::new(0u8);

    let overview = Resource::new(|| (), |_| async move { load_stats_overview().await });
    let songs = Resource::new(|| (), |_| async move { load_stats_songs().await });
    let shows = Resource::new(|| (), |_| async move { load_stats_shows().await });
    let venues = Resource::new(|| (), |_| async move { load_stats_venues().await });
    let guests = Resource::new(|| (), |_| async move { load_stats_guests().await });

    let tab_names = ["Overview", "Songs", "Shows & Tours", "Venues", "Guests"];
    let tab_count = tab_names.len() as u8;

    view! {
        <section class="page">
            <h1>"Stats"</h1>
            <p class="lead">"WASM-powered aggregations over the full concert database."</p>

            <nav
                class="stats-tabs"
                role="tablist"
                aria-label="Statistics sections"
                aria-orientation="horizontal"
            >
                {tab_names
                    .iter()
                    .enumerate()
                    .map(|(i, name)| {
                        let idx = i as u8;
                        let tab_id = format!("stats-tab-{idx}");
                        let panel_id = format!("stats-panel-{idx}");
                        view! {
                            <button type="button"
                                role="tab"
                                id=tab_id
                                aria-controls=panel_id
                                class:active=move || active_tab.get() == idx
                                aria-selected=move || active_tab.get() == idx
                                tabindex=move || if active_tab.get() == idx { 0 } else { -1 }
                                on:click=move |_| active_tab.set(idx)
                                on:keydown=move |ev| {
                                    let key = ev.key();
                                    let next = match key.as_str() {
                                        "ArrowRight" => Some((idx + 1) % tab_count),
                                        "ArrowLeft" => Some((idx + tab_count - 1) % tab_count),
                                        "Home" => Some(0),
                                        "End" => Some(tab_count - 1),
                                        _ => None,
                                    };
                                    if let Some(next_idx) = next {
                                        ev.prevent_default();
                                        active_tab.set(next_idx);
                                        focus_stats_tab(next_idx);
                                    }
                                }
                            >
                                {*name}
                            </button>
                        }
                    })
                    .collect::<Vec<_>>()}
            </nav>

            // Tab 0: Overview
            <div
                class="stats-panel"
                id="stats-panel-0"
                role="tabpanel"
                aria-labelledby="stats-tab-0"
                hidden=move || active_tab.get() != 0
                style:display=move || if active_tab.get() == 0 { "block" } else { "none" }
            >
                <Suspense fallback=move || loading_state("Loading overview", "Crunching summary aggregates.")>
                    {move || {
                        let data = overview.get().unwrap_or_default();
                        view! {
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <span class="stat-value">{data.show_count.to_string()}</span>
                                    <span class="stat-label">"Shows"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{data.song_count.to_string()}</span>
                                    <span class="stat-label">"Songs"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{data.venue_count.to_string()}</span>
                                    <span class="stat-label">"Venues"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{data.tour_count.to_string()}</span>
                                    <span class="stat-label">"Tours"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{data.guest_count.to_string()}</span>
                                    <span class="stat-label">"Guests"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{data.setlist_count.to_string()}</span>
                                    <span class="stat-label">"Setlist Entries"</span>
                                </div>
                            </div>
                            <div class="stat-card" style="margin-top: 1rem">
                                <span class="stat-value">{format!("{:.1}", data.avg_songs_per_show)}</span>
                                <span class="stat-label">"Avg Songs Per Show"</span>
                            </div>
                            <p class="muted" style="margin-top: 1rem">
                                {format!("Database: {} v{}", dmb_idb::DB_NAME, dmb_idb::DB_VERSION)}
                            </p>
                        }
                    }}
                </Suspense>
            </div>

            // Tab 1: Songs
            <div
                class="stats-panel"
                id="stats-panel-1"
                role="tabpanel"
                aria-labelledby="stats-tab-1"
                hidden=move || active_tab.get() != 1
                style:display=move || if active_tab.get() == 1 { "block" } else { "none" }
            >
                <Suspense fallback=move || loading_state("Loading songs stats", "Computing song rankings.")>
                    {move || {
                        let data = songs.get().unwrap_or_default();
                        view! {
                            <h2>"Top 25 Most Played"</h2>
                            {render_song_table(&data.top_played, true)}

                            <h2>"Top 10 Openers"</h2>
                            {render_song_ranking(&data.top_openers, |s| s.opener_count.unwrap_or(0))}

                            <h2>"Top 10 Closers"</h2>
                            {render_song_ranking(&data.top_closers, |s| s.closer_count.unwrap_or(0))}

                            <h2>"Top 10 Encores"</h2>
                            {render_song_ranking(&data.top_encores, |s| s.encore_count.unwrap_or(0))}

                            <h2>"Song Debuts by Year"</h2>
                            {render_bar_chart(&data.debuts_by_year)}
                        }
                    }}
                </Suspense>
            </div>

            // Tab 2: Shows & Tours
            <div
                class="stats-panel"
                id="stats-panel-2"
                role="tabpanel"
                aria-labelledby="stats-tab-2"
                hidden=move || active_tab.get() != 2
                style:display=move || if active_tab.get() == 2 { "block" } else { "none" }
            >
                <Suspense fallback=move || loading_state("Loading shows stats", "Computing show and rarity metrics.")>
                    {move || {
                        let data = shows.get().unwrap_or_default();
                        view! {
                            <h2>"Shows Per Year"</h2>
                            {render_bar_chart(&data.shows_by_year)}

                            <h2>"Shows Per Decade"</h2>
                            <div class="stats-grid">
                                {data
                                    .shows_by_decade
                                    .iter()
                                    .map(|(decade, count)| {
                                        view! {
                                            <div class="stat-card">
                                                <span class="stat-value">{count.to_string()}</span>
                                                <span class="stat-label">{format!("{}s", decade)}</span>
                                            </div>
                                        }
                                    })
                                    .collect::<Vec<_>>()}
                            </div>

                            <h2>"Rarity Index Distribution"</h2>
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <span class="stat-value">{format!("{:.2}", data.rarity_min)}</span>
                                    <span class="stat-label">"Min"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{format!("{:.2}", data.rarity_q1)}</span>
                                    <span class="stat-label">"Q1"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{format!("{:.2}", data.rarity_median)}</span>
                                    <span class="stat-label">"Median"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{format!("{:.2}", data.rarity_q3)}</span>
                                    <span class="stat-label">"Q3"</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-value">{format!("{:.2}", data.rarity_max)}</span>
                                    <span class="stat-label">"Max"</span>
                                </div>
                            </div>

                            <h2>"Recent Tours"</h2>
                            <ul class="result-list">
                                {data
                                    .recent_tours
                                    .iter()
                                    .map(|tour| {
                                        let href = format!("/tours/{}", tour.year);
                                        let total = tour.total_shows.unwrap_or(0);
                                        view! {
                                            <li class="result-card">
                                                <span class="pill">{tour.year.to_string()}</span>
                                                <div class="result-body">
                                                    <a class="result-label" href=href>{tour.name.clone()}</a>
                                                </div>
                                                <span class="result-score">{format!("{} shows", total)}</span>
                                            </li>
                                        }
                                    })
                                    .collect::<Vec<_>>()}
                            </ul>
                        }
                    }}
                </Suspense>
            </div>

            // Tab 3: Venues
            <div
                class="stats-panel"
                id="stats-panel-3"
                role="tabpanel"
                aria-labelledby="stats-tab-3"
                hidden=move || active_tab.get() != 3
                style:display=move || if active_tab.get() == 3 { "block" } else { "none" }
            >
                <Suspense fallback=move || loading_state("Loading venue stats", "Computing venue distributions.")>
                    {move || {
                        let data = venues.get().unwrap_or_default();
                        view! {
                            <h2>"Top 25 Venues"</h2>
                            <ul class="result-list">
                                {data
                                    .top_venues
                                    .iter()
                                    .map(|venue| {
                                        let href = format!("/venues/{}", venue.id);
                                        let location = format_location(&venue.city, &venue.state);
                                        let total = venue.total_shows.unwrap_or(0);
                                        view! {
                                            <li class="result-card">
                                                <span class="pill">{venue.state.clone().unwrap_or_else(|| venue.country.clone())}</span>
                                                <div class="result-body">
                                                    <a class="result-label" href=href>{venue.name.clone()}</a>
                                                    <span class="result-meta">{location}</span>
                                                </div>
                                                <span class="result-score">{format!("{} shows", total)}</span>
                                            </li>
                                        }
                                    })
                                    .collect::<Vec<_>>()}
                            </ul>

                            <h2>"Shows by Country"</h2>
                            {render_string_bar_chart(&data.shows_by_country, 15)}

                            <h2>"Shows by US State"</h2>
                            {render_string_bar_chart(&data.shows_by_state, 20)}
                        }
                    }}
                </Suspense>
            </div>

            // Tab 4: Guests
            <div
                class="stats-panel"
                id="stats-panel-4"
                role="tabpanel"
                aria-labelledby="stats-tab-4"
                hidden=move || active_tab.get() != 4
                style:display=move || if active_tab.get() == 4 { "block" } else { "none" }
            >
                <Suspense fallback=move || loading_state("Loading guest stats", "Computing guest appearance metrics.")>
                    {move || {
                        let data = guests.get().unwrap_or_default();
                        view! {
                            <h2>"Top 25 Guests"</h2>
                            <ul class="result-list">
                                {data
                                    .top_guests
                                    .iter()
                                    .map(|guest| {
                                        let href = format!("/guests/{}", guest.slug);
                                        let total = guest.total_appearances.unwrap_or(0);
                                        view! {
                                            <li class="result-card">
                                                <div class="result-body">
                                                    <a class="result-label" href=href>{guest.name.clone()}</a>
                                                </div>
                                                <span class="result-score">{format!("{} appearances", total)}</span>
                                            </li>
                                        }
                                    })
                                    .collect::<Vec<_>>()}
                            </ul>

                            <h2>"Guest Appearances by Year"</h2>
                            {render_bar_chart(&data.appearances_by_year)}
                        }
                    }}
                </Suspense>
            </div>
        </section>
    }
}

// ---------------------------------------------------------------------------
// Stats rendering helpers
// ---------------------------------------------------------------------------

fn render_song_table(songs: &[Song], show_total: bool) -> impl IntoView {
    if songs.is_empty() {
        return empty_state(
            "No data available",
            "There are no rows for this ranking yet.",
        )
        .into_any();
    }
    let table_label = if show_total {
        "Song ranking by total performances"
    } else {
        "Song ranking"
    };
    view! {
        <div class="stats-table-wrap">
            <table class="stats-table" aria-label=table_label>
                <caption class="visually-hidden">{table_label}</caption>
                <thead>
                    <tr>
                        <th scope="col">"#"</th>
                        <th scope="col">"Song"</th>
                        {if show_total {
                            Some(view! { <th scope="col">"Plays"</th> })
                        } else {
                            None
                        }}
                    </tr>
                </thead>
                <tbody>
                    {songs
                        .iter()
                        .enumerate()
                        .map(|(i, song)| {
                            let href = format!("/songs/{}", song.slug);
                            view! {
                                <tr>
                                    <td>{(i + 1).to_string()}</td>
                                    <td><a href=href>{song.title.clone()}</a></td>
                                    {if show_total {
                                        Some(view! { <td>{song.total_performances.unwrap_or(0).to_string()}</td> })
                                    } else {
                                        None
                                    }}
                                </tr>
                            }
                        })
                        .collect::<Vec<_>>()}
                </tbody>
            </table>
        </div>
    }
    .into_any()
}

fn render_song_ranking(songs: &[Song], count_fn: fn(&Song) -> i32) -> impl IntoView {
    if songs.is_empty() {
        return empty_state(
            "No data available",
            "There are no rows for this ranking yet.",
        )
        .into_any();
    }
    view! {
        <ul class="result-list">
            {songs
                .iter()
                .map(|song| {
                    let href = format!("/songs/{}", song.slug);
                    let count = count_fn(song);
                    view! {
                        <li class="result-card">
                            <div class="result-body">
                                <a class="result-label" href=href>{song.title.clone()}</a>
                            </div>
                            <span class="result-score">{format!("{} times", count)}</span>
                        </li>
                    }
                })
                .collect::<Vec<_>>()}
        </ul>
    }
    .into_any()
}

fn render_bar_chart(data: &[(u32, u32)]) -> impl IntoView {
    if data.is_empty() {
        return empty_state(
            "No chart data",
            "This aggregation did not return any values.",
        )
        .into_any();
    }
    let max_val = data.iter().map(|&(_, v)| v).max().unwrap_or(1) as f64;
    view! {
        <div class="bar-chart" role="list" aria-label="Bar chart">
            {data
                .iter()
                .map(|&(label, value)| {
                    let pct = if max_val > 0.0 {
                        (value as f64 / max_val * 100.0) as u32
                    } else {
                        0
                    };
                    let width = format!("width: {}%", pct.max(1));
                    view! {
                        <div class="bar-row" role="listitem" aria-label=format!("{label}: {value}")>
                            <span class="bar-label">{label.to_string()}</span>
                            <div class="bar" style=width></div>
                            <span class="bar-value">{value.to_string()}</span>
                        </div>
                    }
                })
                .collect::<Vec<_>>()}
        </div>
    }
    .into_any()
}

fn render_string_bar_chart(data: &[(String, u32)], limit: usize) -> impl IntoView {
    if data.is_empty() {
        return empty_state(
            "No chart data",
            "This aggregation did not return any values.",
        )
        .into_any();
    }
    let items: Vec<_> = data.iter().take(limit).collect();
    let max_val = items.iter().map(|(_, v)| *v).max().unwrap_or(1) as f64;
    view! {
        <div class="bar-chart" role="list" aria-label="Bar chart">
            {items
                .iter()
                .map(|(label, value)| {
                    let pct = if max_val > 0.0 {
                        (*value as f64 / max_val * 100.0) as u32
                    } else {
                        0
                    };
                    let width = format!("width: {}%", pct.max(1));
                    view! {
                        <div class="bar-row" role="listitem" aria-label=format!("{label}: {value}")>
                            <span class="bar-label">{label.clone()}</span>
                            <div class="bar" style=width></div>
                            <span class="bar-value">{value.to_string()}</span>
                        </div>
                    }
                })
                .collect::<Vec<_>>()}
        </div>
    }
    .into_any()
}
