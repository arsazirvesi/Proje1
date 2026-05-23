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


def init_content_router(db, get_admin_user):
    router = APIRouter(prefix="/api")

    # ==================== PUBLIC ====================
    
    @router.get("/speakers")
    async def get_speakers():
        docs = await db.speakers.find({}).sort("order", 1).to_list(50)
        return [clean_doc(d) for d in docs]
    
    @router.get("/sponsors")
    async def get_sponsors():
        docs = await db.sponsors.find({}).sort("order", 1).to_list(50)
        return [clean_doc(d) for d in docs]
    
    @router.get("/banners")
    async def get_banners(page: Optional[str] = None):
        """Public banner list. Filters by:
        - is_active = True
        - start_at <= now <= end_at (if dates set)
        - page in pages[] (if page filter given AND banner has pages restriction)
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        docs = await db.banners.find({"is_active": True}).sort("order", 1).to_list(50)
        result = []
        for d in docs:
            start = d.get("start_at")
            end = d.get("end_at")
            if start and now_iso < start:
                continue
            if end and now_iso > end:
                continue
            pages = d.get("pages") or []
            if page and pages and page not in pages:
                continue
            result.append(clean_doc(d))
        return result
    
    @router.get("/blog")
    async def get_blog_posts():
        docs = await db.blog_posts.find({"is_published": True}).sort("created_at", -1).to_list(50)
        return [clean_doc(d) for d in docs]
    
    @router.get("/blog/{slug}")
    async def get_blog_post(slug: str):
        doc = await db.blog_posts.find_one({"slug": slug, "is_published": True})
        if not doc:
            raise HTTPException(404, "Blog yazısı bulunamadı")
        return clean_doc(doc)
    
    @router.get("/events")
    async def get_events():
        docs = await db.past_events.find({}).sort("year", -1).to_list(20)
        return [clean_doc(d) for d in docs]
    
    @router.get("/events/{event_id}")
    async def get_event_detail(event_id: str):
        doc = await db.past_events.find_one({"_id": ObjectId(event_id)})
        if not doc:
            raise HTTPException(404, "Etkinlik bulunamadı")
        event = clean_doc(doc)
        year = event.get("year")
        # Attach gallery items for this year
        gallery = []
        async for g in db.gallery_items.find({"is_active": True, "year": year}, {"_id": 0}).sort("order", 1):
            gallery.append(g)
        event["gallery_items"] = gallery
        # Attach speakers for this year
        speakers = []
        async for s in db.speakers.find({}, {"_id": 0}).sort("order", 1):
            yrs = s.get("summit_years") or []
            if not yrs or year in yrs:
                speakers.append(s)
        event["speakers"] = speakers
        return event
    
    @router.get("/program")
    async def get_program():
        docs = await db.program.find({}).sort([("time_start", 1), ("order", 1)]).to_list(50)
        return [clean_doc(d) for d in docs]
    
    
    @router.get("/hero-slides")
    async def get_hero_slides():
        docs = await db.hero_slides.find({"is_active": True}).sort("order", 1).to_list(20)
        return [clean_doc(d) for d in docs]
    
    
    @router.get("/fair")
    async def get_fair_settings():
        doc = await db.fair_settings.find_one({"key": "main"})
        if not doc:
            return {}
        return clean_doc(doc)
    
    
    @router.get("/site-settings")
    async def get_site_settings():
        doc = await db.site_settings.find_one({"key": "main"})
        if not doc:
            return {}
        return clean_doc(doc)
    
    
    @router.get("/seo")
    async def get_seo_settings():
        doc = await db.seo_settings.find_one({"key": "main"})
        if not doc:
            return {}
        return clean_doc(doc)
    
    
    @router.get("/sponsor-packages")
    async def get_sponsor_packages():
        docs = await db.sponsor_packages.find({}, {"_id": 0}).sort("order", 1).to_list(20)
        return docs
    
    
    class SponsorPackageUpdate(BaseModel):
        price_label: Optional[str] = None
        sold_out: Optional[bool] = None
        label: Optional[str] = None
    
    
    # ==================== TR LOCATIONS (provinces & districts) ====================
    _TR_LOCATIONS_CACHE: Optional[dict] = None
    
    def _load_tr_locations() -> dict:
        global _TR_LOCATIONS_CACHE
        if _TR_LOCATIONS_CACHE is None:
            import json as _json
            path = Path(__file__).parent / "data" / "tr_locations.json"
            try:
                with path.open("r", encoding="utf-8") as f:
                    _TR_LOCATIONS_CACHE = _json.load(f)
            except Exception as e:
                logger.error(f"Failed to load TR locations dataset: {e}")
                _TR_LOCATIONS_CACHE = {}
        return _TR_LOCATIONS_CACHE
    
    
    @router.get("/locations")
    async def get_tr_locations():
        """Returns the full TR province → districts map. 81 provinces, ~973 districts (~12 KB)."""
        return _load_tr_locations()
    
    
    # ==================== ADMIN SPEAKERS ====================
    
    @router.get("/admin/speakers")
    async def admin_get_speakers(admin: dict = Depends(get_admin_user)):
        docs = await db.speakers.find({}).sort("order", 1).to_list(50)
        return [clean_doc(d) for d in docs]
    
    @router.post("/admin/speakers")
    async def admin_create_speaker(body: SpeakerCreate, admin: dict = Depends(get_admin_user)):
        doc = {**body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
        result = await db.speakers.insert_one(doc)
        doc["_id"] = result.inserted_id
        return clean_doc(doc)
    
    @router.put("/admin/speakers/{speaker_id}")
    async def admin_update_speaker(speaker_id: str, body: SpeakerCreate, admin: dict = Depends(get_admin_user)):
        update = {**body.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
        result = await db.speakers.update_one({"_id": ObjectId(speaker_id)}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(404, "Konuşmacı bulunamadı")
        doc = await db.speakers.find_one({"_id": ObjectId(speaker_id)})
        return clean_doc(doc)
    
    @router.delete("/admin/speakers/{speaker_id}")
    async def admin_delete_speaker(speaker_id: str, admin: dict = Depends(get_admin_user)):
        result = await db.speakers.delete_one({"_id": ObjectId(speaker_id)})
        if result.deleted_count == 0:
            raise HTTPException(404, "Konuşmacı bulunamadı")
        return {"message": "Konuşmacı silindi"}
    
    
    # ==================== ADMIN SPONSORS ====================
    
    @router.get("/admin/sponsors")
    async def admin_get_sponsors(admin: dict = Depends(get_admin_user)):
        docs = await db.sponsors.find({}).sort("order", 1).to_list(50)
        return [clean_doc(d) for d in docs]
    
    @router.post("/admin/sponsors")
    async def admin_create_sponsor(body: SponsorCreate, admin: dict = Depends(get_admin_user)):
        doc = {**body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
        result = await db.sponsors.insert_one(doc)
        doc["_id"] = result.inserted_id
        return clean_doc(doc)
    
    @router.put("/admin/sponsors/{sponsor_id}")
    async def admin_update_sponsor(sponsor_id: str, body: SponsorCreate, admin: dict = Depends(get_admin_user)):
        update = {**body.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
        result = await db.sponsors.update_one({"_id": ObjectId(sponsor_id)}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(404, "Sponsor bulunamadı")
        doc = await db.sponsors.find_one({"_id": ObjectId(sponsor_id)})
        return clean_doc(doc)
    
    @router.delete("/admin/sponsors/{sponsor_id}")
    async def admin_delete_sponsor(sponsor_id: str, admin: dict = Depends(get_admin_user)):
        result = await db.sponsors.delete_one({"_id": ObjectId(sponsor_id)})
        if result.deleted_count == 0:
            raise HTTPException(404, "Sponsor bulunamadı")
        return {"message": "Sponsor silindi"}
    
    
    # ==================== ADMIN SPONSOR PACKAGES (Tier Prices) ====================
    @router.get("/admin/sponsor-packages")
    async def admin_get_sponsor_packages(admin: dict = Depends(get_admin_user)):
        docs = await db.sponsor_packages.find({}, {"_id": 0}).sort("order", 1).to_list(20)
        return docs
    
    @router.put("/admin/sponsor-packages/{pkg_key}")
    async def admin_update_sponsor_package(pkg_key: str, body: SponsorPackageUpdate, admin: dict = Depends(get_admin_user)):
        update = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None or k == "sold_out"}
        if not update:
            raise HTTPException(400, "Güncellenecek alan yok")
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.sponsor_packages.update_one({"key": pkg_key}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(404, "Sponsor paketi bulunamadı")
        doc = await db.sponsor_packages.find_one({"key": pkg_key}, {"_id": 0})
        return doc
    
    
    # ==================== ADMIN BANNERS ====================
    
    @router.get("/admin/banners")
    async def admin_get_banners(admin: dict = Depends(get_admin_user)):
        docs = await db.banners.find({}).sort("order", 1).to_list(10)
        return [clean_doc(d) for d in docs]
    
    @router.post("/admin/banners")
    async def admin_create_banner(body: BannerCreate, admin: dict = Depends(get_admin_user)):
        doc = {**body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
        result = await db.banners.insert_one(doc)
        doc["_id"] = result.inserted_id
        return clean_doc(doc)
    
    @router.put("/admin/banners/{banner_id}")
    async def admin_update_banner(banner_id: str, body: BannerCreate, admin: dict = Depends(get_admin_user)):
        update = {**body.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
        result = await db.banners.update_one({"_id": ObjectId(banner_id)}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(404, "Banner bulunamadı")
        doc = await db.banners.find_one({"_id": ObjectId(banner_id)})
        return clean_doc(doc)
    
    @router.delete("/admin/banners/{banner_id}")
    async def admin_delete_banner(banner_id: str, admin: dict = Depends(get_admin_user)):
        result = await db.banners.delete_one({"_id": ObjectId(banner_id)})
        if result.deleted_count == 0:
            raise HTTPException(404, "Banner bulunamadı")
        return {"message": "Banner silindi"}
    
    
    # ==================== ADMIN BLOG ====================
    
    @router.get("/admin/blog")
    async def admin_get_blog(admin: dict = Depends(get_admin_user)):
        docs = await db.blog_posts.find({}).sort("created_at", -1).to_list(100)
        return [clean_doc(d) for d in docs]
    
    @router.post("/admin/blog")
    async def admin_create_blog(body: BlogPostCreate, admin: dict = Depends(get_admin_user)):
        existing = await db.blog_posts.find_one({"slug": body.slug})
        if existing:
            raise HTTPException(400, "Bu slug zaten kullanılıyor")
        doc = {**body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
        result = await db.blog_posts.insert_one(doc)
        doc["_id"] = result.inserted_id
        return clean_doc(doc)
    
    @router.put("/admin/blog/{post_id}")
    async def admin_update_blog(post_id: str, body: BlogPostCreate, admin: dict = Depends(get_admin_user)):
        update = {**body.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
        result = await db.blog_posts.update_one({"_id": ObjectId(post_id)}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(404, "Blog yazısı bulunamadı")
        doc = await db.blog_posts.find_one({"_id": ObjectId(post_id)})
        return clean_doc(doc)
    
    @router.delete("/admin/blog/{post_id}")
    async def admin_delete_blog(post_id: str, admin: dict = Depends(get_admin_user)):
        result = await db.blog_posts.delete_one({"_id": ObjectId(post_id)})
        if result.deleted_count == 0:
            raise HTTPException(404, "Blog yazısı bulunamadı")
        return {"message": "Blog yazısı silindi"}
    
    
    # ==================== ADMIN EVENTS ====================
    
    @router.get("/admin/events")
    async def admin_get_events(admin: dict = Depends(get_admin_user)):
        docs = await db.past_events.find({}).sort("year", -1).to_list(50)
        return [clean_doc(d) for d in docs]
    
    @router.post("/admin/events")
    async def admin_create_event(body: PastEventCreate, admin: dict = Depends(get_admin_user)):
        doc = {**body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
        result = await db.past_events.insert_one(doc)
        doc["_id"] = result.inserted_id
        return clean_doc(doc)
    
    @router.put("/admin/events/{event_id}")
    async def admin_update_event(event_id: str, body: PastEventCreate, admin: dict = Depends(get_admin_user)):
        update = {**body.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
        result = await db.past_events.update_one({"_id": ObjectId(event_id)}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(404, "Etkinlik bulunamadı")
        doc = await db.past_events.find_one({"_id": ObjectId(event_id)})
        return clean_doc(doc)
    
    @router.delete("/admin/events/{event_id}")
    async def admin_delete_event(event_id: str, admin: dict = Depends(get_admin_user)):
        result = await db.past_events.delete_one({"_id": ObjectId(event_id)})
        if result.deleted_count == 0:
            raise HTTPException(404, "Etkinlik bulunamadı")
        return {"message": "Etkinlik silindi"}
    
    
    @router.get("/admin/seo")
    async def admin_get_seo(admin: dict = Depends(get_admin_user)):
        doc = await db.seo_settings.find_one({"key": "main"})
        if not doc:
            return {}
        return clean_doc(doc)
    
    @router.put("/admin/seo")
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
    @router.get("/admin/hero-slides")
    async def admin_list_hero_slides(admin: dict = Depends(get_admin_user)):
        docs = await db.hero_slides.find({}).sort("order", 1).to_list(50)
        return [clean_doc(d) for d in docs]
    
    @router.post("/admin/hero-slides")
    async def admin_create_hero_slide(body: HeroSlideCreate, admin: dict = Depends(get_admin_user)):
        doc = {**body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
        result = await db.hero_slides.insert_one(doc)
        doc["_id"] = result.inserted_id
        return clean_doc(doc)
    
    @router.put("/admin/hero-slides/{slide_id}")
    async def admin_update_hero_slide(slide_id: str, body: HeroSlideCreate, admin: dict = Depends(get_admin_user)):
        update = {**body.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
        result = await db.hero_slides.update_one({"_id": ObjectId(slide_id)}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(404, "Slide bulunamadı")
        doc = await db.hero_slides.find_one({"_id": ObjectId(slide_id)})
        return clean_doc(doc)
    
    @router.delete("/admin/hero-slides/{slide_id}")
    async def admin_delete_hero_slide(slide_id: str, admin: dict = Depends(get_admin_user)):
        result = await db.hero_slides.delete_one({"_id": ObjectId(slide_id)})
        if result.deleted_count == 0:
            raise HTTPException(404, "Slide bulunamadı")
        return {"message": "Slide silindi"}
    
    
    # ===== Image upload =====
    ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
    
    @router.post("/admin/uploads/image")
    async def admin_upload_image(file: UploadFile = File(...), admin: dict = Depends(get_admin_user)):
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(400, f"Geçersiz dosya tipi: {file.content_type}. JPG, PNG, WEBP veya GIF kullanın.")
    
        # Read & size check
        content = await file.read()
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(400, f"Dosya boyutu maksimum {MAX_IMAGE_SIZE // 1024 // 1024} MB olabilir")
        if len(content) == 0:
            raise HTTPException(400, "Boş dosya")
    
        original_size = len(content)
        # Pillow optimization — resize to 1920px max + WebP for opaque, PNG kept for transparency
        content, optimized_ctype, ext = await asyncio.to_thread(optimize_image, content, file.content_type)
        logger.info("Upload optimized: %d B → %d B (%.0f%% saved)",
                    original_size, len(content),
                    (1 - len(content) / max(original_size, 1)) * 100)
    
        # Generate safe filename
        import uuid
        unique_name = f"{uuid.uuid4().hex}{ext}"
    
        # Try Cloudflare R2 first; fallback to local disk so dev keeps working.
        if r2_storage.is_configured():
            try:
                key = f"uploads/{unique_name}"
                public_url = await asyncio.to_thread(
                    r2_storage.upload_bytes, key, content, optimized_ctype
                )
                return {"url": public_url, "filename": unique_name, "size": len(content), "storage": "r2"}
            except Exception as e:
                logger.exception("R2 upload failed, falling back to local disk")
    
        # Local-disk fallback (legacy, will be wiped on container redeploy)
        file_path = UPLOADS_DIR / unique_name
        file_path.write_bytes(content)
        public_url = f"/api/uploads/{unique_name}"
        return {"url": public_url, "filename": unique_name, "size": len(content), "storage": "local"}
    
    
    
    # ===== Fair settings admin =====
    @router.get("/admin/fair")
    async def admin_get_fair(admin: dict = Depends(get_admin_user)):
        doc = await db.fair_settings.find_one({"key": "main"})
        if not doc:
            return {}
        return clean_doc(doc)
    
    @router.put("/admin/fair")
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
    @router.get("/admin/site-settings")
    async def admin_get_site_settings(admin: dict = Depends(get_admin_user)):
        doc = await db.site_settings.find_one({"key": "main"})
        if not doc:
            return {}
        return clean_doc(doc)
    
    
    @router.put("/admin/site-settings")
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
    
    @router.get("/admin/program")
    async def admin_get_program(admin: dict = Depends(get_admin_user)):
        docs = await db.program.find({}).sort([("time_start", 1), ("order", 1)]).to_list(50)
        return [clean_doc(d) for d in docs]
    
    @router.post("/admin/program")
    async def admin_create_session(body: ProgramSessionCreate, admin: dict = Depends(get_admin_user)):
        doc = {**body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
        result = await db.program.insert_one(doc)
        doc["_id"] = result.inserted_id
        return clean_doc(doc)
    
    @router.put("/admin/program/{session_id}")
    async def admin_update_session(session_id: str, body: ProgramSessionCreate, admin: dict = Depends(get_admin_user)):
        update = {**body.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
        result = await db.program.update_one({"_id": ObjectId(session_id)}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(404, "Oturum bulunamadı")
        doc = await db.program.find_one({"_id": ObjectId(session_id)})
        return clean_doc(doc)
    
    @router.delete("/admin/program/{session_id}")
    async def admin_delete_session(session_id: str, admin: dict = Depends(get_admin_user)):
        result = await db.program.delete_one({"_id": ObjectId(session_id)})
        if result.deleted_count == 0:
            raise HTTPException(404, "Oturum bulunamadı")
        return {"message": "Oturum silindi"}
    
    
    

    return router
