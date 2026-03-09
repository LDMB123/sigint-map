from __future__ import annotations

from pathlib import Path
import re

from fastapi import HTTPException, Request
from fastapi.responses import FileResponse, Response


MEDIA_TYPES = {
    ".css": "text/css",
    ".ico": "image/x-icon",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain",
    ".webmanifest": "application/manifest+json",
}

HASHED_ASSET_PATTERN = re.compile(r"(?:^|[-_.])[0-9a-f]{8,}(?:$|[-_.])", re.IGNORECASE)


def _file_etag(path: Path) -> str:
    stat = path.stat()
    return f'W/"{stat.st_size:x}-{int(stat.st_mtime):x}"'


def asset_media_type(path: Path) -> str | None:
    return MEDIA_TYPES.get(path.suffix.lower())


def is_immutable_asset(name: str) -> bool:
    if not name.startswith("_next/static/"):
        return False
    return bool(HASHED_ASSET_PATTERN.search(Path(name).stem))


def frontend_file(
    request: Request,
    frontend_dir: Path,
    *,
    app_env: str,
    name: str,
    media_type: str | None = None,
    cache_seconds: int = 0,
) -> Response:
    root = frontend_dir.resolve()
    path = (frontend_dir / name).resolve()
    if path != root and root not in path.parents:
        raise HTTPException(status_code=404, detail=f"Missing frontend asset: {name}")
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail=f"Missing frontend asset: {name}")

    etag = _file_etag(path)
    immutable = is_immutable_asset(name)
    cache_control = (
        f"public, max-age={int(cache_seconds)}{', immutable' if immutable else ''}"
        if cache_seconds > 0 and app_env not in {"dev", "development", "local"}
        else "no-store"
    )

    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag, "Cache-Control": cache_control})

    response = FileResponse(path, media_type=media_type or asset_media_type(path))
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = cache_control
    return response
