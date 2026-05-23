"""
Arsa Yatırım Akademisi — Categories + Courses CRUD.

Public endpoints (no auth):
  GET  /api/academy/categories
  GET  /api/academy/courses
  GET  /api/academy/courses/{slug}

Admin endpoints (require admin auth from server.get_admin_user):
  POST/PATCH/DELETE /api/admin/academy/categories[/{id}]
  POST/PATCH/DELETE /api/admin/academy/courses[/{id}]
"""
import re
import unicodedata
from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api")

_TR_MAP = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")


def slugify(text: str) -> str:
    if not text:
        return ""
    text = text.translate(_TR_MAP)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")


# ============================================================
# Models
# ============================================================
class CategoryIn(BaseModel):
    name: str
    description: Optional[str] = ""
    icon: Optional[str] = "GraduationCap"  # lucide-react icon name
    image_url: Optional[str] = ""
    order: int = 0
    is_active: bool = True


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    image_url: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class CourseIn(BaseModel):
    category_id: str
    title: str
    description: Optional[str] = ""
    cover_image_url: Optional[str] = ""
    format: str = "hybrid"  # online | onsite | hybrid
    is_free: bool = True
    price_try: float = 0.0
    duration_hours: Optional[float] = None
    instructor_names: List[str] = Field(default_factory=list)
    speakers: List[dict] = Field(default_factory=list)  # [{name, title, image_url, bio, is_moderator}]
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = ""
    venue: Optional[str] = ""
    capacity: Optional[int] = None
    seo_title: Optional[str] = ""
    seo_description: Optional[str] = ""
    seo_keywords: Optional[str] = ""
    is_published: bool = True
    order: int = 0


class CourseUpdate(BaseModel):
    category_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    format: Optional[str] = None
    is_free: Optional[bool] = None
    price_try: Optional[float] = None
    duration_hours: Optional[float] = None
    instructor_names: Optional[List[str]] = None
    speakers: Optional[List[dict]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    venue: Optional[str] = None
    capacity: Optional[int] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    is_published: Optional[bool] = None
    order: Optional[int] = None


# ============================================================
# Serializers (drop _id, keep id as string)
# ============================================================
def _serialize(doc: dict) -> dict:
    if not doc:
        return doc
    out = {k: v for k, v in doc.items() if k != "_id"}
    out["id"] = str(doc["_id"])
    for k in ("created_at", "updated_at"):
        v = out.get(k)
        if isinstance(v, datetime):
            out[k] = v.isoformat()
    return out


# ============================================================
# Factory: wires the router with DB + auth dep
# ============================================================
def init_router(db, get_admin_user_dep):
    cats_coll = db.academy_categories
    courses_coll = db.academy_courses

    # ---------- Public ----------
    @router.get("/academy/categories")
    async def public_list_categories():
        cursor = cats_coll.find({"is_active": True}).sort([("order", 1), ("created_at", 1)])
        return [_serialize(d) async for d in cursor]

    @router.get("/academy/courses")
    async def public_list_courses(category_id: Optional[str] = None):
        query = {"is_published": True}
        if category_id:
            query["category_id"] = category_id
        cursor = courses_coll.find(query).sort([("order", 1), ("created_at", -1)])
        return [_serialize(d) async for d in cursor]

    @router.get("/academy/courses/{slug}")
    async def public_get_course(slug: str):
        doc = await courses_coll.find_one({"slug": slug, "is_published": True})
        if not doc:
            raise HTTPException(404, "Eğitim bulunamadı")
        return _serialize(doc)

    # ---------- Admin Categories ----------
    @router.get("/admin/academy/categories")
    async def admin_list_categories(_admin: dict = Depends(get_admin_user_dep)):
        cursor = cats_coll.find({}).sort([("order", 1), ("created_at", 1)])
        return [_serialize(d) async for d in cursor]

    @router.post("/admin/academy/categories")
    async def admin_create_category(body: CategoryIn, _admin: dict = Depends(get_admin_user_dep)):
        slug = slugify(body.name)
        if not slug:
            raise HTTPException(400, "Geçersiz isim")
        if await cats_coll.find_one({"slug": slug}):
            raise HTTPException(400, "Bu kategori zaten mevcut")
        now = datetime.now(timezone.utc)
        doc = body.model_dump()
        doc.update({"slug": slug, "created_at": now, "updated_at": now})
        res = await cats_coll.insert_one(doc)
        created = await cats_coll.find_one({"_id": res.inserted_id})
        return _serialize(created)

    @router.patch("/admin/academy/categories/{cat_id}")
    async def admin_update_category(cat_id: str, body: CategoryUpdate, _admin: dict = Depends(get_admin_user_dep)):
        if not ObjectId.is_valid(cat_id):
            raise HTTPException(400, "Geçersiz ID")
        update = {k: v for k, v in body.model_dump().items() if v is not None}
        if "name" in update:
            update["slug"] = slugify(update["name"])
        update["updated_at"] = datetime.now(timezone.utc)
        await cats_coll.update_one({"_id": ObjectId(cat_id)}, {"$set": update})
        doc = await cats_coll.find_one({"_id": ObjectId(cat_id)})
        if not doc:
            raise HTTPException(404, "Kategori bulunamadı")
        return _serialize(doc)

    @router.delete("/admin/academy/categories/{cat_id}")
    async def admin_delete_category(cat_id: str, _admin: dict = Depends(get_admin_user_dep)):
        if not ObjectId.is_valid(cat_id):
            raise HTTPException(400, "Geçersiz ID")
        count = await courses_coll.count_documents({"category_id": cat_id})
        if count > 0:
            raise HTTPException(400, f"Bu kategoride {count} eğitim var. Önce eğitimleri silin veya başka kategoriye taşıyın.")
        res = await cats_coll.delete_one({"_id": ObjectId(cat_id)})
        if res.deleted_count == 0:
            raise HTTPException(404, "Kategori bulunamadı")
        return {"message": "Silindi"}

    # ---------- Admin Courses ----------
    @router.get("/admin/academy/courses")
    async def admin_list_courses(_admin: dict = Depends(get_admin_user_dep)):
        cursor = courses_coll.find({}).sort([("order", 1), ("created_at", -1)])
        return [_serialize(d) async for d in cursor]

    @router.post("/admin/academy/courses")
    async def admin_create_course(body: CourseIn, _admin: dict = Depends(get_admin_user_dep)):
        # Validate category exists
        if not ObjectId.is_valid(body.category_id) or not await cats_coll.find_one({"_id": ObjectId(body.category_id)}):
            raise HTTPException(400, "Geçersiz kategori")
        base_slug = slugify(body.title)
        if not base_slug:
            raise HTTPException(400, "Geçersiz başlık")
        slug = base_slug
        i = 2
        while await courses_coll.find_one({"slug": slug}):
            slug = f"{base_slug}-{i}"
            i += 1
        now = datetime.now(timezone.utc)
        doc = body.model_dump()
        if body.is_free:
            doc["price_try"] = 0.0
        doc.update({"slug": slug, "created_at": now, "updated_at": now})
        res = await courses_coll.insert_one(doc)
        created = await courses_coll.find_one({"_id": res.inserted_id})
        return _serialize(created)

    @router.patch("/admin/academy/courses/{course_id}")
    async def admin_update_course(course_id: str, body: CourseUpdate, _admin: dict = Depends(get_admin_user_dep)):
        if not ObjectId.is_valid(course_id):
            raise HTTPException(400, "Geçersiz ID")
        update = {k: v for k, v in body.model_dump().items() if v is not None}
        if "title" in update:
            base_slug = slugify(update["title"])
            slug = base_slug
            i = 2
            while await courses_coll.find_one({"slug": slug, "_id": {"$ne": ObjectId(course_id)}}):
                slug = f"{base_slug}-{i}"
                i += 1
            update["slug"] = slug
        if update.get("is_free") is True:
            update["price_try"] = 0.0
        update["updated_at"] = datetime.now(timezone.utc)
        await courses_coll.update_one({"_id": ObjectId(course_id)}, {"$set": update})
        doc = await courses_coll.find_one({"_id": ObjectId(course_id)})
        if not doc:
            raise HTTPException(404, "Eğitim bulunamadı")
        return _serialize(doc)

    @router.delete("/admin/academy/courses/{course_id}")
    async def admin_delete_course(course_id: str, _admin: dict = Depends(get_admin_user_dep)):
        if not ObjectId.is_valid(course_id):
            raise HTTPException(400, "Geçersiz ID")
        res = await courses_coll.delete_one({"_id": ObjectId(course_id)})
        if res.deleted_count == 0:
            raise HTTPException(404, "Eğitim bulunamadı")
        return {"message": "Silindi"}

    return router
