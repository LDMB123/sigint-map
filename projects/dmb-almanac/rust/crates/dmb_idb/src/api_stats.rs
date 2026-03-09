use dmb_core::{Guest, Song, Tour, Venue};

cfg_if::cfg_if! {
    if #[cfg(target_arch = "wasm32")] {
        use wasm_bindgen::JsValue;

        type Result<T> = std::result::Result<T, JsValue>;

        pub async fn stats_top_songs(limit: usize) -> Result<Vec<Song>> {
            crate::list_queries::stats_top_songs(limit).await
        }

        pub async fn stats_top_openers(limit: usize) -> Result<Vec<Song>> {
            crate::list_queries::stats_top_openers(limit).await
        }

        pub async fn stats_top_closers(limit: usize) -> Result<Vec<Song>> {
            crate::list_queries::stats_top_closers(limit).await
        }

        pub async fn stats_top_encores(limit: usize) -> Result<Vec<Song>> {
            crate::list_queries::stats_top_encores(limit).await
        }

        pub async fn stats_songs_panel_data(
            top_played_limit: usize,
            top_openers_limit: usize,
            top_closers_limit: usize,
            top_encores_limit: usize,
        ) -> Result<(Vec<Song>, Vec<Song>, Vec<Song>, Vec<Song>, Vec<(u32, u32)>)> {
            crate::songs_panel::stats_songs_panel_data(
                top_played_limit,
                top_openers_limit,
                top_closers_limit,
                top_encores_limit,
            )
            .await
        }

        pub async fn stats_song_debuts_by_year() -> Result<Vec<(u32, u32)>> {
            crate::songs_panel::stats_song_debuts_by_year().await
        }

        pub async fn stats_shows_panel_data(
            recent_tours_limit: usize,
        ) -> Result<(Vec<(u32, u32)>, Vec<(u32, u32)>, (f64, f64, f64, f64, f64), Vec<Tour>)> {
            crate::shows_panel::stats_shows_panel_data(recent_tours_limit).await
        }

        pub async fn stats_venue_shows_by_geo() -> Result<(Vec<(String, u32)>, Vec<(String, u32)>)> {
            crate::venues_panel::stats_venue_shows_by_geo().await
        }

        pub async fn stats_venues_panel_data(
            top_venues_limit: usize,
        ) -> Result<(Vec<Venue>, Vec<(String, u32)>, Vec<(String, u32)>)> {
            crate::venues_panel::stats_venues_panel_data(top_venues_limit).await
        }

        pub async fn stats_guest_appearances_by_year() -> Result<Vec<(u32, u32)>> {
            crate::guests_panel::stats_guest_appearances_by_year().await
        }

        pub async fn stats_guests_panel_data(
            top_guests_limit: usize,
        ) -> Result<(Vec<Guest>, Vec<(u32, u32)>)> {
            crate::guests_panel::stats_guests_panel_data(top_guests_limit).await
        }
    } else {
        use wasm_bindgen::JsValue;

        type Result<T> = std::result::Result<T, JsValue>;

        pub async fn stats_top_songs(limit: usize) -> Result<Vec<Song>> {
            crate::list_queries::stats_top_songs(limit).await
        }

        pub async fn stats_top_openers(limit: usize) -> Result<Vec<Song>> {
            crate::list_queries::stats_top_openers(limit).await
        }

        pub async fn stats_top_closers(limit: usize) -> Result<Vec<Song>> {
            crate::list_queries::stats_top_closers(limit).await
        }

        pub async fn stats_top_encores(limit: usize) -> Result<Vec<Song>> {
            crate::list_queries::stats_top_encores(limit).await
        }

        pub async fn stats_songs_panel_data(
            top_played_limit: usize,
            top_openers_limit: usize,
            top_closers_limit: usize,
            top_encores_limit: usize,
        ) -> Result<(Vec<Song>, Vec<Song>, Vec<Song>, Vec<Song>, Vec<(u32, u32)>)> {
            crate::songs_panel::stats_songs_panel_data(
                top_played_limit,
                top_openers_limit,
                top_closers_limit,
                top_encores_limit,
            )
            .await
        }

        pub async fn stats_song_debuts_by_year() -> Result<Vec<(u32, u32)>> {
            crate::songs_panel::stats_song_debuts_by_year().await
        }

        pub async fn stats_shows_panel_data(
            recent_tours_limit: usize,
        ) -> Result<(Vec<(u32, u32)>, Vec<(u32, u32)>, (f64, f64, f64, f64, f64), Vec<Tour>)> {
            crate::shows_panel::stats_shows_panel_data(recent_tours_limit).await
        }

        pub async fn stats_venue_shows_by_geo(
        ) -> Result<(Vec<(String, u32)>, Vec<(String, u32)>)> {
            crate::venues_panel::stats_venue_shows_by_geo().await
        }

        pub async fn stats_venues_panel_data(
            top_venues_limit: usize,
        ) -> Result<(Vec<Venue>, Vec<(String, u32)>, Vec<(String, u32)>)> {
            crate::venues_panel::stats_venues_panel_data(top_venues_limit).await
        }

        pub async fn stats_guest_appearances_by_year() -> Result<Vec<(u32, u32)>> {
            crate::guests_panel::stats_guest_appearances_by_year().await
        }

        pub async fn stats_guests_panel_data(
            top_guests_limit: usize,
        ) -> Result<(Vec<Guest>, Vec<(u32, u32)>)> {
            crate::guests_panel::stats_guests_panel_data(top_guests_limit).await
        }
    }
}
