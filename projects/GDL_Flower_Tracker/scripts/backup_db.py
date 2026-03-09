#!/usr/bin/env python3
"""Create a SQLite backup with daily/weekly retention."""

from __future__ import annotations

import argparse
import shutil
import sqlite3
from datetime import UTC, datetime
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", required=True, help="Path to the live SQLite database.")
    parser.add_argument("--backup-dir", required=True, help="Directory that will hold daily/weekly backups.")
    parser.add_argument("--daily-retention", type=int, default=7)
    parser.add_argument("--weekly-retention", type=int, default=4)
    parser.add_argument("--force-weekly", action="store_true")
    return parser.parse_args()


def prune_backups(directory: Path, keep: int) -> None:
    backups = sorted(directory.glob("*.db"), key=lambda item: item.stat().st_mtime, reverse=True)
    for stale_backup in backups[keep:]:
        stale_backup.unlink()


def backup_database(source_path: Path, dest_path: Path) -> None:
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(source_path) as source, sqlite3.connect(dest_path) as target:
        source.backup(target)


def main() -> int:
    args = parse_args()
    source_path = Path(args.db).expanduser().resolve()
    backup_root = Path(args.backup_dir).expanduser().resolve()
    daily_dir = backup_root / "daily"
    weekly_dir = backup_root / "weekly"

    if not source_path.exists():
        raise SystemExit(f"Database does not exist: {source_path}")

    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    daily_target = daily_dir / f"gdl_data-{timestamp}.db"
    backup_database(source_path, daily_target)

    if args.force_weekly or datetime.now(UTC).weekday() == 6:
        weekly_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(daily_target, weekly_dir / daily_target.name)

    prune_backups(daily_dir, args.daily_retention)
    prune_backups(weekly_dir, args.weekly_retention)
    print(daily_target)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
