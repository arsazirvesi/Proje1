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


def init_admin_ops_router(db, get_admin_user, get_current_user):
    router = APIRouter(prefix="/api")

    # ==================== ADMIN DASHBOARD ====================
    
    @router.get("/admin/dashboard")
    async def admin_dashboard(admin: dict = Depends(get_admin_user)):
        members_count = await db.members.count_documents({})
        guests_count = await db.guests.count_documents({})
        exhibitors_count = await db.exhibitors.count_documents({})
        speaker_apps_count = await db.speaker_applications.count_documents({})
        blog_count = await db.blog_posts.count_documents({})
        events_count = await db.past_events.count_documents({})
        recent_members = await db.members.find({}).sort("created_at", -1).limit(5).to_list(5)
        recent_guests = await db.guests.find({}).sort("created_at", -1).limit(5).to_list(5)
        recent_exhibitors = await db.exhibitors.find({}).sort("created_at", -1).limit(5).to_list(5)
        recent_speaker_apps = await db.speaker_applications.find({}).sort("created_at", -1).limit(5).to_list(5)
        return {
            "stats": {
                "members": members_count,
                "guests": guests_count,
                "exhibitors": exhibitors_count,
                "speaker_applications": speaker_apps_count,
                "blog_posts": blog_count,
                "events": events_count,
            },
            "recent_members": [clean_doc(d) for d in recent_members],
            "recent_guests": [clean_doc(d) for d in recent_guests],
            "recent_exhibitors": [clean_doc(d) for d in recent_exhibitors],
            "recent_speaker_applications": [clean_doc(d) for d in recent_speaker_apps],
        }
    
    
    # ==================== CHECK-IN (QR Badge Validation) ====================
    
    class CheckInRequest(BaseModel):
        code: str
    
    
    def _parse_checkin_code(raw: str) -> Optional[str]:
        """Extract guest_id from QR code text. Accepts:
        - "00AYZ2026-{guest_id}" (NEW format — leading 00 for offline-tolerance)
        - "AYZ2026-{guest_id}" (legacy format)
        - Plain guest_id
        - URL containing /badge/{guest_id} (legacy)
        Returns guest_id or None."""
        if not raw:
            return None
        code = raw.strip()
        if code.startswith("00AYZ2026-"):
            return code[len("00AYZ2026-"):].strip()
        if code.startswith("AYZ2026-"):
            return code[len("AYZ2026-"):].strip()
        if "/badge/" in code:
            return code.split("/badge/")[-1].split("/")[0].split("?")[0].strip()
        return code
    
    
    @router.post("/admin/checkin")
    async def admin_checkin(body: CheckInRequest, admin: dict = Depends(get_admin_user)):
        """Validate a badge QR code and check the guest in.
        Status values:
        - approved: First valid scan, guest now checked in
        - already_checked_in: Guest already scanned earlier
        - not_verified: Guest registered but never confirmed email
        - not_found: Code does not match any guest
        """
        guest_id = _parse_checkin_code(body.code)
        if not guest_id:
            return {"status": "not_found", "message": "Geçersiz QR kod"}
    
        if not ObjectId.is_valid(guest_id):
            return {"status": "not_found", "message": "Yaka kartı sistemde bulunamadı"}
    
        obj_id = ObjectId(guest_id)
        guest = await db.guests.find_one({"_id": obj_id})
        if not guest:
            return {"status": "not_found", "message": "Yaka kartı sistemde bulunamadı"}
    
        visit_type = guest.get("visit_type", "summit")
        visit_label = "Zirve" if visit_type == "summit" else "Fuar"
        guest_info = {
            "guest_id": guest_id,
            "name": guest.get("name", ""),
            "company": guest.get("company", ""),
            "title": guest.get("title", ""),
            "email": guest.get("email", ""),
            "phone": guest.get("phone", ""),
            "city": guest.get("city", ""),
            "visit_type": visit_type,
            "visit_label": visit_label,
            "badge_id": f"00AYZ2026-{guest_id[-8:].upper()}",
        }
    
        # Not email-verified yet
        if not guest.get("is_verified"):
            return {
                "status": "not_verified",
                "message": "Bu yaka kartının sahibi e-posta doğrulamasını yapmamış",
                "guest": guest_info,
            }
    
        # Already checked in
        if guest.get("checked_in"):
            guest_info["checked_in_at"] = guest.get("checked_in_at")
            guest_info["checked_in_by"] = guest.get("checked_in_by")
            return {
                "status": "already_checked_in",
                "message": "Bu yaka kartı daha önce okutulmuş",
                "guest": guest_info,
            }
    
        # Approve and mark checked in
        now_iso = datetime.now(timezone.utc).isoformat()
        await db.guests.update_one(
            {"_id": obj_id},
            {"$set": {
                "checked_in": True,
                "checked_in_at": now_iso,
                "checked_in_by": admin.get("email", "admin"),
            }},
        )
        guest_info["checked_in_at"] = now_iso
        return {
            "status": "approved",
            "message": "Giriş onaylandı — Hoş geldiniz!",
            "guest": guest_info,
        }
    
    
    @router.get("/admin/checkin/stats")
    async def admin_checkin_stats(admin: dict = Depends(get_admin_user)):
        """Quick stats for the check-in dashboard."""
        total = await db.guests.count_documents({"is_verified": True})
        checked = await db.guests.count_documents({"checked_in": True})
        summit_total = await db.guests.count_documents({"is_verified": True, "visit_type": "summit"})
        summit_checked = await db.guests.count_documents({"checked_in": True, "visit_type": "summit"})
        fair_total = await db.guests.count_documents({"is_verified": True, "visit_type": "fair"})
        fair_checked = await db.guests.count_documents({"checked_in": True, "visit_type": "fair"})
        return {
            "total_verified": total,
            "total_checked_in": checked,
            "summit": {"verified": summit_total, "checked_in": summit_checked},
            "fair": {"verified": fair_total, "checked_in": fair_checked},
        }
    
    
    @router.post("/admin/checkin/reset/{guest_id}")
    async def admin_checkin_reset(guest_id: str, admin: dict = Depends(get_admin_user)):
        """Allow re-entry by clearing check-in flag (useful if a guest accidentally
        got marked or for testing)."""
        if not ObjectId.is_valid(guest_id):
            raise HTTPException(404, "Ziyaretçi bulunamadı")
        res = await db.guests.update_one(
            {"_id": ObjectId(guest_id)},
            {"$set": {"checked_in": False}, "$unset": {"checked_in_at": "", "checked_in_by": ""}},
        )
        if res.matched_count == 0:
            raise HTTPException(404, "Ziyaretçi bulunamadı")
        return {"reset": True}
    
    
    # ==================== INVITE CODES (Admin CRUD) ====================
    
    @router.get("/admin/invite-codes")
    async def admin_list_invite_codes(admin: dict = Depends(get_admin_user)):
        docs = await db.invite_codes.find({}).sort("created_at", -1).to_list(500)
        return [clean_doc(d) for d in docs]
    
    
    @router.post("/admin/invite-codes")
    async def admin_create_invite_code(body: InviteCodeCreate, admin: dict = Depends(get_admin_user)):
        code = body.code.strip().upper()
        if not code or len(code) < 3:
            raise HTTPException(400, "Kod en az 3 karakter olmalı")
        existing = await db.invite_codes.find_one({"code": code})
        if existing:
            raise HTTPException(400, f"'{code}' kodu zaten mevcut")
        valid_for = body.valid_for if body.valid_for in ("summit", "fair", "both") else "both"
        now_iso = datetime.now(timezone.utc).isoformat()
        doc = {
            "code": code,
            "label": (body.label or "").strip(),
            "valid_for": valid_for,
            "max_uses": max(0, int(body.max_uses or 0)),
            "used_count": 0,
            "is_active": bool(body.is_active),
            "expires_at": body.expires_at or None,
            "created_at": now_iso,
            "created_by": admin.get("email", "admin"),
        }
        result = await db.invite_codes.insert_one(doc)
        return clean_doc({**doc, "_id": result.inserted_id})
    
    
    @router.put("/admin/invite-codes/{code_id}")
    async def admin_update_invite_code(code_id: str, body: InviteCodeUpdate, admin: dict = Depends(get_admin_user)):
        if not ObjectId.is_valid(code_id):
            raise HTTPException(404, "Kod bulunamadı")
        update = {}
        if body.label is not None:
            update["label"] = body.label.strip()
        if body.valid_for is not None and body.valid_for in ("summit", "fair", "both"):
            update["valid_for"] = body.valid_for
        if body.max_uses is not None:
            update["max_uses"] = max(0, int(body.max_uses))
        if body.is_active is not None:
            update["is_active"] = bool(body.is_active)
        if body.expires_at is not None:
            update["expires_at"] = body.expires_at or None
        if not update:
            raise HTTPException(400, "Güncellenecek alan yok")
        result = await db.invite_codes.update_one({"_id": ObjectId(code_id)}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(404, "Kod bulunamadı")
        doc = await db.invite_codes.find_one({"_id": ObjectId(code_id)})
        return clean_doc(doc)
    
    
    @router.delete("/admin/invite-codes/{code_id}")
    async def admin_delete_invite_code(code_id: str, admin: dict = Depends(get_admin_user)):
        if not ObjectId.is_valid(code_id):
            raise HTTPException(404, "Kod bulunamadı")
        result = await db.invite_codes.delete_one({"_id": ObjectId(code_id)})
        if result.deleted_count == 0:
            raise HTTPException(404, "Kod bulunamadı")
        return {"deleted": True}
    
    
    # ==================== API KEYS (3rd-party access) ====================
    
    def _generate_api_key() -> str:
        """Generate a secure 40-char API key with prefix."""
        return "ayz_" + secrets.token_urlsafe(30)
    
    
    @router.get("/admin/api-keys")
    async def admin_list_api_keys(admin: dict = Depends(get_admin_user)):
        docs = await db.api_keys.find({}).sort("created_at", -1).to_list(200)
        return [clean_doc(d) for d in docs]
    
    
    @router.post("/admin/api-keys")
    async def admin_create_api_key(body: ApiKeyCreate, admin: dict = Depends(get_admin_user)):
        label = (body.label or "").strip()
        if len(label) < 2:
            raise HTTPException(400, "Etiket en az 2 karakter olmalı")
        valid_for = body.valid_for if body.valid_for in ("summit", "fair", "both") else "both"
        key = _generate_api_key()
        now_iso = datetime.now(timezone.utc).isoformat()
        doc = {
            "key": key,
            "label": label,
            "valid_for": valid_for,
            "is_active": True,
            "usage_count": 0,
            "last_used_at": None,
            "created_at": now_iso,
            "created_by": admin.get("email", "admin"),
        }
        result = await db.api_keys.insert_one(doc)
        return clean_doc({**doc, "_id": result.inserted_id})
    
    
    @router.put("/admin/api-keys/{key_id}")
    async def admin_update_api_key(key_id: str, body: ApiKeyUpdate, admin: dict = Depends(get_admin_user)):
        if not ObjectId.is_valid(key_id):
            raise HTTPException(404, "Anahtar bulunamadı")
        update = {}
        if body.label is not None:
            update["label"] = body.label.strip()
        if body.valid_for is not None and body.valid_for in ("summit", "fair", "both"):
            update["valid_for"] = body.valid_for
        if body.is_active is not None:
            update["is_active"] = bool(body.is_active)
        if not update:
            raise HTTPException(400, "Güncellenecek alan yok")
        result = await db.api_keys.update_one({"_id": ObjectId(key_id)}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(404, "Anahtar bulunamadı")
        doc = await db.api_keys.find_one({"_id": ObjectId(key_id)})
        return clean_doc(doc)
    
    
    @router.delete("/admin/api-keys/{key_id}")
    async def admin_delete_api_key(key_id: str, admin: dict = Depends(get_admin_user)):
        if not ObjectId.is_valid(key_id):
            raise HTTPException(404, "Anahtar bulunamadı")
        res = await db.api_keys.delete_one({"_id": ObjectId(key_id)})
        if res.deleted_count == 0:
            raise HTTPException(404, "Anahtar bulunamadı")
        return {"deleted": True}
    
    
    # ===== Public external endpoint (used by 3rd-party scanners) =====
    
    async def _validate_api_key(api_key: Optional[str]) -> dict:
        """Look up an API key, ensure it's active, and update its usage tracking."""
        if not api_key or not api_key.strip():
            raise HTTPException(401, "X-API-Key header gerekli")
        doc = await db.api_keys.find_one({"key": api_key.strip()})
        if not doc:
            raise HTTPException(401, "Geçersiz API anahtarı")
        if not doc.get("is_active", True):
            raise HTTPException(403, "API anahtarı pasif")
        # Async-update usage stats (fire-and-forget style)
        await db.api_keys.update_one(
            {"_id": doc["_id"]},
            {"$inc": {"usage_count": 1}, "$set": {"last_used_at": datetime.now(timezone.utc).isoformat()}},
        )
        return doc
    
    
    @router.post("/external/checkin")
    async def external_checkin(
        body: ExternalCheckInRequest,
        x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    ):
        """3rd-party check-in endpoint. Used by exhibitor / fair company scanners.
    
        Headers: X-API-Key: <api_key>
        Body: { "code": "AYZ2026-...", "mark_checkin": true }
    
        Returns same shape as POST /admin/checkin:
        { status: "approved" | "already_checked_in" | "not_verified" | "not_found",
          message: str, guest: {...} }
        """
        api_key_doc = await _validate_api_key(x_api_key)
        allowed = api_key_doc.get("valid_for", "both")
    
        guest_id = _parse_checkin_code(body.code)
        if not guest_id or not ObjectId.is_valid(guest_id):
            return {"status": "not_found", "message": "Geçersiz QR kod"}
    
        obj_id = ObjectId(guest_id)
        guest = await db.guests.find_one({"_id": obj_id})
        if not guest:
            return {"status": "not_found", "message": "Yaka kartı sistemde bulunamadı"}
    
        visit_type = guest.get("visit_type", "summit")
        if allowed != "both" and allowed != visit_type:
            # API key is scoped to a different visit type
            return {
                "status": "not_found",
                "message": f"Bu API anahtarı {visit_type} ziyaretçilerini doğrulamaya yetkili değil",
            }
    
        visit_label = "Zirve" if visit_type == "summit" else "Fuar"
        guest_info = {
            "guest_id": guest_id,
            "name": guest.get("name", ""),
            "company": guest.get("company", ""),
            "title": guest.get("title", ""),
            "email": guest.get("email", ""),
            "phone": guest.get("phone", ""),
            "city": guest.get("city", ""),
            "visit_type": visit_type,
            "visit_label": visit_label,
            "badge_id": f"00AYZ2026-{guest_id[-8:].upper()}",
        }
    
        if not guest.get("is_verified"):
            return {"status": "not_verified", "message": "Bu yaka kartının sahibi e-posta doğrulamasını yapmamış", "guest": guest_info}
    
        if guest.get("checked_in"):
            guest_info["checked_in_at"] = guest.get("checked_in_at")
            guest_info["checked_in_by"] = guest.get("checked_in_by")
            return {"status": "already_checked_in", "message": "Bu yaka kartı daha önce okutulmuş", "guest": guest_info}
    
        if not body.mark_checkin:
            # Validation only — do not update DB
            return {"status": "approved", "message": "Yaka kartı geçerli", "guest": guest_info}
    
        now_iso = datetime.now(timezone.utc).isoformat()
        await db.guests.update_one(
            {"_id": obj_id},
            {"$set": {
                "checked_in": True,
                "checked_in_at": now_iso,
                "checked_in_by": f"api:{api_key_doc.get('label', 'external')}",
            }},
        )
        guest_info["checked_in_at"] = now_iso
        return {"status": "approved", "message": "Giriş onaylandı", "guest": guest_info}
    
    
    @router.get("/external/guests")
    async def external_list_guests(
        visit_type: Optional[str] = None,
        limit: int = 1000,
        x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    ):
        """3rd-party endpoint to fetch the verified guest list (for offline lookup).
    
        Headers: X-API-Key: <api_key>
        Query:   ?visit_type=fair|summit (optional, filtered to API key's scope)
                 ?limit=1000 (max 5000)
        """
        api_key_doc = await _validate_api_key(x_api_key)
        allowed = api_key_doc.get("valid_for", "both")
    
        # Apply scope: API key only sees what it's allowed to
        if allowed == "both":
            query_visit = visit_type if visit_type in ("summit", "fair") else None
        else:
            # If they request something outside their scope, deny
            if visit_type and visit_type != allowed:
                raise HTTPException(403, f"Bu API anahtarı sadece {allowed} kayıtlarını görebilir")
            query_visit = allowed
    
        query = {"is_verified": True}
        if query_visit:
            query["visit_type"] = query_visit
    
        limit = max(1, min(int(limit or 1000), 5000))
        docs = await db.guests.find(query).sort("created_at", -1).to_list(limit)
        out = []
        for d in docs:
            gid = str(d["_id"])
            out.append({
                "guest_id": gid,
                "badge_id": f"00AYZ2026-{gid[-8:].upper()}",
                "name": d.get("name", ""),
                "company": d.get("company", ""),
                "title": d.get("title", ""),
                "email": d.get("email", ""),
                "phone": d.get("phone", ""),
                "city": d.get("city", ""),
                "visit_type": d.get("visit_type", "summit"),
                "checked_in": bool(d.get("checked_in", False)),
                "checked_in_at": d.get("checked_in_at"),
            })
        return {"count": len(out), "guests": out}
    
    
    # ==================== ADMIN USERS (Admin Account Management) ====================
    
    @router.get("/admin/users")
    async def admin_list_users(admin: dict = Depends(get_admin_user)):
        docs = await db.users.find({}, {"password_hash": 0}).sort("created_at", -1).to_list(100)
        return [clean_doc(d) for d in docs]
    
    @router.post("/admin/users")
    async def admin_create_user(body: AdminUserCreate, admin: dict = Depends(get_admin_user)):
        if len(body.password) < 8:
            raise HTTPException(400, "Şifre en az 8 karakter olmalıdır")
        role = (body.role or "admin").lower()
        if role not in ("admin", "expert"):
            raise HTTPException(400, "Geçersiz rol (admin veya expert)")
        email = body.email.lower()
        existing = await db.users.find_one({"email": email})
        if existing:
            raise HTTPException(400, "Bu email ile zaten bir kullanıcı var")
        doc = {
            "email": email,
            "password_hash": hash_password(body.password),
            "name": body.name,
            "role": role,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin["email"],
        }
        result = await db.users.insert_one(doc)
        return {"id": str(result.inserted_id), "email": email, "name": body.name, "role": role, "message": "Yeni kullanıcı oluşturuldu"}
    
    @router.patch("/admin/users/{user_id}/password")
    async def admin_change_password(user_id: str, body: AdminPasswordChange, admin: dict = Depends(get_admin_user)):
        if len(body.new_password) < 8:
            raise HTTPException(400, "Şifre en az 8 karakter olmalıdır")
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password_hash": hash_password(body.new_password), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(404, "Admin bulunamadı")
        return {"message": "Şifre güncellendi"}
    
    @router.patch("/admin/users/{user_id}/name")
    async def admin_update_name(user_id: str, body: AdminNameUpdate, admin: dict = Depends(get_admin_user)):
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"name": body.name, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(404, "Admin bulunamadı")
        return {"message": "İsim güncellendi"}
    
    @router.delete("/admin/users/{user_id}")
    async def admin_delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
        if admin.get("_id") == user_id:
            raise HTTPException(400, "Kendi hesabınızı silemezsiniz")
        result = await db.users.delete_one({"_id": ObjectId(user_id)})
        if result.deleted_count == 0:
            raise HTTPException(404, "Admin bulunamadı")
        # Don't allow deleting all admins
        remaining = await db.users.count_documents({"role": "admin"})
        if remaining == 0:
            # Restore the deleted one (shouldn't happen in normal flow, but safety)
            raise HTTPException(400, "Sistemde en az bir admin olmalıdır")
        return {"message": "Admin silindi"}
    
    

    return router
