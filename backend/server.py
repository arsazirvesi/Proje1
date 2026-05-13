from dotenv import load_dotenv
load_dotenv()

import os
import bcrypt
import jwt
import qrcode
import io
import base64
import secrets
import logging
import html as html_escape
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any, Annotated
from pathlib import Path

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, BackgroundTasks, UploadFile, File, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, BeforeValidator
from bson import ObjectId
import sendgrid
from sendgrid.helpers.mail import Mail as SGMail

from services import visitego as visitego_service

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

mongo_url = os.environ["MONGO_URL"]
db_client = AsyncIOMotorClient(mongo_url)
db = db_client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ.get("JWT_SECRET", "arsa-yatirim-2026-secret")
JWT_ALGORITHM = "HS256"

app = FastAPI(title="Arsa Yatırım Zirvesi 2026 API")
api_router = APIRouter(prefix="/api")


# --- PyObjectId ---
def validate_object_id(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str) and ObjectId.is_valid(v):
        return v
    raise ValueError(f"Invalid ObjectId: {v}")

PyObjectId = Annotated[str, BeforeValidator(validate_object_id)]


# --- Password Utils ---
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# --- JWT Utils ---
def create_access_token(user_id: str, email: str, role: str) -> str:
    return jwt.encode(
        {"sub": user_id, "email": email, "role": role,
         "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )

def create_refresh_token(user_id: str) -> str:
    return jwt.encode(
        {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )


# --- Auth Dependencies ---
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except Exception as e:
        raise HTTPException(401, f"Invalid token: {e}")

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return current_user


# --- Pydantic Models ---
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class MemberCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    city: Optional[str] = None

class GuestCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    city: Optional[str] = None
    expectations: Optional[str] = None
    interest_area: Optional[str] = None
    participant_type: Optional[str] = None
    visit_type: Optional[str] = "summit"  # "summit" | "fair"
    invite_code: Optional[str] = None  # required at runtime via validator below

class InviteCodeCreate(BaseModel):
    code: str
    label: Optional[str] = None
    valid_for: str = "both"  # "summit" | "fair" | "both"
    max_uses: int = 0  # 0 = unlimited
    is_active: bool = True
    expires_at: Optional[str] = None  # ISO date or None

class InviteCodeUpdate(BaseModel):
    label: Optional[str] = None
    valid_for: Optional[str] = None
    max_uses: Optional[int] = None
    is_active: Optional[bool] = None
    expires_at: Optional[str] = None

class InviteCodeValidate(BaseModel):
    code: str
    visit_type: str = "summit"

class ApiKeyCreate(BaseModel):
    label: str
    valid_for: str = "both"  # "summit" | "fair" | "both"

class ApiKeyUpdate(BaseModel):
    label: Optional[str] = None
    valid_for: Optional[str] = None
    is_active: Optional[bool] = None

class ExternalCheckInRequest(BaseModel):
    code: str
    mark_checkin: bool = True  # If False, just validate without marking

class ExhibitorCreate(BaseModel):
    company_name: str
    contact_name: str
    email: EmailStr
    phone: str
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    sector: Optional[str] = None
    stand_preference: Optional[str] = None
    products_services: Optional[str] = None
    website: Optional[str] = None
    social_media: Optional[str] = None
    notes: Optional[str] = None

class SpeakerApplicationCreate(BaseModel):
    application_type: str  # konusmaci | panelist | sponsor
    name: str
    email: EmailStr
    phone: str
    company: Optional[str] = None
    expertise: Optional[str] = None
    topic: Optional[str] = None
    bio: Optional[str] = None
    sponsor_package: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None
    additional_notes: Optional[str] = None

class StatusUpdate(BaseModel):
    status: str  # new | contacted | approved | rejected
    admin_notes: Optional[str] = None

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class AdminPasswordChange(BaseModel):
    new_password: str

class AdminNameUpdate(BaseModel):
    name: str

class SpeakerCreate(BaseModel):
    name: str
    title: str
    bio: str
    image_url: Optional[str] = None
    order: int = 0
    is_featured: bool = False
    social_linkedin: Optional[str] = None

class SponsorCreate(BaseModel):
    name: str
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    tier: str = "standard"
    order: int = 0

class BannerCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    is_active: bool = True
    order: int = 0

class BlogPostCreate(BaseModel):
    title: str
    slug: str
    content: str
    excerpt: Optional[str] = None
    image_url: Optional[str] = None
    author: str = "Admin"
    tags: List[str] = []
    is_published: bool = False

class PastEventCreate(BaseModel):
    title: str
    year: int
    venue: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    attendee_count: Optional[int] = None
    speakers_count: Optional[int] = None

class ProgramSessionCreate(BaseModel):
    time_start: str
    time_end: str
    title: str
    speaker_name: Optional[str] = None
    session_type: str = "talk"
    description: Optional[str] = None
    order: int = 0

class EmailBroadcast(BaseModel):
    subject: str
    content: str
    recipient_type: str

class EmailIndividual(BaseModel):
    to_email: str
    subject: str
    content: str


class HeroSlideCreate(BaseModel):
    image_url: str
    title: Optional[str] = None
    order: int = 0
    is_active: bool = True
    opacity: Optional[int] = 45  # 0-100, percent


class SiteSettings(BaseModel):
    """General site-wide settings (event date for countdown, statistics, etc.)"""
    event_datetime: Optional[str] = None  # ISO 8601 with timezone, used by countdown
    event_date_label: Optional[str] = None  # "21 Mayıs 2026" - text label
    event_time_label: Optional[str] = None  # "09:00 - 19:00"
    event_location: Optional[str] = None  # "Hilton İstanbul Bosphorus"
    speakers_count: Optional[int] = None
    sessions_count: Optional[int] = None
    attendees_count: Optional[str] = None  # "600+"
    countdown_title: Optional[str] = None  # "Zirveye Kalan Süre"


class FairSettings(BaseModel):
    fair_name: Optional[str] = None
    subtitle: Optional[str] = None
    dates: Optional[str] = None
    location: Optional[str] = None
    hall_name: Optional[str] = None
    description: Optional[str] = None
    total_stands: Optional[int] = None
    total_size_range: Optional[str] = None
    floor_plan_url: Optional[str] = None  # PDF URL (kroki)
    floor_plan_image_url: Optional[str] = None  # PNG/JPG rendered kroki
    gallery: Optional[List[str]] = None  # image urls
    stand_types: Optional[List[dict]] = None  # [{name, size, count, features}]
    highlights: Optional[List[str]] = None  # bullet list
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None


class SeoSettings(BaseModel):
    site_name: Optional[str] = None
    site_url: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[str] = None
    author: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    twitter_title: Optional[str] = None
    twitter_description: Optional[str] = None
    twitter_image: Optional[str] = None
    twitter_card: Optional[str] = "summary_large_image"
    google_site_verification: Optional[str] = None
    canonical_url: Optional[str] = None
    robots: Optional[str] = "index, follow"
    favicon_url: Optional[str] = None
    # Analytics & Tag Manager
    gtm_id: Optional[str] = None  # e.g. GTM-XXXXXXX
    ga_id: Optional[str] = None  # e.g. G-XXXXXXXXXX
    meta_pixel_id: Optional[str] = None  # Facebook/Meta Pixel ID
    custom_head_html: Optional[str] = None  # extra <head> snippets
    custom_body_html: Optional[str] = None  # extra <body> top snippets (e.g. GTM noscript)
    # Social media
    social_instagram: Optional[str] = None
    social_linkedin: Optional[str] = None
    social_twitter: Optional[str] = None
    social_facebook: Optional[str] = None
    social_youtube: Optional[str] = None
    social_tiktok: Optional[str] = None
    social_whatsapp: Optional[str] = None  # full https://wa.me/...
    invite_code_phone: Optional[str] = None  # phone for invite-code requests (visitor register)
    # Contact
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    contact_address: Optional[str] = None
    # Event-specific JSON-LD fields
    event_name: Optional[str] = None
    event_start_date: Optional[str] = None
    event_end_date: Optional[str] = None
    event_location_name: Optional[str] = None
    event_location_address: Optional[str] = None
    event_organizer: Optional[str] = None
    event_organizer_url: Optional[str] = None
    custom_head_html: Optional[str] = None


# --- Investment Game Models ---
class InvestmentItem(BaseModel):
    kind: str  # "daire" | "arsa"
    city: str
    district: str
    budget: int
    # Daire-specific
    daire_type: Optional[str] = None  # "1+1" | "2+1" | "3+1" | "5+1"
    # Arsa-specific
    arsa_type: Optional[str] = None  # "tarla" | "arsa"
    description: Optional[str] = None


class InvestmentGameSubmit(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., min_length=6, max_length=30)
    email: EmailStr
    age: int = Field(..., ge=10, le=120)
    profession: str = Field(..., min_length=2, max_length=120)
    items: List[InvestmentItem] = Field(default_factory=list)


# --- Email Helper ---
def send_email(to: str, subject: str, html: str, attachments: Optional[list] = None) -> bool:
    """Send email via SendGrid.

    attachments: list of dicts with keys:
        - content_bytes: bytes
        - filename: str
        - mime_type: str (default image/png)
    """
    api_key = os.environ.get("SENDGRID_API_KEY", "")
    sender = os.environ.get("SENDER_EMAIL", "noreply@arsayatirimzirvesi.com")
    if not api_key:
        logger.warning("SendGrid API key not configured - email not sent (to=%s, subject=%s)", to, subject)
        return False
    try:
        sg = sendgrid.SendGridAPIClient(api_key=api_key)
        msg = SGMail(from_email=sender, to_emails=to, subject=subject, html_content=html)

        # Disable SendGrid link tracking — links should resolve directly to our
        # site (otherwise users land on the click-tracking subdomain).
        from sendgrid.helpers.mail import (
            TrackingSettings, ClickTracking, OpenTracking, SubscriptionTracking
        )
        tracking = TrackingSettings()
        tracking.click_tracking = ClickTracking(False, False)
        tracking.open_tracking = OpenTracking(False)
        tracking.subscription_tracking = SubscriptionTracking(False)
        msg.tracking_settings = tracking

        if attachments:
            from sendgrid.helpers.mail import Attachment, FileContent, FileName, FileType, Disposition
            for att in attachments:
                encoded = base64.b64encode(att["content_bytes"]).decode()
                a = Attachment(
                    FileContent(encoded),
                    FileName(att["filename"]),
                    FileType(att.get("mime_type", "image/png")),
                    Disposition("attachment"),
                )
                msg.add_attachment(a)
        resp = sg.send(msg)
        return resp.status_code in [200, 202]
    except Exception as e:
        logger.error(f"Email error: {e}")
        return False


def render_register_confirmation_email(guest: dict, seq_number: int, public_base_url: str) -> tuple[str, str]:
    """Returns (subject, html) for the confirmation email."""
    visit_type = guest.get("visit_type") or "summit"
    is_summit = visit_type == "summit"
    accent = "#D4AF37" if is_summit else "#22316a"
    accent_bg = "#22316a" if is_summit else "#F5E6A3"
    accent_text = "#fff" if is_summit else "#22316a"
    label = "Arsa Yatırım Zirvesi 2026" if is_summit else "8. Gayrimenkul Proje Yatırım Fuarı"
    sub_label = "Konferans · Panel · Networking" if is_summit else "Proje Fuarı · Maket Sergisi"
    venue_info = ("21 Mayıs 2026 · 09:00 - 19:00" if is_summit else "20-21 Mayıs 2026 · Sınırsız Giriş")
    intro = (
        "Arsa Yatırım Zirvesi 2026 konferans programına kaydınız başarıyla alınmıştır."
        if is_summit
        else "8. Gayrimenkul Proje Yatırım Fuarı ziyaretçi kaydınız başarıyla alınmıştır."
    )
    subject = f"Kayıt Onayı · {label}"
    name = (guest.get("name") or "").strip() or "Misafir"
    guest_id = str(guest.get("_id") or "")
    badge_view_url = f"{public_base_url}/api/badge/{guest_id}"

    html = f"""
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Helvetica Neue',Arial,sans-serif;color:#22316a;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f4f7;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.05);">

        <!-- Header -->
        <tr><td style="background:{accent_bg};padding:30px 40px;text-align:center;">
          <div style="color:{accent};font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">Kayıt Onayı</div>
          <div style="color:{accent_text};font-size:24px;font-weight:700;margin-top:6px;font-family:Georgia,serif;">{label}</div>
          <div style="color:{accent_text};opacity:0.8;font-size:13px;margin-top:4px;">{sub_label}</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px;">
          <p style="font-size:18px;color:#22316a;margin:0 0 16px 0;font-weight:600;">Sayın {html_escape.escape(name)},</p>
          <p style="font-size:14px;line-height:1.7;color:#555;margin:0 0 20px 0;">
            {intro} Aşağıda kayıt detaylarınızı bulabilirsiniz. Etkinlik günü <strong>yaka kartınızın çıktısını yanınızda</strong> getirmeniz veya telefonunuzdaki kareyi kayıt masasında okutmanız yeterlidir.
          </p>

          <!-- Info card -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8f9fb;border-left:4px solid {accent};border-radius:6px;margin:24px 0;">
            <tr><td style="padding:18px 22px;">
              <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Sıra Numaranız</div>
              <div style="font-size:24px;color:#22316a;font-weight:700;font-family:Georgia,serif;">#{seq_number}</div>
              <div style="height:1px;background:#e1e3e9;margin:12px 0;"></div>
              <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Etkinlik</div>
              <div style="font-size:14px;color:#22316a;font-weight:600;">{label}</div>
              <div style="font-size:13px;color:#555;margin-top:2px;">{venue_info}</div>
              <div style="font-size:13px;color:#555;">Hilton İstanbul Bosphorus</div>
            </td></tr>
          </table>

          <!-- Badge attachment notice -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:{accent_bg};border-radius:6px;margin:24px 0;">
            <tr><td style="padding:22px;text-align:center;">
              <div style="font-size:12px;color:{accent};text-transform:uppercase;letter-spacing:2px;font-weight:600;margin-bottom:8px;">Yaka Kartınız</div>
              <div style="color:{accent_text};font-size:14px;line-height:1.6;margin-bottom:14px;">
                Yaka kartınız bu e-postanın ekinde <strong>PNG dosyası</strong> olarak yer almaktadır.
                Üzerindeki <strong>QR kodu</strong> giriş günü kayıt masasında okutarak hızlıca check-in yapabilirsiniz.
              </div>
              <a href="{badge_view_url}" style="display:inline-block;background:{accent};color:{("#22316a" if is_summit else "#fff")};padding:11px 28px;border-radius:6px;font-weight:600;text-decoration:none;font-size:14px;">
                Yaka Kartını Tarayıcıda Aç
              </a>
            </td></tr>
          </table>

          <p style="font-size:13px;color:#888;line-height:1.6;margin:24px 0 0 0;">
            Sorularınız için bize <a href="mailto:noreply@arsayatirimzirvesi.com" style="color:{accent};">noreply@arsayatirimzirvesi.com</a> adresinden ulaşabilirsiniz.<br>
            Etkinlik günü görüşmek üzere!
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8f9fb;padding:24px 40px;text-align:center;border-top:1px solid #e1e3e9;">
          <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Arsa Yatırım Zirvesi 2026</div>
          <div style="font-size:11px;color:#aaa;margin-top:6px;">FIRAT CONSTRUCTION YAPI A.Ş.</div>
          <div style="font-size:11px;color:#aaa;margin-top:2px;"><a href="https://arsayatirimzirvesi.com" style="color:#aaa;text-decoration:none;">arsayatirimzirvesi.com</a></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""
    return subject, html


# --- Doc Cleaner ---
def clean_doc(doc: dict) -> dict:
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc


# ==================== AUTH ====================

@api_router.post("/auth/login")
async def login(body: UserLogin, response: Response):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Geçersiz email veya şifre")
    user_id = str(user["_id"])
    access = create_access_token(user_id, user["email"], user["role"])
    refresh = create_refresh_token(user_id)
    response.set_cookie("access_token", access, httponly=True, samesite="lax", max_age=86400, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, samesite="lax", max_age=604800, path="/")
    return {"id": user_id, "email": user["email"], "name": user["name"], "role": user["role"]}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Çıkış yapıldı"}

@api_router.get("/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        user_id = str(user["_id"])
        access = create_access_token(user_id, user["email"], user["role"])
        response.set_cookie("access_token", access, httponly=True, samesite="lax", max_age=86400, path="/")
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Refresh token expired")
    except Exception:
        raise HTTPException(401, "Invalid refresh token")


# ==================== PUBLIC ====================

@api_router.get("/speakers")
async def get_speakers():
    docs = await db.speakers.find({}).sort("order", 1).to_list(50)
    return [clean_doc(d) for d in docs]

@api_router.get("/sponsors")
async def get_sponsors():
    docs = await db.sponsors.find({}).sort("order", 1).to_list(50)
    return [clean_doc(d) for d in docs]

@api_router.get("/banners")
async def get_banners():
    docs = await db.banners.find({"is_active": True}).sort("order", 1).to_list(10)
    return [clean_doc(d) for d in docs]

@api_router.get("/blog")
async def get_blog_posts():
    docs = await db.blog_posts.find({"is_published": True}).sort("created_at", -1).to_list(50)
    return [clean_doc(d) for d in docs]

@api_router.get("/blog/{slug}")
async def get_blog_post(slug: str):
    doc = await db.blog_posts.find_one({"slug": slug, "is_published": True})
    if not doc:
        raise HTTPException(404, "Blog yazısı bulunamadı")
    return clean_doc(doc)

@api_router.get("/events")
async def get_events():
    docs = await db.past_events.find({}).sort("year", -1).to_list(20)
    return [clean_doc(d) for d in docs]

@api_router.get("/program")
async def get_program():
    docs = await db.program.find({}).sort("order", 1).to_list(50)
    return [clean_doc(d) for d in docs]


@api_router.get("/hero-slides")
async def get_hero_slides():
    docs = await db.hero_slides.find({"is_active": True}).sort("order", 1).to_list(20)
    return [clean_doc(d) for d in docs]


@api_router.get("/fair")
async def get_fair_settings():
    doc = await db.fair_settings.find_one({"key": "main"})
    if not doc:
        return {}
    return clean_doc(doc)


@api_router.get("/site-settings")
async def get_site_settings():
    doc = await db.site_settings.find_one({"key": "main"})
    if not doc:
        return {}
    return clean_doc(doc)


@api_router.get("/seo")
async def get_seo_settings():
    doc = await db.seo_settings.find_one({"key": "main"})
    if not doc:
        return {}
    return clean_doc(doc)


# ==================== REGISTRATION ====================

@api_router.post("/register/member")
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


@api_router.post("/register/validate-code")
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


@api_router.get("/register/capacity")
async def get_register_capacity():
    # Only count VERIFIED visitors towards capacity (spam-proof)
    summit_count = await db.guests.count_documents({
        "visit_type": {"$in": ["summit", None]},
        "is_verified": True,
    })
    fair_count = await db.guests.count_documents({
        "visit_type": "fair",
        "is_verified": True,
    })
    return {
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


@api_router.post("/register/guest")
async def register_guest(body: GuestCreate, background_tasks: BackgroundTasks):
    visit_type = (body.visit_type or "summit").lower()
    if visit_type not in ("summit", "fair"):
        visit_type = "summit"

    # === Validate invite code (only required for SUMMIT, fair is open) ===
    invite_code_doc = None
    if visit_type == "summit":
        code_check = await _check_invite_code(body.invite_code, visit_type)
        if not code_check["valid"]:
            raise HTTPException(400, code_check["reason"])
        invite_code_doc = code_check["doc"]

    existing = await db.guests.find_one({"email": body.email.lower()})
    if existing:
        # If existing but not yet verified, resend verification
        if not existing.get("is_verified"):
            token = existing.get("verification_token") or secrets.token_urlsafe(32)
            await db.guests.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "verification_token": token,
                    "verification_sent_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
            public_base = os.environ.get("PUBLIC_BASE_URL", "https://arsayatirimzirvesi.com").rstrip("/")
            verify_url = f"{public_base}/dogrulama?token={token}"
            subject, html = render_verify_email(existing, verify_url)
            background_tasks.add_task(send_email, existing["email"], subject, html, None)
            return {
                "id": str(existing["_id"]),
                "message": "Bu e-posta ile daha önce kayıt yapılmış ancak henüz doğrulanmamış. Doğrulama maili tekrar gönderildi.",
                "needs_verification": True,
            }
        raise HTTPException(400, "Bu e-posta ile zaten doğrulanmış bir kayıt var.")

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

    token = secrets.token_urlsafe(32)
    now_iso = datetime.now(timezone.utc).isoformat()
    payload = body.model_dump()
    payload.pop("invite_code", None)  # don't store on guest doc directly
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
        "is_verified": False,
        "verification_token": token,
        "verification_sent_at": now_iso,
        "verified_at": None,
    }
    result = await db.guests.insert_one(doc)
    guest_id = str(result.inserted_id)

    # Increment invite code usage
    if invite_code_doc:
        await db.invite_codes.update_one(
            {"_id": invite_code_doc["_id"]},
            {"$inc": {"used_count": 1}, "$set": {"last_used_at": now_iso}},
        )

    # Send verification email (NO badge yet)
    public_base = os.environ.get("PUBLIC_BASE_URL", "https://arsayatirimzirvesi.com").rstrip("/")
    verify_url = f"{public_base}/dogrulama?token={token}"
    subject, html = render_verify_email({**doc, "_id": result.inserted_id}, verify_url)
    background_tasks.add_task(send_email, body.email.lower(), subject, html, None)

    return {
        "id": guest_id,
        "message": "Kaydınız alındı. Doğrulama linki e-postanıza gönderildi.",
        "needs_verification": True,
    }


@api_router.get("/verify/guest")
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
        badge_png = render_badge_png(guest_full, seq)
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


@api_router.post("/register/exhibitor")
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


@api_router.post("/register/speaker-application")
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


# ==================== BADGE ====================

@api_router.get("/badge/{guest_id}", response_class=HTMLResponse)
async def generate_badge(guest_id: str):
    try:
        guest = await db.guests.find_one({"_id": ObjectId(guest_id)})
    except Exception:
        raise HTTPException(400, "Geçersiz ID")
    if not guest:
        raise HTTPException(404, "Misafir bulunamadı")

    visit_type = guest.get("visit_type") or "summit"
    is_summit = visit_type == "summit"

    # Brand palette — keep consistent with the website
    NAVY = "#22316a"
    NAVY_DARK = "#0F1B3F"
    GOLD = "#D4AF37"
    GOLD_SOFT = "rgba(212, 175, 55, 0.85)"

    accent = GOLD if is_summit else NAVY
    text_main = "#fff" if is_summit else NAVY
    text_sub = "rgba(255,255,255,0.7)" if is_summit else "rgba(34,49,106,0.75)"
    label = "ZİRVE KATILIMI" if is_summit else "FUAR ZİYARETÇİSİ"
    accent_text = NAVY if is_summit else "#fff"
    bg_grad_a = NAVY if is_summit else GOLD
    bg_grad_b = NAVY_DARK if is_summit else "#B89020"

    # QR code
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(f"00AYZ2026-{guest_id}")
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color=NAVY, back_color="white")
    buf = io.BytesIO()
    qr_img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    # Inline assets (base64) so the page renders perfectly on print/share
    def _b64_image(path: Path, fmt: str = "image/jpeg") -> str:
        try:
            data = path.read_bytes()
            return f"data:{fmt};base64,{base64.b64encode(data).decode()}"
        except Exception:
            return ""
    bg_img_path = UPLOADS_DIR / ("arsa_zirvesi_seminar.jpeg" if is_summit else "fair_bg.jpeg")
    bg_data = _b64_image(bg_img_path, "image/jpeg")
    firat_data = _b64_image(UPLOADS_DIR / "firat_logo.png", "image/png")
    jnr_data = _b64_image(UPLOADS_DIR / "jnr_logo.png", "image/png")

    # Sequence
    seq = await db.guests.count_documents({
        "visit_type": ({"$in": ["summit", None]} if is_summit else "fair"),
        "created_at": {"$lte": guest.get("created_at", "")},
    })

    event_date_line = "21 Mayıs 2026  ·  Hilton İstanbul Bosphorus" if is_summit \
        else "20-21 Mayıs 2026  ·  Hilton İstanbul Bosphorus"
    name = html_escape.escape(guest.get("name") or "")
    company = html_escape.escape(guest.get("company") or "")
    title_val = html_escape.escape(guest.get("title") or "")

    bg_layer = (
        f"background-image:linear-gradient(135deg,{bg_grad_a}E6 0%,{bg_grad_b}F2 100%),url('{bg_data}');"
        f"background-size:cover;background-position:center;"
    ) if bg_data else (
        f"background:linear-gradient(135deg,{bg_grad_a} 0%,{bg_grad_b} 100%);"
    )

    html = f"""<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><title>Yaka Kartı - {name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Outfit',sans-serif;background:#eef0f4;display:flex;justify-content:center;align-items:center;min-height:100vh;flex-direction:column;gap:24px;padding:32px 16px}}
.print-btn{{background:{NAVY};color:#fff;border:none;padding:13px 36px;border-radius:8px;cursor:pointer;font-family:'Outfit',sans-serif;font-weight:600;font-size:13px;letter-spacing:0.5px;transition:all 0.2s;box-shadow:0 4px 14px rgba(34,49,106,0.18);text-transform:uppercase;display:inline-flex;align-items:center;gap:8px}}
.print-btn:hover{{transform:translateY(-1px);box-shadow:0 6px 20px rgba(34,49,106,0.32);background:#1a2855}}
.badge{{
  width:380px;
  background:{NAVY};
  {bg_layer}
  border-radius:18px;
  padding:0;
  box-shadow:0 30px 80px rgba(15,27,63,0.35);
  position:relative;
  overflow:hidden;
  color:{text_main};
}}
.badge::before{{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,{accent} 0%,{GOLD_SOFT} 50%,{accent} 100%)}}
.inner{{padding:30px 26px 22px}}
.event-header{{text-align:center;padding-top:6px}}
.event-name{{font-family:'Playfair Display',serif;color:{accent};font-size:14px;letter-spacing:3px;text-transform:uppercase;font-weight:700}}
.event-date{{color:{text_sub};font-size:11px;margin-top:6px;font-weight:300;letter-spacing:0.4px}}
.tag{{display:inline-block;padding:6px 14px;background:{accent};color:{accent_text};font-size:9px;letter-spacing:2px;font-weight:700;border-radius:4px;margin-top:14px;text-transform:uppercase}}
.seq{{position:absolute;top:18px;right:18px;background:rgba(255,255,255,0.06);color:{text_main};padding:5px 10px;border-radius:6px;font-size:10px;font-weight:600;letter-spacing:0.5px;border:1px solid {accent};backdrop-filter:blur(6px)}}
.person{{display:flex;flex-direction:column;align-items:center;margin:32px 0 26px;padding:18px 14px;background:rgba(0,0,0,0.18);border-radius:12px;border:1px solid rgba(212,175,55,0.18)}}
.person-name{{font-family:'Playfair Display',serif;color:{text_main};font-size:28px;font-weight:700;text-align:center;line-height:1.15;margin:0 4px;letter-spacing:0.2px}}
.person-divider{{width:48px;height:2px;background:{accent};margin:12px auto 12px;opacity:0.85}}
.person-info-block{{display:flex;flex-direction:column;align-items:center;gap:4px}}
.person-title{{color:{accent};font-size:12px;letter-spacing:1px;font-weight:600;text-align:center;text-transform:uppercase}}
.person-company{{color:{text_sub};font-size:12px;letter-spacing:0.4px;text-align:center;font-weight:400}}
.qr-section{{display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:18px}}
.qr-wrap{{background:white;border-radius:10px;padding:10px;box-shadow:0 6px 18px rgba(0,0,0,0.18)}}
.badge-id{{color:{text_sub};font-size:10px;letter-spacing:1.5px;font-weight:500}}

/* === SPONSOR FOOTER === */
.sponsor-footer{{
  background:rgba(0,0,0,0.18);
  border-top:1px solid rgba(255,255,255,0.08);
  padding:14px 18px 16px;
  display:grid;
  grid-template-columns:1fr 1px 1fr;
  gap:12px;
  align-items:center;
}}
.sp-col{{display:flex;flex-direction:column;align-items:center;gap:6px}}
.sp-role{{
  font-size:8px;
  letter-spacing:2px;
  color:{accent};
  font-weight:700;
  text-transform:uppercase;
}}
.sp-logo-wrap{{
  background:white;
  border-radius:6px;
  padding:8px 12px;
  height:48px;
  display:flex;
  align-items:center;
  justify-content:center;
  width:100%;
  max-width:140px;
}}
.sp-logo-wrap img{{max-height:36px;max-width:120px;width:auto;height:auto;object-fit:contain;display:block}}
.sp-divider{{width:1px;height:48px;background:rgba(255,255,255,0.12);align-self:center}}

@media print{{
  body{{background:white;padding:0}}
  .print-btn{{display:none}}
  .badge{{box-shadow:none;width:380px}}
}}
</style></head>
<body>
<button class="print-btn" onclick="window.print()">Yaka Kartını Yazdır</button>
<div class="badge">
  <div class="inner">
    <span class="seq">#{seq}</span>
    <div class="event-header">
      <div class="event-name">ARSA YATIRIM ZİRVESİ 2026</div>
      <div class="event-date">{event_date_line}</div>
      <div class="tag">{label}</div>
    </div>
    <div class="person">
      <div class="person-name">{name}</div>
      {('<div class="person-divider"></div><div class="person-info-block">' + (f'<div class="person-title">{title_val}</div>' if title_val else '') + (f'<div class="person-company">{company}</div>' if company else '') + '</div>') if (title_val or company) else ''}
    </div>
    <div class="qr-section">
      <div class="qr-wrap"><img src="data:image/png;base64,{qr_b64}" width="92" height="92" alt="QR Kod"></div>
      <div class="badge-id">00AYZ2026-{guest_id[-8:].upper()}</div>
    </div>
  </div>
  <div class="sponsor-footer">
    <div class="sp-col">
      <div class="sp-role">Ana Sponsor</div>
      <div class="sp-logo-wrap">
        {f'<img src="{firat_data}" alt="Fırat Construction">' if firat_data else '<span style="font-size:11px;color:#22316a;font-weight:700">FIRAT CONSTRUCTION</span>'}
      </div>
    </div>
    <div class="sp-divider"></div>
    <div class="sp-col">
      <div class="sp-role">Organizatör</div>
      <div class="sp-logo-wrap">
        {f'<img src="{jnr_data}" alt="JNR Fuarcılık">' if jnr_data else '<span style="font-size:11px;color:#22316a;font-weight:700">JNR FUARCILIK</span>'}
      </div>
    </div>
  </div>
</div>
</body></html>"""
    return HTMLResponse(html)


def render_badge_png(guest: dict, seq_number: int) -> bytes:
    """Generate badge as PNG.
    White background, faint event-themed image overlay, footer with
    FIRAT (Ana Sponsor) + JNR EXPO (Organizatör) logos."""
    from PIL import Image, ImageDraw, ImageFont, ImageFilter

    visit_type = guest.get("visit_type") or "summit"
    is_summit = visit_type == "summit"

    # Color palette — accent matches the event identity
    NAVY = (34, 49, 106)
    GOLD = (212, 175, 55)
    accent = NAVY if is_summit else GOLD
    accent_text_on = (255, 255, 255) if is_summit else NAVY
    label_text = "ZİRVE KATILIMI" if is_summit else "FUAR ZİYARETÇİSİ"

    W, H = 720, 1080
    img = Image.new("RGB", (W, H), (255, 255, 255))

    # Background watermark image (zirve seminar photo or fuar floor photo)
    bg_filename = "arsa_zirvesi_seminar.jpeg" if is_summit else "fair_bg.jpeg"
    bg_path = UPLOADS_DIR / bg_filename
    if bg_path.exists():
        try:
            bg = Image.open(bg_path).convert("RGBA")
            # Fit and center crop to badge size
            bg_ratio = bg.width / bg.height
            target_ratio = W / H
            if bg_ratio > target_ratio:
                new_w = int(bg.height * target_ratio)
                left = (bg.width - new_w) // 2
                bg = bg.crop((left, 0, left + new_w, bg.height))
            else:
                new_h = int(bg.width / target_ratio)
                top = (bg.height - new_h) // 2
                bg = bg.crop((0, top, bg.width, top + new_h))
            bg = bg.resize((W, H), Image.LANCZOS)
            # Apply heavy white tint so it's a faint, elegant background
            bg = bg.filter(ImageFilter.GaussianBlur(radius=3))
            white_overlay = Image.new("RGBA", (W, H), (255, 255, 255, 220))
            bg = Image.alpha_composite(bg, white_overlay)
            img.paste(bg.convert("RGB"), (0, 0))
        except Exception as e:
            logger.warning(f"Badge bg image load failed: {e}")

    draw = ImageDraw.Draw(img, "RGBA")

    # Top accent bar (color depends on type)
    draw.rectangle([(0, 0), (W, 12)], fill=accent)

    # Font helpers
    def get_font(size, bold=True):
        paths = (
            ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
             "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]
            if bold else
            ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
             "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"]
        )
        for p in paths:
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
        return ImageFont.load_default()

    f_event = get_font(24)
    f_date = get_font(15, bold=False)
    f_label = get_font(20)
    f_name = get_font(42)
    f_title = get_font(20, bold=False)
    f_company = get_font(20, bold=False)
    f_seq = get_font(22)
    f_id = get_font(13, bold=False)
    f_sponsor_role = get_font(11)
    f_initials = get_font(72)

    def center_text(y, text, font, color):
        bbox = draw.textbbox((0, 0), text, font=font)
        w = bbox[2] - bbox[0]
        draw.text(((W - w) / 2, y), text, fill=color, font=font)

    # Sequence pill (top right)
    seq_text = f"#{seq_number}"
    bbox = draw.textbbox((0, 0), seq_text, font=f_seq)
    seq_w = bbox[2] - bbox[0]
    pad = 22
    draw.rounded_rectangle(
        [(W - seq_w - pad * 2 - 30, 35), (W - 30, 80)],
        radius=8, fill=accent
    )
    draw.text((W - seq_w - pad - 30, 43), seq_text, fill=accent_text_on, font=f_seq)

    # Event header
    center_text(80, "ARSA YATIRIM ZİRVESİ 2026", f_event, NAVY)
    date_line = "21 Mayıs 2026 · Hilton İstanbul Bosphorus" if is_summit else "20-21 Mayıs 2026 · Hilton İstanbul Bosphorus"
    center_text(115, date_line, f_date, (90, 90, 90))

    # Tag (event type label)
    bbox = draw.textbbox((0, 0), label_text, font=f_label)
    label_w = bbox[2] - bbox[0]
    label_h = bbox[3] - bbox[1]
    tag_pad_x = 18
    tag_pad_y = 8
    tag_x = (W - label_w - tag_pad_x * 2) / 2
    draw.rounded_rectangle(
        [(tag_x, 155), (tag_x + label_w + tag_pad_x * 2, 155 + label_h + tag_pad_y * 2)],
        radius=6, fill=accent
    )
    draw.text((tag_x + tag_pad_x, 155 + tag_pad_y), label_text, fill=accent_text_on, font=f_label)

    # Avatar circle with initials
    name = (guest.get("name") or "").strip()
    initials = "".join([w[0].upper() for w in name.split()[:2]]) if name else "K"
    av_size = 170
    av_x = int((W - av_size) / 2)
    av_y = 250
    draw.ellipse(
        [(av_x, av_y), (av_x + av_size, av_y + av_size)],
        fill=accent, outline=(255, 255, 255), width=5
    )
    bbox = draw.textbbox((0, 0), initials, font=f_initials)
    init_w = bbox[2] - bbox[0]
    init_h = bbox[3] - bbox[1]
    draw.text(
        (av_x + (av_size - init_w) / 2, av_y + (av_size - init_h) / 2 - 10),
        initials, fill=accent_text_on, font=f_initials
    )

    # Name + title + company
    center_text(450, name[:30] if name else "Kayıtlı Misafir", f_name, NAVY)
    title_val = (guest.get("title") or "").strip()
    if title_val:
        center_text(510, title_val[:40], f_title, accent if not is_summit else (90, 90, 90))
    company = (guest.get("company") or "").strip()
    if company:
        center_text(540, company[:40], f_company, (60, 60, 60))

    # QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(f"00AYZ2026-{guest.get('_id') or ''}")
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color=NAVY, back_color="white").convert("RGB")
    qr_size = 220
    qr_img = qr_img.resize((qr_size, qr_size), Image.LANCZOS)
    qr_x = int((W - qr_size) / 2)
    qr_y = 620
    draw.rounded_rectangle(
        [(qr_x - 14, qr_y - 14), (qr_x + qr_size + 14, qr_y + qr_size + 14)],
        radius=12, fill=(255, 255, 255), outline=accent, width=2
    )
    img.paste(qr_img, (qr_x, qr_y))

    # Badge ID
    guest_id = str(guest.get("_id") or "")
    badge_id = f"00AYZ2026-{guest_id[-8:].upper()}"
    center_text(880, badge_id, f_id, (140, 140, 140))

    # ==== SPONSOR FOOTER ====
    footer_y = 920
    # Subtle divider
    draw.rectangle([(60, footer_y), (W - 60, footer_y + 1)], fill=(220, 220, 220))

    # Two columns: FIRAT (left) and JNR (right)
    col_w = (W - 120) / 2

    def paste_logo(logo_path, target_box, role_label):
        """Paste a centered, fitted logo into target_box=(x1,y1,x2,y2) with role label below."""
        try:
            x1, y1, x2, y2 = target_box
            box_w = x2 - x1
            box_h = y2 - y1 - 22  # leave 22px for role label
            logo = Image.open(logo_path).convert("RGBA")
            ratio = min(box_w / logo.width, box_h / logo.height)
            nw, nh = int(logo.width * ratio), int(logo.height * ratio)
            logo = logo.resize((nw, nh), Image.LANCZOS)
            paste_x = x1 + int((box_w - nw) / 2)
            paste_y = y1 + int((box_h - nh) / 2)
            img.paste(logo, (paste_x, paste_y), logo)

            # Role label below
            bbox = draw.textbbox((0, 0), role_label, font=f_sponsor_role)
            lw = bbox[2] - bbox[0]
            draw.text(
                (x1 + int((box_w - lw) / 2), y2 - 18),
                role_label, fill=(120, 120, 120), font=f_sponsor_role
            )
        except Exception as e:
            logger.warning(f"Logo paste failed ({logo_path}): {e}")

    firat_logo = UPLOADS_DIR / "firat_logo.png"
    jnr_logo = UPLOADS_DIR / "jnr_logo.png"
    paste_logo(firat_logo, (60, footer_y + 14, int(60 + col_w), footer_y + 130), "ANA SPONSOR")
    paste_logo(jnr_logo, (int(W - 60 - col_w), footer_y + 14, W - 60, footer_y + 130), "ORGANİZATÖR")

    # Bottom accent bar
    draw.rectangle([(0, H - 8), (W, H)], fill=accent)

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


@api_router.get("/badge/{guest_id}/png")
async def generate_badge_png(guest_id: str):
    """Returns the visitor badge as a downloadable PNG image."""
    try:
        guest = await db.guests.find_one({"_id": ObjectId(guest_id)})
    except Exception:
        raise HTTPException(400, "Geçersiz ID")
    if not guest:
        raise HTTPException(404, "Misafir bulunamadı")

    visit_type = guest.get("visit_type") or "summit"
    seq = await db.guests.count_documents({
        "visit_type": ({"$in": ["summit", None]} if visit_type == "summit" else "fair"),
        "created_at": {"$lte": guest.get("created_at", "")},
    })
    png_bytes = render_badge_png(guest, seq)
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="yaka-karti-{guest_id[-8:]}.png"'},
    )


# ==================== ADMIN DASHBOARD ====================

@api_router.get("/admin/dashboard")
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


@api_router.post("/admin/checkin")
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


@api_router.get("/admin/checkin/stats")
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


@api_router.post("/admin/checkin/reset/{guest_id}")
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

@api_router.get("/admin/invite-codes")
async def admin_list_invite_codes(admin: dict = Depends(get_admin_user)):
    docs = await db.invite_codes.find({}).sort("created_at", -1).to_list(500)
    return [clean_doc(d) for d in docs]


@api_router.post("/admin/invite-codes")
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


@api_router.put("/admin/invite-codes/{code_id}")
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


@api_router.delete("/admin/invite-codes/{code_id}")
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


@api_router.get("/admin/api-keys")
async def admin_list_api_keys(admin: dict = Depends(get_admin_user)):
    docs = await db.api_keys.find({}).sort("created_at", -1).to_list(200)
    return [clean_doc(d) for d in docs]


@api_router.post("/admin/api-keys")
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


@api_router.put("/admin/api-keys/{key_id}")
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


@api_router.delete("/admin/api-keys/{key_id}")
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


@api_router.post("/external/checkin")
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


@api_router.get("/external/guests")
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


@api_router.get("/admin/visitego/config")
async def admin_visitego_get(admin: dict = Depends(get_admin_user)):
    cfg = await visitego_service.get_config(db)
    return {
        "enabled": cfg["enabled"],
        "auto_push": cfg["auto_push"],
        "scope": cfg["scope"],
        "token_masked": _mask_token(cfg["token"]),
        "has_token": bool(cfg["token"]),
    }


@api_router.put("/admin/visitego/config")
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


@api_router.post("/admin/visitego/sync-all")
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


@api_router.post("/admin/visitego/push/{guest_id}")
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


@api_router.get("/admin/visitego/logs")
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


@api_router.get("/admin/visitego/stats")
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


@api_router.post("/admin/visitego/test")
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


# ==================== ADMIN USERS (Admin Account Management) ====================

# ==================== INVESTMENT GAME (Public + Admin) ====================

INVESTMENT_GAME_BUDGET = 10_000_000  # 10 milyon TL başlangıç bütçesi
MAX_ITEMS = 30  # anti-abuse

def _validate_investment_items(items: List[InvestmentItem]) -> tuple[int, Optional[str]]:
    """Returns (total_spent, error_message_or_none)."""
    if not items:
        return 0, "En az bir yatırım eklemelisiniz"
    if len(items) > MAX_ITEMS:
        return 0, f"Çok fazla yatırım ({MAX_ITEMS} ile sınırlı)"
    total = 0
    for it in items:
        if it.kind not in ("daire", "arsa"):
            return 0, "Geçersiz yatırım türü"
        if it.budget <= 0:
            return 0, "Bütçe pozitif olmalı"
        if not it.city.strip() or not it.district.strip():
            return 0, "İl ve ilçe boş olamaz"
        if it.kind == "daire" and it.daire_type not in ("1+1", "2+1", "3+1", "5+1"):
            return 0, "Daire tipi 1+1/2+1/3+1/5+1 olmalı"
        if it.kind == "arsa" and it.arsa_type not in ("tarla", "arsa"):
            return 0, "Arsa cinsi tarla veya arsa olmalı"
        total += it.budget
    if total > INVESTMENT_GAME_BUDGET:
        return total, f"Toplam bütçe {INVESTMENT_GAME_BUDGET:,} TL'yi aşıyor"
    return total, None


@api_router.post("/investment-game/submit")
async def investment_game_submit(body: InvestmentGameSubmit, request: Request):
    total_spent, err = _validate_investment_items(body.items)
    if err:
        raise HTTPException(400, err)

    # Light anti-abuse: same phone in last 10 min = update instead of duplicate row
    phone_clean = body.phone.strip()
    ten_min_ago = datetime.now(timezone.utc) - timedelta(minutes=10)
    existing = await db.investment_game.find_one({
        "phone": phone_clean,
        "created_at": {"$gte": ten_min_ago.isoformat()},
    })

    now_iso = datetime.now(timezone.utc).isoformat()
    ip = (request.headers.get("x-forwarded-for") or request.client.host if request.client else "") or ""

    doc = {
        "name": body.name.strip(),
        "phone": phone_clean,
        "email": body.email.lower().strip(),
        "age": body.age,
        "profession": body.profession.strip(),
        "items": [it.model_dump() for it in body.items],
        "total_spent": total_spent,
        "remaining": INVESTMENT_GAME_BUDGET - total_spent,
        "starting_budget": INVESTMENT_GAME_BUDGET,
        "ip": ip.split(",")[0].strip()[:45],
        "user_agent": (request.headers.get("user-agent") or "")[:300],
        "updated_at": now_iso,
    }

    if existing:
        await db.investment_game.update_one({"_id": existing["_id"]}, {"$set": doc})
        gid = str(existing["_id"])
        created_at = existing.get("created_at", now_iso)
    else:
        doc["created_at"] = now_iso
        r = await db.investment_game.insert_one(doc)
        gid = str(r.inserted_id)
        created_at = now_iso

    # Compute portfolio badges for fun UI
    daire_count = sum(1 for it in body.items if it.kind == "daire")
    arsa_count = sum(1 for it in body.items if it.kind == "arsa")
    badges = []
    if daire_count >= 3: badges.append({"id": "daire_avcisi", "label": "🏘️ Daire Avcısı", "description": f"{daire_count} daire aldın"})
    if arsa_count >= 3: badges.append({"id": "arsa_krali", "label": "🌾 Arsa Kralı", "description": f"{arsa_count} arsa aldın"})
    if daire_count > 0 and arsa_count > 0: badges.append({"id": "portfoy_ustasi", "label": "🎰 Portföy Ustası", "description": "Hem daire hem arsa"})
    if total_spent == INVESTMENT_GAME_BUDGET: badges.append({"id": "all_in", "label": "💯 Tüm Parayı Yatırdın", "description": "Bütçenin tamamını değerlendirdin"})
    if total_spent >= INVESTMENT_GAME_BUDGET * 0.9: badges.append({"id": "big_spender", "label": "💸 Büyük Yatırımcı", "description": "%90+ harcadın"})

    cities = list({it.city.strip() for it in body.items if it.city.strip()})
    if len(cities) >= 3: badges.append({"id": "multi_city", "label": "🗺️ Çoklu Şehir", "description": f"{len(cities)} şehirde yatırım"})

    return {
        "id": gid,
        "name": doc["name"],
        "total_spent": total_spent,
        "remaining": doc["remaining"],
        "starting_budget": INVESTMENT_GAME_BUDGET,
        "items": doc["items"],
        "badges": badges,
        "daire_count": daire_count,
        "arsa_count": arsa_count,
        "created_at": created_at,
        "updated": bool(existing),
    }


@api_router.get("/admin/investment-game")
async def admin_investment_game_list(limit: int = 500, admin: dict = Depends(get_admin_user)):
    limit = max(1, min(int(limit or 500), 2000))
    docs = await db.investment_game.find().sort("created_at", -1).to_list(limit)
    out = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        out.append(d)
    return out


@api_router.get("/admin/investment-game/stats")
async def admin_investment_game_stats(admin: dict = Depends(get_admin_user)):
    total = await db.investment_game.count_documents({})
    if total == 0:
        return {
            "total_players": 0, "avg_spent": 0, "total_items": 0,
            "daire_count": 0, "arsa_count": 0,
            "top_cities": [], "top_daire_types": [], "top_arsa_types": [],
        }

    pipeline_city = [
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.city", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    top_cities = [{"city": r["_id"], "count": r["count"]} async for r in db.investment_game.aggregate(pipeline_city) if r["_id"]]

    pipeline_daire = [
        {"$unwind": "$items"},
        {"$match": {"items.kind": "daire"}},
        {"$group": {"_id": "$items.daire_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    top_daire_types = [{"type": r["_id"] or "?", "count": r["count"]} async for r in db.investment_game.aggregate(pipeline_daire)]

    pipeline_arsa = [
        {"$unwind": "$items"},
        {"$match": {"items.kind": "arsa"}},
        {"$group": {"_id": "$items.arsa_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    top_arsa_types = [{"type": r["_id"] or "?", "count": r["count"]} async for r in db.investment_game.aggregate(pipeline_arsa)]

    pipeline_agg = [
        {"$group": {
            "_id": None,
            "avg_spent": {"$avg": "$total_spent"},
            "total_items": {"$sum": {"$size": "$items"}},
        }},
    ]
    agg = await db.investment_game.aggregate(pipeline_agg).to_list(1)
    avg_spent = int(agg[0]["avg_spent"]) if agg else 0
    total_items = int(agg[0]["total_items"]) if agg else 0

    daire_count = 0
    arsa_count = 0
    async for r in db.investment_game.aggregate([
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.kind", "count": {"$sum": 1}}},
    ]):
        if r["_id"] == "daire": daire_count = r["count"]
        elif r["_id"] == "arsa": arsa_count = r["count"]

    return {
        "total_players": total,
        "avg_spent": avg_spent,
        "total_items": total_items,
        "daire_count": daire_count,
        "arsa_count": arsa_count,
        "top_cities": top_cities,
        "top_daire_types": top_daire_types,
        "top_arsa_types": top_arsa_types,
    }


@api_router.delete("/admin/investment-game/{entry_id}")
async def admin_investment_game_delete(entry_id: str, admin: dict = Depends(get_admin_user)):
    if not ObjectId.is_valid(entry_id):
        raise HTTPException(400, "Geçersiz ID")
    r = await db.investment_game.delete_one({"_id": ObjectId(entry_id)})
    if r.deleted_count == 0:
        raise HTTPException(404, "Kayıt bulunamadı")
    return {"deleted": True}


@api_router.get("/admin/investment-game/export")
async def admin_investment_game_export(admin: dict = Depends(get_admin_user)):
    """CSV export (Excel-ready, UTF-8 BOM)."""
    from fastapi.responses import StreamingResponse
    import io as _io, csv as _csv

    docs = await db.investment_game.find().sort("created_at", -1).to_list(5000)
    buf = _io.StringIO()
    buf.write("\ufeff")  # BOM for Excel
    w = _csv.writer(buf)
    w.writerow([
        "Kayıt Zamanı", "Ad Soyad", "Telefon", "E-posta", "Yaş", "Meslek",
        "Toplam Yatırım (TL)", "Kalan (TL)", "Yatırım Sayısı",
        "Portföy Özeti",
    ])
    for d in docs:
        items = d.get("items", [])
        summary_parts = []
        for it in items:
            if it.get("kind") == "daire":
                summary_parts.append(f"Daire {it.get('daire_type','')} {it.get('city','')}/{it.get('district','')} ₺{it.get('budget',0):,}")
            else:
                summary_parts.append(f"{(it.get('arsa_type') or 'arsa').title()} {it.get('city','')}/{it.get('district','')} ₺{it.get('budget',0):,}")
        w.writerow([
            d.get("created_at", ""),
            d.get("name", ""),
            d.get("phone", ""),
            d.get("email", ""),
            d.get("age", ""),
            d.get("profession", ""),
            d.get("total_spent", 0),
            d.get("remaining", 0),
            len(items),
            " | ".join(summary_parts),
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="yatirim-oyunu.csv"'},
    )


# ==================== ADMIN USERS (Admin Account Management) ====================

@api_router.get("/admin/users")
async def admin_list_users(admin: dict = Depends(get_admin_user)):
    docs = await db.users.find({}, {"password_hash": 0}).sort("created_at", -1).to_list(100)
    return [clean_doc(d) for d in docs]

@api_router.post("/admin/users")
async def admin_create_user(body: AdminUserCreate, admin: dict = Depends(get_admin_user)):
    if len(body.password) < 8:
        raise HTTPException(400, "Şifre en az 8 karakter olmalıdır")
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "Bu email ile zaten bir admin var")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["email"],
    }
    result = await db.users.insert_one(doc)
    return {"id": str(result.inserted_id), "email": email, "name": body.name, "message": "Yeni admin oluşturuldu"}

@api_router.patch("/admin/users/{user_id}/password")
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

@api_router.patch("/admin/users/{user_id}/name")
async def admin_update_name(user_id: str, body: AdminNameUpdate, admin: dict = Depends(get_admin_user)):
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"name": body.name, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Admin bulunamadı")
    return {"message": "İsim güncellendi"}

@api_router.delete("/admin/users/{user_id}")
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


# ==================== ADMIN MEMBERS ====================

@api_router.get("/admin/members")
async def admin_get_members(admin: dict = Depends(get_admin_user)):
    docs = await db.members.find({}).sort("created_at", -1).to_list(1000)
    return [clean_doc(d) for d in docs]

@api_router.delete("/admin/members/{member_id}")
async def admin_delete_member(member_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.members.delete_one({"_id": ObjectId(member_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Üye bulunamadı")
    return {"message": "Üye silindi"}


# ==================== ADMIN GUESTS (VISITORS) ====================

@api_router.get("/admin/guests")
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
    if visit_type and visit_type in ("summit", "fair"):
        vt_or = (
            [{"visit_type": "summit"}, {"visit_type": {"$exists": False}}, {"visit_type": None}]
            if visit_type == "summit" else [{"visit_type": "fair"}]
        )
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
    return [clean_doc(d) for d in docs]

@api_router.patch("/admin/guests/{guest_id}")
async def admin_update_guest(guest_id: str, body: StatusUpdate, admin: dict = Depends(get_admin_user)):
    update = {"status": body.status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if body.admin_notes is not None:
        update["admin_notes"] = body.admin_notes
    result = await db.guests.update_one({"_id": ObjectId(guest_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Ziyaretçi bulunamadı")
    return {"message": "Güncellendi"}

@api_router.delete("/admin/guests/{guest_id}")
async def admin_delete_guest(guest_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.guests.delete_one({"_id": ObjectId(guest_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Ziyaretçi bulunamadı")
    return {"message": "Ziyaretçi silindi"}


# ==================== ADMIN EXHIBITORS ====================

@api_router.get("/admin/exhibitors")
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

@api_router.patch("/admin/exhibitors/{app_id}")
async def admin_update_exhibitor(app_id: str, body: StatusUpdate, admin: dict = Depends(get_admin_user)):
    update = {"status": body.status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if body.admin_notes is not None:
        update["admin_notes"] = body.admin_notes
    result = await db.exhibitors.update_one({"_id": ObjectId(app_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Stant başvurusu bulunamadı")
    return {"message": "Güncellendi"}

@api_router.delete("/admin/exhibitors/{app_id}")
async def admin_delete_exhibitor(app_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.exhibitors.delete_one({"_id": ObjectId(app_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Stant başvurusu bulunamadı")
    return {"message": "Stant başvurusu silindi"}


# ==================== ADMIN SPEAKER APPLICATIONS ====================

@api_router.get("/admin/speaker-applications")
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

@api_router.patch("/admin/speaker-applications/{app_id}")
async def admin_update_speaker_application(app_id: str, body: StatusUpdate, admin: dict = Depends(get_admin_user)):
    update = {"status": body.status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if body.admin_notes is not None:
        update["admin_notes"] = body.admin_notes
    result = await db.speaker_applications.update_one({"_id": ObjectId(app_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Başvuru bulunamadı")
    return {"message": "Güncellendi"}

@api_router.delete("/admin/speaker-applications/{app_id}")
async def admin_delete_speaker_application(app_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.speaker_applications.delete_one({"_id": ObjectId(app_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Başvuru bulunamadı")
    return {"message": "Başvuru silindi"}


# ==================== ADMIN EMAIL ====================

@api_router.post("/admin/email/send")
async def send_broadcast(body: EmailBroadcast, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    if body.recipient_type == "members":
        docs = await db.members.find({}, {"email": 1, "name": 1}).to_list(1000)
    elif body.recipient_type == "guests":
        docs = await db.guests.find({}, {"email": 1, "name": 1}).to_list(1000)
    elif body.recipient_type == "exhibitors":
        docs = await db.exhibitors.find({}, {"email": 1, "contact_name": 1}).to_list(1000)
    elif body.recipient_type == "speaker_applications":
        docs = await db.speaker_applications.find({}, {"email": 1, "name": 1}).to_list(1000)
    else:
        raise HTTPException(400, "Geçersiz alıcı tipi")

    sendgrid_configured = bool(os.environ.get("SENDGRID_API_KEY", "").strip())
    if not sendgrid_configured:
        return {
            "message": "SendGrid API anahtarı yapılandırılmamış. Gönderim yapılamadı.",
            "count": 0,
            "queued": len(docs),
            "sendgrid_configured": False,
        }

    for doc in docs:
        background_tasks.add_task(send_email, doc["email"], body.subject, body.content)
    return {
        "message": f"{len(docs)} alıcıya email kuyruğa alındı",
        "count": len(docs),
        "sendgrid_configured": True,
    }

@api_router.post("/admin/email/individual")
async def send_individual_email(body: EmailIndividual, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    sendgrid_configured = bool(os.environ.get("SENDGRID_API_KEY", "").strip())
    if not sendgrid_configured:
        return {
            "message": "SendGrid API anahtarı yapılandırılmamış. Gönderim yapılamadı.",
            "sendgrid_configured": False,
        }
    background_tasks.add_task(send_email, body.to_email, body.subject, body.content)
    return {"message": "Email kuyruğa alındı", "sendgrid_configured": True}


# ==================== ADMIN SPEAKERS ====================

@api_router.get("/admin/speakers")
async def admin_get_speakers(admin: dict = Depends(get_admin_user)):
    docs = await db.speakers.find({}).sort("order", 1).to_list(50)
    return [clean_doc(d) for d in docs]

@api_router.post("/admin/speakers")
async def admin_create_speaker(body: SpeakerCreate, admin: dict = Depends(get_admin_user)):
    doc = {**body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.speakers.insert_one(doc)
    doc["_id"] = result.inserted_id
    return clean_doc(doc)

@api_router.put("/admin/speakers/{speaker_id}")
async def admin_update_speaker(speaker_id: str, body: SpeakerCreate, admin: dict = Depends(get_admin_user)):
    update = {**body.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    result = await db.speakers.update_one({"_id": ObjectId(speaker_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Konuşmacı bulunamadı")
    doc = await db.speakers.find_one({"_id": ObjectId(speaker_id)})
    return clean_doc(doc)

@api_router.delete("/admin/speakers/{speaker_id}")
async def admin_delete_speaker(speaker_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.speakers.delete_one({"_id": ObjectId(speaker_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Konuşmacı bulunamadı")
    return {"message": "Konuşmacı silindi"}


# ==================== ADMIN SPONSORS ====================

@api_router.get("/admin/sponsors")
async def admin_get_sponsors(admin: dict = Depends(get_admin_user)):
    docs = await db.sponsors.find({}).sort("order", 1).to_list(50)
    return [clean_doc(d) for d in docs]

@api_router.post("/admin/sponsors")
async def admin_create_sponsor(body: SponsorCreate, admin: dict = Depends(get_admin_user)):
    doc = {**body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.sponsors.insert_one(doc)
    doc["_id"] = result.inserted_id
    return clean_doc(doc)

@api_router.put("/admin/sponsors/{sponsor_id}")
async def admin_update_sponsor(sponsor_id: str, body: SponsorCreate, admin: dict = Depends(get_admin_user)):
    update = {**body.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    result = await db.sponsors.update_one({"_id": ObjectId(sponsor_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Sponsor bulunamadı")
    doc = await db.sponsors.find_one({"_id": ObjectId(sponsor_id)})
    return clean_doc(doc)

@api_router.delete("/admin/sponsors/{sponsor_id}")
async def admin_delete_sponsor(sponsor_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.sponsors.delete_one({"_id": ObjectId(sponsor_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Sponsor bulunamadı")
    return {"message": "Sponsor silindi"}


# ==================== ADMIN BANNERS ====================

@api_router.get("/admin/banners")
async def admin_get_banners(admin: dict = Depends(get_admin_user)):
    docs = await db.banners.find({}).sort("order", 1).to_list(10)
    return [clean_doc(d) for d in docs]

@api_router.post("/admin/banners")
async def admin_create_banner(body: BannerCreate, admin: dict = Depends(get_admin_user)):
    doc = {**body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.banners.insert_one(doc)
    doc["_id"] = result.inserted_id
    return clean_doc(doc)

@api_router.put("/admin/banners/{banner_id}")
async def admin_update_banner(banner_id: str, body: BannerCreate, admin: dict = Depends(get_admin_user)):
    update = {**body.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    result = await db.banners.update_one({"_id": ObjectId(banner_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Banner bulunamadı")
    doc = await db.banners.find_one({"_id": ObjectId(banner_id)})
    return clean_doc(doc)

@api_router.delete("/admin/banners/{banner_id}")
async def admin_delete_banner(banner_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.banners.delete_one({"_id": ObjectId(banner_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Banner bulunamadı")
    return {"message": "Banner silindi"}


# ==================== ADMIN BLOG ====================

@api_router.get("/admin/blog")
async def admin_get_blog(admin: dict = Depends(get_admin_user)):
    docs = await db.blog_posts.find({}).sort("created_at", -1).to_list(100)
    return [clean_doc(d) for d in docs]

@api_router.post("/admin/blog")
async def admin_create_blog(body: BlogPostCreate, admin: dict = Depends(get_admin_user)):
    existing = await db.blog_posts.find_one({"slug": body.slug})
    if existing:
        raise HTTPException(400, "Bu slug zaten kullanılıyor")
    doc = {**body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.blog_posts.insert_one(doc)
    doc["_id"] = result.inserted_id
    return clean_doc(doc)

@api_router.put("/admin/blog/{post_id}")
async def admin_update_blog(post_id: str, body: BlogPostCreate, admin: dict = Depends(get_admin_user)):
    update = {**body.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    result = await db.blog_posts.update_one({"_id": ObjectId(post_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Blog yazısı bulunamadı")
    doc = await db.blog_posts.find_one({"_id": ObjectId(post_id)})
    return clean_doc(doc)

@api_router.delete("/admin/blog/{post_id}")
async def admin_delete_blog(post_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.blog_posts.delete_one({"_id": ObjectId(post_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Blog yazısı bulunamadı")
    return {"message": "Blog yazısı silindi"}


# ==================== ADMIN EVENTS ====================

@api_router.get("/admin/events")
async def admin_get_events(admin: dict = Depends(get_admin_user)):
    docs = await db.past_events.find({}).sort("year", -1).to_list(50)
    return [clean_doc(d) for d in docs]

@api_router.post("/admin/events")
async def admin_create_event(body: PastEventCreate, admin: dict = Depends(get_admin_user)):
    doc = {**body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.past_events.insert_one(doc)
    doc["_id"] = result.inserted_id
    return clean_doc(doc)

@api_router.put("/admin/events/{event_id}")
async def admin_update_event(event_id: str, body: PastEventCreate, admin: dict = Depends(get_admin_user)):
    update = {**body.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    result = await db.past_events.update_one({"_id": ObjectId(event_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Etkinlik bulunamadı")
    doc = await db.past_events.find_one({"_id": ObjectId(event_id)})
    return clean_doc(doc)

@api_router.delete("/admin/events/{event_id}")
async def admin_delete_event(event_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.past_events.delete_one({"_id": ObjectId(event_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Etkinlik bulunamadı")
    return {"message": "Etkinlik silindi"}


@api_router.get("/admin/seo")
async def admin_get_seo(admin: dict = Depends(get_admin_user)):
    doc = await db.seo_settings.find_one({"key": "main"})
    if not doc:
        return {}
    return clean_doc(doc)

@api_router.put("/admin/seo")
async def admin_update_seo(body: SeoSettings, admin: dict = Depends(get_admin_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.seo_settings.update_one(
        {"key": "main"},
        {"$set": update, "$setOnInsert": {"key": "main", "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    doc = await db.seo_settings.find_one({"key": "main"})
    return clean_doc(doc)


# ===== Hero slides admin =====
@api_router.get("/admin/hero-slides")
async def admin_list_hero_slides(admin: dict = Depends(get_admin_user)):
    docs = await db.hero_slides.find({}).sort("order", 1).to_list(50)
    return [clean_doc(d) for d in docs]

@api_router.post("/admin/hero-slides")
async def admin_create_hero_slide(body: HeroSlideCreate, admin: dict = Depends(get_admin_user)):
    doc = {**body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.hero_slides.insert_one(doc)
    doc["_id"] = result.inserted_id
    return clean_doc(doc)

@api_router.put("/admin/hero-slides/{slide_id}")
async def admin_update_hero_slide(slide_id: str, body: HeroSlideCreate, admin: dict = Depends(get_admin_user)):
    update = {**body.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    result = await db.hero_slides.update_one({"_id": ObjectId(slide_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Slide bulunamadı")
    doc = await db.hero_slides.find_one({"_id": ObjectId(slide_id)})
    return clean_doc(doc)

@api_router.delete("/admin/hero-slides/{slide_id}")
async def admin_delete_hero_slide(slide_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.hero_slides.delete_one({"_id": ObjectId(slide_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Slide bulunamadı")
    return {"message": "Slide silindi"}


# ===== Image upload =====
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB

@api_router.post("/admin/uploads/image")
async def admin_upload_image(file: UploadFile = File(...), admin: dict = Depends(get_admin_user)):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, f"Geçersiz dosya tipi: {file.content_type}. JPG, PNG, WEBP veya GIF kullanın.")

    # Read & size check
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(400, f"Dosya boyutu maksimum {MAX_IMAGE_SIZE // 1024 // 1024} MB olabilir")
    if len(content) == 0:
        raise HTTPException(400, "Boş dosya")

    # Generate safe filename
    import uuid
    ext_map = {"image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
    ext = ext_map.get(file.content_type, ".jpg")
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOADS_DIR / unique_name
    file_path.write_bytes(content)

    public_url = f"/api/uploads/{unique_name}"
    return {"url": public_url, "filename": unique_name, "size": len(content)}



# ===== Fair settings admin =====
@api_router.get("/admin/fair")
async def admin_get_fair(admin: dict = Depends(get_admin_user)):
    doc = await db.fair_settings.find_one({"key": "main"})
    if not doc:
        return {}
    return clean_doc(doc)

@api_router.put("/admin/fair")
async def admin_update_fair(body: FairSettings, admin: dict = Depends(get_admin_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.fair_settings.update_one(
        {"key": "main"},
        {"$set": update, "$setOnInsert": {"key": "main", "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    doc = await db.fair_settings.find_one({"key": "main"})
    return clean_doc(doc)


# ===== Site settings (event date / countdown) =====
@api_router.get("/admin/site-settings")
async def admin_get_site_settings(admin: dict = Depends(get_admin_user)):
    doc = await db.site_settings.find_one({"key": "main"})
    if not doc:
        return {}
    return clean_doc(doc)


@api_router.put("/admin/site-settings")
async def admin_update_site_settings(body: SiteSettings, admin: dict = Depends(get_admin_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.site_settings.update_one(
        {"key": "main"},
        {"$set": update, "$setOnInsert": {"key": "main", "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    doc = await db.site_settings.find_one({"key": "main"})
    return clean_doc(doc)





# ==================== ADMIN PROGRAM ====================

@api_router.get("/admin/program")
async def admin_get_program(admin: dict = Depends(get_admin_user)):
    docs = await db.program.find({}).sort("order", 1).to_list(50)
    return [clean_doc(d) for d in docs]

@api_router.post("/admin/program")
async def admin_create_session(body: ProgramSessionCreate, admin: dict = Depends(get_admin_user)):
    doc = {**body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.program.insert_one(doc)
    doc["_id"] = result.inserted_id
    return clean_doc(doc)

@api_router.put("/admin/program/{session_id}")
async def admin_update_session(session_id: str, body: ProgramSessionCreate, admin: dict = Depends(get_admin_user)):
    update = {**body.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    result = await db.program.update_one({"_id": ObjectId(session_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Oturum bulunamadı")
    doc = await db.program.find_one({"_id": ObjectId(session_id)})
    return clean_doc(doc)

@api_router.delete("/admin/program/{session_id}")
async def admin_delete_session(session_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.program.delete_one({"_id": ObjectId(session_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Oturum bulunamadı")
    return {"message": "Oturum silindi"}


# ==================== APP SETUP ====================

app.include_router(api_router)


# Static uploads directory — serves files uploaded via admin panel
# Mounted under /api/uploads so K8s ingress routes the requests to the backend
UPLOADS_DIR = Path(__file__).parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


# Dynamic SEO endpoints (also exposed under /api for ingress routing)
@api_router.get("/seo/robots.txt", response_class=Response)
async def robots_txt_api():
    seo = await db.seo_settings.find_one({"key": "main"}) or {}
    site_url = (seo.get("site_url") or "https://arsayatirimzirvesi.com").rstrip("/")
    body = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /admin\n"
        "Disallow: /admin/\n"
        f"\nSitemap: {site_url}/sitemap.xml\n"
    )
    return Response(content=body, media_type="text/plain")


@api_router.get("/seo/sitemap.xml", response_class=Response)
async def sitemap_xml_api():
    seo = await db.seo_settings.find_one({"key": "main"}) or {}
    site_url = (seo.get("site_url") or "https://arsayatirimzirvesi.com").rstrip("/")
    paths = [
        "/", "/konusmacilar", "/program", "/etkinlikler", "/blog",
        "/ziyaretci-kaydi", "/fuar-stant-kaydi", "/konusmaci-basvuru",
        "/kvkk", "/gizlilik",
    ]
    blog_docs = await db.blog_posts.find({"is_published": True}).to_list(200)
    for b in blog_docs:
        slug = b.get("slug")
        if slug:
            paths.append(f"/blog/{slug}")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    items = "".join(
        f"<url><loc>{site_url}{p}</loc><lastmod>{today}</lastmod><changefreq>weekly</changefreq><priority>{'1.0' if p == '/' else '0.8'}</priority></url>"
        for p in paths
    )
    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{items}</urlset>'
    return Response(content=xml, media_type="application/xml")


app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.members.create_index("email", unique=True)
    await db.guests.create_index("email", unique=True)
    await db.blog_posts.create_index("slug", unique=True)

    # Seed admin (ONLY first time — never overwrite existing user's password)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@arsayatirim.com")
    admin_pass = os.environ.get("ADMIN_PASSWORD", "Admin@2026!")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_pass),
            "name": "Admin", "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user created: {admin_email}")
    # NOTE: We intentionally do NOT reset password from .env on subsequent
    # restarts. Once the admin user exists, ADMIN_PASSWORD env var is only a
    # bootstrap default. To force a reset, set ADMIN_FORCE_PASSWORD_RESET=1
    # in the environment for ONE deploy.
    elif os.environ.get("ADMIN_FORCE_PASSWORD_RESET") == "1":
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_pass)}},
        )
        logger.warning(f"Admin password reset from env (ADMIN_FORCE_PASSWORD_RESET=1): {admin_email}")

    # Seed speakers
    if await db.speakers.count_documents({}) == 0:
        speakers = [
            {"name": "Muhammet Özdemir", "title": "Zirve Sahibi · Arsa-Arazi Yatırımı Saha Uzmanı",
             "bio": "Zirve sahibi, moderatör ve konuşmacı. Arsa-arazi yatırımı saha uzmanı. Yenişehir Bölge Sunumu, Arazi Semineri ve e-İpat Tanıtımı oturumlarında sahne alacak.",
             "image_url": "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/x4sqnjpl_muhammet%20%C3%B6zdemir.jpeg",
             "order": 0, "is_featured": False, "social_linkedin": "", "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Büşra Kiraz", "title": "Avukat · Gayrimenkul Hukuku",
             "bio": "15 yıldır hizmet veren Kiraz Hukuk Bürosu'nun kurucusu. Gayrimenkul hukuku alanında eğitmen olarak çalışmakta, kentsel dönüşüm proje danışmanlığında özel uzmanlığa sahiptir.",
             "image_url": "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/opwzx5vk_B%C3%BC%C5%9Fra%20Kiraz.jpeg",
             "order": 1, "is_featured": False, "social_linkedin": "", "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Murat Gültekin", "title": "Ata Yatırım ve Gayrimenkul",
             "bio": "20 yıllık sektör tecrübesiyle yatırım bölgesi kaşifi. \"Arsa yatırımının ilk kuralı alırken kazanmaktır\" ilkesini benimseyen; yerel ve ulusal basında sık sık yer alan, yatırımcıyı koruma önerileriyle tanınan isim.",
             "image_url": "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/0h2lrfqd_Murat%20G%C3%BCltekin.jpeg",
             "order": 2, "is_featured": False, "social_linkedin": "", "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Oğuzhan Öztürk", "title": "Re/Max Master · Broker",
             "bio": "Re/Max Master'ın sahibi ve broker'ı. Uluslararası portföy yönetimi, yabancıya satış ve alıcı-satıcı psikolojisi alanlarında uzmanlaşmıştır.",
             "image_url": "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/irdc8yo6_O%C4%9Fuzhan%20%C3%96zt%C3%BCrk.PNG",
             "image_position": "center 35%",
             "order": 3, "is_featured": False, "social_linkedin": "", "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.speakers.insert_many(speakers)
        logger.info("Speakers seeded")

    # Seed sponsors
    if await db.sponsors.count_documents({}) == 0:
        await db.sponsors.insert_many([
            {"name": "FIRAT CONSTRUCTION YAPI A.Ş.", "logo_url": "", "website_url": "https://firatconstruction.com", "tier": "main", "order": 0, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "JNR Fuarcılık", "logo_url": "", "website_url": "", "tier": "organization", "order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
        ])
        logger.info("Sponsors seeded")

    # Seed program
    if await db.program.count_documents({}) == 0:
        sessions = [
            {"time_start": "12:00", "time_end": "12:10", "title": "Açılış ve Hoşgeldiniz", "speaker_name": "Muhammet Özdemir", "session_type": "session", "description": "", "order": 0},
            {"time_start": "12:10", "time_end": "12:30", "title": "Konut Bitti, Sıra Toprakta: 2026 Fırsat Haritası", "speaker_name": "Murat Gültekin", "session_type": "session", "description": "", "order": 1},
            {"time_start": "12:30", "time_end": "12:50", "title": "Yenişehir Sunumu", "speaker_name": "Muhammet Özdemir", "session_type": "session", "description": "", "order": 2},
            {"time_start": "12:50", "time_end": "13:05", "title": "Kahve Arası", "speaker_name": "", "session_type": "break", "description": "", "order": 3},
            {"time_start": "13:05", "time_end": "13:25", "title": "Arsa Yatırımında: Bütçe? Zaman? Beklenti?", "speaker_name": "Oğuzhan Öztürk", "session_type": "session", "description": "", "order": 4},
            {"time_start": "13:25", "time_end": "13:45", "title": "Arazi Yatırım Semineri", "speaker_name": "Muhammet Özdemir", "session_type": "session", "description": "", "order": 5},
            {"time_start": "13:45", "time_end": "14:05", "title": "Arazide Hukuk", "speaker_name": "Büşra Kiraz", "session_type": "session", "description": "", "order": 6},
            {"time_start": "14:05", "time_end": "14:40", "title": "e-İpat Platform Tanıtımı", "speaker_name": "Muhammet Özdemir", "session_type": "session", "description": "", "order": 7},
            {"time_start": "14:40", "time_end": "15:15", "title": "Soru - Cevap + 10 Milyon TL Değerlendirmeleri", "speaker_name": "Tüm Katılımcılar", "session_type": "panel", "description": "", "order": 8},
            {"time_start": "15:15", "time_end": "15:30", "title": "Plaket Takdimi ve Kapanış", "speaker_name": "Muhammet Özdemir", "session_type": "session", "description": "", "order": 9},
            {"time_start": "15:30", "time_end": "19:00", "title": "8. Gayrimenkul Proje Yatırım Fuarı - Stand Ziyaretleri", "speaker_name": "", "session_type": "networking", "description": "", "order": 10},
        ]
        for s in sessions:
            s["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.program.insert_many(sessions)
        logger.info("Program seeded")

    # Seed past events
    if await db.past_events.count_documents({}) == 0:
        await db.past_events.insert_many([
            {"title": "1. Fuar Semineri", "year": 2023, "venue": "Crowne Plaza Istanbul Asia",
             "description": "İlk Arsa Yatırım Zirvesi'nde 200'den fazla yatırımcı bir araya geldi. Arsa yatırımının temellerini ele alan bu zirve büyük ilgi gördü.",
             "image_url": "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/04eetgap_17e1e87f-b677-4054-92cc-c1972d6d0dd5.jpeg",
             "attendee_count": 200, "speakers_count": 5, "created_at": datetime.now(timezone.utc).isoformat()},
            {"title": "2. Fuar Semineri", "year": 2024, "venue": "Wyndham Grand Istanbul",
             "description": "İkinci zirve 400'ü aşkın katılımcıyla gerçekleşti. Bölgesel analizler ve hukuki konular detaylı olarak ele alındı.",
             "image_url": "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/z1u1rnwp_6bdf1e85-1707-4c85-80f4-e6574aab5a21.jpeg",
             "attendee_count": 400, "speakers_count": 8, "created_at": datetime.now(timezone.utc).isoformat()},
            {"title": "3. Fuar Semineri", "year": 2025, "venue": "Marriott Istanbul Asia",
             "description": "Üçüncü zirve 600'den fazla yatırımcının katılımıyla en büyük buluşmaya ev sahipliği yaptı. Dijital araçlar gündemin merkezindeydi.",
             "image_url": "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/8bgxo9f8_34e45b4c-4905-428c-8be7-bb3fc0c4ed87.jpeg",
             "attendee_count": 600, "speakers_count": 12, "created_at": datetime.now(timezone.utc).isoformat()},
        ])
        logger.info("Past events seeded")

    # Seed blog post
    if await db.blog_posts.count_documents({}) == 0:
        await db.blog_posts.insert_many([
            {
                "title": "2026 Yılında Arsa Yatırımı: Fırsatlar ve Riskler",
                "slug": "2026-arsa-yatirimi-firsatlar-riskler",
                "content": "Türkiye gayrimenkul piyasası 2026 yılında önemli bir dönüşüm geçirmektedir. Faiz oranlarındaki değişimler, kentsel dönüşüm projeleri ve altyapı yatırımları arsa değerlerini doğrudan etkilemektedir.\n\nÖzellikle İstanbul çevresindeki bölgelerde imar planı değişikliklerinin yarattığı fırsatlar, yatırımcıların dikkatini çekmektedir. Ancak her yatırım fırsatı gibi, arsa yatırımında da dikkat edilmesi gereken önemli noktalar bulunmaktadır.\n\nDoğru konumda, doğru zamanda yapılan bir arsa yatırımı, uzun vadede yüksek getiri sağlayabilir. Bu değerlendirmeyi yapabilmek için imar durumu, tapu kaydı, altyapı olanakları ve bölgesel gelişim projelerinin detaylı analiz edilmesi gerekmektedir.\n\nArsa Yatırım Zirvesi 2026'da tüm bu konuları uzman konuşmacılarımızla detaylı şekilde ele alacağız.",
                "excerpt": "Türkiye'de 2026 arsa yatırımı fırsatları ve dikkat edilmesi gereken kritik noktalar.",
                "image_url": "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/z1u1rnwp_6bdf1e85-1707-4c85-80f4-e6574aab5a21.jpeg",
                "author": "Muhammet Özdemir",
                "tags": ["arsa", "yatırım", "2026", "gayrimenkul"],
                "is_published": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "title": "Arsa Tapusunu Doğru Okumak: Tarla mı, Arsa mı?",
                "slug": "arsa-tapusunu-dogru-okumak",
                "content": "Gayrimenkul yatırımlarında en kritik belgelerden biri tapu senetidir. Tapu üzerindeki bilgilerin doğru okunması, yatırım kararını büyük ölçüde etkiler.\n\nTarla ile arsa arasındaki temel fark nedir? Tarla, tarım arazisi olarak kayıtlı ve üzerine yapı inşa edilmesi kısıtlı olan taşınmazlardır. Arsa ise imar planı içinde kalan ve üzerine yapı yapılabilecek parselleri ifade eder.\n\nİmar durumu, tapunun üzerinde görülebilen ve hangi amaçlarla kullanılabileceğini belirleyen önemli bir bilgidir. Yatırım yapmadan önce ilgili belediyeden imar durumu belgesi alınması büyük önem taşır.\n\n21 Mayıs 2026 tarihinde gerçekleşecek Arsa Yatırım Zirvesi'nde Büşra Kiraz, bu konuları tüm detaylarıyla ele alacaktır.",
                "excerpt": "Tapu belgelerini doğru okumak ve tarla ile arsa arasındaki hukuki farkları anlamak.",
                "image_url": "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/04eetgap_17e1e87f-b677-4054-92cc-c1972d6d0dd5.jpeg",
                "author": "Büşra Kiraz",
                "tags": ["tapu", "arsa", "hukuk", "imar"],
                "is_published": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ])
        logger.info("Blog posts seeded")

    # Seed banner
    if await db.banners.count_documents({}) == 0:
        await db.banners.insert_one({
            "title": "Arsa Yatırım Zirvesi 2026",
            "subtitle": "21 Mayıs 2026 | Hilton İstanbul Bosphorus | Ücretsiz Katılım",
            "image_url": "",
            "cta_text": "Ücretsiz Kaydol",
            "cta_url": "/uyelik",
            "is_active": True,
            "order": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Banner seeded")

    # Seed hero slides (1 photo - real event)
    if await db.hero_slides.count_documents({}) == 0:
        slides = [
            {"image_url": "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/ukxr6ozq_IMG_4962.jpeg",
             "title": "Yenişehir Detaylı Sunum · FIRAT",
             "order": 0, "is_active": True,
             "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.hero_slides.insert_many(slides)
        logger.info("Hero slides seeded")

    # Seed site-wide settings (event date / countdown)
    if await db.site_settings.count_documents({"key": "main"}) == 0:
        await db.site_settings.insert_one({
            "key": "main",
            "event_datetime": "2026-05-21T09:00:00+03:00",
            "event_date_label": "21 Mayıs 2026",
            "event_time_label": "09:00 - 19:00",
            "event_location": "Hilton İstanbul Bosphorus",
            "speakers_count": 4,
            "sessions_count": 12,
            "attendees_count": "600+",
            "countdown_title": "Zirveye Kalan Süre",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Site settings seeded")

    # Seed fair settings
    if await db.fair_settings.count_documents({"key": "main"}) == 0:
        await db.fair_settings.insert_one({
            "key": "main",
            "fair_name": "8. Gayrimenkul Proje Yatırım Fuarı",
            "subtitle": "Arsa Yatırım Zirvesi 2026 ile eş zamanlı · 20-21 Mayıs 2026",
            "dates": "20 - 21 Mayıs 2026",
            "location": "Hilton İstanbul Bosphorus — Connie I, II, A, B, C Salonları",
            "hall_name": "Connie I-II + Connie A-B-C",
            "description": "Zirvenin hemen ardından aynı mekânda açılan fuar alanında Türkiye'nin önde gelen gayrimenkul geliştiricileri, proje maketleriyle birlikte yatırımcılarla buluşuyor. Sektör profesyonelleriyle birebir görüşme, proje dosyası inceleme ve anında bağlantı kurma fırsatı.",
            "total_stands": 36,
            "total_size_range": "9 m² – 27 m² arası",
            "floor_plan_url": "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/h5uc5kn7_Stant%20Plan%C4%B1.pdf",
            "floor_plan_image_url": "",
            "gallery": [
                "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/yl13dea2_sinpa%C5%9F.png",
                "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/y8rcv4pi_WhatsApp%20Image%202026-02-09%20at%2012.10.13%20%284%29.jpeg",
                "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/0l84i7t0_WhatsApp%20Image%202026-02-09%20at%2012.10.13.jpeg",
                "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/7sojex62_WhatsApp%20Image%202026-02-09%20at%2012.10.12%20%284%29.jpeg",
            ],
            "stand_types": [
                {"name": "Kompakt (9 m²)", "size": "3×3 m", "count": 8, "features": "Masa + 2 sandalye + banner alanı + priz + aydınlatma"},
                {"name": "Standart (12 m²)", "size": "3×4 m", "count": 15, "features": "Geniş teşhir alanı, vitrin, priz, profesyonel tabela"},
                {"name": "Premium (15 m²)", "size": "3×5 m", "count": 8, "features": "Maket sergi alanı, çoklu görüşme masası, güçlendirilmiş aydınlatma"},
                {"name": "Büyük Format (18-27 m²)", "size": "3×6 / 3×8 / 3×9 m", "count": 3, "features": "Ana blok konumu, çift yönlü görünür, özel tasarım imkanı"},
            ],
            "highlights": [
                "600+ nitelikli yatırımcı ziyareti beklentisi",
                "Zirve konuşmacılarıyla aynı mekân, yoğun geçiş trafiği",
                "Proje maketleri için ayrılmış geniş alanlar",
                "e-İPAT kayıt masası ve Yenişehir proje standı",
                "Catering ve ücretsiz otopark imkanı",
                "Basın ve sosyal medya tanıtım desteği",
            ],
            "cta_text": "Stant Başvurusu Yap",
            "cta_url": "/fuar-stant-kaydi",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Fair settings seeded")


    # Seed SEO settings
    if await db.seo_settings.count_documents({"key": "main"}) == 0:
        await db.seo_settings.insert_one({
            "key": "main",
            "site_name": "Arsa Yatırım Zirvesi",
            "site_url": "https://arsayatirimzirvesi.com",
            "title": "Arsa Yatırım Zirvesi 2026 | 21 Mayıs · Hilton İstanbul Bosphorus",
            "description": "Türkiye'nin en kapsamlı arsa yatırımı zirvesi. 21 Mayıs 2026, Hilton İstanbul Bosphorus. Uzman konuşmacılar, networking, ücretsiz katılım. Hemen kaydolun.",
            "keywords": "arsa yatırım zirvesi, arsa yatırımı, arsa yatırım 2026, gayrimenkul yatırımı, arazi yatırımı, istanbul arsa, arsa zirvesi, arsa yatırım fuarı, gayrimenkul zirvesi, hilton bosphorus zirve",
            "author": "FIRAT CONSTRUCTION YAPI A.Ş.",
            "og_title": "Arsa Yatırım Zirvesi 2026 — 21 Mayıs · Hilton İstanbul Bosphorus",
            "og_description": "Türkiye'nin en kapsamlı arsa yatırımı buluşması. Uzman konuşmacılar, sektör liderleri, fuar ve networking. Ücretsiz kayıt.",
            "og_image": "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/x4sqnjpl_muhammet%20%C3%B6zdemir.jpeg",
            "twitter_title": "Arsa Yatırım Zirvesi 2026",
            "twitter_description": "Türkiye'nin en kapsamlı arsa yatırımı zirvesi · 21 Mayıs 2026 · Hilton İstanbul Bosphorus",
            "twitter_image": "https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/x4sqnjpl_muhammet%20%C3%B6zdemir.jpeg",
            "twitter_card": "summary_large_image",
            "google_site_verification": "",
            "canonical_url": "https://arsayatirimzirvesi.com/",
            "robots": "index, follow",
            "favicon_url": "",
            "event_name": "Arsa Yatırım Zirvesi 2026",
            "event_start_date": "2026-05-21T09:00:00+03:00",
            "event_end_date": "2026-05-21T19:00:00+03:00",
            "event_location_name": "Hilton İstanbul Bosphorus",
            "event_location_address": "Cumhuriyet Cd. No:50, 34367 Şişli/İstanbul",
            "event_organizer": "FIRAT CONSTRUCTION YAPI A.Ş.",
            "event_organizer_url": "https://firatconstruction.com",
            "custom_head_html": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("SEO settings seeded")

    # Write test credentials
    creds_path = Path("/app/memory/test_credentials.md")
    creds_path.parent.mkdir(parents=True, exist_ok=True)
    creds_path.write_text(f"""# Test Credentials

## Admin Account
- Email: {admin_email}
- Password: {admin_pass}
- Role: admin
- Login URL: /admin/login

## API Endpoints
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/logout
- GET /api/speakers
- GET /api/program
- GET /api/events
- GET /api/blog
- POST /api/register/member
- POST /api/register/guest
- GET /api/badge/{{guest_id}}
- GET /api/admin/dashboard
- GET /api/admin/members
- GET /api/admin/guests
""")


@app.on_event("shutdown")
async def shutdown():
    db_client.close()
