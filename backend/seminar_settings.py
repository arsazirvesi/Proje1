"""Seminar page settings (single-document collection)."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api")

SETTINGS_KEY = "seminar_main"

DEFAULTS = {
    "hero_title": "Arsa Yatırım Semineri",
    "hero_accent": "Semineri",  # part of title shown in amber
    "hero_subtitle": "Saha uzmanlarından arsa-arazi yatırımı, hukuk, dijital pazarlama ve satış üzerine periyodik seminerler.",
    "hero_overline": "Saha Uzmanlarından",
    "seo_title": "Arsa Yatırım Semineri | Saha Uzmanlarından Periyodik Seminerler 2026",
    "seo_description": "Türkiye'nin saha uzmanlarından arsa yatırımı, gayrimenkul hukuku, dijital pazarlama ve satış seminerleri. Aylık periyodik buluşmalar, online ve yüz yüze.",
    "seo_keywords": "arsa yatırım semineri, arsa yatırım eğitimi, gayrimenkul semineri, arsa alım satım, arazi yatırımı semineri, imar semineri, gayrimenkul hukuku semineri, emlak semineri istanbul, arazi değerleme semineri",
    "og_image": "",
    "og_title": "",
    "og_description": "",
    "canonical_path": "/seminer",
}


class SettingsUpdate(BaseModel):
    hero_title: Optional[str] = None
    hero_accent: Optional[str] = None
    hero_subtitle: Optional[str] = None
    hero_overline: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    og_image: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    canonical_path: Optional[str] = None


def init_router(db, get_admin_user_dep):
    coll = db.seminar_settings

    async def _get_doc() -> dict:
        doc = await coll.find_one({"key": SETTINGS_KEY})
        if not doc:
            return dict(DEFAULTS)
        return {**DEFAULTS, **{k: v for k, v in doc.items() if k not in ("_id", "key", "updated_at")}}

    @router.get("/seminar/settings")
    async def public_get_settings():
        return await _get_doc()

    @router.patch("/admin/seminar/settings")
    async def admin_update_settings(body: SettingsUpdate, _admin: dict = Depends(get_admin_user_dep)):
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
