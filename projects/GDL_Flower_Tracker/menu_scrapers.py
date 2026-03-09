#!/usr/bin/env python3
"""menu_scrapers.py — Fetch Green Dot Labs flower prices from dispensary menu platforms.

Production notes:
- Uses a single shared httpx AsyncClient with conservative timeouts
- Concurrency is limited via an asyncio.Semaphore (env MENU_SCRAPE_CONCURRENCY)
- Simple retry/backoff for transient 5xx/429 failures

Each fetcher returns a list of dicts:
    [{"strain": str, "size": str, "price": float, "type": "REC"|"MED"}, ...]

Sizes are normalised to "3.5g", "7g", "14g", "28g".
"""

from __future__ import annotations

import asyncio
import logging
import os
import random
import re
from typing import Any

import httpx

log = logging.getLogger("menu_scrapers")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/json, text/html, */*",
    "Accept-Language": "en-US,en;q=0.9",
}

# Tunables
CONCURRENCY_LIMIT = max(1, int(os.getenv("MENU_SCRAPE_CONCURRENCY", "8")))
REQUEST_TIMEOUT = float(os.getenv("MENU_SCRAPE_TIMEOUT_SECONDS", "20"))
RETRIES = max(0, int(os.getenv("MENU_SCRAPE_RETRIES", "2")))


SIZE_MAP = {
    "1/8 oz": "3.5g",
    "1/8oz": "3.5g",
    "eighth": "3.5g",
    "1/4 oz": "7g",
    "1/4oz": "7g",
    "quarter": "7g",
    "1/2 oz": "14g",
    "1/2oz": "14g",
    "half": "14g",
    "1 oz": "28g",
    "1oz": "28g",
    "3.5g": "3.5g",
    "7g": "7g",
    "14g": "14g",
    "28g": "28g",
    "1g": "1g",
}


def normalise_size(raw: str) -> str:
    """Convert '1/8 oz', '3.5g', etc. to canonical sizes."""
    raw_lower = (raw or "").strip().lower()
    for pattern, canonical in SIZE_MAP.items():
        if pattern.lower() in raw_lower:
            return canonical

    # Try to extract grams directly
    m = re.search(r"([\d.]+)\s*g", raw_lower)
    if m:
        try:
            g = float(m.group(1))
        except ValueError:
            return raw.strip()

        if abs(g - 3.5) < 0.2:
            return "3.5g"
        if abs(g - 7) < 0.5:
            return "7g"
        if abs(g - 14) < 1:
            return "14g"
        if abs(g - 28) < 1.5:
            return "28g"
        return f"{g}g"

    return (raw or "").strip()


def classify_type(text: str, default: str = "REC") -> str:
    """Infer REC/MED from product text."""
    t = (text or "").upper()
    if "MED" in t or "MEDICAL" in t:
        return "MED"
    if "REC" in t or "RECREATIONAL" in t:
        return "REC"
    return default


async def _request_json(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    *,
    params: dict[str, Any] | None = None,
    json_body: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    retries: int = RETRIES,
) -> Any | None:
    """HTTP helper with small retry/backoff for transient failures."""

    # jittered exponential backoff: 0.4s, 0.8s, 1.6s …
    for attempt in range(retries + 1):
        try:
            resp = await client.request(method, url, params=params, json=json_body, headers=headers)

            # Retry common transient codes
            if resp.status_code in {429, 500, 502, 503, 504} and attempt < retries:
                delay = (0.4 * (2**attempt)) * (0.8 + random.random() * 0.4)
                await asyncio.sleep(delay)
                continue

            if resp.status_code != 200:
                log.warning("%s %s -> HTTP %s", method, url, resp.status_code)
                return None

            # Some endpoints sometimes return HTML even if JSON was requested.
            content_type = resp.headers.get("content-type", "")
            if "application/json" not in content_type.lower():
                try:
                    return resp.json()
                except Exception:
                    return None

            return resp.json()

        except (httpx.TimeoutException, httpx.RequestError, httpx.RemoteProtocolError) as e:
            if attempt >= retries:
                log.warning("%s %s failed: %s", method, url, e)
                return None
            delay = (0.4 * (2**attempt)) * (0.8 + random.random() * 0.4)
            await asyncio.sleep(delay)
        except Exception as e:
            log.warning("%s %s unexpected error: %s", method, url, e)
            return None

    return None


# ──────────────────────────────────────────────
#  DUTCHIE (GraphQL)
# ──────────────────────────────────────────────


async def fetch_dutchie(client: httpx.AsyncClient, slug: str) -> list[dict[str, Any]]:
    products: list[dict[str, Any]] = []

    url = "https://dutchie.com/graphql"
    menu_type = "MED" if "medical" in slug.lower() else "REC"

    query = {
        "operationName": "FilteredProducts",
        "variables": {
            "includeTerpenes": False,
            "productsFilter": {
                "dispensarySlug": slug,
                "ppiFilter": [],
                "search": "Green Dot",
                "category": "Flower",
                "isKioskMenu": False,
                "removeProductsBelowOptionThresholds": False,
            },
            "page": 0,
            "perPage": 50,
        },
        "query": """query FilteredProducts($productsFilter: filteredProductsInput!, $page: Int, $perPage: Int) {
            filteredProducts(productsFilter: $productsFilter, page: $page, perPage: $perPage) {
                products {
                    name
                    brand { name }
                    type
                    Prices
                    Options
                    recPrices
                    medPrices
                    recSpecialPrices
                    medSpecialPrices
                }
            }
        }""",
    }

    data = await _request_json(
        client,
        "POST",
        url,
        json_body=query,
        headers={**HEADERS, "Content-Type": "application/json"},
    )
    if not data:
        return products

    items = (data.get("data", {}).get("filteredProducts", {}) or {}).get("products", [])

    for item in items:
        brand = (item.get("brand") or {}).get("name", "")
        name = item.get("name", "")

        if "green dot" not in brand.lower() and "green dot" not in name.lower():
            continue

        # Skip pre-rolls
        if "roll" in name.lower() or str(item.get("type", "")).lower() in {"pre-roll", "preroll"}:
            continue

        prices = item.get("recPrices") if menu_type == "REC" else item.get("medPrices")
        if not prices:
            prices = item.get("Prices", [])

        options = item.get("Options", [])

        if isinstance(prices, list) and isinstance(options, list):
            for opt, price in zip(options, prices):
                if price and float(price) > 0:
                    products.append(
                        {
                            "strain": clean_strain_name(name),
                            "size": normalise_size(str(opt)),
                            "price": round(float(price), 2),
                            "type": menu_type,
                        }
                    )
        elif isinstance(prices, dict):
            for size_key, price in prices.items():
                if price and float(price) > 0:
                    products.append(
                        {
                            "strain": clean_strain_name(name),
                            "size": normalise_size(str(size_key)),
                            "price": round(float(price), 2),
                            "type": menu_type,
                        }
                    )

    return products


# ──────────────────────────────────────────────
#  WEEDMAPS
# ──────────────────────────────────────────────


async def fetch_weedmaps(client: httpx.AsyncClient, slug: str, disp_name: str = "") -> list[dict[str, Any]]:
    products: list[dict[str, Any]] = []

    url = f"https://api-g.weedmaps.com/discovery/v1/listings/dispensaries/{slug}/menu_items"
    params = {
        "filter[any_brand_name]": "Green Dot Labs",
        "filter[any_category_name]": "Flower",
        "page_size": 100,
        "page": 1,
    }

    data = await _request_json(client, "GET", url, params=params, headers=HEADERS)
    if not data:
        return products

    items = (data.get("data", {}) or {}).get("menu_items", [])

    for item in items:
        name = item.get("name", "")

        category_name = ""
        cat = item.get("category")
        if isinstance(cat, dict):
            category_name = cat.get("name", "")

        if not is_gdl_flower(name, category_name):
            continue

        license_type = item.get("license_type", "")
        menu_type = "MED" if "medical" in str(license_type).lower() else "REC"

        prices_obj = item.get("prices", {})
        if isinstance(prices_obj, dict):
            ounce_tiers = prices_obj.get("ounce", [])
            if isinstance(ounce_tiers, list) and ounce_tiers:
                for tier in ounce_tiers:
                    if isinstance(tier, dict) and tier.get("price"):
                        products.append(
                            {
                                "strain": clean_strain_name(name),
                                "size": normalise_size(tier.get("label", "3.5g")),
                                "price": round(float(tier["price"]), 2),
                                "type": menu_type,
                            }
                        )
            else:
                # Fallback to primary price object
                price_obj = item.get("price", {})
                if isinstance(price_obj, dict) and price_obj.get("price"):
                    products.append(
                        {
                            "strain": clean_strain_name(name),
                            "size": normalise_size(price_obj.get("label", "3.5g")),
                            "price": round(float(price_obj["price"]), 2),
                            "type": menu_type,
                        }
                    )
        else:
            price_obj = item.get("price", {})
            if isinstance(price_obj, dict) and price_obj.get("price"):
                products.append(
                    {
                        "strain": clean_strain_name(name),
                        "size": normalise_size(price_obj.get("label", "3.5g")),
                        "price": round(float(price_obj["price"]), 2),
                        "type": menu_type,
                    }
                )

    return products


# ──────────────────────────────────────────────
#  LEAFLY
# ──────────────────────────────────────────────


async def fetch_leafly(client: httpx.AsyncClient, slug: str, disp_name: str = "") -> list[dict[str, Any]]:
    products: list[dict[str, Any]] = []

    url = f"https://consumer-api.leafly.com/api/dispensary-view/v1/dispensaries/{slug}/menu"
    params = {
        "category": "flower",
        "brand": "green-dot-labs",
        "limit": 100,
    }

    data = await _request_json(
        client,
        "GET",
        url,
        params=params,
        headers={**HEADERS, "Accept": "application/json"},
    )
    if not data:
        return products

    items = data.get("products", data.get("menuItems", []))

    for item in items:
        name = item.get("name", "")
        brand = item.get("brand", "")

        if "green dot" not in name.lower() and "green dot" not in str(brand).lower():
            continue

        if "roll" in name.lower() and "flower" not in name.lower():
            continue

        variants = item.get("variants", item.get("prices", []))
        if isinstance(variants, list):
            for v in variants:
                price = v.get("price", v.get("value"))
                size = v.get("size", v.get("weight", v.get("label", "")))
                if price and float(price) > 0:
                    products.append(
                        {
                            "strain": clean_strain_name(name),
                            "size": normalise_size(str(size)),
                            "price": round(float(price), 2),
                            "type": classify_type(name),
                        }
                    )
        else:
            price = item.get("price")
            if price and float(price) > 0:
                products.append(
                    {
                        "strain": clean_strain_name(name),
                        "size": normalise_size(item.get("weight", "3.5g")),
                        "price": round(float(price), 2),
                        "type": classify_type(name),
                    }
                )

    return products


# ──────────────────────────────────────────────
#  iHEARTJANE
# ──────────────────────────────────────────────


async def fetch_jane(client: httpx.AsyncClient, store_id: str, disp_name: str = "") -> list[dict[str, Any]]:
    products: list[dict[str, Any]] = []

    url = f"https://api.iheartjane.com/v1/stores/{store_id}/products"
    params = {
        "brand": "Green Dot Labs",
        "kind": "flower",
        "per_page": 100,
    }

    data = await _request_json(client, "GET", url, params=params, headers=HEADERS)
    if not data:
        return products

    items = data.get("products", data.get("data", []))

    for item in items:
        name = item.get("name", "")
        if "roll" in name.lower() and "flower" not in name.lower():
            continue

        price = item.get("price", (item.get("store_specific_product") or {}).get("price"))
        weight = item.get("amount", item.get("weight", ""))

        if price and float(price) > 0:
            products.append(
                {
                    "strain": clean_strain_name(name),
                    "size": normalise_size(str(weight)),
                    "price": round(float(price), 2),
                    "type": classify_type(name),
                }
            )

    return products


# ──────────────────────────────────────────────
#  HELPERS
# ──────────────────────────────────────────────


def clean_strain_name(raw: str) -> str:
    """Extract a clean strain name from a product listing title."""
    name = raw or ""

    for prefix in ("Green Dot Labs", "Green Dot", "GDL Flower", "GDL", "BLR", "BLM", "GreenDot"):
        name = re.sub(rf"^{re.escape(prefix)}\s*[-|:]?\s*", "", name, flags=re.IGNORECASE)

    name = re.sub(
        r"(Selections|GDL Originals|Heirloom|Connoisseur Shelf|Black Label)\s*\|?\s*",
        "",
        name,
        flags=re.IGNORECASE,
    )

    name = re.sub(r"^\s*\(\d+\.?\d*g\)\s*", "", name)

    name = re.sub(r"\s*[-–]\s*(Flower|Rec|Med|Medical|Recreational).*$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s*\(.*\)\s*$", "", name)

    name = re.sub(r"\bFlower\b", "", name, flags=re.IGNORECASE)

    name = re.sub(r"\s*[|]\s*", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    name = name.strip(" -|")

    return name if name else (raw or "")


def is_gdl_flower(name: str, category: str = "") -> bool:
    """Check if a product is actually GDL flower (not concentrates, carts, prerolls)."""
    name_lower = (name or "").lower()
    cat_lower = (category or "").lower()

    has_gdl = any(kw in name_lower for kw in ("green dot", "gdl", "greendot"))
    if not has_gdl:
        return False

    exclude_keywords = (
        "rosin",
        "badder",
        "cart",
        "vape",
        "wax",
        "shatter",
        "concentrate",
        "live resin",
        "dab",
        "minirip",
        "pbg",
        "edible",
        "gummy",
        "tincture",
    )
    if any(kw in name_lower or kw in cat_lower for kw in exclude_keywords):
        return False

    if "roll" in name_lower or "pre-roll" in name_lower or "preroll" in name_lower:
        if "flower" not in name_lower:
            return False

    return True


def _dedupe_products(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str, str, float]] = set()
    out: list[dict[str, Any]] = []
    for p in items:
        try:
            key = (
                str(p.get("strain", "")),
                str(p.get("size", "")),
                str(p.get("type", "")),
                float(p.get("price")) if p.get("price") is not None else -1.0,
            )
        except Exception:
            continue
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
    return out


def _product_merge_key(product: dict[str, Any]) -> tuple[str, str, str]:
    strain = re.sub(r"[^a-z0-9]+", "", str(product.get("strain") or "").lower())
    size = str(product.get("size") or "").strip().lower()
    product_type = str(product.get("type") or "").strip().upper()
    return (strain, size, product_type)


def _source_priority(source: str) -> int:
    base = str(source or "").split(":", 1)[0].lower()
    priority = {
        "weedmaps": 0,
        "dutchie": 1,
        "leafly": 2,
        "jane": 3,
    }
    return priority.get(base, 99)


# ──────────────────────────────────────────────
#  DISPENSARY → PLATFORM MAPPING
# ──────────────────────────────────────────────

# Priority: Weedmaps > Dutchie > Leafly > Jane (we still try all for coverage)
DISPENSARY_SOURCES: dict[str, dict[str, Any]] = {
    "Elevations": {"dutchie": ["elevations-rec", "elevations-medical"]},
    "Kush Club": {"weedmaps": "kush-club-colorado-springs", "jane": "5005"},
    "Green Pharm": {"weedmaps": "green-pharm-colorado-springs"},
    "The Dispensary": {"dutchie": ["the-dispensary-colorado-springs"]},
    "ZaZa's Dispensary": {"weedmaps": "zazas-dispensary"},
    "The Epic Remedy (N Academy)": {"leafly": "the-epic-remedy-north"},
    "Grow Life": {"weedmaps": "grow-life-colorado-springs"},
    "Floraco": {"weedmaps": "floraco-colorado-springs"},
    "EMJ's Dispensary": {"weedmaps": "emjs-dispensary"},
    "Ripple Cannabis Co": {"weedmaps": "ripple-cannabis-co"},
    "Kika Kush": {"weedmaps": "kika-kush"},
    "Herbal Healing": {"weedmaps": "herbal-healing-dispensary"},
    "C.R.E.A.M. Dispensary": {"weedmaps": "cream-dispensary"},
    "The Epic Remedy (Platte)": {"leafly": "the-epic-remedy-platte"},
    "Green Farms Dispensary": {"weedmaps": "green-farms-dispensary"},
    "Golden Meds": {"weedmaps": "golden-meds-colorado-springs"},
    "The Healing Canna": {"weedmaps": "the-healing-canna"},
    "Star Buds": {"dutchie": ["star-buds-colorado-springs"]},
    "Cannabicare": {"weedmaps": "cannabicare-colorado-springs"},
    "The Cannabis Depot": {"weedmaps": "the-cannabis-depot-colorado-springs", "leafly": "the-cannabis-depot-2"},
    "The 64 Store": {"weedmaps": "the-64-store-1"},
    "The Epic Remedy (West)": {"leafly": "the-epic-remedy-west"},
    "Flavors Dispensary": {"weedmaps": "flavors-dispensary-colorado-springs"},
    "Buku Loud": {"weedmaps": "buku-loud"},
    "Grant Pharms": {"weedmaps": "grant-pharms"},
    "Maggie's Farm (Manitou)": {"leafly": "maggies-farm-manitou"},
    "Emerald Fields (Manitou)": {"leafly": "emerald-fields-manitou", "jane": "4205"},
    "Dead Flowers": {"weedmaps": "dead-flowers-dispensary"},
    "Alpine Essentials": {},
}



def build_source_menu_urls(sources: dict[str, Any] | None) -> list[str]:
    """Return likely customer-facing menu/profile URLs for known platform sources.

    These URLs are used only as convenient outbound links in the tracker UI.
    We keep them conservative and only generate patterns we can derive directly
    from the configured store slugs.
    """

    if not sources:
        return []

    urls: list[str] = []

    weedmaps_slug = sources.get("weedmaps")
    if weedmaps_slug:
        urls.append(f"https://weedmaps.com/dispensaries/{weedmaps_slug}")

    for dutchie_slug in sources.get("dutchie", []) or []:
        if dutchie_slug:
            urls.append(f"https://dutchie.com/dispensary/{dutchie_slug}")

    leafly_slug = sources.get("leafly")
    if leafly_slug:
        urls.append(f"https://www.leafly.com/dispensary-info/{leafly_slug}")

    return urls


def get_best_menu_url(dispensary_name: str) -> str | None:
    sources = DISPENSARY_SOURCES.get(dispensary_name) or {}
    urls = build_source_menu_urls(sources)
    return urls[0] if urls else None




async def fetch_all_menus_with_meta() -> tuple[dict[str, list[dict[str, Any]]], list[str]]:
    """Fetch GDL flower prices from all known dispensaries.

    Returns: ({dispensary_name: [product_dicts]}, [errors])

    When multiple menu platforms return the same strain/size/type with different
    prices for one store, we preserve the highest-priority source instead of
    letting a later, lower-priority platform overwrite it.
    """

    errors: list[str] = []
    per_store_products: dict[str, dict[tuple[str, str, str], tuple[int, dict[str, Any]]]] = {}

    timeout = httpx.Timeout(REQUEST_TIMEOUT)
    limits = httpx.Limits(max_connections=20, max_keepalive_connections=10)

    sema = asyncio.Semaphore(CONCURRENCY_LIMIT)

    async def run_limited(coro):
        async with sema:
            return await coro

    async with httpx.AsyncClient(timeout=timeout, limits=limits, follow_redirects=True) as client:
        tasks: list[tuple[str, str, asyncio.Task]] = []

        for disp_name, sources in DISPENSARY_SOURCES.items():
            if not sources:
                continue

            if "weedmaps" in sources:
                slug = sources["weedmaps"]
                tasks.append((disp_name, "weedmaps", asyncio.create_task(run_limited(fetch_weedmaps(client, slug, disp_name)))))

            if "dutchie" in sources:
                for slug in sources["dutchie"]:
                    tasks.append((disp_name, f"dutchie:{slug}", asyncio.create_task(run_limited(fetch_dutchie(client, slug)))))

            if "leafly" in sources:
                slug = sources["leafly"]
                tasks.append((disp_name, "leafly", asyncio.create_task(run_limited(fetch_leafly(client, slug, disp_name)))))

            if "jane" in sources:
                store_id = sources["jane"]
                tasks.append((disp_name, "jane", asyncio.create_task(run_limited(fetch_jane(client, store_id, disp_name)))))

        for disp_name, source, task in tasks:
            try:
                result = await task
            except Exception as e:
                errors.append(f"{disp_name} ({source}): {e}")
                continue

            if not result:
                continue

            source_priority = _source_priority(source)
            deduped = _dedupe_products(result)
            store_bucket = per_store_products.setdefault(disp_name, {})

            for product in deduped:
                try:
                    if product.get("price") is not None:
                        product = {**product, "price": round(float(product["price"]), 2)}
                except Exception:
                    continue

                key = _product_merge_key(product)
                if not key[0] or not key[1] or not key[2]:
                    continue

                current = store_bucket.get(key)
                if current is None:
                    store_bucket[key] = (source_priority, product)
                    continue

                current_priority, current_product = current
                replace = False
                if source_priority < current_priority:
                    replace = True
                elif source_priority == current_priority:
                    current_price = current_product.get("price")
                    next_price = product.get("price")
                    if current_price is None and next_price is not None:
                        replace = True
                    elif current_price is not None and next_price is not None:
                        try:
                            if float(next_price) < float(current_price):
                                replace = True
                        except Exception:
                            replace = False

                if replace:
                    store_bucket[key] = (source_priority, product)

            log.info("%s: %s products from %s", disp_name, len(deduped), source)

    if errors:
        log.warning("Fetch errors: %s", errors)

    results: dict[str, list[dict[str, Any]]] = {}
    for name, items in per_store_products.items():
        ordered = sorted(
            items.values(),
            key=lambda entry: (
                entry[0],
                str(entry[1].get("type") or ""),
                str(entry[1].get("size") or ""),
                str(entry[1].get("strain") or ""),
            ),
        )
        results[name] = [product for _priority, product in ordered]

    return results, errors


async def fetch_all_menus() -> dict[str, list[dict[str, Any]]]:
    results, _errors = await fetch_all_menus_with_meta()
    return results


# Quick test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    async def main():
        results = await fetch_all_menus()
        total = 0
        for name, prods in sorted(results.items()):
            print(f"\n{name} ({len(prods)} products):")
            for p in prods:
                print(f"  {p['strain']} | {p['size']} | ${p['price']} | {p['type']}")
                total += 1
        print(f"\n=== Total: {total} products from {len(results)} dispensaries ===")

    asyncio.run(main())
