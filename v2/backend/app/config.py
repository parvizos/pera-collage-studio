from __future__ import annotations

import os
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent

DATA_ROOT_RAW = Path(os.environ.get("PERA_DATA_DIR", str(BACKEND_ROOT / "data"))).expanduser()
DATA_ROOT = (DATA_ROOT_RAW if DATA_ROOT_RAW.is_absolute() else BACKEND_ROOT / DATA_ROOT_RAW).resolve()

TEMPLATES_DIR = DATA_ROOT / "templates"
TEMPLATE_FILE = TEMPLATES_DIR / "studio-template.json"
SCENES_DIR = TEMPLATES_DIR / "scenes"
HISTORY_DIR = DATA_ROOT / "history"
HISTORY_RECORDS_DIR = HISTORY_DIR / "records"
HISTORY_IMAGES_DIR = HISTORY_DIR / "images"
HISTORY_BRANDS_DIR = HISTORY_DIR / "brands"
DB_FILE = DATA_ROOT / "pera.sqlite3"

# Storefront
STORE_DIR = DATA_ROOT / "store"
STORE_PUBLISHED_FILE = STORE_DIR / "published.json"
STORE_SETTINGS_FILE = STORE_DIR / "settings.json"
STORE_ORDERS_DIR = STORE_DIR / "orders"

# Built frontend (Vite output). Served as SPA when present.
FRONTEND_DIST = (BACKEND_ROOT.parent / "frontend" / "dist").resolve()

HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8090"))
MAX_REQUEST_BYTES = int(os.environ.get("PERA_MAX_REQUEST_MB", "64")) * 1024 * 1024
STORE_IMAGE_BLOBS_IN_DB = os.environ.get("PERA_DB_IMAGE_BACKUP", "0").strip() == "1"
SCHEMA_VERSION = 4
TEMPLATE_ROW_ID = "main"
DEFAULT_ADMIN_PIN = "1234"
