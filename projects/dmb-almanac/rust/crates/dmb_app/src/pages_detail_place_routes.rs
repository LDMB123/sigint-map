use super::*;

#[must_use]
pub fn tour_year_page() -> impl IntoView {
    let year = route_param_or_default("year");
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
        None => render_import_or_missing_with_link(
            seed_data_state,
            "Tour details are still loading",
            "Tour not found",
            "This year does not map to a tour record.",
            "/tours",
            "Browse tours",
        ),
    };

    let tour = optional_resource_from_param!(
        year,
        |raw: &str| {
            let year = parse_positive_i32_param(raw, "year")?;
            if !(1960..=2100).contains(&year) {
                return Err("Invalid `year` parameter: expected 1960-2100.".to_string());
            }
            Ok(year)
        },
        |year: i32| async move { load_entity_by_id!(year, dmb_idb::get_tour, get_tour) }
    );

    detail_page_with_primary_resource!(
        back_href: "/tours",
        back_label: "Back to tours",
        title: "Tour Details",
        subhead: move || render_route_param_subhead("Year", &year(), |raw: &str| {
            let year = parse_positive_i32_param(raw, "year")?;
            if !(1960..=2100).contains(&year) {
                return Err("Invalid `year` parameter: expected 1960-2100.".to_string());
            }
            Ok(year)
        }),
        loading_title: "Loading tour",
        loading_message: "Fetching tour details for this year.",
        content: move || render(tour.get().unwrap_or(None)),
    )
}

#[must_use]
pub fn venue_detail_page() -> impl IntoView {
    let venue_id = route_param_or_default("venueId");
    let seed_data_state = use_seed_data_state();
    let render = move |venue: Option<Venue>| match venue {
        Some(venue) => {
            let name = venue.name.clone();
            let location = format_location(&venue.city, venue.state.as_deref());
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
        None => render_import_or_missing_with_link(
            seed_data_state,
            "Venue details are still loading",
            "Venue not found",
            "This venue ID was not found in the current dataset.",
            "/venues",
            "Browse venues",
        ),
    };

    let venue = optional_resource_from_param!(
        venue_id,
        |raw: &str| parse_positive_i32_param(raw, "venueId"),
        |id: i32| async move { load_entity_by_id!(id, dmb_idb::get_venue, get_venue) }
    );

    detail_page_with_primary_resource!(
        back_href: "/venues",
        back_label: "Back to venues",
        title: "Venue Details",
        subhead: move || render_route_param_subhead("Venue ID", &venue_id(), |raw: &str| {
            parse_positive_i32_param(raw, "venueId")
        }),
        loading_title: "Loading venue",
        loading_message: "Fetching venue profile and show totals.",
        content: move || render(venue.get().unwrap_or(None)),
    )
}
