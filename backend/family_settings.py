"""Zirve Ailesi page (about/team) settings."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api")
SETTINGS_KEY = "family_main"

DEFAULTS = {
    "hero_overline": "Arsa Yatırım Zirvesi",
    "hero_title": "Zirve Ailesi",
    "hero_accent": "Ailesi",
    "hero_subtitle": "Arsa Yatırım Zirvesi'ni yıllar içinde büyüten kurucu, konuşmacılar ve uzman katkıcılar.",
    "founder_title": "Zirve ve Platform Kurucusu",
    "speakers_title": "Konuşmacılarımız",
    "speakers_subtitle": "Her yıl zirvelerimizde sahne alan saha uzmanları",
    "seo_title": "Zirve Ailesi | Arsa Yatırım Zirvesi Kurucu, Konuşmacılar & Ekip",
    "seo_description": "Arsa Yatırım Zirvesi'nin kurucusu ve yıllar içinde sahne alan tüm konuşmacıları. Hangi konuşmacı hangi zirvede yer aldı, biyografileri ve uzmanlık alanları.",
    "seo_keywords": "zirve ailesi, arsa yatırım zirvesi kurucu, arsa yatırım zirvesi konuşmacılar, arsa yatırım zirvesi ekip, gayrimenkul yatırım uzmanları, arsa yatırım uzmanları türkiye",
    "og_image": "",
    "og_title": "",
    "og_description": "",
    "canonical_path": "/zirve-ailesi",
}


class FamilySettingsUpdate(BaseModel):
    hero_overline: Optional[str] = None
    hero_title: Optional[str] = None
    hero_accent: Optional[str] = None
    hero_subtitle: Optional[str] = None
    founder_title: Optional[str] = None
    speakers_title: Optional[str] = None
    speakers_subtitle: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    og_image: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    canonical_path: Optional[str] = None


def init_router(db, get_admin_user_dep):
    coll = db.family_settings

    async def _get_doc() -> dict:
        doc = await coll.find_one({"key": SETTINGS_KEY})
        if not doc:
            return dict(DEFAULTS)
        return {**DEFAULTS, **{k: v for k, v in doc.items() if k not in ("_id", "key", "updated_at")}}

    @router.get("/family/settings")
    async def public_get_settings():
        return await _get_doc()

    @router.patch("/admin/family/settings")
    async def admin_update_settings(body: FamilySettingsUpdate, _admin: dict = Depends(get_admin_user_dep)):
        update = {k: v for k, v in body.model_dump().items() if v is not None}
        if not update:
            raise HTTPException(400, "Hiç değişiklik gönderilmedi")
        update["updated_at"] = datetime.now(timezone.utc)
        await coll.update_one(
            {"key": SETTINGS_KEY},
            {"$set": update, "$setOnInsert": {"key": SETTINGS_KEY}},
            upsert=True,
        )
        return await _get_doc()

    return router
