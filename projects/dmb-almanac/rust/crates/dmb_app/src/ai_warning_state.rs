use super::*;

#[cfg(feature = "hydrate")]
const AI_WARNING_EVENTS_LIMIT: usize = 20;

#[cfg(feature = "hydrate")]
pub(crate) fn record_ai_warning_once(warn_key: &str, event: &str, details: &str) {
    let _ = with_local_storage(|storage| {
        if storage_item(storage, warn_key).is_some() {
            return;
        }
        set_storage_item(storage, warn_key, "1");
        record_ai_warning(event, Some(details.to_string()));
    });
}

#[cfg_attr(not(feature = "hydrate"), allow(clippy::needless_pass_by_value))]
pub(crate) fn record_ai_warning(event: &str, details: Option<String>) {
    #[cfg(feature = "hydrate")]
    {
        let _ = with_local_storage(|storage| {
            let mut events: Vec<AiWarningEvent> = storage_item(storage, AI_WARNING_EVENTS_KEY)
                .and_then(|payload| serde_json::from_str(&payload).ok())
                .unwrap_or_default();
            events.push(AiWarningEvent {
                timestamp_ms: js_sys::Date::now(),
                event: event.to_string(),
                details,
            });
            if events.len() > AI_WARNING_EVENTS_LIMIT {
                let excess = events.len() - AI_WARNING_EVENTS_LIMIT;
                events.drain(0..excess);
            }
            set_storage_json(storage, AI_WARNING_EVENTS_KEY, &events);
        });
    }
    #[cfg(not(feature = "hydrate"))]
    {
        let _ = event;
        let _ = details;
    }
}

#[cfg(feature = "hydrate")]
pub fn load_ai_warning_events() -> Vec<AiWarningEvent> {
    local_storage_json(AI_WARNING_EVENTS_KEY).unwrap_or_default()
}

#[cfg(not(feature = "hydrate"))]
pub fn load_ai_warning_events() -> Vec<AiWarningEvent> {
    Vec::new()
}
