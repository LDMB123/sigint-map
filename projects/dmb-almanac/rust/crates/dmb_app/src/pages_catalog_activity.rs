use super::*;

#[must_use]
#[allow(clippy::too_many_lines)]
pub fn shows_page() -> impl IntoView {
    let render = |items: Vec<ShowSummary>| {
        render_result_list(
            items,
            "No shows available",
            "Recent show data is unavailable right now.",
            "/search",
            "Search the catalog",
            |total| format!("Showing {total} recent shows"),
            |_, show| {
                let href = format!("/shows/{}", show.id);
                let location = format_location(&show.venue_city, show.venue_state.as_deref());
                let meta = if location.is_empty() {
                    show.venue_name.clone()
                } else {
                    format!("{} • {}", show.venue_name, location)
                };
                let tour_label = show.tour_name.clone().unwrap_or_else(|| "No tour".into());
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
                .into_any()
            },
        )
    };

    render_result_page(
        "Shows",
        "Latest performances with offline hydration.",
        "Loading shows",
        "Fetching recent performances.",
        || async {
            let limit = 30usize;
            #[cfg(feature = "hydrate")]
            {
                let shows =
                    spawn_local_to_send(
                        async move { dmb_idb::list_recent_shows(limit).await.ok() },
                    )
                    .await;
                let Some(shows) = shows else {
                    return normalize_show_summaries(
                        get_recent_shows(limit).await.unwrap_or_default(),
                        limit,
                    );
                };

                if shows.is_empty() {
                    return normalize_show_summaries(
                        get_recent_shows(limit).await.unwrap_or_default(),
                        limit,
                    );
                }

                let mut venue_ids: HashSet<i32> = HashSet::new();
                let mut tour_ids: HashSet<i32> = HashSet::new();
                for show in &shows {
                    venue_ids.insert(show.venue_id);
                    if let Some(tour_id) = show.tour_id {
                        tour_ids.insert(tour_id);
                    }
                }
                let venue_pairs = join_all(venue_ids.into_iter().map(|id| async move {
                    let venue =
                        spawn_local_to_send(
                            async move { dmb_idb::get_venue(id).await.ok().flatten() },
                        )
                        .await;
                    (id, venue)
                }))
                .await;
                let mut venues = HashMap::with_capacity(venue_pairs.len());
                for (id, venue) in venue_pairs {
                    if let Some(venue) = venue {
                        venues.insert(id, venue);
                    }
                }

                let tour_pairs = join_all(tour_ids.into_iter().map(|id| async move {
                    let tour = spawn_local_to_send(async move {
                        dmb_idb::get_tour_by_id(id).await.ok().flatten()
                    })
                    .await;
                    (id, tour)
                }))
                .await;
                let mut tours = HashMap::with_capacity(tour_pairs.len());
                for (id, tour) in tour_pairs {
                    if let Some(tour) = tour {
                        tours.insert(id, tour);
                    }
                }

                normalize_show_summaries(
                    shows
                        .into_iter()
                        .map(|show| {
                            let (venue_name, venue_city, venue_state) = match venues
                                .get(&show.venue_id)
                            {
                                Some(venue) => {
                                    (venue.name.clone(), venue.city.clone(), venue.state.clone())
                                }
                                None => (format!("Venue #{}", show.venue_id), String::new(), None),
                            };
                            let (tour_name, tour_year) =
                                match show.tour_id.and_then(|id| tours.get(&id)) {
                                    Some(tour) => (Some(tour.name.clone()), Some(tour.year)),
                                    None => (None, None),
                                };
                            ShowSummary {
                                id: show.id,
                                date: show.date,
                                year: show.year,
                                venue_id: show.venue_id,
                                venue_name,
                                venue_city,
                                venue_state,
                                tour_name,
                                tour_year,
                            }
                        })
                        .collect(),
                    limit,
                )
            }

            #[cfg(not(feature = "hydrate"))]
            {
                normalize_show_summaries(get_recent_shows(limit).await.unwrap_or_default(), limit)
            }
        },
        render,
    )
}

#[must_use]
pub fn tours_page() -> impl IntoView {
    let render = |items: Vec<Tour>| {
        render_result_list(
            items,
            "No tours available",
            "Tour data is unavailable right now.",
            "/shows",
            "Browse recent shows",
            |total| format!("Showing {total} recent tours"),
            |_, tour| {
                let href = format!("/tours/{}", tour.year);
                let total = tour.total_shows.unwrap_or(0);
                view! {
                    <li class="result-card">
                        <span class="pill">{tour.year}</span>
                        <div class="result-body">
                            <a class="result-label" href=href>{tour.name}</a>
                        </div>
                        <span class="result-score">{format!("{total} shows")}</span>
                    </li>
                }
                .into_any()
            },
        )
    };

    render_result_page(
        "Tours",
        "Most recent tours, newest first.",
        "Loading tours",
        "Fetching latest tour activity.",
        || async {
            load_with_limit_sources(
                25,
                |limit| async move { dmb_idb::list_recent_tours(limit).await.ok() },
                |limit| async move { get_recent_tours(limit).await.unwrap_or_default() },
                normalize_tours,
            )
            .await
        },
        render,
    )
}

#[must_use]
pub fn releases_page() -> impl IntoView {
    let render = |items: Vec<Release>| {
        render_result_list(
            items,
            "No releases available",
            "Release data is unavailable right now.",
            "/search",
            "Search releases",
            |total| format!("Showing {total} recent releases"),
            |_, release| {
                let href = format!("/releases/{}", release.slug);
                let pill = release
                    .release_type
                    .clone()
                    .unwrap_or_else(|| "Release".into());
                let date = release.release_date.clone().unwrap_or_else(|| "TBD".into());
                view! {
                    <li class="result-card">
                        <span class="pill">{pill}</span>
                        <div class="result-body">
                            <a class="result-label" href=href>{release.title}</a>
                        </div>
                        <span class="result-score">{date}</span>
                    </li>
                }
                .into_any()
            },
        )
    };

    render_result_page(
        "Releases",
        "Latest official releases and recordings.",
        "Loading releases",
        "Fetching latest release metadata.",
        || async {
            load_with_limit_sources(
                25,
                |limit| async move { dmb_idb::list_recent_releases(limit).await.ok() },
                |limit| async move { get_recent_releases(limit).await.unwrap_or_default() },
                normalize_releases,
            )
            .await
        },
        render,
    )
}
