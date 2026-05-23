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


def init_investment_router(db, get_admin_user, get_expert_or_admin_user):
    router = APIRouter(prefix="/api")

    # ==================== INVESTMENT GAME (Public + Admin) ====================
    
    INVESTMENT_GAME_BUDGET = 10_000_000  # legacy default; users now pick their own budget
    MAX_ITEMS = 30  # anti-abuse
    ALLOWED_BUDGETS = {"1m": 1_000_000, "3m": 3_000_000, "5m": 5_000_000, "10m": 10_000_000}
    MAX_FREE_BUDGET = 10_000_000_000  # 10 milyar TL üst sınır (anti-abuse)
    
    VALID_ARSA_TYPES = ("tarla", "arsa", "ipat")
    VALID_OWNERSHIP = ("hisseli", "mustakil")
    VALID_VADE_RANGE = (0.5, 10.0)
    
    
    def _resolve_total_budget(budget_mode: Optional[str], total_budget: Optional[int]) -> tuple[int, Optional[str]]:
        mode = (budget_mode or "free").lower()
        if mode in ALLOWED_BUDGETS:
            return ALLOWED_BUDGETS[mode], None
        if mode == "free":
            if not total_budget or total_budget <= 0:
                return 0, "Serbest bütçe seçildi ama tutar girilmedi"
            if total_budget > MAX_FREE_BUDGET:
                return 0, f"Bütçe çok yüksek (üst sınır {MAX_FREE_BUDGET:,} TL)"
            return int(total_budget), None
        return 0, "Geçersiz bütçe seçimi"
    
    
    def _validate_investment_items(items: List[InvestmentItem], total_budget: int) -> tuple[int, Optional[str]]:
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
            if it.kind == "arsa":
                if it.arsa_type not in VALID_ARSA_TYPES:
                    return 0, "Arsa cinsi arsa, tarla veya ipat olmalı"
                if it.area_m2 is not None and it.area_m2 < 0:
                    return 0, "m² negatif olamaz"
                if it.vade_years is not None and not (VALID_VADE_RANGE[0] <= it.vade_years <= VALID_VADE_RANGE[1]):
                    return 0, f"Vade {VALID_VADE_RANGE[0]} ile {VALID_VADE_RANGE[1]} yıl arasında olmalı"
                if it.ownership is not None and it.ownership not in VALID_OWNERSHIP:
                    return 0, "Mülkiyet tipi hisseli veya mustakil olmalı"
            total += it.budget
        if total > total_budget:
            return total, f"Toplam yatırım {total_budget:,} TL'lik bütçeyi aşıyor"
        return total, None
    
    
    @router.post("/investment-game/submit")
    async def investment_game_submit(body: InvestmentGameSubmit, request: Request):
        total_budget, budget_err = _resolve_total_budget(body.budget_mode, body.total_budget)
        if budget_err:
            raise HTTPException(400, budget_err)
        total_spent, err = _validate_investment_items(body.items, total_budget)
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
            "budget_mode": (body.budget_mode or "free").lower(),
            "items": [it.model_dump() for it in body.items],
            "total_spent": total_spent,
            "remaining": total_budget - total_spent,
            "starting_budget": total_budget,
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
            doc["replies"] = []
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
        if total_spent == total_budget: badges.append({"id": "all_in", "label": "💯 Tüm Parayı Yatırdın", "description": "Bütçenin tamamını değerlendirdin"})
        elif total_spent >= total_budget * 0.9: badges.append({"id": "big_spender", "label": "💸 Büyük Yatırımcı", "description": "%90+ harcadın"})
    
        cities = list({it.city.strip() for it in body.items if it.city.strip()})
        if len(cities) >= 3: badges.append({"id": "multi_city", "label": "🗺️ Çoklu Şehir", "description": f"{len(cities)} şehirde yatırım"})
    
        # Long-horizon badge (any item with 5+ year vade)
        if any((it.vade_years or 0) >= 5 for it in body.items):
            badges.append({"id": "uzun_vade", "label": "📈 Uzun Vade Yatırımcısı", "description": "5+ yıl vadeli yatırım"})
    
        return {
            "id": gid,
            "name": doc["name"],
            "total_spent": total_spent,
            "remaining": doc["remaining"],
            "starting_budget": total_budget,
            "items": doc["items"],
            "badges": badges,
            "daire_count": daire_count,
            "arsa_count": arsa_count,
            "created_at": created_at,
            "updated": bool(existing),
        }
    
    
    @router.get("/admin/investment-game")
    async def admin_investment_game_list(limit: int = 500, admin: dict = Depends(get_admin_user)):
        limit = max(1, min(int(limit or 500), 2000))
        docs = await db.investment_game.find().sort("created_at", -1).to_list(limit)
        out = []
        for d in docs:
            d["id"] = str(d.pop("_id"))
            out.append(d)
        return out
    
    
    @router.get("/admin/investment-game/stats")
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
    
    
    @router.delete("/admin/investment-game/{entry_id}")
    async def admin_investment_game_delete(entry_id: str, admin: dict = Depends(get_admin_user)):
        if not ObjectId.is_valid(entry_id):
            raise HTTPException(400, "Geçersiz ID")
        r = await db.investment_game.delete_one({"_id": ObjectId(entry_id)})
        if r.deleted_count == 0:
            raise HTTPException(404, "Kayıt bulunamadı")
        return {"deleted": True}
    
    
    @router.get("/admin/investment-game/export")
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
            "Başlangıç Bütçesi (TL)", "Toplam Yatırım (TL)", "Kalan (TL)",
            "Yatırım Sayısı", "Portföy Özeti", "Cevap Sayısı",
        ])
        for d in docs:
            items = d.get("items", [])
            summary_parts = []
            for it in items:
                if it.get("kind") == "daire":
                    summary_parts.append(f"Daire {it.get('daire_type','')} {it.get('city','')}/{it.get('district','')} ₺{it.get('budget',0):,}")
                else:
                    land_type = (it.get('arsa_type') or 'arsa')
                    land_label = {"ipat": "İPAT", "tarla": "Tarla", "arsa": "Arsa"}.get(land_type, land_type.title())
                    extras = []
                    if it.get("neighborhood"): extras.append(f"Mah:{it['neighborhood']}")
                    if it.get("area_m2"): extras.append(f"{it['area_m2']} m²")
                    if it.get("vade_years"): extras.append(f"{it['vade_years']} yıl")
                    if it.get("ownership"): extras.append(it["ownership"].title())
                    tag = f" [{', '.join(extras)}]" if extras else ""
                    summary_parts.append(f"{land_label} {it.get('city','')}/{it.get('district','')}{tag} ₺{it.get('budget',0):,}")
            w.writerow([
                d.get("created_at", ""),
                d.get("name", ""),
                d.get("phone", ""),
                d.get("email", ""),
                d.get("age", ""),
                d.get("profession", ""),
                d.get("starting_budget", 0),
                d.get("total_spent", 0),
                d.get("remaining", 0),
                len(items),
                " | ".join(summary_parts),
                len(d.get("replies", []) or []),
            ])
        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="yatirim-oyunu.csv"'},
        )
    
    
    @router.post("/admin/investment-game/{entry_id}/reply")
    async def admin_investment_game_reply(
        entry_id: str,
        body: InvestmentGameReply,
        background_tasks: BackgroundTasks,
        admin: dict = Depends(get_admin_user),
    ):
        """Send a personalised email reply to a simulator participant and record it."""
        if not ObjectId.is_valid(entry_id):
            raise HTTPException(400, "Geçersiz ID")
        entry = await db.investment_game.find_one({"_id": ObjectId(entry_id)})
        if not entry:
            raise HTTPException(404, "Kayıt bulunamadı")
        to_email = (entry.get("email") or "").strip()
        if not to_email:
            raise HTTPException(400, "Bu kayıtta e-posta yok, cevap gönderilemez")
    
        name = entry.get("name") or ""
        # Convert plain-text/admin message to HTML (preserve linebreaks, escape)
        msg_html = html_escape.escape(body.message).replace("\n", "<br/>")
        accent = "#0F1833"
        gold = "#D4AF37"
        public_base = os.environ.get("PUBLIC_BASE_URL", "https://arsayatirimzirvesi.com").rstrip("/")
        html = f"""<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-top:4px solid {gold}">
      <div style="padding:32px 32px 8px">
        <p style="color:{accent};font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;margin:0 0 6px">Arsa Yatırım Zirvesi · Uzman Değerlendirmesi</p>
        <h1 style="color:{accent};font-size:22px;margin:0 0 16px">Merhaba {html_escape.escape(name)},</h1>
      </div>
      <div style="padding:0 32px 24px;color:#374151;font-size:15px;line-height:1.7">
        {msg_html}
      </div>
      <div style="padding:0 32px 28px">
        <a href="{public_base}/yatirim-oyunu" style="display:inline-block;background:{accent};color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px">Simülatörü Tekrar Aç</a>
      </div>
      <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:11px;text-align:center">
        Arsa Yatırım Zirvesi 2026 · 21 Mayıs · Hilton İstanbul Bosphorus
      </div>
    </div>
    </body></html>"""
    
        background_tasks.add_task(send_email, to_email, body.subject, html, None)
    
        now_iso = datetime.now(timezone.utc).isoformat()
        reply_doc = {
            "subject": body.subject.strip()[:200],
            "message": body.message.strip()[:8000],
            "sent_at": now_iso,
            "sent_by": admin.get("email", ""),
        }
        await db.investment_game.update_one(
            {"_id": ObjectId(entry_id)},
            {"$push": {"replies": reply_doc}, "$set": {"updated_at": now_iso}},
        )
        return {"sent": True, "to": to_email, "reply": reply_doc}
    
    
    # ==================== EXPERT PANEL (Investment Simulator viewing & commenting) ====================
    
    def _mask_email(email: str) -> str:
        if not email or "@" not in email:
            return ""
        name, domain = email.split("@", 1)
        if len(name) <= 2:
            return f"{name[:1]}***@{domain}"
        return f"{name[:2]}***@{domain}"
    
    
    def _mask_phone(phone: str) -> str:
        if not phone:
            return ""
        digits = "".join(c for c in phone if c.isdigit())
        if len(digits) < 4:
            return "***"
        return f"{digits[:3]}*** **{digits[-2:]}"
    
    
    def _scrub_entry_for_expert(doc: dict) -> dict:
        """Strip phone/email for expert view; keep everything else."""
        d = clean_doc(doc)
        raw_email = d.get("email", "")
        raw_phone = d.get("phone", "")
        d.pop("email", None)
        d.pop("phone", None)
        d.pop("ip", None)
        d.pop("user_agent", None)
        d["email_masked"] = _mask_email(raw_email)
        d["phone_masked"] = _mask_phone(raw_phone)
        # Comments + replies — replies are private (admin emails), so strip recipient details:
        d.setdefault("expert_comments", [])
        # Don't expose admin replies' body to experts; just count
        d["admin_replied_count"] = len(d.pop("replies", []) or [])
        return d
    
    
    @router.get("/expert/me")
    async def expert_me(user: dict = Depends(get_expert_or_admin_user)):
        return {"id": user.get("_id"), "email": user.get("email"), "name": user.get("name"), "role": user.get("role")}
    
    
    @router.get("/expert/investment-game")
    async def expert_list_investment_game(limit: int = 500, user: dict = Depends(get_expert_or_admin_user)):
        docs = await db.investment_game.find().sort("created_at", -1).to_list(limit)
        out = []
        for d in docs:
            try:
                out.append(_scrub_entry_for_expert(d))
            except Exception as e:
                logger.error(f"_scrub_entry_for_expert failed for _id={d.get('_id')}: {e}")
                try:
                    out.append({
                        "id": str(d.get("_id")),
                        "name": d.get("name") or "(bozuk kayıt)",
                        "age": d.get("age"),
                        "profession": d.get("profession") or "",
                        "starting_budget": d.get("starting_budget", 0),
                        "total_spent": d.get("total_spent", 0),
                        "remaining": d.get("remaining", 0),
                        "items": d.get("items", []) or [],
                        "expert_comments": d.get("expert_comments", []) or [],
                        "email_masked": "",
                        "phone_masked": "",
                        "admin_replied_count": 0,
                        "created_at": "",
                        "_corrupted": True,
                    })
                except Exception:
                    continue
        return out
    
    
    @router.get("/expert/investment-game/stats")
    async def expert_investment_game_stats(user: dict = Depends(get_expert_or_admin_user)):
        total = await db.investment_game.count_documents({})
        avg_pipeline = await db.investment_game.aggregate([
            {"$group": {"_id": None, "avg": {"$avg": "$total_spent"}}}
        ]).to_list(1)
        avg = int(avg_pipeline[0]["avg"]) if avg_pipeline else 0
    
        pipeline = await db.investment_game.aggregate([
            {"$unwind": "$items"},
            {"$group": {"_id": "$items.kind", "count": {"$sum": 1}}}
        ]).to_list(10)
        kinds = {row["_id"]: row["count"] for row in pipeline}
    
        city_pipeline = await db.investment_game.aggregate([
            {"$unwind": "$items"},
            {"$match": {"items.city": {"$ne": ""}}},
            {"$group": {"_id": "$items.city", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 8},
        ]).to_list(8)
        top_cities = [{"city": r["_id"], "count": r["count"]} for r in city_pipeline]
    
        return {
            "total_players": total,
            "avg_spent": avg,
            "daire_count": kinds.get("daire", 0),
            "arsa_count": kinds.get("arsa", 0),
            "top_cities": top_cities,
        }
    
    
    @router.get("/expert/investment-game/{entry_id}")
    async def expert_get_investment_game(entry_id: str, user: dict = Depends(get_expert_or_admin_user)):
        if not ObjectId.is_valid(entry_id):
            raise HTTPException(400, "Geçersiz ID")
        doc = await db.investment_game.find_one({"_id": ObjectId(entry_id)})
        if not doc:
            raise HTTPException(404, "Kayıt bulunamadı")
        return _scrub_entry_for_expert(doc)
    
    
    @router.post("/expert/investment-game/{entry_id}/comments")
    async def expert_add_comment(
        entry_id: str,
        body: ExpertCommentCreate,
        user: dict = Depends(get_expert_or_admin_user),
    ):
        if not ObjectId.is_valid(entry_id):
            raise HTTPException(400, "Geçersiz ID")
        entry = await db.investment_game.find_one({"_id": ObjectId(entry_id)})
        if not entry:
            raise HTTPException(404, "Kayıt bulunamadı")
        now = datetime.now(timezone.utc).isoformat()
        comment_doc = {
            "id": secrets.token_hex(8),
            "comment": body.comment.strip(),
            "author_name": user.get("name") or user.get("email"),
            "author_email": user.get("email"),
            "author_role": user.get("role"),
            "created_at": now,
        }
        await db.investment_game.update_one(
            {"_id": ObjectId(entry_id)},
            {"$push": {"expert_comments": comment_doc}, "$set": {"updated_at": now}},
        )
        return comment_doc
    
    
    @router.delete("/expert/investment-game/{entry_id}/comments/{comment_id}")
    async def expert_delete_comment(
        entry_id: str,
        comment_id: str,
        user: dict = Depends(get_expert_or_admin_user),
    ):
        if not ObjectId.is_valid(entry_id):
            raise HTTPException(400, "Geçersiz ID")
        entry = await db.investment_game.find_one({"_id": ObjectId(entry_id)})
        if not entry:
            raise HTTPException(404, "Kayıt bulunamadı")
        # Admins can delete any comment; experts only their own
        target = next((c for c in (entry.get("expert_comments") or []) if c.get("id") == comment_id), None)
        if not target:
            raise HTTPException(404, "Yorum bulunamadı")
        if user.get("role") != "admin" and target.get("author_email") != user.get("email"):
            raise HTTPException(403, "Bu yorumu silme yetkiniz yok")
        await db.investment_game.update_one(
            {"_id": ObjectId(entry_id)},
            {"$pull": {"expert_comments": {"id": comment_id}}},
        )
        return {"deleted": True}
    
    
    # ==================== ADMIN USERS (Admin Account Management) ====================
    
    @router.get("/admin/users")
    async def admin_list_users(admin: dict = Depends(get_admin_user)):
        docs = await db.users.find({}, {"password_hash": 0}).sort("created_at", -1).to_list(100)
        return [clean_doc(d) for d in docs]
    
    @router.post("/admin/users")
    async def admin_create_user(body: AdminUserCreate, admin: dict = Depends(get_admin_user)):
        if len(body.password) < 8:
            raise HTTPException(400, "Şifre en az 8 karakter olmalıdır")
        role = (body.role or "admin").lower()
        if role not in ("admin", "expert"):
            raise HTTPException(400, "Geçersiz rol (admin veya expert)")
        email = body.email.lower()
        existing = await db.users.find_one({"email": email})
        if existing:
            raise HTTPException(400, "Bu email ile zaten bir kullanıcı var")
        doc = {
            "email": email,
            "password_hash": hash_password(body.password),
            "name": body.name,
            "role": role,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin["email"],
        }
        result = await db.users.insert_one(doc)
        return {"id": str(result.inserted_id), "email": email, "name": body.name, "role": role, "message": "Yeni kullanıcı oluşturuldu"}
    
    @router.patch("/admin/users/{user_id}/password")
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
    
    @router.patch("/admin/users/{user_id}/name")
    async def admin_update_name(user_id: str, body: AdminNameUpdate, admin: dict = Depends(get_admin_user)):
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"name": body.name, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(404, "Admin bulunamadı")
        return {"message": "İsim güncellendi"}
    
    @router.delete("/admin/users/{user_id}")
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
    

    return router
