"""Storefront customer accounts: phone + password auth with token sessions.

Passwords are hashed with PBKDF2-HMAC-SHA256 (stdlib, no external deps).
Sessions are opaque random tokens stored in the DB.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import secrets
import uuid

from .db import get_db_connection

ORDER_STATUSES = ("new", "confirmed", "shipped", "done", "cancelled")

_PBKDF2_ITERS = 200_000


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITERS)
    return f"pbkdf2${_PBKDF2_ITERS}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters, salt_b64, dk_b64 = stored.split("$")
        if algo != "pbkdf2":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(dk_b64)
        test = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iters))
        return secrets.compare_digest(test, expected)
    except Exception:
        return False


def normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    return digits


# ---------------------------------------------------------------------------
# Public shaping
# ---------------------------------------------------------------------------
def public_customer(row) -> dict:
    return {
        "id": row["id"],
        "phone": row["phone"],
        "name": row["name"] or "",
        "email": row["email"] or "",
        "createdAt": row["created_at"],
    }


# ---------------------------------------------------------------------------
# Registration / login
# ---------------------------------------------------------------------------
def register(phone: str, name: str, password: str) -> tuple[dict | None, str | None]:
    phone_n = normalize_phone(phone)
    if len(phone_n) < 7:
        return None, "bad_phone"
    if len(password or "") < 4:
        return None, "weak_password"
    with get_db_connection() as conn:
        exists = conn.execute("SELECT 1 FROM customers WHERE phone = ?", (phone_n,)).fetchone()
        if exists:
            return None, "phone_taken"
        cid = uuid.uuid4().hex
        conn.execute(
            "INSERT INTO customers (id, phone, name, password_hash) VALUES (?, ?, ?, ?)",
            (cid, phone_n, (name or "").strip(), hash_password(password)),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM customers WHERE id = ?", (cid,)).fetchone()
    token = _issue_token(cid)
    return {"customer": public_customer(row), "token": token}, None


def login(phone: str, password: str) -> tuple[dict | None, str | None]:
    phone_n = normalize_phone(phone)
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM customers WHERE phone = ?", (phone_n,)).fetchone()
    if not row or not verify_password(password or "", row["password_hash"]):
        return None, "bad_credentials"
    token = _issue_token(row["id"])
    return {"customer": public_customer(row), "token": token}, None


def _issue_token(customer_id: str) -> str:
    token = secrets.token_urlsafe(32)
    with get_db_connection() as conn:
        conn.execute("INSERT INTO customer_tokens (token, customer_id) VALUES (?, ?)", (token, customer_id))
        conn.commit()
    return token


def logout(token: str) -> None:
    if not token:
        return
    with get_db_connection() as conn:
        conn.execute("DELETE FROM customer_tokens WHERE token = ?", (token,))
        conn.commit()


def customer_by_token(token: str | None) -> dict | None:
    if not token:
        return None
    with get_db_connection() as conn:
        tok = conn.execute("SELECT customer_id FROM customer_tokens WHERE token = ?", (token,)).fetchone()
        if not tok:
            return None
        row = conn.execute("SELECT * FROM customers WHERE id = ?", (tok["customer_id"],)).fetchone()
    return public_customer(row) if row else None


def update_profile(customer_id: str, name: str | None, email: str | None) -> dict | None:
    with get_db_connection() as conn:
        conn.execute(
            "UPDATE customers SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?",
            (name.strip() if isinstance(name, str) else None, email.strip() if isinstance(email, str) else None, customer_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM customers WHERE id = ?", (customer_id,)).fetchone()
    return public_customer(row) if row else None


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------
def _public_order(row) -> dict:
    return {
        "id": row["id"],
        "number": row["number"],
        "status": row["status"],
        "total": row["total"],
        "currency": row["currency"] or "",
        "items": json.loads(row["items_json"] or "[]"),
        "destination": json.loads(row["address_json"]) if row["address_json"] else None,
        "comment": row["comment"] or "",
        "createdAt": row["created_at"],
    }


def create_order(customer_id: str, data: dict) -> dict:
    items = data.get("items") or []
    total = float(data.get("total") or 0)
    currency = str(data.get("currency") or "")
    destination = data.get("destination")
    comment = str(data.get("comment") or "")
    oid = uuid.uuid4().hex
    with get_db_connection() as conn:
        n = conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
        number = str(1001 + n)
        conn.execute(
            "INSERT INTO orders (id, customer_id, number, status, total, currency, items_json, address_json, comment) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (oid, customer_id, number, "new", total, currency,
             json.dumps(items, ensure_ascii=False),
             json.dumps(destination, ensure_ascii=False) if destination else None, comment),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (oid,)).fetchone()
    return _public_order(row)


def list_orders(customer_id: str) -> list[dict]:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC", (customer_id,)).fetchall()
    return [_public_order(r) for r in rows]


def admin_list_orders() -> list[dict]:
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT o.*, c.phone AS cust_phone, c.name AS cust_name "
            "FROM orders o LEFT JOIN customers c ON c.id = o.customer_id ORDER BY o.created_at DESC"
        ).fetchall()
    out = []
    for r in rows:
        d = _public_order(r)
        d["customer"] = {"name": r["cust_name"] or "", "phone": r["cust_phone"] or ""}
        out.append(d)
    return out


def admin_set_status(order_id: str, status: str) -> bool:
    status = status if status in ORDER_STATUSES else "new"
    with get_db_connection() as conn:
        cur = conn.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
        conn.commit()
    return cur.rowcount > 0


# ---------------------------------------------------------------------------
# Favorites (synced to account)
# ---------------------------------------------------------------------------
def list_favorites(customer_id: str) -> list[str]:
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT product_key FROM customer_favorites WHERE customer_id = ? ORDER BY created_at DESC",
            (customer_id,),
        ).fetchall()
    return [r["product_key"] for r in rows]


def add_favorite(customer_id: str, key: str) -> None:
    if not key:
        return
    with get_db_connection() as conn:
        conn.execute("INSERT OR IGNORE INTO customer_favorites (customer_id, product_key) VALUES (?, ?)", (customer_id, key))
        conn.commit()


def remove_favorite(customer_id: str, key: str) -> None:
    with get_db_connection() as conn:
        conn.execute("DELETE FROM customer_favorites WHERE customer_id = ? AND product_key = ?", (customer_id, key))
        conn.commit()


def merge_favorites(customer_id: str, keys: list) -> None:
    with get_db_connection() as conn:
        for k in keys or []:
            if k:
                conn.execute("INSERT OR IGNORE INTO customer_favorites (customer_id, product_key) VALUES (?, ?)", (customer_id, str(k)))
        conn.commit()


# ---------------------------------------------------------------------------
# Shipping destinations (cargo / bayer / pickup)
# ---------------------------------------------------------------------------
_DEST_FIELDS = ("kind", "cargo", "code", "recipient", "phone", "country", "city", "note")


def _public_dest(row) -> dict:
    return {
        "id": row["id"],
        "kind": row["kind"] or "cargo",
        "cargo": row["cargo"] or "",
        "code": row["code"] or "",
        "recipient": row["recipient"] or "",
        "phone": row["phone"] or "",
        "country": row["country"] or "",
        "city": row["city"] or "",
        "note": row["note"] or "",
        "isDefault": bool(row["is_default"]),
    }


def list_destinations(customer_id: str) -> list[dict]:
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC",
            (customer_id,),
        ).fetchall()
    return [_public_dest(r) for r in rows]


def _clean(data: dict) -> dict:
    out = {f: (str(data.get(f) or "").strip()) for f in _DEST_FIELDS}
    if out["kind"] not in ("cargo", "bayer", "pickup"):
        out["kind"] = "cargo"
    return out


def create_destination(customer_id: str, data: dict) -> dict:
    fields = _clean(data)
    make_default = bool(data.get("isDefault"))
    did = uuid.uuid4().hex
    with get_db_connection() as conn:
        count = conn.execute("SELECT COUNT(*) FROM customer_addresses WHERE customer_id = ?", (customer_id,)).fetchone()[0]
        is_default = 1 if (make_default or count == 0) else 0
        if is_default:
            conn.execute("UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?", (customer_id,))
        conn.execute(
            "INSERT INTO customer_addresses (id, customer_id, kind, cargo, code, recipient, phone, country, city, note, is_default) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (did, customer_id, fields["kind"], fields["cargo"], fields["code"], fields["recipient"],
             fields["phone"], fields["country"], fields["city"], fields["note"], is_default),
        )
        conn.commit()
    return {"destinations": list_destinations(customer_id)}


def update_destination(customer_id: str, dest_id: str, data: dict) -> dict:
    fields = _clean(data)
    with get_db_connection() as conn:
        owns = conn.execute("SELECT 1 FROM customer_addresses WHERE id = ? AND customer_id = ?", (dest_id, customer_id)).fetchone()
        if owns:
            conn.execute(
                "UPDATE customer_addresses SET kind=?, cargo=?, code=?, recipient=?, phone=?, country=?, city=?, note=? "
                "WHERE id = ? AND customer_id = ?",
                (fields["kind"], fields["cargo"], fields["code"], fields["recipient"], fields["phone"],
                 fields["country"], fields["city"], fields["note"], dest_id, customer_id),
            )
            if bool(data.get("isDefault")):
                conn.execute("UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?", (customer_id,))
                conn.execute("UPDATE customer_addresses SET is_default = 1 WHERE id = ? AND customer_id = ?", (dest_id, customer_id))
            conn.commit()
    return {"destinations": list_destinations(customer_id)}


def delete_destination(customer_id: str, dest_id: str) -> dict:
    with get_db_connection() as conn:
        conn.execute("DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?", (dest_id, customer_id))
        # keep one default
        remaining = conn.execute("SELECT id, is_default FROM customer_addresses WHERE customer_id = ? ORDER BY created_at DESC", (customer_id,)).fetchall()
        if remaining and not any(r["is_default"] for r in remaining):
            conn.execute("UPDATE customer_addresses SET is_default = 1 WHERE id = ?", (remaining[0]["id"],))
        conn.commit()
    return {"destinations": list_destinations(customer_id)}


def set_default_destination(customer_id: str, dest_id: str) -> dict:
    with get_db_connection() as conn:
        conn.execute("UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?", (customer_id,))
        conn.execute("UPDATE customer_addresses SET is_default = 1 WHERE id = ? AND customer_id = ?", (dest_id, customer_id))
        conn.commit()
    return {"destinations": list_destinations(customer_id)}


def change_password(customer_id: str, old_pw: str, new_pw: str) -> str | None:
    if len(new_pw or "") < 4:
        return "weak_password"
    with get_db_connection() as conn:
        row = conn.execute("SELECT password_hash FROM customers WHERE id = ?", (customer_id,)).fetchone()
        if not row or not verify_password(old_pw or "", row["password_hash"]):
            return "bad_credentials"
        conn.execute("UPDATE customers SET password_hash = ? WHERE id = ?", (hash_password(new_pw), customer_id))
        conn.commit()
    return None
