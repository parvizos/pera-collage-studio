from __future__ import annotations

import sqlite3

from . import config


def configure_db_connection(conn: sqlite3.Connection) -> None:
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA temp_store=MEMORY")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(config.DB_FILE, timeout=30)
    conn.row_factory = sqlite3.Row
    configure_db_connection(conn)
    return conn


def get_schema_version() -> int:
    with get_db_connection() as conn:
        return int(conn.execute("PRAGMA user_version").fetchone()[0])


def set_schema_version(version: int) -> None:
    with get_db_connection() as conn:
        conn.execute(f"PRAGMA user_version = {int(version)}")
        conn.commit()


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
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS studio_template (
                id TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS collage_records (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                user_id TEXT,
                user_name TEXT,
                brand_id TEXT,
                brand_name TEXT,
                brand_slug TEXT NOT NULL,
                product_code TEXT,
                template_id TEXT,
                template_name TEXT,
                summary_json TEXT NOT NULL,
                detail_json TEXT NOT NULL,
                image_blob BLOB,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS collage_source_photos (
                record_id TEXT NOT NULL,
                photo_index INTEGER NOT NULL,
                file_name TEXT NOT NULL,
                mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
                image_blob BLOB NOT NULL,
                PRIMARY KEY (record_id, photo_index)
            )
            """
        )
        # ---- Customer accounts (storefront) ----
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY,
                phone TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL DEFAULT '',
                email TEXT,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS customer_tokens (
                token TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        # Wholesale shipping destinations: cargo company / buyer-agent / pickup.
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS customer_addresses (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                kind TEXT NOT NULL DEFAULT 'cargo',
                cargo TEXT,
                code TEXT,
                recipient TEXT,
                phone TEXT,
                country TEXT,
                city TEXT,
                note TEXT,
                is_default INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        # Migrate older installs that created the table with the generic schema.
        existing_cols = {r[1] for r in conn.execute("PRAGMA table_info(customer_addresses)").fetchall()}
        for col in ("kind", "cargo", "code", "note"):
            if col not in existing_cols:
                default = " DEFAULT 'cargo'" if col == "kind" else ""
                conn.execute(f"ALTER TABLE customer_addresses ADD COLUMN {col} TEXT{default}")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                number TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'new',
                total REAL NOT NULL DEFAULT 0,
                currency TEXT,
                items_json TEXT NOT NULL DEFAULT '[]',
                address_json TEXT,
                comment TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS customer_favorites (
                customer_id TEXT NOT NULL,
                product_key TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (customer_id, product_key)
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_cust_token ON customer_tokens(customer_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_addr_cust ON customer_addresses(customer_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_orders_cust ON orders(customer_id, created_at DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC)")
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_collage_user ON collage_records(user_id, created_at DESC)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_collage_created ON collage_records(created_at DESC)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_collage_brand_created ON collage_records(brand_slug, created_at DESC)"
        )
        conn.commit()

    if get_schema_version() < config.SCHEMA_VERSION:
        set_schema_version(config.SCHEMA_VERSION)
