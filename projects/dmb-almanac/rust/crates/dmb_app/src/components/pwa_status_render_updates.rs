use super::*;

#[path = "pwa_status_render_updates_notices.rs"]
mod notices;
#[path = "pwa_status_render_updates_sw.rs"]
mod sw;

pub(super) fn render_update_control_rows(state: PwaStatusState) -> impl IntoView {
    sw::render_update_control_rows(state)
}

pub(super) fn render_export_row(state: PwaStatusState) -> impl IntoView {
    sw::render_export_row(state)
}

pub(super) fn render_update_notices(state: PwaStatusState) -> impl IntoView {
    notices::render_update_notices(state)
}
