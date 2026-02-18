use super::*;

pub fn show_detail_page() -> impl IntoView {
    let params = use_params_map();
    let show_id = move || params.with(|p| p.get("showId").unwrap_or_default());
    let seed_data_state = use_seed_data_state();
    let active_set = RwSignal::new("all".to_string());
    let setlist_query = RwSignal::new(String::new());
    let saved_show_ids = RwSignal::new(std::collections::HashSet::<i32>::new());
    let save_pending = RwSignal::new(false);
    let save_message = RwSignal::new(None::<(String, bool)>);

    #[cfg(feature = "hydrate")]
    {
        let saved_show_ids_signal = saved_show_ids.clone();
        spawn_local(async move {
            let ids = load_user_attended_shows()
                .await
                .into_iter()
                .map(|item| item.show_id)
                .collect::<std::collections::HashSet<_>>();
            saved_show_ids_signal.set(ids);
        });
    }

    let show_id_for_reset = show_id.clone();
    {
        let active_set_signal = active_set.clone();
        let setlist_query_signal = setlist_query.clone();
        Effect::new(move |_| {
            let _ = show_id_for_reset();
            active_set_signal.set("all".to_string());
            setlist_query_signal.set(String::new());
        });
    }
    let render = move |ctx: Option<ShowContext>| match ctx {
        Some(ctx) => {
            let show = ctx.show;
            let venue_name = ctx
                .venue
                .as_ref()
                .map(|venue| venue.name.clone())
                .unwrap_or_else(|| format!("Venue #{}", show.venue_id));
            let venue_line = ctx
                .venue
                .as_ref()
                .map(|venue| {
                    format!(
                        "{} • {}",
                        venue.name,
                        format_location(&venue.city, &venue.state)
                    )
                })
                .unwrap_or_else(|| venue_name.clone());
            let tour_line = ctx
                .tour
                .as_ref()
                .map(|tour| format!("{} ({})", tour.name, tour.year))
                .unwrap_or_else(|| "No tour".into());
            let tour_href = ctx
                .tour
                .as_ref()
                .map(|tour| format!("/tours/{}", tour.year));
            let venue_href = format!("/venues/{}", show.venue_id);
            let song_count = show.song_count.unwrap_or(0);
            let rarity = show
                .rarity_index
                .map(|v| format!("{:.2}", v))
                .unwrap_or_else(|| "-".into());
            let show_id_value = show.id;
            #[cfg(feature = "hydrate")]
            let show_date_value = show.date.clone();
            #[cfg(feature = "hydrate")]
            let saved_show_ids_signal = saved_show_ids.clone();
            #[cfg(feature = "hydrate")]
            let save_pending_signal = save_pending.clone();
            #[cfg(feature = "hydrate")]
            let save_message_signal = save_message.clone();
            view! {
                <div class="detail-list-head">
                    <div class="detail-list-head__copy">
                        <h2>{show.date.clone()}</h2>
                        <p class="muted">{format!("{venue_line} • {tour_line}")}</p>
                    </div>
                    <div class="pill-row detail-list-head__meta">
                        <span class="pill">{format!("{song_count} songs")}</span>
                        <span class="pill pill--ghost">{format!("Rarity {rarity}")}</span>
                        <button
                            type="button"
                            class=move || {
                                if saved_show_ids.get().contains(&show_id_value) {
                                    "pill"
                                } else {
                                    "pill pill--ghost"
                                }
                            }
                            disabled=move || save_pending.get()
                            on:click=move |_| {
                                #[cfg(feature = "hydrate")]
                                {
                                    if save_pending_signal.get_untracked() {
                                        return;
                                    }
                                    save_pending_signal.set(true);
                                    let saved_show_ids_signal = saved_show_ids_signal.clone();
                                    let save_pending_signal = save_pending_signal.clone();
                                    let save_message_signal = save_message_signal.clone();
                                    let show_date_value = show_date_value.clone();
                                    spawn_local(async move {
                                        let currently_saved = saved_show_ids_signal
                                            .with_untracked(|ids| ids.contains(&show_id_value));
                                        let action_ok = if currently_saved {
                                            remove_user_attended_show(show_id_value).await
                                        } else {
                                            add_user_attended_show(show_id_value, Some(show_date_value))
                                                .await
                                        };

                                        if action_ok {
                                            let ids = load_user_attended_shows()
                                                .await
                                                .into_iter()
                                                .map(|item| item.show_id)
                                                .collect::<std::collections::HashSet<_>>();
                                            saved_show_ids_signal.set(ids);
                                            if currently_saved {
                                                save_message_signal.set(Some((
                                                    format!(
                                                        "Removed show {show_id_value} from My Shows."
                                                    ),
                                                    false,
                                                )));
                                            } else {
                                                save_message_signal.set(Some((
                                                    format!("Saved show {show_id_value} to My Shows."),
                                                    false,
                                                )));
                                            }
                                        } else if currently_saved {
                                            save_message_signal.set(Some((
                                                "Unable to remove this show from My Shows right now."
                                                    .to_string(),
                                                true,
                                            )));
                                        } else {
                                            save_message_signal.set(Some((
                                                "Unable to save this show to My Shows right now."
                                                    .to_string(),
                                                true,
                                            )));
                                        }
                                        save_pending_signal.set(false);
                                    });
                                }
                            }
                        >
                            {move || {
                                if save_pending.get() {
                                    "Updating..."
                                } else if saved_show_ids.get().contains(&show_id_value) {
                                    "Remove from My Shows"
                                } else {
                                    "Save to My Shows"
                                }
                            }}
                        </button>
                        <a class="pill pill--ghost" href="/my-shows">"My Shows"</a>
                        <a class="pill pill--ghost" href=venue_href>"Venue details"</a>
                        {tour_href.map(|href| view! {
                            <a class="pill pill--ghost" href=href>"Tour details"</a>
                        })}
                    </div>
                </div>
                <div class="detail-grid">
                    <div><strong>"Date"</strong><span>{show.date}</span></div>
                    <div><strong>"Venue"</strong><span>{venue_line}</span></div>
                    <div><strong>"Tour"</strong><span>{tour_line}</span></div>
                    <div><strong>"Year"</strong><span>{show.year}</span></div>
                    <div><strong>"Songs"</strong><span>{song_count}</span></div>
                    <div><strong>"Rarity Index"</strong><span>{rarity}</span></div>
                </div>
            }
            .into_any()
        }
        None => {
            if seed_data_state.get() == crate::data::SeedDataState::Importing {
                import_in_progress_state(
                    "Show details are still loading",
                    "/offline",
                    "Open offline help",
                )
                .into_any()
            } else {
                match parse_positive_i32_param(&show_id(), "showId") {
                    Ok(parsed_show_id) => {
                        let my_shows_href = format!("/my-shows?showId={parsed_show_id}");
                        view! {
                            <section class="status-card status-card--empty">
                                <p class="status-title">"Show not found"</p>
                                <p class="muted">"This show ID was not found in the current dataset."</p>
                                <div class="pill-row">
                                    <a class="pill pill--ghost" href="/shows">"Browse all shows"</a>
                                    <a class="pill pill--ghost" href=my_shows_href>"Track this show in My Shows"</a>
                                </div>
                            </section>
                        }
                            .into_any()
                    }
                    Err(_) => view! {
                        {empty_state_with_link(
                            "Show not found",
                            "This show ID was not found in the current dataset.",
                            "/shows",
                            "Browse all shows",
                        )}
                    }
                    .into_any(),
                }
            }
        }
    };

    let show = Resource::new(show_id, |id: String| async move {
        let id = parse_positive_i32_param(&id, "showId").ok()?;
        load_show_context(id).await
    });
    let setlist = Resource::new(show_id, |id: String| async move {
        let id = parse_positive_i32_param(&id, "showId").ok()?;
        Some(load_setlist_entries(id).await)
    });

    view! {
        <section class="page">
            {detail_nav("/shows", "Back to shows")}
            <h1>"Show Details"</h1>
            {move || {
                parsed_subhead(parse_positive_i32_param(&show_id(), "showId"), "Show ID")
            }}
            {move || {
                save_message.get().map(|(msg, is_error)| {
                    let class_name = if is_error {
                        "form-message form-message--error"
                    } else {
                        "form-message"
                    };
                    view! { <p class=class_name>{msg}</p> }
                })
            }}
            <Suspense fallback=move || loading_state("Loading show", "Fetching show summary and context.")>
                {move || render(show.get().unwrap_or(None))}
            </Suspense>
            <div class="section-divider"></div>
            <h2>"Setlist"</h2>
            <Suspense fallback=move || loading_state("Loading setlist", "Building setlist sequence for this show.")>
                {move || {
                    match setlist.get().unwrap_or(None) {
                        Some(items) => {
                            if items.is_empty() {
                                empty_state(
                                    "Setlist unavailable",
                                    "No setlist rows were found for this show.",
                                )
                                .into_any()
                            } else {
                                let total_count = items.len();
                                let set_counts = setlist_set_counts(&items);
                                let active_key = active_set.get();
                                let (query_text, query_normalized) =
                                    normalize_query(&setlist_query.get());
                                let filtered_items = items
                                    .into_iter()
                                    .filter(|entry| {
                                        let set_key = normalized_set_key(entry.set_name.as_deref());
                                        let matches_set = active_key == "all" || set_key == active_key;
                                        matches_set && setlist_entry_matches_query(entry, &query_normalized)
                                    })
                                    .collect::<Vec<_>>();
                                let filtered_count = filtered_items.len();
                                let has_filters = active_key != "all" || !query_text.is_empty();
                                let summary =
                                    filtered_summary(filtered_count, total_count, "setlist entries", &query_text);
                                view! {
                                    <div class="detail-list-controls">
                                        <label class="visually-hidden" for="show-setlist-filter">"Filter setlist entries"</label>
                                        <input
                                            id="show-setlist-filter"
                                            class="search-input"
                                            type="search"
                                            placeholder="Filter by song, set name, slot, or notes"
                                            prop:value=move || setlist_query.get()
                                            on:input=move |ev| setlist_query.set(event_target_value(&ev))
                                        />
                                        <div
                                            class="result-filters"
                                            role="group"
                                            aria-label="Setlist filters"
                                            aria-controls="show-setlist-results"
                                        >
                                            {all_filter_button(total_count, active_set)}
                                            {render_filter_options(
                                                set_counts,
                                                active_set,
                                                setlist_set_label,
                                            )}
                                        </div>
                                    </div>
                                    <p class="list-summary" role="status" aria-live="polite">
                                        {summary}
                                    </p>
                                    {if filtered_items.is_empty() {
                                        empty_filtered_results(
                                            "No setlist entries match this view",
                                            "Try a different set filter or clear the search query.",
                                            has_filters,
                                            move || {
                                                active_set.set("all".to_string());
                                                setlist_query.set(String::new());
                                            },
                                        )
                                        .into_any()
                                    } else {
                                        view! {
                                            <ol
                                                id="show-setlist-results"
                                                class="setlist"
                                                aria-label="Show setlist"
                                            >
                                                {filtered_items
                                                    .into_iter()
                                                    .map(|entry| {
                                                        let label = entry
                                                            .song
                                                            .as_ref()
                                                            .map(|song| song.title.clone())
                                                            .unwrap_or_else(|| format!("Song #{}", entry.song_id));
                                                        let slot = entry
                                                            .slot
                                                            .as_deref()
                                                            .map(titleize_label)
                                                            .unwrap_or_else(|| "Song".to_string());
                                                        let set_label =
                                                            setlist_set_label(&normalized_set_key(entry.set_name.as_deref()));
                                                        let song_href = entry.song.as_ref().and_then(|song| {
                                                            let slug = song.slug.trim();
                                                            if slug.is_empty() {
                                                                None
                                                            } else {
                                                                Some(format!("/songs/{slug}"))
                                                            }
                                                        });
                                                        let title_view = match song_href {
                                                            Some(href) => view! {
                                                                <a class="setlist-title result-label" href=href>{label.clone()}</a>
                                                            }
                                                            .into_any(),
                                                            None => view! { <span class="setlist-title">{label.clone()}</span> }.into_any(),
                                                        };

                                                        let mut context_parts = vec![format!("Set: {set_label}")];
                                                        if entry.is_segue.unwrap_or(false) {
                                                            context_parts.push("Segue".to_string());
                                                        }
                                                        if entry.is_tease.unwrap_or(false) {
                                                            context_parts.push("Tease".to_string());
                                                        }
                                                        push_duration_context(
                                                            &mut context_parts,
                                                            entry.duration_seconds,
                                                        );
                                                        let context_line = context_parts.join(" • ");
                                                        let notes =
                                                            trimmed_non_empty_owned(entry.notes.as_deref());

                                                        view! {
                                                            <li class="setlist-item">
                                                                <span class="setlist-pos">{entry.position}</span>
                                                                <div class="setlist-main">
                                                                    {title_view}
                                                                    <span class="setlist-context">{context_line}</span>
                                                                    {notes.map(|notes_line| view! {
                                                                        <span class="setlist-note">{notes_line}</span>
                                                                    })}
                                                                </div>
                                                                <span class="setlist-slot">{slot}</span>
                                                            </li>
                                                        }
                                                    })
                                                    .collect::<Vec<_>>()}
                                            </ol>
                                        }
                                            .into_any()
                                    }}
                                }
                                .into_any()
                            }
                        }
                        None => {
                            empty_state(
                                "Setlist unavailable",
                                "No setlist rows were found for this show.",
                            )
                            .into_any()
                        }
                    }
                }}
            </Suspense>
        </section>
    }
}

pub fn song_detail_page() -> impl IntoView {
    let params = use_params_map();
    let slug = move || params.with(|p| p.get("slug").unwrap_or_default());
    let seed_data_state = use_seed_data_state();
    let render = move |song: Option<Song>| match song {
        Some(song) => {
            let title = song.title.clone();
            let sort_title = song.sort_title.unwrap_or_else(|| "-".to_string());
            let song_slug = song.slug.clone();
            let total_plays = song.total_performances.unwrap_or(0).max(0);
            let last_played = song
                .last_played_date
                .clone()
                .unwrap_or_else(|| "Unknown".to_string());
            let is_liberated = song.is_liberated.unwrap_or(false);
            let slot_rows = vec![
                ("Opener", song.opener_count.unwrap_or(0).max(0)),
                ("Closer", song.closer_count.unwrap_or(0).max(0)),
                ("Encore", song.encore_count.unwrap_or(0).max(0)),
            ];

            view! {
                <div class="detail-list-head">
                    <div class="detail-list-head__copy">
                        <h2>{title.clone()}</h2>
                        <p class="muted">
                            {if is_liberated {
                                "Currently showing extended gap behavior in recent setlists."
                            } else {
                                "Active in the regular song rotation profile."
                            }}
                        </p>
                    </div>
                    <div class="pill-row detail-list-head__meta">
                        <span class="pill">{format!("{total_plays} plays")}</span>
                        <span class=if is_liberated { "pill" } else { "pill pill--ghost" }>
                            {if is_liberated { "Liberated" } else { "In Rotation" }}
                        </span>
                        <a class="pill pill--ghost" href="/liberation">"View liberation list"</a>
                    </div>
                </div>
                <div class="detail-grid">
                    <div><strong>"Title"</strong><span>{title}</span></div>
                    <div><strong>"Last Played"</strong><span>{last_played}</span></div>
                    <div><strong>"Sort Title"</strong><span>{sort_title}</span></div>
                    <div><strong>"Slug"</strong><span>{song_slug}</span></div>
                </div>
                <h2>"Slot Distribution"</h2>
                <p class="list-summary">{format!("Based on {total_plays} tracked performances")}</p>
                {if total_plays <= 0 {
                    empty_state(
                        "Slot distribution unavailable",
                        "No performance totals are available yet for this song.",
                    )
                    .into_any()
                } else {
                    view! {
                        <ul class="result-list">
                            {slot_rows
                                .into_iter()
                                .map(|(slot, count)| {
                                    let percentage = (count as f32 / total_plays as f32) * 100.0;
                                    view! {
                                        <li class="result-card">
                                            <span class="pill pill--ghost">{slot}</span>
                                            <div class="result-body">
                                                <span class="result-label">{format!("{count} plays")}</span>
                                                <span class="result-meta">{format!("{percentage:.1}% of tracked performances")}</span>
                                            </div>
                                            <span class="result-score">{format!("{percentage:.1}%")}</span>
                                        </li>
                                    }
                                })
                                .collect::<Vec<_>>()}
                        </ul>
                    }
                    .into_any()
                }}
            }
            .into_any()
        }
        None => {
            if seed_data_state.get() == crate::data::SeedDataState::Importing {
                import_in_progress_state(
                    "Song details are still loading",
                    "/offline",
                    "Open offline help",
                )
                .into_any()
            } else {
                empty_state_with_link(
                    "Song not found",
                    "This song slug could not be resolved.",
                    "/songs",
                    "Browse songs",
                )
                .into_any()
            }
        }
    };

    let song = Resource::new(slug, |slug: String| async move {
        let slug = parse_slug_param(&slug, "slug").ok()?;
        load_song(slug).await
    });

    view! {
        <section class="page">
            {detail_nav("/songs", "Back to songs")}
            <h1>"Song Details"</h1>
            {move || {
                parsed_subhead(parse_slug_param(&slug(), "slug"), "Slug")
            }}
            <Suspense fallback=move || loading_state("Loading song", "Fetching song profile and performance stats.")>
                {move || render(song.get().unwrap_or(None))}
            </Suspense>
        </section>
    }
}

pub fn guest_detail_page() -> impl IntoView {
    let params = use_params_map();
    let slug = move || params.with(|p| p.get("slug").unwrap_or_default());
    let seed_data_state = use_seed_data_state();
    let render = move |guest: Option<Guest>| match guest {
        Some(guest) => {
            let name = guest.name.clone();
            let guest_slug = guest.slug.clone();
            let appearances = guest.total_appearances.unwrap_or(0).max(0);
            let activity_note = if appearances > 0 {
                format!("Tracked in {appearances} appearance records across the show history.")
            } else {
                "No appearance rows are currently indexed for this guest.".to_string()
            };

            view! {
                <div class="detail-list-head">
                    <div class="detail-list-head__copy">
                        <h2>{name.clone()}</h2>
                        <p class="muted">{activity_note}</p>
                    </div>
                    <div class="pill-row detail-list-head__meta">
                        <span class="pill">{format!("{appearances} appearances")}</span>
                        <span class="pill pill--ghost">{format!("Slug: {guest_slug}")}</span>
                        <a class="pill pill--ghost" href="/shows">"Browse shows"</a>
                    </div>
                </div>
                <div class="detail-grid">
                    <div><strong>"Name"</strong><span>{name}</span></div>
                    <div><strong>"Appearances"</strong><span>{appearances}</span></div>
                    <div><strong>"Slug"</strong><span>{guest_slug}</span></div>
                </div>
                <h2>"Explore"</h2>
                <ul class="result-list">
                    <li class="result-card">
                        <span class="pill pill--ghost">"Guests"</span>
                        <div class="result-body">
                            <a class="result-label" href="/guests">"Guest index"</a>
                            <span class="result-meta">"Browse all guests and compare total appearances."</span>
                        </div>
                    </li>
                    <li class="result-card">
                        <span class="pill pill--ghost">"Search"</span>
                        <div class="result-body">
                            <a class="result-label" href="/search">"Global search"</a>
                            <span class="result-meta">"Cross-check this guest against songs, shows, and venues."</span>
                        </div>
                    </li>
                </ul>
            }
            .into_any()
        }
        None => {
            if seed_data_state.get() == crate::data::SeedDataState::Importing {
                import_in_progress_state(
                    "Guest details are still loading",
                    "/offline",
                    "Open offline help",
                )
                .into_any()
            } else {
                empty_state_with_link(
                    "Guest not found",
                    "This guest slug could not be resolved.",
                    "/guests",
                    "Browse guests",
                )
                .into_any()
            }
        }
    };

    let guest = Resource::new(slug, |slug: String| async move {
        let slug = parse_slug_param(&slug, "slug").ok()?;
        load_guest(slug).await
    });

    view! {
        <section class="page">
            {detail_nav("/guests", "Back to guests")}
            <h1>"Guest Details"</h1>
            {move || {
                parsed_subhead(parse_slug_param(&slug(), "slug"), "Slug")
            }}
            <Suspense fallback=move || loading_state("Loading guest", "Fetching guest appearance profile.")>
                {move || render(guest.get().unwrap_or(None))}
            </Suspense>
        </section>
    }
}

pub fn release_detail_page() -> impl IntoView {
    let params = use_params_map();
    let slug = move || params.with(|p| p.get("slug").unwrap_or_default());
    let seed_data_state = use_seed_data_state();
    let active_disc = RwSignal::new("all".to_string());
    let track_query = RwSignal::new(String::new());
    let slug_for_reset = slug.clone();
    {
        let active_disc_signal = active_disc.clone();
        let track_query_signal = track_query.clone();
        Effect::new(move |_| {
            let _ = slug_for_reset();
            active_disc_signal.set("all".to_string());
            track_query_signal.set(String::new());
        });
    }

    let render = move |release: Option<Release>| match release {
        Some(release) => {
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
        None => {
            if seed_data_state.get() == crate::data::SeedDataState::Importing {
                import_in_progress_state(
                    "Release details are still loading",
                    "/offline",
                    "Open offline help",
                )
                .into_any()
            } else {
                empty_state_with_link(
                    "Release not found",
                    "This release slug could not be resolved.",
                    "/releases",
                    "Browse releases",
                )
                .into_any()
            }
        }
    };

    let release = Resource::new(slug, |slug: String| async move {
        let slug = parse_slug_param(&slug, "slug").ok()?;
        load_release(slug).await
    });
    let tracks = Resource::new(slug, |slug: String| async move {
        let Some(parsed_slug) = parse_slug_param(&slug, "slug").ok() else {
            return Some(Vec::new());
        };
        let release = load_release(parsed_slug).await;
        if let Some(release) = release {
            Some(load_release_tracks(release.id).await)
        } else {
            Some(Vec::new())
        }
    });

    view! {
        <section class="page">
            {detail_nav("/releases", "Back to releases")}
            <h1>"Release Details"</h1>
            {move || {
                parsed_subhead(parse_slug_param(&slug(), "slug"), "Slug")
            }}
            <Suspense fallback=move || loading_state("Loading release", "Fetching release metadata.")>
                {move || render(release.get().unwrap_or(None))}
            </Suspense>
            <div class="section-divider"></div>
            <h2>"Tracks"</h2>
            <Suspense fallback=move || loading_state("Loading tracks", "Fetching track listing.")>
                {move || {
                    if let Some(items) = tracks.get().unwrap_or(None) {
                        if items.is_empty() {
                            empty_state("No tracks available", "Track rows were not found for this release.")
                                .into_any()
                        } else {
                            let total_count = items.len();
                            let disc_counts = release_track_disc_counts(&items);
                            let active_key = active_disc.get();
                            let (query_text, query_normalized) = normalize_query(&track_query.get());
                            let filtered_tracks = items
                                .into_iter()
                                .filter(|track| {
                                    let disc_key = normalized_disc_key(track.disc_number);
                                    let matches_disc = active_key == "all" || disc_key == active_key;
                                    matches_disc
                                        && release_track_matches_query(track, &query_normalized)
                                })
                                .collect::<Vec<_>>();
                            let filtered_count = filtered_tracks.len();
                            let has_filters = active_key != "all" || !query_text.is_empty();
                            let summary =
                                filtered_summary(filtered_count, total_count, "tracks", &query_text);
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
                                        {all_filter_button(total_count, active_disc)}
                                        {render_filter_options(
                                            disc_counts,
                                            active_disc,
                                            disc_key_label,
                                        )}
                                    </div>
                                </div>
                                <p class="list-summary" role="status" aria-live="polite">
                                    {summary}
                                </p>
                                {if filtered_tracks.is_empty() {
                                    empty_filtered_results(
                                        "No tracks match this view",
                                        "Try another disc filter or clear the search query.",
                                        has_filters,
                                        move || {
                                            active_disc.set("all".to_string());
                                            track_query.set(String::new());
                                        },
                                    )
                                    .into_any()
                                } else {
                                    view! {
                                        <ol
                                            id="release-track-results"
                                            class="tracklist"
                                            aria-label="Release tracks"
                                        >
                                            {filtered_tracks
                                                .into_iter()
                                                .map(|track| {
                                                    let track_label = track
                                                        .song_id
                                                        .map(|id| format!("Song #{id}"))
                                                        .unwrap_or_else(|| "Unknown song".to_string());
                                                    let number = track.track_number.unwrap_or(0);
                                                    let disc = track.disc_number.unwrap_or(1).max(1);
                                                    let track_pos = if number > 0 {
                                                        format!("{disc}-{number}")
                                                    } else {
                                                        format!("{disc}-?")
                                                    };
                                                    let mut context_parts = vec![disc_key_label(&normalized_disc_key(track.disc_number))];
                                                    push_duration_context(&mut context_parts, track.duration_seconds);
                                                    if track.show_id.is_some() {
                                                        context_parts.push("Live source".to_string());
                                                    }
                                                    let context_line = context_parts.join(" • ");
                                                    let notes =
                                                        trimmed_non_empty_owned(track.notes.as_deref());
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
                                }}
                            }
                            .into_any()
                        }
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

pub fn tour_year_page() -> impl IntoView {
    let params = use_params_map();
    let year = move || params.with(|p| p.get("year").unwrap_or_default());
    let seed_data_state = use_seed_data_state();
    let render = move |tour: Option<Tour>| match tour {
        Some(tour) => {
            let year = tour.year;
            let name = tour.name.clone();
            let total_shows = tour.total_shows.unwrap_or(0).max(0);
            let activity_note = if total_shows > 0 {
                format!("{total_shows} shows are currently tracked for this tour year.")
            } else {
                "No show rows are currently indexed for this tour year.".to_string()
            };
            view! {
                <div class="detail-list-head">
                    <div class="detail-list-head__copy">
                        <h2>{name.clone()}</h2>
                        <p class="muted">{activity_note}</p>
                    </div>
                    <div class="pill-row detail-list-head__meta">
                        <span class="pill">{format!("{year}")}</span>
                        <span class="pill pill--ghost">{format!("{total_shows} shows")}</span>
                        <a class="pill pill--ghost" href="/shows">"Browse shows"</a>
                    </div>
                </div>
                <div class="detail-grid">
                    <div><strong>"Name"</strong><span>{name}</span></div>
                    <div><strong>"Year"</strong><span>{year}</span></div>
                    <div><strong>"Total Shows"</strong><span>{total_shows}</span></div>
                </div>
                <h2>"Explore"</h2>
                <ul class="result-list">
                    <li class="result-card">
                        <span class="pill pill--ghost">"Shows"</span>
                        <div class="result-body">
                            <a class="result-label" href="/shows">"Browse all shows"</a>
                            <span class="result-meta">"Use dates and venues to explore this era further."</span>
                        </div>
                    </li>
                    <li class="result-card">
                        <span class="pill pill--ghost">"Stats"</span>
                        <div class="result-body">
                            <a class="result-label" href="/stats">"Open stats dashboard"</a>
                            <span class="result-meta">"Compare this tour year against broader catalog trends."</span>
                        </div>
                    </li>
                </ul>
            }
            .into_any()
        }
        None => {
            if seed_data_state.get() == crate::data::SeedDataState::Importing {
                import_in_progress_state(
                    "Tour details are still loading",
                    "/offline",
                    "Open offline help",
                )
                .into_any()
            } else {
                empty_state_with_link(
                    "Tour not found",
                    "This year does not map to a tour record.",
                    "/tours",
                    "Browse tours",
                )
                .into_any()
            }
        }
    };

    let tour = Resource::new(year, |year: String| async move {
        let year = parse_tour_year_param(&year).ok()?;
        load_tour(year).await
    });

    view! {
        <section class="page">
            {detail_nav("/tours", "Back to tours")}
            <h1>"Tour Details"</h1>
            {move || {
                parsed_subhead(parse_tour_year_param(&year()), "Year")
            }}
            <Suspense fallback=move || loading_state("Loading tour", "Fetching tour details for this year.")>
                {move || render(tour.get().unwrap_or(None))}
            </Suspense>
        </section>
    }
}

pub fn venue_detail_page() -> impl IntoView {
    let params = use_params_map();
    let venue_id = move || params.with(|p| p.get("venueId").unwrap_or_default());
    let seed_data_state = use_seed_data_state();
    let render = move |venue: Option<Venue>| match venue {
        Some(venue) => {
            let name = venue.name.clone();
            let location = format_location(&venue.city, &venue.state);
            let country = venue.country.clone();
            let location_line = if location.is_empty() {
                country.clone()
            } else {
                format!("{location} • {country}")
            };
            let venue_type = venue
                .venue_type
                .clone()
                .unwrap_or_else(|| "Venue".to_string());
            let total_shows = venue.total_shows.unwrap_or(0).max(0);
            let country_code = venue.country_code.clone().unwrap_or_default();

            view! {
                <div class="detail-list-head">
                    <div class="detail-list-head__copy">
                        <h2>{name.clone()}</h2>
                        <p class="muted">{location_line}</p>
                    </div>
                    <div class="pill-row detail-list-head__meta">
                        <span class="pill">{venue_type.clone()}</span>
                        <span class="pill pill--ghost">{format!("{total_shows} shows")}</span>
                        {(!country_code.is_empty()).then(|| view! {
                            <span class="pill pill--ghost">{country_code.clone()}</span>
                        })}
                        <a class="pill pill--ghost" href="/shows">"Browse shows"</a>
                    </div>
                </div>
                <div class="detail-grid">
                    <div><strong>"Name"</strong><span>{name}</span></div>
                    <div><strong>"Location"</strong><span>{location}</span></div>
                    <div><strong>"Country"</strong><span>{country}</span></div>
                    <div><strong>"Type"</strong><span>{venue_type}</span></div>
                    <div><strong>"Total Shows"</strong><span>{total_shows}</span></div>
                </div>
                <h2>"Explore"</h2>
                <ul class="result-list">
                    <li class="result-card">
                        <span class="pill pill--ghost">"Venues"</span>
                        <div class="result-body">
                            <a class="result-label" href="/venues">"Venue index"</a>
                            <span class="result-meta">"Compare this venue with other tour stops."</span>
                        </div>
                    </li>
                    <li class="result-card">
                        <span class="pill pill--ghost">"Search"</span>
                        <div class="result-body">
                            <a class="result-label" href="/search">"Global search"</a>
                            <span class="result-meta">"Find related songs, tours, and shows from this location."</span>
                        </div>
                    </li>
                </ul>
            }
            .into_any()
        }
        None => {
            if seed_data_state.get() == crate::data::SeedDataState::Importing {
                import_in_progress_state(
                    "Venue details are still loading",
                    "/offline",
                    "Open offline help",
                )
                .into_any()
            } else {
                empty_state_with_link(
                    "Venue not found",
                    "This venue ID was not found in the current dataset.",
                    "/venues",
                    "Browse venues",
                )
                .into_any()
            }
        }
    };

    let venue = Resource::new(venue_id, |id: String| async move {
        let id = parse_positive_i32_param(&id, "venueId").ok()?;
        load_venue(id).await
    });

    view! {
        <section class="page">
            {detail_nav("/venues", "Back to venues")}
            <h1>"Venue Details"</h1>
            {move || {
                parsed_subhead(parse_positive_i32_param(&venue_id(), "venueId"), "Venue ID")
            }}
            <Suspense fallback=move || loading_state("Loading venue", "Fetching venue profile and location.")>
                {move || render(venue.get().unwrap_or(None))}
            </Suspense>
        </section>
    }
}
