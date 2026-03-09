use super::*;

#[server(GetRecentShows, "/api")]
pub async fn get_recent_shows(limit: usize) -> Result<Vec<ShowSummary>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let limit = limit.min(200);
        cached_keyed_value(&RECENT_SHOWS_CACHE, limit, || async {
            let pool = pool()?;
            let sql_limit = usize_to_i64_limit(limit)?;
            let rows = fetch_rows(
                sqlx::query(
                    r#"
                    SELECT
                      s.id,
                      s.date,
                      s.year,
                      s.venue_id,
                      v.name AS venue_name,
                      v.city AS venue_city,
                      v.state AS venue_state,
                      t.name AS tour_name,
                      t.year AS tour_year
                    FROM shows s
                    JOIN venues v ON v.id = s.venue_id
                    LEFT JOIN tours t ON t.id = s.tour_id
                    ORDER BY s.date DESC
                    LIMIT ?
                    "#,
                )
                .bind(sql_limit),
                &pool,
            )
            .await?;

            map_rows(rows, |row| row_show_summary(&row))
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetTopSongs, "/api")]
pub async fn get_top_songs(limit: usize) -> Result<Vec<Song>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let limit = limit.min(200);
        cached_keyed_value(&TOP_SONGS_CACHE, limit, || async {
            let pool = pool()?;
            let sql_limit = usize_to_i64_limit(limit)?;
            let rows = fetch_rows(
                sqlx::query(
                    r#"
                    SELECT id, slug, title, sort_title, total_performances, last_played_date,
                           opener_count, closer_count, encore_count
                    FROM songs
                    ORDER BY COALESCE(total_performances, 0) DESC, title ASC
                    LIMIT ?
                    "#,
                )
                .bind(sql_limit),
                &pool,
            )
            .await?;

            map_rows(rows, |row| row_song(&row))
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetTopVenues, "/api")]
pub async fn get_top_venues(limit: usize) -> Result<Vec<Venue>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let limit = limit.min(200);
        cached_keyed_value(&TOP_VENUES_CACHE, limit, || async {
            let pool = pool()?;
            let sql_limit = usize_to_i64_limit(limit)?;
            let rows = fetch_rows(
                sqlx::query(
                    r#"
                    SELECT id, name, city, state, country, country_code, venue_type, total_shows
                    FROM venues
                    ORDER BY COALESCE(total_shows, 0) DESC, name ASC
                    LIMIT ?
                    "#,
                )
                .bind(sql_limit),
                &pool,
            )
            .await?;

            map_rows(rows, |row| row_venue(&row))
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetTopGuests, "/api")]
pub async fn get_top_guests(limit: usize) -> Result<Vec<Guest>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let limit = limit.min(200);
        cached_keyed_value(&TOP_GUESTS_CACHE, limit, || async {
            let pool = pool()?;
            let sql_limit = usize_to_i64_limit(limit)?;
            let rows = fetch_rows(
                sqlx::query(
                    r#"
                    SELECT id, name, slug, total_appearances
                    FROM guests
                    ORDER BY COALESCE(total_appearances, 0) DESC, name ASC
                    LIMIT ?
                    "#,
                )
                .bind(sql_limit),
                &pool,
            )
            .await?;

            map_rows(rows, |row| row_guest(&row))
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetRecentTours, "/api")]
pub async fn get_recent_tours(limit: usize) -> Result<Vec<Tour>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let limit = limit.min(200);
        cached_keyed_value(&RECENT_TOURS_CACHE, limit, || async {
            let pool = pool()?;
            let sql_limit = usize_to_i64_limit(limit)?;
            let rows = fetch_rows(
                sqlx::query(
                    r#"
                    SELECT id, year, name, total_shows
                    FROM tours
                    ORDER BY year DESC, total_shows DESC, id DESC
                    LIMIT ?
                    "#,
                )
                .bind(sql_limit),
                &pool,
            )
            .await?;

            map_rows(rows, |row| row_tour(&row))
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetRecentReleases, "/api")]
pub async fn get_recent_releases(limit: usize) -> Result<Vec<Release>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let limit = limit.min(200);
        cached_keyed_value(&RECENT_RELEASES_CACHE, limit, || async {
            let pool = pool()?;
            let sql_limit = usize_to_i64_limit(limit)?;
            let rows = fetch_rows(
                sqlx::query(
                    r#"
                    SELECT id, title, slug, release_type, release_date
                    FROM releases
                    ORDER BY release_date DESC, id DESC
                    LIMIT ?
                    "#,
                )
                .bind(sql_limit),
                &pool,
            )
            .await?;

            map_rows(rows, |row| row_release(&row))
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}
