# Arsa Yatırım Zirvesi 2026 — PRD

## Original Problem Statement
Corporate website and CRM/Admin panel for "Arsa Yatırım Zirvesi" (Land Investment Summit). Distinct registration flows (Zirve 600 limit, Fuar unlimited), Admin CRM lists, QR check-in, badge generation, email automation, dynamic SEO, 3rd-party API keys for external fair companies, Investment Simulator lead-gen tool.

## Stack
- React frontend + FastAPI backend (server.py ~3300 lines) + MongoDB
- SendGrid emails, Visitego (turnstile push), html5-qrcode, Pillow (badges), GTM/GA4
- Bundled TR il-ilçe dataset (`/app/backend/data/tr_locations.json`, 81 il, 973 ilçe, ~12KB)

## Completed
- 2026-02-13: **Investment Simulator — Il/İlçe searchable comboboxes.**
  - Backend: new `GET /api/locations` returns full TR province → districts map.
  - Frontend: new `Combobox` component with TR-aware search (handles İ/I/Ş/Ç/Ğ/Ü/Ö). İl seçilince ilçe dropdown auto-filtreleniyor.
  - Mahalle: serbest metin (50K+ mahalle veriseti pratik olmadığı için autocomplete açılmadı).
- 2026-02-13: **Investment Simulator — major upgrade.** Budget picker (1M/3M/5M/10M + free), Arsa/Tarla/İPAT 3-way selector, Mahalle, m², Vade slider (0.5-10 yıl), Müstakil/Hisseli. Admin reply modal + `replies[]` log.
- 2026-02-13: **All registrations (Summit + Fair) are instant — no email verification.**
- 2026-02-13: **Fair Management admin — floor plan image upload.**
- 2026-02-13: `render_badge_png()` wrapped in `asyncio.to_thread`.
- Earlier: KVKK consent, WhatsApp widget, GTM/GA4, Visitego API auto-sync, separate `/zirve-kaydi` & `/fuar-kaydi`, favicon, dynamic footer, Navbar responsive fix, public mobile-scan link.

## Backlog
- P2: PWA conversion (offline + install prompt).
- P2: Split `server.py` (~3300 lines) into routers/models/services.
- P2: Editable sponsor package prices.
- P3: Mahalle autocomplete (would need ~5MB neighborhood dataset on backend, optional).
- P3: Honeypot + rate limit on registrations.
- P3: Interactive floor-plan hotspots.

## Key APIs
- `GET  /api/locations` — full TR il→ilçe map
- `POST /api/register/guest` — summit & fair instant verify + badge email
- `POST /api/investment-game/submit` — body: {…, budget_mode, total_budget?, items[]}
- `POST /api/admin/investment-game/{id}/reply` — email reply persisted in `replies[]`
- `POST /api/admin/uploads/image` — multipart
- `PUT  /api/admin/fair`, `PUT /api/admin/seo`

## DB Schemas (key)
- `guests`: {name,email,phone,visit_type[summit|fair],invite_code,is_verified,verified_at,badge_printed,status,checked_in}
- `investment_game`: {name, phone, email, age, profession, budget_mode, starting_budget, total_spent, items: [{kind, city, district, neighborhood, area_m2, vade_years, ownership, arsa_type, daire_type, budget, description}], replies: [{subject, message, sent_at, sent_by}]}
- `fair_settings`, `site_settings`, `invite_codes`

## Deployment Notes
- TWO environments: PREVIEW + PRODUCTION (`arsayatirimzirvesi.com`). User must press **Deploy** after changes.
- Admin: admin@arsayatirim.com / As537273.
