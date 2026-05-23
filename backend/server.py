from dotenv import load_dotenv
load_dotenv()

import os
import asyncio
import bcrypt
import jwt
import qrcode
import io
import base64
import secrets
import logging
import html as html_escape
import re
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
import r2_storage
from image_optimizer import optimize_image

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

mongo_url = os.environ["MONGO_URL"]
db_client = AsyncIOMotorClient(mongo_url)
db = db_client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ.get("JWT_SECRET", "arsa-yatirim-2026-secret")
JWT_ALGORITHM = "HS256"

app = FastAPI(title="Arsa Yatırım Zirvesi 2026 API")
api_router = APIRouter(prefix="/api")



# ─── Shared models, utilities, services ────────────────────────
from models import *  # noqa
from utils import clean_doc
from email_service import send_email, render_register_confirmation_email

# ─── Route modules ──────────────────────────────────────────────
from routes.content import init_content_router
from routes.gallery_routes import init_gallery_router
from routes.registration import init_registration_router
from routes.badge import init_badge_router
from routes.admin_ops import init_admin_ops_router
from routes.crm import init_crm_router
from routes.visitego_routes import init_visitego_router
from routes.investment import init_investment_router

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


async def get_expert_or_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Expert role can view investment game entries (without phone/email) and comment."""
    if current_user.get("role") not in ("admin", "expert"):
        raise HTTPException(403, "Uzman veya admin yetkisi gerekli")
    return current_user

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



# ==================== APP SETUP ====================

app.include_router(api_router)

# ─── Domain routers (extracted from server.py) ──────────────────
app.include_router(init_content_router(db, get_admin_user))
app.include_router(init_gallery_router(db, get_admin_user))
app.include_router(init_registration_router(db, get_admin_user))
app.include_router(init_badge_router(db, get_admin_user))
app.include_router(init_admin_ops_router(db, get_admin_user, get_current_user))
app.include_router(init_crm_router(db, get_admin_user))
app.include_router(init_visitego_router(db, get_admin_user))
app.include_router(init_investment_router(db, get_admin_user, get_expert_or_admin_user))

# Academy router (categories + courses)
from academy_routes import init_router as init_academy_router  # noqa: E402
app.include_router(init_academy_router(db, get_admin_user))

# Seminar page settings (admin-editable SEO + hero content)
from seminar_settings import init_router as init_seminar_settings_router  # noqa: E402
app.include_router(init_seminar_settings_router(db, get_admin_user))

# Newsletter (bülten)
from newsletter_routes import init_router as init_newsletter_router  # noqa: E402
app.include_router(init_newsletter_router(db, get_admin_user))

# Zirve Ailesi page settings
from family_settings import init_router as init_family_router  # noqa: E402
app.include_router(init_family_router(db, get_admin_user))


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

    # === Recovery admin — always upserted with a fixed password on every startup ===
    # Use this to regain access if the primary admin password is lost. After logging in,
    # go to "Admin Hesapları" page to change this password or delete this user.
    RECOVERY_EMAIL = "recovery@arsayatirim.com"
    RECOVERY_PASS = "Recovery2026!"
    await db.users.update_one(
        {"email": RECOVERY_EMAIL},
        {
            "$set": {
                "email": RECOVERY_EMAIL,
                "password_hash": hash_password(RECOVERY_PASS),
                "name": "Recovery Admin",
                "role": "admin",
            },
            "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()},
        },
        upsert=True,
    )
    logger.info(f"Recovery admin ensured: {RECOVERY_EMAIL}")

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
            "event_time_label": "11:30 - 15:50",
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
            "event_start_date": "2026-05-21T11:30:00+03:00",
            "event_end_date": "2026-05-21T15:50:00+03:00",
            "event_location_name": "Hilton İstanbul Bosphorus",
            "event_location_address": "Cumhuriyet Cd. No:50, 34367 Şişli/İstanbul",
            "event_organizer": "FIRAT CONSTRUCTION YAPI A.Ş.",
            "event_organizer_url": "https://firatconstruction.com",
            "custom_head_html": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("SEO settings seeded")

    # Seed sponsor packages
    if await db.sponsor_packages.count_documents({}) == 0:
        await db.sponsor_packages.insert_many([
            {"key": "ana", "label": "Ana Sponsor", "order": 1,
             "price_label": "Talep Üzerine", "sold_out": True,
             "updated_at": datetime.now(timezone.utc).isoformat()},
            {"key": "altin", "label": "Altın Sponsor", "order": 2,
             "price_label": "Talep Üzerine", "sold_out": False,
             "updated_at": datetime.now(timezone.utc).isoformat()},
            {"key": "gumus", "label": "Gümüş Sponsor", "order": 3,
             "price_label": "Talep Üzerine", "sold_out": False,
             "updated_at": datetime.now(timezone.utc).isoformat()},
            {"key": "bronz", "label": "Bronz Sponsor", "order": 4,
             "price_label": "Talep Üzerine", "sold_out": False,
             "updated_at": datetime.now(timezone.utc).isoformat()},
        ])
        logger.info("Sponsor packages seeded")

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
