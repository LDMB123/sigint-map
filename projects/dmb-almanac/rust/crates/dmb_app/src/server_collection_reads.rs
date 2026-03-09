use super::*;

#[server(GetAllReleases, "/api")]
pub async fn get_all_releases() -> Result<Vec<Release>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        cached_value(&ALL_RELEASES_CACHE, || async {
            let pool = pool()?;
            let rows = fetch_rows(
                sqlx::query(
                    "SELECT id, title, slug, release_type, release_date FROM releases ORDER BY release_date DESC, id DESC",
                ),
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

#[server(GetReleaseTracks, "/api")]
pub async fn get_release_tracks(release_id: i32) -> Result<Vec<ReleaseTrack>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        cached_keyed_value(&RELEASE_TRACKS_CACHE, release_id, || async {
            let pool = pool()?;
            let rows = fetch_rows(
                sqlx::query(
                    "SELECT id, release_id, song_id, show_id, track_number, disc_number, duration_seconds, notes
                     FROM release_tracks
                     WHERE release_id = ?
                     ORDER BY disc_number, track_number, id",
                )
                .bind(release_id),
                &pool,
            )
            .await?;
            map_rows(rows, |row| {
                Ok(ReleaseTrack {
                    id: row_i32(&row, "id")?,
                    release_id: row_i32(&row, "release_id")?,
                    song_id: row_opt_i32(&row, "song_id")?,
                    show_id: row_opt_i32(&row, "show_id")?,
                    track_number: row_opt_i32(&row, "track_number")?,
                    disc_number: row_opt_i32(&row, "disc_number")?,
                    duration_seconds: row_opt_i32(&row, "duration_seconds")?,
                    notes: row_opt_string(&row, "notes")?,
                })
            })
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetSetlistEntries, "/api")]
pub async fn get_setlist_entries(show_id: i32) -> Result<Vec<SetlistEntry>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        cached_keyed_value(&SETLIST_ENTRIES_CACHE, show_id, || async {
            let pool = pool()?;
            let rows = fetch_rows(
                sqlx::query(
                    "SELECT se.id, se.show_id, se.song_id, se.position, se.set_name, se.slot, se.duration_seconds,
                            se.segue_into_song_id, se.is_segue, se.is_tease, se.tease_of_song_id, se.notes,
                            sh.date as show_date,
                            s.slug as song_slug, s.title as song_title, s.sort_title as song_sort_title,
                            s.total_performances, s.last_played_date, s.opener_count, s.closer_count, s.encore_count
                     FROM setlist_entries se
                     LEFT JOIN shows sh ON sh.id = se.show_id
                     LEFT JOIN songs s ON s.id = se.song_id
                     WHERE se.show_id = ?
                     ORDER BY se.position, se.id",
                )
                .bind(show_id),
                &pool,
            )
            .await?;
            map_rows(rows, |row| {
                let show_date: Option<String> = row_opt_string(&row, "show_date")?;
                let year = show_date
                    .as_deref()
                    .and_then(|d| d.get(0..4))
                    .and_then(|s| s.parse::<i32>().ok());
                let song = row_optional_song(
                    &row,
                    SongColumns {
                        id: "song_id",
                        slug: "song_slug",
                        title: "song_title",
                        sort_title: "song_sort_title",
                        total_performances: "total_performances",
                        last_played_date: "last_played_date",
                        opener_count: "opener_count",
                        closer_count: "closer_count",
                        encore_count: "encore_count",
                    },
                )?;
                Ok(SetlistEntry {
                    id: row_i32(&row, "id")?,
                    show_id: row_i32(&row, "show_id")?,
                    song_id: row_i32(&row, "song_id")?,
                    position: row_i32(&row, "position")?,
                    set_name: row_opt_string(&row, "set_name")?,
                    slot: row_opt_string(&row, "slot")?,
                    show_date,
                    year,
                    duration_seconds: row_opt_i32(&row, "duration_seconds")?,
                    segue_into_song_id: row_opt_i32(&row, "segue_into_song_id")?,
                    is_segue: row_opt_bool(&row, "is_segue")?,
                    is_tease: row_opt_bool(&row, "is_tease")?,
                    tease_of_song_id: row_opt_i32(&row, "tease_of_song_id")?,
                    notes: row_opt_string(&row, "notes")?,
                    song,
                })
            })
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetLiberationList, "/api")]
pub async fn get_liberation_list(limit: i32) -> Result<Vec<LiberationEntry>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let limit = sanitize_i32_limit(limit, 200);
        if limit == 0 {
            return Ok(Vec::new());
        }

        cached_keyed_value(&LIBERATION_LIST_CACHE, limit, || async {
            let pool = pool()?;
            let rows = fetch_rows(
                sqlx::query(
                    "SELECT ll.id, ll.song_id, ll.last_played_date, ll.last_played_show_id,
                            ll.days_since, ll.shows_since, ll.notes, ll.configuration, ll.is_liberated,
                            ll.liberated_date, ll.liberated_show_id,
                            s.slug as song_slug, s.title as song_title, s.sort_title as song_sort_title,
                            s.total_performances, s.last_played_date as song_last_played_date,
                            s.opener_count, s.closer_count, s.encore_count,
                            sh.date as show_date, v.name as venue_name, v.city as venue_city, v.state as venue_state
                     FROM liberation_list ll
                     LEFT JOIN songs s ON ll.song_id = s.id
                     LEFT JOIN shows sh ON ll.last_played_show_id = sh.id
                     LEFT JOIN venues v ON sh.venue_id = v.id
                     ORDER BY ll.days_since DESC, ll.id DESC
                     LIMIT ?",
                )
                .bind(limit),
                &pool,
            )
            .await?;
            map_rows(rows, |row| {
                let song = row_optional_song(
                    &row,
                    SongColumns {
                        id: "song_id",
                        slug: "song_slug",
                        title: "song_title",
                        sort_title: "song_sort_title",
                        total_performances: "total_performances",
                        last_played_date: "song_last_played_date",
                        opener_count: "opener_count",
                        closer_count: "closer_count",
                        encore_count: "encore_count",
                    },
                )?;
                let last_show_id = row_opt_i32(&row, "last_played_show_id")?;
                let last_show = if let Some(show_id) = last_show_id {
                    Some(LiberationLastShow {
                        id: show_id,
                        date: row_opt_string(&row, "show_date")?,
                        venue: Some(LiberationVenue {
                            name: row_opt_string(&row, "venue_name")?,
                            city: row_opt_string(&row, "venue_city")?,
                            state: row_opt_string(&row, "venue_state")?,
                        }),
                    })
                } else {
                    None
                };
                Ok(LiberationEntry {
                    id: row_i32(&row, "id")?,
                    song_id: row_i32(&row, "song_id")?,
                    days_since: row_opt_i32(&row, "days_since")?,
                    shows_since: row_opt_i32(&row, "shows_since")?,
                    is_liberated: row_opt_bool(&row, "is_liberated")?,
                    last_played_date: row_opt_string(&row, "last_played_date")?,
                    last_played_show_id: last_show_id,
                    notes: row_opt_string(&row, "notes")?,
                    configuration: row_opt_string(&row, "configuration")?,
                    liberated_date: row_opt_string(&row, "liberated_date")?,
                    liberated_show_id: row_opt_i32(&row, "liberated_show_id")?,
                    song,
                    last_show,
                })
            })
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetCuratedLists, "/api")]
pub async fn get_curated_lists() -> Result<Vec<CuratedList>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        cached_value(&CURATED_LISTS_CACHE, || async {
            let pool = pool()?;
            let rows = fetch_rows(
                sqlx::query(
                    "SELECT id, original_id, title, slug, category, description, item_count, is_featured,
                            sort_order, created_at, updated_at
                     FROM curated_lists
                     ORDER BY sort_order, id",
                ),
                &pool,
            )
            .await?;
            map_rows(rows, |row| row_curated_list(&row))
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetCuratedListItems, "/api")]
pub async fn get_curated_list_items(
    list_id: i32,
    limit: i32,
) -> Result<Vec<CuratedListItem>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let limit = sanitize_i32_limit(limit, 500);
        if limit == 0 {
            return Ok(Vec::new());
        }

        let cache_key = (list_id, limit);
        cached_keyed_value(&CURATED_LIST_ITEMS_CACHE, cache_key, || async {
            let pool = pool()?;
            let rows = fetch_rows(
                sqlx::query(
                    "SELECT id, list_id, position, item_type, show_id, song_id, venue_id, guest_id, release_id,
                            item_title, item_link, notes, metadata, created_at
                     FROM curated_list_items
                     WHERE list_id = ?
                     ORDER BY position, id
                     LIMIT ?",
                )
                .bind(list_id)
                .bind(limit),
                &pool,
            )
            .await?;
            map_rows(rows, |row| row_curated_list_item(&row))
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}
