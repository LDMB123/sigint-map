#!/usr/bin/env python3
"""Restore a SQLite backup into the live database path."""

from __future__ import annotations

import argparse
import shutil
import sqlite3
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="Backup file to restore from.")
    parser.add_argument("--dest", required=True, help="Destination SQLite database path.")
    parser.add_argument("--force", action="store_true", help="Overwrite the destination if it already exists.")
    return parser.parse_args()


def validate_sqlite(path: Path) -> None:
    with sqlite3.connect(path) as db:
        db.execute("SELECT name FROM sqlite_master LIMIT 1").fetchone()


def main() -> int:
    args = parse_args()
    source = Path(args.source).expanduser().resolve()
    dest = Path(args.dest).expanduser().resolve()

    if not source.exists():
        raise SystemExit(f"Backup does not exist: {source}")
    if dest.exists() and not args.force:
        raise SystemExit(f"Destination exists, rerun with --force: {dest}")

    validate_sqlite(source)
    dest.parent.mkdir(parents=True, exist_ok=True)

    temp_dest = dest.with_suffix(dest.suffix + ".restore")
    shutil.copy2(source, temp_dest)
    validate_sqlite(temp_dest)
    temp_dest.replace(dest)
    print(dest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
