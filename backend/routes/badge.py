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

import uuid
import qrcode
from PIL import Image as PILImage, ImageDraw, ImageFont
import hashlib

def init_badge_router(db, get_admin_user):
    router = APIRouter(prefix="/api")

    # ==================== BADGE ====================
    
    @router.get("/badge/{guest_id}", response_class=HTMLResponse)
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
    
    
    @router.get("/badge/{guest_id}/png")
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
    
    

    return router
