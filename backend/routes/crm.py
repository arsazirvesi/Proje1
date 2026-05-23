import os
import asyncio
import io
import base64
import secrets
import logging
import re
import html as html_escape
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
from routes.badge import render_badge_png

logger = logging.getLogger(__name__)
UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def init_crm_router(db, get_admin_user):
    router = APIRouter(prefix="/api")

    # ==================== ADMIN MEMBERS ====================
    
    @router.get("/admin/members")
    async def admin_get_members(admin: dict = Depends(get_admin_user)):
        docs = await db.members.find({}).sort("created_at", -1).to_list(1000)
        return [clean_doc(d) for d in docs]
    
    @router.delete("/admin/members/{member_id}")
    async def admin_delete_member(member_id: str, admin: dict = Depends(get_admin_user)):
        result = await db.members.delete_one({"_id": ObjectId(member_id)})
        if result.deleted_count == 0:
            raise HTTPException(404, "Üye bulunamadı")
        return {"message": "Üye silindi"}
    
    
    # ==================== ADMIN GUESTS (VISITORS) ====================
    
    @router.get("/admin/guests")
    async def admin_get_guests(
        status: Optional[str] = None,
        q: Optional[str] = None,
        visit_type: Optional[str] = None,
        verified: Optional[str] = None,
        admin: dict = Depends(get_admin_user),
    ):
        query: dict = {}
        if status and status != "all":
            query["status"] = status
        if verified == "yes":
            query["is_verified"] = True
        elif verified == "no":
            query["$or"] = [{"is_verified": False}, {"is_verified": {"$exists": False}}]
        if visit_type and visit_type in ("summit", "fair", "seminar"):
            # Summit filter: include anything that's NOT explicitly "fair"/"seminar" — covers
            # legacy records with missing/null/empty/"zirve"/"konferans" visit_type values.
            # Fair filter: only explicit "fair".
            # Seminar filter: only explicit "seminar".
            if visit_type == "summit":
                vt_or = [
                    {"visit_type": "summit"},
                    {"visit_type": "zirve"},
                    {"visit_type": "konferans"},
                    {"visit_type": ""},
                    {"visit_type": {"$exists": False}},
                    {"visit_type": None},
                ]
            elif visit_type == "fair":
                vt_or = [{"visit_type": "fair"}]
            else:
                vt_or = [{"visit_type": "seminar"}]
            if "$or" in query:
                existing_or = query.pop("$or")
                query["$and"] = [{"$or": existing_or}, {"$or": vt_or}]
            else:
                query["$or"] = vt_or
        if q:
            name_or = [
                {"name": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}},
                {"company": {"$regex": q, "$options": "i"}},
                {"phone": {"$regex": q, "$options": "i"}},
                {"invite_code": {"$regex": q, "$options": "i"}},
            ]
            if "$or" in query:
                existing_or = query.pop("$or")
                query["$and"] = [{"$or": existing_or}, {"$or": name_or}]
            elif "$and" in query:
                query["$and"].append({"$or": name_or})
            else:
                query["$or"] = name_or
        # Oldest first so #1 is first registered visitor
        docs = await db.guests.find(query).sort("created_at", 1).to_list(5000)
        cleaned = []
        for d in docs:
            try:
                cleaned.append(clean_doc(d))
            except Exception as e:
                # One bad record shouldn't kill the whole response.
                logger.error(f"clean_doc failed for guest _id={d.get('_id')}: {e}")
                try:
                    cleaned.append({
                        "id": str(d.get("_id")),
                        "name": d.get("name") or "(bozuk kayıt)",
                        "email": d.get("email") or "",
                        "phone": d.get("phone") or "",
                        "company": d.get("company") or "",
                        "visit_type": d.get("visit_type") or "summit",
                        "status": d.get("status") or "new",
                        "is_verified": bool(d.get("is_verified")),
                        "created_at": "",
                        "_corrupted": True,
                    })
                except Exception:
                    continue
        return cleaned
    
    @router.post("/admin/guests/bulk-reserve")
    async def admin_bulk_reserve(body: BulkReserveRequest, admin: dict = Depends(get_admin_user)):
        """Reserve N summit slots under a given invite_code as 'No Name' placeholders.
        Admin fills in actual names later via the edit drawer. Idempotent per email pattern.
        """
        code = body.invite_code.strip().upper()
    
        # Validate invite code exists & is summit-compatible
        code_doc = await db.invite_codes.find_one({"code": code, "is_active": True})
        if not code_doc:
            raise HTTPException(400, f"Davet kodu bulunamadı veya pasif: {code}")
        if code_doc.get("valid_for") == "fair":
            raise HTTPException(400, "Bu davet kodu sadece fuar için, summit rezervasyonu yapılamaz")
    
        # Capacity check (verified summit guests + new reservations must <= SUMMIT_CAPACITY)
        summit_count = await db.guests.count_documents({
            "visit_type": {"$in": ["summit", None]},
            "is_verified": True,
        })
        if summit_count + body.count > SUMMIT_CAPACITY:
            remaining = SUMMIT_CAPACITY - summit_count
            raise HTTPException(
                400,
                f"Kapasite aşımı: kalan {remaining} kişilik yer var, {body.count} rezerve edilemez."
            )
    
        now = datetime.now(timezone.utc).isoformat()
        email_slug = re.sub(r"[^a-z0-9]+", "", code.lower())[:24] or "reserved"
        label = code_doc.get("label") or code
    
        # Determine next sequence by scanning existing reservations for this code
        existing_count = await db.guests.count_documents({
            "invite_code": code, "is_reserved": True,
        })
        start_seq = existing_count + 1
    
        docs = []
        for i in range(body.count):
            seq = start_seq + i
            seq_str = f"{seq:03d}"
            email = f"reserved-{email_slug}-{seq_str}@reserved-{email_slug}.local"
            # Make sure email is unique (in case of historical reservations w/ different scheme)
            collision = await db.guests.find_one({"email": email}, {"_id": 1})
            if collision:
                continue
            docs.append({
                "name": f"No Name #{seq_str}",
                "email": email,
                "phone": f"00000{seq_str.zfill(6)}",
                "visit_type": "summit",
                "invite_code": code,
                "city": "",
                "company": "",
                "title": "",
                "participant_type": "bireysel",
                "interest": "",
                "expectations": "",
                "is_verified": True,
                "verified_at": now,
                "verification_token": None,
                "verification_sent_at": None,
                "badge_printed": False,
                "status": "reserved",
                "admin_notes": body.note or f"Rezerve ({label}) — isim sonradan girilecek",
                "is_reserved": True,
                "created_at": now,
                "updated_at": now,
            })
    
        if not docs:
            return {"inserted": 0, "skipped": body.count, "message": "Zaten tüm sıralar mevcuttu"}
    
        result = await db.guests.insert_many(docs)
        inserted = len(result.inserted_ids)
    
        await db.invite_codes.update_one(
            {"_id": code_doc["_id"]},
            {"$inc": {"used_count": inserted}, "$set": {"last_used_at": now}},
        )
    
        new_summit_count = await db.guests.count_documents({
            "visit_type": {"$in": ["summit", None]},
            "is_verified": True,
        })
    
        return {
            "inserted": inserted,
            "skipped": body.count - inserted,
            "code": code,
            "label": label,
            "total_summit_after": new_summit_count,
            "remaining_capacity": SUMMIT_CAPACITY - new_summit_count,
        }
    
    
    @router.patch("/admin/guests/{guest_id}")
    async def admin_update_guest(guest_id: str, body: StatusUpdate, admin: dict = Depends(get_admin_user)):
        update = {"status": body.status, "updated_at": datetime.now(timezone.utc).isoformat()}
        if body.admin_notes is not None:
            update["admin_notes"] = body.admin_notes
        result = await db.guests.update_one({"_id": ObjectId(guest_id)}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(404, "Ziyaretçi bulunamadı")
        return {"message": "Güncellendi"}
    
    
    @router.put("/admin/guests/{guest_id}")
    async def admin_edit_guest(guest_id: str, body: GuestEdit, admin: dict = Depends(get_admin_user)):
        """Full edit of a guest record. Used for filling in reserved (placeholder) slots."""
        if not ObjectId.is_valid(guest_id):
            raise HTTPException(400, "Geçersiz ID")
        existing = await db.guests.find_one({"_id": ObjectId(guest_id)})
        if not existing:
            raise HTTPException(404, "Ziyaretçi bulunamadı")
    
        update: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
        fields = body.model_dump(exclude_unset=True)
    
        # If email is being changed, check collision (except for self)
        new_email = fields.get("email")
        if new_email is not None:
            new_email = new_email.strip().lower()
            if new_email and new_email != existing.get("email"):
                collision = await db.guests.find_one({"email": new_email, "_id": {"$ne": ObjectId(guest_id)}})
                if collision:
                    raise HTTPException(400, "Bu e-posta başka bir kayıtta zaten kullanılıyor")
            fields["email"] = new_email
    
        # Whitelist
        for key in (
            "name", "phone", "email", "company", "title", "city",
            "participant_type", "interest", "expectations", "admin_notes",
            "status", "is_reserved",
        ):
            if key in fields:
                v = fields[key]
                if isinstance(v, str):
                    v = v.strip()
                update[key] = v
    
        # If filling in a reserved record, auto-flip is_reserved off when name+phone set
        if existing.get("is_reserved") and update.get("name") and update.get("phone"):
            if update["name"] != existing.get("name") or update["phone"] != existing.get("phone"):
                update.setdefault("is_reserved", False)
                update.setdefault("status", "new")
    
        await db.guests.update_one({"_id": ObjectId(guest_id)}, {"$set": update})
        refreshed = await db.guests.find_one({"_id": ObjectId(guest_id)})
        return clean_doc(refreshed)
    
    
    @router.delete("/admin/guests/{guest_id}")
    async def admin_delete_guest(guest_id: str, admin: dict = Depends(get_admin_user)):
        result = await db.guests.delete_one({"_id": ObjectId(guest_id)})
        if result.deleted_count == 0:
            raise HTTPException(404, "Ziyaretçi bulunamadı")
        return {"message": "Ziyaretçi silindi"}
    
    
    class BulkDeleteGuestsBody(BaseModel):
        ids: List[str]
    
    
    @router.post("/admin/guests/bulk-delete")
    async def admin_bulk_delete_guests(body: BulkDeleteGuestsBody, admin: dict = Depends(get_admin_user)):
        if not body.ids:
            raise HTTPException(400, "Silinecek kayıt seçilmedi")
        obj_ids = []
        for i in body.ids:
            if ObjectId.is_valid(i):
                obj_ids.append(ObjectId(i))
        if not obj_ids:
            raise HTTPException(400, "Geçerli ID yok")
        result = await db.guests.delete_many({"_id": {"$in": obj_ids}})
        return {"message": f"{result.deleted_count} kayıt silindi", "deleted": result.deleted_count}
    
    
    # === Resend badge & reminder emails ===
    
    async def _build_badge_attachment(guest_full: dict) -> Optional[list]:
        """Render badge PNG and wrap for SendGrid attachment."""
        try:
            is_summit = (guest_full.get("visit_type") or "summit") == "summit"
            seq = await db.guests.count_documents({
                "visit_type": ({"$in": ["summit", None]} if is_summit else "fair"),
                "is_verified": True,
                "verified_at": {"$lte": guest_full.get("verified_at") or datetime.now(timezone.utc).isoformat()},
            })
            badge_png = await asyncio.to_thread(render_badge_png, guest_full, seq or 1)
            gid = str(guest_full.get("_id") or "")
            return [{
                "content_bytes": badge_png,
                "filename": f"yaka-karti-{gid[-8:]}.png",
                "mime_type": "image/png",
            }], seq or 1
        except Exception as e:
            logger.error(f"Failed to render badge attachment: {e}")
            return None, 0
    
    
    @router.post("/admin/guests/{guest_id}/resend-badge")
    async def admin_resend_badge(guest_id: str, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
        try:
            guest = await db.guests.find_one({"_id": ObjectId(guest_id)})
        except Exception:
            raise HTTPException(400, "Geçersiz ID")
        if not guest:
            raise HTTPException(404, "Ziyaretçi bulunamadı")
        email = (guest.get("email") or "").strip().lower()
        if not email:
            raise HTTPException(400, "Bu ziyaretçinin e-posta adresi yok")
    
        public_base = os.environ.get("PUBLIC_BASE_URL", "https://arsayatirimzirvesi.com").rstrip("/")
        attachments, seq = await _build_badge_attachment(guest)
        subject, html = render_register_confirmation_email(guest, seq, public_base)
        background_tasks.add_task(send_email, email, subject, html, attachments)
        await db.guests.update_one(
            {"_id": guest["_id"]},
            {"$set": {"last_email_sent_at": datetime.now(timezone.utc).isoformat(),
                      "last_email_type": "badge_resend"}}
        )
        return {"message": f"Yaka kartı tekrar gönderildi: {email}"}
    
    
    def render_reminder_email(guest: dict, public_base_url: str) -> tuple[str, str]:
        """Reminder email: friendly nudge + badge access link."""
        visit_type = guest.get("visit_type") or "summit"
        is_summit = visit_type == "summit"
        accent = "#D4AF37" if is_summit else "#22316a"
        accent_bg = "#22316a" if is_summit else "#F5E6A3"
        accent_text = "#fff" if is_summit else "#22316a"
        label = "Arsa Yatırım Zirvesi 2026" if is_summit else "8. Gayrimenkul Proje Yatırım Fuarı"
        venue_info = ("21 Mayıs 2026 · 11:30 - 15:50" if is_summit else "20-21 Mayıs 2026 · 10:00 - 19:00")
        subject = f"Hatırlatma · {label} · 21 Mayıs"
        name = (guest.get("name") or "").strip() or "Misafir"
        guest_id = str(guest.get("_id") or "")
        badge_view_url = f"{public_base_url}/api/badge/{guest_id}"
    
        html = f"""
    <!DOCTYPE html>
    <html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{subject}</title></head>
    <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Helvetica Neue',Arial,sans-serif;color:#22316a;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f4f7;padding:40px 20px;">
        <tr><td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.05);">
            <tr><td style="background:{accent_bg};padding:30px 40px;text-align:center;">
              <div style="color:{accent};font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">Sevgili Misafirimiz</div>
              <div style="color:{accent_text};font-size:24px;font-weight:700;margin-top:6px;font-family:Georgia,serif;">{label} yaklaşıyor!</div>
              <div style="color:{accent_text};opacity:0.85;font-size:13px;margin-top:6px;">{venue_info} · Hilton İstanbul Bosphorus</div>
            </td></tr>
            <tr><td style="padding:40px;">
              <p style="font-size:18px;color:#22316a;margin:0 0 16px 0;font-weight:600;">Sayın {html_escape.escape(name)},</p>
              <p style="font-size:14px;line-height:1.7;color:#555;margin:0 0 16px 0;">
                <strong>{label}</strong>'ne sizi bekliyoruz! Etkinlik günü hızlı bir giriş için <strong>yaka kartınızın QR kodunu</strong>
                kayıt masasında okutmanız yeterli olacaktır. Yaka kartınız bu e-postanın ekinde yer almaktadır;
                telefonunuza kaydedebilir ya da çıktısını yanınızda getirebilirsiniz.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8f9fb;border-left:4px solid {accent};border-radius:6px;margin:20px 0;">
                <tr><td style="padding:18px 22px;">
                  <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Etkinlik Bilgileri</div>
                  <div style="font-size:15px;color:#22316a;font-weight:600;">{label}</div>
                  <div style="font-size:13px;color:#555;margin-top:4px;">📅 {venue_info}</div>
                  <div style="font-size:13px;color:#555;margin-top:2px;">📍 Hilton İstanbul Bosphorus · Cumhuriyet Cd. No:50, Şişli/İstanbul</div>
                  <div style="font-size:13px;color:#555;margin-top:2px;">👔 Smart casual / iş kıyafeti önerilir</div>
                </td></tr>
              </table>
              <p style="font-size:13px;color:#666;line-height:1.6;margin:18px 0;">
                Gün boyu uzman konuşmacılar, panel oturumları, fuar alanı ve yatırım simülatörü sizi bekliyor.
                Otopark ücretsizdir ve gün boyunca ikram alanı açıktır.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:{accent_bg};border-radius:6px;margin:24px 0;">
                <tr><td style="padding:22px;text-align:center;">
                  <div style="font-size:12px;color:{accent};text-transform:uppercase;letter-spacing:2px;font-weight:600;margin-bottom:8px;">Yaka Kartınız</div>
                  <div style="color:{accent_text};font-size:13px;line-height:1.6;margin-bottom:14px;">
                    Yaka kartınız bu e-postanın ekinde PNG olarak yer alıyor. Tarayıcıda da görüntülemek için aşağıdaki butona dokunun.
                  </div>
                  <a href="{badge_view_url}" style="display:inline-block;background:{accent};color:{("#22316a" if is_summit else "#fff")};padding:11px 28px;border-radius:6px;font-weight:600;text-decoration:none;font-size:14px;">
                    Yaka Kartını Görüntüle
                  </a>
                </td></tr>
              </table>
              <p style="font-size:12px;color:#888;line-height:1.6;margin:24px 0 0 0;text-align:center;">
                Bu hatırlatma e-postası, Arsa Yatırım Zirvesi 2026 organizasyonu tarafından gönderilmiştir.
              </p>
            </td></tr>
            <tr><td style="background:#f4f4f7;padding:20px;text-align:center;font-size:11px;color:#888;">
              © 2026 Arsa Yatırım Zirvesi · FIRAT CONSTRUCTION YAPI A.Ş.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>
    """
        return subject, html
    
    
    @router.post("/admin/guests/{guest_id}/send-reminder")
    async def admin_send_reminder(guest_id: str, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
        try:
            guest = await db.guests.find_one({"_id": ObjectId(guest_id)})
        except Exception:
            raise HTTPException(400, "Geçersiz ID")
        if not guest:
            raise HTTPException(404, "Ziyaretçi bulunamadı")
        email = (guest.get("email") or "").strip().lower()
        if not email:
            raise HTTPException(400, "Bu ziyaretçinin e-posta adresi yok")
    
        public_base = os.environ.get("PUBLIC_BASE_URL", "https://arsayatirimzirvesi.com").rstrip("/")
        attachments, _ = await _build_badge_attachment(guest)
        subject, html = render_reminder_email(guest, public_base)
        background_tasks.add_task(send_email, email, subject, html, attachments)
        await db.guests.update_one(
            {"_id": guest["_id"]},
            {"$set": {"last_email_sent_at": datetime.now(timezone.utc).isoformat(),
                      "last_email_type": "reminder"}}
        )
        return {"message": f"Hatırlatma gönderildi: {email}"}
    
    
    @router.post("/admin/guests/bulk-resend-badge")
    async def admin_bulk_resend_badge(body: BulkDeleteGuestsBody, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
        if not body.ids:
            raise HTTPException(400, "Kayıt seçilmedi")
        obj_ids = [ObjectId(i) for i in body.ids if ObjectId.is_valid(i)]
        if not obj_ids:
            raise HTTPException(400, "Geçerli ID yok")
        public_base = os.environ.get("PUBLIC_BASE_URL", "https://arsayatirimzirvesi.com").rstrip("/")
        sent, skipped, failed = 0, 0, 0
        now_iso = datetime.now(timezone.utc).isoformat()
        cursor = db.guests.find({"_id": {"$in": obj_ids}})
        async for guest in cursor:
            email = (guest.get("email") or "").strip().lower()
            if not email:
                skipped += 1
                continue
            try:
                attachments, seq = await _build_badge_attachment(guest)
                subject, html = render_register_confirmation_email(guest, seq, public_base)
                background_tasks.add_task(send_email, email, subject, html, attachments)
                await db.guests.update_one(
                    {"_id": guest["_id"]},
                    {"$set": {"last_email_sent_at": now_iso, "last_email_type": "badge_resend"}}
                )
                sent += 1
            except Exception as e:
                logger.exception("bulk-resend-badge failed for %s: %s", guest.get("_id"), e)
                failed += 1
        return {
            "message": f"{sent} yaka kartı gönderildi" + (f", {skipped} e-postasız atlandı" if skipped else "") + (f", {failed} hata" if failed else ""),
            "sent": sent, "skipped": skipped, "failed": failed,
        }
    
    
    @router.post("/admin/guests/bulk-send-reminder")
    async def admin_bulk_send_reminder(body: BulkDeleteGuestsBody, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
        if not body.ids:
            raise HTTPException(400, "Kayıt seçilmedi")
        obj_ids = [ObjectId(i) for i in body.ids if ObjectId.is_valid(i)]
        if not obj_ids:
            raise HTTPException(400, "Geçerli ID yok")
        public_base = os.environ.get("PUBLIC_BASE_URL", "https://arsayatirimzirvesi.com").rstrip("/")
        sent, skipped, failed = 0, 0, 0
        now_iso = datetime.now(timezone.utc).isoformat()
        cursor = db.guests.find({"_id": {"$in": obj_ids}})
        async for guest in cursor:
            email = (guest.get("email") or "").strip().lower()
            if not email:
                skipped += 1
                continue
            try:
                attachments, _ = await _build_badge_attachment(guest)
                subject, html = render_reminder_email(guest, public_base)
                background_tasks.add_task(send_email, email, subject, html, attachments)
                await db.guests.update_one(
                    {"_id": guest["_id"]},
                    {"$set": {"last_email_sent_at": now_iso, "last_email_type": "reminder"}}
                )
                sent += 1
            except Exception as e:
                logger.exception("bulk-send-reminder failed for %s: %s", guest.get("_id"), e)
                failed += 1
        return {
            "message": f"{sent} hatırlatma gönderildi" + (f", {skipped} e-postasız atlandı" if skipped else "") + (f", {failed} hata" if failed else ""),
            "sent": sent, "skipped": skipped, "failed": failed,
        }
    
    
    # ==================== ADMIN EXHIBITORS ====================
    
    @router.get("/admin/exhibitors")
    async def admin_get_exhibitors(status: Optional[str] = None, q: Optional[str] = None, admin: dict = Depends(get_admin_user)):
        query: dict = {}
        if status and status != "all":
            query["status"] = status
        if q:
            query["$or"] = [
                {"company_name": {"$regex": q, "$options": "i"}},
                {"contact_name": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}},
                {"phone": {"$regex": q, "$options": "i"}},
                {"sector": {"$regex": q, "$options": "i"}},
            ]
        docs = await db.exhibitors.find(query).sort("created_at", -1).to_list(5000)
        return [clean_doc(d) for d in docs]
    
    @router.patch("/admin/exhibitors/{app_id}")
    async def admin_update_exhibitor(app_id: str, body: StatusUpdate, admin: dict = Depends(get_admin_user)):
        update = {"status": body.status, "updated_at": datetime.now(timezone.utc).isoformat()}
        if body.admin_notes is not None:
            update["admin_notes"] = body.admin_notes
        result = await db.exhibitors.update_one({"_id": ObjectId(app_id)}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(404, "Stant başvurusu bulunamadı")
        return {"message": "Güncellendi"}
    
    @router.delete("/admin/exhibitors/{app_id}")
    async def admin_delete_exhibitor(app_id: str, admin: dict = Depends(get_admin_user)):
        result = await db.exhibitors.delete_one({"_id": ObjectId(app_id)})
        if result.deleted_count == 0:
            raise HTTPException(404, "Stant başvurusu bulunamadı")
        return {"message": "Stant başvurusu silindi"}
    
    
    # ==================== ADMIN SPEAKER APPLICATIONS ====================
    
    @router.get("/admin/speaker-applications")
    async def admin_get_speaker_applications(
        status: Optional[str] = None,
        application_type: Optional[str] = None,
        q: Optional[str] = None,
        admin: dict = Depends(get_admin_user),
    ):
        query: dict = {}
        if status and status != "all":
            query["status"] = status
        if application_type and application_type != "all":
            query["application_type"] = application_type
        if q:
            query["$or"] = [
                {"name": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}},
                {"company": {"$regex": q, "$options": "i"}},
                {"phone": {"$regex": q, "$options": "i"}},
                {"expertise": {"$regex": q, "$options": "i"}},
            ]
        docs = await db.speaker_applications.find(query).sort("created_at", -1).to_list(5000)
        return [clean_doc(d) for d in docs]
    
    @router.patch("/admin/speaker-applications/{app_id}")
    async def admin_update_speaker_application(app_id: str, body: StatusUpdate, admin: dict = Depends(get_admin_user)):
        update = {"status": body.status, "updated_at": datetime.now(timezone.utc).isoformat()}
        if body.admin_notes is not None:
            update["admin_notes"] = body.admin_notes
        result = await db.speaker_applications.update_one({"_id": ObjectId(app_id)}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(404, "Başvuru bulunamadı")
        return {"message": "Güncellendi"}
    
    @router.delete("/admin/speaker-applications/{app_id}")
    async def admin_delete_speaker_application(app_id: str, admin: dict = Depends(get_admin_user)):
        result = await db.speaker_applications.delete_one({"_id": ObjectId(app_id)})
        if result.deleted_count == 0:
            raise HTTPException(404, "Başvuru bulunamadı")
        return {"message": "Başvuru silindi"}
    
    

    return router
