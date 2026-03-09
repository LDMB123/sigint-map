use super::*;

#[must_use]
pub fn song_detail_page() -> impl IntoView {
    let slug = route_param_or_default("slug");
    let seed_data_state = use_seed_data_state();
    let render = move |song: Option<Song>| {
        if let Some(song) = song {
            return render_song_detail_content(song).into_any();
        }
        render_import_or_missing_with_link(
            seed_data_state,
            "Song details are still loading",
            "Song not found",
            "This song slug could not be resolved.",
            "/songs",
            "Browse songs",
        )
    };

    let song =
        optional_resource_from_param!(slug, parse_route_slug_param, |slug: String| async move {
            load_entity_by_slug!(slug, dmb_idb::get_song, get_song)
        });

    detail_page_with_primary_resource!(
        back_href: "/songs",
        back_label: "Back to songs",
        title: "Song Details",
        subhead: move || render_route_param_subhead("Slug", &slug(), parse_route_slug_param),
        loading_title: "Loading song",
        loading_message: "Fetching song profile and performance stats.",
        content: move || render(song.get().unwrap_or(None)),
    )
}

fn render_song_slot_distribution(
    total_plays: i32,
    slot_rows: Vec<(&'static str, i32)>,
) -> impl IntoView {
    if total_plays <= 0 {
        return empty_state(
            "Slot distribution unavailable",
            "No performance totals are available yet for this song.",
        )
        .into_any();
    }
    view! {
        <ul class="result-list">
            {slot_rows
                .into_iter()
                .map(|(slot, count)| {
                    let percentage = (f64::from(count) / f64::from(total_plays)) * 100.0;
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
}

fn render_song_detail_content(song: Song) -> impl IntoView {
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
        {render_song_slot_distribution(total_plays, slot_rows)}
    }
    .into_any()
}

#[must_use]
pub fn guest_detail_page() -> impl IntoView {
    let slug = route_param_or_default("slug");
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
        None => render_import_or_missing_with_link(
            seed_data_state,
            "Guest details are still loading",
            "Guest not found",
            "This guest slug could not be resolved.",
            "/guests",
            "Browse guests",
        ),
    };

    let guest =
        optional_resource_from_param!(slug, parse_route_slug_param, |slug: String| async move {
            load_entity_by_slug!(slug, dmb_idb::get_guest_by_slug, get_guest)
        });

    detail_page_with_primary_resource!(
        back_href: "/guests",
        back_label: "Back to guests",
        title: "Guest Details",
        subhead: move || render_route_param_subhead("Slug", &slug(), parse_route_slug_param),
        loading_title: "Loading guest",
        loading_message: "Fetching guest appearance profile.",
        content: move || render(guest.get().unwrap_or(None)),
    )
}
