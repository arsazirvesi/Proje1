# Arsa Yatırım Zirvesi 2026 — PRD

## Original Problem Statement
Corporate website and CRM/Admin panel for "Arsa Yatırım Zirvesi" (Land Investment Summit). Distinct registration flows (Zirve 600 limit, Fuar unlimited), Admin CRM lists, QR check-in, badge generation, email automation, dynamic SEO, 3rd-party API keys for external fair companies, Investment Simulator lead-gen tool.

## Stack
- React frontend + FastAPI backend (server.py ~3300 lines) + MongoDB
- SendGrid emails, Visitego (turnstile push), html5-qrcode, Pillow (badges), GTM/GA4

## Completed
- 2026-02-13: **Investment Simulator — major upgrade.**
  - User picks their own budget: 1M / 3M / 5M / 10M TL presets + free custom amount.
  - Land form now has 3 types: **Arsa / Tarla / İPAT** (İmar Planına Alınmış Tarla) — visual button selector.
  - New fields: **Mahalle** (neighborhood), **m²** (area), **Vade slider** (0.5-10 yıl with snap points at 6 ay / 1 / 2 / 3 / 5 / 7 / 10), **Mülkiyet** (Müstakil / Hisseli).
  - Admin panel: per-entry **"E-posta Cevap Gönder" modal** (subject + body), all replies persisted on the doc, "cevap sayısı" badge in list. CSV export enriched with new fields & reply count.
  - New API: `POST /api/admin/investment-game/{id}/reply`.
- 2026-02-13: **All registrations (Summit + Fair) are instant — no email verification.** `/api/register/guest` auto-verifies on submit. Summit still requires invite code + capacity check. `/api/verify/guest?token=` kept for legacy.
- 2026-02-13: **Fair Management admin — floor plan image upload.** Live preview, "Görsel Yükle" + URL fallback. Gallery section also has "Foto Yükle".
- 2026-02-13: `render_badge_png()` wrapped in `asyncio.to_thread` for non-blocking event loop.
- Earlier: KVKK consent, WhatsApp widget, GTM/GA4, Visitego API auto-sync, separate `/zirve-kaydi` & `/fuar-kaydi`, favicon, dynamic footer, Navbar responsive fix, public mobile-scan link.

## Backlog
- P2: PWA conversion (offline + install prompt).
- P2: Split `server.py` (~3300 lines) into routers/models/services.
- P2: Editable sponsor package prices from admin.
- P3: Honeypot + IP-based rate limit on registrations.
- P3: Interactive floor-plan hotspots (clickable stand numbers).
- P3: Per-item rich-text reply templates for the simulator admin (currently free-form textarea).

## Key APIs
- `POST /api/register/guest` — summit & fair instant verify + badge email
- `GET  /api/verify/guest?token=` — legacy/back-compat
- `POST /api/investment-game/submit` — body: {…, budget_mode: "1m"|"3m"|"5m"|"10m"|"free", total_budget? (free)}
- `GET  /api/admin/investment-game` — list
- `POST /api/admin/investment-game/{id}/reply` — send personalised email, persists in `replies[]`
- `GET  /api/admin/investment-game/export` — Excel CSV (with new fields)
- `POST /api/admin/uploads/image` — multipart, used by Hero Slides + Fair Management
- `PUT  /api/admin/fair`, `PUT /api/admin/seo`

## DB Schemas (key)
- `guests`: {name,email,phone,visit_type[summit|fair],invite_code,is_verified,verified_at,badge_printed,status,checked_in}
- `investment_game`: {
    name, phone, email, age, profession,
    budget_mode: "1m|3m|5m|10m|free", starting_budget, total_spent, remaining,
    items: [{kind: "daire|arsa", city, district, neighborhood, area_m2, vade_years (0.5–10), ownership (mustakil|hisseli), arsa_type (arsa|tarla|ipat), daire_type, budget, description}],
    replies: [{subject, message, sent_at, sent_by}],
    created_at, updated_at, ip, user_agent
  }
- `fair_settings`: {key:"main", fair_name, dates, location, hall_name, description, total_stands, floor_plan_url, floor_plan_image_url, gallery[], stand_types[], highlights[], cta_*}
- `site_settings`: {key:"main", social_*, contact_*, gtm_id, ga_id, invite_code_phone, ...}
- `invite_codes`: {code, valid_for, used_count, max_uses}

## Deployment Notes
- TWO environments: PREVIEW (working) and PRODUCTION (`arsayatirimzirvesi.com`). User must press **Deploy** after preview changes.
- Clipboard API blocked in preview iframe → modal fallback exists.
- Admin password reset on 2026-02-13 to match `.env` ADMIN_PASSWORD.
