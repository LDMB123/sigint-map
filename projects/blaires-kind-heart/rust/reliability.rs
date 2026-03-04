use crate::{db_client, utils};

pub const DOMAIN_PROGRESSION: &str = "progression";
pub const DOMAIN_REFLECTION: &str = "reflection";
pub const DOMAIN_INSIGHTS: &str = "insights";

fn success_key(domain: &str) -> String {
    format!("diag.{domain}.success_count")
}

fn failure_key(domain: &str) -> String {
    format!("diag.{domain}.failure_count")
}

fn last_event_key(domain: &str) -> String {
    format!("diag.{domain}.last_event_ms")
}

async fn increment_setting_u64(key: &str) {
    let current = db_client::get_setting(key)
        .await
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(0);
    db_client::set_setting(key, &(current + 1).to_string()).await;
}

async fn update_last_event(domain: &str) {
    db_client::set_setting(&last_event_key(domain), &(utils::now_epoch_ms() as u64).to_string()).await;
}

pub async fn record_success(domain: &str) {
    increment_setting_u64(&success_key(domain)).await;
    update_last_event(domain).await;
}

pub async fn record_failure(domain: &str) {
    increment_setting_u64(&failure_key(domain)).await;
    update_last_event(domain).await;
}

pub async fn read_counts(domain: &str) -> (u64, u64) {
    let success = db_client::get_setting(&success_key(domain))
        .await
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(0);
    let failure = db_client::get_setting(&failure_key(domain))
        .await
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(0);
    (success, failure)
}
