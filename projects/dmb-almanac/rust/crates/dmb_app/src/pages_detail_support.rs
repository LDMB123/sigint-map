use super::*;
#[path = "pages_detail_setlist.rs"]
mod setlist;
#[path = "pages_detail_show_context.rs"]
mod show_context;

pub(crate) use setlist::render_show_setlist_content;
#[cfg(test)]
pub(crate) use setlist::setlist_set_counts;
pub(crate) use show_context::render_show_context;

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub(crate) struct ShowContext {
    pub(crate) show: Show,
    pub(crate) venue: Option<Venue>,
    pub(crate) tour: Option<Tour>,
}

pub(crate) fn render_import_or_missing_with_link(
    seed_data_state: RwSignal<crate::data::SeedDataState>,
    importing_title: &'static str,
    missing_title: &'static str,
    missing_message: &'static str,
    missing_href: &'static str,
    missing_link_label: &'static str,
) -> AnyView {
    if seed_data_state.get() == crate::data::SeedDataState::Importing {
        import_in_progress_state(importing_title, "/offline", "Open offline help").into_any()
    } else {
        empty_state_with_link(
            missing_title,
            missing_message,
            missing_href,
            missing_link_label,
        )
        .into_any()
    }
}
