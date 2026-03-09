use super::*;

#[path = "pages_shared_support_normalize.rs"]
mod normalize;
#[path = "pages_shared_support_routing.rs"]
mod routing;
#[path = "pages_shared_support_ui.rs"]
mod ui;

pub(super) use normalize::{
    detail_nav, disc_key_label, format_location, format_mb_u64, normalize_guests,
    normalize_releases, normalize_search_filter, normalize_show_summaries, normalize_songs,
    normalize_tours, normalize_venues, normalized_disc_key, normalized_nonempty_lower,
    optional_text_matches_query, release_track_disc_counts, release_track_matches_query,
    text_matches_query, titleize_words_with_fallback,
};
#[cfg(feature = "hydrate")]
pub(super) use routing::merge_search_results;
pub(super) use routing::{
    parse_positive_i32_param, parse_route_slug_param, render_route_param_subhead,
    reset_filter_and_query_on_route_change, route_param_or_default, search_result_href,
};
#[cfg(feature = "hydrate")]
pub(super) use ui::{
    add_user_attended_show, load_user_attended_shows, remove_user_attended_show,
};
pub(super) use ui::{
    empty_state, empty_state_with_link, import_in_progress_state, loading_state, unit_resource,
    use_seed_data_state,
};
