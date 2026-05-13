# Arsa Yatırım Zirvesi 2026 — PRD

## Original Problem Statement
Corporate website and CRM/Admin panel for "Arsa Yatırım Zirvesi" (Land Investment Summit). Distinct registration flows (Zirve 600 limit, Fuar unlimited), Admin CRM lists, QR check-in, badge generation, email automation, dynamic SEO, 3rd-party API keys for external fair companies.

## Stack
- React frontend + FastAPI backend (server.py ~3200 lines) + MongoDB
- SendGrid emails, Visitego (turnstile push), html5-qrcode, Pillow (badges), GTM/GA4

## Completed
- 2026-02-13: **All registrations (Summit + Fair) are now instant — no email verification.** `/api/register/guest` auto-verifies on submit, generates badge PNG (in thread pool), sends confirmation email with badge attached, pushes to Visitego in background. Summit still requires valid invite code + capacity check. `/api/verify/guest?token=` endpoint is kept for legacy verification links from already-sent emails.
- 2026-02-13: **Fair Management admin — floor plan image upload.** Live preview thumbnail, "Görsel Yükle" button + URL fallback + "Görseli kaldır". Gallery section also gained "Foto Yükle" button.
- 2026-02-13: `render_badge_png()` wrapped in `asyncio.to_thread` for non-blocking event loop.
- Earlier this session: KVKK consent on all forms, WhatsApp widget, GTM/GA4 injection, Visitego API auto-sync, Investment Simulator mini-game, separate `/zirve-kaydi` & `/fuar-kaydi` routes, favicon, dynamic footer, Navbar responsive fix, public mobile-scan link.

## Backlog
- P2: PWA conversion (service worker + offline cache + install prompt).
- P2: Split `server.py` (~3200 lines) into routers/models/services.
- P2: Editable sponsor package prices from admin panel.
- P3: Interactive floor-plan hotspots (clickable stand numbers).

## Key APIs
- `POST /api/register/guest` — both summit & fair: instant verify + badge email
- `GET  /api/verify/guest?token=` — legacy/backward-compat for already-sent links
- `POST /api/register/exhibitor`, `POST /api/register/speaker-application`
- `POST /api/admin/uploads/image` — multipart, used by Hero Slides + Fair Management
- `PUT  /api/admin/fair`, `PUT /api/admin/seo`
- Visitego push runs in background_tasks on registration

## DB Schemas (key)
- `guests`: {name,email,phone,visit_type[summit|fair],invite_code,is_verified,verified_at,badge_printed,status,checked_in}
- `fair_settings`: {key:"main", fair_name, dates, location, hall_name, description, total_stands, floor_plan_url, floor_plan_image_url, gallery[], stand_types[], highlights[], cta_*}
- `site_settings`: {key:"main", social_*, contact_*, gtm_id, ga_id, invite_code_phone, ...}
- `investment_games`: leads from simulator
- `invite_codes`: {code, valid_for, used_count, max_uses}

## Deployment Notes
- Two environments: PREVIEW (working env) and PRODUCTION (`arsayatirimzirvesi.com`). Always remind user to press Deploy after preview-side changes.
- Clipboard API blocked in preview iframe → modal fallback exists.
- Admin password was reset on 2026-02-13 to match `.env` ADMIN_PASSWORD.
