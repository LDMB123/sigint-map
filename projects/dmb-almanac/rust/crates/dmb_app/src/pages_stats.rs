use super::*;

#[path = "pages_stats_render.rs"]
mod render;

use render::{
    render_stats_guests_content, render_stats_overview_content, render_stats_panel,
    render_stats_shows_content, render_stats_songs_content, render_stats_tabs,
    render_stats_venues_content,
};

#[derive(Clone, Copy, Default, serde::Serialize, serde::Deserialize)]
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

macro_rules! load_stats_hydrate_or_default {
    ($body:block) => {{
        #[cfg(feature = "hydrate")]
        {
            spawn_local_to_send(async move $body).await
        }
        #[cfg(not(feature = "hydrate"))]
        {
            Default::default()
        }
    }};
}

#[must_use]
#[allow(clippy::too_many_lines)]
pub fn stats_page() -> impl IntoView {
    let active_tab = RwSignal::new(0u8);

    let overview = unit_resource(|| async {
        load_stats_hydrate_or_default!({
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

            let avg_songs_per_show = if shows > 0 {
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
                avg_songs_per_show,
            }
        })
    });
    let songs = unit_resource(|| async {
        load_stats_hydrate_or_default!({
            let (top_played, top_openers, top_closers, top_encores, debuts_by_year) =
                dmb_idb::stats_songs_panel_data(25, 10, 10, 10)
                    .await
                    .unwrap_or_default();

            StatsSongs {
                top_played,
                top_openers,
                top_closers,
                top_encores,
                debuts_by_year,
            }
        })
    });
    let shows = unit_resource(|| async {
        load_stats_hydrate_or_default!({
            let (shows_by_year, shows_by_decade, rarity_summary, recent_tours) =
                dmb_idb::stats_shows_panel_data(25)
                    .await
                    .unwrap_or_default();
            let (rarity_min, rarity_q1, rarity_median, rarity_q3, rarity_max) = rarity_summary;

            StatsShows {
                shows_by_year,
                shows_by_decade,
                rarity_min,
                rarity_q1,
                rarity_median,
                rarity_q3,
                rarity_max,
                recent_tours,
            }
        })
    });
    let venues = unit_resource(|| async {
        load_stats_hydrate_or_default!({
            let (top_venues, shows_by_country, shows_by_state) =
                dmb_idb::stats_venues_panel_data(25)
                    .await
                    .unwrap_or_default();

            StatsVenues {
                top_venues,
                shows_by_country,
                shows_by_state,
            }
        })
    });
    let guests = unit_resource(|| async {
        load_stats_hydrate_or_default!({
            let (top_guests, appearances_by_year) = dmb_idb::stats_guests_panel_data(25)
                .await
                .unwrap_or_default();

            StatsGuests {
                top_guests,
                appearances_by_year,
            }
        })
    });

    view! {
        <section class="page">
            <h1>"Stats"</h1>
            <p class="lead">"WASM-powered aggregations over the full concert database."</p>
            {render_stats_tabs(active_tab.clone())}
            {render_stats_panel(
                active_tab.clone(),
                0,
                "Loading overview",
                "Crunching summary aggregates.",
                overview,
                render_stats_overview_content,
            )}
            {render_stats_panel(
                active_tab.clone(),
                1,
                "Loading songs stats",
                "Computing song rankings.",
                songs,
                render_stats_songs_content,
            )}
            {render_stats_panel(
                active_tab.clone(),
                2,
                "Loading shows stats",
                "Computing show and rarity metrics.",
                shows,
                render_stats_shows_content,
            )}
            {render_stats_panel(
                active_tab.clone(),
                3,
                "Loading venue stats",
                "Computing venue distributions.",
                venues,
                render_stats_venues_content,
            )}
            {render_stats_panel(
                active_tab,
                4,
                "Loading guest stats",
                "Computing guest appearance metrics.",
                guests,
                render_stats_guests_content,
            )}
        </section>
    }
}
