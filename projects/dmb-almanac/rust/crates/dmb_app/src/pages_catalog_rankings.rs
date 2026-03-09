use super::*;

#[must_use]
pub fn songs_page() -> impl IntoView {
    let render = |items: Vec<Song>| {
        render_result_list(
            items,
            "No songs available",
            "Top song stats are unavailable right now.",
            "/search",
            "Search songs",
            |total| format!("Showing {total} ranked songs"),
            |idx, song| {
                let href = format!("/songs/{}", song.slug);
                let plays = song.total_performances.unwrap_or(0);
                let last = song
                    .last_played_date
                    .clone()
                    .unwrap_or_else(|| "Unknown".into());
                view! {
                    <li class="result-card">
                        <span class="pill">{format!("#{}", idx + 1)}</span>
                        <div class="result-body">
                            <a class="result-label" href=href>{song.title}</a>
                            <span class="result-meta">{format!("Last played: {last}")}</span>
                        </div>
                        <span class="result-score">{format!("{plays} plays")}</span>
                    </li>
                }
                .into_any()
            },
        )
    };

    render_result_page(
        "Songs",
        "Top songs by total performances.",
        "Loading songs",
        "Calculating song performance rankings.",
        || async {
            load_with_limit_sources(
                50,
                |limit| async move { dmb_idb::stats_top_songs(limit).await.ok() },
                |limit| async move { get_top_songs(limit).await.unwrap_or_default() },
                normalize_songs,
            )
            .await
        },
        render,
    )
}

#[must_use]
pub fn venues_page() -> impl IntoView {
    let render = |items: Vec<Venue>| {
        render_result_list(
            items,
            "No venues available",
            "Venue leaderboard data is unavailable right now.",
            "/shows",
            "Browse recent shows",
            |total| format!("Showing {total} venues"),
            |_, venue| {
                let href = format!("/venues/{}", venue.id);
                let pill = venue.state.clone().unwrap_or_else(|| venue.country.clone());
                let location = format_location(&venue.city, venue.state.as_deref());
                let total = venue.total_shows.unwrap_or(0);
                view! {
                    <li class="result-card">
                        <span class="pill">{pill}</span>
                        <div class="result-body">
                            <a class="result-label" href=href>{venue.name}</a>
                            <span class="result-meta">{location}</span>
                        </div>
                        <span class="result-score">{format!("{total} shows")}</span>
                    </li>
                }
                .into_any()
            },
        )
    };

    render_result_page(
        "Venues",
        "Most visited venues by show count.",
        "Loading venues",
        "Fetching venue totals and rankings.",
        || async {
            load_with_limit_sources(
                50,
                |limit| async move { dmb_idb::list_top_venues(limit).await.ok() },
                |limit| async move { get_top_venues(limit).await.unwrap_or_default() },
                normalize_venues,
            )
            .await
        },
        render,
    )
}

#[must_use]
pub fn guests_page() -> impl IntoView {
    let render = |items: Vec<Guest>| {
        render_result_list(
            items,
            "No guests available",
            "Guest appearance stats are unavailable right now.",
            "/shows",
            "Browse recent shows",
            |total| format!("Showing {total} frequent guests"),
            |_, guest| {
                let href = format!("/guests/{}", guest.slug);
                let total = guest.total_appearances.unwrap_or(0);
                view! {
                    <li class="result-card">
                        <span class="pill">"Guest"</span>
                        <div class="result-body">
                            <a class="result-label" href=href>{guest.name}</a>
                        </div>
                        <span class="result-score">{format!("{total} appearances")}</span>
                    </li>
                }
                .into_any()
            },
        )
    };

    render_result_page(
        "Guests",
        "Most frequent guest appearances.",
        "Loading guests",
        "Collecting guest appearance counts.",
        || async {
            load_with_limit_sources(
                50,
                |limit| async move { dmb_idb::list_top_guests(limit).await.ok() },
                |limit| async move { get_top_guests(limit).await.unwrap_or_default() },
                normalize_guests,
            )
            .await
        },
        render,
    )
}
