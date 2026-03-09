use super::*;

#[allow(clippy::too_many_lines)]
fn render_show_detail_loaded(
    ctx: ShowContext,
    saved_show_ids: RwSignal<std::collections::HashSet<i32>>,
    save_pending: RwSignal<bool>,
    save_message: RwSignal<Option<(String, bool)>>,
) -> impl IntoView {
    let show = ctx.show;
    let venue_name = ctx.venue.as_ref().map_or_else(
        || format!("Venue #{}", show.venue_id),
        |venue| venue.name.clone(),
    );
    let venue_line = ctx.venue.as_ref().map_or_else(
        || venue_name.clone(),
        |venue| {
            format!(
                "{} • {}",
                venue.name,
                format_location(&venue.city, venue.state.as_deref())
            )
        },
    );
    let tour_line = ctx.tour.as_ref().map_or_else(
        || "No tour".into(),
        |tour| format!("{} ({})", tour.name, tour.year),
    );
    let tour_href = ctx
        .tour
        .as_ref()
        .map(|tour| format!("/tours/{}", tour.year));
    let venue_href = format!("/venues/{}", show.venue_id);
    let song_count = show.song_count.unwrap_or(0);
    let rarity = show
        .rarity_index
        .map_or_else(|| "-".into(), |v| format!("{v:.2}"));
    let show_id_value = show.id;
    let show_date_value = show.date.clone();

    let save_pending_for_button = save_pending.clone();
    let save_pending_for_label = save_pending.clone();
    let saved_show_ids_for_class = saved_show_ids.clone();
    let saved_show_ids_for_label = saved_show_ids.clone();
    let toggle_saved_show_ids = saved_show_ids.clone();
    let toggle_save_pending = save_pending.clone();
    let toggle_save_message = save_message.clone();

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
                        if saved_show_ids_for_class.get().contains(&show_id_value) {
                            "pill"
                        } else {
                            "pill pill--ghost"
                        }
                    }
                    disabled=move || save_pending_for_button.get()
                    on:click=move |_| {
                        #[cfg(feature = "hydrate")]
                        {
                            if toggle_save_pending.get_untracked() {
                                return;
                            }
                            toggle_save_pending.set(true);

                            let saved_show_ids_signal = toggle_saved_show_ids.clone();
                            let save_pending_signal = toggle_save_pending.clone();
                            let save_message_signal = toggle_save_message.clone();
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
                                            format!("Removed show {show_id_value} from My Shows."),
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
                        #[cfg(not(feature = "hydrate"))]
                        {
                            let _ = show_id_value;
                            let _ = &show_date_value;
                            let _ = &toggle_saved_show_ids;
                            let _ = &toggle_save_pending;
                            let _ = &toggle_save_message;
                        }
                    }
                >
                    {move || {
                        if save_pending_for_label.get() {
                            "Updating..."
                        } else if saved_show_ids_for_label.get().contains(&show_id_value) {
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
}

fn render_show_detail_missing(
    show_id_raw: &str,
    seed_data_state: RwSignal<crate::data::SeedDataState>,
) -> impl IntoView {
    if seed_data_state.get() == crate::data::SeedDataState::Importing {
        return import_in_progress_state(
            "Show details are still loading",
            "/offline",
            "Open offline help",
        )
        .into_any();
    }

    match parse_positive_i32_param(show_id_raw, "showId") {
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

pub(crate) fn render_show_context(
    ctx: Option<ShowContext>,
    show_id_raw: &str,
    seed_data_state: RwSignal<crate::data::SeedDataState>,
    saved_show_ids: RwSignal<std::collections::HashSet<i32>>,
    save_pending: RwSignal<bool>,
    save_message: RwSignal<Option<(String, bool)>>,
) -> impl IntoView {
    if let Some(ctx) = ctx {
        return render_show_detail_loaded(ctx, saved_show_ids, save_pending, save_message)
            .into_any();
    }
    render_show_detail_missing(show_id_raw, seed_data_state).into_any()
}
