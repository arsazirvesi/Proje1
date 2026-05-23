import os
import asyncio
import io
import base64
import secrets
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any, Annotated
from pathlib import Path
import r2_storage
from image_optimizer import optimize_image
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request, Response, BackgroundTasks, Header
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field, EmailStr, BeforeValidator
from bson import ObjectId
from utils import clean_doc
from models import *
from email_service import send_email, render_register_confirmation_email

logger = logging.getLogger(__name__)
UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

from services import visitego as visitego_service

def init_visitego_router(db, get_admin_user):
    router = APIRouter(prefix="/api")

    # ==================== VISITEGO (3rd-party fair turnstile push) ====================
    
    class VisitegoConfigUpdate(BaseModel):
        token: Optional[str] = None
        enabled: Optional[bool] = None
        auto_push: Optional[bool] = None
        scope: Optional[str] = None  # both | summit | fair
    
    
    def _mask_token(token: str) -> str:
        if not token: return ""
        if len(token) <= 8: return "•" * len(token)
        return token[:4] + "•" * (len(token) - 8) + token[-4:]
    
    
    @router.get("/admin/visitego/config")
    async def admin_visitego_get(admin: dict = Depends(get_admin_user)):
        cfg = await visitego_service.get_config(db)
        return {
            "enabled": cfg["enabled"],
            "auto_push": cfg["auto_push"],
            "scope": cfg["scope"],
            "token_masked": _mask_token(cfg["token"]),
            "has_token": bool(cfg["token"]),
        }
    
    
    @router.put("/admin/visitego/config")
    async def admin_visitego_update(body: VisitegoConfigUpdate, admin: dict = Depends(get_admin_user)):
        try:
            cfg = await visitego_service.save_config(
                db,
                token=body.token,
                enabled=body.enabled,
                auto_push=body.auto_push,
                scope=body.scope,
            )
        except ValueError as e:
            raise HTTPException(400, str(e))
        return {
            "enabled": cfg["enabled"],
            "auto_push": cfg["auto_push"],
            "scope": cfg["scope"],
            "token_masked": _mask_token(cfg["token"]),
            "has_token": bool(cfg["token"]),
        }
    
    
    @router.post("/admin/visitego/sync-all")
    async def admin_visitego_sync_all(
        background_tasks: BackgroundTasks,
        only_failed: bool = False,
        admin: dict = Depends(get_admin_user),
    ):
        cfg = await visitego_service.get_config(db)
        if not cfg["enabled"] or not cfg["token"]:
            raise HTTPException(400, "Visitego entegrasyonu aktif değil veya token tanımsız")
    
        async def _runner():
            try:
                await visitego_service.sync_all_verified(db, only_failed=only_failed)
            except Exception as e:
                logger.error(f"visitego sync_all failed: {e}")
    
        background_tasks.add_task(_runner)
        pending = await db.guests.count_documents(
            {"is_verified": True, **({"$or": [{"visitego_synced": {"$ne": True}}, {"visitego_synced": {"$exists": False}}]} if only_failed else {})}
        )
        return {"started": True, "approx_pending": pending, "only_failed": only_failed}
    
    
    @router.post("/admin/visitego/push/{guest_id}")
    async def admin_visitego_push_one(guest_id: str, admin: dict = Depends(get_admin_user)):
        if not ObjectId.is_valid(guest_id):
            raise HTTPException(400, "Geçersiz guest_id")
        g = await db.guests.find_one({"_id": ObjectId(guest_id)})
        if not g:
            raise HTTPException(404, "Misafir bulunamadı")
        if not g.get("is_verified"):
            raise HTTPException(400, "Misafir e-posta doğrulamasını yapmamış")
        result = await visitego_service.push_visitor(db, g)
        return result
    
    
    @router.get("/admin/visitego/logs")
    async def admin_visitego_logs(
        status: Optional[str] = None,  # 'ok' | 'failed' | None
        limit: int = 100,
        admin: dict = Depends(get_admin_user),
    ):
        q: dict = {}
        if status == "ok":
            q["ok"] = True
        elif status == "failed":
            q["ok"] = False
        limit = max(1, min(int(limit or 100), 1000))
        docs = await db.visitego_sync_logs.find(q).sort("created_at", -1).to_list(limit)
        out = []
        for d in docs:
            d["_id"] = str(d["_id"])
            out.append(d)
        return out
    
    
    @router.get("/admin/visitego/stats")
    async def admin_visitego_stats(admin: dict = Depends(get_admin_user)):
        cfg = await visitego_service.get_config(db)
        base_q: dict = {"is_verified": True}
        if cfg["scope"] != "both":
            base_q["visit_type"] = cfg["scope"]
    
        total_eligible = await db.guests.count_documents(base_q)
        synced = await db.guests.count_documents({**base_q, "visitego_synced": True})
        failed = await db.guests.count_documents({**base_q, "visitego_synced": False})
        pending = total_eligible - synced - failed
    
        log_total = await db.visitego_sync_logs.count_documents({})
        log_ok = await db.visitego_sync_logs.count_documents({"ok": True})
        log_fail = await db.visitego_sync_logs.count_documents({"ok": False})
    
        last_log = await db.visitego_sync_logs.find_one({}, sort=[("created_at", -1)])
        last_at = last_log.get("created_at") if last_log else None
    
        return {
            "total_eligible": total_eligible,
            "synced": synced,
            "failed": failed,
            "pending": pending,
            "log_total": log_total,
            "log_ok": log_ok,
            "log_fail": log_fail,
            "last_attempt_at": last_at,
            "scope": cfg["scope"],
            "enabled": cfg["enabled"],
            "has_token": bool(cfg["token"]),
        }
    
    
    @router.post("/admin/visitego/test")
    async def admin_visitego_test(admin: dict = Depends(get_admin_user)):
        """Send a fake test payload to verify token + connectivity. Does NOT log it."""
        cfg = await visitego_service.get_config(db)
        if not cfg["token"]:
            raise HTTPException(400, "Token tanımlı değil")
        fake = {
            "_id": "TEST00000000000000000000",
            "name": "TEST KULLANICI - LÜTFEN SİLİN",
            "company": "Arsa Yatırım Zirvesi",
            "email": "test@arsayatirimzirvesi.com",
            "phone": "0000",
            "title": "Test",
            "visit_type": "fair",
        }
        payload = visitego_service._payload_from_guest(fake)
        url = f"{visitego_service.VISITEGO_BASE}/online/{cfg['token']}/create"
        import httpx
        try:
            async with httpx.AsyncClient(timeout=visitego_service.TIMEOUT_SECONDS) as client:
                r = await client.post(url, data=payload)
            return {
                "ok": 200 <= r.status_code < 300,
                "status": r.status_code,
                "response": (r.text or "")[:1500],
                "payload_sent": payload,
            }
        except Exception as e:
            return {"ok": False, "status": None, "response": "", "error": f"{type(e).__name__}: {e}", "payload_sent": payload}
    
    

    return router
