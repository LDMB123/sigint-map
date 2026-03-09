use super::*;

#[must_use]
pub fn home_page() -> impl IntoView {
    let stats = unit_resource(|| async { get_home_stats().await.ok() });
    let storage = RwSignal::new(None::<crate::data::StorageInfo>);

    #[cfg(feature = "hydrate")]
    {
        let storage_signal = storage.clone();
        spawn_local(async move {
            let info = crate::data::estimate_storage().await;
            storage_signal.set(info);
        });
    }

    view! {
        <section class="page">
            <h1>DMB Almanac (Rust)</h1>
            <p class="lead">"Rust-first, WASM-hydrated, offline-ready."</p>
            {move || {
                storage.get().and_then(|info| {
                    let usage = info.usage.unwrap_or(0.0);
                    let quota = info.quota.unwrap_or(0.0);
                    if quota <= 0.0 {
                        return None;
                    }
                    let ratio = usage / quota;
                    if ratio < crate::data::STORAGE_PRESSURE_THRESHOLD {
                        return None;
                    }
                    Some(view! {
                        <div class="card card-warn">
                            <h2>"Storage nearly full"</h2>
                            <p class="muted">
                                {format!("{}% used. Consider clearing AI cache in the PWA panel.", (ratio * 100.0).round())}
                            </p>
                        </div>
                    })
                })
            }}
            <Suspense fallback=move || loading_state("Loading stats", "Fetching homepage totals.")>
                {move || match stats.get() {
                    Some(Some(stats)) => view! {
                        <div class="stats-grid">
                            <div class="stat-card">
                                <span class="stat-label">"Shows"</span>
                                <span class="stat-value">{stats.shows}</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-label">"Songs"</span>
                                <span class="stat-value">{stats.songs}</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-label">"Venues"</span>
                                <span class="stat-value">{stats.venues}</span>
                            </div>
                        </div>
                    }
                    .into_any(),
                    Some(None) => {
                        empty_state(
                            "Stats unavailable",
                            "Homepage metrics could not be loaded right now.",
                        )
                        .into_any()
                    }
                    None => view! { <div class="stats-grid"></div> }.into_any(),
                }}
            </Suspense>
            <div class="card-grid ai-links">
                <a class="card card-link" href="/ai-diagnostics">
                    <h2>"AI Diagnostics"</h2>
                    <p class="muted">"Inspect capabilities, indexes, and tuning."</p>
                </a>
                <a class="card card-link" href="/ai-benchmark">
                    <h2>"AI Benchmark"</h2>
                    <p class="muted">"Compare CPU vs GPU subset scoring."</p>
                </a>
                <a class="card card-link" href="/ai-warmup">
                    <h2>"AI Warmup"</h2>
                    <p class="muted">"Preload embeddings for faster search."</p>
                </a>
                <a class="card card-link" href="/ai-smoke">
                    <h2>"AI Smoke Test"</h2>
                    <p class="muted">"Run a quick semantic search sanity check."</p>
                </a>
            </div>
        </section>
    }
}

#[must_use]
pub fn static_page(title: &'static str) -> impl IntoView {
    view! {
        <section class="page">
            <h1>{title}</h1>
            <p class="lead">"This route is active in the Rust app and is being finalized."</p>
            <p class="muted">
                "Use the core browse routes and support pages while this section receives final data polish."
            </p>
            <div class="card-grid">
                <a class="card card-link" href="/shows">
                    <h2>"Browse Shows"</h2>
                    <p class="muted">"Open the primary browse flow."</p>
                </a>
                <a class="card card-link" href="/search">
                    <h2>"Search"</h2>
                    <p class="muted">"Use global search across songs, venues, tours, and more."</p>
                </a>
            </div>
        </section>
    }
}

#[must_use]
pub fn about_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"About"</h1>
            <p class="lead">"DMB Almanac Rust is an offline-first, WASM-powered browse and analytics app."</p>
            <p>
                "The Rust build serves the same feature set as the legacy frontend with improved rendering stability, stronger parity checks, and deterministic data fallbacks."
            </p>
            <div class="card-grid">
                <a class="card card-link" href="/protocol">
                    <h2>"Protocol"</h2>
                    <p class="muted">"Review how deep links and shared links are handled."</p>
                </a>
                <a class="card card-link" href="/offline">
                    <h2>"Offline"</h2>
                    <p class="muted">"Understand offline usage and cache expectations."</p>
                </a>
            </div>
        </section>
    }
}

#[must_use]
pub fn contact_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"Contact"</h1>
            <p class="lead">"Questions, issues, and feedback are welcome."</p>
            <div class="card">
                <p>
                    "Use the repository issues or support channel for bug reports, "
                    <strong>"offline behavior questions"</strong>
                    ", and data parity concerns."
                </p>
            </div>
            <ul class="result-list">
                <li class="result-card">
                    <span class="result-label">"Expected response"</span>
                    <span class="result-meta">"Support requests are usually acknowledged during business days."</span>
                </li>
                <li class="result-card">
                    <span class="result-label">"Fastest path"</span>
                    <span class="result-meta">"Include route, browser, and whether SW is installed."</span>
                </li>
            </ul>
        </section>
    }
}

#[must_use]
pub fn faq_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"FAQ"</h1>
            <p class="lead">"Common questions about app behavior, data, and PWA usage."</p>
            <div class="section-divider"></div>
            <h2>"How do I check if data loaded?"</h2>
            <p class="muted">"Open key browse routes such as /shows or /songs and watch for loading messages before data appears."</p>
            <div class="section-divider"></div>
            <h2>"What if AI routes are slow?"</h2>
            <p class="muted">"AI paths now show timeout and status states. Use warmup first on slower devices."</p>
            <div class="section-divider"></div>
            <h2>"Why is offline status stale?"</h2>
            <p class="muted">"SW update and cache maintenance can take a moment; use cache controls and refresh guidance in the status banner."</p>
        </section>
    }
}

#[must_use]
pub fn offline_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"Offline"</h1>
            <p class="lead">"You are in offline mode. Core pages still work from cached data."</p>
            <div class="card-grid">
                <div class="card">
                    <h2>"What still works"</h2>
                    <ul class="list">
                        <li>"Browse cached show, song, venue, and guest views."</li>
                        <li>"Use saved visualizations and local AI cache where available."</li>
                        <li>"Run AI smoke and warmup checks from already-cached state."</li>
                    </ul>
                </div>
                <div class="card">
                    <h2>"What requires network"</h2>
                    <ul class="list">
                        <li>"Initial data sync or fresh imports."</li>
                        <li>"Revalidation parity checks and update metadata refresh."</li>
                        <li>"Search index refresh from remote sources."</li>
                    </ul>
                </div>
            </div>
            <p>
                <a href="/">"Return to dashboard"</a>
                " for immediate local status and navigation."
            </p>
        </section>
    }
}

#[must_use]
pub fn not_found_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"Not Found"</h1>
            <p>"That route does not exist in the Rust app."</p>
            <div class="card-grid">
                <a class="card card-link" href="/">
                    <h2>"Return Home"</h2>
                    <p class="muted">"Go back to the dashboard and continue browsing."</p>
                </a>
                <a class="card card-link" href="/shows">
                    <h2>"Explore Shows"</h2>
                    <p class="muted">"Jump to core browse pages."</p>
                </a>
                <a class="card card-link" href="/search">
                    <h2>"Search"</h2>
                    <p class="muted">"Find songs, venues, tours, and releases quickly."</p>
                </a>
            </div>
        </section>
    }
}
