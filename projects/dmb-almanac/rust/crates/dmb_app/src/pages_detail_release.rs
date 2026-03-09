use super::*;

fn render_release_detail_card(release: &Release) -> impl IntoView {
    let title = release.title.clone();
    let release_slug = release.slug.clone();
    let release_type = release
        .release_type
        .clone()
        .unwrap_or_else(|| "Release".to_string());
    let release_date = release
        .release_date
        .clone()
        .unwrap_or_else(|| "Unknown".to_string());
    view! {
        <div class="detail-list-head">
            <div class="detail-list-head__copy">
                <h2>{title.clone()}</h2>
                <p class="muted">{format!("{release_type} • {release_date}")}</p>
            </div>
            <div class="pill-row detail-list-head__meta">
                <span class="pill">{release_type.clone()}</span>
                <span class="pill pill--ghost">{release_date.clone()}</span>
                <a class="pill pill--ghost" href="/discography">"Open discography"</a>
            </div>
        </div>
        <div class="detail-grid">
            <div><strong>"Title"</strong><span>{title}</span></div>
            <div><strong>"Type"</strong><span>{release_type}</span></div>
            <div><strong>"Date"</strong><span>{release_date}</span></div>
            <div><strong>"Slug"</strong><span>{release_slug}</span></div>
        </div>
    }
    .into_any()
}

fn render_release_track_filter_buttons(
    disc_counts: Vec<(String, usize)>,
    active_disc: RwSignal<String>,
) -> impl IntoView {
    disc_counts
        .into_iter()
        .map(|(disc_key, count)| {
            let label = disc_key_label(&disc_key);
            let key_for_class = disc_key.clone();
            let key_for_aria = disc_key.clone();
            let key_for_click = disc_key.clone();
            view! {
                <button
                    type="button"
                    class="result-filter pill pill--ghost"
                    class:result-filter--active=move || active_disc.get() == key_for_class
                    aria-pressed=move || active_disc.get() == key_for_aria
                    on:click=move |_| active_disc.set(key_for_click.clone())
                >
                    {format!("{label} ({count})")}
                </button>
            }
        })
        .collect::<Vec<_>>()
}

fn render_release_track_rows(filtered_tracks: Vec<ReleaseTrack>) -> impl IntoView {
    view! {
        <ol id="release-track-results" class="tracklist" aria-label="Release tracks">
            {filtered_tracks
                .into_iter()
                .map(|track| {
                    let track_label = track
                        .song_id
                        .map_or_else(|| "Unknown song".to_string(), |id| format!("Song #{id}"));
                    let number = track.track_number.unwrap_or(0);
                    let disc = track.disc_number.unwrap_or(1).max(1);
                    let track_pos = if number > 0 {
                        format!("{disc}-{number}")
                    } else {
                        format!("{disc}-?")
                    };
                    let mut context_parts =
                        vec![disc_key_label(&normalized_disc_key(track.disc_number))];
                    if let Some(duration) = track.duration_seconds
                        && duration > 0 {
                            context_parts.push(format!("{}:{:02}", duration / 60, duration % 60));
                        }
                    if track.show_id.is_some() {
                        context_parts.push("Live source".to_string());
                    }
                    let context_line = context_parts.join(" • ");
                    let notes = track
                        .notes
                        .as_deref()
                        .map(str::trim)
                        .filter(|notes| !notes.is_empty())
                        .map(ToString::to_string);
                    let show_link = track.show_id.map(|show_id| {
                        let href = format!("/shows/{show_id}");
                        view! { <a class="result-label" href=href>{format!("Open show #{show_id}")}</a> }
                    });
                    let slot_label = if track.show_id.is_some() {
                        "Live"
                    } else {
                        "Release"
                    };

                    view! {
                        <li class="tracklist-item">
                            <span class="tracklist-pos">{track_pos}</span>
                            <div class="tracklist-main">
                                <span class="tracklist-title">{track_label}</span>
                                <span class="tracklist-context">{context_line}</span>
                                {show_link}
                                {notes.map(|notes_line| view! {
                                    <span class="tracklist-note">{notes_line}</span>
                                })}
                            </div>
                            <span class="setlist-slot">{slot_label}</span>
                        </li>
                    }
                })
                .collect::<Vec<_>>()}
        </ol>
    }
    .into_any()
}

fn render_release_tracks_content(
    items: Vec<ReleaseTrack>,
    active_disc: RwSignal<String>,
    track_query: RwSignal<String>,
) -> impl IntoView {
    if items.is_empty() {
        return empty_state(
            "No tracks available",
            "Track rows were not found for this release.",
        )
        .into_any();
    }

    let total_count = items.len();
    let disc_counts = release_track_disc_counts(&items);
    let active_key = active_disc.get();
    let query_text = track_query.get().trim().to_string();
    let query_normalized = query_text.to_ascii_lowercase();
    let filtered_tracks = items
        .into_iter()
        .filter(|track| {
            let disc_key = normalized_disc_key(track.disc_number);
            let matches_disc = active_key == "all" || disc_key == active_key;
            matches_disc && release_track_matches_query(track, &query_normalized)
        })
        .collect::<Vec<_>>();
    let filtered_count = filtered_tracks.len();
    let has_filters = active_key != "all" || !query_text.is_empty();
    let summary = if query_text.is_empty() {
        format!("Showing {filtered_count} of {total_count} tracks")
    } else {
        format!("Showing {filtered_count} of {total_count} tracks matching \"{query_text}\"")
    };

    view! {
        <div class="detail-list-controls">
            <label class="visually-hidden" for="release-track-filter">"Filter release tracks"</label>
            <input
                id="release-track-filter"
                class="search-input"
                type="search"
                placeholder="Filter by song id, show id, disc, notes, or live/studio"
                prop:value=move || track_query.get()
                on:input=move |ev| track_query.set(event_target_value(&ev))
            />
            <div
                class="result-filters"
                role="group"
                aria-label="Track filters"
                aria-controls="release-track-results"
            >
                <button
                    type="button"
                    class="result-filter pill pill--ghost"
                    class:result-filter--active=move || active_disc.get() == "all"
                    aria-pressed=move || active_disc.get() == "all"
                    on:click=move |_| active_disc.set("all".to_string())
                >
                    {format!("All ({total_count})")}
                </button>
                {render_release_track_filter_buttons(disc_counts, active_disc)}
            </div>
        </div>
        <p class="list-summary" role="status" aria-live="polite">
            {summary}
        </p>
        {if filtered_tracks.is_empty() {
            view! {
                <section class="status-card status-card--empty">
                    <p class="status-title">"No tracks match this view"</p>
                    <p class="muted">"Try another disc filter or clear the search query."</p>
                    {has_filters.then(|| view! {
                        <div class="pill-row">
                            <button
                                type="button"
                                class="pill pill--ghost"
                                on:click=move |_| {
                                    active_disc.set("all".to_string());
                                    track_query.set(String::new());
                                }
                            >
                                "Clear filters"
                            </button>
                        </div>
                    })}
                </section>
            }
                .into_any()
        } else {
            render_release_track_rows(filtered_tracks).into_any()
        }}
    }
    .into_any()
}

#[must_use]
pub fn release_detail_page() -> impl IntoView {
    let slug = route_param_or_default("slug");
    let seed_data_state = use_seed_data_state();
    let active_disc = RwSignal::new("all".to_string());
    let track_query = RwSignal::new(String::new());
    reset_filter_and_query_on_route_change(slug, active_disc, track_query);

    let render = move |release: Option<Release>| {
        if let Some(release) = release {
            return render_release_detail_card(&release).into_any();
        }
        render_import_or_missing_with_link(
            seed_data_state,
            "Release details are still loading",
            "Release not found",
            "This release slug could not be resolved.",
            "/releases",
            "Browse releases",
        )
    };

    let release =
        optional_resource_from_param!(slug, parse_route_slug_param, |slug: String| async move {
            load_entity_by_slug!(slug, dmb_idb::get_release_by_slug, get_release)
        });
    let tracks = resource_from_param_or_default!(
        slug,
        parse_route_slug_param,
        Some(Vec::new()),
        |slug: String| async move {
            let release = load_entity_by_slug!(slug, dmb_idb::get_release_by_slug, get_release);
            Some(match release {
                Some(_release) => load_with_hydrate_or_ssr_list!(
                    dmb_idb::list_release_tracks(_release.id),
                    get_release_tracks(_release.id)
                ),
                None => Vec::new(),
            })
        }
    );

    view! {
        <section class="page">
            {detail_nav("/releases", "Back to releases")}
            <h1>"Release Details"</h1>
            {move || render_route_param_subhead("Slug", &slug(), parse_route_slug_param)}
            <Suspense fallback=move || loading_state("Loading release", "Fetching release metadata.")>
                {move || render(release.get().unwrap_or(None))}
            </Suspense>
            <div class="section-divider"></div>
            <h2>"Tracks"</h2>
            <Suspense fallback=move || loading_state("Loading tracks", "Fetching track listing.")>
                {move || {
                    if let Some(items) = tracks.get().unwrap_or(None) {
                        render_release_tracks_content(items, active_disc.clone(), track_query.clone())
                            .into_any()
                    } else {
                        empty_state(
                            "Tracks unavailable",
                            "Track rows could not be loaded for this release.",
                        )
                        .into_any()
                    }
                }}
            </Suspense>
        </section>
    }
}
