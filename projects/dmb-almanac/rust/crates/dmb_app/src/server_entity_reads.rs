use super::*;

#[server(GetShow, "/api")]
pub async fn get_show(id: i32) -> Result<Option<Show>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let pool = pool()?;
        fetch_optional_mapped(
            sqlx::query(
                "SELECT id, date, venue_id, tour_id, song_count, rarity_index FROM shows WHERE id = ?",
            )
            .bind(id),
            &pool,
            |row| {
                let date: String = row_string(row, "date")?;
                let year = year_from_date(&date);
                Ok(Show {
                    id: row_i32(row, "id")?,
                    date,
                    venue_id: row_i32(row, "venue_id")?,
                    tour_id: row_opt_i32(row, "tour_id")?,
                    year,
                    song_count: row_opt_i32(row, "song_count")?,
                    rarity_index: row_opt_f32(row, "rarity_index")?,
                })
            },
        )
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetSong, "/api")]
pub async fn get_song(slug: String) -> Result<Option<Song>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let pool = pool()?;
        fetch_optional_mapped(
            sqlx::query(
                "SELECT id, slug, title, sort_title, total_performances, last_played_date, opener_count, closer_count, encore_count FROM songs WHERE slug = ?",
            )
            .bind(slug),
            &pool,
            row_song,
        )
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetVenue, "/api")]
pub async fn get_venue(id: i32) -> Result<Option<Venue>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let pool = pool()?;
        fetch_optional_mapped(
            sqlx::query(
                "SELECT id, name, city, state, country, country_code, venue_type, total_shows FROM venues WHERE id = ?",
            )
            .bind(id),
            &pool,
            row_venue,
        )
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetTour, "/api")]
pub async fn get_tour(year: i32) -> Result<Option<Tour>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let pool = pool()?;
        fetch_optional_mapped(
            sqlx::query(
                "SELECT id, year, name, total_shows
                 FROM tours
                 WHERE year = ?
                 ORDER BY year DESC, total_shows DESC, id DESC
                 LIMIT 1",
            )
            .bind(year),
            &pool,
            row_tour,
        )
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetTourById, "/api")]
pub async fn get_tour_by_id(id: i32) -> Result<Option<Tour>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let pool = pool()?;
        fetch_optional_mapped(
            sqlx::query("SELECT id, year, name, total_shows FROM tours WHERE id = ?").bind(id),
            &pool,
            row_tour,
        )
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetGuest, "/api")]
pub async fn get_guest(slug: String) -> Result<Option<Guest>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let pool = pool()?;
        fetch_optional_mapped(
            sqlx::query("SELECT id, name, slug, total_appearances FROM guests WHERE slug = ?")
                .bind(slug),
            &pool,
            row_guest,
        )
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetRelease, "/api")]
pub async fn get_release(slug: String) -> Result<Option<Release>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let pool = pool()?;
        fetch_optional_mapped(
            sqlx::query(
                "SELECT id, title, slug, release_type, release_date FROM releases WHERE slug = ?",
            )
            .bind(slug),
            &pool,
            row_release,
        )
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}
