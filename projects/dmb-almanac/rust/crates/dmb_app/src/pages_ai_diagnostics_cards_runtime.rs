use super::*;

#[path = "pages_ai_diagnostics_runtime_embedding.rs"]
mod embedding;
#[path = "pages_ai_diagnostics_runtime_system.rs"]
mod system;

pub(crate) fn render_ai_diagnostics_runtime_cards(state: AiDiagnosticsState) -> impl IntoView {
    view! {
        <>
            {system::render_ai_diagnostics_runtime_system_cards(state)}
            {embedding::render_ai_diagnostics_runtime_embedding_cards(state)}
        </>
    }
}
