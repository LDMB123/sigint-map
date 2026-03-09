use anyhow::{Context, Result};
use rand::RngExt;
use std::thread;
use std::time::Duration;

use super::super::reporting::endpoint_retry_count;
use super::super::{duration_as_u64_millis, record_warning_event, USER_AGENT};

pub(super) struct RetryPolicy {
    pub(super) min_delay_ms: u64,
    pub(super) max_delay_ms: u64,
    pub(super) max_retries: u32,
    pub(super) endpoint_retry_max: Option<u64>,
}

impl RetryPolicy {
    pub(super) fn new(
        min_delay_ms: u64,
        max_delay_ms: u64,
        max_retries: u32,
        endpoint_retry_max: Option<u64>,
    ) -> Self {
        Self {
            min_delay_ms,
            max_delay_ms,
            max_retries,
            endpoint_retry_max,
        }
    }

    pub(super) fn build_client(&self) -> Result<reqwest::blocking::Client> {
        reqwest::blocking::Client::builder()
            .user_agent(USER_AGENT)
            .build()
            .context("build http client")
    }

    pub(super) fn enforce_endpoint_retry_budget(&self, endpoint: &str) -> Result<()> {
        if let Some(max) = self.endpoint_retry_max {
            let current = endpoint_retry_count(endpoint);
            if current >= max {
                record_warning_event("retry_budget_exceeded", "http", endpoint);
                tracing::error!(
                    endpoint,
                    retries = current,
                    max,
                    "endpoint retry budget exceeded"
                );
                anyhow::bail!(
                    "endpoint retry budget exceeded: {endpoint} retries {current} >= max {max}"
                );
            }
        }
        Ok(())
    }

    pub(super) fn sleep_jitter(&self) {
        let mut rng = rand::rng();
        let delay = rng.random_range(self.min_delay_ms..=self.max_delay_ms.max(self.min_delay_ms));
        thread::sleep(Duration::from_millis(delay));
    }

    pub(super) fn sleep_backoff(&self, attempt: u32, retry_after: Option<Duration>) {
        let mut rng = rand::rng();
        let base = self.min_delay_ms.max(250);
        let exp = 2u64.saturating_pow(attempt.min(5));
        let mut delay_ms = base.saturating_mul(exp);
        let max_delay = self.max_delay_ms.max(base);
        delay_ms = delay_ms.min(max_delay);
        if let Some(retry_after) = retry_after {
            delay_ms = delay_ms.max(duration_as_u64_millis(retry_after));
        }
        let jitter = rng.random_range(0..=250);
        thread::sleep(Duration::from_millis(delay_ms + jitter));
    }
}
