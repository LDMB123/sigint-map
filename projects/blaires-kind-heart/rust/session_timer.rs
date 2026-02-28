use crate::browser_apis;
use std::cell::Cell;

thread_local! {
    static SESSION_START_MS: Cell<f64> = const { Cell::new(0.0) };
}

pub fn init() {
    SESSION_START_MS.with(|s| s.set(browser_apis::now_ms()));
}

pub fn reset() {
    SESSION_START_MS.with(|s| s.set(browser_apis::now_ms()));
}

pub fn minutes_elapsed() -> u32 {
    let start = SESSION_START_MS.with(Cell::get);
    let now = browser_apis::now_ms();
    ((now - start) / 60_000.0) as u32
}

pub fn is_wind_down() -> bool {
    minutes_elapsed() >= 20
}

pub fn is_deep_wind_down() -> bool {
    minutes_elapsed() >= 30
}
