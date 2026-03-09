use super::*;

#[path = "pages_ai_diagnostics_actions.rs"]
mod actions;
#[path = "pages_ai_diagnostics_cards.rs"]
mod cards;
#[path = "pages_ai_diagnostics_state.rs"]
mod state;

#[cfg(feature = "ai_diagnostics_full")]
use actions::initialize_ai_diagnostics_state;
#[cfg(feature = "ai_diagnostics_full")]
use cards::render_ai_diagnostics_cards;
#[cfg(feature = "ai_diagnostics_full")]
use state::AiDiagnosticsState;

#[cfg(feature = "ai_diagnostics_full")]
#[must_use]
pub fn ai_diagnostics_page() -> impl IntoView {
    #[cfg(feature = "hydrate")]
    crate::browser::runtime_warmup::trigger_lazy_runtime_warmup();
    let state = AiDiagnosticsState::new();
    initialize_ai_diagnostics_state(state);

    view! {
        <section class="page">
            <h1>"AI Diagnostics"</h1>
            <p class="lead">"On-device AI status, index metadata, and performance checks."</p>
            <Show when=move || state.embedding_sample_enabled.get() fallback=|| () >
                <p class="muted">"Sample mode enabled: using reduced embeddings."</p>
            </Show>
            {move || state.ai_config_mismatch.get().map(|message| view! {
                <p class="muted">{message}</p>
            })}
            {render_ai_diagnostics_cards(state)}
        </section>
    }
}

#[cfg(not(feature = "ai_diagnostics_full"))]
#[must_use]
pub fn ai_diagnostics_page() -> impl IntoView {
    #[cfg(feature = "hydrate")]
    crate::browser::runtime_warmup::trigger_lazy_runtime_warmup();
    view! {
        <section class="page">
            <h1>"AI Diagnostics"</h1>
            <p class="lead">
                "Production-lite build: advanced AI diagnostics are available in dev/staging builds."
            </p>
            <p class="muted">
                "Use a build with `ai_diagnostics_full` enabled for benchmark and runtime tuning controls."
            </p>
        </section>
    }
}
