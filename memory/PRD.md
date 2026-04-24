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
- **Email**: SendGrid (requires SENDGRID_API_KEY)
- **Badge**: HTML/QR code generation

### Corporate Identity (AK Parti inspired)
- **Primary**: #F39200 (summit-orange)
- **Accent**: #FFCD00 (summit-yellow)
- **Navy**: #0F2C5C (summit-navy, kurumsal koyu renk)
- **Paper**: #FAFAFA (soft background)
- **Fonts**:
  - Headings: **Bebas Neue** (condensed display, kurumsal)
  - Body: **Inter** (modern sans-serif)

### UX Features
- **Left slide-out drawer** (soldan açılır pencere) via hamburger
- Corporate top accent bar (3px orange→yellow gradient)
- White/light background (no dark theme)
- Letter-tracking & uppercase labels (kurumsal)

---

## What's Been Implemented

### v1 (2026-04) - Initial launch
- All public pages, admin panel, CRUD, auth

### v2 (2026-04) - Light theme refactor
- Full light/white theme across all pages
- XSS escape fix on /api/badge/{id}
- Email send endpoint gracefully handles missing SendGrid

### v3 (2026-04-24) - AK Parti corporate redesign
- [x] Color palette replaced: gold → AK Parti orange/yellow
- [x] Typography swapped: Playfair/Outfit → Bebas Neue + Inter
- [x] LEFT slide-out drawer with full navigation + contact info + CTA
- [x] HomePage hero redesigned with split-grid layout + countdown card
- [x] Corporate top accent bar on all pages
- [x] Footer returned to navy with orange accent for contrast

### Public Site
- [x] Hero section with live countdown to May 21, 2026 (split layout)
- [x] Featured speaker section (Muhammet Özdemir - prominent)
- [x] Speakers page (bento grid layout)
- [x] Program timeline page (12 sessions)
- [x] Past events page (card grid - 3 seeded events)
- [x] Blog list + detail pages
- [x] Member registration form (üyelik)
- [x] Summit guest registration form (zirve kaydı)
- [x] Sponsors section
- [x] Navbar + Left slide-out drawer + Footer
- [x] Mobile responsive

### Admin Panel (/admin)
- [x] Admin login (JWT cookie auth)
- [x] Dashboard with stats (4 stat cards)
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
- [x] Badge generation (HTML + QR code, XSS-escaped)
- [x] Admin CRUD for all entities
- [x] Email broadcast (SendGrid - requires API key; returns sendgrid_configured flag)
- [x] Database seeding on startup

---

## Speakers
1. Muhammet Özdemir - Zirve Sahibi & Gayrimenkul Yatırım Uzmanı (FEATURED)
2. Büşra Kiraz - Gayrimenkul Hukuku Uzmanı
3. Murat Gültekin - Bölgesel Gayrimenkul Danışmanı
4. Oğuzhan Öztürk - Yatırım Danışmanı & Psikolog

---

## Pending / Backlog

### P0 (Critical)
- [ ] SENDGRID_API_KEY env variable to enable email broadcasts
- [ ] Real speaker photos (currently stock photos)

### P1 (Important)
- [ ] Image upload functionality (currently URL input only)
- [ ] Rich text editor for blog posts
- [ ] Email templates management in admin
- [ ] Password reset flow
- [ ] Member email verification
- [ ] Rate limiting on /api/auth/login

### P2 (Nice to have)
- [ ] QR code check-in system for guests
- [ ] Photo gallery for past events
- [ ] Sponsor logo image upload
- [ ] Analytics dashboard (visitor stats)
- [ ] Multi-language support (EN/TR)
- [ ] Social sharing for registration
- [ ] Refactor server.py into routers/ modules (currently 865 lines)

---

## Environment Variables Required
- MONGO_URL (configured)
- DB_NAME=arsa_yatirim_db (configured)
- JWT_SECRET (configured)
- ADMIN_EMAIL=admin@arsayatirim.com (configured)
- ADMIN_PASSWORD=Admin@2026! (configured)
- SENDGRID_API_KEY=**NEEDS TO BE SET**
- SENDER_EMAIL=noreply@arsayatirimzirvesi.com
