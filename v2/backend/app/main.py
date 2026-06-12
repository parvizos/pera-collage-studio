from __future__ import annotations

import json

from fastapi import BackgroundTasks, FastAPI, Header, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response

from . import account, config, media, store, translate
from .db import init_database

app = FastAPI(title="Pera Collage Studio API", version="2.0")

app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    store.ensure_directories()
    init_database()
    store.bootstrap_users_from_template_if_needed()
    # One-time migration: move any embedded base64 media in the template to files.
    try:
        data = store.load_template_payload_from_db() or store.load_template_payload_from_files()
        if data and media.has_media_data_urls(data):
            store.save_template_payload(media.extract_media(data))
    except Exception:
        pass


def json_response(payload, status: int = 200) -> JSONResponse:
    return JSONResponse(content=payload, status_code=status)


# ---------------------------------------------------------------------------
# Template
# ---------------------------------------------------------------------------

_translating = False


def _bg_translate_home() -> None:
    """Background: translate any missing homepage strings and persist (self-heal)."""
    global _translating
    try:
        data = store.load_template_payload_from_db() or store.load_template_payload_from_files()
        home = (data.get("store") or {}).get("home") if data else None
        if isinstance(home, dict) and translate.needs_translation(home):
            translate.enrich_home_translations(home)
            store.save_template_payload(data)
    except Exception:
        pass
    finally:
        _translating = False


@app.get("/api/template")
def get_template(background_tasks: BackgroundTasks):
    data = store.load_template_payload_from_db() or store.load_template_payload_from_files()
    if not data:
        return json_response({"error": "template_not_found"}, 404)
    # Self-heal: if homepage content has no translations yet (e.g. saved before
    # the feature existed), translate it in the background, once.
    global _translating
    try:
        home = (data.get("store") or {}).get("home")
        if isinstance(home, dict) and not _translating and translate.needs_translation(home):
            _translating = True
            background_tasks.add_task(_bg_translate_home)
    except Exception:
        _translating = False
    if "security" in data and "adminPin" in data["security"]:
        data["security"]["adminPin"] = ""
    return json_response(data)


@app.post("/api/template")
async def save_template(request: Request, x_admin_pin: str | None = Header(default=None)):
    if x_admin_pin != store.load_shell_admin_pin():
        return json_response({"error": "unauthorized"}, 401)
    try:
        parsed = json.loads(await request.body())
    except json.JSONDecodeError:
        return json_response({"error": "invalid_json"}, 400)
    # Move uploaded base64 images/videos out of the JSON into files (keeps the
    # template tiny and fast to load).
    try:
        if media.has_media_data_urls(parsed):
            parsed = await run_in_threadpool(media.extract_media, parsed)
    except Exception:
        pass
    # Auto-translate homepage content into the 4 languages (keyless, best-effort).
    try:
        home = (parsed.get("store") or {}).get("home")
        if isinstance(home, dict):
            await run_in_threadpool(translate.enrich_home_translations, home)
    except Exception:
        pass  # never block saving on translation
    saved = store.save_template_payload(parsed)
    if "security" in saved and "adminPin" in saved["security"]:
        saved["security"]["adminPin"] = ""
    return json_response(
        {"ok": True, "storage": "database", "path": store.to_public_data_url(config.TEMPLATE_FILE)}
    )


# ---------------------------------------------------------------------------
# Customer accounts (storefront)
# ---------------------------------------------------------------------------

def _bearer(request: Request) -> str | None:
    h = request.headers.get("authorization") or ""
    return h[7:].strip() if h.lower().startswith("bearer ") else None


_ACCOUNT_ERR = {
    "bad_phone": ("Введите корректный телефон", 400),
    "weak_password": ("Пароль слишком короткий", 400),
    "phone_taken": ("Этот телефон уже зарегистрирован", 409),
    "bad_credentials": ("Неверный телефон или пароль", 401),
}


@app.post("/api/account/register")
async def account_register(request: Request):
    try:
        p = json.loads(await request.body())
    except json.JSONDecodeError:
        return json_response({"error": "invalid_json"}, 400)
    result, err = account.register(str(p.get("phone") or ""), str(p.get("name") or ""), str(p.get("password") or ""))
    if err:
        msg, code = _ACCOUNT_ERR.get(err, ("Ошибка", 400))
        return json_response({"error": err, "message": msg}, code)
    return json_response(result)


@app.post("/api/account/login")
async def account_login(request: Request):
    try:
        p = json.loads(await request.body())
    except json.JSONDecodeError:
        return json_response({"error": "invalid_json"}, 400)
    result, err = account.login(str(p.get("phone") or ""), str(p.get("password") or ""))
    if err:
        msg, code = _ACCOUNT_ERR.get(err, ("Ошибка", 400))
        return json_response({"error": err, "message": msg}, code)
    return json_response(result)


@app.get("/api/account/me")
def account_me(request: Request):
    cust = account.customer_by_token(_bearer(request))
    if not cust:
        return json_response({"error": "unauthorized"}, 401)
    return json_response({"customer": cust})


@app.post("/api/account/logout")
async def account_logout(request: Request):
    account.logout(_bearer(request) or "")
    return json_response({"ok": True})


@app.post("/api/account/profile")
async def account_profile(request: Request):
    cust = account.customer_by_token(_bearer(request))
    if not cust:
        return json_response({"error": "unauthorized"}, 401)
    try:
        p = json.loads(await request.body())
    except json.JSONDecodeError:
        return json_response({"error": "invalid_json"}, 400)
    updated = account.update_profile(cust["id"], p.get("name"), p.get("email"))
    return json_response({"customer": updated})


@app.get("/api/account/destinations")
def account_destinations(request: Request):
    cust = account.customer_by_token(_bearer(request))
    if not cust:
        return json_response({"error": "unauthorized"}, 401)
    return json_response({"destinations": account.list_destinations(cust["id"])})


@app.post("/api/account/destinations")
async def account_destinations_create(request: Request):
    cust = account.customer_by_token(_bearer(request))
    if not cust:
        return json_response({"error": "unauthorized"}, 401)
    try:
        p = json.loads(await request.body())
    except json.JSONDecodeError:
        return json_response({"error": "invalid_json"}, 400)
    return json_response(account.create_destination(cust["id"], p))


@app.post("/api/account/destinations/{dest_id}")
async def account_destinations_update(dest_id: str, request: Request):
    cust = account.customer_by_token(_bearer(request))
    if not cust:
        return json_response({"error": "unauthorized"}, 401)
    try:
        p = json.loads(await request.body())
    except json.JSONDecodeError:
        return json_response({"error": "invalid_json"}, 400)
    if p.get("_action") == "delete":
        return json_response(account.delete_destination(cust["id"], dest_id))
    if p.get("_action") == "default":
        return json_response(account.set_default_destination(cust["id"], dest_id))
    return json_response(account.update_destination(cust["id"], dest_id, p))


@app.post("/api/account/password")
async def account_password(request: Request):
    cust = account.customer_by_token(_bearer(request))
    if not cust:
        return json_response({"error": "unauthorized"}, 401)
    try:
        p = json.loads(await request.body())
    except json.JSONDecodeError:
        return json_response({"error": "invalid_json"}, 400)
    err = account.change_password(cust["id"], str(p.get("old") or ""), str(p.get("new") or ""))
    if err:
        msg, code = _ACCOUNT_ERR.get(err, ("Ошибка", 400))
        return json_response({"error": err, "message": msg}, code)
    return json_response({"ok": True})


# ---------------------------------------------------------------------------
# Admin verify
# ---------------------------------------------------------------------------

@app.post("/api/admin/verify")
async def verify_admin(request: Request):
    try:
        payload = json.loads(await request.body())
    except json.JSONDecodeError:
        return json_response({"error": "invalid_json"}, 400)
    pin = str(payload.get("pin") or "")
    if pin == store.load_shell_admin_pin():
        return json_response({"ok": True})
    return json_response({"ok": False, "error": "invalid_pin"}, 401)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

@app.get("/api/users")
def get_users():
    return json_response({"users": store.ensure_default_users()})


@app.post("/api/users")
async def save_users(request: Request, x_admin_pin: str | None = Header(default=None)):
    if x_admin_pin != store.load_shell_admin_pin():
        return json_response({"error": "unauthorized"}, 401)
    try:
        payload = json.loads(await request.body())
    except json.JSONDecodeError:
        return json_response({"error": "invalid_json"}, 400)
    saved_users = store.save_users(payload.get("users") or [])
    return json_response({"ok": True, "users": saved_users})


# ---------------------------------------------------------------------------
# Collages
# ---------------------------------------------------------------------------

@app.get("/api/collages/image")
def collage_image(id: str | None = Query(default=None)):
    if not id:
        return Response("Missing id", status_code=400)
    image_bytes = store.load_collage_image_bytes(id)
    if not image_bytes:
        return Response("Image not found", status_code=404)
    return Response(
        content=image_bytes,
        media_type="image/png",
        headers={"Cache-Control": "private, max-age=3600"},
    )


@app.get("/api/collages/source-photo")
def collage_source_photo(id: str | None = Query(default=None), index: int = Query(default=0)):
    if not id:
        return Response("Missing id", status_code=400)
    loaded = store.load_collage_source_photo_bytes(id, index)
    if not loaded:
        return Response("Source photo not found", status_code=404)
    image_bytes, mime = loaded
    return Response(
        content=image_bytes,
        media_type=mime,
        headers={"Cache-Control": "private, max-age=3600"},
    )


@app.get("/api/img/thumb")
def image_thumbnail(src: str = Query(...), w: int = Query(default=400)):
    path = store.get_or_create_thumbnail(src, w)
    if not path:
        return Response("Not found", status_code=404)
    return FileResponse(
        path,
        media_type="image/webp",
        headers={"Cache-Control": "public, max-age=2592000, immutable"},
    )


@app.get("/api/collages")
def get_collages(
    userId: str | None = Query(default=None),
    id: str | None = Query(default=None),
    brandSlug: str | None = Query(default=None),
    search: str = Query(default=""),
    sort: str = Query(default="newest"),
    range: str = Query(default="all"),
    page: int = Query(default=1),
    limit: int = Query(default=24),
):
    if id:
        record = store.load_history_record_detail(id, brandSlug, userId)
        if not record:
            return json_response({"error": "record_not_found"}, 404)
        return json_response({"record": record})
    records = store.load_history_records(userId)
    payload = store.apply_history_query(
        records,
        user_id=userId,
        search=search,
        sort=sort,
        range_value=range,
        page=page,
        limit=limit,
    )
    return json_response(payload)


@app.post("/api/collages")
async def save_collage(
    request: Request,
    x_user_id: str | None = Header(default=None),
    x_user_pin: str | None = Header(default=None),
):
    if not store.verify_user_pin(x_user_id, x_user_pin):
        return json_response({"error": "unauthorized"}, 401)
    body = await request.body()
    if len(body) > config.MAX_REQUEST_BYTES:
        return json_response(
            {"error": "payload_too_large", "maxRequestMb": round(config.MAX_REQUEST_BYTES / (1024**2), 1)},
            413,
        )
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return json_response({"error": "invalid_json"}, 400)
    try:
        # Heavy work (base64 decode, file writes, sqlite) runs in a worker thread
        # so it never blocks the event loop — keeps the server responsive under load.
        record = await run_in_threadpool(store.save_history_record, payload)
    except ValueError as error:
        return json_response({"error": str(error)}, 400)
    except OSError as error:
        return json_response({"error": "storage_write_failed", "details": str(error)}, 500)
    return json_response({"ok": True, "record": record})


@app.post("/api/collages/delete")
async def delete_collages(request: Request, x_admin_pin: str | None = Header(default=None)):
    if x_admin_pin != store.load_shell_admin_pin():
        return json_response({"error": "unauthorized"}, 401)
    try:
        payload = json.loads(await request.body())
    except json.JSONDecodeError:
        return json_response({"error": "invalid_json"}, 400)
    def _delete_all() -> list[str]:
        ids: list[str] = []
        for record in payload.get("records") or []:
            record_id = record.get("id")
            if not record_id:
                continue
            if store.delete_history_record(record_id, record.get("brandSlug"), record.get("userId")):
                ids.append(record_id)
        return ids

    deleted_ids = await run_in_threadpool(_delete_all)
    return json_response({"ok": True, "deletedIds": deleted_ids})


# ---------------------------------------------------------------------------
# Storefront
# ---------------------------------------------------------------------------

@app.get("/api/store/products")
async def store_products(search: str = Query(default=""), category: str = Query(default="")):
    products = await run_in_threadpool(store.load_store_products, search, category)
    categories = await run_in_threadpool(store.store_categories)
    return json_response({"products": products, "categories": categories, "total": len(products)})


@app.get("/api/store/product")
async def store_product(id: str = Query(...)):
    product = await run_in_threadpool(store.load_store_product, id)
    if not product:
        return json_response({"error": "not_found"}, 404)
    return json_response({"product": product})


@app.get("/api/store/published-ids")
def store_published_ids(x_admin_pin: str | None = Header(default=None)):
    if x_admin_pin != store.load_shell_admin_pin():
        return json_response({"error": "unauthorized"}, 401)
    return json_response({"ids": store.load_published_ids()})


@app.post("/api/store/publish")
async def store_publish(request: Request, x_admin_pin: str | None = Header(default=None)):
    if x_admin_pin != store.load_shell_admin_pin():
        return json_response({"error": "unauthorized"}, 401)
    try:
        payload = json.loads(await request.body())
    except json.JSONDecodeError:
        return json_response({"error": "invalid_json"}, 400)
    record_id = payload.get("id")
    if not record_id:
        return json_response({"error": "id_required"}, 400)
    await run_in_threadpool(
        store.set_collage_published,
        record_id,
        payload.get("brandSlug"),
        payload.get("userId"),
        bool(payload.get("published")),
    )
    return json_response({"ok": True, "ids": store.load_published_ids()})


@app.post("/api/store/order")
async def store_order(request: Request):
    body = await request.body()
    if len(body) > config.MAX_REQUEST_BYTES:
        return json_response({"error": "payload_too_large"}, 413)
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return json_response({"error": "invalid_json"}, 400)
    try:
        result = await run_in_threadpool(store.save_order, payload)
    except ValueError as error:
        return json_response({"error": str(error)}, 400)
    except OSError:
        return json_response({"error": "storage_write_failed"}, 500)
    return json_response({"ok": True, "order": result})


@app.get("/api/store/orders")
def store_orders(x_admin_pin: str | None = Header(default=None)):
    if x_admin_pin != store.load_shell_admin_pin():
        return json_response({"error": "unauthorized"}, 401)
    return json_response({"orders": store.load_orders()})


@app.post("/api/store/order/status")
async def store_order_status(request: Request, x_admin_pin: str | None = Header(default=None)):
    if x_admin_pin != store.load_shell_admin_pin():
        return json_response({"error": "unauthorized"}, 401)
    try:
        payload = json.loads(await request.body())
    except json.JSONDecodeError:
        return json_response({"error": "invalid_json"}, 400)
    ok = await run_in_threadpool(store.set_order_status, payload.get("id"), payload.get("status"))
    return json_response({"ok": ok})


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/healthz")
def healthz():
    from .db import get_db_connection

    with get_db_connection() as conn:
        users_count = conn.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]
        template_count = conn.execute("SELECT COUNT(*) AS count FROM studio_template").fetchone()["count"]
        collages_count = conn.execute("SELECT COUNT(*) AS count FROM collage_records").fetchone()["count"]
    return json_response(
        {
            "ok": True,
            "database": config.DB_FILE.name,
            "users": users_count,
            "templateSaved": template_count > 0,
            "collages": collages_count,
            "storage": store.get_storage_stats(),
            "capacity": {
                "targetCollagesPerDay": 200,
                "recommendedFreeDiskGb": 100,
                "storageMode": "files_primary",
            },
        }
    )


# ---------------------------------------------------------------------------
# Data assets (history / templates) + SPA static
# ---------------------------------------------------------------------------

@app.get("/history/{path:path}")
def history_asset(path: str):
    return _serve_data_asset(f"history/{path}")


@app.get("/templates/{path:path}")
def templates_asset(path: str):
    return _serve_data_asset(f"templates/{path}")


@app.get("/uploads/{path:path}")
def uploads_asset(path: str):
    resp = _serve_data_asset(f"uploads/{path}")
    if isinstance(resp, FileResponse):
        resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return resp


def _serve_data_asset(url_path: str):
    target = config.DATA_ROOT / url_path.lstrip("/")
    if not store.is_safe_path(config.DATA_ROOT, target):
        return Response("Forbidden", status_code=403)
    resolved = target.resolve()
    if not resolved.exists() or not resolved.is_file():
        return Response("Not found", status_code=404)
    return FileResponse(resolved)


# Serve built frontend (SPA) if available. Registered last so API routes win.
if config.FRONTEND_DIST.exists():

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        candidate = (config.FRONTEND_DIST / full_path).resolve()
        if (
            full_path
            and store.is_safe_path(config.FRONTEND_DIST, candidate)
            and candidate.is_file()
        ):
            return FileResponse(candidate)
        return FileResponse(config.FRONTEND_DIST / "index.html")
