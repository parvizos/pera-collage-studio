"""Storefront customer accounts: phone + password auth with token sessions.

Passwords are hashed with PBKDF2-HMAC-SHA256 (stdlib, no external deps).
Sessions are opaque random tokens stored in the DB.
"""

from __future__ import annotations

import base64
import hashlib
import os
import re
import secrets
import uuid

from .db import get_db_connection

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
