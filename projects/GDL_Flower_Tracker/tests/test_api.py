import asyncio
import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure project root is importable when running `pytest tests/` from any cwd.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))


@pytest.fixture()
def api_module(tmp_path: Path):
    # Configure a throwaway DB for tests.
    os.environ["APP_ENV"] = "test"
    os.environ["DB_PATH"] = str(tmp_path / "test.db")
    os.environ["SCHEDULER_ENABLED"] = "false"
    os.environ["AUTO_BOOTSTRAP_IF_EMPTY"] = "false"
    os.environ["CORS_ORIGINS"] = "*"

    # Ensure we reload api_server with the env above.
    sys.modules.pop("api_server", None)
    import api_server  # noqa: E402

    return api_server


@pytest.fixture()
def app(api_module):
    return api_module.app


def test_healthz(app):
    with TestClient(app) as client:
        r = client.get("/healthz")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


def test_readyz(app):
    with TestClient(app) as client:
        r = client.get("/readyz")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


def test_api_status(app):
    with TestClient(app) as client:
        r = client.get("/api/status")
        assert r.status_code == 200
        payload = r.json()
        assert payload["status"] == "ok"
        assert "dispensaryCount" in payload
        assert "productCount" in payload
        assert payload["dbPath"] is not None
        assert "lastActivityKind" in payload
        assert "lastRefreshKind" in payload
        assert "lastScrapeKind" in payload


def test_api_data_shape(app):
    with TestClient(app) as client:
        r = client.get("/api/data")
        assert r.status_code == 200
        payload = r.json()
        assert "dispensaries" in payload
        assert isinstance(payload["dispensaries"], list)


def test_price_history_empty_db(app):
    with TestClient(app) as client:
        r = client.get("/api/price-history?limit=25")
        assert r.status_code == 200
        payload = r.json()
        assert isinstance(payload, list)
        # Fresh DB should have no history.
        assert len(payload) == 0


def test_jobs_endpoint_empty(app):
    with TestClient(app) as client:
        r = client.get("/api/jobs?limit=5")
        assert r.status_code == 200
        payload = r.json()
        assert payload == {"jobs": []}


def test_root_supports_head_and_etag(app):
    with TestClient(app) as client:
        first = client.get("/")
        assert first.status_code == 200
        etag = first.headers.get("etag")
        assert etag

        head = client.head("/")
        assert head.status_code == 200
        assert head.headers.get("etag") == etag

        cached = client.get("/", headers={"If-None-Match": etag})
        assert cached.status_code == 304


def test_static_assets_include_helper_modules_and_favicon(app):
    with TestClient(app) as client:
        index_txt = client.get("/index.txt")
        assert index_txt.status_code == 200
        assert "text/plain" in (index_txt.headers.get("content-type") or "")
        assert index_txt.headers.get("etag")

        js_response = client.get("/js/runtime-helpers.js")
        assert js_response.status_code == 200
        assert "isFiniteNumber" in js_response.text
        assert js_response.headers.get("etag")

        styles_response = client.get("/styles/polish.css")
        assert styles_response.status_code == 200
        assert "--touch-target-min" in styles_response.text

        favicon_response = client.get("/favicon.ico")
        assert favicon_response.status_code == 200
        assert "image/svg+xml" in (favicon_response.headers.get("content-type") or "")


def test_pwa_assets_are_served_when_built(app):
    with TestClient(app) as client:
        manifest = client.get("/manifest.webmanifest")
        assert manifest.status_code == 200
        assert "manifest" in (manifest.headers.get("content-type") or "")

        offline = client.get("/offline.html")
        assert offline.status_code == 200
        assert "offline" in offline.text.lower()

        sw = client.get("/sw.js")
        assert sw.status_code == 200
        assert sw.headers.get("etag")

        not_found = client.get("/_not-found.html")
        assert not_found.status_code == 200
        assert "_next" in not_found.text or "not found" in not_found.text.lower()

        tree_manifest = client.get("/__next._tree.txt")
        assert tree_manifest.status_code == 200
        assert "text/plain" in (tree_manifest.headers.get("content-type") or "")

        exported_404 = client.get("/404.html")
        assert exported_404.status_code == 200
        assert "text/html" in (exported_404.headers.get("content-type") or "")

        nested_not_found_manifest = client.get("/_not-found/__next._tree.txt")
        assert nested_not_found_manifest.status_code == 200
        assert "text/plain" in (nested_not_found_manifest.headers.get("content-type") or "")


def test_hashed_next_assets_are_immutable(app, api_module):
    chunk_path = next((api_module.BUILT_FRONTEND_DIR / "_next" / "static" / "chunks").glob("*.js"))
    relative_path = chunk_path.relative_to(api_module.BUILT_FRONTEND_DIR).as_posix()

    with TestClient(app) as client:
        response = client.get(f"/{relative_path}")

    assert response.status_code == 200
    assert "immutable" in (response.headers.get("cache-control") or "")


def test_status_payload_exposes_seed_provenance(api_module):
    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        with api_module.db_tx(db):
            db.execute(
                """
                INSERT INTO dispensaries (name, address, lat, lng, distance, drop_date, menu_url, menu_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                ("Elevations", "8270 Razorback Rd, Colorado Springs, CO 80920", 38.9278, -104.7591, 2.1, "2026-02-28", None, "MED"),
            )
            db.execute(
                """
                INSERT INTO refresh_log (refreshed_at, dispensary_count, product_count, source)
                VALUES (?, ?, ?, ?)
                """,
                ("2026-03-02T12:00:00+00:00", 1, 2, "seed"),
            )

        payload = api_module.get_status_payload(db)
        assert payload["lastActivitySource"] == "seed"
        assert payload["lastActivityKind"] == "seed"
        assert payload["lastRefreshSource"] == "seed"
        assert payload["lastRefreshKind"] == "seed"
        assert payload["lastSuccessfulRefreshSource"] == "seed"
        assert payload["lastSuccessfulRefreshKind"] == "seed"
    finally:
        db.close()


def test_api_data_preserves_null_price_values(api_module, app):
    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        with api_module.db_tx(db):
            cur = db.execute(
                """
                INSERT INTO dispensaries (name, address, lat, lng, distance, drop_date, menu_url, menu_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                ("Buku Loud", "3079 S Academy Blvd, Colorado Springs, CO 80916", 38.8050, -104.7580, 9.4, "2026-02-21", None, "REC"),
            )
            disp_id = cur.lastrowid
            db.executemany(
                """
                INSERT INTO products (dispensary_id, strain, size, price, type, thc)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    (disp_id, "Jetpack", "3.5g", 50.0, "REC", None),
                    (disp_id, "Monaco", "3.5g", None, "REC", None),
                ],
            )

        with TestClient(app) as client:
            payload = client.get("/api/data").json()

        products = next(item for item in payload["dispensaries"] if item["name"] == "Buku Loud")["products"]
        by_strain = {product["strain"]: product for product in products}
        assert by_strain["Jetpack"]["price"] == 50.0
        assert by_strain["Monaco"]["price"] is None
    finally:
        db.close()


def test_parse_gdl_page_fallback_supports_single_variant(api_module):
    html = """
    <html>
      <body>
        <h1>Find Our Products</h1>
        <div>Search Dispensaries</div>
        <a href="https://example.com/green-pharm">Green Pharm (MED)</a>
        <div>02/28/26</div>
        <div>4335 N Academy Blvd #100, Colorado Springs, CO 80918</div>
        <div>FLOWER 14G (MED): I-95, Screaming OG, Blu Froot</div>
        <div>FLOWER 7G SINGLE (MED): I-95, Screaming OG, Blu Froot</div>
        <div>FLOWER 3.5G SINGLE (MED): I-95, Screaming OG, Blu Froot</div>
        <div>READ MORE</div>
      </body>
    </html>
    """

    parsed = api_module.parse_gdl_page(html)
    assert len(parsed) == 1
    dispensary = parsed[0]
    assert dispensary["name"] == "Green Pharm (MED)"
    assert dispensary["dropDate"] == "2026-02-28"
    assert dispensary["dropUrl"] == "https://example.com/green-pharm"

    product_keys = {(p["strain"], p["size"], p["type"]) for p in dispensary["products"]}
    assert ("I-95", "14g", "MED") in product_keys
    assert ("Blu Froot", "7g", "MED") in product_keys
    assert ("Screaming OG", "3.5g", "MED") in product_keys
    assert len(product_keys) == 9


def test_record_price_point_if_changed_only_inserts_on_change(api_module):
    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        inserted = api_module.record_price_point_if_changed(db, "Green Pharm", "I-95", "3.5g", 40, "MED")
        assert inserted is True

        duplicate = api_module.record_price_point_if_changed(db, "Green Pharm", "I-95", "3.5g", 40, "MED")
        assert duplicate is False

        changed = api_module.record_price_point_if_changed(db, "Green Pharm", "I-95", "3.5g", 45, "MED")
        assert changed is True

        count = db.execute("SELECT COUNT(*) FROM price_history").fetchone()[0]
        assert count == 2
    finally:
        db.close()


def test_scrape_menus_updates_only_exact_matching_strain(api_module, monkeypatch):
    async def fake_fetch_all_menus_with_meta():
        return {
            "Green Pharm": [
                {"strain": "I-95", "size": "3.5g", "price": 44.0, "type": "MED"},
            ]
        }, []

    monkeypatch.setattr(api_module, "fetch_all_menus_with_meta", fake_fetch_all_menus_with_meta)

    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        with api_module.db_tx(db):
            cur = db.execute(
                """
                INSERT INTO dispensaries (name, address, lat, lng, distance, drop_date, menu_url, menu_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                ("Green Pharm", "4335 N Academy Blvd #100, Colorado Springs, CO 80918", 38.9, -104.7, 3.5, "2026-02-28", None, "MED"),
            )
            disp_id = cur.lastrowid
            db.executemany(
                "INSERT INTO products (dispensary_id, strain, size, price, type, thc) VALUES (?, ?, ?, ?, ?, ?)",
                [
                    (disp_id, "I-95", "3.5g", 40.0, "MED", "22.28%"),
                    (disp_id, "Blu Froot", "3.5g", 41.0, "MED", "20.03%"),
                ],
            )

        result = asyncio.run(api_module.scrape_menus(db))
        assert result["matchedLiveProducts"] == 1
        assert result["updated"] == 1

        rows = db.execute(
            "SELECT strain, price FROM products WHERE dispensary_id = ? ORDER BY strain",
            (disp_id,),
        ).fetchall()
        prices = {row["strain"]: row["price"] for row in rows}
        assert prices == {"Blu Froot": 41.0, "I-95": 44.0}

        history = db.execute(
            "SELECT strain, price FROM price_history ORDER BY id"
        ).fetchall()
        assert [(row["strain"], row["price"]) for row in history] == [("I-95", 44.0)]
    finally:
        db.close()



def test_global_job_lock_blocks_concurrent_mutating_jobs(api_module):
    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        refresh_ctx = api_module.try_begin_job(db, "refresh")
        assert refresh_ctx is not None

        scrape_ctx = api_module.try_begin_job(db, "scrape")
        assert scrape_ctx is None

        api_module.finish_job(db, refresh_ctx)

        scrape_ctx = api_module.try_begin_job(db, "scrape")
        assert scrape_ctx is not None
        api_module.finish_job(db, scrape_ctx)
    finally:
        db.close()



def test_cleanup_stale_jobs_removes_foreign_locks_and_repairs_runs(api_module):
    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        with api_module.db_tx(db):
            db.execute(
                "INSERT INTO job_locks (job_name, lock_owner, locked_at, expires_at) VALUES (?, ?, ?, ?)",
                ("scheduled-scrape", "other-host:1234", "2026-03-01T00:00:00+00:00", "2999-01-01T00:00:00+00:00"),
            )
            db.execute(
                "INSERT INTO job_runs (job_name, status, started_at, lock_owner) VALUES (?, ?, ?, ?)",
                ("scheduled-scrape", "running", "2026-03-01T00:00:00+00:00", "other-host:1234"),
            )

        result = api_module.cleanup_stale_jobs(db, include_foreign_hosts=True)
        assert result == {"locksRemoved": 1, "runsRepaired": 1}

        active_jobs = api_module.get_active_jobs(db)
        assert active_jobs == []

        repaired = db.execute(
            "SELECT status, finished_at, error FROM job_runs ORDER BY id DESC LIMIT 1"
        ).fetchone()
        assert repaired["status"] == "error"
        assert repaired["finished_at"] is not None
        assert "Recovered abandoned job" in repaired["error"]
    finally:
        db.close()



def test_merge_dispensary_rows_merges_same_store_and_keeps_latest_drop(api_module):
    merged = api_module._merge_dispensary_rows([
        {
            "name": "Green Pharm",
            "address": "4335 N Academy Blvd #100, Colorado Springs, CO 80918",
            "dropDate": "2026-02-25",
            "dropUrl": "/older",
            "products": [{"strain": "I-95", "size": "3.5g", "type": "MED"}],
        },
        {
            "name": "Green Pharm",
            "address": "4335 N Academy Blvd #100, Colorado Springs, CO 80918",
            "dropDate": "2026-03-02",
            "dropUrl": "/newer",
            "products": [{"strain": "Blu Froot", "size": "7g", "type": "MED"}],
        },
    ])

    assert len(merged) == 1
    item = merged[0]
    assert item["dropDate"] == "2026-03-02"
    assert item["dropUrl"] == "/newer"
    keys = {(p["strain"], p["size"], p["type"]) for p in item["products"]}
    assert keys == {("I-95", "3.5g", "MED"), ("Blu Froot", "7g", "MED")}



def test_refresh_endpoint_returns_502_and_records_failed_job(api_module, monkeypatch):
    async def fake_refresh_data(_db):
        raise RuntimeError("boom upstream")

    monkeypatch.setattr(api_module, "refresh_data", fake_refresh_data)

    with TestClient(api_module.app) as client:
        response = client.post("/api/refresh")
        assert response.status_code == 502
        assert response.json()["detail"] == "boom upstream"

    db = api_module.connect_db()
    try:
        row = db.execute(
            "SELECT job_name, status, error FROM job_runs ORDER BY id DESC LIMIT 1"
        ).fetchone()
        assert row["job_name"] == "refresh"
        assert row["status"] == "error"
        assert row["error"] == "boom upstream"
    finally:
        db.close()



def test_normalise_strain_key_strips_brand_prefixes(api_module):
    assert api_module.normalise_strain_key("Green Dot Labs - I-95") == api_module.normalise_strain_key("I-95")
    assert api_module.normalise_strain_key("GDL | Blu Froot (Flower)") == api_module.normalise_strain_key("Blu Froot")



def test_parse_gdl_page_normalises_relative_drop_urls(api_module):
    html = """
    <html>
      <body>
        <div class="single-drop">
          <a class="title" href="/dispensary-drops/green-pharm/">Green Pharm</a>
          <div class="drop-date">03/01/26</div>
          <big>4335 N Academy Blvd #100, Colorado Springs, CO 80918</big>
          <div class="not-truncated-content">
            <p>FLOWER 3.5G (MED): I-95</p>
          </div>
        </div>
      </body>
    </html>
    """

    parsed = api_module.parse_gdl_page(html)
    assert parsed[0]["dropUrl"].startswith("https://")
    assert parsed[0]["dropUrl"].endswith("/dispensary-drops/green-pharm/")



def test_parse_gdl_detail_page_extracts_current_drop_and_order_url(api_module):
    html = """
    <html>
      <head>
        <link rel="canonical" href="https://www.greendotlabs.com/dispensary-drops/green-pharm/" />
      </head>
      <body>
        <h1>Green Pharm (MED)</h1>
        <div>4335 N Academy Blvd #100, Colorado Springs, CO 80918</div>
        <a href="https://greenpharmco.com/order-now">Order now!</a>
        <div>Dropped</div>
        <div>02/28/2026</div>
        <div>FLOWER 14G (MED): I-95, Screaming OG</div>
        <div>FLOWER 3.5G (MED): Blu Froot</div>
        <div>Previous Drop</div>
        <div>02/20/2026</div>
        <div>FLOWER 3.5G (MED): Old News</div>
      </body>
    </html>
    """

    parsed = api_module.parse_gdl_detail_page(html)
    assert parsed is not None
    assert parsed["name"] == "Green Pharm (MED)"
    assert parsed["address"] == "4335 N Academy Blvd #100, Colorado Springs, CO 80918"
    assert parsed["dropDate"] == "2026-02-28"
    assert parsed["dropUrl"] == "https://www.greendotlabs.com/dispensary-drops/green-pharm/"
    assert parsed["menuUrl"] == "https://greenpharmco.com/order-now"
    assert {(item["strain"], item["size"], item["type"]) for item in parsed["products"]} == {
        ("I-95", "14g", "MED"),
        ("Screaming OG", "14g", "MED"),
        ("Blu Froot", "3.5g", "MED"),
    }



def test_scrape_menus_matches_brand_prefixed_live_names(api_module, monkeypatch):
    async def fake_fetch_all_menus_with_meta():
        return {
            "Green Pharm": [
                {"strain": "Green Dot Labs - I-95", "size": "3.5g", "price": 44.0, "type": "MED"},
            ]
        }, []

    monkeypatch.setattr(api_module, "fetch_all_menus_with_meta", fake_fetch_all_menus_with_meta)

    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        with api_module.db_tx(db):
            cur = db.execute(
                """
                INSERT INTO dispensaries (name, address, lat, lng, distance, drop_date, menu_url, menu_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                ("Green Pharm", "4335 N Academy Blvd #100, Colorado Springs, CO 80918", 38.9, -104.7, 3.5, "2026-02-28", None, "MED"),
            )
            disp_id = cur.lastrowid
            db.execute(
                "INSERT INTO products (dispensary_id, strain, size, price, type, thc) VALUES (?, ?, ?, ?, ?, ?)",
                (disp_id, "I-95", "3.5g", 40.0, "MED", "22.28%"),
            )

        result = asyncio.run(api_module.scrape_menus(db))
        assert result["matchedLiveProducts"] == 1
        updated = db.execute(
            "SELECT price FROM products WHERE dispensary_id = ? AND strain = ?",
            (disp_id, "I-95"),
        ).fetchone()
        assert updated["price"] == 44.0
    finally:
        db.close()



def test_cleanup_stale_jobs_removes_orphan_same_host_locks(api_module):
    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        owner = f"{api_module.socket.gethostname()}:999999"
        with api_module.db_tx(db):
            db.execute(
                "INSERT INTO job_locks (job_name, lock_owner, locked_at, expires_at) VALUES (?, ?, ?, ?)",
                ("scrape", owner, "2026-03-01T00:00:00+00:00", "2999-01-01T00:00:00+00:00"),
            )
            db.execute(
                "INSERT INTO job_runs (job_name, status, started_at, lock_owner) VALUES (?, ?, ?, ?)",
                ("scrape", "running", "2026-03-01T00:00:00+00:00", owner),
            )

        result = api_module.cleanup_stale_jobs(db, include_foreign_hosts=False)
        assert result == {"locksRemoved": 1, "runsRepaired": 1}
    finally:
        db.close()


def test_refresh_data_preserves_existing_live_price_and_thc(api_module, monkeypatch):
    class DummyResponse:
        text = "<html></html>"

        def raise_for_status(self):
            return None

    class DummyAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, *args, **kwargs):
            return DummyResponse()

    monkeypatch.setattr(api_module.httpx, "AsyncClient", DummyAsyncClient)
    monkeypatch.setattr(
        api_module,
        "parse_gdl_page",
        lambda _html: [
            {
                "name": "Green Pharm (MED)",
                "address": "4335 N Academy Blvd #100, Colorado Springs, CO 80918",
                "dropDate": "2026-03-04",
                "dropUrl": "https://example.com/green-pharm",
                "products": [
                    {"strain": "I-95", "size": "3.5g", "price": None, "type": "MED", "thc": None},
                ],
            }
        ],
    )

    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        with api_module.db_tx(db):
            cur = db.execute(
                """
                INSERT INTO dispensaries (name, address, lat, lng, distance, drop_date, menu_url, menu_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                ("Green Pharm", "4335 N Academy Blvd #100, Colorado Springs, CO 80918", 38.9, -104.7, 3.5, "2026-02-28", None, "MED"),
            )
            disp_id = cur.lastrowid
            db.execute(
                "INSERT INTO products (dispensary_id, strain, size, price, type, thc) VALUES (?, ?, ?, ?, ?, ?)",
                (disp_id, "I-95", "3.5g", 44.0, "MED", "22.28%"),
            )

        result = asyncio.run(api_module.refresh_data(db))
        assert result["status"] == "ok"

        row = db.execute(
            "SELECT d.name, p.price, p.thc FROM products p JOIN dispensaries d ON p.dispensary_id = d.id ORDER BY p.id DESC LIMIT 1"
        ).fetchone()
        assert row["name"] == "Green Pharm (MED)"
        assert row["price"] == 44.0
        assert row["thc"] == "22.28%"
    finally:
        db.close()



def test_scrape_menus_backfills_known_prices_after_partial_live_match(api_module, monkeypatch):
    async def fake_fetch_all_menus_with_meta():
        return {
            "Green Pharm": [
                {"strain": "I-95", "size": "3.5g", "price": 44.0, "type": "MED"},
            ]
        }, []

    monkeypatch.setattr(api_module, "fetch_all_menus_with_meta", fake_fetch_all_menus_with_meta)

    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        with api_module.db_tx(db):
            cur = db.execute(
                """
                INSERT INTO dispensaries (name, address, lat, lng, distance, drop_date, menu_url, menu_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                ("Green Pharm (MED)", "4335 N Academy Blvd #100, Colorado Springs, CO 80918", 38.9, -104.7, 3.5, "2026-02-28", None, "MED"),
            )
            disp_id = cur.lastrowid
            db.executemany(
                "INSERT INTO products (dispensary_id, strain, size, price, type, thc) VALUES (?, ?, ?, ?, ?, ?)",
                [
                    (disp_id, "I-95", "3.5g", None, "MED", None),
                    (disp_id, "Blu Froot", "7g", None, "MED", None),
                ],
            )

        result = asyncio.run(api_module.scrape_menus(db))
        assert result["matchedLiveProducts"] == 1
        assert result["hardcoded_hits"] == 1
        assert result["updated"] == 2

        rows = db.execute(
            "SELECT strain, size, price FROM products WHERE dispensary_id = ? ORDER BY size, strain",
            (disp_id,),
        ).fetchall()
        prices = {(row["strain"], row["size"]): row["price"] for row in rows}
        assert prices == {("I-95", "3.5g"): 44.0, ("Blu Froot", "7g"): 40.0}
    finally:
        db.close()



def test_scrape_menus_matches_variant_store_names(api_module, monkeypatch):
    async def fake_fetch_all_menus_with_meta():
        return {
            "The Dispensary": [
                {"strain": "Fortissimo", "size": "3.5g", "price": 55.0, "type": "REC"},
            ]
        }, []

    monkeypatch.setattr(api_module, "fetch_all_menus_with_meta", fake_fetch_all_menus_with_meta)

    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        with api_module.db_tx(db):
            cur = db.execute(
                """
                INSERT INTO dispensaries (name, address, lat, lng, distance, drop_date, menu_url, menu_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                ("The Dispensary (Montebello)", "2205 E Montebello St, Colorado Springs, CO 80909", 38.9, -104.7, 4.5, "2026-02-28", None, "REC"),
            )
            disp_id = cur.lastrowid
            db.execute(
                "INSERT INTO products (dispensary_id, strain, size, price, type, thc) VALUES (?, ?, ?, ?, ?, ?)",
                (disp_id, "Fortissimo", "3.5g", 50.0, "REC", None),
            )

        result = asyncio.run(api_module.scrape_menus(db))
        assert result["matchedLiveProducts"] == 1
        assert "The Dispensary" in result["matchedStores"]

        updated = db.execute(
            "SELECT price FROM products WHERE dispensary_id = ? AND strain = ?",
            (disp_id, "Fortissimo"),
        ).fetchone()
        assert updated["price"] == 55.0
    finally:
        db.close()



def test_api_dashboard_shape(app):
    with TestClient(app) as client:
        response = client.get("/api/dashboard")
        assert response.status_code == 200
        payload = response.json()
        assert "data" in payload
        assert "status" in payload
        assert "scrapeStatus" in payload
        assert "history" in payload
        assert "jobs" in payload
        assert isinstance(payload["data"]["dispensaries"], list)
        assert isinstance(payload["history"], list)
        assert isinstance(payload["jobs"], list)


def test_api_dashboard_zero_limits_skip_history_and_jobs(app):
    with TestClient(app) as client:
        response = client.get("/api/dashboard?history_limit=0&job_limit=0")
        assert response.status_code == 200
        payload = response.json()
        assert payload["history"] == []
        assert payload["jobs"] == []



def test_api_sync_runs_refresh_then_scrape(api_module, monkeypatch):
    calls = []

    async def fake_refresh_data(_db):
        calls.append("refresh")
        return {"status": "ok", "dispensaryCount": 3, "productCount": 10}

    async def fake_scrape_menus(_db):
        calls.append("scrape")
        return {"status": "ok", "pricedProducts": 7, "totalProducts": 10}

    monkeypatch.setattr(api_module, "refresh_data", fake_refresh_data)
    monkeypatch.setattr(api_module, "scrape_menus", fake_scrape_menus)

    with TestClient(api_module.app) as client:
        response = client.post("/api/sync")
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "ok"
        assert payload["dispensaryCount"] == 3
        assert payload["productCount"] == 10
        assert payload["pricedProducts"] == 7
        assert payload["totalProducts"] == 10

    assert calls == ["refresh", "scrape"]


def test_is_in_area_rejects_broad_non_local_prefixes(api_module):
    assert api_module.is_in_area("4335 N Academy Blvd #100, Colorado Springs, CO 80918") is True
    assert api_module.is_in_area("141 Manitou Ave, Manitou Springs, CO 80829") is True
    assert api_module.is_in_area("4332 S Broadway, Englewood, CO 80113") is False
    assert api_module.is_in_area("332 Bent Ave, Las Animas, CO 81054") is False


def test_lookup_coords_by_address_ignores_generic_city_only_fragments(api_module):
    # A broad city-only fragment should not snap an arbitrary Colorado Springs
    # address onto a single storefront's coordinates.
    assert api_module.lookup_coords_by_address("329 E Pikes Peak Ave, Colorado Springs, CO 80903") is not None
    assert api_module.lookup_coords_by_address("329 E Pikes Peak Ave, Colorado Springs, CO 80903")["addr"] == "329 E Pikes Peak"


def test_status_payload_tracks_refresh_and_scrape_separately(api_module):
    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        with api_module.db_tx(db):
            db.executemany(
                "INSERT INTO refresh_log (refreshed_at, dispensary_count, product_count, source) VALUES (?, ?, ?, ?)",
                [
                    ("2026-03-01T00:00:00+00:00", 10, 30, "refresh"),
                    ("2026-03-02T00:00:00+00:00", 10, 30, "menu-scrape (priced:20)"),
                ],
            )

        payload = api_module.get_status_payload(db)
        assert payload["lastActivity"] == "2026-03-02T00:00:00+00:00"
        assert payload["lastActivitySource"] == "menu-scrape (priced:20)"
        assert payload["lastRefresh"] == "2026-03-01T00:00:00+00:00"
        assert payload["lastRefreshSource"] == "refresh"
        assert payload["lastScrape"] == "2026-03-02T00:00:00+00:00"
        assert payload["lastScrapeSource"] == "menu-scrape (priced:20)"
    finally:
        db.close()


def test_parse_flower_line_supports_black_label_prefix(api_module):
    parsed = api_module.parse_flower_line("BLACK LABEL FLOWER 3.5G (MED): Fortissimo, Soul Cleanser")
    assert parsed == [
        {"strain": "Fortissimo", "size": "3.5g", "price": None, "type": "MED", "thc": None},
        {"strain": "Soul Cleanser", "size": "3.5g", "price": None, "type": "MED", "thc": None},
    ]


def test_refresh_data_preserves_existing_dataset_on_suspicious_shrink(api_module, monkeypatch):
    class DummyResponse:
        text = "<html></html>"

        def raise_for_status(self):
            return None

    class DummyAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, *args, **kwargs):
            return DummyResponse()

    monkeypatch.setattr(api_module.httpx, "AsyncClient", DummyAsyncClient)
    monkeypatch.setattr(
        api_module,
        "parse_gdl_page",
        lambda _html: [
            {
                "name": "Green Pharm (MED)",
                "address": "4335 N Academy Blvd #100, Colorado Springs, CO 80918",
                "dropDate": "2026-03-04",
                "dropUrl": "https://example.com/green-pharm",
                "products": [
                    {"strain": "I-95", "size": "3.5g", "price": None, "type": "MED", "thc": None},
                ],
            }
        ],
    )

    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        with api_module.db_tx(db):
            for index in range(5):
                cur = db.execute(
                    """
                    INSERT INTO dispensaries (name, address, lat, lng, distance, drop_date, menu_url, menu_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (f"Store {index}", f"{100 + index} Test Ave, Colorado Springs, CO 8090{index}", 38.9, -104.7, 5 + index, "2026-02-28", None, "MED"),
                )
                disp_id = cur.lastrowid
                for product_index in range(3):
                    db.execute(
                        "INSERT INTO products (dispensary_id, strain, size, price, type, thc) VALUES (?, ?, ?, ?, ?, ?)",
                        (disp_id, f"Strain {index}-{product_index}", "3.5g", 40.0 + product_index, "MED", None),
                    )

        result = asyncio.run(api_module.refresh_data(db))
        assert result["status"] == "warning"
        assert result["dispensaryCount"] == 5
        assert result["productCount"] == 15
        assert result["parsedDispensaryCount"] == 1
        assert result["parsedProductCount"] == 1

        counts = db.execute("SELECT COUNT(*) AS dispensaries, (SELECT COUNT(*) FROM products) AS products FROM dispensaries").fetchone()
        assert counts["dispensaries"] == 5
        assert counts["products"] == 15
    finally:
        db.close()


def test_api_sync_propagates_warning_status(api_module, monkeypatch):
    async def fake_refresh_data(_db):
        return {"status": "warning", "warning": "refresh warning", "dispensaryCount": 3, "productCount": 10}

    async def fake_scrape_menus(_db):
        return {"status": "ok", "pricedProducts": 7, "totalProducts": 10}

    monkeypatch.setattr(api_module, "refresh_data", fake_refresh_data)
    monkeypatch.setattr(api_module, "scrape_menus", fake_scrape_menus)

    with TestClient(api_module.app) as client:
        response = client.post("/api/sync")
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "warning"
        assert payload["refresh"]["warning"] == "refresh warning"


def test_touch_job_locks_extends_expiry(api_module):
    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        ctx = api_module.try_begin_job(db, "refresh", ttl_seconds=10)
        assert ctx is not None

        before = db.execute(
            "SELECT expires_at FROM job_locks WHERE job_name = ? AND lock_owner = ?",
            ("refresh", ctx.owner),
        ).fetchone()["expires_at"]

        assert api_module.touch_job_locks(ctx, ttl_seconds=120) is True

        after = db.execute(
            "SELECT expires_at FROM job_locks WHERE job_name = ? AND lock_owner = ?",
            ("refresh", ctx.owner),
        ).fetchone()["expires_at"]

        assert api_module.parse_iso(after) > api_module.parse_iso(before)
        api_module.finish_job(db, ctx)
    finally:
        db.close()


def test_refresh_data_preserves_existing_coords_when_store_matches(api_module, monkeypatch):
    class DummyResponse:
        text = "<html></html>"

        def raise_for_status(self):
            return None

    class DummyAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, *args, **kwargs):
            return DummyResponse()

    monkeypatch.setattr(api_module.httpx, "AsyncClient", DummyAsyncClient)
    monkeypatch.setattr(
        api_module,
        "parse_gdl_page",
        lambda _html: [
            {
                "name": "Green Pharm (MED)",
                "address": "4335 N Academy Blvd #100, Colorado Springs, CO 80918",
                "dropDate": "2026-03-04",
                "dropUrl": "https://example.com/green-pharm",
                "products": [
                    {"strain": "I-95", "size": "3.5g", "price": None, "type": "MED", "thc": None},
                ],
            }
        ],
    )

    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        with api_module.db_tx(db):
            cur = db.execute(
                """
                INSERT INTO dispensaries (name, address, lat, lng, distance, drop_date, menu_url, menu_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                ("Green Pharm", "4335 N Academy Blvd #100, Colorado Springs, CO 80918", 38.8825, -104.7920, 3.5, "2026-02-28", None, "MED"),
            )
            disp_id = cur.lastrowid
            db.execute(
                "INSERT INTO products (dispensary_id, strain, size, price, type, thc) VALUES (?, ?, ?, ?, ?, ?)",
                (disp_id, "I-95", "3.5g", 44.0, "MED", "22.28%"),
            )

        result = asyncio.run(api_module.refresh_data(db))
        assert result["status"] == "ok"

        row = db.execute(
            "SELECT lat, lng, distance FROM dispensaries ORDER BY id DESC LIMIT 1"
        ).fetchone()
        assert row["lat"] == 38.8825
        assert row["lng"] == -104.7920
        assert row["distance"] == 3.5
    finally:
        db.close()


def test_init_db_migrates_new_columns(api_module):
    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        disp_columns = {row['name'] for row in db.execute("PRAGMA table_info(dispensaries)").fetchall()}
        run_columns = {row['name'] for row in db.execute("PRAGMA table_info(job_runs)").fetchall()}
        assert 'drop_url' in disp_columns
        assert 'result_json' in run_columns
    finally:
        db.close()



def test_refresh_data_preserves_menu_url_and_sets_drop_url(api_module, monkeypatch):
    class DummyResponse:
        text = "<html></html>"

        def raise_for_status(self):
            return None

    class DummyAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, *args, **kwargs):
            return DummyResponse()

    monkeypatch.setattr(api_module.httpx, "AsyncClient", DummyAsyncClient)
    monkeypatch.setattr(
        api_module,
        "parse_gdl_page",
        lambda _html: [
            {
                "name": "Green Pharm (MED)",
                "address": "4335 N Academy Blvd #100, Colorado Springs, CO 80918",
                "dropDate": "2026-03-04",
                "dropUrl": "https://example.com/drops/green-pharm",
                "products": [
                    {"strain": "I-95", "size": "3.5g", "price": None, "type": "MED", "thc": None},
                ],
            }
        ],
    )

    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        with api_module.db_tx(db):
            cur = db.execute(
                """
                INSERT INTO dispensaries (name, address, lat, lng, distance, drop_date, drop_url, menu_url, menu_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "Green Pharm",
                    "4335 N Academy Blvd #100, Colorado Springs, CO 80918",
                    38.8825,
                    -104.7920,
                    3.5,
                    "2026-02-28",
                    "https://old.example/drop",
                    "https://menus.example/green-pharm",
                    "MED",
                ),
            )
            db.execute(
                "INSERT INTO products (dispensary_id, strain, size, price, type, thc) VALUES (?, ?, ?, ?, ?, ?)",
                (cur.lastrowid, "I-95", "3.5g", 44.0, "MED", "22.28%"),
            )

        result = asyncio.run(api_module.refresh_data(db))
        assert result["status"] == "ok"

        row = db.execute(
            "SELECT menu_url, drop_url, menu_type FROM dispensaries ORDER BY id DESC LIMIT 1"
        ).fetchone()
        assert row["menu_url"] == "https://menus.example/green-pharm"
        assert row["drop_url"] == "https://example.com/drops/green-pharm"
        assert row["menu_type"] == "MED"
    finally:
        db.close()



def test_get_best_menu_url_returns_known_platform_link(api_module):
    assert api_module.get_best_menu_url("Green Pharm") == "https://weedmaps.com/dispensaries/green-pharm-colorado-springs"



def test_status_hides_warning_after_later_successful_refresh(api_module):
    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        with api_module.db_tx(db):
            db.execute(
                "INSERT INTO refresh_log (refreshed_at, dispensary_count, product_count, source) VALUES (?, ?, ?, ?)",
                ("2026-03-01T00:00:00+00:00", 10, 50, "refresh-suspicious-shrink"),
            )
            db.execute(
                "INSERT INTO refresh_log (refreshed_at, dispensary_count, product_count, source) VALUES (?, ?, ?, ?)",
                ("2026-03-02T00:00:00+00:00", 10, 50, "refresh"),
            )

        payload = api_module.get_status_payload(db)
        assert payload["lastWarning"] is None
        assert payload["lastSuccessfulRefresh"] == "2026-03-02T00:00:00+00:00"
    finally:
        db.close()



def test_finish_job_persists_result_payload(api_module):
    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        ctx = api_module.try_begin_job(db, "refresh")
        assert ctx is not None
        api_module.finish_job(db, ctx, result={"status": "ok", "dispensaryCount": 29, "productCount": 134})

        jobs = api_module.get_recent_job_runs(db, limit=5)
        assert jobs[0]["result"] == {"status": "ok", "dispensaryCount": 29, "productCount": 134}
    finally:
        db.close()


def test_backfill_known_store_metadata_sets_menu_url(api_module):
    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        with api_module.db_tx(db):
            db.execute(
                """
                INSERT INTO dispensaries (name, address, lat, lng, distance, drop_date, menu_url, menu_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                ("Green Pharm", "4335 N Academy Blvd #100, Colorado Springs, CO 80918", 38.8, -104.7, 3.5, "2026-03-01", None, None),
            )
        updated = api_module.backfill_known_store_metadata(db)
        assert updated == 1
        row = db.execute("SELECT menu_url FROM dispensaries WHERE name = ?", ("Green Pharm",)).fetchone()
        assert row["menu_url"] == "https://weedmaps.com/dispensaries/green-pharm-colorado-springs"
    finally:
        db.close()


def test_normalise_external_url_rejects_unsafe_schemes(api_module):
    assert api_module.normalise_external_url("javascript:alert(1)") is None
    assert api_module.normalise_external_url("data:text/html;base64,SGk=") is None
    assert api_module.normalise_external_url("/dispensary-drops/green-pharm/", base_url=api_module.SETTINGS.gdl_url).startswith("https://")



def test_backfill_known_store_metadata_sets_known_drop_urls(api_module):
    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        with api_module.db_tx(db):
            db.execute(
                "INSERT INTO dispensaries (name, address, menu_type) VALUES (?, ?, ?)",
                ("Green Pharm", "4335 N Academy Blvd #100, Colorado Springs, CO 80918", None),
            )

        updated = api_module.backfill_known_store_metadata(db)
        assert updated >= 1

        row = db.execute(
            "SELECT drop_url, menu_url, menu_type FROM dispensaries WHERE name = ?",
            ("Green Pharm",),
        ).fetchone()
        assert row["drop_url"] == api_module.KNOWN_DROP_URLS["Green Pharm"]
        assert row["menu_url"] == api_module.get_best_menu_url("Green Pharm")
        assert row["menu_type"] is None
    finally:
        db.close()



def test_refresh_result_looks_suspicious_allows_confident_smaller_local_snapshot(api_module):
    new_dispensaries = [
        {
            "name": f"Store {index}",
            "products": [{"strain": f"Strain {index}-{product_index}", "size": "3.5g", "type": "MED"} for product_index in range(3)],
        }
        for index in range(9)
    ]

    assert api_module.refresh_result_looks_suspicious(29, 134, new_dispensaries) is False



def test_security_headers_include_csp(app):
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        assert response.headers["content-security-policy"]
        assert "default-src 'self'" in response.headers["content-security-policy"]
        assert response.headers["cross-origin-opener-policy"] == "same-origin"
        assert response.headers["cross-origin-resource-policy"] == "same-origin"


def test_refresh_data_supplements_sparse_main_page_with_detail_pages(api_module, monkeypatch):
    main_html = """
    <html>
      <body>
        <div>Search Dispensaries</div>
        <a href="/remote-shop">Remote Shop</a>
        <div>03/05/26</div>
        <div>100 Main Street, Denver, CO 80210</div>
        <div>FLOWER ROLL 1G (REC): A5 Wagyu</div>
      </body>
    </html>
    """
    detail_url = "https://example.com/green-pharm"
    detail_html = """
    <html>
      <body>
        <h1>Green Pharm (MED)</h1>
        <div>4335 N Academy Blvd #100, Colorado Springs, CO 80918</div>
        <a href="https://greenpharmco.com/order-now">Order now!</a>
        <div>Dropped</div>
        <div>02/28/2026</div>
        <div>FLOWER 14G (MED): I-95</div>
        <div>FLOWER 3.5G (MED): Blu Froot</div>
      </body>
    </html>
    """

    class DummyResponse:
        def __init__(self, text):
            self.text = text

        def raise_for_status(self):
            return None

    class DummyAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, *args, **kwargs):
            if url == api_module.SETTINGS.gdl_url:
                return DummyResponse(main_html)
            if url == detail_url:
                return DummyResponse(detail_html)
            raise AssertionError(f"Unexpected URL fetched: {url}")

    monkeypatch.setattr(api_module.httpx, "AsyncClient", DummyAsyncClient)
    monkeypatch.setattr(api_module, "KNOWN_DROP_URLS", {"Green Pharm": detail_url})

    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        result = asyncio.run(api_module.refresh_data(db))
        assert result["status"] == "ok"
        assert result["detailPagesFetched"] == 1
        assert result["detailSupplements"] == 1

        dispensaries = db.execute("SELECT name, menu_url, drop_url FROM dispensaries").fetchall()
        assert len(dispensaries) == 1
        assert dispensaries[0]["name"] == "Green Pharm (MED)"
        assert dispensaries[0]["menu_url"] == "https://greenpharmco.com/order-now"
        assert dispensaries[0]["drop_url"] == detail_url

        products = db.execute("SELECT strain, size, type FROM products ORDER BY size, strain").fetchall()
        assert {(row["strain"], row["size"], row["type"]) for row in products} == {
            ("I-95", "14g", "MED"),
            ("Blu Froot", "3.5g", "MED"),
        }
    finally:
        db.close()



def test_fetch_all_menus_prefers_higher_priority_source(monkeypatch):
    import menu_scrapers

    async def fake_weedmaps(_client, _slug, _disp_name=""):
        return [{"strain": "I-95", "size": "3.5g", "price": 40.0, "type": "REC"}]

    async def fake_jane(_client, _store_id, _disp_name=""):
        return [{"strain": "I-95", "size": "3.5g", "price": 55.0, "type": "REC"}]

    monkeypatch.setattr(menu_scrapers, "DISPENSARY_SOURCES", {"Priority Shop": {"weedmaps": "wm", "jane": "jn"}})
    monkeypatch.setattr(menu_scrapers, "fetch_weedmaps", fake_weedmaps)
    monkeypatch.setattr(menu_scrapers, "fetch_jane", fake_jane)

    results, errors = asyncio.run(menu_scrapers.fetch_all_menus_with_meta())
    assert errors == []
    assert results == {
        "Priority Shop": [
            {"strain": "I-95", "size": "3.5g", "price": 40.0, "type": "REC"}
        ]
    }


def test_parse_gdl_page_supports_dropped_today_and_flower_rolls(api_module):
    html = f"""
    <html>
      <body>
        <div>Search Dispensaries</div>
        <a href="/dispensary-drops/zazas-dispensary/zazas-dispensary-colorado-springs-med/">ZaZa’s Dispensary – Colorado Springs (MED)</a>
        <div>DROPPED TODAY!</div>
        <div>4344 Montebello Dr, Colorado Springs, CO 80918</div>
        <div>FLOWER ROLL 1G (MED): Paloma</div>
        <div>BLACK LABEL FLOWER ROLL 3X 1G (MED): Bicycle Day</div>
        <div>READ MORE</div>
      </body>
    </html>
    """

    parsed = api_module.parse_gdl_page(html)
    assert len(parsed) == 1
    item = parsed[0]
    assert item["dropDate"] == api_module.current_mountain_date_iso()
    assert item["dropUrl"].endswith("/dispensary-drops/zazas-dispensary/zazas-dispensary-colorado-springs-med/")
    keys = {(product["strain"], product["size"], product["type"]) for product in item["products"]}
    assert ("Paloma", "1g", "MED") in keys
    assert ("Bicycle Day", "3g", "MED") in keys


def test_parse_gdl_detail_page_falls_back_to_previous_drop_when_current_has_no_flower(api_module):
    html = """
    <html>
      <body>
        <h1>The Dispensary – Colorado Springs (REC)</h1>
        <div>2205 Montebello Square Dr Colorado Springs, CO 80918</div>
        <div>Dropped</div>
        <div>03/05/2026</div>
        <div>LIVE RESIN CARTRIDGE 1G (REC): Final Boss</div>
        <div>Previous Drop</div>
        <div>01/17/2026</div>
        <div>FLOWER 3.5G (REC): Thunderdome, Paloma</div>
      </body>
    </html>
    """

    parsed = api_module.parse_gdl_detail_page(html, page_url="https://www.greendotlabs.com/dispensary-drops/the-dispensary/the-dispensary-colorado-springs-rec/")
    assert parsed is not None
    assert parsed["dropDate"] == "2026-01-17"
    assert {(item["strain"], item["size"], item["type"]) for item in parsed["products"]} == {
        ("Thunderdome", "3.5g", "REC"),
        ("Paloma", "3.5g", "REC"),
    }


def test_refresh_data_uses_local_detail_pages_when_top_level_page_has_no_flower(api_module, monkeypatch):
    main_html = """
    <html>
      <body>
        <div>Search Dispensaries</div>
        <a href="https://www.greendotlabs.com/dispensary-drops/the-dispensary/the-dispensary-colorado-springs-rec/">The Dispensary – Colorado Springs (REC)</a>
        <div>DROPPED TODAY!</div>
        <div>2205 Montebello Square Dr Colorado Springs, CO 80918</div>
        <div>LIVE RESIN CARTRIDGE 1G (REC): Final Boss</div>
        <div>READ MORE</div>
      </body>
    </html>
    """

    detail_html = """
    <html>
      <body>
        <h1>The Dispensary – Colorado Springs (REC)</h1>
        <div>2205 Montebello Square Dr Colorado Springs, CO 80918</div>
        <div>Dropped</div>
        <div>03/05/2026</div>
        <div>LIVE RESIN CARTRIDGE 1G (REC): Final Boss</div>
        <div>Previous Drop</div>
        <div>01/17/2026</div>
        <div>FLOWER 3.5G (REC): Thunderdome, Paloma</div>
      </body>
    </html>
    """

    class DummyResponse:
        def __init__(self, text):
            self.text = text

        def raise_for_status(self):
            return None

    class DummyAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, *args, **kwargs):
            if "find-our-products" in url:
                return DummyResponse(main_html)
            if "the-dispensary-colorado-springs-rec" in url:
                return DummyResponse(detail_html)
            return DummyResponse("<html></html>")

    monkeypatch.setattr(api_module.httpx, "AsyncClient", DummyAsyncClient)

    db = api_module.connect_db()
    try:
        api_module.init_db(db)
        result = asyncio.run(api_module.refresh_data(db))
        assert result["status"] == "ok"
        assert result["dispensaryCount"] == 1
        assert result["productCount"] == 2

        rows = db.execute(
            "SELECT d.name, p.strain, p.size, p.type FROM products p JOIN dispensaries d ON p.dispensary_id = d.id ORDER BY p.id"
        ).fetchall()
        assert [(row["name"], row["strain"], row["size"], row["type"]) for row in rows] == [
            ("The Dispensary – Colorado Springs (REC)", "Thunderdome", "3.5g", "REC"),
            ("The Dispensary – Colorado Springs (REC)", "Paloma", "3.5g", "REC"),
        ]
    finally:
        db.close()
