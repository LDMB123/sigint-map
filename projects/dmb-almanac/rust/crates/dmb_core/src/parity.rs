pub const SQLITE_PARITY_STORE_TABLE_MAPPINGS: [(&str, &str); 13] = [
    ("venues", "venues"),
    ("songs", "songs"),
    ("tours", "tours"),
    ("shows", "shows"),
    ("setlistEntries", "setlist_entries"),
    ("guests", "guests"),
    ("guestAppearances", "guest_appearances"),
    ("liberationList", "liberation_list"),
    ("songStatistics", "song_statistics"),
    ("releases", "releases"),
    ("releaseTracks", "release_tracks"),
    ("curatedLists", "curated_lists"),
    ("curatedListItems", "curated_list_items"),
];

pub fn is_supported_sqlite_parity_table(table: &str) -> bool {
    SQLITE_PARITY_STORE_TABLE_MAPPINGS
        .iter()
        .any(|(_, mapped_table)| *mapped_table == table)
}

pub fn sqlite_parity_tables() -> impl Iterator<Item = &'static str> {
    SQLITE_PARITY_STORE_TABLE_MAPPINGS
        .iter()
        .map(|(_, table)| *table)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn parity_mapping_has_unique_store_and_table_names() {
        let mut stores = HashSet::new();
        let mut tables = HashSet::new();
        for (store, table) in SQLITE_PARITY_STORE_TABLE_MAPPINGS {
            assert!(stores.insert(store), "duplicate store mapping: {store}");
            assert!(tables.insert(table), "duplicate table mapping: {table}");
        }
    }

    #[test]
    fn parity_mapping_contains_core_tables() {
        assert!(is_supported_sqlite_parity_table("shows"));
        assert!(is_supported_sqlite_parity_table("songs"));
        assert!(!is_supported_sqlite_parity_table("not_a_real_table"));
    }

    #[test]
    fn parity_mapping_uses_expected_idb_store_names() {
        assert!(SQLITE_PARITY_STORE_TABLE_MAPPINGS
            .iter()
            .any(|(store, table)| *store == "setlistEntries" && *table == "setlist_entries"));
        assert!(SQLITE_PARITY_STORE_TABLE_MAPPINGS
            .iter()
            .any(|(store, table)| *store == "guestAppearances" && *table == "guest_appearances"));
        assert!(SQLITE_PARITY_STORE_TABLE_MAPPINGS
            .iter()
            .any(|(store, table)| *store == "liberationList" && *table == "liberation_list"));
        assert!(SQLITE_PARITY_STORE_TABLE_MAPPINGS
            .iter()
            .any(|(store, table)| *store == "songStatistics" && *table == "song_statistics"));
        assert!(SQLITE_PARITY_STORE_TABLE_MAPPINGS
            .iter()
            .any(|(store, table)| *store == "releaseTracks" && *table == "release_tracks"));
        assert!(SQLITE_PARITY_STORE_TABLE_MAPPINGS
            .iter()
            .any(|(store, table)| *store == "curatedLists" && *table == "curated_lists"));
        assert!(SQLITE_PARITY_STORE_TABLE_MAPPINGS
            .iter()
            .any(|(store, table)| {
                *store == "curatedListItems" && *table == "curated_list_items"
            }));
    }
}
