#!/usr/bin/env python3
"""One-shot script: apply KNOWN_PRICING to all unpriced products in the DB.

Usage:
  python update_prices.py

Optional env:
  DB_PATH=/path/to/gdl_data.db
"""

import os
import re
import sqlite3
from pathlib import Path

DB_PATH = Path(os.getenv("DB_PATH", str(Path(__file__).parent / "gdl_data.db"))).expanduser()

# Import pricing dict
from api_server import KNOWN_PRICING


def main() -> int:
    db = sqlite3.connect(str(DB_PATH), timeout=30, check_same_thread=False)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA busy_timeout=5000")

    dispensaries = db.execute("SELECT id, name, address FROM dispensaries").fetchall()

    total_updated = 0
    for d in dispensaries:
        disp_name = d["name"]
        disp_addr = d["address"] or ""
        disp_lower = disp_name.lower()
        addr_lower = disp_addr.lower()

        for known_name, info in KNOWN_PRICING.items():
            base_name = re.sub(r"\s+(REC|MED)$", "", known_name, flags=re.IGNORECASE)
            base_lower = base_name.lower()

            addr_match = info.get("address_match", "")
            name_hit = base_lower in disp_lower or disp_lower in base_lower
            address_hit = bool(addr_match and addr_match.lower() in addr_lower)

            if not (name_hit or address_hit):
                continue

            type_filter = info.get("type_filter")
            prices = info.get("prices", {})

            for size, price in prices.items():
                if type_filter:
                    query = """
                        UPDATE products SET price = ?
                        WHERE dispensary_id = ? AND size = ? AND type = ? AND price IS NULL
                    """
                    cur = db.execute(query, (price, d["id"], size, type_filter))
                else:
                    query = """
                        UPDATE products SET price = ?
                        WHERE dispensary_id = ? AND size = ? AND price IS NULL
                    """
                    cur = db.execute(query, (price, d["id"], size))

                if cur.rowcount > 0:
                    print(
                        f"  Updated {cur.rowcount} products at '{disp_name}' ({known_name}): "
                        f"{size} = ${price} ({type_filter or 'ALL'})"
                    )
                    total_updated += cur.rowcount

    db.commit()

    priced = db.execute("SELECT COUNT(*) FROM products WHERE price IS NOT NULL").fetchone()[0]
    total = db.execute("SELECT COUNT(*) FROM products").fetchone()[0]

    unpriced_disps = db.execute(
        """
        SELECT d.name, COUNT(p.id) as unpriced
        FROM dispensaries d
        JOIN products p ON d.id = p.dispensary_id
        WHERE p.price IS NULL
        GROUP BY d.name
        ORDER BY unpriced DESC
        """
    ).fetchall()

    print("\n=== SUMMARY ===")
    print(f"DB: {DB_PATH}")
    print(f"Total products updated: {total_updated}")
    print(f"Products with prices: {priced}/{total} ({(100*priced//total) if total else 0}%)")
    print("\nDispensaries still missing prices:")
    for row in unpriced_disps:
        print(f"  {row['name']}: {row['unpriced']} unpriced products")

    db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
