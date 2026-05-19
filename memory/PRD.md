# Arsa Yatırım Zirvesi 2026 — PRD

## Original Problem Statement
Corporate website and CRM/Admin panel for "Arsa Yatırım Zirvesi" (Land Investment Summit). Distinct registration flows (Zirve 600 limit, Fuar unlimited), Admin CRM lists, QR check-in, badge generation, email automation, dynamic SEO, 3rd-party API keys for external fair companies, Investment Simulator lead-gen tool.

## Stack
- React frontend + FastAPI backend (server.py ~3300 lines) + MongoDB
- SendGrid emails, Visitego (turnstile push), html5-qrcode, Pillow (badges), GTM/GA4
- Bundled TR il-ilçe dataset (`/app/backend/data/tr_locations.json`, 81 il, 973 ilçe, ~12KB)

## Completed
- 2026-02-19: **Cloudflare R2 görsel depolama entegrasyonu (P1).** Admin panel görsel upload'ları artık R2 bucket'a (`arsayatirimzirvesi-media`) gidiyor, custom domain `media.arsayatirimzirvesi.com` üzerinden CDN ile servis ediliyor — deploy'lar arası KALICI. Yeni `/app/backend/r2_storage.py` boto3 ile S3-uyumlu R2 client'ı sarıyor; `POST /api/admin/uploads/image` önce R2'ye yükler, hata olursa local'e fallback yapar. Eski `/api/uploads/...` linkleri korundu (geriye uyum). Env: `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT_URL`, `R2_PUBLIC_BASE_URL`. Curl E2E testi: upload → public URL → HTTP 200 fetch ✅.
- 2026-02-19: **Uzman Paneli — lacivert tema + ayrı detay + kart numaralandırma.** `/uzman/yatirim-oyunu` (değerlendirilecek) ve `/uzman/yorumlananlar` (yorum yapıldı) iki ayrı sekme; sol sidebar nav + count badge'leri. Karta tıklayınca `/uzman/yatirim-oyunu/:id` route'una gidiyor (drawer kaldırıldı). Her kart sağ üstte `#1`, `#2`... rozeti ile numaralandırıldı.
- 2026-02-15: **Sunum Modu (`/uzman/sunum/:id`).** Sahne projeksiyonu için tam ekran route — büyük başlıklar (text-5xl/7xl), 3 stat (Bütçe/Yatırım/Kalan ₺xxL), her portföy kalemi için etiketli "Girilen m²/Girilen Vade/Mülkiyet/Arazi Tipi" kutuları. Klavye nav (←/→/Space/ESC), dot indicator, fullscreen API, otomatik döngü. Backend: yeni `GET /api/expert/investment-game/{entry_id}`. Drawer'a "Sahne / Sunum Modu" button (yeni sekmede açar).
- 2026-02-15: **PWA (Progressive Web App) implementasyonu.** `service-worker.js` (cache-first static + network-first HTML + stale-while-revalidate API + offline fallback), `serviceWorkerRegistration.js` (otomatik update + reload), `InstallPrompt.jsx` (Android beforeinstallprompt + iOS Safari "Paylaş→Ana Ekrana Ekle" rehberi, 7 gün dismiss memory). Production build'de aktif.
- 2026-02-15: **Sponsor Paket Fiyatları — Admin'den düzenlenebilir.** Yeni `sponsor_packages` koleksiyonu (ana/altın/gümüş/bronz). Public `GET /api/sponsor-packages` + admin `GET/PUT /api/admin/sponsor-packages/{key}`. Yeni admin sayfası `/admin/sponsor-paketleri` ile fiyat etiketi + "Sahibini Buldu" toggle. Konuşmacı/Sponsor başvuru sayfasında her paket kartında fiyat pill etiketi.
- 2026-02-15: **Expert Portal — kurumsal beyaz tema dönüşümü tamamlandı.** EntryCard, MiniItem, EntryDetail drawer, DetailItem, Chip ve StatTile bileşenleri dark/glass tema yerine beyaz arkaplan + navy başlık + amber/emerald soft pastel aksanlara çevrildi. Login + üst header zaten beyazdı.
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
