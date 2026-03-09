from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


def env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw.strip())
    except ValueError:
        return default


def env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw.strip())
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    app_env: str
    log_level: str
    sentry_dsn: str | None
    sentry_environment: str
    release_sha: str
    db_path: Path
    cors_origins: list[str]
    trusted_hosts: list[str]
    gdl_url: str
    http_timeout_seconds: float
    detail_page_enrichment_enabled: bool
    detail_page_fetch_limit: int
    detail_page_concurrency: int
    scheduler_enabled: bool
    scheduler_initial_delay_seconds: int
    scheduler_interval_seconds: int
    job_lock_ttl_seconds: int
    cache_ttl_seconds: int
    auto_bootstrap_if_empty: bool
    admin_api_token: str | None


def load_settings(app_dir: Path) -> Settings:
    app_env = os.getenv("APP_ENV", os.getenv("ENV", "development")).strip().lower()
    log_level = os.getenv("LOG_LEVEL", "INFO").strip().upper()
    db_path = Path(os.getenv("DB_PATH", str(app_dir / "gdl_data.db"))).expanduser()
    is_production = app_env in {"prod", "production"}

    cors_raw = os.getenv("CORS_ORIGINS")
    if cors_raw is None:
        cors_raw = "*" if app_env in {"dev", "development", "local", "test"} else ""
    cors_raw = cors_raw.strip()
    if is_production and cors_raw == "*":
        raise ValueError("CORS_ORIGINS='*' is not allowed in production; use same-origin only or an explicit origin list.")
    cors_origins = ["*"] if cors_raw == "*" else [origin.strip() for origin in cors_raw.split(",") if origin.strip()]

    trusted_raw = os.getenv("TRUSTED_HOSTS", "").strip()
    trusted_hosts = [host.strip() for host in trusted_raw.split(",") if host.strip()]
    admin_api_token = os.getenv("ADMIN_API_TOKEN", "").strip() or None

    return Settings(
        app_env=app_env,
        log_level=log_level,
        sentry_dsn=os.getenv("SENTRY_DSN", "").strip() or None,
        sentry_environment=os.getenv("SENTRY_ENVIRONMENT", app_env).strip() or app_env,
        release_sha=os.getenv("RELEASE_SHA", "dev").strip() or "dev",
        db_path=db_path,
        cors_origins=cors_origins,
        trusted_hosts=trusted_hosts,
        gdl_url=os.getenv("GDL_URL", "https://www.greendotlabs.com/find-our-products/").strip(),
        http_timeout_seconds=env_float("HTTP_TIMEOUT_SECONDS", 30.0),
        detail_page_enrichment_enabled=env_bool("DETAIL_PAGE_ENRICHMENT_ENABLED", True),
        detail_page_fetch_limit=env_int("DETAIL_PAGE_FETCH_LIMIT", 16),
        detail_page_concurrency=env_int("DETAIL_PAGE_CONCURRENCY", 4),
        scheduler_enabled=env_bool("SCHEDULER_ENABLED", default=False),
        scheduler_initial_delay_seconds=env_int("SCHEDULER_INITIAL_DELAY_SECONDS", 30),
        scheduler_interval_seconds=env_int("SCHEDULER_INTERVAL_SECONDS", 86400),
        job_lock_ttl_seconds=env_int("JOB_LOCK_TTL_SECONDS", 60 * 30),
        cache_ttl_seconds=env_int("CACHE_TTL_SECONDS", 15),
        auto_bootstrap_if_empty=env_bool("AUTO_BOOTSTRAP_IF_EMPTY", default=not is_production),
        admin_api_token=admin_api_token,
    )
