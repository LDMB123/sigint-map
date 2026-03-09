#!/usr/bin/env python3
"""api_server.py — GDL Flower Tracker (production-hardened).

This build focuses on production readiness:
- No import-time DB side effects (startup work moved into lifespan)
- Safer job locking (DB-backed locks + run tracking; works across processes)
- SQLite hardening (foreign_keys, WAL, busy_timeout)
- Faster data reads (single joined query instead of N+1 queries)
- Lightweight in-memory TTL caching for hot endpoints
- Optional, lock-safe periodic scheduler (can be enabled/disabled via env)
- Security + compression middleware
- Docker/Gunicorn-friendly entrypoint

The app still supports the original endpoints for backwards compatibility.
"""

from __future__ import annotations

import asyncio
import json
import logging
import math
import os
import re
import secrets
import socket
import sqlite3
import time
from contextlib import asynccontextmanager, contextmanager
from dataclasses import dataclass
from urllib.parse import urljoin, urlparse
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from pathlib import Path
from typing import Any, Awaitable, Callable

import httpx
import sentry_sdk
from bs4 import BeautifulSoup
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, Response
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from menu_scrapers import fetch_all_menus, fetch_all_menus_with_meta, get_best_menu_url
from server.config import Settings, load_settings
from server.static_assets import frontend_file as serve_frontend_file
from server.status_helpers import source_kind

# ──────────────────────────────────────────────────────────────────────────────
# Settings
# ──────────────────────────────────────────────────────────────────────────────

SETTINGS = load_settings(Path(__file__).parent)


# ──────────────────────────────────────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, SETTINGS.log_level, logging.INFO),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
log = logging.getLogger("gdl-tracker")

if SETTINGS.sentry_dsn:
    sentry_sdk.init(
        dsn=SETTINGS.sentry_dsn,
        environment=SETTINGS.sentry_environment,
        release=SETTINGS.release_sha,
        send_default_pii=False,
        traces_sample_rate=0.0,
        integrations=[
            FastApiIntegration(),
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
        ],
    )


UPDATE_LOCK_NAME = "__update_pipeline__"
STALE_RUN_MESSAGE = "Recovered abandoned job from stale or foreign lock state."


# ──────────────────────────────────────────────────────────────────────────────
# Constants / business rules
# ──────────────────────────────────────────────────────────────────────────────

APP_DIR = Path(__file__).parent
BUILT_FRONTEND_DIR = APP_DIR / "frontend" / "out"
LEGACY_FRONTEND_DIR = APP_DIR

# Center of search: 80920 area
CENTER_LAT = 38.9283
CENTER_LNG = -104.7949
MAX_DISTANCE_MI = 30

# Exact zip coverage around the Colorado Springs area. We intentionally avoid
# broad 801/808/810 prefixes because those include many far-away Colorado
# locations that should not appear in a local tracker view.
LOCAL_ZIP_PREFIXES = ("809",)
LOCAL_ZIP_DISTANCES = {
    "80132": 8.0,   # Monument
    "80133": 13.0,  # Palmer Lake
    "80817": 18.0,  # Fountain
    "80829": 12.0,  # Manitou Springs
    "80863": 22.0,  # Woodland Park
    "80809": 18.0,  # Cascade / Cascade-Chipita Park
    "80819": 20.0,  # Green Mountain Falls
}
ALLOWED_CITIES = (
    "colorado springs",
    "manitou springs",
    "monument",
    "palmer lake",
    "fountain",
    "woodland park",
    "security",
    "widefield",
    "cimarron hills",
    "cascade",
    "green mountain falls",
)

CITY_DISTANCE_ESTIMATES = {
    "monument": 8.0,
    "palmer lake": 13.0,
    "colorado springs": 10.0,
    "manitou springs": 12.0,
    "fountain": 18.0,
    "woodland park": 22.0,
    "security": 15.0,
    "widefield": 16.0,
    "cimarron hills": 11.0,
    "cascade": 18.0,
    "green mountain falls": 20.0,
}

REFRESH_SHRINK_DISPENSARY_RATIO = 0.6
REFRESH_SHRINK_PRODUCT_RATIO = 0.55
REFRESH_SHRINK_MIN_DISPENSARY_DROP = 4
REFRESH_SHRINK_MIN_PRODUCT_DROP = 10
# Allow refreshes to legitimately shrink to a smaller current local snapshot
# without treating them as parser failures, as long as the result still has
# enough meaningful Colorado Springs coverage.
REFRESH_MIN_CONFIDENT_LOCAL_DISPENSARIES = 8
REFRESH_MIN_CONFIDENT_LOCAL_PRODUCTS = 18

# Known dispensary geocoordinates for the local Colorado Springs tracker.
# These entries intentionally use specific address fragments instead of broad
# city names so we do not accidentally pin unrelated chain locations onto the
# wrong local store.
KNOWN_COORDS = {
    "Elevations": {"lat": 38.9278, "lng": -104.7591, "addr": "8270 Razorback"},
    "Kush Club": {"lat": 38.8870, "lng": -104.8050, "addr": "890 Dublin"},
    "Green Pharm": {"lat": 38.8825, "lng": -104.7920, "addr": "4335 N Academy"},
    "The Dispensary (Montebello)": {"lat": 38.8800, "lng": -104.8200, "addr": "2205 Montebello"},
    "ZaZa's Dispensary": {"lat": 38.8805, "lng": -104.8210, "addr": "4344 Montebello"},
    "The Epic Remedy (N Academy)": {"lat": 38.8760, "lng": -104.7600, "addr": "3995 N Academy"},
    "Grow Life": {"lat": 38.8835, "lng": -104.8180, "addr": "115 E Garden of the Gods"},
    "Floraco": {"lat": 38.8680, "lng": -104.8260, "addr": "2909 N El Paso"},
    "EMJ's Dispensary": {"lat": 38.8620, "lng": -104.8300, "addr": "2918 Wood"},
    "Ripple Cannabis Co": {"lat": 38.8540, "lng": -104.7800, "addr": "3615 Platte"},
    "Kika Kush": {"lat": 38.8480, "lng": -104.8000, "addr": "555 N Circle"},
    "Herbal Healing": {"lat": 38.8515, "lng": -104.8110, "addr": "408 E Fillmore"},
    "C.R.E.A.M. Dispensary": {"lat": 38.8510, "lng": -104.8350, "addr": "1000 W Fillmore"},
    "The Epic Remedy (Platte)": {"lat": 38.8530, "lng": -104.7600, "addr": "4335 E Platte"},
    "Green Farms Dispensary": {"lat": 38.8450, "lng": -104.7800, "addr": "3629 Galley"},
    "Golden Meds": {"lat": 38.8333, "lng": -104.8210, "addr": "329 E Pikes Peak"},
    "The Healing Canna": {"lat": 38.8400, "lng": -104.7800, "addr": "3692 E Bijou"},
    "Star Buds": {"lat": 38.8327, "lng": -104.8183, "addr": "510 E Pikes Peak"},
    "Cannabicare": {"lat": 38.8370, "lng": -104.7570, "addr": "1466 Woolsey Heights"},
    "The Cannabis Depot": {"lat": 38.8270, "lng": -104.8250, "addr": "1004 S Tejon"},
    "The 64 Store": {"lat": 38.8390, "lng": -104.8350, "addr": "502 W Colorado"},
    "The Epic Remedy (West)": {"lat": 38.8400, "lng": -104.8530, "addr": "1602 W Colorado"},
    "Flavors Dispensary": {"lat": 38.8540, "lng": -104.8670, "addr": "2755 Ore Mill"},
    "Buku Loud": {"lat": 38.8050, "lng": -104.7580, "addr": "3079 S Academy"},
    "Grant Pharms": {"lat": 38.7940, "lng": -104.8100, "addr": "1591 E Cheyenne Mountain"},
    "Maggie's Farm (Manitou)": {"lat": 38.8585, "lng": -104.9165, "addr": "141 Manitou"},
    "Emerald Fields (Manitou)": {"lat": 38.8590, "lng": -104.9170, "addr": "27 Manitou"},
    "Dead Flowers": {"lat": 39.0950, "lng": -104.8500, "addr": "855 CO-105"},
    "Alpine Essentials": {"lat": 39.1020, "lng": -104.8560, "addr": "850 Commercial"},
}

# Known GDL dispensary detail pages. These are used as a safe packaged-data
# backfill when a local store has no drop URL yet. Refreshes still take
# precedence when the live site provides a newer/specific drop page.
KNOWN_DROP_URLS: dict[str, str] = {
    "Green Pharm": "https://www.greendotlabs.com/dispensary-drops/green-pharm/",
    "Kush Club": "https://www.greendotlabs.com/dispensary-drops/kush-club-1/",
    "The Dispensary (Montebello)": "https://www.greendotlabs.com/dispensary-drops/the-dispensary/",
    "Ripple Cannabis Co": "https://www.greendotlabs.com/dispensary-drops/ripple-cannabis-colorado-springs-med/",
    "Cannabicare": "https://www.greendotlabs.com/dispensary-drops/cannabicare/",
    "Star Buds": "https://www.greendotlabs.com/dispensary-drops/starbuds/star-buds-colorado-springs-rec/",
    "Buku Loud": "https://www.greendotlabs.com/dispensary-drops/buku-loud/buku-loud-med/",
    "Herbal Healing": "https://www.greendotlabs.com/dispensary-drops/herbal-healing-2/herbal-healing/",
    "The Cannabis Depot": "https://www.greendotlabs.com/dispensary-drops/the-cannabis-depot/the-cannabis-depot-colorado-springs-rec/",
}

CONTENT_SECURITY_POLICY = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline'; "
    "style-src 'self' 'unsafe-inline'; "
    "font-src 'self' data:; "
    "img-src 'self' data: https: blob:; "
    "connect-src 'self'; "
    "worker-src 'self'; "
    "manifest-src 'self'; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'none'"
)
ADMIN_ACTIONS_DISABLED_MESSAGE = "Admin actions are disabled in this production deployment."

# Known dispensary pricing (hardcoded from menu research)
# REC = Recreational price (pre-tax shelf price); MED = Medical price
# When both REC and MED are available, split into separate entries with type_filter
KNOWN_PRICING: dict[str, dict[str, Any]] = {
    # --- Already verified ---
    "Green Pharm": {
        "address_match": "4335 N Academy",
        "prices": {"3.5g": 40, "7g": 40, "14g": 40},
        "type_filter": "MED",
        "note": "MED all sizes same, tax incl.",
    },
    "The Dispensary": {
        "address_match": "2205 Montebello",
        "prices": {"3.5g": 50},
        "type_filter": "REC",
        "note": "REC",
    },
    "Alpine Essentials": {
        "address_match": "850 Commercial Ln",
        "prices": {"3.5g": 63, "7g": 115},
        "type_filter": "REC",
        "note": "REC only",
    },
    # --- Emerald Fields Manitou Springs (REC only, $55/eighth) ---
    "Emerald Fields": {
        "address_match": "Manitou",
        "prices": {"3.5g": 55},
        "type_filter": "REC",
        "note": "REC $55/eighth — D-Lish, Jet Pack, Krunk Berries, Lemon Grinder, Pink Froot, Rainbow Belts V2, Screaming OG, Sour Power OG",
    },
    # --- Star Buds (REC $55/eighth) ---
    "Star Buds": {
        "address_match": "",
        "prices": {"3.5g": 55},
        "type_filter": "REC",
        "note": "REC $55/eighth — G, Screaming OG (Connoisseur Shelf)",
        "exact_match": True,
    },
    # --- Buku Loud (MED $32.95/eighth) ---
    "Buku Loud": {
        "address_match": "",
        "prices": {"3.5g": 32.95},
        "type_filter": "MED",
        "note": "MED $32.95/eighth",
    },
    # --- Elevations (MED, high-end pricing) ---
    "Elevations": {
        "address_match": "",
        "prices": {"3.5g": 99.75},
        "type_filter": "MED",
        "note": "MED $99.75 listed as 1g on Dutchie — likely mislabeled; may be specialty pack",
    },
    # --- Epic Remedy N Academy (MED $45/eighth) ---
    "Epic Remedy N Academy": {
        "address_match": "Academy",
        "prices": {"3.5g": 45},
        "type_filter": "MED",
        "note": "MED $45/eighth — N Academy location, Medical only",
    },
    # --- Epic Remedy Platte (REC $62.50, MED $45/eighth) ---
    "Epic Remedy Platte REC": {
        "address_match": "Platte",
        "prices": {"3.5g": 62.50},
        "type_filter": "REC",
        "note": "REC $62.50/eighth — Platte location",
    },
    "Epic Remedy Platte MED": {
        "address_match": "Platte",
        "prices": {"3.5g": 45},
        "type_filter": "MED",
        "note": "MED $45/eighth — Platte location",
    },
    # --- Epic Remedy West (REC $62.50, MED $45/eighth) ---
    "Epic Remedy West REC": {
        "address_match": "West",
        "prices": {"3.5g": 62.50},
        "type_filter": "REC",
        "note": "REC $62.50/eighth — West location",
    },
    "Epic Remedy West MED": {
        "address_match": "West",
        "prices": {"3.5g": 45},
        "type_filter": "MED",
        "note": "MED $45/eighth — West location",
    },
    # --- Kush Club (REC $50/eighth $95/quarter, MED $37/eighth $70/quarter) ---
    "Kush Club REC": {
        "address_match": "",
        "prices": {"3.5g": 50, "7g": 95},
        "type_filter": "REC",
        "note": "REC $50/eighth, $95/quarter",
    },
    "Kush Club MED": {
        "address_match": "",
        "prices": {"3.5g": 37, "7g": 70},
        "type_filter": "MED",
        "note": "MED $37/eighth, $70/quarter",
    },
    # --- EMJ's (MED $40/eighth $70/quarter — huge selection) ---
    "EMJ's": {
        "address_match": "",
        "prices": {"3.5g": 40, "7g": 70},
        "type_filter": "MED",
        "note": "MED $40/eighth $70/quarter — Pink Froot, Fuchsia, Rainbow Belts, Sweet Spot, Red Rose, Bourbon Street, Downshift, I-95, Lemon Grinder, Kashmir",
    },
    # --- The 64 Store (REC $63/eighth, MED $37.50/eighth) ---
    "The 64 Store REC": {
        "address_match": "",
        "prices": {"3.5g": 63},
        "type_filter": "REC",
        "note": "REC $63/eighth — Picasso, Blu Froot, Final Boss, Fuchsia, N2O Diesel, Rainbow Belts V2, Sweet Spot, Red Froot",
    },
    "The 64 Store MED": {
        "address_match": "",
        "prices": {"3.5g": 37.50},
        "type_filter": "MED",
        "note": "MED $37.50/eighth — Fortissimo, Cherry Lime Soda, Screaming OG, Fuchsia, N2O Diesel, Sweet Spot",
    },
    # --- Herbal Healing (REC $48-55/eighth, MED $35/eighth) ---
    "Herbal Healing REC": {
        "address_match": "",
        "prices": {"3.5g": 48},
        "type_filter": "REC",
        "note": "REC ~$48/eighth (Originals), ~$55 (Selections)",
    },
    "Herbal Healing MED": {
        "address_match": "",
        "prices": {"3.5g": 35},
        "type_filter": "MED",
        "note": "MED $35/eighth — Fuchsia, Sour Power OG",
    },
    # --- Cannabicare (MED only, $37.50/eighth $75/quarter $150/half) ---
    "Cannabicare": {
        "address_match": "",
        "prices": {"3.5g": 37.50, "7g": 75, "14g": 150},
        "type_filter": "MED",
        "note": "MED only — $37.50/eighth, $75/quarter, $150/half.",
    },
    # --- Cannabis Depot (REC $50/eighth $100/quarter) ---
    "Cannabis Depot": {
        "address_match": "Tejon",
        "prices": {"3.5g": 50, "7g": 100},
        "type_filter": "REC",
        "note": "REC $50/eighth, $100/quarter",
    },
    # --- Kika Kush (mixed pricing REC ~$49, MED $37.50) ---
    "Kika Kush REC": {
        "address_match": "",
        "prices": {"3.5g": 49},
        "type_filter": "REC",
        "note": "REC ~$49/eighth",
    },
    "Kika Kush MED": {
        "address_match": "",
        "prices": {"3.5g": 37.50, "7g": 75},
        "type_filter": "MED",
        "note": "MED $37.50/eighth, $75/quarter",
    },
}


# ──────────────────────────────────────────────────────────────────────────────
# Small utilities
# ──────────────────────────────────────────────────────────────────────────────


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    # second precision keeps strings shorter and consistent
    return utc_now().replace(microsecond=0).isoformat()


def parse_iso(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value)
    except Exception:
        # If the DB contains a slightly different format, fail safely.
        return utc_now()


def haversine_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in miles between two lat/lng points."""
    R = 3959
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))
    return round(R * c, 1)


def lookup_coords_by_address(address: str | None) -> dict[str, Any] | None:
    """Look up coordinates by address fragment without trusting the store name.

    This avoids chain-name false positives such as mapping a non-local
    "Star Buds – Niwot" listing onto the Colorado Springs Star Buds location.
    """

    addr_key = _normalise_address_text(address)
    if not addr_key:
        return None

    for _, data in KNOWN_COORDS.items():
        if not _looks_specific_address_fragment(data.get("addr")):
            continue
        known_addr = _normalise_address_text(data.get("addr"))
        if known_addr and known_addr in addr_key:
            return data

    return None


def estimate_distance_from_address(address: str | None) -> float | None:
    """Estimate distance from the tracker center based on address text.

    Returns None when we cannot confidently classify the address as local.
    """
    if not address:
        return None

    coords = lookup_coords_by_address(address)
    if coords:
        return haversine_miles(CENTER_LAT, CENTER_LNG, coords["lat"], coords["lng"])

    addr_lower = address.lower()
    for city, dist in CITY_DISTANCE_ESTIMATES.items():
        if city in addr_lower:
            return dist

    zip_match = re.search(r"\b(\d{5})\b", address)
    if zip_match:
        zipcode = zip_match.group(1)
        if zipcode in LOCAL_ZIP_DISTANCES:
            return LOCAL_ZIP_DISTANCES[zipcode]
        if any(zipcode.startswith(prefix) for prefix in LOCAL_ZIP_PREFIXES):
            return 10.0

    return None


def is_in_area(address: str | None) -> bool:
    """Check if an address is within the intended tracker footprint."""
    distance = estimate_distance_from_address(address)
    return distance is not None and distance <= MAX_DISTANCE_MI


def _squash_whitespace(value: str | None) -> str:
    return " ".join(str(value or "").replace("\xa0", " ").split())


def _normalise_address_text(value: str | None) -> str:
    text = _squash_whitespace(value).lower()
    if not text:
        return ""
    text = text.replace("&", " and ")
    text = re.sub(r"\b(?:suite|ste\.?|unit|bldg\.?|building|floor|fl|room|rm\.?|apt\.?|apartment)\b", " ", text)
    text = text.replace("#", " ")
    text = re.sub(r"[^a-z0-9]+", "", text)
    return text


def _looks_specific_address_fragment(value: str | None) -> bool:
    """Return True only for specific address hints we can trust.

    Broad fragments like just a city name are too risky because they can pin an
    unrelated chain location onto the wrong local storefront.
    """

    text = _squash_whitespace(value)
    if not text:
        return False

    if re.search(r"\b\d+[a-zA-Z]?\b", text):
        return True

    has_street_token = bool(
        re.search(
            r"\b(?:st\.?|street|ave\.?|avenue|rd\.?|road|blvd\.?|boulevard|dr\.?|drive|ln\.?|lane|ct\.?|court|pl\.?|place|way|hwy|highway)\b",
            text,
            re.IGNORECASE,
        )
    )
    return has_street_token and len(_normalise_address_text(text)) >= 8


def _simplify_store_text(value: str | None) -> str:
    text = _squash_whitespace(value).lower()
    if not text:
        return ""

    text = text.replace("&", " and ")
    text = re.sub(r"\b(?:rec|med|medical|recreational)\b", " ", text, flags=re.IGNORECASE)

    # Keep a fallback that preserves words like "dispensary" for stores whose
    # whole brand effectively is "The Dispensary".
    raw = re.sub(r"[^a-z0-9]+", "", text)
    raw = re.sub(r"^the", "", raw)

    simplified = re.sub(r"\bdispensary\b", " ", text, flags=re.IGNORECASE)
    simplified = re.sub(r"[^a-z0-9]+", "", simplified)
    simplified = re.sub(r"^the", "", simplified)

    return simplified or raw


def candidate_store_keys(value: str | None) -> set[str]:
    raw = _squash_whitespace(value)
    if not raw:
        return set()

    variants = {raw}
    no_paren = re.sub(r"\([^)]*\)", " ", raw)
    variants.add(no_paren)
    no_suffix = re.sub(r"\s+[–—-]\s+.*$", " ", no_paren)
    variants.add(no_suffix)

    return {candidate for candidate in (_simplify_store_text(item) for item in variants) if candidate}


def score_store_match(left: str | None, right: str | None) -> int:
    left_candidates = candidate_store_keys(left)
    right_candidates = candidate_store_keys(right)
    if not left_candidates or not right_candidates:
        return 0

    exact = left_candidates & right_candidates
    if exact:
        return 300 + max(len(item) for item in exact)

    best = 0
    for left_key in left_candidates:
        for right_key in right_candidates:
            if left_key in right_key or right_key in left_key:
                best = max(best, 150 + min(len(left_key), len(right_key)))
    return best


def stores_match(left: str | None, right: str | None) -> bool:
    return score_store_match(left, right) > 0


def normalise_external_url(value: str | None, *, base_url: str | None = None) -> str | None:
    raw = str(value or "").strip()
    if not raw:
        return None

    resolved = urljoin(base_url or SETTINGS.gdl_url, raw) if base_url or raw.startswith("/") else raw
    parsed = urlparse(resolved)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return resolved


def lookup_coords(name: str, address: str = "") -> dict[str, Any] | None:
    """Look up coordinates from our known dispensary list."""
    if address:
        address_match = lookup_coords_by_address(address)
        if address_match is not None:
            return address_match

    best_match: dict[str, Any] | None = None
    best_score = 0
    for known_name, data in KNOWN_COORDS.items():
        score = score_store_match(known_name, name)
        if score > best_score:
            best_score = score
            best_match = data

    if best_match is not None:
        return best_match

    return None


def normalise_strain_key(value: str) -> str:
    """Normalise strain names so live menu data matches DB rows more reliably."""
    if not value:
        return ""

    value = str(value).strip()
    value = re.sub(
        r"^(?:green\s*dot(?:\s*labs)?|greendot(?:labs)?|gdl)\s*[-|:]?\s*",
        "",
        value,
        flags=re.IGNORECASE,
    )
    value = re.sub(
        r"\b(?:selections|gdl originals|heirloom|connoisseur shelf|black label|flower)\b",
        " ",
        value,
        flags=re.IGNORECASE,
    )
    value = re.sub(r"\s*[|]\s*", " ", value)
    value = re.sub(r"\s*\(.*?\)\s*$", "", value)
    value = value.lower().strip()
    value = re.sub(r"^the\s+", "", value)
    value = value.replace("&", "and")
    value = re.sub(r"[^a-z0-9]+", "", value)
    return value


def listing_key(strain: str | None, size: str | None, product_type: str | None) -> tuple[str, str, str]:
    return (
        normalise_strain_key(strain or ""),
        str(size or "").strip().lower(),
        str(product_type or "").strip().upper(),
    )


def parse_thc_percent(value: Any) -> float | None:
    """Extract a numeric THC value from strings like '22.28%' or raw numbers."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return round(float(value), 2)

    match = re.search(r"([\d.]+)", str(value))
    if not match:
        return None

    try:
        return round(float(match.group(1)), 2)
    except ValueError:
        return None


def infer_menu_type(name: str | None = None, products: list[dict[str, Any]] | None = None, existing: str | None = None) -> str | None:
    product_types = {
        str(item.get("type") or "").strip().upper()
        for item in (products or [])
        if str(item.get("type") or "").strip()
    }
    product_types.discard("")

    if product_types == {"REC"}:
        return "REC"
    if product_types == {"MED"}:
        return "MED"
    if product_types >= {"REC", "MED"}:
        return "both"

    title = str(name or "")
    if re.search(r"\(\s*MED\s*\)", title, re.IGNORECASE):
        return "MED"
    if re.search(r"\(\s*REC\s*\)", title, re.IGNORECASE):
        return "REC"

    return existing or None


def resolve_menu_url(
    existing_store: dict[str, Any] | None,
    dispensary_name: str | None,
    candidate_url: str | None = None,
) -> str | None:
    if existing_store and existing_store.get("menuUrl"):
        return normalise_external_url(str(existing_store["menuUrl"]))
    if candidate_url:
        normalised_candidate = normalise_external_url(candidate_url)
        if normalised_candidate:
            return normalised_candidate
    if not dispensary_name:
        return None
    return normalise_external_url(get_best_menu_url(str(dispensary_name)))


# ──────────────────────────────────────────────────────────────────────────────
# DB
# ──────────────────────────────────────────────────────────────────────────────


def connect_db() -> sqlite3.Connection:
    SETTINGS.db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(
        str(SETTINGS.db_path),
        check_same_thread=False,
        timeout=30,
    )
    conn.row_factory = sqlite3.Row

    # Pragmas: these are safe to execute per-connection.
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


@contextmanager
def db_tx(db: sqlite3.Connection):
    """Transaction helper (acquires a write lock early)."""
    db.execute("BEGIN IMMEDIATE")
    try:
        yield
        db.commit()
    except Exception:
        db.rollback()
        raise


def _table_columns(db: sqlite3.Connection, table_name: str) -> set[str]:
    return {str(row["name"]) for row in db.execute(f"PRAGMA table_info({table_name})").fetchall()}


def ensure_column(db: sqlite3.Connection, table_name: str, column_name: str, column_sql: str) -> None:
    columns = _table_columns(db, table_name)
    if column_name in columns:
        return
    db.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_sql}")


def init_db(db: sqlite3.Connection) -> None:
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS dispensaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT,
            lat REAL,
            lng REAL,
            distance REAL,
            drop_date TEXT,
            drop_url TEXT,
            menu_url TEXT,
            menu_type TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dispensary_id INTEGER NOT NULL,
            strain TEXT NOT NULL,
            size TEXT NOT NULL,
            price REAL,
            type TEXT NOT NULL,
            thc TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (dispensary_id) REFERENCES dispensaries(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS refresh_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            refreshed_at TEXT NOT NULL,
            dispensary_count INTEGER,
            product_count INTEGER,
            source TEXT
        );

        CREATE TABLE IF NOT EXISTS price_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dispensary_name TEXT NOT NULL,
            strain TEXT NOT NULL,
            size TEXT NOT NULL,
            price REAL,
            type TEXT NOT NULL,
            recorded_at TEXT DEFAULT (datetime('now'))
        );

        -- Cross-process job locks + run tracking
        CREATE TABLE IF NOT EXISTS job_locks (
            job_name TEXT PRIMARY KEY,
            lock_owner TEXT NOT NULL,
            locked_at TEXT NOT NULL,
            expires_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS job_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_name TEXT NOT NULL,
            status TEXT NOT NULL,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            lock_owner TEXT NOT NULL,
            error TEXT,
            result_json TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_products_dispensary ON products(dispensary_id);
        CREATE INDEX IF NOT EXISTS idx_products_lookup ON products(dispensary_id, strain, size, type);
        CREATE INDEX IF NOT EXISTS idx_dispensaries_name ON dispensaries(name);
        CREATE INDEX IF NOT EXISTS idx_price_history_strain ON price_history(strain);
        CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(recorded_at);
        CREATE INDEX IF NOT EXISTS idx_price_history_lookup ON price_history(dispensary_name, strain, size, type, recorded_at DESC);
        CREATE INDEX IF NOT EXISTS idx_job_runs_job ON job_runs(job_name);
        CREATE INDEX IF NOT EXISTS idx_job_runs_started ON job_runs(started_at);
        CREATE INDEX IF NOT EXISTS idx_job_locks_expires ON job_locks(expires_at);
        """
    )

    ensure_column(db, "dispensaries", "drop_url", "TEXT")
    ensure_column(db, "job_runs", "result_json", "TEXT")

    db.commit()


def seed_db_if_available(db: sqlite3.Connection) -> None:
    """Seed database from gdl-data.json if tables are empty and the file exists."""
    count = db.execute("SELECT COUNT(*) FROM dispensaries").fetchone()[0]
    if count and int(count) > 0:
        return

    # Prefer a seed file placed next to this app.
    seed_path = APP_DIR / "gdl-data.json"
    if not seed_path.exists():
        # Backwards-compat: original repo layout stored at parent directory.
        alt = APP_DIR.parent / "gdl-data.json"
        if alt.exists():
            seed_path = alt
        else:
            log.info("No seed file found; skipping seed.")
            return

    with open(seed_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    last_updated = data.get("lastUpdated", utc_now_iso())

    with db_tx(db):
        for d in data.get("dispensaries", []):
            name = d.get("name")
            if not name:
                continue

            lat = d.get("lat")
            lng = d.get("lng")
            dist = d.get("distance")

            if lat is None or lng is None:
                coords = lookup_coords(name, d.get("address", ""))
                if coords:
                    lat, lng = coords["lat"], coords["lng"]
                    dist = haversine_miles(CENTER_LAT, CENTER_LNG, lat, lng)

            if dist is None and lat is not None and lng is not None:
                dist = haversine_miles(CENTER_LAT, CENTER_LNG, lat, lng)

            cur = db.execute(
                """INSERT INTO dispensaries (name, address, lat, lng, distance, drop_date, drop_url, menu_url, menu_type)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    name,
                    d.get("address"),
                    lat,
                    lng,
                    dist,
                    d.get("dropDate"),
                    normalise_external_url(d.get("dropUrl"), base_url=SETTINGS.gdl_url),
                    normalise_external_url(d.get("menuUrl")),
                    d.get("menuType"),
                ),
            )
            disp_id = cur.lastrowid

            for p in d.get("products", []):
                db.execute(
                    """INSERT INTO products (dispensary_id, strain, size, price, type, thc)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (
                        disp_id,
                        p.get("strain"),
                        p.get("size"),
                        p.get("price"),
                        p.get("type"),
                        p.get("thc"),
                    ),
                )

                record_price_point_if_changed(
                    db,
                    name,
                    p.get("strain"),
                    p.get("size"),
                    p.get("price"),
                    p.get("type"),
                    recorded_at=last_updated,
                )

        disp_count = db.execute("SELECT COUNT(*) FROM dispensaries").fetchone()[0]
        prod_count = db.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        db.execute(
            "INSERT INTO refresh_log (refreshed_at, dispensary_count, product_count, source) VALUES (?, ?, ?, ?)",
            (last_updated, disp_count, prod_count, "seed"),
        )

    log.info("Seeded DB from %s (%s dispensaries, %s products)", seed_path, disp_count, prod_count)


def backfill_known_store_metadata(db: sqlite3.Connection) -> int:
    """Backfill known menu URLs / menu types / drop URLs for packaged data."""

    rows = db.execute(
        "SELECT id, name, drop_url, menu_url, menu_type FROM dispensaries"
    ).fetchall()
    if not rows:
        return 0

    updated = 0
    with db_tx(db):
        for row in rows:
            drop_url = normalise_external_url(row["drop_url"], base_url=SETTINGS.gdl_url) or normalise_external_url(KNOWN_DROP_URLS.get(row["name"]), base_url=SETTINGS.gdl_url)
            menu_url = normalise_external_url(row["menu_url"]) or normalise_external_url(get_best_menu_url(row["name"]))
            menu_type = row["menu_type"]
            if not menu_type:
                product_rows = db.execute(
                    "SELECT strain, size, type FROM products WHERE dispensary_id = ?",
                    (row["id"],),
                ).fetchall()
                menu_type = infer_menu_type(row["name"], [dict(item) for item in product_rows], existing=None)

            if drop_url == row["drop_url"] and menu_url == row["menu_url"] and menu_type == row["menu_type"]:
                continue

            db.execute(
                "UPDATE dispensaries SET drop_url = ?, menu_url = ?, menu_type = ? WHERE id = ?",
                (drop_url, menu_url, menu_type, row["id"]),
            )
            updated += 1

    if updated:
        invalidate_hot_caches()
    return updated


# ──────────────────────────────────────────────────────────────────────────────
# Locks (DB-backed; safe across processes)
# ──────────────────────────────────────────────────────────────────────────────


def _lock_owner() -> str:
    return f"{socket.gethostname()}:{os.getpid()}"


@dataclass
class JobContext:
    job_name: str
    run_id: int
    owner: str
    started_at: str
    lock_names: tuple[str, ...]


def _owner_host(lock_owner: str | None) -> str:
    if not lock_owner:
        return ""
    return str(lock_owner).split(":", 1)[0]


def _owner_pid(lock_owner: str | None) -> int | None:
    if not lock_owner or ":" not in str(lock_owner):
        return None
    try:
        return int(str(lock_owner).split(":", 1)[1])
    except ValueError:
        return None


def _pid_exists(pid: int | None) -> bool:
    if pid is None or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def cleanup_stale_jobs(db: sqlite3.Connection, *, include_foreign_hosts: bool = False) -> dict[str, int]:
    """Remove expired/foreign locks and close abandoned running rows.

    SQLite-backed deployments are single-host in practice, so lock owners from a
    different hostname are treated as stale on startup.
    """

    now = utc_now()
    now_iso = now.replace(microsecond=0).isoformat()
    current_host = socket.gethostname()

    lock_rows = db.execute(
        "SELECT job_name, lock_owner, expires_at FROM job_locks"
    ).fetchall()

    stale_lock_names: list[str] = []
    for row in lock_rows:
        lock_host = _owner_host(row["lock_owner"])
        lock_pid = _owner_pid(row["lock_owner"])
        is_foreign = include_foreign_hosts and lock_host and lock_host != current_host
        is_expired = parse_iso(row["expires_at"]) <= now
        is_missing_process = bool(lock_host == current_host and lock_pid and not _pid_exists(lock_pid))
        if is_expired or is_foreign or is_missing_process:
            stale_lock_names.append(row["job_name"])

    running_rows = db.execute(
        """
        SELECT id, job_name, status, lock_owner, started_at
        FROM job_runs
        WHERE status = 'running' AND finished_at IS NULL
        ORDER BY id DESC
        """
    ).fetchall()

    active_specific_locks = {
        row["job_name"]: row["lock_owner"]
        for row in db.execute(
            "SELECT job_name, lock_owner, expires_at FROM job_locks"
        ).fetchall()
        if row["job_name"] != UPDATE_LOCK_NAME and row["job_name"] not in stale_lock_names and parse_iso(row["expires_at"]) > now
    }

    repaired_runs = []
    for row in running_rows:
        lock_host = _owner_host(row["lock_owner"])
        lock_pid = _owner_pid(row["lock_owner"])
        is_foreign_run = include_foreign_hosts and lock_host and lock_host != current_host
        is_orphan_run = bool(lock_host == current_host and lock_pid and not _pid_exists(lock_pid))
        active_owner = active_specific_locks.get(row["job_name"])
        if is_foreign_run or is_orphan_run or active_owner != row["lock_owner"]:
            repaired_runs.append(int(row["id"]))

    if not stale_lock_names and not repaired_runs:
        return {"locksRemoved": 0, "runsRepaired": 0}

    with db_tx(db):
        if stale_lock_names:
            db.executemany(
                "DELETE FROM job_locks WHERE job_name = ?",
                [(name,) for name in stale_lock_names],
            )
        if repaired_runs:
            db.executemany(
                "UPDATE job_runs SET status = ?, finished_at = ?, error = COALESCE(error, ?) WHERE id = ?",
                [("error", now_iso, STALE_RUN_MESSAGE, run_id) for run_id in repaired_runs],
            )

    invalidate_hot_caches()
    return {"locksRemoved": len(stale_lock_names), "runsRepaired": len(repaired_runs)}


def try_begin_job(
    db: sqlite3.Connection,
    job_name: str,
    ttl_seconds: int | None = None,
) -> JobContext | None:
    """Attempt to acquire a DB-backed lock for a long-running job.

    All mutating jobs also acquire a shared pipeline lock so refresh, scrape,
    bootstrap, and scheduler work cannot overlap across processes.
    """
    ttl = ttl_seconds if ttl_seconds is not None else SETTINGS.job_lock_ttl_seconds
    owner = _lock_owner()
    started_at = utc_now_iso()
    expires_at = (utc_now() + timedelta(seconds=ttl)).replace(microsecond=0).isoformat()
    lock_names = tuple(dict.fromkeys((UPDATE_LOCK_NAME, job_name)))

    cleanup_stale_jobs(db, include_foreign_hosts=False)

    try:
        db.execute("BEGIN IMMEDIATE")

        for lock_name in lock_names:
            row = db.execute(
                "SELECT lock_owner, expires_at FROM job_locks WHERE job_name = ?",
                (lock_name,),
            ).fetchone()

            if row is not None and parse_iso(row["expires_at"]) > utc_now():
                db.rollback()
                return None

        for lock_name in lock_names:
            db.execute(
                "INSERT OR REPLACE INTO job_locks (job_name, lock_owner, locked_at, expires_at) VALUES (?, ?, ?, ?)",
                (lock_name, owner, started_at, expires_at),
            )

        cur = db.execute(
            "INSERT INTO job_runs (job_name, status, started_at, lock_owner) VALUES (?, ?, ?, ?)",
            (job_name, "running", started_at, owner),
        )
        run_id = int(cur.lastrowid)
        db.commit()
        invalidate_hot_caches()
        return JobContext(job_name=job_name, run_id=run_id, owner=owner, started_at=started_at, lock_names=lock_names)

    except sqlite3.Error as e:
        try:
            db.rollback()
        except Exception:
            pass
        log.error("Failed to acquire job lock %s: %s", job_name, e)
        return None


def _serialise_job_result(result: Any | None) -> str | None:
    if result is None:
        return None
    try:
        return json.dumps(result, ensure_ascii=False, separators=(",", ":"))
    except Exception:
        return None


def finish_job(
    db: sqlite3.Connection,
    ctx: JobContext,
    error: str | None = None,
    result: dict[str, Any] | None = None,
) -> None:
    finished_at = utc_now_iso()
    status = "error" if error else "success"
    result_json = _serialise_job_result(result)

    with db_tx(db):
        db.execute(
            "UPDATE job_runs SET status = ?, finished_at = ?, error = ?, result_json = ? WHERE id = ?",
            (status, finished_at, error, result_json, ctx.run_id),
        )
        db.executemany(
            "DELETE FROM job_locks WHERE job_name = ? AND lock_owner = ?",
            [(lock_name, ctx.owner) for lock_name in ctx.lock_names],
        )
    invalidate_hot_caches()


def touch_job_locks(ctx: JobContext, ttl_seconds: int | None = None) -> bool:
    """Extend a running job lock so long operations do not expire mid-flight."""

    ttl = ttl_seconds if ttl_seconds is not None else SETTINGS.job_lock_ttl_seconds
    expires_at = (utc_now() + timedelta(seconds=ttl)).replace(microsecond=0).isoformat()

    db = connect_db()
    try:
        with db_tx(db):
            updated = 0
            for lock_name in ctx.lock_names:
                cur = db.execute(
                    "UPDATE job_locks SET expires_at = ? WHERE job_name = ? AND lock_owner = ?",
                    (expires_at, lock_name, ctx.owner),
                )
                updated += int(cur.rowcount or 0)
        if updated:
            invalidate_hot_caches()
        return updated == len(ctx.lock_names)
    except sqlite3.Error as e:
        log.warning("Failed to extend job lock %s: %s", ctx.job_name, e)
        return False
    finally:
        db.close()


async def job_lock_heartbeat(ctx: JobContext, interval_seconds: int | None = None) -> None:
    interval = interval_seconds if interval_seconds is not None else max(30, SETTINGS.job_lock_ttl_seconds // 3)
    interval = max(5, int(interval))

    while True:
        await asyncio.sleep(interval)
        if not touch_job_locks(ctx):
            return


async def run_locked_job(
    job_name: str,
    worker: Callable[[sqlite3.Connection], Awaitable[dict[str, Any]]],
) -> dict[str, Any]:
    """Acquire a tracker job lock, keep it alive, run the work, and persist status."""

    db = connect_db()
    ctx: JobContext | None = None
    heartbeat_task: asyncio.Task | None = None

    try:
        ctx = try_begin_job(db, job_name)
        if not ctx:
            raise HTTPException(status_code=409, detail="Another tracker update job is already running.")

        heartbeat_task = asyncio.create_task(job_lock_heartbeat(ctx))

        try:
            result = await worker(db)
        except HTTPException as e:
            finish_job(db, ctx, error=str(e.detail))
            raise
        except Exception as e:
            finish_job(db, ctx, error=str(e))
            raise HTTPException(status_code=502, detail=str(e)) from e

        finish_job(db, ctx, result=result)
        return result
    finally:
        if heartbeat_task is not None:
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass
        db.close()


def get_active_jobs(db: sqlite3.Connection) -> list[dict[str, Any]]:
    now = utc_now()
    rows = db.execute(
        "SELECT job_name, lock_owner, locked_at, expires_at FROM job_locks"
    ).fetchall()

    active = []
    for r in rows:
        if r["job_name"] == UPDATE_LOCK_NAME:
            continue
        exp = parse_iso(r["expires_at"])
        if exp > now:
            active.append(
                {
                    "job": r["job_name"],
                    "owner": r["lock_owner"],
                    "startedAt": r["locked_at"],
                    "expiresAt": r["expires_at"],
                }
            )
    active.sort(key=lambda x: x.get("startedAt") or "", reverse=True)
    return active


def get_recent_job_runs(db: sqlite3.Connection, limit: int = 20) -> list[dict[str, Any]]:
    safe_limit = max(0, min(int(limit), 100))
    if safe_limit == 0:
        return []
    active_by_job = {item["job"]: item for item in get_active_jobs(db)}

    rows = db.execute(
        """
        SELECT job_name, status, started_at, finished_at, lock_owner, error, result_json
        FROM job_runs
        ORDER BY id DESC
        LIMIT ?
        """,
        (safe_limit,),
    ).fetchall()

    result: list[dict[str, Any]] = []
    for row in rows:
        started_at = parse_iso(row["started_at"])
        finished_at_raw = row["finished_at"]
        finished_at = parse_iso(finished_at_raw) if finished_at_raw else None

        if finished_at is not None:
            duration_seconds = max(0, round((finished_at - started_at).total_seconds(), 2))
        elif row["job_name"] in active_by_job:
            duration_seconds = max(0, round((utc_now() - started_at).total_seconds(), 2))
        else:
            duration_seconds = None

        parsed_result = None
        if row["result_json"]:
            try:
                parsed_result = json.loads(row["result_json"])
            except Exception:
                parsed_result = None

        result.append(
            {
                "job": row["job_name"],
                "status": row["status"],
                "startedAt": row["started_at"],
                "finishedAt": row["finished_at"],
                "durationSeconds": duration_seconds,
                "owner": row["lock_owner"],
                "error": row["error"],
                "result": parsed_result,
                "active": row["job_name"] in active_by_job and row["status"] == "running",
            }
        )

    return result


# ──────────────────────────────────────────────────────────────────────────────
# Cache
# ──────────────────────────────────────────────────────────────────────────────


class TTLCache:
    def __init__(self, ttl_seconds: int):
        self._ttl = max(0, int(ttl_seconds))
        self._store: dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Any | None:
        if self._ttl <= 0:
            return None
        item = self._store.get(key)
        if not item:
            return None
        expires_at, value = item
        if time.monotonic() > expires_at:
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        if self._ttl <= 0:
            return
        self._store[key] = (time.monotonic() + self._ttl, value)

    def invalidate(self, *keys: str) -> None:
        if not keys:
            self._store.clear()
            return
        for k in keys:
            self._store.pop(k, None)


CACHE = TTLCache(ttl_seconds=SETTINGS.cache_ttl_seconds)


def invalidate_hot_caches() -> None:
    CACHE.invalidate()


# ──────────────────────────────────────────────────────────────────────────────
# Core data access / aggregation
# ──────────────────────────────────────────────────────────────────────────────


def get_all_data(db: sqlite3.Connection) -> dict[str, Any]:
    """Return data in the JSON shape the frontend expects."""

    rows = db.execute(
        """
        SELECT
          d.id AS d_id,
          d.name AS d_name,
          d.address AS d_address,
          d.lat AS d_lat,
          d.lng AS d_lng,
          d.distance AS d_distance,
          d.drop_date AS d_drop_date,
          d.drop_url AS d_drop_url,
          d.menu_url AS d_menu_url,
          d.menu_type AS d_menu_type,
          p.strain AS p_strain,
          p.size AS p_size,
          p.price AS p_price,
          p.type AS p_type,
          p.thc AS p_thc
        FROM dispensaries d
        LEFT JOIN products p ON p.dispensary_id = d.id
        ORDER BY d.distance IS NULL ASC, d.distance ASC, d.name ASC, p.type ASC, p.size ASC, p.strain ASC
        """
    ).fetchall()

    dispensaries: dict[int, dict[str, Any]] = {}
    order: list[int] = []

    for r in rows:
        disp_id = int(r["d_id"])
        if disp_id not in dispensaries:
            order.append(disp_id)
            dispensaries[disp_id] = {
                "name": r["d_name"],
                "address": r["d_address"],
                "lat": r["d_lat"],
                "lng": r["d_lng"],
                "distance": r["d_distance"],
                "dropDate": r["d_drop_date"],
                "dropUrl": normalise_external_url(r["d_drop_url"], base_url=SETTINGS.gdl_url),
                "menuUrl": normalise_external_url(r["d_menu_url"]),
                "menuType": r["d_menu_type"],
                "products": [],
            }

        if r["p_strain"] is not None:
            thc_value = parse_thc_percent(r["p_thc"])
            dispensaries[disp_id]["products"].append(
                {
                    "strain": r["p_strain"],
                    "size": r["p_size"],
                    "price": r["p_price"],
                    "type": r["p_type"],
                    "thc": r["p_thc"],
                    "thcValue": thc_value,
                }
            )

    last_activity = get_last_activity_row(db)

    return {
        "lastUpdated": last_activity["refreshed_at"] if last_activity else utc_now_iso(),
        "centerZip": "80920",
        "centerLat": CENTER_LAT,
        "centerLng": CENTER_LNG,
        "radius": MAX_DISTANCE_MI,
        "dispensaries": [dispensaries[i] for i in order],
    }


def score_address_match(left: str | None, right: str | None) -> int:
    left_key = _normalise_address_text(left)
    right_key = _normalise_address_text(right)
    if not left_key or not right_key:
        return 0
    if left_key == right_key:
        return 240 + len(left_key)
    if left_key in right_key or right_key in left_key:
        return 120 + min(len(left_key), len(right_key))
    return 0


def build_existing_listing_snapshot(db: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = db.execute(
        """
        SELECT
          d.name AS dispensary_name,
          d.address AS dispensary_address,
          d.lat AS dispensary_lat,
          d.lng AS dispensary_lng,
          d.distance AS dispensary_distance,
          d.drop_url AS dispensary_drop_url,
          d.menu_url AS dispensary_menu_url,
          d.menu_type AS dispensary_menu_type,
          p.strain AS strain,
          p.size AS size,
          p.type AS type,
          p.price AS price,
          p.thc AS thc
        FROM dispensaries d
        JOIN products p ON p.dispensary_id = d.id
        """
    ).fetchall()

    stores: dict[tuple[str, str], dict[str, Any]] = {}
    for row in rows:
        key = (_squash_whitespace(row["dispensary_name"]), _squash_whitespace(row["dispensary_address"]))
        store = stores.setdefault(
            key,
            {
                "name": row["dispensary_name"],
                "address": row["dispensary_address"],
                "addressKey": _normalise_address_text(row["dispensary_address"]),
                "lat": row["dispensary_lat"],
                "lng": row["dispensary_lng"],
                "distance": row["dispensary_distance"],
                "dropUrl": normalise_external_url(row["dispensary_drop_url"], base_url=SETTINGS.gdl_url),
                "menuUrl": normalise_external_url(row["dispensary_menu_url"]),
                "menuType": row["dispensary_menu_type"],
                "products": {},
            },
        )

        if store.get("lat") is None and row["dispensary_lat"] is not None:
            store["lat"] = row["dispensary_lat"]
        if store.get("lng") is None and row["dispensary_lng"] is not None:
            store["lng"] = row["dispensary_lng"]
        if store.get("distance") is None and row["dispensary_distance"] is not None:
            store["distance"] = row["dispensary_distance"]
        if not store.get("dropUrl") and row["dispensary_drop_url"]:
            store["dropUrl"] = normalise_external_url(row["dispensary_drop_url"], base_url=SETTINGS.gdl_url)
        if not store.get("menuUrl") and row["dispensary_menu_url"]:
            store["menuUrl"] = normalise_external_url(row["dispensary_menu_url"])
        if not store.get("menuType") and row["dispensary_menu_type"]:
            store["menuType"] = row["dispensary_menu_type"]

        product_key = listing_key(row["strain"], row["size"], row["type"])
        existing = store["products"].get(product_key, {"price": None, "thc": None})

        if row["price"] is not None:
            existing["price"] = row["price"]
        if row["thc"] not in (None, "", "—"):
            existing["thc"] = row["thc"]

        store["products"][product_key] = existing

    return list(stores.values())


def select_existing_store_snapshot(
    existing_stores: list[dict[str, Any]],
    dispensary_name: str | None,
    address: str | None,
) -> dict[str, Any] | None:
    best_snapshot: dict[str, Any] | None = None
    best_score = 0
    for snapshot in existing_stores:
        score = score_store_match(snapshot.get("name"), dispensary_name)
        score += score_address_match(snapshot.get("address"), address)
        if score > best_score:
            best_score = score
            best_snapshot = snapshot
    return best_snapshot if best_score > 0 else None


def merge_product_with_existing_snapshot(
    product: dict[str, Any],
    existing_products: dict[tuple[str, str, str], dict[str, Any]] | None,
) -> dict[str, Any]:
    merged = dict(product)
    if not existing_products:
        return merged

    snapshot = existing_products.get(listing_key(product.get("strain"), product.get("size"), product.get("type")))
    if not snapshot:
        return merged

    if snapshot.get("price") is not None:
        merged["price"] = snapshot["price"]
    if snapshot.get("thc") not in (None, "", "—"):
        merged["thc"] = snapshot["thc"]
    return merged


def select_live_products_for_dispensary(
    live_prices: dict[str, list[dict[str, Any]]],
    dispensary_name: str | None,
) -> tuple[str | None, list[dict[str, Any]] | None]:
    best_name: str | None = None
    best_products: list[dict[str, Any]] | None = None
    best_score = 0

    for candidate_name, products in live_prices.items():
        score = score_store_match(candidate_name, dispensary_name)
        if score > best_score:
            best_score = score
            best_name = candidate_name
            best_products = products

    return (best_name, best_products) if best_score > 0 else (None, None)


def backfill_known_prices_for_dispensary(
    db: sqlite3.Connection,
    dispensary_id: int,
    dispensary_name: str,
    dispensary_address: str,
    recorded_at: str,
) -> dict[str, int]:
    products = db.execute(
        "SELECT id, strain, size, price, type FROM products WHERE dispensary_id = ? AND price IS NULL",
        (dispensary_id,),
    ).fetchall()

    if not products:
        return {"updated": 0, "history": 0}

    product_dicts = [
        {
            "strain": p["strain"],
            "size": p["size"],
            "price": p["price"],
            "type": p["type"],
        }
        for p in products
    ]
    updated_products = apply_known_pricing(product_dicts, dispensary_name, dispensary_address)

    updated_count = 0
    history_count = 0
    for original, updated in zip(products, updated_products):
        if updated.get("price") is None or original["price"] is not None:
            continue

        db.execute("UPDATE products SET price = ? WHERE id = ?", (updated["price"], original["id"]))
        changed = record_price_point_if_changed(
            db,
            dispensary_name,
            updated["strain"],
            updated["size"],
            updated["price"],
            updated["type"],
            recorded_at=recorded_at,
        )
        updated_count += 1
        if changed:
            history_count += 1

    return {"updated": updated_count, "history": history_count}


def _sql_scalar(db: sqlite3.Connection, query: str, params: tuple[Any, ...] = ()) -> Any:
    row = db.execute(query, params).fetchone()
    return row[0] if row else None


def get_stats(db: sqlite3.Connection) -> dict[str, Any]:
    total_disps = int(_sql_scalar(db, "SELECT COUNT(*) FROM dispensaries") or 0)
    total_products = int(_sql_scalar(db, "SELECT COUNT(*) FROM products") or 0)
    unique_strains = int(_sql_scalar(db, "SELECT COUNT(DISTINCT strain) FROM products") or 0)

    lowest = _sql_scalar(db, "SELECT MIN(price) FROM products WHERE price IS NOT NULL")
    highest = _sql_scalar(db, "SELECT MAX(price) FROM products WHERE price IS NOT NULL")

    avg_rec_35 = _sql_scalar(
        db,
        "SELECT AVG(price) FROM products WHERE price IS NOT NULL AND type = 'REC' AND size = '3.5g'",
    )
    avg_med_35 = _sql_scalar(
        db,
        "SELECT AVG(price) FROM products WHERE price IS NOT NULL AND type = 'MED' AND size = '3.5g'",
    )

    avg_rec_35 = round(float(avg_rec_35)) if avg_rec_35 is not None else None
    avg_med_35 = round(float(avg_med_35)) if avg_med_35 is not None else None

    lowest_row = db.execute(
        """
        SELECT d.name, p.price, p.size, p.type, p.strain
        FROM products p JOIN dispensaries d ON p.dispensary_id = d.id
        WHERE p.price IS NOT NULL
        ORDER BY p.price ASC
        LIMIT 1
        """
    ).fetchone()

    recent_drop = db.execute(
        "SELECT name, drop_date FROM dispensaries WHERE drop_date IS NOT NULL ORDER BY drop_date DESC LIMIT 1"
    ).fetchone()

    strain_dist = db.execute(
        """
        SELECT p.strain, COUNT(DISTINCT p.dispensary_id) as disp_count, COUNT(*) as prod_count
        FROM products p
        GROUP BY p.strain
        ORDER BY disp_count DESC
        """
    ).fetchall()

    size_dist = db.execute(
        "SELECT size, COUNT(*) as count FROM products GROUP BY size ORDER BY size"
    ).fetchall()

    type_dist = db.execute(
        "SELECT type, COUNT(*) as count FROM products GROUP BY type"
    ).fetchall()

    disp_counts = db.execute(
        """
        SELECT d.name, d.distance, COUNT(p.id) as product_count,
               COUNT(DISTINCT p.strain) as strain_count
        FROM dispensaries d
        LEFT JOIN products p ON d.id = p.dispensary_id
        GROUP BY d.id
        ORDER BY d.distance IS NULL ASC, d.distance ASC, d.name ASC
        """
    ).fetchall()

    price_by_disp = db.execute(
        """
        SELECT d.name, p.strain, p.size, p.price, p.type
        FROM products p JOIN dispensaries d ON p.dispensary_id = d.id
        WHERE p.price IS NOT NULL
        ORDER BY p.strain, p.price ASC
        """
    ).fetchall()

    return {
        "totalDispensaries": total_disps,
        "totalProducts": total_products,
        "uniqueStrains": unique_strains,
        "lowestPrice": lowest,
        "highestPrice": highest,
        "avgRec35": avg_rec_35,
        "avgMed35": avg_med_35,
        "lowestPriceDetail": {
            "dispensary": lowest_row["name"],
            "price": lowest_row["price"],
            "size": lowest_row["size"],
            "type": lowest_row["type"],
            "strain": lowest_row["strain"],
        }
        if lowest_row
        else None,
        "recentDrop": {
            "dispensary": recent_drop["name"],
            "date": recent_drop["drop_date"],
        }
        if recent_drop
        else None,
        "strainDistribution": [
            {
                "strain": s["strain"],
                "dispensaryCount": s["disp_count"],
                "productCount": s["prod_count"],
            }
            for s in strain_dist
        ],
        "sizeDistribution": [{"size": s["size"], "count": s["count"]} for s in size_dist],
        "typeDistribution": [{"type": t["type"], "count": t["count"]} for t in type_dist],
        "dispensarySummary": [
            {
                "name": d["name"],
                "distance": d["distance"],
                "productCount": d["product_count"],
                "strainCount": d["strain_count"],
            }
            for d in disp_counts
        ],
        "priceComparisons": [
            {
                "dispensary": p["name"],
                "strain": p["strain"],
                "size": p["size"],
                "price": p["price"],
                "type": p["type"],
            }
            for p in price_by_disp
        ],
    }


# ──────────────────────────────────────────────────────────────────────────────
# GDL page parsing + known pricing
# ──────────────────────────────────────────────────────────────────────────────


MOUNTAIN_TZ = ZoneInfo("America/Denver")

FLOWER_LINE_RE = re.compile(
    r"""
    ^\s*(?:(?:BLACK\s+LABEL|GDL\s+ORIGINALS|HEIRLOOM|CONNOISSEUR\s+SHELF|SELECTIONS)\s+)?FLOWER
    (?:\s+ROLL(?:S)?)?
    \s+(?:(?P<multi>\d+)X\s+)?(?P<size>\d+(?:\.\d+)?\s*G)
    (?:\s+SINGLE)?
    (?:\s+[A-Z0-9.+&\-/]+)*
    \s*\((?P<type>REC|MED)\)\s*(?::|[-–—])\s*
    (?P<strains>.+?)\s*$
    """,
    re.IGNORECASE | re.VERBOSE,
)
DATE_RE = re.compile(r"(\d{1,2}/\d{1,2}/\d{2,4})")
ADDRESS_HINT_RE = re.compile(
    r"\b(?:co|az)\b|\b\d{5}\b|\b(?:suite|ste|st\.?|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|ct|court|pl|place|hwy)\b",
    re.IGNORECASE,
)


def parse_drop_date_text(value: str | None) -> str | None:
    if not value:
        return None
    match = DATE_RE.search(value)
    if not match:
        return None
    for fmt in ("%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(match.group(1), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def current_mountain_date_iso() -> str:
    return datetime.now(MOUNTAIN_TZ).date().isoformat()


def parse_listing_date_text(value: str | None) -> str | None:
    parsed = parse_drop_date_text(value)
    if parsed:
        return parsed

    text = _squash_whitespace(value).lower()
    if not text:
        return None
    if "dropped today" in text or text == "today":
        return current_mountain_date_iso()
    return None


def normalise_size_label(size_text: str, multiplier_text: str | None = None) -> str:
    clean = str(size_text or "").strip().lower().replace(" ", "")
    match = re.match(r"(?P<value>\d+(?:\.\d+)?)g$", clean)
    if not match:
        return clean

    value = float(match.group("value"))
    if multiplier_text:
        try:
            multiplier = int(multiplier_text)
        except (TypeError, ValueError):
            multiplier = 1
        if multiplier > 1:
            value *= multiplier

    if value.is_integer():
        return f"{int(value)}g"
    return f"{value:g}g"


def is_address_like(value: str | None) -> bool:
    if not value:
        return False
    text = " ".join(str(value).split())
    if len(text) < 8 or not re.search(r"\d", text):
        return False
    return bool(ADDRESS_HINT_RE.search(text))


def parse_flower_line(value: str | None) -> list[dict[str, Any]]:
    if not value:
        return []

    clean = " ".join(str(value).replace("\xa0", " ").split())
    match = FLOWER_LINE_RE.match(clean)
    if not match:
        return []

    size = normalise_size_label(match.group("size"), match.group("multi"))
    product_type = match.group("type").upper()
    strains = [
        s.strip(" -–—")
        for s in re.split(r"\s*,\s*|\s+/\s+|\s*;\s*|\s+\|\s+", match.group("strains"))
        if s.strip()
    ]

    return [
        {
            "strain": strain,
            "size": size,
            "price": None,
            "type": product_type,
            "thc": None,
        }
        for strain in strains
    ]


def _unique_products(products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str, str]] = set()
    out: list[dict[str, Any]] = []

    for product in products:
        key = (
            normalise_strain_key(product.get("strain", "")),
            str(product.get("size") or "").lower(),
            str(product.get("type") or "").upper(),
        )
        if not key[0] or key in seen:
            continue
        seen.add(key)
        out.append(product)

    return out


def _merge_dispensary_rows(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: dict[tuple[str, str], dict[str, Any]] = {}

    for item in items:
        key = (
            " ".join((item.get("name") or "").lower().split()),
            " ".join((item.get("address") or "").lower().split()),
        )
        if key not in merged:
            merged[key] = {
                "name": item.get("name"),
                "address": item.get("address"),
                "products": _unique_products(list(item.get("products") or [])),
                "dropDate": item.get("dropDate"),
                "dropUrl": item.get("dropUrl"),
                "menuUrl": item.get("menuUrl"),
            }
            continue

        existing = merged[key]
        existing["products"] = _unique_products(existing["products"] + list(item.get("products") or []))

        existing_date = existing.get("dropDate") or ""
        next_date = item.get("dropDate") or ""
        if next_date and (not existing_date or next_date > existing_date):
            existing["dropDate"] = item.get("dropDate")
            if item.get("dropUrl"):
                existing["dropUrl"] = item.get("dropUrl")

        if not existing.get("dropUrl") and item.get("dropUrl"):
            existing["dropUrl"] = item.get("dropUrl")
        if not existing.get("menuUrl") and item.get("menuUrl"):
            existing["menuUrl"] = item.get("menuUrl")
        if not existing.get("address") and item.get("address"):
            existing["address"] = item.get("address")

    return list(merged.values())


def _normalise_drop_url(value: str | None) -> str:
    return normalise_external_url(value, base_url=SETTINGS.gdl_url) or ""


def _parse_gdl_page_from_cards(soup: BeautifulSoup, *, include_empty: bool = False) -> list[dict[str, Any]]:
    dispensaries: list[dict[str, Any]] = []
    drops = soup.find_all("div", class_="single-drop")

    for drop in drops:
        title_link = drop.find("a", class_="title") or drop.find("a", href=True)
        if not title_link:
            continue

        name = " ".join(title_link.get_text(" ", strip=True).split())
        drop_url = _normalise_drop_url(title_link.get("href", ""))

        address = ""
        big_tag = drop.find("big")
        if big_tag:
            address = " ".join(big_tag.get_text(" ", strip=True).split())
        elif title_link.parent:
            next_big = title_link.parent.find_next("big")
            if next_big:
                address = " ".join(next_big.get_text(" ", strip=True).split())

        date_tag = drop.find("div", class_="drop-date")
        drop_date = parse_listing_date_text(date_tag.get_text(" ", strip=True) if date_tag else None)

        products: list[dict[str, Any]] = []
        content_div = drop.find("div", class_="not-truncated-content") or drop
        for p_tag in content_div.find_all(["p", "li"]):
            raw_lines = [
                BeautifulSoup(raw_line, "html.parser").get_text(" ", strip=True)
                for raw_line in str(p_tag).replace("<br/>", "\n").replace("<br />", "\n").split("\n")
            ]
            for raw_line in raw_lines:
                products.extend(parse_flower_line(raw_line))

        products = _unique_products(products)
        if products or include_empty:
            dispensaries.append(
                {
                    "name": name,
                    "address": address,
                    "products": products,
                    "dropDate": drop_date,
                    "dropUrl": drop_url,
                }
            )

    return dispensaries


def _looks_like_listing_start(title: str | None, date_text: str | None, address: str | None) -> bool:
    title_text = " ".join((title or "").split())
    if not title_text or title_text.upper() == "READ MORE":
        return False
    if len(title_text) > 140 or title_text.lower().startswith("image"):
        return False
    if parse_listing_date_text(date_text) is None:
        return False
    if not is_address_like(address):
        return False
    return True


def _parse_gdl_page_from_text(soup: BeautifulSoup, *, include_empty: bool = False) -> list[dict[str, Any]]:
    strings = [" ".join(s.replace("\xa0", " ").split()) for s in soup.stripped_strings]
    strings = [s for s in strings if s]
    if not strings:
        return []

    try:
        start_idx = strings.index("Search Dispensaries") + 1
    except ValueError:
        start_idx = 0

    strings = strings[start_idx:]

    link_map: dict[str, str] = {}
    for anchor in soup.find_all("a", href=True):
        text = " ".join(anchor.get_text(" ", strip=True).replace("\xa0", " ").split())
        href = anchor.get("href")
        if text and href and text not in link_map:
            link_map[text] = _normalise_drop_url(href)

    dispensaries: list[dict[str, Any]] = []
    i = 0
    total = len(strings)

    while i + 2 < total:
        title = strings[i]
        date_text = strings[i + 1]
        address = strings[i + 2]

        if not _looks_like_listing_start(title, date_text, address):
            i += 1
            continue

        drop_date = parse_listing_date_text(date_text)
        products: list[dict[str, Any]] = []
        j = i + 3
        while j < total:
            current = strings[j]
            if current.upper() == "READ MORE":
                j += 1
                break
            if j + 2 < total and _looks_like_listing_start(strings[j], strings[j + 1], strings[j + 2]):
                break
            products.extend(parse_flower_line(current))
            j += 1

        products = _unique_products(products)
        if products or include_empty:
            dispensaries.append(
                {
                    "name": title,
                    "address": address,
                    "products": products,
                    "dropDate": drop_date,
                    "dropUrl": link_map.get(title, ""),
                }
            )

        i = max(j, i + 1)

    return dispensaries


def collect_local_detail_page_urls_from_html(html_content: str) -> list[str]:
    soup = BeautifulSoup(html_content, "html.parser")
    candidates = _merge_dispensary_rows(
        _parse_gdl_page_from_cards(soup, include_empty=True)
        + _parse_gdl_page_from_text(soup, include_empty=True)
    )

    urls: list[str] = []
    seen: set[str] = set()
    for item in candidates:
        address = item.get("address")
        drop_url = _normalise_drop_url(item.get("dropUrl"))
        if not address or not is_in_area(address) or not drop_url or drop_url in seen:
            continue
        seen.add(drop_url)
        urls.append(drop_url)

    return urls


def parse_gdl_page(html_content: str) -> list[dict[str, Any]]:
    """Parse the GDL 'Find Our Products' page to extract dispensary data.

    The site has changed layouts over time, so we try both the older card-class
    structure and a more generic text-flow parser. This makes refreshes much
    more resilient when GDL changes markup without changing the visible content.
    """

    soup = BeautifulSoup(html_content, "html.parser")

    parsed = _parse_gdl_page_from_cards(soup)
    fallback = _parse_gdl_page_from_text(soup)
    merged = _merge_dispensary_rows(parsed + fallback)

    return [d for d in merged if d.get("products")]


def merge_dispensary_records(primary: dict[str, Any], secondary: dict[str, Any]) -> dict[str, Any]:
    merged = {
        **primary,
        "products": _unique_products(list(primary.get("products") or []) + list(secondary.get("products") or [])),
    }

    primary_date = primary.get("dropDate") or ""
    secondary_date = secondary.get("dropDate") or ""
    if secondary_date and (not primary_date or secondary_date > primary_date):
        merged["dropDate"] = secondary.get("dropDate")
        if secondary.get("dropUrl"):
            merged["dropUrl"] = secondary.get("dropUrl")

    if not merged.get("dropUrl") and secondary.get("dropUrl"):
        merged["dropUrl"] = secondary.get("dropUrl")
    if not merged.get("menuUrl") and secondary.get("menuUrl"):
        merged["menuUrl"] = secondary.get("menuUrl")
    if not merged.get("address") and secondary.get("address"):
        merged["address"] = secondary.get("address")

    return merged


def merge_dispensary_collections(
    primary: list[dict[str, Any]],
    supplemental: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    merged = [
        {
            **item,
            "products": _unique_products(list(item.get("products") or [])),
        }
        for item in primary
    ]

    for item in supplemental:
        best_idx: int | None = None
        best_score = 0
        for idx, existing in enumerate(merged):
            score = score_store_match(existing.get("name"), item.get("name"))
            score += score_address_match(existing.get("address"), item.get("address"))
            if score > best_score:
                best_score = score
                best_idx = idx

        if best_idx is not None and best_score > 0:
            merged[best_idx] = merge_dispensary_records(merged[best_idx], item)
        else:
            merged.append({
                **item,
                "products": _unique_products(list(item.get("products") or [])),
            })

    return merged


def _detail_section_boundary(value: str | None) -> bool:
    text = _squash_whitespace(value).lower()
    if not text:
        return False

    if text in {"previous drop", "all dispensaries", "find our products"}:
        return True
    if text.startswith("all ") and text.endswith(" locations"):
        return True
    if text.startswith("home"):
        return True
    if text.startswith("toll free"):
        return True
    if text.startswith("copyright"):
        return True
    return False


def _extract_detail_menu_url(soup: BeautifulSoup) -> str | None:
    def is_menu_like(url: str | None) -> bool:
        normalised = normalise_external_url(url)
        if not normalised:
            return False
        host = urlparse(normalised).netloc.lower()
        if not host or host.endswith("greendotlabs.com"):
            return False
        if "maps.app" in host or host.endswith("google.com"):
            return False
        return True

    for pattern in (re.compile(r"order\s*now", re.IGNORECASE), re.compile(r"website", re.IGNORECASE)):
        for anchor in soup.find_all("a", href=True):
            text = _squash_whitespace(anchor.get_text(" ", strip=True))
            if not pattern.search(text):
                continue
            href = anchor.get("href")
            if is_menu_like(href):
                return normalise_external_url(href)

    return None


def _parse_detail_drop_section(strings: list[str], heading: str = "Dropped") -> tuple[str | None, list[dict[str, Any]]]:
    heading_lower = heading.lower()
    start_idx = next((idx for idx, value in enumerate(strings) if value.lower() == heading_lower), None)
    if start_idx is None:
        return None, []

    drop_date: str | None = None
    products: list[dict[str, Any]] = []
    idx = start_idx + 1

    while idx < len(strings):
        current = strings[idx]
        if idx > start_idx + 1 and _detail_section_boundary(current):
            break

        if drop_date is None:
            maybe_date = parse_drop_date_text(current)
            if maybe_date:
                drop_date = maybe_date
                idx += 1
                continue

        products.extend(parse_flower_line(current))
        idx += 1

    return drop_date, _unique_products(products)


def parse_gdl_detail_page(html_content: str, *, page_url: str | None = None) -> dict[str, Any] | None:
    soup = BeautifulSoup(html_content, "html.parser")
    strings = [_squash_whitespace(value) for value in soup.stripped_strings]
    strings = [value for value in strings if value]
    if not strings:
        return None

    title_tag = soup.find(["h1", "h2"])
    name = _squash_whitespace(title_tag.get_text(" ", strip=True)) if title_tag else ""
    if not name:
        return None

    address = ""
    if name in strings:
        start = strings.index(name) + 1
        for candidate in strings[start:start + 10]:
            if is_address_like(candidate):
                address = candidate
                break
    if not address:
        address = next((candidate for candidate in strings if is_address_like(candidate)), "")

    drop_date, products = _parse_detail_drop_section(strings, "Dropped")
    if not products:
        drop_date, products = _parse_detail_drop_section(strings, "Previous Drop")
    if not products:
        return None

    canonical = soup.find("link", rel=lambda value: value and "canonical" in str(value).lower(), href=True)
    drop_url = normalise_external_url(page_url or (canonical.get("href") if canonical else None), base_url=SETTINGS.gdl_url)
    menu_url = _extract_detail_menu_url(soup)

    return {
        "name": name,
        "address": address,
        "products": products,
        "dropDate": drop_date,
        "dropUrl": drop_url,
        "menuUrl": menu_url,
    }


def collect_detail_page_urls(parsed_dispensaries: list[dict[str, Any]], *, source_html: str | None = None) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()

    def add_url(value: str | None) -> None:
        normalised = normalise_external_url(value, base_url=SETTINGS.gdl_url)
        if not normalised or normalised in seen:
            return
        seen.add(normalised)
        urls.append(normalised)

    for dispensary in parsed_dispensaries:
        if is_in_area(dispensary.get("address")):
            add_url(dispensary.get("dropUrl"))

    if source_html:
        for value in collect_local_detail_page_urls_from_html(source_html):
            add_url(value)

    for value in KNOWN_DROP_URLS.values():
        add_url(value)

    limit = max(0, SETTINGS.detail_page_fetch_limit)
    return urls[:limit] if limit else []


async def fetch_gdl_detail_page_supplements(
    client: httpx.AsyncClient,
    urls: list[str],
) -> list[dict[str, Any]]:
    if not urls:
        return []

    concurrency = max(1, SETTINGS.detail_page_concurrency)
    semaphore = asyncio.Semaphore(concurrency)
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
    }

    async def fetch_one(url: str) -> dict[str, Any] | None:
        async with semaphore:
            try:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
            except Exception as exc:
                log.warning("Failed to fetch GDL detail page %s: %s", url, exc)
                return None

            parsed = parse_gdl_detail_page(response.text, page_url=url)
            if not parsed:
                return None
            if not parsed.get("address") or not is_in_area(parsed.get("address")):
                return None
            return parsed

    fetched = await asyncio.gather(*(fetch_one(url) for url in urls), return_exceptions=False)
    return [item for item in fetched if item and item.get("products")]


def apply_known_pricing(products: list[dict[str, Any]], dispensary_name: str, address: str = "") -> list[dict[str, Any]]:
    """Apply known hardcoded pricing to products for known dispensaries."""
    addr_lower = (address or "").lower()

    for known_name, info in KNOWN_PRICING.items():
        base_name = re.sub(r"\s+(REC|MED)$", "", known_name, flags=re.IGNORECASE).strip()
        addr_match_str = str(info.get("address_match", "") or "").lower()
        exact = bool(info.get("exact_match", False))

        if exact:
            name_hit = bool(candidate_store_keys(base_name) & candidate_store_keys(dispensary_name))
        else:
            name_hit = stores_match(base_name, dispensary_name)

        address_hit = bool(addr_match_str and addr_match_str in addr_lower)

        if not (name_hit or address_hit):
            continue

        type_filter = info.get("type_filter")
        for product in products:
            if product.get("price") is not None:
                continue
            if product.get("size") not in info.get("prices", {}):
                continue
            if type_filter is not None and product.get("type") != type_filter:
                continue
            product["price"] = info["prices"][product["size"]]

    return products


# ──────────────────────────────────────────────────────────────────────────────
# Price history tracking
# ──────────────────────────────────────────────────────────────────────────────


def record_price_point_if_changed(
    db: sqlite3.Connection,
    dispensary_name: str,
    strain: str,
    size: str,
    price: Any,
    product_type: str,
    recorded_at: str | None = None,
) -> bool:
    """Insert a history row only when the latest known price changed."""
    if price is None:
        return False

    latest = db.execute(
        """
        SELECT price
        FROM price_history
        WHERE dispensary_name = ? AND strain = ? AND size = ? AND type = ?
        ORDER BY recorded_at DESC, id DESC
        LIMIT 1
        """,
        (dispensary_name, strain, size, product_type),
    ).fetchone()

    try:
        if latest and latest["price"] is not None and float(latest["price"]) == float(price):
            return False
    except Exception:
        # If a row contains a weird value, treat it as changed.
        pass

    db.execute(
        """
        INSERT INTO price_history (dispensary_name, strain, size, price, type, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            dispensary_name,
            strain,
            size,
            float(price),
            product_type,
            recorded_at or utc_now_iso(),
        ),
    )
    return True


def record_prices(db: sqlite3.Connection, dispensary_name: str, products: list[dict[str, Any]], recorded_at: str | None = None) -> None:
    now = recorded_at or utc_now_iso()
    for p in products:
        record_price_point_if_changed(
            db,
            dispensary_name,
            p.get("strain"),
            p.get("size"),
            p.get("price"),
            p.get("type"),
            recorded_at=now,
        )


def refresh_result_looks_suspicious(
    existing_disp_count: int,
    existing_product_count: int,
    new_dispensaries: list[dict[str, Any]],
) -> bool:
    """Detect obviously bad refresh parses before we wipe known-good data.

    This protects against upstream markup changes that still produce a syntactic
    parse but only return a small fraction of the expected local dataset.

    A legitimately current Colorado Springs snapshot can still be much smaller
    than a previously packaged dataset, so we allow refreshes that still retain
    a meaningful local floor of dispensaries/products.
    """

    if existing_disp_count <= 0:
        return False

    new_disp_count = len(new_dispensaries)
    new_product_count = sum(len(d.get("products", [])) for d in new_dispensaries)

    if new_disp_count <= 0 or new_product_count <= 0:
        return True

    if (
        new_disp_count >= REFRESH_MIN_CONFIDENT_LOCAL_DISPENSARIES
        and new_product_count >= REFRESH_MIN_CONFIDENT_LOCAL_PRODUCTS
    ):
        return False

    disp_ratio = new_disp_count / max(existing_disp_count, 1)
    product_ratio = new_product_count / max(existing_product_count, 1) if existing_product_count > 0 else 1.0

    disp_drop = existing_disp_count - new_disp_count
    product_drop = existing_product_count - new_product_count

    return bool(
        (disp_ratio < REFRESH_SHRINK_DISPENSARY_RATIO and disp_drop >= REFRESH_SHRINK_MIN_DISPENSARY_DROP)
        or (product_ratio < REFRESH_SHRINK_PRODUCT_RATIO and product_drop >= REFRESH_SHRINK_MIN_PRODUCT_DROP)
    )


# ──────────────────────────────────────────────────────────────────────────────
# Refresh + menu scrape
# ──────────────────────────────────────────────────────────────────────────────


async def refresh_data(db: sqlite3.Connection) -> dict[str, Any]:
    """Fetch fresh data from GDL website, parse it, filter by area, store in DB."""

    detail_pages_fetched = 0
    detail_supplement_count = 0

    timeout = httpx.Timeout(SETTINGS.http_timeout_seconds)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        try:
            resp = await client.get(
                SETTINGS.gdl_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Connection": "keep-alive",
                },
            )
            resp.raise_for_status()
        except Exception as e:
            log.warning("Failed to fetch GDL page: %s", e)
            raise RuntimeError(f"Failed to fetch GDL page: {str(e)}") from e

        parsed_dispensaries = parse_gdl_page(resp.text)
        if SETTINGS.detail_page_enrichment_enabled:
            detail_urls = collect_detail_page_urls(parsed_dispensaries, source_html=resp.text)
            detail_pages_fetched = len(detail_urls)
            if detail_urls:
                detail_pages = await fetch_gdl_detail_page_supplements(client, detail_urls)
                if detail_pages:
                    detail_supplement_count = len(detail_pages)
                    parsed_dispensaries = merge_dispensary_collections(parsed_dispensaries, detail_pages)

    existing_snapshot = build_existing_listing_snapshot(db)
    existing_disp_count = int(_sql_scalar(db, "SELECT COUNT(*) FROM dispensaries") or 0)
    existing_product_count = int(_sql_scalar(db, "SELECT COUNT(*) FROM products") or 0)

    local_dispensaries: list[dict[str, Any]] = []
    for dispensary in parsed_dispensaries:
        address = dispensary.get("address")
        if not address or not is_in_area(address):
            continue

        existing_store = select_existing_store_snapshot(existing_snapshot, dispensary.get("name"), address)
        existing_products = existing_store.get("products") if existing_store else None
        merged_products = [
            merge_product_with_existing_snapshot(product, existing_products)
            for product in dispensary.get("products", [])
        ]
        merged_products = apply_known_pricing(merged_products, dispensary["name"], address)

        local_dispensaries.append({
            **dispensary,
            "lat": existing_store.get("lat") if existing_store else None,
            "lng": existing_store.get("lng") if existing_store else None,
            "distance": existing_store.get("distance") if existing_store else None,
            "dropUrl": dispensary.get("dropUrl") or (existing_store.get("dropUrl") if existing_store else None),
            "menuUrl": resolve_menu_url(existing_store, dispensary.get("name"), dispensary.get("menuUrl")),
            "menuType": infer_menu_type(dispensary.get("name"), merged_products, existing=(existing_store.get("menuType") if existing_store else None)),
            "products": merged_products,
        })

    now = utc_now_iso()

    if not local_dispensaries:
        # Preserve existing DB content.
        disp_count = existing_disp_count
        prod_count = existing_product_count
        with db_tx(db):
            db.execute(
                "INSERT INTO refresh_log (refreshed_at, dispensary_count, product_count, source) VALUES (?, ?, ?, ?)",
                (now, disp_count, prod_count, "refresh-no-new-data"),
            )
        invalidate_hot_caches()
        return {
            "status": "warning",
            "warning": "Refresh completed but no new local dispensaries found. Existing data was preserved.",
            "dispensaryCount": disp_count,
            "productCount": prod_count,
            "detailPagesFetched": detail_pages_fetched,
            "detailSupplements": detail_supplement_count,
        }

    if refresh_result_looks_suspicious(existing_disp_count, existing_product_count, local_dispensaries):
        preserved_disp_count = existing_disp_count
        preserved_product_count = existing_product_count
        parsed_disp_count = len(local_dispensaries)
        parsed_product_count = sum(len(d.get("products", [])) for d in local_dispensaries)

        with db_tx(db):
            db.execute(
                "INSERT INTO refresh_log (refreshed_at, dispensary_count, product_count, source) VALUES (?, ?, ?, ?)",
                (now, preserved_disp_count, preserved_product_count, "refresh-suspicious-shrink"),
            )

        log.warning(
            "Preserved existing dataset after suspicious refresh shrink (existing_disps=%s new_disps=%s existing_products=%s new_products=%s)",
            preserved_disp_count,
            parsed_disp_count,
            preserved_product_count,
            parsed_product_count,
        )
        invalidate_hot_caches()
        return {
            "status": "warning",
            "warning": "Refresh looked incomplete, so the tracker preserved the previous dataset instead of replacing it.",
            "dispensaryCount": preserved_disp_count,
            "productCount": preserved_product_count,
            "parsedDispensaryCount": parsed_disp_count,
            "parsedProductCount": parsed_product_count,
            "detailPagesFetched": detail_pages_fetched,
            "detailSupplements": detail_supplement_count,
        }

    # Transactional refresh.
    with db_tx(db):
        db.execute("DELETE FROM products")
        db.execute("DELETE FROM dispensaries")

        for dispensary in local_dispensaries:
            existing_lat = dispensary.get("lat")
            existing_lng = dispensary.get("lng")
            existing_dist = dispensary.get("distance")

            if existing_lat is not None and existing_lng is not None:
                lat, lng = existing_lat, existing_lng
                dist = existing_dist if existing_dist is not None else haversine_miles(CENTER_LAT, CENTER_LNG, lat, lng)
            else:
                coords = lookup_coords(dispensary["name"], dispensary.get("address", ""))
                if coords:
                    lat, lng = coords["lat"], coords["lng"]
                    dist = haversine_miles(CENTER_LAT, CENTER_LNG, lat, lng)
                else:
                    lat, lng = None, None
                    dist = estimate_distance_from_address(dispensary.get("address", ""))
                    if dist is None:
                        dist = MAX_DISTANCE_MI

            cur = db.execute(
                """INSERT INTO dispensaries (name, address, lat, lng, distance, drop_date, drop_url, menu_url, menu_type)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    dispensary["name"],
                    dispensary.get("address"),
                    lat,
                    lng,
                    dist,
                    dispensary.get("dropDate"),
                    dispensary.get("dropUrl"),
                    dispensary.get("menuUrl"),
                    infer_menu_type(dispensary.get("name"), dispensary.get("products", []), existing=dispensary.get("menuType")),
                ),
            )
            disp_id = cur.lastrowid

            for product in dispensary.get("products", []):
                db.execute(
                    """INSERT INTO products (dispensary_id, strain, size, price, type, thc)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (disp_id, product.get("strain"), product.get("size"), product.get("price"), product.get("type"), product.get("thc")),
                )

            record_prices(db, dispensary["name"], dispensary.get("products", []), recorded_at=now)

        disp_count = int(_sql_scalar(db, "SELECT COUNT(*) FROM dispensaries") or 0)
        prod_count = int(_sql_scalar(db, "SELECT COUNT(*) FROM products") or 0)

        db.execute(
            "INSERT INTO refresh_log (refreshed_at, dispensary_count, product_count, source) VALUES (?, ?, ?, ?)",
            (now, disp_count, prod_count, "refresh"),
        )

    invalidate_hot_caches()
    return {
        "status": "ok",
        "dispensaryCount": disp_count,
        "productCount": prod_count,
        "detailPagesFetched": detail_pages_fetched,
        "detailSupplements": detail_supplement_count,
    }


async def scrape_menus(db: sqlite3.Connection) -> dict[str, Any]:
    """Fetch live prices from dispensary menus and merge into the DB."""

    log.info("Starting menu collection…")
    results: dict[str, Any] = {
        "updated": 0,
        "api_hits": 0,
        "hardcoded_hits": 0,
        "matchedLiveProducts": 0,
        "unmatchedLiveProducts": 0,
        "errors": [],
        "warnings": [],
        "matchedStores": [],
    }

    try:
        live_prices, fetch_errors = await fetch_all_menus_with_meta()
        if fetch_errors:
            results["errors"].extend(fetch_errors)
    except Exception as e:
        log.error("Menu fetch failed: %s", e)
        results["errors"].append(str(e))
        live_prices = {}

    if not live_prices:
        results["warnings"].append("No live menu prices were returned; fallback pricing may be the only source for this run.")

    now = utc_now_iso()

    with db_tx(db):
        dispensaries = db.execute("SELECT id, name, address FROM dispensaries").fetchall()

        for dispensary in dispensaries:
            disp_id = int(dispensary["id"])
            disp_name = dispensary["name"]
            disp_addr = dispensary["address"] or ""

            matched_live_name, matched_live = select_live_products_for_dispensary(live_prices, disp_name)

            if matched_live:
                db_products = db.execute(
                    "SELECT id, strain, size, price, type FROM products WHERE dispensary_id = ?",
                    (disp_id,),
                ).fetchall()

                exact_index: dict[tuple[str, str, str], list[sqlite3.Row]] = {}
                fallback_index: dict[tuple[str, str], list[sqlite3.Row]] = {}

                for row in db_products:
                    exact_key = listing_key(row["strain"], row["size"], row["type"])
                    fallback_key = (str(row["size"] or "").strip().lower(), str(row["type"] or "").strip().upper())
                    exact_index.setdefault(exact_key, []).append(row)
                    fallback_index.setdefault(fallback_key, []).append(row)

                seen_live: set[tuple[str, str, str, float]] = set()

                for live_prod in matched_live:
                    price = live_prod.get("price")
                    if price is None:
                        continue

                    try:
                        price_f = float(price)
                    except Exception:
                        continue

                    live_key = (
                        normalise_strain_key(live_prod.get("strain", "")),
                        str(live_prod.get("size") or "").strip().lower(),
                        str(live_prod.get("type") or "").strip().upper(),
                        price_f,
                    )

                    if live_key in seen_live:
                        continue
                    seen_live.add(live_key)

                    match_key = live_key[:3]
                    matches = list(exact_index.get(match_key, []))

                    if not matches:
                        fallback_matches = fallback_index.get((live_key[1], live_key[2]), [])
                        if len(fallback_matches) == 1:
                            matches = list(fallback_matches)

                    if not matches:
                        results["unmatchedLiveProducts"] += 1
                        continue

                    results["matchedLiveProducts"] += len(matches)

                    for match in matches:
                        current_price = match["price"]
                        if current_price is not None:
                            try:
                                if float(current_price) == price_f:
                                    continue
                            except Exception:
                                pass

                        db.execute("UPDATE products SET price = ? WHERE id = ?", (price_f, match["id"]))
                        record_price_point_if_changed(
                            db,
                            disp_name,
                            match["strain"],
                            match["size"],
                            price_f,
                            match["type"],
                            recorded_at=now,
                        )
                        results["updated"] += 1

                results["api_hits"] += 1
                if matched_live_name and matched_live_name not in results["matchedStores"]:
                    results["matchedStores"].append(matched_live_name)

            fallback = backfill_known_prices_for_dispensary(
                db,
                dispensary_id=disp_id,
                dispensary_name=disp_name,
                dispensary_address=disp_addr,
                recorded_at=now,
            )
            if fallback["updated"]:
                results["hardcoded_hits"] += fallback["updated"]
                results["updated"] += fallback["updated"]

        disp_count = int(_sql_scalar(db, "SELECT COUNT(*) FROM dispensaries") or 0)
        prod_count = int(_sql_scalar(db, "SELECT COUNT(*) FROM products") or 0)
        priced_count = int(_sql_scalar(db, "SELECT COUNT(*) FROM products WHERE price IS NOT NULL") or 0)

        db.execute(
            "INSERT INTO refresh_log (refreshed_at, dispensary_count, product_count, source) VALUES (?, ?, ?, ?)",
            (now, disp_count, prod_count, f"menu-scrape (priced:{priced_count})"),
        )

        results["totalProducts"] = prod_count
        results["pricedProducts"] = priced_count
        results["dispensaryCount"] = disp_count

    if results["errors"] and not results["updated"]:
        results["status"] = "warning"
    elif results["warnings"] or results["errors"]:
        results["status"] = "warning"
    else:
        results["status"] = "ok"

    invalidate_hot_caches()
    log.info("Menu collection done: %s", results)
    return results


# ──────────────────────────────────────────────────────────────────────────────
# FastAPI wiring
# ──────────────────────────────────────────────────────────────────────────────


def get_db_dep():
    db = connect_db()
    try:
        yield db
    finally:
        db.close()


def is_production_env() -> bool:
    return SETTINGS.app_env in {"prod", "production"}


def admin_actions_enabled() -> bool:
    return not is_production_env() or bool(SETTINGS.admin_api_token)


def require_admin_api_access(request: Request) -> None:
    if not is_production_env():
        return
    if not SETTINGS.admin_api_token:
        raise HTTPException(status_code=503, detail=ADMIN_ACTIONS_DISABLED_MESSAGE)

    auth_header = request.headers.get("Authorization", "")
    scheme, _, token = auth_header.partition(" ")
    if scheme.lower() != "bearer" or not token or not secrets.compare_digest(token.strip(), SETTINGS.admin_api_token):
        raise HTTPException(status_code=401, detail="Missing or invalid admin bearer token.")


async def periodic_scrape_loop(stop_event: asyncio.Event) -> None:
    """Periodic scheduler loop (safe with DB locks so multiple workers won't collide)."""

    # initial delay
    try:
        await asyncio.wait_for(stop_event.wait(), timeout=SETTINGS.scheduler_initial_delay_seconds)
        return
    except asyncio.TimeoutError:
        pass

    while not stop_event.is_set():
        try:
            db = connect_db()
            try:
                ctx = try_begin_job(db, "scheduled-scrape")
                if ctx:
                    heartbeat_task: asyncio.Task | None = None
                    try:
                        heartbeat_task = asyncio.create_task(job_lock_heartbeat(ctx))
                        result = await scrape_menus(db)
                        finish_job(db, ctx, result=result)
                    except Exception as e:
                        log.error("Scheduled scrape failed: %s", e)
                        finish_job(db, ctx, error=str(e))
                    finally:
                        if heartbeat_task is not None:
                            heartbeat_task.cancel()
                            try:
                                await heartbeat_task
                            except asyncio.CancelledError:
                                pass
                else:
                    log.info("Scheduled scrape skipped (another job is active)")
            finally:
                db.close()
        except Exception as e:
            log.error("Scheduler loop error: %s", e)

        # wait until next interval or stop
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=SETTINGS.scheduler_interval_seconds)
            return
        except asyncio.TimeoutError:
            continue


async def bootstrap_if_empty() -> None:
    """If DB is empty, attempt to pull fresh data (lock-safe)."""
    try:
        db = connect_db()
        try:
            init_db(db)
            count = int(_sql_scalar(db, "SELECT COUNT(*) FROM dispensaries") or 0)
            if count > 0:
                return
            if is_production_env() and not SETTINGS.auto_bootstrap_if_empty:
                log.info("Production boot detected an empty DB; auto-bootstrap is disabled, so the app will remain read-only until data is loaded.")
                return

            ctx = try_begin_job(db, "bootstrap")
            if not ctx:
                return

            heartbeat_task: asyncio.Task | None = None
            try:
                heartbeat_task = asyncio.create_task(job_lock_heartbeat(ctx))
                refresh_result = await refresh_data(db)
                scrape_result = await scrape_menus(db)
                finish_job(db, ctx, result={"status": scrape_result.get("status", refresh_result.get("status", "ok")), "refresh": refresh_result, "scrape": scrape_result})
                log.info("Bootstrap completed")
            except Exception as e:
                log.error("Bootstrap failed: %s", e)
                finish_job(db, ctx, error=str(e))
            finally:
                if heartbeat_task is not None:
                    heartbeat_task.cancel()
                    try:
                        await heartbeat_task
                    except asyncio.CancelledError:
                        pass
        finally:
            db.close()
    except Exception as e:
        log.error("Bootstrap wrapper failed: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure schema exists and clean stale job state from previous runs.
    db = connect_db()
    try:
        init_db(db)
        cleanup = cleanup_stale_jobs(db, include_foreign_hosts=True)
        if cleanup["locksRemoved"] or cleanup["runsRepaired"]:
            log.info(
                "Recovered stale job state (locks_removed=%s runs_repaired=%s)",
                cleanup["locksRemoved"],
                cleanup["runsRepaired"],
            )
        seed_db_if_available(db)
        metadata_updates = backfill_known_store_metadata(db)
        if metadata_updates:
            log.info("Backfilled known store metadata for %s dispensaries", metadata_updates)
    finally:
        db.close()

    # Optional one-time bootstrap.
    if SETTINGS.auto_bootstrap_if_empty:
        asyncio.create_task(bootstrap_if_empty())

    # Optional scheduler.
    stop_event = asyncio.Event()
    app.state.scheduler_stop = stop_event
    app.state.scheduler_task = None

    if SETTINGS.scheduler_enabled:
        log.info(
            "Scheduler enabled (initial_delay=%ss interval=%ss)",
            SETTINGS.scheduler_initial_delay_seconds,
            SETTINGS.scheduler_interval_seconds,
        )
        app.state.scheduler_task = asyncio.create_task(periodic_scrape_loop(stop_event))
    else:
        log.info("Scheduler disabled")

    log.info(
        "Runtime config: env=%s db_path=%s scheduler=%s admin_actions=%s built_frontend=%s auto_bootstrap_if_empty=%s",
        SETTINGS.app_env,
        SETTINGS.db_path,
        "enabled" if SETTINGS.scheduler_enabled else "disabled",
        "enabled" if admin_actions_enabled() else "disabled",
        "present" if built_frontend_ready() else "missing",
        SETTINGS.auto_bootstrap_if_empty,
    )

    yield

    # Shutdown
    stop_event.set()
    task = getattr(app.state, "scheduler_task", None)
    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(lifespan=lifespan)

# Compression helps a lot for /api/data and /api/price-history.
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Trusted hosts is optional (recommended behind a proxy).
if SETTINGS.trusted_hosts:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=SETTINGS.trusted_hosts)

# CORS: keep permissive defaults for local dev, configurable for production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=SETTINGS.cors_origins,
    allow_methods=["*"] if SETTINGS.cors_origins == ["*"] else ["GET", "POST", "OPTIONS"],
    allow_headers=["*"] if SETTINGS.cors_origins == ["*"] else ["Content-Type", "Authorization"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)

    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
    response.headers.setdefault("Content-Security-Policy", CONTENT_SECURITY_POLICY)
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    response.headers.setdefault("Cross-Origin-Resource-Policy", "same-origin")

    return response


# ──────────────────────────────────────────────────────────────────────────────
# Health endpoints
# ──────────────────────────────────────────────────────────────────────────────


@app.get("/healthz", include_in_schema=False)
def healthz():
    return {"status": "ok"}


@app.get("/readyz", include_in_schema=False)
def readyz(db: sqlite3.Connection = Depends(get_db_dep)):
    try:
        init_db(db)
        _ = db.execute("SELECT 1").fetchone()
        if is_production_env() and not built_frontend_ready():
            raise RuntimeError("Built frontend assets are missing.")
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


# ──────────────────────────────────────────────────────────────────────────────
# API endpoints
# ──────────────────────────────────────────────────────────────────────────────


def get_price_history_rows(
    db: sqlite3.Connection,
    *,
    limit: int = 500,
    size: str | None = None,
    type: str | None = None,
    strain: str | None = None,
) -> list[dict[str, Any]]:
    safe_limit = max(0, min(limit, 2000))
    if safe_limit == 0:
        return []
    clauses: list[str] = []
    params: list[Any] = []

    if size:
        clauses.append("size = ?")
        params.append(size)
    if type:
        clauses.append("UPPER(type) = ?")
        params.append(type.upper())
    if strain:
        clauses.append("LOWER(strain) LIKE ?")
        params.append(f"%{strain.lower()}%")

    where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    rows = db.execute(
        f"""
        SELECT dispensary_name, strain, size, price, type, recorded_at
        FROM price_history
        {where_sql}
        ORDER BY recorded_at DESC, id DESC
        LIMIT ?
        """,
        (*params, safe_limit),
    ).fetchall()

    return [
        {
            "dispensary": row["dispensary_name"],
            "strain": row["strain"],
            "size": row["size"],
            "price": row["price"],
            "type": row["type"],
            "recordedAt": row["recorded_at"],
        }
        for row in rows
    ]


def get_last_activity_row(db: sqlite3.Connection) -> sqlite3.Row | None:
    return db.execute(
        "SELECT refreshed_at, source FROM refresh_log ORDER BY id DESC LIMIT 1"
    ).fetchone()


def get_last_refresh_row(db: sqlite3.Connection) -> sqlite3.Row | None:
    return db.execute(
        """
        SELECT refreshed_at, source
        FROM refresh_log
        WHERE source = 'seed' OR source = 'refresh' OR source LIKE 'refresh-%'
        ORDER BY id DESC
        LIMIT 1
        """
    ).fetchone()


def get_last_scrape_row(db: sqlite3.Connection) -> sqlite3.Row | None:
    return db.execute(
        "SELECT refreshed_at, source FROM refresh_log WHERE source LIKE 'menu-scrape%' ORDER BY id DESC LIMIT 1"
    ).fetchone()


def get_last_successful_refresh_row(db: sqlite3.Connection) -> sqlite3.Row | None:
    return db.execute(
        """
        SELECT refreshed_at, source
        FROM refresh_log
        WHERE source IN ('seed', 'refresh')
        ORDER BY id DESC
        LIMIT 1
        """
    ).fetchone()


def get_scrape_status_payload(db: sqlite3.Connection) -> dict[str, Any]:
    last_scrape = get_last_scrape_row(db)
    priced = int(_sql_scalar(db, "SELECT COUNT(*) FROM products WHERE price IS NOT NULL") or 0)
    total = int(_sql_scalar(db, "SELECT COUNT(*) FROM products") or 0)
    last_source = last_scrape["source"] if last_scrape else None

    return {
        "lastScrape": last_scrape["refreshed_at"] if last_scrape else None,
        "lastSource": last_source,
        "lastSourceKind": source_kind(last_source),
        "pricedProducts": priced,
        "totalProducts": total,
        "priceCoverage": round(100 * priced / total) if total > 0 else 0,
        "schedulerEnabled": SETTINGS.scheduler_enabled,
    }


def get_status_payload(db: sqlite3.Connection) -> dict[str, Any]:
    last_activity = get_last_activity_row(db)
    last_refresh = get_last_refresh_row(db)
    last_scrape = get_last_scrape_row(db)
    last_successful_refresh = get_last_successful_refresh_row(db)
    last_activity_source = last_activity["source"] if last_activity else None
    last_refresh_source = last_refresh["source"] if last_refresh else None
    last_scrape_source = last_scrape["source"] if last_scrape else None
    last_successful_refresh_source = last_successful_refresh["source"] if last_successful_refresh else None

    disp_count = int(_sql_scalar(db, "SELECT COUNT(*) FROM dispensaries") or 0)
    prod_count = int(_sql_scalar(db, "SELECT COUNT(*) FROM products") or 0)
    priced_count = int(_sql_scalar(db, "SELECT COUNT(*) FROM products WHERE price IS NOT NULL") or 0)

    active_jobs = get_active_jobs(db)
    recent_failure = db.execute(
        """
        SELECT job_name, error, finished_at
        FROM job_runs
        WHERE status = 'error'
        ORDER BY id DESC
        LIMIT 1
        """
    ).fetchone()
    recent_warning = db.execute(
        """
        SELECT refreshed_at, source
        FROM refresh_log
        WHERE source IN ('refresh-no-new-data', 'refresh-suspicious-shrink')
        ORDER BY id DESC
        LIMIT 1
        """
    ).fetchone()

    warning_message_map = {
        "refresh-no-new-data": "Refresh returned no local dispensaries, so the previous dataset was preserved.",
        "refresh-suspicious-shrink": "Refresh looked incomplete, so the previous dataset was preserved instead of being replaced.",
    }

    recent_warning_payload = None
    if recent_warning:
        warning_is_stale = False
        if last_successful_refresh and parse_iso(last_successful_refresh["refreshed_at"]) > parse_iso(recent_warning["refreshed_at"]):
            warning_is_stale = True
        if not warning_is_stale:
            recent_warning_payload = {
                "source": recent_warning["source"],
                "message": warning_message_map.get(recent_warning["source"], recent_warning["source"]),
                "recordedAt": recent_warning["refreshed_at"],
            }

    return {
        "status": "ok",
        "env": SETTINGS.app_env,
        "dbPath": str(SETTINGS.db_path) if SETTINGS.app_env not in {"prod", "production"} else None,
        "radiusMiles": MAX_DISTANCE_MI,
        "lastActivity": last_activity["refreshed_at"] if last_activity else None,
        "lastActivitySource": last_activity_source,
        "lastActivityKind": source_kind(last_activity_source),
        "lastRefresh": last_refresh["refreshed_at"] if last_refresh else None,
        "lastRefreshSource": last_refresh_source,
        "lastRefreshKind": source_kind(last_refresh_source),
        "lastScrape": last_scrape["refreshed_at"] if last_scrape else None,
        "lastScrapeSource": last_scrape_source,
        "lastScrapeKind": source_kind(last_scrape_source),
        "lastSuccessfulRefresh": last_successful_refresh["refreshed_at"] if last_successful_refresh else None,
        "lastSuccessfulRefreshSource": last_successful_refresh_source,
        "lastSuccessfulRefreshKind": source_kind(last_successful_refresh_source),
        "dispensaryCount": disp_count,
        "productCount": prod_count,
        "pricedProducts": priced_count,
        "priceCoverage": round(100 * priced_count / prod_count) if prod_count > 0 else 0,
        "schedulerEnabled": SETTINGS.scheduler_enabled,
        "adminActionsEnabled": admin_actions_enabled(),
        "adminActionsConfigured": bool(SETTINGS.admin_api_token),
        "adminActionsMessage": None if admin_actions_enabled() else ADMIN_ACTIONS_DISABLED_MESSAGE,
        "activeJobs": active_jobs,
        "jobRunning": len(active_jobs) > 0,
        "activeJob": active_jobs[0]["job"] if active_jobs else None,
        "jobStartedAt": active_jobs[0]["startedAt"] if active_jobs else None,
        "jobOwner": active_jobs[0]["owner"] if active_jobs else None,
        "lastError": {
            "job": recent_failure["job_name"],
            "message": recent_failure["error"],
            "finishedAt": recent_failure["finished_at"],
        } if recent_failure else None,
        "lastWarning": recent_warning_payload,
    }


def get_dashboard_payload(
    db: sqlite3.Connection,
    *,
    history_limit: int = 1500,
    job_limit: int = 12,
) -> dict[str, Any]:
    return {
        "serverTime": utc_now_iso(),
        "data": get_all_data(db),
        "stats": get_stats(db),
        "scrapeStatus": get_scrape_status_payload(db),
        "status": get_status_payload(db),
        "history": get_price_history_rows(db, limit=history_limit),
        "jobs": get_recent_job_runs(db, limit=job_limit),
    }


@app.get("/api/data")
def api_data(db: sqlite3.Connection = Depends(get_db_dep)):
    cached = CACHE.get("data")
    if cached is not None:
        return cached
    value = get_all_data(db)
    CACHE.set("data", value)
    return value


@app.get("/api/stats")
def api_stats(db: sqlite3.Connection = Depends(get_db_dep)):
    cached = CACHE.get("stats")
    if cached is not None:
        return cached
    value = get_stats(db)
    CACHE.set("stats", value)
    return value


@app.get("/api/scrape-status")
def api_scrape_status(db: sqlite3.Connection = Depends(get_db_dep)):
    cached = CACHE.get("scrape_status")
    if cached is not None:
        return cached
    value = get_scrape_status_payload(db)
    CACHE.set("scrape_status", value)
    return value


@app.get("/api/status")
def api_status(db: sqlite3.Connection = Depends(get_db_dep)):
    cached = CACHE.get("status")
    if cached is not None:
        return cached
    value = get_status_payload(db)
    CACHE.set("status", value)
    return value


@app.get("/api/jobs")
def api_jobs(limit: int = 20, db: sqlite3.Connection = Depends(get_db_dep)):
    safe_limit = max(0, min(int(limit), 100))
    cache_key = f"jobs:{safe_limit}"
    cached = CACHE.get(cache_key)
    if cached is not None:
        return cached

    value = {"jobs": get_recent_job_runs(db, limit=safe_limit)}
    CACHE.set(cache_key, value)
    return value


@app.get("/api/dashboard")
def api_dashboard(
    history_limit: int = 1500,
    job_limit: int = 12,
    db: sqlite3.Connection = Depends(get_db_dep),
):
    cache_key = f"dashboard:{max(0, min(history_limit, 2000))}:{max(0, min(job_limit, 100))}"
    cached = CACHE.get(cache_key)
    if cached is not None:
        return cached

    value = get_dashboard_payload(db, history_limit=history_limit, job_limit=job_limit)
    CACHE.set(cache_key, value)
    return value


@app.post("/api/refresh")
async def api_refresh(request: Request):
    require_admin_api_access(request)
    return await run_locked_job("refresh", refresh_data)


@app.post("/api/sync")
async def api_sync(request: Request):
    require_admin_api_access(request)

    async def worker(db: sqlite3.Connection) -> dict[str, Any]:
        refresh_result = await refresh_data(db)
        scrape_result = await scrape_menus(db)
        statuses = [refresh_result.get("status", "ok"), scrape_result.get("status", "ok")]
        if any(status == "error" for status in statuses):
            status = "error"
        elif any(status == "warning" for status in statuses):
            status = "warning"
        else:
            status = "ok"

        return {
            "status": status,
            "refresh": refresh_result,
            "scrape": scrape_result,
            "dispensaryCount": refresh_result.get("dispensaryCount"),
            "productCount": refresh_result.get("productCount"),
            "pricedProducts": scrape_result.get("pricedProducts"),
            "totalProducts": scrape_result.get("totalProducts"),
        }

    return await run_locked_job("sync", worker)


@app.post("/api/scrape")
async def api_scrape(request: Request):
    require_admin_api_access(request)
    return await run_locked_job("scrape", scrape_menus)


@app.get("/api/price-history")
def api_price_history(
    limit: int = 500,
    size: str | None = None,
    type: str | None = None,
    strain: str | None = None,
    db: sqlite3.Connection = Depends(get_db_dep),
):
    safe_limit = max(0, min(int(limit), 2000))
    safe_size = str(size or "").strip()
    safe_type = str(type or "").strip().upper()
    safe_strain = str(strain or "").strip().lower()
    cache_key = f"price_history:{safe_limit}:{safe_size}:{safe_type}:{safe_strain}"
    cached = CACHE.get(cache_key)
    if cached is not None:
        return cached

    value = get_price_history_rows(db, limit=safe_limit, size=safe_size or None, type=safe_type or None, strain=safe_strain or None)
    CACHE.set(cache_key, value)
    return value


# ──────────────────────────────────────────────────────────────────────────────
# Frontend file serving
# ──────────────────────────────────────────────────────────────────────────────


def built_frontend_ready() -> bool:
    return (BUILT_FRONTEND_DIR / "index.html").exists()


def serve_built_frontend_file(
    request: Request,
    *,
    name: str,
    media_type: str | None = None,
    cache_seconds: int = 0,
) -> Response:
    return serve_frontend_file(
        request,
        BUILT_FRONTEND_DIR,
        app_env=SETTINGS.app_env,
        name=name,
        media_type=media_type,
        cache_seconds=cache_seconds,
    )


def serve_legacy_frontend_file(
    request: Request,
    *,
    name: str,
    media_type: str | None = None,
    cache_seconds: int = 0,
) -> Response:
    return serve_frontend_file(
        request,
        LEGACY_FRONTEND_DIR,
        app_env=SETTINGS.app_env,
        name=name,
        media_type=media_type,
        cache_seconds=cache_seconds,
    )


def legacy_index_html() -> str:
    html = (LEGACY_FRONTEND_DIR / "index.html").read_text(encoding="utf-8")
    replacements = {
        'href="base.css"': 'href="/legacy/base.css"',
        'href="style.css"': 'href="/legacy/style.css"',
        'href="/styles/polish.css"': 'href="/legacy/styles/polish.css"',
        'src="/js/runtime-helpers.js"': 'src="/legacy/js/runtime-helpers.js"',
        'src="/js/status-helpers.js"': 'src="/legacy/js/status-helpers.js"',
        'src="app.js"': 'src="/legacy/app.js"',
    }
    for source, target in replacements.items():
        html = html.replace(source, target)
    return html


@app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
def app_root(request: Request):
    if built_frontend_ready():
        return serve_built_frontend_file(request, name="index.html")
    return Response(legacy_index_html(), media_type="text/html")


@app.api_route("/index.html", methods=["GET", "HEAD"], include_in_schema=False)
def app_index_html(request: Request):
    if built_frontend_ready():
        return serve_built_frontend_file(request, name="index.html")
    return Response(legacy_index_html(), media_type="text/html")


@app.api_route("/404.html", methods=["GET", "HEAD"], include_in_schema=False)
def app_404_html(request: Request):
    if built_frontend_ready():
        return serve_built_frontend_file(request, name="404.html", cache_seconds=300)
    return Response(legacy_index_html(), media_type="text/html")


@app.api_route("/index.txt", methods=["GET", "HEAD"], include_in_schema=False)
def app_index_txt(request: Request):
    return serve_built_frontend_file(
        request,
        name="index.txt",
        media_type="text/plain; charset=utf-8",
        cache_seconds=0,
    )


@app.api_route("/_not-found.txt", methods=["GET", "HEAD"], include_in_schema=False)
def app_not_found_txt(request: Request):
    return serve_built_frontend_file(
        request,
        name="_not-found.txt",
        media_type="text/plain; charset=utf-8",
        cache_seconds=0,
    )


@app.api_route("/_not-found.html", methods=["GET", "HEAD"], include_in_schema=False)
def app_not_found_html(request: Request):
    return serve_built_frontend_file(
        request,
        name="_not-found.html",
        cache_seconds=300,
    )


@app.api_route("/_not-found/{asset_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
def app_not_found_assets(asset_path: str, request: Request):
    return serve_built_frontend_file(
        request,
        name=f"_not-found/{asset_path}",
        media_type="text/plain; charset=utf-8" if asset_path.endswith(".txt") else None,
        cache_seconds=0,
    )


@app.api_route("/__next.{asset_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
def app_next_export_manifest(asset_path: str, request: Request):
    return serve_built_frontend_file(
        request,
        name=f"__next.{asset_path}",
        media_type="text/plain; charset=utf-8",
        cache_seconds=0,
    )


@app.api_route("/_next/{asset_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
def app_next_assets(asset_path: str, request: Request):
    return serve_built_frontend_file(
        request,
        name=f"_next/{asset_path}",
        cache_seconds=31536000,
    )


@app.api_route("/assets/{asset_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
def app_exported_assets(asset_path: str, request: Request):
    return serve_built_frontend_file(
        request,
        name=f"assets/{asset_path}",
        cache_seconds=3600,
    )


@app.api_route("/manifest.webmanifest", methods=["GET", "HEAD"], include_in_schema=False)
def app_manifest(request: Request):
    return serve_built_frontend_file(
        request,
        name="manifest.webmanifest",
        cache_seconds=300,
    )


@app.api_route("/sw.js", methods=["GET", "HEAD"], include_in_schema=False)
def app_service_worker(request: Request):
    return serve_built_frontend_file(
        request,
        name="sw.js",
        cache_seconds=0,
    )


@app.api_route("/workbox-{asset_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
def app_workbox_asset(asset_path: str, request: Request):
    return serve_built_frontend_file(
        request,
        name=f"workbox-{asset_path}",
        cache_seconds=31536000,
    )


@app.api_route("/offline.html", methods=["GET", "HEAD"], include_in_schema=False)
def app_offline_html(request: Request):
    return serve_built_frontend_file(
        request,
        name="offline.html",
        cache_seconds=300,
    )


@app.api_route("/apple-touch-icon.png", methods=["GET", "HEAD"], include_in_schema=False)
def app_apple_touch_icon(request: Request):
    return serve_built_frontend_file(
        request,
        name="apple-touch-icon.png",
        cache_seconds=31536000,
    )


@app.api_route("/screenshots/{asset_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
def app_screenshot_assets(asset_path: str, request: Request):
    return serve_built_frontend_file(
        request,
        name=f"screenshots/{asset_path}",
        cache_seconds=31536000,
    )


@app.api_route("/legacy", methods=["GET", "HEAD"], include_in_schema=False)
@app.api_route("/legacy/", methods=["GET", "HEAD"], include_in_schema=False)
@app.api_route("/legacy/index.html", methods=["GET", "HEAD"], include_in_schema=False)
def app_legacy_index(request: Request):
    return Response(legacy_index_html(), media_type="text/html")


@app.api_route("/app.js", methods=["GET", "HEAD"], include_in_schema=False)
def app_js(request: Request):
    return serve_legacy_frontend_file(
        request,
        name="app.js",
        media_type="application/javascript",
        cache_seconds=3600,
    )


@app.api_route("/style.css", methods=["GET", "HEAD"], include_in_schema=False)
def app_style_css(request: Request):
    return serve_legacy_frontend_file(
        request,
        name="style.css",
        media_type="text/css",
        cache_seconds=3600,
    )


@app.api_route("/base.css", methods=["GET", "HEAD"], include_in_schema=False)
def app_base_css(request: Request):
    return serve_legacy_frontend_file(
        request,
        name="base.css",
        media_type="text/css",
        cache_seconds=3600,
    )


@app.api_route("/js/{asset_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
def app_js_assets(asset_path: str, request: Request):
    return serve_legacy_frontend_file(
        request,
        name=f"js/{asset_path}",
        cache_seconds=3600,
    )


@app.api_route("/styles/{asset_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
def app_style_assets(asset_path: str, request: Request):
    return serve_legacy_frontend_file(
        request,
        name=f"styles/{asset_path}",
        cache_seconds=3600,
    )


@app.api_route("/icons/{asset_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
def app_icon_assets(asset_path: str, request: Request):
    if built_frontend_ready() and (BUILT_FRONTEND_DIR / "icons" / asset_path).exists():
        return serve_built_frontend_file(
            request,
            name=f"icons/{asset_path}",
            cache_seconds=3600,
        )
    return serve_legacy_frontend_file(
        request,
        name=f"icons/{asset_path}",
        cache_seconds=3600,
    )


@app.api_route("/legacy/app.js", methods=["GET", "HEAD"], include_in_schema=False)
def app_legacy_js(request: Request):
    return app_js(request)


@app.api_route("/legacy/style.css", methods=["GET", "HEAD"], include_in_schema=False)
def app_legacy_style_css(request: Request):
    return app_style_css(request)


@app.api_route("/legacy/base.css", methods=["GET", "HEAD"], include_in_schema=False)
def app_legacy_base_css(request: Request):
    return app_base_css(request)


@app.api_route("/legacy/js/{asset_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
def app_legacy_js_assets(asset_path: str, request: Request):
    return app_js_assets(asset_path, request)


@app.api_route("/legacy/styles/{asset_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
def app_legacy_style_assets(asset_path: str, request: Request):
    return app_style_assets(asset_path, request)


@app.get("/favicon.ico", include_in_schema=False)
def favicon(request: Request):
    if built_frontend_ready() and (BUILT_FRONTEND_DIR / "icons" / "favicon.svg").exists():
        return serve_built_frontend_file(
            request,
            name="icons/favicon.svg",
            media_type="image/svg+xml",
            cache_seconds=3600,
        )
    return serve_legacy_frontend_file(
        request,
        name="icons/favicon.svg",
        media_type="image/svg+xml",
        cache_seconds=3600,
    )


@app.get("/robots.txt", include_in_schema=False)
def robots_txt():
    # Simple default; safe to override behind a reverse proxy.
    return PlainTextResponse("User-agent: *\nDisallow: /api/\n")


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
