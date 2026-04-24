# Arsa Yatırım Zirvesi 2026 - PRD

## Project Overview
Tam teşekküllü kurumsal zirve websitesi ve yönetici paneli.

**Event**: Arsa Yatırım Zirvesi 2026  
**Date**: 21 Mayıs 2026, Perşembe  
**Venue**: Hilton İstanbul Bosphorus - Zirve Salonu, Şişli/İstanbul  
**Owner**: Muhammet Özdemir

---

## Architecture

### Tech Stack
- **Frontend**: React + TailwindCSS + Lucide Icons
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT (httpOnly cookies)
- **Email**: SendGrid
- **Badge**: HTML/QR code generation

### Colors
- Navy: #0A1128 (background)
- Paper: #14213D (card background)
- Gold: #D4AF37 (primary accent)
- Fonts: Playfair Display (headings), Outfit (body)

---

## What's Been Implemented (v1 - 2026-04)

### Public Site
- [x] Hero section with live countdown to May 21, 2026
- [x] Featured speaker section (Muhammet Özdemir - prominent)
- [x] Speakers page (bento grid layout)
- [x] Program timeline page (12 sessions)
- [x] Past events page (card grid - 3 seeded events)
- [x] Blog list + detail pages (2 seeded posts)
- [x] Member registration form (üyelik)
- [x] Summit guest registration form (zirve kaydı)
- [x] Sponsors section
- [x] Navbar + Footer
- [x] Mobile responsive

### Admin Panel (/admin)
- [x] Admin login (JWT cookie auth)
- [x] Dashboard with stats
- [x] Banner management (CRUD)
- [x] Speaker management (CRUD)
- [x] Sponsor management (CRUD)
- [x] Blog management (CRUD + publish/draft)
- [x] Past events management (CRUD)
- [x] Program management (CRUD)
- [x] Member list (search, delete, CSV export, bulk email)
- [x] Guest list (search, delete, CSV export, bulk email, badge view)

### Backend APIs
- [x] JWT auth (login/logout/me/refresh)
- [x] Public: speakers, sponsors, banners, blog, events, program
- [x] Registration: member + guest
- [x] Badge generation (HTML + QR code)
- [x] Admin CRUD for all entities
- [x] Email broadcast (SendGrid - requires API key config)
- [x] Database seeding on startup

### Seed Data
- 4 speakers (Muhammet Özdemir featured)
- 12 program sessions
- 3 past events
- 2 sponsors (Fırat İnşaat, JNR Fuarcılık)
- 2 blog posts
- 1 banner

---

## Speakers
1. Muhammet Özdemir - Zirve Sahibi & Gayrimenkul Yatırım Uzmanı (FEATURED)
2. Büşra Kiraz - Gayrimenkul Hukuku Uzmanı
3. Murat Gültekin - Bölgesel Gayrimenkul Danışmanı
4. Oğuzhan Öztürk - Yatırım Danışmanı & Psikolog

---

## Pending / Backlog

### P0 (Critical)
- [ ] SendGrid API key configuration (SENDGRID_API_KEY in .env)
- [ ] Real speaker photos (currently stock photos)

### P1 (Important)
- [ ] Image upload functionality (currently URL input only)
- [ ] Rich text editor for blog posts
- [ ] Email templates management in admin
- [ ] Password reset flow
- [ ] Member email verification

### P2 (Nice to have)
- [ ] QR code check-in system for guests
- [ ] Photo gallery for past events
- [ ] Sponsor logo image upload
- [ ] Analytics dashboard (visitor stats)
- [ ] Multi-language support (EN/TR)
- [ ] Social sharing for registration

---

## Environment Variables Required
- MONGO_URL (configured)
- DB_NAME=arsa_yatirim_db (configured)
- JWT_SECRET (configured)
- ADMIN_EMAIL=admin@arsayatirim.com (configured)
- ADMIN_PASSWORD=Admin@2026! (configured)
- SENDGRID_API_KEY=**NEEDS TO BE SET**
- SENDER_EMAIL=noreply@arsayatirimzirvesi.com
