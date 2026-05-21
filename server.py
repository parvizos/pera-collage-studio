from __future__ import annotations

import base64
import json
import os
import re
import sqlite3
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parent
DATA_ROOT_RAW = Path(os.environ.get("PERA_DATA_DIR", str(ROOT))).expanduser()
DATA_ROOT = (DATA_ROOT_RAW if DATA_ROOT_RAW.is_absolute() else ROOT / DATA_ROOT_RAW).resolve()

TEMPLATES_DIR = DATA_ROOT / "templates"
TEMPLATE_FILE = TEMPLATES_DIR / "studio-template.json"
SCENES_DIR = TEMPLATES_DIR / "scenes"
HISTORY_DIR = DATA_ROOT / "history"
HISTORY_RECORDS_DIR = HISTORY_DIR / "records"
HISTORY_IMAGES_DIR = HISTORY_DIR / "images"
HISTORY_BRANDS_DIR = HISTORY_DIR / "brands"
DB_FILE = DATA_ROOT / "pera.sqlite3"

HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8080"))


def slugify(value: str) -> str:
    normalized = re.sub("[^a-zA-Z0-9\u0400-\u04FF]+", "-", value.strip().lower())
    normalized = normalized.strip("-")
    return normalized or "template"


def to_public_data_url(path: Path) -> str:
    return f"/{path.relative_to(DATA_ROOT).as_posix()}"


def ensure_directories() -> None:
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    SCENES_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_RECORDS_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_BRANDS_DIR.mkdir(parents=True, exist_ok=True)
    DATA_ROOT.mkdir(parents=True, exist_ok=True)


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def normalize_user_record(user: dict, index: int = 0) -> dict:
    return {
        "id": user.get("id") or f"user_{index + 1}",
        "name": user.get("name") or f"employee-{index + 1:02d}",
        "pin": str(user.get("pin") or "1111"),
        "brandIds": [brand_id for brand_id in (user.get("brandIds") or [user.get("brandId")]) if brand_id],
    }


def init_database() -> None:
    with get_db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                pin TEXT NOT NULL,
                brand_ids TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()

    bootstrap_users_from_template_if_needed()


def bootstrap_users_from_template_if_needed() -> None:
    with get_db_connection() as conn:
        row = conn.execute("SELECT COUNT(*) AS count FROM users").fetchone()
        if row and row["count"] > 0:
            return

    if not TEMPLATE_FILE.exists():
        return

    try:
        payload = json.loads(TEMPLATE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return

    template_users = payload.get("users") or []
    if not template_users:
        return

    save_users([normalize_user_record(user, index) for index, user in enumerate(template_users)])


def load_users() -> list[dict]:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT id, name, pin, brand_ids FROM users ORDER BY created_at, name").fetchall()

    users: list[dict] = []
    for row in rows:
        try:
            brand_ids = json.loads(row["brand_ids"] or "[]")
        except json.JSONDecodeError:
            brand_ids = []
        users.append(
            {
                "id": row["id"],
                "name": row["name"],
                "pin": row["pin"],
                "brandIds": brand_ids if isinstance(brand_ids, list) else [],
            }
        )
    return users


def save_users(users: list[dict]) -> list[dict]:
    normalized = [normalize_user_record(user, index) for index, user in enumerate(users)]

    with get_db_connection() as conn:
        conn.execute("DELETE FROM users")
        conn.executemany(
            "INSERT INTO users (id, name, pin, brand_ids) VALUES (?, ?, ?, ?)",
            [
                (
                    user["id"],
                    user["name"],
                    user["pin"],
                    json.dumps(user["brandIds"], ensure_ascii=False),
                )
                for user in normalized
            ],
        )
        conn.commit()

    return normalized


def write_scene_files(payload: dict) -> list[str]:
    photo_templates = payload.get("photoTemplates") or []
    template_scenes = payload.get("templateScenes") or {}

    SCENES_DIR.mkdir(parents=True, exist_ok=True)
    for existing_file in SCENES_DIR.glob("*.json"):
        existing_file.unlink()

    written_files: list[str] = []
    for index, item in enumerate(photo_templates, start=1):
        template_id = item.get("id") or f"template_{index}"
        template_name = item.get("name") or f"Шаблон {index}"
        scene_payload = {
            "id": template_id,
            "name": template_name,
            "scene": template_scenes.get(template_id, {}),
        }
        file_name = f"{index:02d}-{slugify(template_name)}.json"
        file_path = SCENES_DIR / file_name
        file_path.write_text(
            json.dumps(scene_payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        written_files.append(to_public_data_url(file_path))

    return written_files


def save_history_record(payload: dict) -> dict:
    HISTORY_RECORDS_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_BRANDS_DIR.mkdir(parents=True, exist_ok=True)

    created_at = payload.get("createdAt") or "unknown-date"
    record_id = f"{created_at.replace(':', '-').replace('.', '-')}-{slugify(payload.get('userName', 'user'))}"
    brand_name = payload.get("brandName") or payload.get("brandId") or "unknown-brand"
    brand_slug = slugify(brand_name)
    brand_history_dir = HISTORY_BRANDS_DIR / brand_slug
    brand_records_dir = brand_history_dir / "records"
    brand_images_dir = brand_history_dir / "images"
    brand_records_dir.mkdir(parents=True, exist_ok=True)
    brand_images_dir.mkdir(parents=True, exist_ok=True)

    image_data_url = payload.get("imageDataUrl", "")
    image_base64 = image_data_url.split(",", 1)[1] if "," in image_data_url else ""
    image_bytes = base64.b64decode(image_base64) if image_base64 else b""

    image_path = brand_images_dir / f"{record_id}.png"
    image_path.write_bytes(image_bytes)

    record = {
        "id": record_id,
        "createdAt": payload.get("createdAt"),
        "userId": payload.get("userId"),
        "userName": payload.get("userName"),
        "brandId": payload.get("brandId"),
        "brandName": payload.get("brandName"),
        "brandSlug": brand_slug,
        "templateId": payload.get("templateId"),
        "templateName": payload.get("templateName"),
        "imagePath": to_public_data_url(image_path),
        "state": payload.get("state", {}),
    }

    record_path = brand_records_dir / f"{record_id}.json"
    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    return record


def load_history_records(user_id: str | None) -> list[dict]:
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
        if not record.get("brandSlug"):
            record["brandSlug"] = slugify(record.get("brandName") or record.get("brandId") or "unknown-brand")
        records.append(record)
    records.sort(key=lambda item: item.get("createdAt", ""), reverse=True)
    return records


class PeraHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path == "/api/template":
            self.handle_get_template()
            return
        if parsed.path == "/api/users":
            self.handle_get_users()
            return
        if parsed.path.startswith("/api/collages"):
            self.handle_get_collages(parsed)
            return
        if parsed.path == "/healthz":
            self.handle_health()
            return
        if parsed.path.startswith("/history/") or parsed.path.startswith("/templates/"):
            self.handle_data_asset(parsed.path)
            return
        if parsed.path in {"/admin", "/admin/"}:
            self.handle_app_shell()
            return

        super().do_GET()

    def do_POST(self) -> None:
        if self.path == "/api/template":
            self.handle_save_template()
            return
        if self.path == "/api/users":
            self.handle_save_users()
            return
        if self.path == "/api/collages":
            self.handle_save_collage()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def handle_get_template(self) -> None:
        if not TEMPLATE_FILE.exists():
            self.send_response(HTTPStatus.NOT_FOUND)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(b'{"error":"template_not_found"}')
            return

        payload = TEMPLATE_FILE.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def handle_app_shell(self) -> None:
        index_file = ROOT / "index.html"
        payload = index_file.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def handle_save_template(self) -> None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0

        raw_body = self.rfile.read(length)
        try:
            parsed = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_response(HTTPStatus.BAD_REQUEST)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(b'{"error":"invalid_json"}')
            return

        TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
        TEMPLATE_FILE.write_text(json.dumps(parsed, ensure_ascii=False, indent=2), encoding="utf-8")
        scene_files = write_scene_files(parsed)

        response = json.dumps(
            {
                "ok": True,
                "path": to_public_data_url(TEMPLATE_FILE),
                "sceneFiles": scene_files,
            },
            ensure_ascii=False,
        ).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def handle_get_users(self) -> None:
        response = json.dumps({"users": load_users()}, ensure_ascii=False).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def handle_save_users(self) -> None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0

        raw_body = self.rfile.read(length)
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_response(HTTPStatus.BAD_REQUEST)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(b'{"error":"invalid_json"}')
            return

        saved_users = save_users(payload.get("users") or [])
        response = json.dumps({"ok": True, "users": saved_users}, ensure_ascii=False).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def handle_get_collages(self, parsed) -> None:
        query = parse_qs(parsed.query)
        user_id = query.get("userId", [None])[0]
        records = load_history_records(user_id)
        response = json.dumps({"records": records}, ensure_ascii=False).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def handle_save_collage(self) -> None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0

        raw_body = self.rfile.read(length)
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_response(HTTPStatus.BAD_REQUEST)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(b'{"error":"invalid_json"}')
            return

        record = save_history_record(payload)
        response = json.dumps({"ok": True, "record": record}, ensure_ascii=False).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def handle_health(self) -> None:
        response = json.dumps({"ok": True}, ensure_ascii=False).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def handle_data_asset(self, url_path: str) -> None:
        target = (DATA_ROOT / url_path.lstrip("/")).resolve()
        if DATA_ROOT not in target.parents and target != DATA_ROOT:
            self.send_error(HTTPStatus.FORBIDDEN, "Forbidden")
            return
        if not target.exists() or not target.is_file():
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        payload = target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", self.guess_type(str(target)))
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def main() -> None:
    ensure_directories()
    init_database()

    server = ThreadingHTTPServer((HOST, PORT), PeraHandler)
    print(f"Pera Collage server running at http://127.0.0.1:{PORT}")
    print(f"Data folder: {DATA_ROOT}")
    print(f"Users DB: {DB_FILE}")
    print(f"Templates folder: {TEMPLATES_DIR}")
    print(f"Scenes folder: {SCENES_DIR}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
