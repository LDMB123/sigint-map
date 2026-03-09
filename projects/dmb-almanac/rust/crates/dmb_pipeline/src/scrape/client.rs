use anyhow::{bail, Result};
use std::path::PathBuf;
use std::time::Instant;

#[path = "client_cache.rs"]
mod client_cache;
#[path = "client_response.rs"]
mod client_response;
#[path = "client_retry.rs"]
mod client_retry;

use self::client_cache::{cache_path, expire_cache_file, prune_cache_dir, read_cached_html};
use self::client_response::{
    build_http_status_error, build_request_error, handle_success_response, log_http_status_failure,
};
use self::client_retry::RetryPolicy;
use super::{
    duration_as_u64_millis, endpoint_name, record_endpoint_retry, record_endpoint_timing,
    record_scrape_error, ScrapeErrorKind,
};

pub(super) struct ScrapeClient {
    client: reqwest::blocking::Client,
    cache_dir: PathBuf,
    retry_policy: RetryPolicy,
    cache_only: bool,
    cache_ttl_days: Option<u64>,
}

impl ScrapeClient {
    pub(super) fn new(
        cache_dir: PathBuf,
        min_delay_ms: u64,
        max_delay_ms: u64,
        max_retries: u32,
        endpoint_retry_max: Option<u64>,
        cache_only: bool,
        cache_ttl_days: Option<u64>,
    ) -> Result<Self> {
        let retry_policy =
            RetryPolicy::new(min_delay_ms, max_delay_ms, max_retries, endpoint_retry_max);
        let client = retry_policy.build_client()?;
        Ok(Self {
            client,
            cache_dir,
            retry_policy,
            cache_only,
            cache_ttl_days,
        })
    }

    pub(super) fn fetch_html(&self, url: &str) -> Result<String> {
        let start = Instant::now();
        let cache_path = cache_path(&self.cache_dir, url);
        let endpoint = endpoint_name(url);
        if cache_path.exists() {
            expire_cache_file(&cache_path, self.cache_ttl_days);
            if cache_path.exists() {
                let contents = read_cached_html(&cache_path).map_err(|err| {
                    record_scrape_error(
                        ScrapeErrorKind::CacheRead,
                        "cache",
                        &cache_path.to_string_lossy(),
                        Some(&format!("{err:?}")),
                    );
                    err
                })?;
                record_endpoint_timing(endpoint, start.elapsed());
                tracing::info!(
                    url,
                    source = "cache",
                    elapsed_ms = duration_as_u64_millis(start.elapsed()),
                    "fetch html"
                );
                return Ok(contents);
            }
        }
        if self.cache_only {
            record_scrape_error(
                ScrapeErrorKind::CacheMissing,
                "cache",
                url,
                Some("cache-only scrape missing cached html"),
            );
            bail!("cache-only scrape missing cached html for {url}");
        }
        let mut attempt: u32 = 0;
        let mut last_error = anyhow::anyhow!("fetch failed for {url}");
        loop {
            attempt += 1;
            let response = self.client.get(url).send();
            match response {
                Ok(resp) => {
                    let status = resp.status();
                    if status.is_success() {
                        match handle_success_response(
                            resp,
                            url,
                            &cache_path,
                            endpoint,
                            attempt,
                            &self.retry_policy,
                            start,
                        )? {
                            Some(response) => return Ok(response),
                            None => continue,
                        }
                    }

                    let retry_after =
                        log_http_status_failure(&resp, url, attempt, self.retry_policy.max_retries);
                    let (err, retryable, _) = build_http_status_error(
                        status,
                        url,
                        attempt,
                        self.retry_policy.max_retries,
                    );
                    if !retryable {
                        return Err(err);
                    }
                    last_error = err;
                    if attempt >= self.retry_policy.max_retries {
                        break;
                    }
                    if let Err(err) = self.retry_policy.enforce_endpoint_retry_budget(endpoint) {
                        last_error = err;
                        break;
                    }
                    record_endpoint_retry(endpoint);
                    self.retry_policy.sleep_backoff(attempt, retry_after);
                    continue;
                }
                Err(err) => {
                    last_error =
                        build_request_error(err, url, attempt, self.retry_policy.max_retries);
                    if attempt >= self.retry_policy.max_retries {
                        break;
                    }
                    if let Err(err) = self.retry_policy.enforce_endpoint_retry_budget(endpoint) {
                        last_error = err;
                        break;
                    }
                    record_endpoint_retry(endpoint);
                    self.retry_policy.sleep_backoff(attempt, None);
                }
            }
        }
        Err(last_error)
    }

    pub(super) fn prune_cache(&self) -> Result<()> {
        prune_cache_dir(&self.cache_dir, self.cache_ttl_days)
    }
}
