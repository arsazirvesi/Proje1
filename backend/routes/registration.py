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
from services import visitego as visitego_service

logger = logging.getLogger(__name__)
UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

import uuid
import qrcode
from PIL import Image as PILImage
import hashlib

def init_registration_router(db, get_admin_user):
    router = APIRouter(prefix="/api")

    # ==================== REGISTRATION ====================
    
    @router.post("/register/member")
    async def register_member(body: MemberCreate, background_tasks: BackgroundTasks):
        existing = await db.members.find_one({"email": body.email.lower()})
        if existing:
            raise HTTPException(400, "Bu email ile zaten kayıt yapılmış")
        doc = {
            **body.model_dump(),
            "email": body.email.lower(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "type": "member"
        }
        result = await db.members.insert_one(doc)
        member_id = str(result.inserted_id)
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0A1128;color:#fff;padding:40px;border-radius:8px;border:1px solid rgba(212,175,55,0.3)">
          <h1 style="color:#D4AF37;font-size:22px;margin-bottom:16px">Arsa Yatırım Zirvesi 2026</h1>
          <p>Sayın <strong>{body.name}</strong>,</p>
          <p style="margin-top:12px">Arsa Yatırım Zirvesi 2026 üyeliğiniz başarıyla oluşturulmuştur.</p>
          <div style="background:#14213D;border-radius:8px;padding:16px;margin:20px 0;border-left:4px solid #D4AF37">
            <p style="color:#D4AF37;margin:4px 0"><strong>Tarih:</strong> 21 Mayıs 2026, Perşembe</p>
            <p style="color:#D4AF37;margin:4px 0"><strong>Yer:</strong> Hilton İstanbul Bosphorus - Zirve Salonu</p>
            <p style="color:#D4AF37;margin:4px 0"><strong>Adres:</strong> Harbiye, Cumhuriyet Cd. No:50, 34367 Şişli/İstanbul</p>
          </div>
          <p>Zirveyle ilgili tüm güncellemelerden haberdar olacaksınız.</p>
          <p style="color:#B0B8C8;font-size:12px;margin-top:24px">© 2026 Arsa Yatırım Zirvesi</p>
        </div>"""
        background_tasks.add_task(send_email, body.email.lower(), "Arsa Yatırım Zirvesi 2026 - Üyeliğiniz Onaylandı", html)
        return {"id": member_id, "message": "Üyelik başarıyla oluşturuldu", "name": body.name}
    
    
    SUMMIT_CAPACITY = 600
    
    
    # ==================== INVITE CODE HELPER ====================
    
    async def _check_invite_code(raw_code: Optional[str], visit_type: str) -> dict:
        """Validate an invite code for the given visit type.
        Returns {valid: bool, reason?: str, doc?: dict}."""
        if not raw_code or not raw_code.strip():
            return {"valid": False, "reason": "Lütfen davet kodunuzu girin. Kayıt bu kod olmadan tamamlanamaz."}
        code = raw_code.strip().upper()
        doc = await db.invite_codes.find_one({"code": code})
        if not doc:
            return {"valid": False, "reason": "Girdiğiniz davet kodu sistemde bulunamadı."}
        if not doc.get("is_active", True):
            return {"valid": False, "reason": "Bu davet kodu pasif durumda. Yetkili ile iletişime geçin."}
        valid_for = doc.get("valid_for", "both")
        if valid_for not in ("both", visit_type):
            label = "Zirve" if visit_type == "summit" else "Fuar"
            other = "Fuar" if visit_type == "summit" else "Zirve"
            return {"valid": False, "reason": f"Bu davet kodu {label} kaydı için geçerli değil. (Sadece {other} için tanımlı.)"}
        expires_at = doc.get("expires_at")
        if expires_at:
            try:
                exp_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                # If date string had no timezone (e.g. "2026-05-23"), treat as UTC end-of-day
                if exp_dt.tzinfo is None:
                    exp_dt = exp_dt.replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
                if datetime.now(timezone.utc) > exp_dt:
                    return {"valid": False, "reason": "Bu davet kodunun süresi dolmuş."}
            except (ValueError, AttributeError, TypeError):
                pass
        max_uses = doc.get("max_uses", 0) or 0
        used_count = doc.get("used_count", 0) or 0
        if max_uses > 0 and used_count >= max_uses:
            return {"valid": False, "reason": "Bu davet kodu kullanım hakkı tükenmiş."}
        return {"valid": True, "doc": doc}
    
    
    @router.post("/register/validate-code")
    async def public_validate_invite_code(body: InviteCodeValidate):
        """Pre-validate an invite code BEFORE submitting the registration form."""
        visit_type = body.visit_type if body.visit_type in ("summit", "fair") else "summit"
        res = await _check_invite_code(body.code, visit_type)
        if not res["valid"]:
            return {"valid": False, "reason": res["reason"]}
        doc = res["doc"]
        return {
            "valid": True,
            "label": doc.get("label") or "",
            "valid_for": doc.get("valid_for", "both"),
        }
    
    
    @router.get("/register/capacity")
    async def get_register_capacity(seminar_slug: Optional[str] = None):
        # Only count VERIFIED visitors towards capacity (spam-proof)
        summit_count = await db.guests.count_documents({
            "visit_type": {"$in": ["summit", None]},
            "is_verified": True,
        })
        fair_count = await db.guests.count_documents({
            "visit_type": "fair",
            "is_verified": True,
        })
        result = {
            "summit": {
                "registered": summit_count,
                "capacity": SUMMIT_CAPACITY,
                "remaining": max(0, SUMMIT_CAPACITY - summit_count),
                "is_full": summit_count >= SUMMIT_CAPACITY,
            },
            "fair": {
                "registered": fair_count,
                "capacity": None,
                "unlimited": True,
            },
        }
        # Per-seminar capacity (when a slug is provided)
        if seminar_slug:
            course = await db.academy_courses.find_one({"slug": seminar_slug})
            capacity = None
            if course:
                # course.capacity is admin-editable; treat 0 / None as "unlimited"
                cap_raw = course.get("capacity")
                try:
                    capacity = int(cap_raw) if cap_raw not in (None, "", 0, "0") else None
                except (TypeError, ValueError):
                    capacity = None
            seminar_count = await db.guests.count_documents({
                "visit_type": "seminar",
                "seminar_slug": seminar_slug,
                "is_verified": True,
            })
            result["seminar"] = {
                "slug": seminar_slug,
                "title": (course or {}).get("title"),
                "registered": seminar_count,
                "capacity": capacity,
                "remaining": (max(0, capacity - seminar_count) if capacity is not None else None),
                "is_full": (seminar_count >= capacity) if capacity is not None else False,
                "unlimited": capacity is None,
            }
        return result
    
    
    def render_verify_email(guest: dict, verify_url: str) -> tuple[str, str]:
        """Short email asking the user to confirm their address."""
        visit_type = guest.get("visit_type") or "summit"
        is_summit = visit_type == "summit"
        accent = "#22316a" if is_summit else "#D4AF37"
        accent_text = "#fff" if is_summit else "#22316a"
        label = "Arsa Yatırım Zirvesi 2026" if is_summit else "8. Gayrimenkul Proje Yatırım Fuarı"
        subject = f"E-postanızı Doğrulayın · {label}"
        name = (guest.get("name") or "").strip() or "Sayın Misafir"
        html = f"""<!DOCTYPE html>
    <html lang="tr"><head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;color:#22316a;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f4f7;padding:40px 20px;">
        <tr><td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
            <tr><td style="background:{accent};padding:26px 40px;text-align:center;">
              <div style="color:{accent_text};font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:600;opacity:0.85;">Son Bir Adım</div>
              <div style="color:{accent_text};font-size:22px;font-weight:700;margin-top:6px;font-family:Georgia,serif;">E-postanızı Doğrulayın</div>
            </td></tr>
            <tr><td style="padding:38px 40px 30px;">
              <p style="font-size:16px;margin:0 0 14px 0;"><strong>Merhaba {html_escape.escape(name)},</strong></p>
              <p style="font-size:14px;line-height:1.7;color:#555;margin:0 0 22px 0;">
                {label} için kaydınız alındı. <strong>Kaydınızın tamamlanması ve yaka kartınızın hazırlanması için</strong>
                lütfen aşağıdaki butona tıklayarak e-posta adresinizi doğrulayın.
              </p>
              <div style="text-align:center;margin:28px 0;">
                <a href="{verify_url}" style="display:inline-block;background:{accent};color:{accent_text};padding:14px 38px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;letter-spacing:0.3px;">
                  E-postamı Doğrula
                </a>
              </div>
              <p style="font-size:12px;color:#888;line-height:1.6;margin:18px 0 0 0;">
                Buton çalışmazsa aşağıdaki linki tarayıcınıza kopyalayabilirsiniz:<br>
                <a href="{verify_url}" style="color:{accent};word-break:break-all;font-size:11px;">{verify_url}</a>
              </p>
              <p style="font-size:12px;color:#aaa;line-height:1.6;margin:22px 0 0 0;border-top:1px solid #eee;padding-top:16px;">
                Bu bağlantı 7 gün boyunca geçerlidir. Eğer bu kaydı siz yapmadıysanız, bu e-postayı yok sayabilirsiniz.
              </p>
            </td></tr>
            <tr><td style="background:#f8f9fb;padding:18px 40px;text-align:center;border-top:1px solid #e1e3e9;">
              <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Arsa Yatırım Zirvesi 2026</div>
              <div style="font-size:11px;color:#aaa;margin-top:4px;">FIRAT CONSTRUCTION YAPI A.Ş.</div>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>
    """
        return subject, html
    
    
    @router.post("/register/guest")
    async def register_guest(body: GuestCreate, background_tasks: BackgroundTasks):
        visit_type = (body.visit_type or "summit").lower()
        if visit_type not in ("summit", "fair", "seminar"):
            visit_type = "summit"
    
        # === Validate invite code (only required for SUMMIT, fair & seminar are open) ===
        invite_code_doc = None
        if visit_type == "summit":
            code_check = await _check_invite_code(body.invite_code, visit_type)
            if not code_check["valid"]:
                raise HTTPException(400, code_check["reason"])
            invite_code_doc = code_check["doc"]
    
        existing = await db.guests.find_one({"email": body.email.lower()})
        if existing:
            raise HTTPException(400, "Bu e-posta ile zaten kayıt yapılmış.")
    
        # Enforce capacity for the summit (count only VERIFIED summit guests)
        if visit_type == "summit":
            summit_count = await db.guests.count_documents({
                "visit_type": {"$in": ["summit", None]},
                "is_verified": True,
            })
            if summit_count >= SUMMIT_CAPACITY:
                raise HTTPException(
                    400,
                    "Zirve kontenjanımız doldu. Fuar ziyareti kayıtları hâlâ açık, oradan devam edebilirsiniz.",
                )
    
        # === Per-seminar capacity enforcement ===
        if visit_type == "seminar" and body.seminar_slug:
            course = await db.academy_courses.find_one({"slug": body.seminar_slug})
            cap_raw = (course or {}).get("capacity")
            try:
                cap_int = int(cap_raw) if cap_raw not in (None, "", 0, "0") else None
            except (TypeError, ValueError):
                cap_int = None
            if cap_int is not None:
                seminar_count = await db.guests.count_documents({
                    "visit_type": "seminar",
                    "seminar_slug": body.seminar_slug,
                    "is_verified": True,
                })
                if seminar_count >= cap_int:
                    raise HTTPException(
                        400,
                        "Bu seminerin kontenjanı doldu. Lütfen yakındaki diğer seminer tarihlerini kontrol edin.",
                    )
    
        # === Auto-verify, send badge attachment, push to Visitego — same flow for both summit & fair ===
        now_iso = datetime.now(timezone.utc).isoformat()
        payload = body.model_dump()
        payload.pop("invite_code", None)
        doc = {
            **payload,
            "email": body.email.lower(),
            "visit_type": visit_type,
            "invite_code": (body.invite_code or "").strip().upper(),
            "created_at": now_iso,
            "updated_at": now_iso,
            "badge_printed": False,
            "status": "new",
            "admin_notes": "",
            "is_verified": True,
            "verified_at": now_iso,
            "verification_token": None,
            "verification_sent_at": None,
        }
        result = await db.guests.insert_one(doc)
        guest_id = str(result.inserted_id)
    
        if invite_code_doc:
            await db.invite_codes.update_one(
                {"_id": invite_code_doc["_id"]},
                {"$inc": {"used_count": 1}, "$set": {"last_used_at": now_iso}},
            )
    
        guest_full = {**doc, "_id": result.inserted_id}
        if visit_type == "seminar":
            seq_query = {"visit_type": "seminar", "is_verified": True, "verified_at": {"$lte": now_iso}}
            # If a specific seminar slug was provided, scope sequence per-seminar
            if doc.get("seminar_slug"):
                seq_query["seminar_slug"] = doc["seminar_slug"]
            seq = await db.guests.count_documents(seq_query)
        else:
            seq = await db.guests.count_documents({
                "visit_type": ({"$in": ["summit", None]} if visit_type == "summit" else "fair"),
                "is_verified": True,
                "verified_at": {"$lte": now_iso},
            })
        public_base = os.environ.get("PUBLIC_BASE_URL", "https://arsayatirimzirvesi.com").rstrip("/")
    
        attachments = None
        try:
            badge_png = await asyncio.to_thread(render_badge_png, guest_full, seq)
            attachments = [{
                "content_bytes": badge_png,
                "filename": f"yaka-karti-{guest_id[-8:]}.png",
                "mime_type": "image/png",
            }]
        except Exception as e:
            logger.error(f"Badge PNG generation failed on register: {e}")
    
        subject, html = render_register_confirmation_email(guest_full, seq, public_base)
        background_tasks.add_task(send_email, body.email.lower(), subject, html, attachments)
    
        # Visitego sync only for summit & fair (3rd-party fair turnstile); skip seminar.
        if visit_type in ("summit", "fair"):
            try:
                background_tasks.add_task(visitego_service.push_visitor, db, guest_full)
            except Exception as e:
                logger.error(f"Failed to schedule visitego push: {e}")
    
        return {
            "id": guest_id,
            "verified": True,
            "needs_verification": False,
            "badge_url": f"/api/badge/{guest_id}",
            "sequence": seq,
            "message": "Kaydınız tamamlandı. Yaka kartınız e-postanıza gönderildi.",
        }
    
    
    @router.get("/verify/guest")
    async def verify_guest(token: str, background_tasks: BackgroundTasks):
        """Verify the visitor's email with the given token.
        On success, send the confirmation email with the PNG badge attachment."""
        if not token:
            raise HTTPException(400, "Doğrulama anahtarı eksik")
        guest = await db.guests.find_one({"verification_token": token})
        if not guest:
            raise HTTPException(404, "Geçersiz veya süresi dolmuş doğrulama linki")
    
        # Check expiry (7 days)
        sent_at = guest.get("verification_sent_at")
        if sent_at:
            try:
                sent_dt = datetime.fromisoformat(sent_at.replace("Z", "+00:00"))
                if datetime.now(timezone.utc) - sent_dt > timedelta(days=7):
                    raise HTTPException(410, "Doğrulama linkinin süresi doldu. Lütfen yeniden kayıt olun.")
            except ValueError:
                pass
    
        if guest.get("is_verified"):
            return {
                "already_verified": True,
                "name": guest.get("name"),
                "visit_type": guest.get("visit_type") or "summit",
            }
    
        visit_type = guest.get("visit_type") or "summit"
    
        # Re-check summit capacity at verification time (in case it filled while pending)
        if visit_type == "summit":
            summit_verified = await db.guests.count_documents({
                "visit_type": {"$in": ["summit", None]},
                "is_verified": True,
            })
            if summit_verified >= SUMMIT_CAPACITY:
                raise HTTPException(
                    400,
                    "Ne yazık ki Zirve kontenjanı siz doğrulamadan önce doldu. "
                    "Fuar ziyareti kayıtları hâlâ açık, oradan kayıt olabilirsiniz.",
                )
    
        now_iso = datetime.now(timezone.utc).isoformat()
        await db.guests.update_one(
            {"_id": guest["_id"]},
            {"$set": {"is_verified": True, "verified_at": now_iso, "updated_at": now_iso},
             "$unset": {"verification_token": ""}},
        )
    
        # Compute sequence (verified visitors only)
        seq = await db.guests.count_documents({
            "visit_type": ({"$in": ["summit", None]} if visit_type == "summit" else "fair"),
            "is_verified": True,
            "verified_at": {"$lte": now_iso},
        })
    
        # Generate badge PNG + send final confirmation email
        public_base = os.environ.get("PUBLIC_BASE_URL", "https://arsayatirimzirvesi.com").rstrip("/")
        try:
            guest_full = {**guest, "is_verified": True, "verified_at": now_iso}
            badge_png = await asyncio.to_thread(render_badge_png, guest_full, seq)
            attachments = [{
                "content_bytes": badge_png,
                "filename": f"yaka-karti-{str(guest['_id'])[-8:]}.png",
                "mime_type": "image/png",
            }]
        except Exception as e:
            logger.error(f"Badge PNG generation failed on verify: {e}")
            attachments = None
    
        subject, html = render_register_confirmation_email(guest_full, seq, public_base)
        background_tasks.add_task(send_email, guest["email"], subject, html, attachments)
    
        # 3rd-party fair turnstile (Visitego) push — fire-and-forget background task
        try:
            background_tasks.add_task(visitego_service.push_visitor, db, guest_full)
        except Exception as e:
            logger.error(f"Failed to schedule visitego push: {e}")
    
        return {
            "verified": True,
            "name": guest.get("name"),
            "visit_type": visit_type,
            "sequence": seq,
            "badge_url": f"/api/badge/{guest['_id']}",
        }
    
    
    @router.post("/register/exhibitor")
    async def register_exhibitor(body: ExhibitorCreate, background_tasks: BackgroundTasks):
        existing = await db.exhibitors.find_one({"email": body.email.lower()})
        if existing:
            raise HTTPException(400, "Bu email ile zaten başvuru yapılmış")
        doc = {
            **body.model_dump(),
            "email": body.email.lower(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "status": "new",
            "admin_notes": "",
            "price_quoted": None,
        }
        result = await db.exhibitors.insert_one(doc)
        app_id = str(result.inserted_id)
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#1F2937;padding:40px;border-radius:8px;border:1px solid #E5E7EB">
          <div style="border-top:3px solid #22316a;padding-top:24px">
          <h1 style="color:#22316a;font-size:22px;margin-bottom:16px">Arsa Yatırım Zirvesi 2026 - Stant Başvurusu</h1>
          <p>Sayın <strong>{body.contact_name}</strong>,</p>
          <p style="margin-top:12px"><strong>{body.company_name}</strong> firması adına yaptığınız fuar stant başvurusu tarafımıza ulaşmıştır. En kısa sürede sizinle iletişime geçeceğiz.</p>
          <div style="background:#F8F9FB;border-radius:6px;padding:16px;margin:20px 0;border-left:4px solid #22316a">
            <p style="color:#22316a;margin:4px 0"><strong>Fuar Tarihleri:</strong> 20-21 Mayıs 2026 (2 gün)</p>
            <p style="color:#22316a;margin:4px 0"><strong>Yer:</strong> Hilton İstanbul Bosphorus - Connie Salonları</p>
            <p style="color:#22316a;margin:4px 0"><strong>Stant Tercihiniz:</strong> {body.stand_preference or '—'}</p>
          </div>
          <p>Stant alanı, fiyatlandırma ve detaylı bilgi için ekibimiz kısa süre içinde iletişime geçecektir.</p>
          <p style="color:#9CA3AF;font-size:12px;margin-top:24px">© 2026 Arsa Yatırım Zirvesi</p>
          </div>
        </div>"""
        background_tasks.add_task(send_email, body.email.lower(), "Arsa Yatırım Zirvesi 2026 - Stant Başvurunuz Alındı", html)
        return {"id": app_id, "message": "Fuar stant başvurunuz alındı. Ekibimiz en kısa sürede sizinle iletişime geçecektir."}
    
    
    @router.post("/register/speaker-application")
    async def register_speaker_application(body: SpeakerApplicationCreate, background_tasks: BackgroundTasks):
        existing = await db.speaker_applications.find_one({
            "email": body.email.lower(),
            "application_type": body.application_type,
        })
        if existing:
            raise HTTPException(400, "Bu email ile bu kategoride zaten başvuru yapılmış")
        doc = {
            **body.model_dump(),
            "email": body.email.lower(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "status": "new",
            "admin_notes": "",
            "price_quoted": None,
        }
        result = await db.speaker_applications.insert_one(doc)
        app_id = str(result.inserted_id)
        type_label = {"konusmaci": "Konuşmacı", "panelist": "Panelist", "sponsor": "Sponsor"}.get(body.application_type, "Başvuru")
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#1F2937;padding:40px;border-radius:8px;border:1px solid #E5E7EB">
          <div style="border-top:3px solid #22316a;padding-top:24px">
          <h1 style="color:#22316a;font-size:22px;margin-bottom:16px">Arsa Yatırım Zirvesi 2026 - {type_label} Başvurusu</h1>
          <p>Sayın <strong>{body.name}</strong>,</p>
          <p style="margin-top:12px">{type_label} başvurunuz başarıyla alınmıştır. Değerlendirme sürecinin ardından ekibimiz sizinle iletişime geçecektir.</p>
          <div style="background:#F8F9FB;border-radius:6px;padding:16px;margin:20px 0;border-left:4px solid #22316a">
            <p style="color:#22316a;margin:4px 0"><strong>Başvuru Tipi:</strong> {type_label}</p>
            <p style="color:#22316a;margin:4px 0"><strong>Etkinlik Tarihi:</strong> 21 Mayıs 2026</p>
            <p style="color:#22316a;margin:4px 0"><strong>Yer:</strong> Hilton İstanbul Bosphorus</p>
          </div>
          <p>İlginize teşekkür ederiz.</p>
          <p style="color:#9CA3AF;font-size:12px;margin-top:24px">© 2026 Arsa Yatırım Zirvesi</p>
          </div>
        </div>"""
        background_tasks.add_task(send_email, body.email.lower(), f"Arsa Yatırım Zirvesi 2026 - {type_label} Başvurunuz Alındı", html)
        return {"id": app_id, "message": f"{type_label} başvurunuz alındı. Ekibimiz en kısa sürede sizinle iletişime geçecektir."}
    
    

    return router
