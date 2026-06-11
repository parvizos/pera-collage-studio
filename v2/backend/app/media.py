"""Extract embedded base64 data: URLs (images/videos) from the template into
files and replace them with /uploads/<hash>.<ext> URLs.

Uploading images/videos in the homepage builder stored them as data: URLs
inside the template JSON, bloating it to tens of MB and making every page load
download all of it. This moves them to content-addressed files served with a
long immutable cache.
"""

from __future__ import annotations

import base64
import hashlib
import re

from . import config

_DATA_URL = re.compile(r"^data:(image|video)/([a-zA-Z0-9.+-]+);base64,(.+)$", re.S)
_EXT = {
    "jpeg": "jpg", "jpg": "jpg", "png": "png", "webp": "webp", "gif": "gif",
    "svg+xml": "svg", "x-icon": "ico", "mp4": "mp4", "webm": "webm", "ogg": "ogg",
    "quicktime": "mov",
}
# Keep tiny inline data URLs as-is (avoids many tiny files / extra requests).
_MIN_BYTES = 2048


def _uploads_dir():
    d = config.DATA_ROOT / "uploads"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _save_data_url(data_url: str) -> str | None:
    m = _DATA_URL.match(data_url)
    if not m:
        return None
    subtype = m.group(2).lower()
    b64 = m.group(3)
    try:
        raw = base64.b64decode(b64, validate=False)
    except Exception:
        return None
    if len(raw) < _MIN_BYTES:
        return None
    ext = _EXT.get(subtype, "bin")
    name = f"{hashlib.sha1(raw).hexdigest()}.{ext}"
    path = _uploads_dir() / name
    if not path.exists():
        try:
            path.write_bytes(raw)
        except Exception:
            return None
    return f"/uploads/{name}"


def has_media_data_urls(obj) -> bool:
    if isinstance(obj, str):
        return obj.startswith("data:image/") or obj.startswith("data:video/")
    if isinstance(obj, list):
        return any(has_media_data_urls(x) for x in obj)
    if isinstance(obj, dict):
        return any(has_media_data_urls(v) for v in obj.values())
    return False


def extract_media(obj):
    """Return a copy of obj with large data: image/video URLs replaced by file URLs."""
    if isinstance(obj, str):
        if obj.startswith("data:image/") or obj.startswith("data:video/"):
            return _save_data_url(obj) or obj
        return obj
    if isinstance(obj, list):
        return [extract_media(x) for x in obj]
    if isinstance(obj, dict):
        return {k: extract_media(v) for k, v in obj.items()}
    return obj
