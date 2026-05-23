"""Newsletter subscribers."""
import re
from datetime import datetime, timezone
from typing import Optional, List

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/api")


class SubscribeIn(BaseModel):
    email: EmailStr
    name: Optional[str] = ""
    phone: Optional[str] = ""
    interests: List[str] = Field(default_factory=list)  # ["zirve", "seminer", "egitim"]
    source: Optional[str] = "site"  # where they came from (home_completed_hero, footer, etc.)


class BulkIdsBody(BaseModel):
    ids: List[str]


def _serialize(doc: dict) -> dict:
    if not doc:
        return doc
    out = {k: v for k, v in doc.items() if k != "_id"}
    out["id"] = str(doc["_id"])
    for k in ("created_at",):
        v = out.get(k)
        if isinstance(v, datetime):
            out[k] = v.isoformat()
    return out


def init_router(db, get_admin_user_dep):
    coll = db.newsletter_subscribers

    @router.post("/newsletter/subscribe")
    async def subscribe(body: SubscribeIn):
        email = str(body.email).strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
            raise HTTPException(400, "Geçersiz e-posta")
        existing = await coll.find_one({"email": email})
        now = datetime.now(timezone.utc)
        if existing:
            # Re-activate + merge interests
            new_interests = list({*existing.get("interests", []), *body.interests})
            await coll.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "is_active": True,
                    "name": body.name or existing.get("name", ""),
                    "phone": body.phone or existing.get("phone", ""),
                    "interests": new_interests,
                    "updated_at": now,
                }},
            )
            return {"message": "Aboneliğiniz güncellendi. Sizinle iletişime geçeceğiz.", "already_subscribed": True}
        doc = {
            "email": email,
            "name": body.name or "",
            "phone": body.phone or "",
            "interests": body.interests or [],
            "source": body.source or "site",
            "is_active": True,
            "created_at": now,
        }
        await coll.insert_one(doc)
        return {"message": "Aboneliğiniz alındı. Yeni etkinliklerden ilk siz haberdar olacaksınız."}

    @router.get("/admin/newsletter")
    async def list_subscribers(_admin: dict = Depends(get_admin_user_dep)):
        cursor = coll.find({}).sort([("created_at", -1)])
        items = [_serialize(d) async for d in cursor]
        return {"items": items, "total": len(items)}

    @router.delete("/admin/newsletter/{sub_id}")
    async def delete_subscriber(sub_id: str, _admin: dict = Depends(get_admin_user_dep)):
        if not ObjectId.is_valid(sub_id):
            raise HTTPException(400, "Geçersiz ID")
        res = await coll.delete_one({"_id": ObjectId(sub_id)})
        if res.deleted_count == 0:
            raise HTTPException(404, "Abone bulunamadı")
        return {"message": "Silindi"}

    @router.post("/admin/newsletter/bulk-delete")
    async def bulk_delete(body: BulkIdsBody, _admin: dict = Depends(get_admin_user_dep)):
        ids = [ObjectId(i) for i in body.ids if ObjectId.is_valid(i)]
        if not ids:
            raise HTTPException(400, "Geçerli ID yok")
        res = await coll.delete_many({"_id": {"$in": ids}})
        return {"message": f"{res.deleted_count} abone silindi", "deleted": res.deleted_count}

    return router
