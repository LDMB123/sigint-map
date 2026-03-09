use super::charts::{
    render_bar_chart, render_song_ranking, render_song_table, render_string_bar_chart,
};
use super::*;

pub(super) fn render_stats_overview_content(data: StatsOverview) -> impl IntoView {
    let StatsOverview {
        show_count,
        song_count,
        venue_count,
        tour_count,
        guest_count,
        setlist_count,
        avg_songs_per_show,
    } = data;

    view! {
        <>
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-value">{show_count.to_string()}</span>
                    <span class="stat-label">"Shows"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{song_count.to_string()}</span>
                    <span class="stat-label">"Songs"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{venue_count.to_string()}</span>
                    <span class="stat-label">"Venues"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{tour_count.to_string()}</span>
                    <span class="stat-label">"Tours"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{guest_count.to_string()}</span>
                    <span class="stat-label">"Guests"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{setlist_count.to_string()}</span>
                    <span class="stat-label">"Setlist Entries"</span>
                </div>
            </div>
            <div class="stat-card" style="margin-top: 1rem">
                <span class="stat-value">{format!("{avg_songs_per_show:.1}")}</span>
                <span class="stat-label">"Avg Songs Per Show"</span>
            </div>
            <p class="muted" style="margin-top: 1rem">
                {format!("Database: {} v{}", dmb_idb::DB_NAME, dmb_idb::DB_VERSION)}
            </p>
        </>
    }
}

pub(super) fn render_stats_songs_content(data: StatsSongs) -> impl IntoView {
    let StatsSongs {
        top_played,
        top_openers,
        top_closers,
        top_encores,
        debuts_by_year,
    } = data;

    view! {
        <>
            <h2>"Top 25 Most Played"</h2>
            {render_song_table(&top_played, true)}

            <h2>"Top 10 Openers"</h2>
            {render_song_ranking(&top_openers, |s| s.opener_count.unwrap_or(0))}

            <h2>"Top 10 Closers"</h2>
            {render_song_ranking(&top_closers, |s| s.closer_count.unwrap_or(0))}

            <h2>"Top 10 Encores"</h2>
            {render_song_ranking(&top_encores, |s| s.encore_count.unwrap_or(0))}

            <h2>"Song Debuts by Year"</h2>
            {render_bar_chart(&debuts_by_year)}
        </>
    }
}

pub(super) fn render_stats_shows_content(data: StatsShows) -> impl IntoView {
    let StatsShows {
        shows_by_year,
        shows_by_decade,
        rarity_min,
        rarity_q1,
        rarity_median,
        rarity_q3,
        rarity_max,
        recent_tours,
    } = data;

    view! {
        <>
            <h2>"Shows Per Year"</h2>
            {render_bar_chart(&shows_by_year)}

            <h2>"Shows Per Decade"</h2>
            <div class="stats-grid">
                {shows_by_decade
                    .iter()
                    .map(|(decade, count)| {
                        view! {
                            <div class="stat-card">
                                <span class="stat-value">{count.to_string()}</span>
                                <span class="stat-label">{format!("{decade}s")}</span>
                            </div>
                        }
                    })
                    .collect::<Vec<_>>()}
            </div>

            <h2>"Rarity Index Distribution"</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-value">{format!("{rarity_min:.2}")}</span>
                    <span class="stat-label">"Min"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{format!("{rarity_q1:.2}")}</span>
                    <span class="stat-label">"Q1"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{format!("{rarity_median:.2}")}</span>
                    <span class="stat-label">"Median"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{format!("{rarity_q3:.2}")}</span>
                    <span class="stat-label">"Q3"</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">{format!("{rarity_max:.2}")}</span>
                    <span class="stat-label">"Max"</span>
                </div>
            </div>

            <h2>"Recent Tours"</h2>
            <ul class="result-list">
                {recent_tours
                    .iter()
                    .map(|tour| {
                        let href = format!("/tours/{}", tour.year);
                        let total = tour.total_shows.unwrap_or(0);
                        view! {
                            <li class="result-card">
                                <span class="pill">{tour.year.to_string()}</span>
                                <div class="result-body">
                                    <a class="result-label" href=href>{tour.name.clone()}</a>
                                </div>
                                <span class="result-score">{format!("{total} shows")}</span>
                            </li>
                        }
                    })
                    .collect::<Vec<_>>()}
            </ul>
        </>
    }
}

pub(super) fn render_stats_venues_content(data: StatsVenues) -> impl IntoView {
    let StatsVenues {
        top_venues,
        shows_by_country,
        shows_by_state,
    } = data;

    view! {
        <>
            <h2>"Top 25 Venues"</h2>
            <ul class="result-list">
                {top_venues
                    .iter()
                    .map(|venue| {
                        let href = format!("/venues/{}", venue.id);
                        let location = format_location(&venue.city, venue.state.as_deref());
                        let total = venue.total_shows.unwrap_or(0);
                        view! {
                            <li class="result-card">
                                <span class="pill">
                                    {venue
                                        .state
                                        .clone()
                                        .unwrap_or_else(|| venue.country.clone())}
                                </span>
                                <div class="result-body">
                                    <a class="result-label" href=href>{venue.name.clone()}</a>
                                    <span class="result-meta">{location}</span>
                                </div>
                                <span class="result-score">{format!("{total} shows")}</span>
                            </li>
                        }
                    })
                    .collect::<Vec<_>>()}
            </ul>

            <h2>"Shows by Country"</h2>
            {render_string_bar_chart(&shows_by_country, 15)}

            <h2>"Shows by US State"</h2>
            {render_string_bar_chart(&shows_by_state, 20)}
        </>
    }
}

pub(super) fn render_stats_guests_content(data: StatsGuests) -> impl IntoView {
    let StatsGuests {
        top_guests,
        appearances_by_year,
    } = data;

    view! {
        <>
            <h2>"Top 25 Guests"</h2>
            <ul class="result-list">
                {top_guests
                    .iter()
                    .map(|guest| {
                        let href = format!("/guests/{}", guest.slug);
                        let total = guest.total_appearances.unwrap_or(0);
                        view! {
                            <li class="result-card">
                                <div class="result-body">
                                    <a class="result-label" href=href>{guest.name.clone()}</a>
                                </div>
                                <span class="result-score">{format!("{total} appearances")}</span>
                            </li>
                        }
                    })
                    .collect::<Vec<_>>()}
            </ul>

            <h2>"Guest Appearances by Year"</h2>
            {render_bar_chart(&appearances_by_year)}
        </>
    }
}
