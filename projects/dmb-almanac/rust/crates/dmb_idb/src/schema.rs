pub const DB_NAME: &str = "dmb-almanac-rs";
// Bump this whenever SCHEMA_V12_REFERENCE changes so existing clients get an upgrade transaction
// that can create any newly-added stores/indexes.
pub const DB_VERSION: u32 = 3;
// Prior prototype DB name. Used only for one-time migration/cleanup during cutover.
pub const PREVIOUS_DB_NAME: &str = "dmb-almanac";

pub const TABLE_VENUES: &str = "venues";
pub const TABLE_SONGS: &str = "songs";
pub const TABLE_TOURS: &str = "tours";
pub const TABLE_SHOWS: &str = "shows";
pub const TABLE_SETLIST_ENTRIES: &str = "setlistEntries";
pub const TABLE_GUESTS: &str = "guests";
pub const TABLE_GUEST_APPEARANCES: &str = "guestAppearances";
pub const TABLE_LIBERATION_LIST: &str = "liberationList";
pub const TABLE_SONG_STATS: &str = "songStatistics";
pub const TABLE_RELEASES: &str = "releases";
pub const TABLE_RELEASE_TRACKS: &str = "releaseTracks";
pub const TABLE_SYNC_META: &str = "syncMeta";
pub const TABLE_USER_ATTENDED_SHOWS: &str = "userAttendedShows";
pub const TABLE_USER_FAVORITE_SONGS: &str = "userFavoriteSongs";
pub const TABLE_USER_FAVORITE_VENUES: &str = "userFavoriteVenues";
pub const TABLE_CURATED_LISTS: &str = "curatedLists";
pub const TABLE_CURATED_LIST_ITEMS: &str = "curatedListItems";
pub const TABLE_OFFLINE_MUTATION_QUEUE: &str = "offlineMutationQueue";
pub const TABLE_TELEMETRY_QUEUE: &str = "telemetryQueue";
pub const TABLE_PAGE_CACHE: &str = "pageCache";
pub const TABLE_SCRAPE_CACHE: &str = "scrapeCache";
pub const TABLE_SCRAPE_SYNC_QUEUE: &str = "scrapeSyncQueue";
pub const TABLE_SCRAPE_IMPORT_LOG: &str = "scrapeImportLog";
pub const TABLE_EMBEDDING_CHUNKS: &str = "embeddingChunks";
pub const TABLE_EMBEDDING_META: &str = "embeddingMeta";
pub const TABLE_ANN_INDEX: &str = "annIndex";

// Schema reference from Dexie v12 for parity. This will be enforced in runtime migrations.
pub const SCHEMA_V12_REFERENCE: &[(&str, &str)] = &[
    (TABLE_VENUES, "&id, name, city, state, country, countryCode, venueType, totalShows, searchText, [country+state]"),
    (TABLE_SONGS, "&id, &slug, sortTitle, totalPerformances, lastPlayedDate, searchText, openerCount, closerCount, encoreCount, [isLiberated+daysSinceLastPlayed]"),
    (TABLE_TOURS, "&id, year, name, totalShows, searchText"),
    (TABLE_SHOWS, "&id, date, venueId, tourId, year, songCount, rarityIndex, [venueId+date], [tourId+date]"),
    (TABLE_SETLIST_ENTRIES, "&id, showId, songId, position, setName, slot, showDate, year, [songId+year], [year+slot], [showId+position]"),
    (TABLE_GUESTS, "&id, &slug, name, totalAppearances, searchText"),
    (TABLE_GUEST_APPEARANCES, "&id, guestId, showId, songId, showDate, year, [guestId+year]"),
    (TABLE_LIBERATION_LIST, "&id, &songId, daysSince, showsSince, isLiberated"),
    (TABLE_SONG_STATS, "&id, &songId, currentGapDays, currentGapShows"),
    (TABLE_USER_ATTENDED_SHOWS, "++id, &showId, addedAt, showDate"),
    (TABLE_USER_FAVORITE_SONGS, "++id, &songId, addedAt"),
    (TABLE_USER_FAVORITE_VENUES, "++id, &venueId, addedAt"),
    (TABLE_CURATED_LISTS, "&id, &slug, category"),
    (TABLE_CURATED_LIST_ITEMS, "&id, listId, position, itemType, [listId+position]"),
    (TABLE_RELEASES, "&id, &slug, releaseType, releaseDate, searchText"),
    (TABLE_RELEASE_TRACKS, "&id, releaseId, songId, showId"),
    (TABLE_SYNC_META, "&id"),
    (TABLE_OFFLINE_MUTATION_QUEUE, "++id, status, createdAt, nextRetry, [status+createdAt]"),
    (TABLE_TELEMETRY_QUEUE, "++id, status, createdAt, nextRetry, [status+createdAt]"),
    (TABLE_PAGE_CACHE, "&id, route, createdAt, expiresAt, version, [route+createdAt]"),
    (TABLE_SCRAPE_CACHE, "&urlHash, status, expiresAt, [status+expiresAt], contentHash, scrapedAt, importedShowId"),
    (TABLE_SCRAPE_SYNC_QUEUE, "++id, urlHash, [status+priority], [status+createdAt], expiresAt, syncTag"),
    (TABLE_SCRAPE_IMPORT_LOG, "++id, urlHash, showId, importedAt"),
    (TABLE_EMBEDDING_CHUNKS, "&chunkId, dim"),
    (TABLE_EMBEDDING_META, "&version, dim, chunkCount"),
    (TABLE_ANN_INDEX, "&id, method, dim, recordCount, builtAt"),
];
