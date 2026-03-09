use super::actions::*;
use super::state::*;
use super::*;

#[path = "pages_ai_diagnostics_cards_runtime.rs"]
mod runtime;
#[path = "pages_ai_diagnostics_cards_tuning.rs"]
mod tuning;

use runtime::render_ai_diagnostics_runtime_cards;
use tuning::render_ai_diagnostics_tuning_cards;

pub(crate) fn render_ai_diagnostics_cards(state: AiDiagnosticsState) -> impl IntoView {
    view! {
        <div class="card-grid">
            {render_ai_diagnostics_runtime_cards(state)}
            {render_ai_diagnostics_tuning_cards(state)}
        </div>
    }
}
