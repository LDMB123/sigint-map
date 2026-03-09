use super::*;

pub(crate) fn normalize_search_filter(raw: &str) -> String {
    let normalized = raw.trim().to_ascii_lowercase();
    match normalized.as_str() {
        "song" | "show" | "venue" | "tour" | "guest" | "release" => normalized,
        _ => "all".to_string(),
    }
}

pub(crate) fn detail_nav(href: &'static str, label: &'static str) -> impl IntoView {
    let copy_label = RwSignal::new(String::from("Copy link"));
    let copy_pending = RwSignal::new(false);

    #[cfg(feature = "hydrate")]
    let on_copy = {
        let copy_label_signal = copy_label.clone();
        let copy_pending_signal = copy_pending.clone();
        move |_| {
            if copy_pending_signal.get_untracked() {
                return;
            }
            copy_pending_signal.set(true);
            copy_label_signal.set(String::from("Copying..."));
            let copy_label_signal = copy_label_signal.clone();
            let copy_pending_signal = copy_pending_signal.clone();
            spawn_local(async move {
                let href = crate::browser::runtime::location_href().unwrap_or_default();
                let copied = crate::browser::runtime::write_clipboard_text(&href).await;
                if copied {
                    copy_label_signal.set(String::from("Copied"));
                } else {
                    copy_label_signal.set(String::from("Copy failed"));
                }
                copy_pending_signal.set(false);
                wait_ms(1400).await;
                copy_label_signal.set(String::from("Copy link"));
            });
        }
    };

    #[cfg(not(feature = "hydrate"))]
    let on_copy = |_| {};

    view! {
        <p class="detail-nav">
            <a class="detail-nav__link" href=href>{label}</a>
            <button
                type="button"
                class="pill pill--ghost detail-nav__copy"
                disabled=move || copy_pending.get()
                on:click=on_copy
            >
                {move || copy_label.get()}
            </button>
        </p>
    }
}

fn normalize_with_limit<T>(
    mut items: Vec<T>,
    limit: usize,
    mut compare: impl FnMut(&T, &T) -> Ordering,
) -> Vec<T> {
    items.sort_by(|a, b| compare(a, b));
    items.truncate(limit);
    items
}

pub(crate) fn normalize_show_summaries(items: Vec<ShowSummary>, limit: usize) -> Vec<ShowSummary> {
    normalize_with_limit(items, limit, |a, b| {
        b.date.cmp(&a.date).then_with(|| b.id.cmp(&a.id))
    })
}

pub(crate) fn normalize_songs(items: Vec<Song>, limit: usize) -> Vec<Song> {
    normalize_with_limit(items, limit, |a, b| {
        b.total_performances
            .unwrap_or(0)
            .cmp(&a.total_performances.unwrap_or(0))
            .then_with(|| a.title.cmp(&b.title))
            .then_with(|| a.id.cmp(&b.id))
    })
}

pub(crate) fn normalize_venues(items: Vec<Venue>, limit: usize) -> Vec<Venue> {
    normalize_with_limit(items, limit, |a, b| {
        b.total_shows
            .unwrap_or(0)
            .cmp(&a.total_shows.unwrap_or(0))
            .then_with(|| a.name.cmp(&b.name))
            .then_with(|| a.id.cmp(&b.id))
    })
}

pub(crate) fn normalize_guests(items: Vec<Guest>, limit: usize) -> Vec<Guest> {
    normalize_with_limit(items, limit, |a, b| {
        b.total_appearances
            .unwrap_or(0)
            .cmp(&a.total_appearances.unwrap_or(0))
            .then_with(|| a.name.cmp(&b.name))
            .then_with(|| a.id.cmp(&b.id))
    })
}

pub(crate) fn normalize_tours(items: Vec<Tour>, limit: usize) -> Vec<Tour> {
    normalize_with_limit(items, limit, |a, b| {
        b.year
            .cmp(&a.year)
            .then_with(|| b.total_shows.unwrap_or(0).cmp(&a.total_shows.unwrap_or(0)))
            .then_with(|| a.name.cmp(&b.name))
            .then_with(|| a.id.cmp(&b.id))
    })
}

pub(crate) fn normalize_releases(items: Vec<Release>, limit: usize) -> Vec<Release> {
    normalize_with_limit(items, limit, |a, b| {
        b.release_date
            .as_deref()
            .unwrap_or("")
            .cmp(a.release_date.as_deref().unwrap_or(""))
            .then_with(|| a.title.cmp(&b.title))
            .then_with(|| a.id.cmp(&b.id))
    })
}

pub(crate) fn format_location(city: &str, state: Option<&str>) -> String {
    match state {
        Some(state) if !state.is_empty() => format!("{city}, {state}"),
        _ => city.to_string(),
    }
}

pub(crate) fn optional_text_matches_query(value: Option<&str>, query: &str) -> bool {
    value.is_some_and(|text| text.to_ascii_lowercase().contains(query))
}

pub(crate) fn text_matches_query(value: &str, query: &str) -> bool {
    value.to_ascii_lowercase().contains(query)
}

pub(crate) fn normalized_nonempty_lower(raw: Option<&str>, fallback: &str) -> String {
    let normalized = raw.unwrap_or_default().trim().to_ascii_lowercase();
    if normalized.is_empty() {
        fallback.to_string()
    } else {
        normalized
    }
}

pub(crate) fn titleize_words_with_fallback(raw: &str, fallback: &str) -> String {
    let normalized = raw.trim().replace(['-', '_'], " ");
    let mut words = normalized
        .split_whitespace()
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(first) => format!("{}{}", first.to_ascii_uppercase(), chars.as_str()),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>();
    words.retain(|word| !word.is_empty());
    if words.is_empty() {
        fallback.to_string()
    } else {
        words.join(" ")
    }
}

pub(crate) fn format_mb_u64(bytes: u64) -> String {
    let tenths = (u128::from(bytes) * 10) / 1_000_000;
    format!("{}.{} MB", tenths / 10, tenths % 10)
}

pub(crate) fn normalized_disc_key(disc_number: Option<i32>) -> String {
    let disc = disc_number.unwrap_or(1).max(1);
    format!("disc-{disc}")
}

pub(crate) fn disc_key_label(key: &str) -> String {
    if let Some(raw) = key.strip_prefix("disc-")
        && let Ok(number) = raw.parse::<i32>()
        && number > 0
    {
        return format!("Disc {number}");
    }
    "Disc 1".to_string()
}

pub(crate) fn release_track_disc_counts(items: &[ReleaseTrack]) -> Vec<(String, usize)> {
    let mut counts = BTreeMap::<i32, usize>::new();
    for track in items {
        let disc = track.disc_number.unwrap_or(1).max(1);
        *counts.entry(disc).or_insert(0) += 1;
    }
    counts
        .into_iter()
        .map(|(disc, count)| (format!("disc-{disc}"), count))
        .collect()
}

pub(crate) fn release_track_matches_query(track: &ReleaseTrack, query: &str) -> bool {
    if query.is_empty() {
        return true;
    }
    let in_notes = optional_text_matches_query(track.notes.as_deref(), query);
    let in_numbers = format!(
        "{} {} {} {}",
        track.song_id.unwrap_or(0),
        track.show_id.unwrap_or(0),
        track.disc_number.unwrap_or(0),
        track.track_number.unwrap_or(0)
    )
    .contains(query);
    let in_track_type = (query == "live" && track.show_id.is_some())
        || (query == "studio" && track.show_id.is_none())
        || (query == "release" && track.show_id.is_none());
    in_notes || in_numbers || in_track_type
}
