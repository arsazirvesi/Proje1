"""Visitego (3rd-party fair turnstile) integration service.

We PUSH every verified guest to Visitego so their turnstile scanners recognize
our printed badge QR codes (AYZ2026-XXXXXXXX) at the door.

API spec (form-data POST):
  POST https://visitego.com/api/v1/online/{TOKEN}/create
  Fields: qrcode, adsoyad, kurumadi, email, telefon, cardtype, gorev
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

VISITEGO_BASE = "https://visitego.com/api/v1"
TIMEOUT_SECONDS = 15
SETTINGS_KEY = "visitego_config"  # site_settings document key


def make_qrcode(guest_id: str) -> str:
    """Match the QR string printed on physical badge: AYZ2026-{LAST8UPPER}."""
    return f"AYZ2026-{str(guest_id)[-8:].upper()}"


def _payload_from_guest(guest: dict) -> dict:
    """Map our guest document → Visitego form-data payload."""
    gid = str(guest.get("_id") or guest.get("guest_id") or "")
    company = (guest.get("company") or "").strip() or "-"
    return {
        "qrcode": make_qrcode(gid),
        "adsoyad": (guest.get("name") or "").strip(),
        "kurumadi": company,
        "email": (guest.get("email") or "").strip(),
        "telefon": (guest.get("phone") or "").strip(),
        "cardtype": "ONLINE",
        "gorev": (guest.get("title") or "").strip(),
    }


async def get_config(db) -> dict:
    """Read Visitego token + enabled flag from site_settings."""
    doc = await db.site_settings.find_one({"_id": SETTINGS_KEY}) or {}
    return {
        "token": doc.get("token", "") or "",
        "enabled": bool(doc.get("enabled", False)),
        "auto_push": bool(doc.get("auto_push", True)),
        "scope": doc.get("scope", "both"),  # both / summit / fair
    }


async def save_config(db, *, token: Optional[str] = None, enabled: Optional[bool] = None,
                      auto_push: Optional[bool] = None, scope: Optional[str] = None) -> dict:
    """Upsert Visitego config."""
    update: dict[str, Any] = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if token is not None:
        update["token"] = token.strip()
    if enabled is not None:
        update["enabled"] = bool(enabled)
    if auto_push is not None:
        update["auto_push"] = bool(auto_push)
    if scope is not None:
        if scope not in ("both", "summit", "fair"):
            raise ValueError("scope must be one of: both, summit, fair")
        update["scope"] = scope
    await db.site_settings.update_one({"_id": SETTINGS_KEY}, {"$set": update}, upsert=True)
    return await get_config(db)


async def push_visitor(db, guest: dict) -> dict:
    """Push a single guest to Visitego. Always logs the attempt.

    Returns: {"ok": bool, "status": int|None, "response": str, "error": str|None, "qrcode": str}
    """
    cfg = await get_config(db)
    qrcode = make_qrcode(str(guest.get("_id") or guest.get("guest_id") or ""))

    if not cfg["enabled"] or not cfg["token"]:
        result = {"ok": False, "status": None, "response": "", "error": "visitego_disabled_or_no_token", "qrcode": qrcode}
        await _log_sync(db, guest, result, payload=None)
        return result

    # Scope filter
    visit_type = guest.get("visit_type", "summit")
    if cfg["scope"] != "both" and cfg["scope"] != visit_type:
        result = {"ok": False, "status": None, "response": "", "error": f"scope_mismatch ({cfg['scope']} vs {visit_type})", "qrcode": qrcode}
        await _log_sync(db, guest, result, payload=None)
        return result

    payload = _payload_from_guest(guest)
    url = f"{VISITEGO_BASE}/online/{cfg['token']}/create"

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            r = await client.post(url, data=payload)
        ok = 200 <= r.status_code < 300
        result = {
            "ok": ok,
            "status": r.status_code,
            "response": (r.text or "")[:1000],
            "error": None if ok else f"http_{r.status_code}",
            "qrcode": qrcode,
        }
    except httpx.TimeoutException:
        result = {"ok": False, "status": None, "response": "", "error": "timeout", "qrcode": qrcode}
    except Exception as e:  # noqa: BLE001
        result = {"ok": False, "status": None, "response": "", "error": f"exception: {type(e).__name__}: {e}", "qrcode": qrcode}

    await _log_sync(db, guest, result, payload=payload)
    return result


async def _log_sync(db, guest: dict, result: dict, payload: Optional[dict]) -> None:
    """Append a record to visitego_sync_logs and update guest's last_visitego_* fields."""
    now_iso = datetime.now(timezone.utc).isoformat()
    gid = str(guest.get("_id") or guest.get("guest_id") or "")
    log_doc = {
        "guest_id": gid,
        "name": guest.get("name", ""),
        "email": guest.get("email", ""),
        "visit_type": guest.get("visit_type", "summit"),
        "qrcode": result.get("qrcode"),
        "ok": bool(result.get("ok")),
        "status_code": result.get("status"),
        "response": result.get("response", "")[:1000],
        "error": result.get("error"),
        "payload": payload,
        "created_at": now_iso,
    }
    try:
        await db.visitego_sync_logs.insert_one(log_doc)
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to write visitego sync log: {e}")

    # Mark on guest doc
    try:
        from bson import ObjectId  # local import; bson is already a dep via motor
        if guest.get("_id"):
            await db.guests.update_one(
                {"_id": guest["_id"] if isinstance(guest["_id"], ObjectId) else ObjectId(str(guest["_id"]))},
                {"$set": {
                    "visitego_synced": bool(result.get("ok")),
                    "visitego_last_attempt_at": now_iso,
                    "visitego_last_error": result.get("error"),
                }},
            )
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to update guest visitego flags: {e}")


async def sync_all_verified(db, *, only_failed: bool = False, concurrency: int = 4) -> dict:
    """Bulk push every verified guest. Returns aggregate stats."""
    cfg = await get_config(db)
    if not cfg["enabled"] or not cfg["token"]:
        return {"ok": False, "error": "visitego_disabled_or_no_token", "total": 0, "success": 0, "failed": 0}

    query: dict = {"is_verified": True}
    if cfg["scope"] != "both":
        query["visit_type"] = cfg["scope"]
    if only_failed:
        query["$or"] = [{"visitego_synced": {"$ne": True}}, {"visitego_synced": {"$exists": False}}]

    cursor = db.guests.find(query)
    guests = await cursor.to_list(length=10000)
    total = len(guests)
    success = 0
    failed = 0

    sem = asyncio.Semaphore(concurrency)

    async def run_one(g: dict) -> None:
        nonlocal success, failed
        async with sem:
            r = await push_visitor(db, g)
            if r.get("ok"):
                success += 1
            else:
                failed += 1

    await asyncio.gather(*(run_one(g) for g in guests))

    return {"ok": True, "total": total, "success": success, "failed": failed}
