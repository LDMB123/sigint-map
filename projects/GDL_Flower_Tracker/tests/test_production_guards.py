import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))


def load_api_module(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, **env_overrides):
    base_env = {
        "APP_ENV": "production",
        "DB_PATH": str(tmp_path / "prod.db"),
        "SCHEDULER_ENABLED": "false",
        "AUTO_BOOTSTRAP_IF_EMPTY": "false",
        "CORS_ORIGINS": "https://tracker.example.com",
        "TRUSTED_HOSTS": "127.0.0.1,localhost,testserver,tracker.example.com",
    }
    for key, value in {**base_env, **env_overrides}.items():
        monkeypatch.setenv(key, value)

    sys.modules.pop("api_server", None)
    import api_server  # noqa: E402

    return api_server


def test_production_settings_disable_bootstrap_by_default(monkeypatch, tmp_path):
    from server.config import load_settings

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("AUTO_BOOTSTRAP_IF_EMPTY", raising=False)
    monkeypatch.setenv("CORS_ORIGINS", "https://tracker.example.com")

    settings = load_settings(tmp_path)
    assert settings.auto_bootstrap_if_empty is False


def test_production_settings_capture_monitoring_env(monkeypatch, tmp_path):
    from server.config import load_settings

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("CORS_ORIGINS", "https://tracker.example.com")
    monkeypatch.setenv("SENTRY_DSN", "https://public@example.ingest.sentry.io/1")
    monkeypatch.setenv("SENTRY_ENVIRONMENT", "production")
    monkeypatch.setenv("RELEASE_SHA", "abc123")

    settings = load_settings(tmp_path)
    assert settings.sentry_dsn == "https://public@example.ingest.sentry.io/1"
    assert settings.sentry_environment == "production"
    assert settings.release_sha == "abc123"


def test_production_settings_block_wildcard_cors(monkeypatch, tmp_path):
    from server.config import load_settings

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("CORS_ORIGINS", "*")

    with pytest.raises(ValueError, match="not allowed in production"):
        load_settings(tmp_path)


def test_production_refresh_disabled_without_admin_token(monkeypatch, tmp_path):
    api_module = load_api_module(tmp_path, monkeypatch)

    with TestClient(api_module.app) as client:
        response = client.post("/api/refresh")

    assert response.status_code == 503
    assert "disabled" in response.json()["detail"].lower()


def test_production_refresh_requires_valid_bearer_token(monkeypatch, tmp_path):
    api_module = load_api_module(tmp_path, monkeypatch, ADMIN_API_TOKEN="super-secret-token")

    with TestClient(api_module.app) as client:
        response = client.post("/api/refresh")

    assert response.status_code == 401
    assert "invalid admin bearer token" in response.json()["detail"].lower()


def test_production_refresh_accepts_valid_bearer_token(monkeypatch, tmp_path):
    api_module = load_api_module(tmp_path, monkeypatch, ADMIN_API_TOKEN="super-secret-token")

    async def fake_run_locked_job(job_name, worker):
        return {"status": "ok", "job": job_name}

    monkeypatch.setattr(api_module, "run_locked_job", fake_run_locked_job)

    with TestClient(api_module.app) as client:
        response = client.post("/api/refresh", headers={"Authorization": "Bearer super-secret-token"})

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "job": "refresh"}


def test_readyz_fails_without_built_frontend_in_production(monkeypatch, tmp_path):
    api_module = load_api_module(tmp_path, monkeypatch)
    monkeypatch.setattr(api_module, "built_frontend_ready", lambda: False)

    with TestClient(api_module.app) as client:
        response = client.get("/readyz")

    assert response.status_code == 503
    assert "frontend" in response.json()["detail"].lower()
