use leptos_config::LeptosOptions;
use sqlx::SqlitePool;

use crate::data_parity::DataParityCache;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) leptos: LeptosOptions,
    pub(crate) db: Option<SqlitePool>,
    pub(crate) data_parity_cache: DataParityCache,
}

impl axum::extract::FromRef<AppState> for LeptosOptions {
    fn from_ref(state: &AppState) -> Self {
        state.leptos.clone()
    }
}
