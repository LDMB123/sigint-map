import sqlite3
import subprocess
import sys
from pathlib import Path


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
