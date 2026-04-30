# Arsa Yatırım Zirvesi 2026 - PRD

## Project Overview
Kurumsal zirve websitesi + kapsamlı CRM admin paneli.

**Event**: Arsa Yatırım Zirvesi 2026
**Date**: 21 Mayıs 2026, Perşembe
**Venue**: Hilton İstanbul Bosphorus · Zirve Salonu, Şişli/İstanbul
**Organizer**: Muhammet Özdemir

---

## Current Visual Identity (v4 — GYODER inspired)

- **Primary Navy**: `#22316a`
- **Accent Yellow**: `#F5B800`
- **Paper/Background**: `#F8F9FB` / white
- **Typography**: **Poppins** (300-800, headings and body)
- **Style**: Clean corporate institutional, minimal accents, white-dominant

---

## Architecture

### Tech Stack
- **Frontend**: React + TailwindCSS + Lucide Icons
- **Backend**: FastAPI + MongoDB (motor async)
- **Auth**: JWT (httpOnly cookies)
- **Email**: SendGrid (placeholder — needs SENDGRID_API_KEY)
- **Badge**: HTML/QR code generation (XSS-escaped)

---

## 4 Kayıt Türü (Registration Types)

| # | Tür | Public URL | Admin URL | Collection |
|---|-----|-----------|-----------|------------|
| 1 | **Ziyaretçi Kaydı** (en popüler) | `/ziyaretci-kaydi` | `/admin/ziyaretciler` | `guests` |
| 2 | **Fuar Stant Kaydı** | `/fuar-stant-kaydi` | `/admin/fuar-stant` | `exhibitors` |
| 3 | **Konuşmacı / Panel / Sponsor** | `/konusmaci-basvuru` | `/admin/konusmaci-basvuru` | `speaker_applications` |
| 4 | **Bülten Üyeliği** | `/bulten` | `/admin/bulten-uyeleri` | `members` |

### Admin CRM Features (her liste için)
- Durum (status) filtre tabları: **Yeni / İletişim Kuruldu / Onaylandı / Reddedildi**
- Arama (ad, email, telefon, şirket vs.)
- Detay sağ drawer → tüm form alanları + admin notları
- Durum güncelleme dropdown + notları kaydet
- CSV dışa aktarım (UTF-8 BOM)
- Toplu e-posta (SendGrid ile; yapılandırılmadığında uyarı döndürür)
- Silme

### Konuşmacı/Sponsor başvurularında özel
- **Başvuru tipi filtresi**: Konuşmacı / Panelist / Sponsor
- Aynı e-posta farklı tip ile tekrar başvurabilir

---

## Implementation History

### v1 (2026-04) — Initial Launch
- Full public site + admin CRUD. Dark gold theme.

### v2 (2026-04) — Light Theme
- Full transition to light/white backgrounds.

### v3 (2026-04-24) — AK Parti Corporate (later reverted per user)
- Orange/yellow AK Parti style + left drawer + Bebas Neue.

### v4 (2026-04-24) — GYODER Corporate (current)
- Navy #22316a + yellow accent + Poppins
- **NEW: 3 separate registration flows** with dedicated admin CRM pages (status/notes/filters)
- Navbar hamburger → left drawer with all 4 registration links
- HomePage "3 Kayıt Türü" section with EN POPÜLER badge
- Redirects: /zirve-kaydi, /uyelik → /ziyaretci-kaydi
- Dashboard: 6 stat cards + 3 recent tables (visitors/exhibitors/applications)
- 30/30 backend tests passing, frontend all flows verified

---

## Backend Endpoints

### Public
- `GET /api/speakers`, `/sponsors`, `/banners`, `/blog`, `/blog/{slug}`, `/events`, `/program`

### Registration
- `POST /api/register/guest` (ziyaretçi)
- `POST /api/register/exhibitor` (fuar stant)
- `POST /api/register/speaker-application` (konuşmacı/panel/sponsor)
- `POST /api/register/member` (bülten)

### Auth
- `POST /api/auth/login`, `/logout`, `/refresh`
- `GET /api/auth/me`

### Admin (all require admin JWT cookie)
- `GET /api/admin/dashboard`
- `GET/PATCH/DELETE /api/admin/guests[/{id}]` (with `?status=&q=`)
- `GET/PATCH/DELETE /api/admin/exhibitors[/{id}]` (with `?status=&q=`)
- `GET/PATCH/DELETE /api/admin/speaker-applications[/{id}]` (with `?status=&application_type=&q=`)
- `GET/DELETE /api/admin/members[/{id}]`
- `GET/POST/PUT/DELETE /api/admin/{speakers,sponsors,banners,blog,events,program}`
- `POST /api/admin/email/send` (recipient_type: members/guests/exhibitors/speaker_applications)
- `POST /api/admin/email/individual`

### Badge
- `GET /api/badge/{guest_id}` (HTML with QR code, HTML-escaped)

---

## Environment Variables
- `MONGO_URL` (configured)
- `DB_NAME=arsa_yatirim_db` (configured)
- `JWT_SECRET` (configured — should be set without fallback for production)
- `ADMIN_EMAIL=admin@arsayatirim.com`
- `ADMIN_PASSWORD=Admin@2026!`
- `SENDGRID_API_KEY` — **NEEDS TO BE SET** for emails to deliver
- `SENDER_EMAIL=noreply@arsayatirimzirvesi.com`

---

## Pending / Backlog

### Recently Completed (Feb 2026)
- [x] **2026-02-09 — Davet Kodu Sistemi**: Ziyaretçi kayıtları artık **zorunlu davet kodu** gerektiriyor. Admin paneli `/admin/davet-kodlari` üzerinden CRUD: kod, açıklama, geçerlilik (Zirve/Fuar/Her ikisi), kullanım limiti (0=sınırsız), aktif/pasif toggle, son kullanma tarihi. Public form'da real-time doğrulama (yeşil/kırmızı feedback), submit butonu kod doğrulanana kadar disabled. Backend: `_check_invite_code` helper, `POST /api/register/validate-code`, `GET/POST/PUT/DELETE /api/admin/invite-codes`. Kayıt başarılı olduğunda `used_count` otomatik artar.
- [x] **2026-02-09 — QR Yaka Kartı Check-in Sistemi**: Admin paneline `/admin/checkin` sayfası eklendi.
- [x] **2026-02-09 — Sponsor Tier "Verildi" İşaretlemesi**: Ana Sponsor satıldı için VERİLDİ diagonal ribbon + "SAHİBİNİ BULDU" subtitle + disabled gri buton "Bu Paket Verildi". Form dropdown'ında "Ana Sponsor (verildi — bekleme listesi)". Final CTA mesajı güncellendi.
- [x] **2026-02-09 — Konuşmacı/Sponsor Başvuru Sayfası Conversion Redesign**: `/konusmaci-basvuru` sayfası tam landing page'e dönüştürüldü.
- [x] **Email Verification (Double Opt-in) UI**: VisitorRegisterPage.jsx başarı ekranı "E-postanızı Kontrol Edin" + 4 adımlı doğrulama talimatı şeklinde güncellendi.

### P0 (Pre-launch)
- [ ] SENDGRID_API_KEY environment variable
- [ ] Real speaker photos (currently stock photos)
- [ ] Real sponsor logos
- [ ] Verify form fields with user once

### P1 (Important)
- [ ] Rate limiting on `/api/auth/login` (slowapi)
- [ ] JWT_SECRET fail-fast on missing env (remove fallback)
- [ ] Image upload (file, not URL)
- [ ] Rich text editor for blog content
- [ ] Email template management in admin
- [ ] Sponsor package price fields admin-editable
- [ ] Exhibitor stand price quote field admin-editable

### P2 (Nice to have)
- [x] QR code check-in scanner at entrance (DONE — /admin/checkin via html5-qrcode, iOS Safari fixes applied)
- [x] API Keys management for 3rd party fair scanners (DONE 2026-04-30 — admin page /admin/api-anahtarlari + /api/external/checkin, /api/external/guests with X-API-Key header; valid_for scope: summit / fair / both; usage tracking; 17/17 backend tests passing)
- [x] Public no-login mobile staff scanner (DONE 2026-04-30 — route /tarama/:apiKey, reuses existing API key as URL token; revokes instantly when key set inactive; mobile-optimized UI with vibration + audio feedback)
- [ ] Photo gallery for past events
- [ ] Analytics dashboard (visitor counts, conversion rates)
- [ ] Multi-language (EN / TR)
- [ ] Password reset flow
- [ ] Refactor `server.py` (~2750 lines) into `routers/` modules — deferred until AFTER the event per user
- [ ] Sponsor package prices/perks editable from admin panel

---

## Speakers (Seeded)
1. **Muhammet Özdemir** — Zirve Sahibi & Gayrimenkul Yatırım Uzmanı (FEATURED)
2. Büşra Kiraz — Gayrimenkul Hukuku Uzmanı
3. Murat Gültekin — Bölgesel Gayrimenkul Danışmanı
4. Oğuzhan Öztürk — Yatırım Danışmanı & Psikolog
