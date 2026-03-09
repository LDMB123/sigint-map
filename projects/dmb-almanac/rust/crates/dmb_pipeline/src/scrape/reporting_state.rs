#![cfg(test)]

use super::*;

#[cfg(test)]
static TEST_WARNING_LOCK: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

#[cfg(test)]
pub(crate) fn reset_warning_state() {
    SCRAPE_WARNINGS.empty_selectors.store(0, Ordering::Relaxed);
    SCRAPE_WARNINGS.missing_fields.store(0, Ordering::Relaxed);
    if let Ok(mut map) = SCRAPE_WARNING_FIELDS.lock() {
        map.clear();
    }
    if let Ok(mut map) = SCRAPE_WARNING_SELECTORS.lock() {
        map.clear();
    }
    if let Ok(mut map) = SCRAPE_HTTP_STATUS.lock() {
        map.clear();
    }
    if let Ok(mut map) = SCRAPE_ENDPOINT_TIMINGS.lock() {
        map.clear();
    }
    if let Ok(mut map) = SCRAPE_ENDPOINT_RETRIES.lock() {
        map.clear();
    }
    if let Ok(mut events) = SCRAPE_WARNING_EVENTS.lock() {
        events.clear();
    }
    if let Ok(mut map) = SCRAPE_ERROR_COUNTS.lock() {
        map.clear();
    }
    if let Ok(mut events) = SCRAPE_ERROR_EVENTS.lock() {
        events.clear();
    }
}

#[cfg(test)]
pub(crate) fn warning_counts() -> (usize, usize) {
    (
        SCRAPE_WARNINGS.empty_selectors.load(Ordering::Relaxed),
        SCRAPE_WARNINGS.missing_fields.load(Ordering::Relaxed),
    )
}

#[cfg(test)]
pub(crate) fn warning_missing_by_field() -> HashMap<String, usize> {
    SCRAPE_WARNING_FIELDS
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default()
}

#[cfg(test)]
pub(crate) fn warning_empty_by_selector() -> HashMap<String, usize> {
    SCRAPE_WARNING_SELECTORS
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default()
}

#[cfg(test)]
pub(crate) fn warning_endpoint_retries() -> HashMap<String, usize> {
    SCRAPE_ENDPOINT_RETRIES
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default()
}

#[cfg(test)]
pub(crate) fn error_counts() -> HashMap<String, usize> {
    SCRAPE_ERROR_COUNTS
        .lock()
        .map(|map| map.clone())
        .unwrap_or_default()
}

#[cfg(test)]
pub(crate) fn error_events() -> Vec<Value> {
    SCRAPE_ERROR_EVENTS
        .lock()
        .map(|events| events.clone())
        .unwrap_or_default()
}

#[cfg(test)]
pub(crate) fn warning_events() -> Vec<Value> {
    SCRAPE_WARNING_EVENTS
        .lock()
        .map(|events| events.clone())
        .unwrap_or_default()
}

#[cfg(test)]
pub(crate) fn with_warning_lock<T>(f: impl FnOnce() -> T) -> T {
    let _guard = match TEST_WARNING_LOCK.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };
    reset_warning_state();
    f()
}
