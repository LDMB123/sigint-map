import json
import sqlite3
import subprocess
import sys
import threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def create_db(path: Path) -> None:
    with sqlite3.connect(path) as db:
        db.execute("CREATE TABLE sample (id INTEGER PRIMARY KEY, value TEXT)")
        db.execute("INSERT INTO sample (value) VALUES ('ok')")
        db.commit()


def test_backup_db_script_creates_daily_backup(tmp_path: Path):
    db_path = tmp_path / "live.db"
    backup_dir = tmp_path / "backups"
    create_db(db_path)

    result = subprocess.run(
        [
            sys.executable,
            str(PROJECT_ROOT / "scripts" / "backup_db.py"),
            "--db",
            str(db_path),
            "--backup-dir",
            str(backup_dir),
            "--force-weekly",
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    created_backup = Path(result.stdout.strip())
    assert created_backup.exists()
    assert list((backup_dir / "weekly").glob("*.db"))


def test_restore_db_script_restores_backup(tmp_path: Path):
    source = tmp_path / "backup.db"
    dest = tmp_path / "restored.db"
    create_db(source)

    subprocess.run(
        [
            sys.executable,
            str(PROJECT_ROOT / "scripts" / "restore_db.py"),
            "--source",
            str(source),
            "--dest",
            str(dest),
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    with sqlite3.connect(dest) as db:
        row = db.execute("SELECT value FROM sample").fetchone()

    assert row == ("ok",)


class _ReleaseSmokeHandler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path in {"/healthz", "/readyz"}:
            self._send_json(200, {"status": "ok"})
            return
        if self.path == "/":
            body = b"ok"
            self.send_response(200)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if self.path == "/favicon.ico":
            self.send_response(200)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if self.path == "/api/dashboard":
            self._send_json(200, {"data": {"dispensaries": [{"name": "Elevations"}]}})
            return
        self._send_json(404, {"detail": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/api/refresh":
            self._send_json(401, {"detail": "invalid admin bearer token"})
            return
        if self.path == "/api/sync":
            auth = self.headers.get("Authorization")
            if auth == "Bearer test-token":
                self._send_json(200, {"status": "ok"})
            else:
                self._send_json(401, {"detail": "invalid admin bearer token"})
            return
        self._send_json(404, {"detail": "not found"})

    def log_message(self, format: str, *args: object) -> None:  # noqa: A003
        return


def test_release_smoke_script_verifies_release_endpoints(tmp_path: Path):
    server = ThreadingHTTPServer(("127.0.0.1", 0), _ReleaseSmokeHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        result = subprocess.run(
            [
                sys.executable,
                str(PROJECT_ROOT / "scripts" / "release_smoke.py"),
                "--base-url",
                f"http://127.0.0.1:{server.server_port}",
                "--expected-admin-status",
                "401",
                "--admin-token",
                "test-token",
                "--run-sync",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    finally:
        server.shutdown()
        thread.join(timeout=2)
        server.server_close()

    payload = json.loads(result.stdout)
    assert payload["checks"]["healthz"] == 200
    assert payload["checks"]["readyz"] == 200
    assert payload["checks"]["refresh_without_auth"] == 401
    assert payload["checks"]["sync_with_auth"] == 200


def test_emit_backend_sentry_test_requires_dsn():
    result = subprocess.run(
        [
            sys.executable,
            str(PROJECT_ROOT / "scripts" / "emit_backend_sentry_test.py"),
        ],
        capture_output=True,
        text=True,
    )

    assert result.returncode != 0
    assert "SENTRY_DSN" in (result.stderr or result.stdout)
