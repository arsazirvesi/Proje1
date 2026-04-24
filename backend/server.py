from dotenv import load_dotenv
load_dotenv()

import os
import bcrypt
import jwt
import qrcode
import io
import base64
import logging
import html as html_escape
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any, Annotated
from pathlib import Path

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, BeforeValidator
from bson import ObjectId
import sendgrid
from sendgrid.helpers.mail import Mail as SGMail

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


# --- Email Helper ---
def send_email(to: str, subject: str, html: str) -> bool:
    api_key = os.environ.get("SENDGRID_API_KEY", "")
    sender = os.environ.get("SENDER_EMAIL", "noreply@arsayatirimzirvesi.com")
    if not api_key:
        logger.warning("SendGrid API key not configured - email not sent")
        return False
    try:
        sg = sendgrid.SendGridAPIClient(api_key=api_key)
        msg = SGMail(from_email=sender, to_emails=to, subject=subject, html_content=html)
        resp = sg.send(msg)
        return resp.status_code in [200, 202]
    except Exception as e:
        logger.error(f"Email error: {e}")
        return False


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


@api_router.post("/register/guest")
async def register_guest(body: GuestCreate, background_tasks: BackgroundTasks):
    existing = await db.guests.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(400, "Bu email ile zaten kayıt yapılmış")
    doc = {
        **body.model_dump(),
        "email": body.email.lower(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "badge_printed": False,
        "status": "new",
        "admin_notes": "",
    }
    result = await db.guests.insert_one(doc)
    guest_id = str(result.inserted_id)
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#1F2937;padding:40px;border-radius:8px;border:1px solid #E5E7EB">
      <div style="border-top:3px solid #22316a;padding-top:24px">
      <h1 style="color:#22316a;font-size:22px;margin-bottom:16px">Arsa Yatırım Zirvesi 2026</h1>
      <p>Sayın <strong>{body.name}</strong>,</p>
      <p style="margin-top:12px">Zirve ziyaretçi kaydınız başarıyla alınmıştır. Sizi aramızda görmekten mutluluk duyacağız.</p>
      <div style="background:#F8F9FB;border-radius:6px;padding:16px;margin:20px 0;border-left:4px solid #22316a">
        <p style="color:#22316a;margin:4px 0"><strong>Tarih:</strong> 21 Mayıs 2026, Perşembe</p>
        <p style="color:#22316a;margin:4px 0"><strong>Yer:</strong> Hilton İstanbul Bosphorus - Zirve Salonu</p>
        <p style="color:#22316a;margin:4px 0"><strong>Adres:</strong> Harbiye, Cumhuriyet Cd. No:50, 34367 Şişli/İstanbul</p>
      </div>
      <p>Yaka kartınız etkinlik günü kayıt masasında teslim edilecektir.</p>
      <p style="color:#9CA3AF;font-size:12px;margin-top:24px">© 2026 Arsa Yatırım Zirvesi</p>
      </div>
    </div>"""
    background_tasks.add_task(send_email, body.email.lower(), "Arsa Yatırım Zirvesi 2026 - Ziyaretçi Kayıt Onayı", html)
    return {"id": guest_id, "message": "Ziyaretçi kaydınız alınmıştır", "badge_url": f"/api/badge/{guest_id}"}


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
        <p style="color:#22316a;margin:4px 0"><strong>Tarih:</strong> 21 Mayıs 2026, Perşembe</p>
        <p style="color:#22316a;margin:4px 0"><strong>Yer:</strong> Hilton İstanbul Bosphorus - Zirve Salonu</p>
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

    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(f"AYZ2026-{guest_id}")
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0A1128", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    name = html_escape.escape(guest.get("name") or "")
    company = html_escape.escape(guest.get("company") or "")
    title_val = html_escape.escape(guest.get("title") or "")
    initials = "".join([w[0].upper() for w in guest.get("name", "").split()[:2]]) if guest.get("name") else "K"

    html = f"""<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><title>Yaka Kartı - {name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Outfit:wght@400;600&display=swap" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Outfit',sans-serif;background:#f5f5f5;display:flex;justify-content:center;align-items:center;min-height:100vh;flex-direction:column;gap:20px}}
.badge{{width:340px;height:500px;background:linear-gradient(135deg,#0A1128 0%,#14213D 100%);border-radius:16px;padding:28px 24px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;box-shadow:0 20px 60px rgba(0,0,0,0.4);border:2px solid rgba(212,175,55,0.4);position:relative;overflow:hidden}}
.badge::before{{content:'';position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#D4AF37,#FDB813,#D4AF37)}}
.badge::after{{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#D4AF37,#FDB813,#D4AF37)}}
.event-header{{text-align:center}}
.event-name{{font-family:'Playfair Display',serif;color:#D4AF37;font-size:13px;letter-spacing:2px;text-transform:uppercase}}
.event-date{{color:rgba(255,255,255,0.55);font-size:11px;margin-top:4px}}
.avatar{{width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#D4AF37,#FDB813);display:flex;align-items:center;justify-content:center;font-size:28px;font-family:'Playfair Display',serif;color:#0A1128;font-weight:700;border:3px solid rgba(212,175,55,0.5);margin-bottom:12px}}
.person-info{{text-align:center}}
.person-name{{font-family:'Playfair Display',serif;color:#fff;font-size:20px;font-weight:700}}
.person-title{{color:#D4AF37;font-size:12px;margin-top:5px;letter-spacing:0.5px}}
.person-company{{color:rgba(255,255,255,0.55);font-size:12px;margin-top:3px}}
.qr-wrap{{background:white;border-radius:8px;padding:8px}}
.badge-id{{color:rgba(255,255,255,0.35);font-size:10px;letter-spacing:1px}}
.print-btn{{background:#D4AF37;color:#0A1128;border:none;padding:12px 32px;border-radius:8px;cursor:pointer;font-family:'Outfit',sans-serif;font-weight:600;font-size:14px;transition:all 0.2s}}
.print-btn:hover{{background:#FDB813;transform:translateY(-1px)}}
@media print{{body{{background:white}}.print-btn{{display:none}}}}
</style></head>
<body>
<button class="print-btn" onclick="window.print()">Yaka Kartını Yazdır</button>
<div class="badge">
  <div class="event-header">
    <div class="event-name">ARSA YATIRIM ZİRVESİ 2026</div>
    <div class="event-date">21 Mayıs 2026 | Hilton İstanbul Bosphorus</div>
  </div>
  <div style="display:flex;flex-direction:column;align-items:center">
    <div class="avatar">{initials}</div>
    <div class="person-info">
      <div class="person-name">{name}</div>
      <div class="person-title">{title_val}</div>
      <div class="person-company">{company}</div>
    </div>
  </div>
  <div class="qr-wrap"><img src="data:image/png;base64,{qr_b64}" width="80" height="80" alt="QR Kod"></div>
  <div class="badge-id">AYZ2026-{guest_id[-8:].upper()}</div>
</div>
</body></html>"""
    return HTMLResponse(html)


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
async def admin_get_guests(status: Optional[str] = None, q: Optional[str] = None, admin: dict = Depends(get_admin_user)):
    query: dict = {}
    if status and status != "all":
        query["status"] = status
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"company": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.guests.find(query).sort("created_at", -1).to_list(5000)
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

    # Seed admin
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
    elif not verify_password(admin_pass, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pass)}})

    # Seed speakers
    if await db.speakers.count_documents({}) == 0:
        speakers = [
            {"name": "Muhammet Özdemir", "title": "Zirve Sahibi & Gayrimenkul Yatırım Uzmanı",
             "bio": "Türkiye'nin önde gelen gayrimenkul yatırım uzmanlarından olan Muhammet Özdemir, 15 yılı aşkın deneyimiyle arsa yatırımı konusunda binlerce yatırımcıya rehberlik etmiştir. Arsa Yatırım Zirvesi'nin kurucusu ve organizatörü olarak yatırımcılara kapsamlı eğitimler vermektedir.",
             "image_url": "https://images.pexels.com/photos/8761319/pexels-photo-8761319.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
             "order": 0, "is_featured": True, "social_linkedin": "", "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Büşra Kiraz", "title": "Gayrimenkul Hukuku Uzmanı",
             "bio": "Gayrimenkul hukuku alanında uzmanlaşmış avukat Büşra Kiraz, arsa tapusu yorumlama, imar durumu değerlendirmesi ve tapu işlemleri konularında binlerce danışmanlık hizmeti vermiştir.",
             "image_url": "https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
             "order": 1, "is_featured": False, "social_linkedin": "", "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Murat Gültekin", "title": "Bölgesel Gayrimenkul Danışmanı",
             "bio": "Yenişehir ve çevre bölgelerinde uzmanlaşmış danışman Murat Gültekin, e-İpat platformunun tanıtımcısı olarak dijital gayrimenkul işlemlerinde öncü bir rol üstlenmektedir.",
             "image_url": "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
             "order": 2, "is_featured": False, "social_linkedin": "", "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Oğuzhan Öztürk", "title": "Yatırım Danışmanı & Psikolog",
             "bio": "Gayrimenkul yatırım psikolojisi alanında çalışmalarıyla tanınan Oğuzhan Öztürk, yatırımcıların doğru kararlar almasını engelleyen faktörleri analiz ederek etkili stratejiler geliştirmektedir.",
             "image_url": "https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
             "order": 3, "is_featured": False, "social_linkedin": "", "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.speakers.insert_many(speakers)
        logger.info("Speakers seeded")

    # Seed sponsors
    if await db.sponsors.count_documents({}) == 0:
        await db.sponsors.insert_many([
            {"name": "FIRAT CONSTRUCTION YAPI A.Ş.", "logo_url": "", "website_url": "", "tier": "main", "order": 0, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "JNR Fuarcılık", "logo_url": "", "website_url": "", "tier": "organization", "order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
        ])
        logger.info("Sponsors seeded")

    # Seed program
    if await db.program.count_documents({}) == 0:
        sessions = [
            {"time_start": "09:00", "time_end": "09:30", "title": "Kayıt ve Ağırlama", "speaker_name": None, "session_type": "networking", "description": "Katılımcı kaydı ve kahvaltı ikramı", "order": 0},
            {"time_start": "09:30", "time_end": "09:45", "title": "Açılış Konuşması", "speaker_name": "Muhammet Özdemir", "session_type": "talk", "description": "Zirve sahibi Muhammet Özdemir'in açılış konuşması", "order": 1},
            {"time_start": "09:45", "time_end": "10:15", "title": "2026'da Arsa mı? Daire mi? Altın mı? Döviz mi?", "speaker_name": "Muhammet Özdemir", "session_type": "talk", "description": "Farklı yatırım araçlarının karşılaştırmalı analizi ve 2026 için en karlı yatırım seçenekleri", "order": 2},
            {"time_start": "10:15", "time_end": "10:45", "title": "Arsa Tapusu Nasıl Yorumlanır? Tarla mı, Arsa mı?", "speaker_name": "Büşra Kiraz", "session_type": "talk", "description": "Tapu belgeleri üzerindeki kritik bilgiler ve hukuki farklar", "order": 3},
            {"time_start": "10:45", "time_end": "11:15", "title": "Yenişehir Bölge Sunumu", "speaker_name": "Murat Gültekin", "session_type": "talk", "description": "Yenişehir ve çevre bölgelerinin yatırım potansiyeli ve gelişim projeleri", "order": 4},
            {"time_start": "11:15", "time_end": "11:45", "title": "İmar Durumu Nasıl Değerlendirilir?", "speaker_name": "Büşra Kiraz", "session_type": "talk", "description": "İmar planları, yapılaşma koşulları ve yatırım kararında imar durumunun rolü", "order": 5},
            {"time_start": "11:45", "time_end": "12:15", "title": "Gayrimenkul Yatırım Psikolojisi", "speaker_name": "Oğuzhan Öztürk", "session_type": "talk", "description": "Yatırım kararlarını etkileyen psikolojik faktörler ve başarılı yatırımcı psikolojisi", "order": 6},
            {"time_start": "12:15", "time_end": "13:15", "title": "Öğle Yemeği & Networking", "speaker_name": None, "session_type": "break", "description": "Öğle yemeği arası ve networking fırsatı", "order": 7},
            {"time_start": "13:15", "time_end": "13:45", "title": "Atasözleri ve Hadisler Işığında Arsa Yatırımı", "speaker_name": "Muhammet Özdemir", "session_type": "talk", "description": "Kültürel ve dini perspektiften arsa yatırımının önemi", "order": 8},
            {"time_start": "13:45", "time_end": "14:40", "title": "e-İpat Platform Tanıtımı", "speaker_name": "Murat Gültekin", "session_type": "talk", "description": "Dijital gayrimenkul işlem platformu e-İpat'ın özellikleri ve kullanım avantajları", "order": 9},
            {"time_start": "14:40", "time_end": "15:15", "title": "Panel: 10 Milyon TL'm Olsa Nereye Yatırım Yapardım?", "speaker_name": "Tüm Konuşmacılar", "session_type": "panel", "description": "Soru-Cevap + Konuşmacıların 10 milyon TL'lik yatırım değerlendirmeleri", "order": 10},
            {"time_start": "15:15", "time_end": "15:30", "title": "Kapanış Töreni", "speaker_name": "Muhammet Özdemir", "session_type": "talk", "description": "Zirvenin kapanış konuşması", "order": 11},
        ]
        for s in sessions:
            s["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.program.insert_many(sessions)
        logger.info("Program seeded")

    # Seed past events
    if await db.past_events.count_documents({}) == 0:
        await db.past_events.insert_many([
            {"title": "1. Arsa Yatırım Zirvesi", "year": 2023, "venue": "Crowne Plaza Istanbul Asia",
             "description": "İlk Arsa Yatırım Zirvesi'nde 200'den fazla yatırımcı bir araya geldi. Arsa yatırımının temellerini ele alan bu zirve büyük ilgi gördü.",
             "image_url": "https://images.pexels.com/photos/26202153/pexels-photo-26202153.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
             "attendee_count": 200, "speakers_count": 5, "created_at": datetime.now(timezone.utc).isoformat()},
            {"title": "2. Arsa Yatırım Zirvesi", "year": 2024, "venue": "Wyndham Grand Istanbul",
             "description": "İkinci zirve 400'ü aşkın katılımcıyla gerçekleşti. Bölgesel analizler ve hukuki konular detaylı olarak ele alındı.",
             "image_url": "https://images.pexels.com/photos/3167175/pexels-photo-3167175.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
             "attendee_count": 400, "speakers_count": 8, "created_at": datetime.now(timezone.utc).isoformat()},
            {"title": "3. Arsa Yatırım Zirvesi", "year": 2025, "venue": "Marriott Istanbul Asia",
             "description": "Üçüncü zirve 600'den fazla yatırımcının katılımıyla en büyük buluşmaya ev sahipliği yaptı. Dijital araçlar gündemin merkezindeydi.",
             "image_url": "https://images.pexels.com/photos/30584407/pexels-photo-30584407.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
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
                "image_url": "https://images.pexels.com/photos/3167175/pexels-photo-3167175.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
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
                "image_url": "https://images.pexels.com/photos/26202153/pexels-photo-26202153.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
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
