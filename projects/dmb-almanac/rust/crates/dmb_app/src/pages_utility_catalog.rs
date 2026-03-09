use super::*;
#[cfg(any(feature = "hydrate", feature = "ssr"))]
use crate::server::{get_all_releases, get_liberation_list};
#[cfg(feature = "hydrate")]
use crate::server::get_recent_releases;

fn render_liberation_items(list: Vec<LiberationEntry>) -> impl IntoView {
    if list.is_empty() {
        return empty_state_with_link(
            "No liberation data available",
            "Gap calculations are currently unavailable.",
            "/songs",
            "Browse songs",
        )
        .into_any();
    }
    let count = list.len();
    view! {
        <>
            <p class="list-summary">{format!("Showing top {count} longest song gaps")}</p>
            <ul class="result-list">
                {list
                    .into_iter()
                    .enumerate()
                    .map(|(idx, entry)| {
                        let label = entry
                            .song
                            .as_ref()
                            .map_or_else(|| format!("Song #{}", entry.song_id), |song| song.title.clone());
                        let days = entry.days_since.unwrap_or(0);
                        let shows = entry.shows_since.unwrap_or(0);
                        let last_played = entry
                            .last_played_date
                            .clone()
                            .unwrap_or_else(|| "unknown".to_string());
                        view! {
                            <li class="result-card">
                                <span class="pill">{format!("#{}", idx + 1)}</span>
                                <div class="result-body">
                                    <span class="result-label">{label}</span>
                                    <span class="result-meta">{format!("{shows} shows since • last played {last_played}")}</span>
                                </div>
                                <span class="result-score">{format!("{days} days")}</span>
                            </li>
                        }
                    })
                    .collect::<Vec<_>>()}
            </ul>
        </>
    }
    .into_any()
}

fn render_discography_items(list: Vec<Release>) -> impl IntoView {
    if list.is_empty() {
        return empty_state_with_link(
            "No releases available",
            "Release catalog rows are currently unavailable.",
            "/releases",
            "Browse recent releases",
        )
        .into_any();
    }
    let count = list.len();
    view! {
        <>
            <p class="list-summary">{format!("Showing {count} releases")}</p>
            <ul class="result-list">
                {list
                    .into_iter()
                    .map(|release| {
                        let href = format!("/releases/{}", release.slug);
                        let release_type = release
                            .release_type
                            .clone()
                            .unwrap_or_else(|| "Release".to_string());
                        let release_date = release
                            .release_date
                            .clone()
                            .unwrap_or_else(|| "-".to_string());
                        view! {
                            <li class="result-card">
                                <span class="pill">{release_type}</span>
                                <div class="result-body">
                                    <a class="result-label" href=href>{release.title}</a>
                                </div>
                                <span class="result-score">{release_date}</span>
                            </li>
                        }
                    })
                    .collect::<Vec<_>>()}
            </ul>
        </>
    }
    .into_any()
}

#[must_use]
pub fn liberation_page() -> impl IntoView {
    let items = unit_resource(|| async {
        #[cfg(feature = "hydrate")]
        {
            let local_items =
                spawn_local_to_send(async { dmb_idb::list_liberation_entries(50).await.ok() })
                    .await
                    .unwrap_or_default();
            if !local_items.is_empty() {
                local_items
            } else {
                get_liberation_list(50).await.unwrap_or_default()
            }
        }
        #[cfg(all(not(feature = "hydrate"), feature = "ssr"))]
        {
            get_liberation_list(50).await.unwrap_or_default()
        }
        #[cfg(not(any(feature = "hydrate", feature = "ssr")))]
        {
            Vec::new()
        }
    });

    view! {
        <section class="page">
            <h1>"Liberation List"</h1>
            <p class="lead">"Songs with the longest gaps since last play."</p>
            <Suspense
                fallback=move || {
                    loading_state(
                        "Loading liberation list",
                        "Computing gap durations and recent play context.",
                    )
                }
            >
                {move || render_liberation_items(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

#[must_use]
pub fn discography_page() -> impl IntoView {
    let items = unit_resource(|| async {
        #[cfg(feature = "hydrate")]
        let releases = {
            let local_items =
                spawn_local_to_send(async { dmb_idb::list_all_releases().await.ok() })
                    .await
                    .unwrap_or_default();
            if !local_items.is_empty() {
                local_items
            } else {
                get_all_releases().await.unwrap_or_default()
            }
        };
        #[cfg(all(not(feature = "hydrate"), feature = "ssr"))]
        let releases = get_all_releases().await.unwrap_or_default();
        #[cfg(not(any(feature = "hydrate", feature = "ssr")))]
        let releases: Vec<Release> = Vec::new();

        #[cfg(feature = "hydrate")]
        {
            if !releases.is_empty() {
                return releases;
            }
            get_recent_releases(200).await.unwrap_or_default()
        }
        #[cfg(not(feature = "hydrate"))]
        {
            releases
        }
    });

    view! {
        <section class="page">
            <h1>"Discography"</h1>
            <p class="lead">"Complete release catalog."</p>
            <Suspense
                fallback=move || {
                    loading_state("Loading discography", "Fetching full release catalog.")
                }
            >
                {move || render_discography_items(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

#[must_use]
pub fn visualizations_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"Visualizations"</h1>
            <p class="lead">"Live data visual summaries are available through Rust-native routes."</p>
            <div class="card-grid">
                <a class="card card-link" href="/stats">
                    <h2>"Stats Dashboard"</h2>
                    <p class="muted">"Shows by year, top songs, venues, guests, and era splits."</p>
                </a>
                <a class="card card-link" href="/liberation">
                    <h2>"Liberation Trends"</h2>
                    <p class="muted">"Longest gaps, recent liberations, and rarity context."</p>
                </a>
                <a class="card card-link" href="/shows">
                    <h2>"Show Browser"</h2>
                    <p class="muted">"Use date and venue metadata as a timeline-style exploration flow."</p>
                </a>
            </div>
            <p class="muted">
                "Additional dedicated visualization modules are being migrated to this route without changing route contracts."
            </p>
        </section>
    }
}
