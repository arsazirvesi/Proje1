import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu, X, Home, Mic2, ListOrdered, Calendar, FileText,
  Ticket, MapPin, Mail, Building2, Megaphone, UserPlus
} from "lucide-react";

const navLinks = [
  { label: "Ana Sayfa", href: "/", icon: Home },
  { label: "Konuşmacılar", href: "/konusmacilar", icon: Mic2 },
  { label: "Program", href: "/program", icon: ListOrdered },
  { label: "Fuar Alanı", href: "/fuar-alani", icon: Building2 },
  { label: "Etkinlikler", href: "/etkinlikler", icon: Calendar },
  { label: "Blog", href: "/blog", icon: FileText },
];

const ctaLinks = [
  { label: "Ziyaretçi Kaydı", href: "/ziyaretci-kaydi", icon: Ticket, highlight: true },
  { label: "Fuar Stant Başvurusu", href: "/fuar-stant-kaydi", icon: Building2 },
  { label: "Konuşmacı / Sponsor", href: "/konusmaci-basvuru", icon: Megaphone },
  { label: "Bülten Üyeliği", href: "/bulten", icon: UserPlus },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setDrawerOpen(false), [location]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <>
      {/* Top corporate bar */}
      <div className="corp-accent-bar fixed top-0 left-0 right-0 z-[60]" />

      <nav
        className={`fixed top-[3px] left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white shadow-md border-b border-gray-200"
            : "bg-white/95 backdrop-blur border-b border-gray-100"
        }`}
        data-testid="navbar"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 py-3">
            {/* Left: Drawer toggle (mobile only) + Logo */}
            <div className="flex items-center gap-2 shrink-0 min-w-0">
              <button
                className="lg:hidden p-2 -ml-2 text-summit-navy hover:bg-summit-navy/5 rounded-md transition-colors shrink-0"
                onClick={() => setDrawerOpen(true)}
                aria-label="Menüyü aç"
                data-testid="drawer-open-btn"
              >
                <Menu size={22} />
              </button>

              <Link to="/" className="flex items-center shrink-0" data-testid="nav-logo">
                <div className="leading-tight">
                  <div className="font-heading font-bold text-summit-navy whitespace-nowrap text-[15px] sm:text-base lg:text-[15px] xl:text-base">
                    Arsa Yatırım Zirvesi
                  </div>
                  <div className="text-summit-navy text-[0.6rem] sm:text-[0.65rem] tracking-[0.16em] uppercase font-semibold opacity-70 whitespace-nowrap">
                    2026 · İstanbul
                  </div>
                </div>
              </Link>
            </div>

            {/* Desktop links (center, lg+) */}
            <div className="hidden lg:flex items-center gap-4 xl:gap-7 min-w-0">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                    location.pathname === link.href
                      ? "text-summit-navy font-semibold"
                      : "text-gray-600 hover:text-summit-navy"
                  }`}
                  data-testid={`nav-link-${link.label}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right CTAs */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/yatirim-oyunu"
                className="inline-flex group relative text-xs font-bold px-2.5 sm:px-3 lg:px-3.5 py-2 rounded-md text-summit-navy bg-gradient-to-r from-amber-300 to-amber-400 hover:shadow-lg hover:shadow-amber-500/40 hover:scale-105 transition-all items-center gap-1.5 whitespace-nowrap"
                data-testid="nav-game-btn"
              >
                <span className="animate-pulse">📊</span>
                <span className="hidden xl:inline">Yatırım Simülatörü</span>
                <span className="xl:hidden">Simülatör</span>
              </Link>
              <Link
                to="/ziyaretci-kaydi"
                className="hidden xl:inline-flex items-center text-xs font-semibold px-3.5 py-2 rounded-md text-summit-navy border-2 border-summit-navy hover:bg-summit-navy hover:text-white transition-all whitespace-nowrap"
                data-testid="nav-visitor-btn"
              >
                Ziyaretçi Kaydı
              </Link>
              <Link
                to="/fuar-stant-kaydi"
                className="hidden lg:inline-flex items-center btn-navy py-2 px-3.5 lg:px-4 text-xs whitespace-nowrap"
                data-testid="nav-exhibitor-btn"
              >
                <span className="hidden lg:inline">Stant Başvurusu</span>
                <span className="lg:hidden">Stant</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ===== LEFT SLIDE-OUT DRAWER ===== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[100] flex" data-testid="drawer-overlay">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-summit-navy/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <aside
            className="relative w-[85%] max-w-md bg-white h-full flex flex-col drawer-enter shadow-2xl"
            data-testid="drawer-panel"
          >
            <div className="corp-accent-bar" />

            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <div>
                <div className="font-heading font-bold text-summit-navy text-base leading-tight">
                  Arsa Yatırım Zirvesi
                </div>
                <div className="text-summit-navy text-[0.68rem] tracking-[0.2em] uppercase font-semibold opacity-70">2026 · İstanbul</div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 text-gray-500 hover:text-summit-navy hover:bg-gray-100 rounded transition-colors"
                aria-label="Menüyü kapat"
                data-testid="drawer-close-btn"
              >
                <X size={22} />
              </button>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 overflow-y-auto py-4">
              <div className="px-6 pb-2">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Menü</p>
              </div>
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`flex items-center gap-4 px-6 py-3 border-l-[3px] transition-all ${
                      isActive
                        ? "bg-summit-navy/8 border-summit-navy text-summit-navy font-semibold"
                        : "border-transparent text-gray-700 hover:bg-summit-navy/4 hover:border-summit-navy/40 hover:text-summit-navy"
                    }`}
                    data-testid={`drawer-link-${link.label}`}
                  >
                    <Icon size={17} className={isActive ? "text-summit-navy" : "text-gray-400"} />
                    <span className="text-sm font-medium">{link.label}</span>
                  </Link>
                );
              })}

              {/* CTA Section */}
              <div className="px-6 pt-7 pb-2">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Kayıt ve Başvuru</p>
              </div>

              {/* Game CTA */}
              <Link
                to="/yatirim-oyunu"
                className="mx-6 mb-2 flex items-center gap-3 p-4 bg-gradient-to-r from-amber-300 to-amber-400 rounded-lg text-summit-navy font-bold hover:shadow-lg hover:shadow-amber-500/30 transition-all"
                data-testid="drawer-game-cta"
              >
                <span className="text-2xl">📊</span>
                <div className="flex-1">
                  <div className="text-sm font-bold">Yatırım Simülatörü</div>
                  <div className="text-[11px] font-normal opacity-80">Uzmanlar portföyünü değerlendirsin · 2 dakika</div>
                </div>
                <span className="text-[0.55rem] bg-summit-navy text-white px-2 py-1 rounded font-bold uppercase tracking-wide animate-pulse">Yeni</span>
              </Link>

              {ctaLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`flex items-center gap-4 px-6 py-3 border-l-[3px] transition-all ${
                      link.highlight
                        ? "bg-summit-accent/10 border-summit-accent text-summit-navy font-semibold hover:bg-summit-accent/15"
                        : "border-transparent text-gray-700 hover:bg-summit-navy/4 hover:border-summit-navy/40 hover:text-summit-navy"
                    }`}
                    data-testid={`drawer-cta-${link.label}`}
                  >
                    <Icon size={17} className={link.highlight ? "text-summit-navy" : "text-summit-navy"} />
                    <span className="text-sm font-medium">{link.label}</span>
                    {link.highlight && (
                      <span className="ml-auto text-[0.55rem] bg-summit-accent text-summit-navy px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Popüler</span>
                    )}
                  </Link>
                );
              })}

              {/* Contact */}
              <div className="mt-7 mx-6 p-5 bg-summit-paper rounded-md border-l-4 border-summit-navy">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-summit-navy mb-3">İletişim</p>
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-2 text-xs text-gray-700">
                    <Calendar size={13} className="text-summit-navy mt-0.5 shrink-0" />
                    21 Mayıs 2026, Perşembe
                  </li>
                  <li className="flex items-start gap-2 text-xs text-gray-700">
                    <MapPin size={13} className="text-summit-navy mt-0.5 shrink-0" />
                    Hilton İstanbul Bosphorus, Şişli
                  </li>
                  <li className="flex items-start gap-2 text-xs text-gray-700">
                    <Mail size={13} className="text-summit-navy mt-0.5 shrink-0" />
                    info@arsayatirimzirvesi.com
                  </li>
                </ul>
              </div>
            </nav>

            {/* Drawer Footer CTA */}
            <div className="p-6 border-t border-gray-200 bg-summit-paper">
              <Link
                to="/ziyaretci-kaydi"
                className="btn-navy w-full text-center py-3 block"
                data-testid="drawer-footer-cta"
              >
                Hemen Ziyaretçi Kaydı Oluştur
              </Link>
              <p className="text-center text-xs text-gray-500 mt-3">
                © 2026 Arsa Yatırım Zirvesi
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
