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


def init_gallery_router(db, get_admin_user):
    router = APIRouter(prefix="/api")

    # ===== GALLERY =====
    
    def extract_youtube_id(url: str):
        patterns = [
            r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})"
        ]
        for pat in patterns:
            m = re.search(pat, url or "")
            if m:
                return m.group(1)
        return None
    
    class GalleryItemIn(BaseModel):
        title: str = ""
        description: str = ""
        type: str  # image | video | youtube
        media_url: Optional[str] = None
        youtube_url: Optional[str] = None
        thumbnail_url: Optional[str] = None
        year: Optional[int] = None
        tags: List[str] = []
        order: int = 0
        is_active: bool = True
    
    def _enrich_gallery(doc: dict) -> dict:
        if doc.get("type") == "youtube" and doc.get("youtube_url"):
            yt_id = extract_youtube_id(doc["youtube_url"])
            if yt_id:
                doc.setdefault("youtube_id", yt_id)
                doc.setdefault("thumbnail_url", f"https://img.youtube.com/vi/{yt_id}/hqdefault.jpg")
        return doc
    
    @router.get("/gallery")
    async def get_gallery_public():
        items = []
        async for doc in db.gallery_items.find({"is_active": True}, {"_id": 0}).sort("order", 1):
            items.append(_enrich_gallery(doc))
        return items
    
    @router.get("/admin/gallery")
    async def admin_get_gallery(admin: dict = Depends(get_admin_user)):
        items = []
        async for doc in db.gallery_items.find({}, {"_id": 0}).sort([("order", 1), ("created_at", -1)]):
            items.append(_enrich_gallery(doc))
        return items
    
    @router.post("/admin/gallery")
    async def admin_create_gallery_item(body: GalleryItemIn, admin: dict = Depends(get_admin_user)):
        import uuid as _uuid
        doc = body.model_dump()
        doc["id"] = _uuid.uuid4().hex
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        _enrich_gallery(doc)
        await db.gallery_items.insert_one({**doc})
        return doc
    
    @router.put("/admin/gallery/{item_id}")
    async def admin_update_gallery_item(item_id: str, body: GalleryItemIn, admin: dict = Depends(get_admin_user)):
        doc = body.model_dump()
        doc["updated_at"] = datetime.now(timezone.utc).isoformat()
        _enrich_gallery(doc)
        await db.gallery_items.update_one({"id": item_id}, {"$set": doc})
        updated = await db.gallery_items.find_one({"id": item_id}, {"_id": 0})
        return updated or doc
    
    @router.delete("/admin/gallery/{item_id}")
    async def admin_delete_gallery_item(item_id: str, admin: dict = Depends(get_admin_user)):
        await db.gallery_items.delete_one({"id": item_id})
        return {"ok": True}
    
    # ===== Video upload =====
    ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo", "video/mpeg", "video/x-matroska"}
    MAX_VIDEO_SIZE = 300 * 1024 * 1024  # 300 MB
    
    @router.post("/admin/uploads/video")
    async def admin_upload_video(file: UploadFile = File(...), admin: dict = Depends(get_admin_user)):
        ct = file.content_type or ""
        if ct not in ALLOWED_VIDEO_TYPES and not ct.startswith("video/"):
            raise HTTPException(400, "Geçersiz video formatı. MP4, WEBM veya MOV kullanın.")
        content = await file.read()
        if len(content) > MAX_VIDEO_SIZE:
            raise HTTPException(400, f"Video en fazla {MAX_VIDEO_SIZE // 1024 // 1024} MB olabilir.")
        if len(content) == 0:
            raise HTTPException(400, "Boş dosya.")
        import uuid as _uuid
        ext_map = {"video/mp4": ".mp4", "video/webm": ".webm", "video/ogg": ".ogv",
                   "video/quicktime": ".mov", "video/x-msvideo": ".avi", "video/mpeg": ".mpg", "video/x-matroska": ".mkv"}
        ext = ext_map.get(ct, ".mp4")
        unique_name = f"video_{_uuid.uuid4().hex}{ext}"
        if r2_storage.is_configured():
            try:
                key = f"uploads/videos/{unique_name}"
                public_url = await asyncio.to_thread(r2_storage.upload_bytes, key, content, ct)
                return {"url": public_url, "filename": unique_name, "size": len(content), "storage": "r2"}
            except Exception:
                logger.exception("R2 video upload failed, falling back to local disk")
        file_path = UPLOADS_DIR / unique_name
        file_path.write_bytes(content)
        return {"url": f"/api/uploads/{unique_name}", "filename": unique_name, "size": len(content), "storage": "local"}
    
    

    return router
