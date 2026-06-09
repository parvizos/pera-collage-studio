from __future__ import annotations

import base64
import binascii
import hashlib
import json
import re
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

from . import config
from .db import get_db_connection

DATA_ROOT = config.DATA_ROOT
TEMPLATES_DIR = config.TEMPLATES_DIR
TEMPLATE_FILE = config.TEMPLATE_FILE
SCENES_DIR = config.SCENES_DIR
HISTORY_DIR = config.HISTORY_DIR
HISTORY_RECORDS_DIR = config.HISTORY_RECORDS_DIR
HISTORY_IMAGES_DIR = config.HISTORY_IMAGES_DIR
HISTORY_BRANDS_DIR = config.HISTORY_BRANDS_DIR
DB_FILE = config.DB_FILE
STORE_IMAGE_BLOBS_IN_DB = config.STORE_IMAGE_BLOBS_IN_DB
TEMPLATE_ROW_ID = config.TEMPLATE_ROW_ID
STORE_DIR = config.STORE_DIR
STORE_PUBLISHED_FILE = config.STORE_PUBLISHED_FILE
STORE_SETTINGS_FILE = config.STORE_SETTINGS_FILE
STORE_ORDERS_DIR = config.STORE_ORDERS_DIR


class PayloadTooLargeError(Exception):
    def __init__(self, size: int, limit: int) -> None:
        super().__init__(f"Payload {size} bytes exceeds limit {limit} bytes")
        self.size = size
        self.limit = limit


# ---------------------------------------------------------------------------
# Generic helpers
# ---------------------------------------------------------------------------

def slugify(value: str) -> str:
    normalized = re.sub("[^a-zA-Z0-9\u0400-\u04FF]+", "-", value.strip().lower())
    normalized = normalized.strip("-")
    return normalized or "template"


def decode_data_url(data_url: str) -> tuple[bytes, str]:
    if not data_url or "," not in data_url:
        return b"", "image/png"
    header, encoded = data_url.split(",", 1)
    mime = "image/png"
    if header.startswith("data:"):
        mime = header[5:].split(";", 1)[0] or mime
    try:
        return base64.b64decode(encoded), mime
    except (ValueError, binascii.Error):
        return b"", mime


def extension_for_mime(mime: str) -> str:
    mapping = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/webp": ".webp",
        "image/png": ".png",
        "image/gif": ".gif",
    }
    return mapping.get(mime.lower(), ".jpg")


def is_safe_path(base_dir: Path, target_path: Path) -> bool:
    try:
        resolved_base = base_dir.resolve()
        resolved_target = target_path.resolve()
        return resolved_base in resolved_target.parents or resolved_base == resolved_target
    except Exception:
        return False


def to_public_data_url(path: Path) -> str:
    return f"/{path.relative_to(DATA_ROOT).as_posix()}"


THUMB_CACHE_DIR = DATA_ROOT / "cache" / "thumbs"


def get_or_create_thumbnail(src: str, width: int) -> Path | None:
    """Return a small WebP preview of a data image, generating + caching once.

    Originals are never modified — previews live under cache/thumbs and are keyed
    by source path + width + mtime, so they refresh automatically if the source
    changes. Used by the storefront grid so first paint is fast without touching
    the full-resolution originals shown on the product page.
    """
    if not src:
        return None
    target = (DATA_ROOT / src.lstrip("/")).resolve()
    if not is_safe_path(DATA_ROOT, target) or not target.is_file():
        return None
    try:
        width = max(64, min(int(width), 1400))
    except (TypeError, ValueError):
        width = 400
    try:
        mtime = int(target.stat().st_mtime)
    except OSError:
        return None
    key = hashlib.sha1(f"{target}|{width}|{mtime}".encode("utf-8")).hexdigest()
    out = THUMB_CACHE_DIR / f"{key}.webp"
    if out.exists():
        return out
    try:
        from PIL import Image

        THUMB_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with Image.open(target) as im:
            im = im.convert("RGB")
            if im.width > width:
                height = max(1, round(im.height * width / im.width))
                im = im.resize((width, height), Image.LANCZOS)
            tmp = out.with_suffix(".tmp.webp")
            im.save(tmp, "WEBP", quality=86, method=4)
            tmp.replace(out)
        return out
    except Exception:
        return None


def resolve_data_path(path_value: str | None) -> Path | None:
    if not path_value:
        return None
    target = DATA_ROOT / str(path_value).lstrip("/")
    if not is_safe_path(DATA_ROOT, target):
        return None
    return target


def read_bytes_from_data_path(path_value: str | None) -> bytes | None:
    target = resolve_data_path(path_value)
    if not target or not target.exists() or not target.is_file():
        return None
    return target.read_bytes()


def ensure_directories() -> None:
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    SCENES_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_RECORDS_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_BRANDS_DIR.mkdir(parents=True, exist_ok=True)
    DATA_ROOT.mkdir(parents=True, exist_ok=True)


def get_storage_stats() -> dict:
    disk = shutil.disk_usage(DATA_ROOT)
    db_size_bytes = DB_FILE.stat().st_size if DB_FILE.exists() else 0
    history_bytes = 0
    if HISTORY_DIR.exists():
        for file_path in HISTORY_DIR.rglob("*"):
            if file_path.is_file():
                try:
                    history_bytes += file_path.stat().st_size
                except OSError:
                    continue
    return {
        "diskFreeGb": round(disk.free / (1024**3), 2),
        "diskTotalGb": round(disk.total / (1024**3), 2),
        "historyFilesGb": round(history_bytes / (1024**3), 3),
        "databaseMb": round(db_size_bytes / (1024**2), 2),
        "imageBackupInDb": STORE_IMAGE_BLOBS_IN_DB,
        "maxRequestMb": round(config.MAX_REQUEST_BYTES / (1024**2), 1),
    }


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

def load_template_brand_ids() -> list[str]:
    if not TEMPLATE_FILE.exists():
        return []
    try:
        payload = json.loads(TEMPLATE_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    return [
        str(brand.get("id"))
        for brand in payload.get("brands", [])
        if isinstance(brand, dict) and brand.get("id")
    ]


def build_default_user(index: int = 0) -> dict:
    return {
        "id": f"user_{index + 1}",
        "name": f"employee-{index + 1:02d}",
        "pin": "1111",
        "brandIds": load_template_brand_ids()[:1],
    }


def normalize_user_record(user: dict, index: int = 0) -> dict:
    raw_name = str(user.get("name") or "").strip()
    return {
        "id": user.get("id") or f"user_{index + 1}",
        "name": raw_name or f"employee-{index + 1:02d}",
        "pin": str(user.get("pin") or "1111"),
        "brandIds": [bid for bid in (user.get("brandIds") or [user.get("brandId")]) if bid],
    }


def load_users() -> list[dict]:
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT id, name, pin, brand_ids FROM users ORDER BY created_at, name"
        ).fetchall()
    users: list[dict] = []
    for index, row in enumerate(rows):
        try:
            brand_ids = json.loads(row["brand_ids"] or "[]")
        except json.JSONDecodeError:
            brand_ids = []
        users.append(
            normalize_user_record(
                {
                    "id": row["id"],
                    "name": row["name"],
                    "pin": row["pin"],
                    "brandIds": brand_ids if isinstance(brand_ids, list) else [],
                },
                index,
            )
        )
    return users


def save_users(users: list[dict]) -> list[dict]:
    normalized = [normalize_user_record(user, index) for index, user in enumerate(users)]
    if not normalized:
        normalized = [build_default_user(0)]
    with get_db_connection() as conn:
        conn.execute("DELETE FROM users")
        conn.executemany(
            "INSERT INTO users (id, name, pin, brand_ids) VALUES (?, ?, ?, ?)",
            [
                (u["id"], u["name"], u["pin"], json.dumps(u["brandIds"], ensure_ascii=False))
                for u in normalized
            ],
        )
        conn.commit()
    return normalized


def bootstrap_users_from_template_if_needed() -> None:
    with get_db_connection() as conn:
        count = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
    if count:
        return
    if TEMPLATE_FILE.exists():
        try:
            payload = json.loads(TEMPLATE_FILE.read_text(encoding="utf-8"))
            template_users = payload.get("users") or []
        except (OSError, json.JSONDecodeError):
            template_users = []
        if template_users:
            save_users(template_users)
            return
    save_users([build_default_user(0)])


def ensure_default_users() -> list[dict]:
    users = load_users()
    if users:
        brand_ids = load_template_brand_ids()
        if brand_ids:
            changed = False
            repaired: list[dict] = []
            for user in users:
                valid = [bid for bid in user.get("brandIds", []) if bid in brand_ids]
                if valid:
                    repaired.append({**user, "brandIds": valid})
                    continue
                changed = True
                repaired.append({**user, "brandIds": brand_ids[:1]})
            if changed:
                return save_users(repaired)
        return users
    return save_users([build_default_user(0)])


def verify_user_pin(user_id: str | None, pin: str | None) -> bool:
    if not user_id or not pin:
        return False
    with get_db_connection() as conn:
        row = conn.execute("SELECT pin FROM users WHERE id = ?", (user_id,)).fetchone()
    return bool(row and row["pin"] == pin)


# ---------------------------------------------------------------------------
# Template
# ---------------------------------------------------------------------------

def load_template_payload_from_db() -> dict | None:
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT payload FROM studio_template WHERE id = ?", (TEMPLATE_ROW_ID,)
        ).fetchone()
    if not row:
        return None
    try:
        payload = json.loads(row["payload"])
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def load_template_payload_from_files() -> dict | None:
    if not TEMPLATE_FILE.exists():
        return None
    try:
        payload = json.loads(TEMPLATE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    if not isinstance(payload, dict):
        return None
    template_scenes = payload.get("templateScenes")
    if isinstance(template_scenes, dict) and template_scenes:
        return payload
    if SCENES_DIR.exists():
        merged_scenes: dict = {}
        for scene_file in sorted(SCENES_DIR.glob("*.json")):
            try:
                scene_payload = json.loads(scene_file.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            scene_id = scene_payload.get("id")
            scene = scene_payload.get("scene")
            if scene_id and isinstance(scene, dict):
                merged_scenes[scene_id] = scene
        if merged_scenes:
            payload["templateScenes"] = merged_scenes
    return payload


def load_shell_admin_pin() -> str:
    db_payload = load_template_payload_from_db()
    if db_payload:
        pin = str(db_payload.get("security", {}).get("adminPin") or "").strip()
        if pin:
            return pin
    file_payload = load_template_payload_from_files()
    if file_payload:
        pin = str(file_payload.get("security", {}).get("adminPin") or "").strip()
        if pin:
            return pin
    return config.DEFAULT_ADMIN_PIN


def write_scene_files(payload: dict) -> list[str]:
    photo_templates = payload.get("photoTemplates") or []
    template_scenes = payload.get("templateScenes") or {}
    SCENES_DIR.mkdir(parents=True, exist_ok=True)
    for existing_file in SCENES_DIR.glob("*.json"):
        existing_file.unlink()
    written_files: list[str] = []
    for index, item in enumerate(photo_templates, start=1):
        template_id = item.get("id") or f"template_{index}"
        template_name = item.get("name") or f"\u0428\u0430\u0431\u043b\u043e\u043d {index}"
        scene_payload = {
            "id": template_id,
            "name": template_name,
            "scene": template_scenes.get(template_id, {}),
        }
        file_name = f"{index:02d}-{slugify(template_name)}.json"
        file_path = SCENES_DIR / file_name
        file_path.write_text(
            json.dumps(scene_payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        written_files.append(to_public_data_url(file_path))
    return written_files


def save_template_payload(payload: dict) -> dict:
    normalized = json.loads(json.dumps(payload, ensure_ascii=False))
    if "security" not in normalized:
        normalized["security"] = {}
    existing_pin = load_shell_admin_pin()
    if not normalized["security"].get("adminPin"):
        normalized["security"]["adminPin"] = existing_pin
    serialized = json.dumps(normalized, ensure_ascii=False)
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO studio_template (id, payload, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                payload = excluded.payload,
                updated_at = CURRENT_TIMESTAMP
            """,
            (TEMPLATE_ROW_ID, serialized),
        )
        conn.commit()
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    TEMPLATE_FILE.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding="utf-8")
    write_scene_files(normalized)
    return normalized


# ---------------------------------------------------------------------------
# Product codes
# ---------------------------------------------------------------------------

def extract_product_codes_from_state(state: dict | None) -> list[str]:
    codes: list[str] = []
    if not isinstance(state, dict):
        return codes
    products = state.get("products") or []
    if isinstance(products, list):
        for product in products:
            if not isinstance(product, dict):
                continue
            code = str((product.get("values") or {}).get("code") or "").strip()
            if code:
                codes.append(code)
    if not codes:
        legacy_code = str((state.get("values") or {}).get("code") or "").strip()
        if legacy_code:
            codes.append(legacy_code)
    return codes


def extract_product_codes_from_payload(payload: dict) -> list[str]:
    state = payload.get("state") or {}
    codes = extract_product_codes_from_state(state)
    if codes:
        return codes
    explicit = str(payload.get("productCode") or "").strip()
    return [explicit] if explicit and explicit not in {"collage", "\u041a\u043e\u043b\u043b\u0430\u0436"} else []


def format_product_code_label(codes: list[str]) -> str:
    if not codes:
        return "collage"
    if len(codes) == 1:
        return codes[0]
    return ", ".join(codes)


def get_product_codes_from_record(record: dict) -> list[str]:
    stored = record.get("productCodes")
    if isinstance(stored, list):
        normalized = [str(code).strip() for code in stored if str(code).strip()]
        if normalized:
            return normalized
    codes = extract_product_codes_from_state(record.get("state") or {})
    if codes:
        return codes
    legacy = str(record.get("productCode") or "").strip()
    if legacy and legacy not in {"collage", "\u041a\u043e\u043b\u043b\u0430\u0436"}:
        return [legacy]
    return []


def get_product_code_from_payload(payload: dict) -> str:
    return format_product_code_label(extract_product_codes_from_payload(payload))


def enrich_history_summary(record: dict, detail: dict | None = None) -> dict:
    enriched = dict(record)
    codes = get_product_codes_from_record(enriched)
    if not codes and detail:
        codes = extract_product_codes_from_state(detail.get("state") or {})
    if codes:
        enriched["productCodes"] = codes
        enriched["productCode"] = format_product_code_label(codes)
        enriched["productCount"] = len(codes)
    return enriched


def get_history_search_text(record: dict) -> str:
    codes = get_product_codes_from_record(record)
    parts = [
        format_product_code_label(codes),
        *codes,
        str(record.get("brandName") or ""),
        str(record.get("userName") or ""),
        str(record.get("templateName") or ""),
        str(record.get("createdAt") or ""),
    ]
    return " ".join(part for part in parts if part).lower()


# ---------------------------------------------------------------------------
# Source photos
# ---------------------------------------------------------------------------

def collage_image_api_path(record_id: str) -> str:
    return f"/api/collages/image?id={record_id}"


def collage_source_photo_api_path(record_id: str, photo_index: int) -> str:
    return f"/api/collages/source-photo?id={record_id}&index={photo_index}"


def collect_original_photos_from_payload(payload: dict) -> list[dict]:
    explicit = payload.get("originalPhotos") or []
    collected: list[dict] = []
    seen: set[int] = set()
    for item in explicit:
        if not isinstance(item, dict):
            continue
        index = item.get("index")
        data_url = item.get("dataUrl") or item.get("data_url")
        if index is None or not data_url:
            continue
        normalized_index = int(index)
        if normalized_index in seen:
            continue
        seen.add(normalized_index)
        collected.append({"index": normalized_index, "dataUrl": data_url})
    state = payload.get("state") or {}
    for index, data_url in enumerate(state.get("photos") or []):
        if not data_url or index in seen:
            continue
        seen.add(index)
        collected.append({"index": index, "dataUrl": data_url})
    return collected


def save_collage_source_photos(record_id: str, brand_slug: str, photos: list[dict]) -> list[dict]:
    if not photos:
        return []
    originals_dir = HISTORY_BRANDS_DIR / brand_slug / "originals" / record_id
    originals_dir.mkdir(parents=True, exist_ok=True)
    saved: list[dict] = []
    with get_db_connection() as conn:
        conn.execute("DELETE FROM collage_source_photos WHERE record_id = ?", (record_id,))
        for item in photos:
            index = int(item["index"])
            data_url = item.get("dataUrl") or item.get("data_url") or ""
            image_bytes, mime = decode_data_url(data_url)
            if not image_bytes:
                continue
            file_name = f"photo-{index:02d}{extension_for_mime(mime)}"
            file_path = originals_dir / file_name
            file_path.write_bytes(image_bytes)
            if not file_path.exists() or file_path.stat().st_size <= 0:
                raise OSError(f"Failed to write source photo: {file_path.name}")
            blob_for_db = image_bytes if STORE_IMAGE_BLOBS_IN_DB else b""
            conn.execute(
                """
                INSERT INTO collage_source_photos (record_id, photo_index, file_name, mime_type, image_blob)
                VALUES (?, ?, ?, ?, ?)
                """,
                (record_id, index, file_name, mime, blob_for_db),
            )
            saved.append(
                {
                    "index": index,
                    "fileName": file_name,
                    "mimeType": mime,
                    "imagePath": to_public_data_url(file_path),
                }
            )
        conn.commit()
    return saved


def load_collage_source_photos_meta(record_id: str, brand_slug: str | None = None) -> list[dict]:
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT brand_slug FROM collage_records WHERE id = ?", (record_id,)
        ).fetchone()
    resolved_brand_slug = brand_slug or (row["brand_slug"] if row else None)
    with get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT photo_index, file_name, mime_type
            FROM collage_source_photos
            WHERE record_id = ?
            ORDER BY photo_index
            """,
            (record_id,),
        ).fetchall()
    if rows:
        items: list[dict] = []
        for db_row in rows:
            file_name = db_row["file_name"]
            image_path = collage_source_photo_api_path(record_id, db_row["photo_index"])
            if resolved_brand_slug:
                file_path = HISTORY_BRANDS_DIR / resolved_brand_slug / "originals" / record_id / file_name
                if file_path.exists():
                    image_path = to_public_data_url(file_path)
            items.append(
                {
                    "index": db_row["photo_index"],
                    "fileName": file_name,
                    "mimeType": db_row["mime_type"],
                    "imagePath": image_path,
                }
            )
        return items
    return []


def load_collage_source_photo_bytes(record_id: str, photo_index: int) -> tuple[bytes, str] | None:
    with get_db_connection() as conn:
        row = conn.execute(
            """
            SELECT image_blob, mime_type, file_name, brand_slug
            FROM collage_source_photos
            JOIN collage_records ON collage_records.id = collage_source_photos.record_id
            WHERE collage_source_photos.record_id = ? AND collage_source_photos.photo_index = ?
            """,
            (record_id, photo_index),
        ).fetchone()
    if not row:
        return None
    mime = row["mime_type"] or "image/jpeg"
    brand_slug = row["brand_slug"]
    if brand_slug and row["file_name"]:
        file_path = HISTORY_BRANDS_DIR / brand_slug / "originals" / record_id / row["file_name"]
        if is_safe_path(HISTORY_DIR, file_path) and file_path.exists():
            return file_path.read_bytes(), mime
    if row["image_blob"]:
        return row["image_blob"], mime
    return None


def delete_collage_source_photos(record_id: str, brand_slug: str | None = None) -> None:
    with get_db_connection() as conn:
        conn.execute("DELETE FROM collage_source_photos WHERE record_id = ?", (record_id,))
        conn.commit()
    if brand_slug:
        originals_dir = HISTORY_BRANDS_DIR / brand_slug / "originals" / record_id
        if is_safe_path(HISTORY_DIR, originals_dir) and originals_dir.exists():
            shutil.rmtree(originals_dir, ignore_errors=True)


def apply_source_photos_to_state(state: dict, saved_sources: list[dict]) -> dict:
    normalized_state = json.loads(json.dumps(state, ensure_ascii=False))
    photos = list(normalized_state.get("photos") or [])
    max_index = max([len(photos) - 1] + [item["index"] for item in saved_sources], default=-1)
    while len(photos) <= max_index:
        photos.append(None)
    for item in saved_sources:
        photos[item["index"]] = item["imagePath"]
    normalized_state["photos"] = photos
    normalized_state["originalPhotoPaths"] = saved_sources
    return normalized_state


def enrich_detail_with_source_photos(detail: dict, record_id: str, brand_slug: str | None = None) -> dict:
    sources = load_collage_source_photos_meta(record_id, brand_slug)
    if not sources and brand_slug:
        originals_dir = HISTORY_BRANDS_DIR / brand_slug / "originals" / record_id
        if originals_dir.exists():
            for file_path in sorted(originals_dir.iterdir()):
                if not file_path.is_file():
                    continue
                match = re.match(r"photo-(\d+)", file_path.stem)
                if not match:
                    continue
                sources.append(
                    {
                        "index": int(match.group(1)),
                        "fileName": file_path.name,
                        "imagePath": to_public_data_url(file_path),
                    }
                )
    if not sources:
        return detail
    detail = dict(detail)
    detail["originalPhotos"] = sources
    state = dict(detail.get("state") or {})
    detail["state"] = apply_source_photos_to_state(state, sources)
    return detail


def collage_image_file_exists(summary: dict) -> bool:
    image_path_value = summary.get("imagePath")
    if not image_path_value:
        return False
    image_path = DATA_ROOT / str(image_path_value).lstrip("/")
    return is_safe_path(DATA_ROOT, image_path) and image_path.exists()


def apply_summary_image_path(summary: dict, image_blob: bytes | None) -> dict:
    record_id = summary.get("id")
    if image_blob and record_id and not collage_image_file_exists(summary):
        summary["imagePath"] = collage_image_api_path(record_id)
    return summary


def count_collage_source_photos(record_ids: list[str]) -> dict[str, int]:
    if not record_ids:
        return {}
    placeholders = ",".join("?" for _ in record_ids)
    with get_db_connection() as conn:
        rows = conn.execute(
            f"""
            SELECT record_id, COUNT(*) AS count
            FROM collage_source_photos
            WHERE record_id IN ({placeholders})
            GROUP BY record_id
            """,
            record_ids,
        ).fetchall()
    return {row["record_id"]: int(row["count"]) for row in rows}


def count_source_photos_on_disk(record_id: str, brand_slug: str | None) -> int:
    if not brand_slug:
        return 0
    originals_dir = HISTORY_BRANDS_DIR / brand_slug / "originals" / record_id
    if not is_safe_path(HISTORY_DIR, originals_dir) or not originals_dir.exists():
        return 0
    return sum(1 for file_path in originals_dir.iterdir() if file_path.is_file())


def attach_source_photo_counts(records: list[dict]) -> list[dict]:
    record_ids = [record.get("id") for record in records if record.get("id")]
    db_counts = count_collage_source_photos(record_ids)
    enriched: list[dict] = []
    for record in records:
        next_record = dict(record)
        record_id = next_record.get("id")
        if not record_id:
            enriched.append(next_record)
            continue
        if not next_record.get("originalPhotoCount"):
            next_record["originalPhotoCount"] = db_counts.get(record_id) or count_source_photos_on_disk(
                record_id, next_record.get("brandSlug")
            )
        enriched.append(next_record)
    return enriched


# ---------------------------------------------------------------------------
# Collage records (DB)
# ---------------------------------------------------------------------------

def upsert_collage_record(summary: dict, detail: dict, image_bytes: bytes) -> None:
    record_id = summary.get("id") or detail.get("id")
    if not record_id:
        return
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO collage_records (
                id, created_at, user_id, user_name, brand_id, brand_name, brand_slug,
                product_code, template_id, template_name, summary_json, detail_json, image_blob, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                created_at = excluded.created_at,
                user_id = excluded.user_id,
                user_name = excluded.user_name,
                brand_id = excluded.brand_id,
                brand_name = excluded.brand_name,
                brand_slug = excluded.brand_slug,
                product_code = excluded.product_code,
                template_id = excluded.template_id,
                template_name = excluded.template_name,
                summary_json = excluded.summary_json,
                detail_json = excluded.detail_json,
                image_blob = excluded.image_blob,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                record_id,
                summary.get("createdAt") or detail.get("createdAt"),
                summary.get("userId"),
                summary.get("userName"),
                summary.get("brandId"),
                summary.get("brandName"),
                summary.get("brandSlug") or slugify(summary.get("brandName") or "unknown-brand"),
                summary.get("productCode"),
                summary.get("templateId"),
                summary.get("templateName"),
                json.dumps(summary, ensure_ascii=False),
                json.dumps(detail, ensure_ascii=False),
                image_bytes,
            ),
        )
        conn.commit()


def load_collage_summaries_from_db(user_id: str | None = None) -> list[dict]:
    query = "SELECT summary_json, image_blob FROM collage_records"
    params: list = []
    if user_id:
        query += " WHERE user_id = ?"
        params.append(user_id)
    query += " ORDER BY created_at DESC"
    records: list[dict] = []
    with get_db_connection() as conn:
        rows = conn.execute(query, params).fetchall()
    for row in rows:
        try:
            summary = json.loads(row["summary_json"])
        except json.JSONDecodeError:
            continue
        summary = enrich_history_summary(summary)
        image_blob = row["image_blob"] or b""
        if image_blob:
            summary = apply_summary_image_path(summary, image_blob)
        records.append(summary)
    return attach_source_photo_counts(records)


def load_collage_detail_from_db(record_id: str, brand_slug: str | None = None, user_id: str | None = None) -> dict | None:
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT detail_json, user_id, image_blob FROM collage_records WHERE id = ?", (record_id,)
        ).fetchone()
    if not row:
        return None
    if user_id and row["user_id"] != user_id:
        return None
    try:
        detail = json.loads(row["detail_json"])
    except json.JSONDecodeError:
        return None
    if brand_slug:
        detail_slug = detail.get("brandSlug") or slugify(detail.get("brandName") or "")
        if detail_slug and detail_slug != brand_slug:
            return None
    image_blob = row["image_blob"] or b""
    if image_blob and not detail.get("imageDataUrl"):
        encoded = base64.b64encode(image_blob).decode("ascii")
        detail["imageDataUrl"] = f"data:image/png;base64,{encoded}"
    if image_blob and record_id and not collage_image_file_exists(detail):
        detail["imagePath"] = collage_image_api_path(record_id)
    return enrich_detail_with_source_photos(detail, record_id, detail.get("brandSlug") or brand_slug)


def load_collage_image_bytes(record_id: str) -> bytes | None:
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT summary_json, detail_json, image_blob FROM collage_records WHERE id = ?", (record_id,)
        ).fetchone()
    if not row:
        return None
    for json_column in ("summary_json", "detail_json"):
        try:
            payload = json.loads(row[json_column])
        except json.JSONDecodeError:
            continue
        file_bytes = read_bytes_from_data_path(payload.get("imagePath"))
        if file_bytes:
            return file_bytes
    if row["image_blob"]:
        return row["image_blob"]
    return None


def delete_collage_record_from_db(record_id: str) -> bool:
    with get_db_connection() as conn:
        cursor = conn.execute("DELETE FROM collage_records WHERE id = ?", (record_id,))
        conn.commit()
        return cursor.rowcount > 0


# ---------------------------------------------------------------------------
# History (save / query / detail / delete)
# ---------------------------------------------------------------------------

def save_history_record(payload: dict) -> dict:
    HISTORY_RECORDS_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_BRANDS_DIR.mkdir(parents=True, exist_ok=True)

    created_at = payload.get("createdAt") or "unknown-date"
    product_code = get_product_code_from_payload(payload)
    product_slug = slugify(product_code) or "collage"
    record_id = f"{created_at.replace(':', '-').replace('.', '-')}-{product_slug}"
    brand_name = payload.get("brandName") or payload.get("brandId") or "unknown-brand"
    brand_slug = slugify(brand_name)
    brand_history_dir = HISTORY_BRANDS_DIR / brand_slug
    brand_records_dir = brand_history_dir / "records"
    brand_details_dir = brand_history_dir / "details"
    brand_images_dir = brand_history_dir / "images"
    brand_records_dir.mkdir(parents=True, exist_ok=True)
    brand_details_dir.mkdir(parents=True, exist_ok=True)
    brand_images_dir.mkdir(parents=True, exist_ok=True)

    image_data_url = payload.get("imageDataUrl", "")
    image_base64 = image_data_url.split(",", 1)[1] if "," in image_data_url else ""
    image_bytes = base64.b64decode(image_base64) if image_base64 else b""
    if not image_bytes:
        raise ValueError("collage_image_missing")

    image_file_name = f"{record_id}.png"
    image_path = brand_images_dir / image_file_name
    image_path.write_bytes(image_bytes)
    if not image_path.exists() or image_path.stat().st_size <= 0:
        raise OSError("collage_image_write_failed")

    source_photos = collect_original_photos_from_payload(payload)
    saved_sources = save_collage_source_photos(record_id, brand_slug, source_photos)
    persisted_state = apply_source_photos_to_state(payload.get("state", {}), saved_sources)

    record = {
        "id": record_id,
        "createdAt": payload.get("createdAt"),
        "userId": payload.get("userId"),
        "userName": payload.get("userName"),
        "brandId": payload.get("brandId"),
        "brandName": payload.get("brandName"),
        "brandSlug": brand_slug,
        "productCode": product_code,
        "templateId": payload.get("templateId"),
        "templateName": payload.get("templateName"),
        "imageFileName": image_file_name,
        "imagePath": to_public_data_url(image_path),
        "state": persisted_state,
        "originalPhotos": saved_sources,
        "originalPhotoCount": len(saved_sources),
    }

    detail_path = brand_details_dir / f"{record_id}.json"
    detail_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")

    product_codes = extract_product_codes_from_state(persisted_state)
    product_count = len(product_codes) if product_codes else 1

    summary = {
        "id": record_id,
        "createdAt": record.get("createdAt"),
        "userId": record.get("userId"),
        "userName": record.get("userName"),
        "brandId": record.get("brandId"),
        "brandName": record.get("brandName"),
        "brandSlug": record.get("brandSlug"),
        "productCode": format_product_code_label(product_codes) if product_codes else record.get("productCode"),
        "productCodes": product_codes,
        "productCount": product_count,
        "templateId": record.get("templateId"),
        "templateName": record.get("templateName"),
        "imageFileName": record.get("imageFileName"),
        "imagePath": record.get("imagePath"),
        "hasState": True,
        "originalPhotoCount": len(saved_sources),
    }

    record_path = brand_records_dir / f"{record_id}.json"
    record_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    detail_record = {**record, "imageDataUrl": payload.get("imageDataUrl", ""), "state": persisted_state}
    blob_for_db = image_bytes if STORE_IMAGE_BLOBS_IN_DB else b""
    upsert_collage_record(summary, detail_record, blob_for_db)
    return summary


def load_history_records(user_id: str | None) -> list[dict]:
    db_records = load_collage_summaries_from_db(user_id)
    if db_records:
        return db_records
    if not HISTORY_DIR.exists():
        return []
    records: list[dict] = []
    record_files = set(HISTORY_RECORDS_DIR.glob("*.json"))
    record_files.update(HISTORY_BRANDS_DIR.rglob("records/*.json"))
    for file_path in sorted(record_files, reverse=True):
        try:
            record = json.loads(file_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        if user_id and record.get("userId") != user_id:
            continue
        brand_slug = record.get("brandSlug") or slugify(
            record.get("brandName") or record.get("brandId") or "unknown-brand"
        )
        record_id = record.get("id")
        summary = enrich_history_summary(
            {
                "id": record_id,
                "createdAt": record.get("createdAt"),
                "userId": record.get("userId"),
                "userName": record.get("userName"),
                "brandId": record.get("brandId"),
                "brandName": record.get("brandName"),
                "brandSlug": brand_slug,
                "productCode": record.get("productCode"),
                "productCodes": record.get("productCodes"),
                "productCount": record.get("productCount"),
                "state": record.get("state"),
                "templateId": record.get("templateId"),
                "templateName": record.get("templateName"),
                "imageFileName": record.get("imageFileName"),
                "imagePath": record.get("imagePath"),
                "hasState": bool(record.get("hasState") or record.get("state")),
                "originalPhotoCount": record.get("originalPhotoCount")
                or count_source_photos_on_disk(record_id, brand_slug),
            }
        )
        if not summary.get("productCodes") and record_id:
            detail = load_history_record_detail(record_id, brand_slug, record.get("userId"))
            if detail:
                summary = enrich_history_summary(summary, detail)
        records.append(summary)
    records.sort(key=lambda item: item.get("createdAt", ""), reverse=True)
    return attach_source_photo_counts(records)


def apply_history_query(
    records: list[dict],
    *,
    user_id: str | None = None,
    search: str = "",
    sort: str = "newest",
    range_value: str = "all",
    page: int = 1,
    limit: int = 24,
) -> dict:
    filtered = [record for record in records if not user_id or record.get("userId") == user_id]
    normalized_search = search.strip().lower()
    if normalized_search:
        filtered = [r for r in filtered if normalized_search in get_history_search_text(r)]
    if range_value in {"today", "7", "30"}:
        now = datetime.now(timezone.utc)
        if range_value == "today":
            threshold = now.replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            threshold = now - timedelta(days=int(range_value))
        next_filtered = []
        for record in filtered:
            created_at_raw = record.get("createdAt")
            if not created_at_raw:
                continue
            try:
                created_at = datetime.fromisoformat(str(created_at_raw).replace("Z", "+00:00"))
            except ValueError:
                continue
            if created_at >= threshold:
                next_filtered.append(record)
        filtered = next_filtered
    if sort == "oldest":
        filtered.sort(key=lambda item: str(item.get("createdAt") or ""))
    elif sort == "code":
        filtered.sort(key=lambda item: format_product_code_label(get_product_codes_from_record(item)).lower())
    elif sort == "brand":
        filtered.sort(key=lambda item: str(item.get("brandName") or ""))
    elif sort == "user":
        filtered.sort(key=lambda item: str(item.get("userName") or ""))
    else:
        filtered.sort(key=lambda item: str(item.get("createdAt") or ""), reverse=True)
    safe_page = max(1, page)
    safe_limit = max(1, min(limit, 100))
    offset = (safe_page - 1) * safe_limit
    paginated_records = filtered[offset: offset + safe_limit]
    return {
        "records": paginated_records,
        "total": len(filtered),
        "page": safe_page,
        "limit": safe_limit,
        "hasMore": offset + safe_limit < len(filtered),
    }


def load_history_record_detail(record_id: str, brand_slug: str | None = None, user_id: str | None = None) -> dict | None:
    db_detail = load_collage_detail_from_db(record_id, brand_slug, user_id)
    if db_detail:
        return db_detail
    candidate_paths: list[Path] = []
    if brand_slug:
        candidate_paths.extend(
            [
                HISTORY_BRANDS_DIR / brand_slug / "details" / f"{record_id}.json",
                HISTORY_BRANDS_DIR / brand_slug / "records" / f"{record_id}.json",
            ]
        )
    candidate_paths.append(HISTORY_RECORDS_DIR / f"{record_id}.json")
    candidate_paths.extend(HISTORY_BRANDS_DIR.rglob(f"{record_id}.json"))
    checked: set[Path] = set()
    for file_path in candidate_paths:
        if not is_safe_path(HISTORY_DIR, file_path):
            continue
        resolved = file_path.resolve()
        if resolved in checked or not file_path.exists():
            continue
        checked.add(resolved)
        try:
            record = json.loads(file_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        if user_id and record.get("userId") != user_id:
            continue
        if not record.get("brandSlug"):
            record["brandSlug"] = slugify(record.get("brandName") or record.get("brandId") or "unknown-brand")
        record = enrich_history_summary(record)
        if record.get("id") == record_id:
            return enrich_detail_with_source_photos(record, record_id, record.get("brandSlug") or brand_slug)
    return None


def delete_history_record(record_id: str, brand_slug: str | None = None, user_id: str | None = None) -> bool:
    record = load_history_record_detail(record_id, brand_slug, user_id)
    if not record:
        return False
    resolved_brand_slug = record.get("brandSlug") or slugify(
        record.get("brandName") or record.get("brandId") or "unknown-brand"
    )
    image_file_name = record.get("imageFileName") or f"{record_id}.png"
    candidate_paths = [
        HISTORY_BRANDS_DIR / resolved_brand_slug / "records" / f"{record_id}.json",
        HISTORY_BRANDS_DIR / resolved_brand_slug / "details" / f"{record_id}.json",
        HISTORY_BRANDS_DIR / resolved_brand_slug / "images" / image_file_name,
        HISTORY_RECORDS_DIR / f"{record_id}.json",
        HISTORY_IMAGES_DIR / image_file_name,
    ]
    deleted = delete_collage_record_from_db(record_id)
    delete_collage_source_photos(record_id, resolved_brand_slug)
    for path in candidate_paths:
        if not is_safe_path(HISTORY_DIR, path):
            continue
        if path.exists():
            path.unlink()
            deleted = True
    return deleted


# ---------------------------------------------------------------------------
# Storefront (public catalog)
# ---------------------------------------------------------------------------

def _load_published_entries() -> list[dict]:
    if not STORE_PUBLISHED_FILE.exists():
        return []
    try:
        data = json.loads(STORE_PUBLISHED_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    items = data.get("items") if isinstance(data, dict) else data
    return [i for i in (items or []) if isinstance(i, dict) and i.get("id")]


def _save_published_entries(entries: list[dict]) -> None:
    STORE_DIR.mkdir(parents=True, exist_ok=True)
    STORE_PUBLISHED_FILE.write_text(
        json.dumps({"items": entries}, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def load_published_ids() -> list[str]:
    return [e["id"] for e in _load_published_entries()]


def set_collage_published(record_id: str, brand_slug: str | None, user_id: str | None, published: bool) -> bool:
    if not record_id:
        return False
    entries = _load_published_entries()
    entries = [e for e in entries if e.get("id") != record_id]
    if published:
        entries.insert(0, {"id": record_id, "brandSlug": brand_slug, "userId": user_id})
    _save_published_entries(entries)
    return True


# Field id/label hints that mark the "old price" (for discount display).
_OLD_PRICE_HINTS = ("old", "стар", "eski", "öncek", "قديم", "был")


def _find_old_price_field_id() -> str | None:
    data = load_template_payload_from_db() or load_template_payload_from_files()
    for f in (data or {}).get("fields") or []:
        text = f"{f.get('id', '')} {f.get('label', '')}".lower()
        if any(h in text for h in _OLD_PRICE_HINTS):
            return f.get("id")
    return None


def _product_fields_from_state(state: dict, old_id: str | None = None) -> dict:
    state = state or {}
    products = state.get("products") or []
    product_values = products[0].get("values") if products and isinstance(products[0], dict) else None
    # Merge: state.values as base, per-product values take precedence.
    values = {**(state.get("values") or {}), **(product_values or {})}
    return {
        "code": (values.get("code") or "").strip(),
        "category": (values.get("category") or "").strip(),
        "color": (values.get("color") or "").strip(),
        "size": (values.get("size") or "").strip(),
        "price": (values.get("price") or "").strip(),
        "oldPrice": (values.get(old_id) or "").strip() if old_id else "",
    }


def build_store_product(entry: dict, old_id: str | None = None) -> dict | None:
    record_id = entry.get("id")
    if old_id is None:
        old_id = _find_old_price_field_id()
    # Look up by id + brand only — the storefront doesn't filter by employee.
    detail = load_history_record_detail(record_id, entry.get("brandSlug"), None)
    if not detail and entry.get("brandSlug"):
        detail = load_history_record_detail(record_id, None, None)
    if not detail:
        return None
    fields = _product_fields_from_state(detail.get("state") or {}, old_id)
    photos = [p.get("imagePath") for p in (detail.get("originalPhotos") or []) if p.get("imagePath")]
    return {
        "id": record_id,
        "code": fields["code"] or detail.get("productCode") or "",
        "name": fields["code"] or detail.get("productCode") or "Товар",
        "category": fields["category"],
        "color": fields["color"],
        "size": fields["size"],
        "price": fields["price"],
        "oldPrice": fields["oldPrice"],
        "brandName": detail.get("brandName") or "",
        "photos": photos,
        "collageImage": detail.get("imagePath") or "",
        "createdAt": detail.get("createdAt"),
    }


def _price_value(price: str) -> float:
    """Parse the first number out of a price string for min/max comparison."""
    match = re.search(r"\d+(?:[.,]\d+)?", (price or "").replace(" ", ""))
    if not match:
        return float("inf")
    try:
        return float(match.group(0).replace(",", "."))
    except ValueError:
        return float("inf")


def _group_key(brand: str | None, code: str | None) -> str:
    """Same code within the same brand = one product (variations)."""
    return f"{(brand or '').strip().lower()}|{(code or '').strip().lower()}"


def _slugify(text: str) -> str:
    """URL-safe slug (ASCII). Non-alphanumerics collapse to single dashes."""
    return re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")


def _build_products_grouped() -> list[dict]:
    """Group published records into products: one product per (brand + code).

    Each published record becomes a *variation* (its own color / photos /
    size / price). Records without a code are kept as standalone products.
    """
    groups: dict[str, dict] = {}
    order: list[str] = []
    standalone = 0
    old_id = _find_old_price_field_id()
    for entry in _load_published_entries():
        rec = build_store_product(entry, old_id)
        if not rec:
            continue
        code = (rec.get("code") or "").strip()
        if code:
            key = _group_key(rec.get("brandName"), code)
        else:
            # No code → cannot group; keep this record on its own.
            standalone += 1
            key = f"__solo__{standalone}"
        variation = {
            "id": rec["id"],
            "color": rec["color"],
            "size": rec["size"],
            "price": rec["price"],
            "oldPrice": rec.get("oldPrice", ""),
            "photos": rec["photos"],
            "collageImage": rec["collageImage"],
        }
        group = groups.get(key)
        if group is None:
            slug = _slugify(f"{rec.get('brandName') or ''}-{rec.get('code') or ''}") or _slugify(key) or rec["id"]
            group = {
                "id": key,
                "key": key,
                "slug": slug,
                "code": rec["code"],
                "name": rec["name"],
                "category": rec["category"],
                "brandName": rec["brandName"],
                "photos": rec["photos"],
                "collageImage": rec["collageImage"],
                "price": rec["price"],
                "colors": [],
                "sizes": [],
                "createdAt": rec.get("createdAt"),
                "variations": [],
            }
            groups[key] = group
            order.append(key)
        group["variations"].append(variation)
        if rec["color"] and rec["color"] not in group["colors"]:
            group["colors"].append(rec["color"])
        if rec["size"] and rec["size"] not in group["sizes"]:
            group["sizes"].append(rec["size"])

    products = [groups[k] for k in order]
    for group in products:
        prices = [v["price"] for v in group["variations"] if v["price"]]
        distinct = list(dict.fromkeys(prices))
        if len(distinct) > 1:
            group["price"] = min(distinct, key=_price_value)
            group["priceVaries"] = True
        else:
            group["price"] = distinct[0] if distinct else group.get("price") or ""
            group["priceVaries"] = False
    return products


def load_store_products(search: str = "", category: str = "") -> list[dict]:
    products = _build_products_grouped()
    normalized_search = (search or "").strip().lower()
    if normalized_search:
        def _haystack(p: dict) -> str:
            return " ".join(
                [
                    str(p.get("code") or ""),
                    str(p.get("name") or ""),
                    str(p.get("category") or ""),
                    str(p.get("brandName") or ""),
                    " ".join(p.get("colors") or []),
                    " ".join(p.get("sizes") or []),
                ]
            ).lower()

        products = [p for p in products if normalized_search in _haystack(p)]
    normalized_category = (category or "").strip().lower()
    if normalized_category and normalized_category != "all":
        products = [p for p in products if (p.get("category") or "").lower() == normalized_category]
    return products


def load_store_product(product_id: str) -> dict | None:
    for product in _build_products_grouped():
        if product_id in (product["key"], product["id"], product.get("slug")):
            return product
        if any(v["id"] == product_id for v in product["variations"]):
            return product
    return None


def store_categories() -> list[str]:
    seen: list[str] = []
    for product in _build_products_grouped():
        cat = product.get("category")
        if cat and cat not in seen:
            seen.append(cat)
    return seen


# ---------------------------------------------------------------------------
# Storefront orders
# ---------------------------------------------------------------------------

def save_order(payload: dict) -> dict:
    STORE_ORDERS_DIR.mkdir(parents=True, exist_ok=True)
    customer = payload.get("customer") or {}
    name = str(customer.get("name") or "").strip()
    phone = str(customer.get("phone") or "").strip()
    if not name or not phone:
        raise ValueError("name_and_phone_required")
    items_in = payload.get("items") or []
    if not items_in:
        raise ValueError("empty_cart")
    items = [
        {
            "id": str(i.get("id") or ""),
            "code": str(i.get("code") or ""),
            "color": str(i.get("color") or ""),
            "size": str(i.get("size") or ""),
            "price": str(i.get("price") or ""),
            "qty": max(1, int(i.get("qty") or 1)),
        }
        for i in items_in
        if isinstance(i, dict)
    ]
    created_at = datetime.now(timezone.utc).isoformat()
    order_id = created_at.replace(":", "-").replace(".", "-").replace("+", "-")
    order = {
        "id": order_id,
        "createdAt": created_at,
        "status": "new",
        "customer": {
            "name": name,
            "phone": phone,
            "address": str(customer.get("address") or "").strip(),
            "comment": str(customer.get("comment") or "").strip(),
        },
        "items": items,
        "total": payload.get("total"),
    }
    (STORE_ORDERS_DIR / f"{order_id}.json").write_text(
        json.dumps(order, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return {"id": order_id, "createdAt": created_at}


def load_orders() -> list[dict]:
    if not STORE_ORDERS_DIR.exists():
        return []
    orders: list[dict] = []
    for file_path in STORE_ORDERS_DIR.glob("*.json"):
        try:
            orders.append(json.loads(file_path.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError):
            continue
    orders.sort(key=lambda o: o.get("createdAt", ""), reverse=True)
    return orders


def set_order_status(order_id: str, status: str) -> bool:
    file_path = STORE_ORDERS_DIR / f"{order_id}.json"
    if not is_safe_path(STORE_ORDERS_DIR, file_path) or not file_path.exists():
        return False
    try:
        order = json.loads(file_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    order["status"] = str(status or "new")
    file_path.write_text(json.dumps(order, ensure_ascii=False, indent=2), encoding="utf-8")
    return True
