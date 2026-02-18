use super::*;

pub fn shows_page() -> impl IntoView {
    let render = |items: Vec<ShowSummary>| {
        if items.is_empty() {
            empty_state_with_link(
                "No shows available",
                "Recent show data is unavailable right now.",
                "/search",
                "Search the catalog",
            )
            .into_any()
        } else {
            let total = items.len();
            view! {
                <>
                    <p class="list-summary">{format!("Showing {} recent shows", total)}</p>
                    <ul class="result-list">
                        {items
                            .into_iter()
                            .map(|show| {
                                let href = format!("/shows/{}", show.id);
                                let location = format_location(&show.venue_city, &show.venue_state);
                                let meta = if location.is_empty() {
                                    show.venue_name.clone()
                                } else {
                                    format!("{} • {}", show.venue_name, location)
                                };
                                let tour_label = show
                                    .tour_name
                                    .clone()
                                    .unwrap_or_else(|| "No tour".into());
                                view! {
                                    <li class="result-card">
                                        <span class="pill">{show.year}</span>
                                        <div class="result-body">
                                            <a class="result-label" href=href>{show.date}</a>
                                            <span class="result-meta">{meta}</span>
                                        </div>
                                        <span class="result-score">{tour_label}</span>
                                    </li>
                                }
                            })
                            .collect::<Vec<_>>()}
                    </ul>
                </>
            }
            .into_any()
        }
    };

    let items = Resource::new(|| (), |_| async move { load_recent_shows(30).await });

    view! {
        <section class="page">
            <h1>"Shows"</h1>
            <p class="lead">"Latest performances with offline hydration."</p>
            <Suspense fallback=move || loading_state("Loading shows", "Fetching recent performances.")>
                {move || render(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

pub fn songs_page() -> impl IntoView {
    let render = |items: Vec<Song>| {
        if items.is_empty() {
            empty_state_with_link(
                "No songs available",
                "Top song stats are unavailable right now.",
                "/search",
                "Search songs",
            )
            .into_any()
        } else {
            let total = items.len();
            view! {
                <>
                    <p class="list-summary">{format!("Showing {} ranked songs", total)}</p>
                    <ul class="result-list">
                        {items
                            .into_iter()
                            .enumerate()
                            .map(|(idx, song)| {
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
                                            <span class="result-meta">{format!("Last played: {}", last)}</span>
                                        </div>
                                        <span class="result-score">{format!("{} plays", plays)}</span>
                                    </li>
                                }
                            })
                            .collect::<Vec<_>>()}
                    </ul>
                </>
            }
            .into_any()
        }
    };

    let items = Resource::new(|| (), |_| async move { load_top_songs(50).await });

    view! {
        <section class="page">
            <h1>"Songs"</h1>
            <p class="lead">"Top songs by total performances."</p>
            <Suspense fallback=move || loading_state("Loading songs", "Calculating song performance rankings.")>
                {move || render(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

pub fn venues_page() -> impl IntoView {
    let render = |items: Vec<Venue>| {
        if items.is_empty() {
            empty_state_with_link(
                "No venues available",
                "Venue leaderboard data is unavailable right now.",
                "/shows",
                "Browse recent shows",
            )
            .into_any()
        } else {
            let total = items.len();
            view! {
                <>
                    <p class="list-summary">{format!("Showing {} venues", total)}</p>
                    <ul class="result-list">
                        {items
                            .into_iter()
                            .map(|venue| {
                                let href = format!("/venues/{}", venue.id);
                                let pill = venue
                                    .state
                                    .clone()
                                    .unwrap_or_else(|| venue.country.clone());
                                let location = format_location(&venue.city, &venue.state);
                                let total = venue.total_shows.unwrap_or(0);
                                view! {
                                    <li class="result-card">
                                        <span class="pill">{pill}</span>
                                        <div class="result-body">
                                            <a class="result-label" href=href>{venue.name}</a>
                                            <span class="result-meta">{location}</span>
                                        </div>
                                        <span class="result-score">{format!("{} shows", total)}</span>
                                    </li>
                                }
                            })
                            .collect::<Vec<_>>()}
                    </ul>
                </>
            }
            .into_any()
        }
    };

    let items = Resource::new(|| (), |_| async move { load_top_venues(50).await });

    view! {
        <section class="page">
            <h1>"Venues"</h1>
            <p class="lead">"Most visited venues by show count."</p>
            <Suspense fallback=move || loading_state("Loading venues", "Fetching venue totals and rankings.")>
                {move || {
                    render(items.get().unwrap_or_default())
                }}
            </Suspense>
        </section>
    }
}

pub fn guests_page() -> impl IntoView {
    let render = |items: Vec<Guest>| {
        if items.is_empty() {
            empty_state_with_link(
                "No guests available",
                "Guest appearance stats are unavailable right now.",
                "/shows",
                "Browse recent shows",
            )
            .into_any()
        } else {
            let total = items.len();
            view! {
                <>
                    <p class="list-summary">{format!("Showing {} frequent guests", total)}</p>
                    <ul class="result-list">
                        {items
                            .into_iter()
                            .map(|guest| {
                                let href = format!("/guests/{}", guest.slug);
                                let total = guest.total_appearances.unwrap_or(0);
                                view! {
                                    <li class="result-card">
                                        <span class="pill">"Guest"</span>
                                        <div class="result-body">
                                            <a class="result-label" href=href>{guest.name}</a>
                                        </div>
                                        <span class="result-score">{format!("{} appearances", total)}</span>
                                    </li>
                                }
                            })
                            .collect::<Vec<_>>()}
                    </ul>
                </>
            }
            .into_any()
        }
    };

    let items = Resource::new(|| (), |_| async move { load_top_guests(50).await });

    view! {
        <section class="page">
            <h1>"Guests"</h1>
            <p class="lead">"Most frequent guest appearances."</p>
            <Suspense fallback=move || loading_state("Loading guests", "Collecting guest appearance counts.")>
                {move || render(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

pub fn tours_page() -> impl IntoView {
    let render = |items: Vec<Tour>| {
        if items.is_empty() {
            empty_state_with_link(
                "No tours available",
                "Tour data is unavailable right now.",
                "/shows",
                "Browse recent shows",
            )
            .into_any()
        } else {
            let total = items.len();
            view! {
                <>
                    <p class="list-summary">{format!("Showing {} recent tours", total)}</p>
                    <ul class="result-list">
                        {items
                            .into_iter()
                            .map(|tour| {
                                let href = format!("/tours/{}", tour.year);
                                let total = tour.total_shows.unwrap_or(0);
                                view! {
                                    <li class="result-card">
                                        <span class="pill">{tour.year}</span>
                                        <div class="result-body">
                                            <a class="result-label" href=href>{tour.name}</a>
                                        </div>
                                        <span class="result-score">{format!("{} shows", total)}</span>
                                    </li>
                                }
                            })
                            .collect::<Vec<_>>()}
                    </ul>
                </>
            }
            .into_any()
        }
    };

    let items = Resource::new(|| (), |_| async move { load_recent_tours(25).await });

    view! {
        <section class="page">
            <h1>"Tours"</h1>
            <p class="lead">"Most recent tours, newest first."</p>
            <Suspense fallback=move || loading_state("Loading tours", "Fetching latest tour activity.")>
                {move || render(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

pub fn releases_page() -> impl IntoView {
    let render = |items: Vec<Release>| {
        if items.is_empty() {
            empty_state_with_link(
                "No releases available",
                "Release data is unavailable right now.",
                "/search",
                "Search releases",
            )
            .into_any()
        } else {
            let total = items.len();
            view! {
                <>
                    <p class="list-summary">{format!("Showing {} recent releases", total)}</p>
                    <ul class="result-list">
                        {items
                            .into_iter()
                            .map(|release| {
                                let href = format!("/releases/{}", release.slug);
                                let pill = release
                                    .release_type
                                    .clone()
                                    .unwrap_or_else(|| "Release".into());
                                let date = release
                                    .release_date
                                    .clone()
                                    .unwrap_or_else(|| "TBD".into());
                                view! {
                                    <li class="result-card">
                                        <span class="pill">{pill}</span>
                                        <div class="result-body">
                                            <a class="result-label" href=href>{release.title}</a>
                                        </div>
                                        <span class="result-score">{date}</span>
                                    </li>
                                }
                            })
                            .collect::<Vec<_>>()}
                    </ul>
                </>
            }
            .into_any()
        }
    };

    let items = Resource::new(|| (), |_| async move { load_recent_releases(25).await });

    view! {
        <section class="page">
            <h1>"Releases"</h1>
            <p class="lead">"Latest official releases and recordings."</p>
            <Suspense fallback=move || loading_state("Loading releases", "Fetching latest release metadata.")>
                {move || render(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}
