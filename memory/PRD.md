# Arsa Yatırım Zirvesi 2026 — PRD

## Original Problem Statement
Corporate website and CRM/Admin panel for "Arsa Yatırım Zirvesi" (Land Investment Summit). Distinct registration flows (Zirve 600 limit, Fuar unlimited), Admin CRM lists, QR check-in, badge generation, email automation, dynamic SEO, 3rd-party API keys for external fair companies.

## Stack
- React frontend + FastAPI backend (server.py ~3300 lines) + MongoDB
- SendGrid emails, Visitego (turnstile push), html5-qrcode, Pillow (badges), GTM/GA4

## Completed
- 2026-02-13: **Fair registration no longer requires email verification.** `/api/register/guest` auto-verifies fair guests on submit, sends badge attachment via email immediately, pushes to Visitego. Summit still requires invite-code + email verification. Frontend success screen shows badge directly for fair, "check email" view for summit.
- 2026-02-13: `render_badge_png()` calls wrapped in `asyncio.to_thread` to keep the event loop non-blocking under load (verify + fair register paths).
- Earlier this session: KVKK consent on all forms, WhatsApp widget, GTM/GA4 injection, Visitego API auto-sync, Investment Simulator mini-game, separate `/zirve-kaydi` & `/fuar-kaydi` routes, favicon, dynamic footer, Navbar responsive fix, public mobile-scan link, Fair Management admin (in-progress: image upload field for kroki).

## Backlog
- P0: Add kroki (floor plan) image upload to Fair Management admin (currently only text URL fields) — uses existing `/api/admin/uploads/image`.
- P2: PWA conversion (service worker + offline cache + install prompt).
- P2: Split `server.py` (~3300 lines) into routers/models/services.
- P2: Editable sponsor package prices from admin panel.

## Key APIs
- `POST /api/register/guest` (summit: verify flow, fair: instant verify)
- `GET  /api/verify/guest?token=` (summit only)
- `POST /api/register/exhibitor`, `POST /api/register/speaker-application`
- `POST /api/admin/uploads/image`
- `PUT  /api/admin/seo`
- Visitego push runs in background_tasks on fair guest verify/create

## DB Schemas (key)
- `guests`: {name,email,phone,visit_type[summit|fair],invite_code,is_verified,verification_token,verified_at,badge_printed,status}
- `site_settings`: {key:"main", floor_plan_url, floor_plan_image_url, social_*, contact_*, gtm_id, ga_id, invite_code_phone, ...}
- `investment_games`: leads from simulator
- `invite_codes`: {code, valid_for, used_count}

## Deployment Notes
- Two environments: PREVIEW (working env) and PRODUCTION (`arsayatirimzirvesi.com`). Always remind user to press Deploy after preview-side changes.
- Clipboard API blocked in preview iframe → modal fallback exists.
