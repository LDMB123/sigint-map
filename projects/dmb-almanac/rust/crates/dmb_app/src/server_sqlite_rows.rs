#[cfg(feature = "ssr")]
use super::*;

#[cfg(feature = "ssr")]
#[derive(Clone, Copy)]
pub(crate) struct SongColumns<'a> {
    pub(crate) id: &'a str,
    pub(crate) slug: &'a str,
    pub(crate) title: &'a str,
    pub(crate) sort_title: &'a str,
    pub(crate) total_performances: &'a str,
    pub(crate) last_played_date: &'a str,
    pub(crate) opener_count: &'a str,
    pub(crate) closer_count: &'a str,
    pub(crate) encore_count: &'a str,
}

#[cfg(feature = "ssr")]
pub(crate) const SONG_COLUMNS: SongColumns<'static> = SongColumns {
    id: "id",
    slug: "slug",
    title: "title",
    sort_title: "sort_title",
    total_performances: "total_performances",
    last_played_date: "last_played_date",
    opener_count: "opener_count",
    closer_count: "closer_count",
    encore_count: "encore_count",
};

#[cfg(feature = "ssr")]
pub(crate) fn row_song_with_identity(
    row: &sqlx::sqlite::SqliteRow,
    columns: SongColumns<'_>,
    slug: String,
    title: String,
) -> Result<Song, ServerFnError> {
    Ok(Song {
        id: row_i32(row, columns.id)?,
        slug,
        title,
        sort_title: row_opt_string(row, columns.sort_title)?,
        total_performances: row_opt_i32(row, columns.total_performances)?,
        last_played_date: row_opt_string(row, columns.last_played_date)?,
        is_liberated: None,
        opener_count: row_opt_i32(row, columns.opener_count)?,
        closer_count: row_opt_i32(row, columns.closer_count)?,
        encore_count: row_opt_i32(row, columns.encore_count)?,
        search_text: None,
    })
}

#[cfg(feature = "ssr")]
pub(crate) fn row_song(row: &sqlx::sqlite::SqliteRow) -> Result<Song, ServerFnError> {
    row_song_with_identity(
        row,
        SONG_COLUMNS,
        row_string(row, SONG_COLUMNS.slug)?,
        row_string(row, SONG_COLUMNS.title)?,
    )
}

#[cfg(feature = "ssr")]
pub(crate) fn row_optional_song(
    row: &sqlx::sqlite::SqliteRow,
    columns: SongColumns<'_>,
) -> Result<Option<Song>, ServerFnError> {
    let slug = row_opt_string(row, columns.slug)?;
    let title = row_opt_string(row, columns.title)?;
    let (Some(slug), Some(title)) = (slug, title) else {
        return Ok(None);
    };

    row_song_with_identity(row, columns, slug, title).map(Some)
}

#[cfg(feature = "ssr")]
pub(crate) fn row_venue(row: &sqlx::sqlite::SqliteRow) -> Result<Venue, ServerFnError> {
    Ok(Venue {
        id: row_i32(row, "id")?,
        name: row_string(row, "name")?,
        city: row_string(row, "city")?,
        state: row_opt_string(row, "state")?,
        country: row_string(row, "country")?,
        country_code: row_opt_string(row, "country_code")?,
        venue_type: row_opt_string(row, "venue_type")?,
        total_shows: row_opt_i32(row, "total_shows")?,
        search_text: None,
    })
}

#[cfg(feature = "ssr")]
pub(crate) fn row_tour(row: &sqlx::sqlite::SqliteRow) -> Result<Tour, ServerFnError> {
    Ok(Tour {
        id: row_i32(row, "id")?,
        year: row_i32(row, "year")?,
        name: row_string(row, "name")?,
        total_shows: row_opt_i32(row, "total_shows")?,
        search_text: None,
    })
}

#[cfg(feature = "ssr")]
pub(crate) fn row_guest(row: &sqlx::sqlite::SqliteRow) -> Result<Guest, ServerFnError> {
    Ok(Guest {
        id: row_i32(row, "id")?,
        slug: row_string(row, "slug")?,
        name: row_string(row, "name")?,
        total_appearances: row_opt_i32(row, "total_appearances")?,
        search_text: None,
    })
}

#[cfg(feature = "ssr")]
pub(crate) fn row_release(row: &sqlx::sqlite::SqliteRow) -> Result<Release, ServerFnError> {
    Ok(Release {
        id: row_i32(row, "id")?,
        title: row_string(row, "title")?,
        slug: row_string(row, "slug")?,
        release_type: row_opt_string(row, "release_type")?,
        release_date: row_opt_string(row, "release_date")?,
        search_text: None,
    })
}

#[cfg(feature = "ssr")]
pub(crate) fn row_show_summary(
    row: &sqlx::sqlite::SqliteRow,
) -> Result<ShowSummary, ServerFnError> {
    Ok(ShowSummary {
        id: row_i32(row, "id")?,
        date: row_string(row, "date")?,
        year: row_i32(row, "year")?,
        venue_id: row_i32(row, "venue_id")?,
        venue_name: row_string(row, "venue_name")?,
        venue_city: row_string(row, "venue_city")?,
        venue_state: row_opt_string(row, "venue_state")?,
        tour_name: row_opt_string(row, "tour_name")?,
        tour_year: row_opt_i32(row, "tour_year")?,
    })
}

#[cfg(feature = "ssr")]
pub(crate) fn row_curated_list(
    row: &sqlx::sqlite::SqliteRow,
) -> Result<CuratedList, ServerFnError> {
    Ok(CuratedList {
        id: row_i32(row, "id")?,
        original_id: row_opt_string(row, "original_id")?,
        title: row_string(row, "title")?,
        slug: row_string(row, "slug")?,
        category: row_string(row, "category")?,
        description: row_opt_string(row, "description")?,
        item_count: row_opt_i32(row, "item_count")?,
        is_featured: row_opt_bool(row, "is_featured")?,
        sort_order: row_opt_i32(row, "sort_order")?,
        created_at: row_opt_string(row, "created_at")?,
        updated_at: row_opt_string(row, "updated_at")?,
    })
}

#[cfg(feature = "ssr")]
pub(crate) fn row_curated_list_item(
    row: &sqlx::sqlite::SqliteRow,
) -> Result<CuratedListItem, ServerFnError> {
    let metadata = row_opt_string(row, "metadata")?;
    let metadata = metadata.and_then(|raw| serde_json::from_str(&raw).ok());
    Ok(CuratedListItem {
        id: row_i32(row, "id")?,
        list_id: row_i32(row, "list_id")?,
        position: row_i32(row, "position")?,
        item_type: row_string(row, "item_type")?,
        show_id: row_opt_i32(row, "show_id")?,
        song_id: row_opt_i32(row, "song_id")?,
        venue_id: row_opt_i32(row, "venue_id")?,
        guest_id: row_opt_i32(row, "guest_id")?,
        release_id: row_opt_i32(row, "release_id")?,
        item_title: row_opt_string(row, "item_title")?,
        item_link: row_opt_string(row, "item_link")?,
        notes: row_opt_string(row, "notes")?,
        metadata,
        created_at: row_opt_string(row, "created_at")?,
    })
}
