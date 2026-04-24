import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu, X, Home, Mic2, ListOrdered, Calendar, FileText,
  UserPlus, Ticket, MapPin, Mail, Phone
} from "lucide-react";

const navLinks = [
  { label: "Ana Sayfa", href: "/", icon: Home },
  { label: "Konuşmacılar", href: "/konusmacilar", icon: Mic2 },
  { label: "Program", href: "/program", icon: ListOrdered },
  { label: "Etkinlikler", href: "/etkinlikler", icon: Calendar },
  { label: "Blog", href: "/blog", icon: FileText },
];

const ctaLinks = [
  { label: "Ücretsiz Üyelik", href: "/uyelik", icon: UserPlus },
  { label: "Zirve Kaydı", href: "/zirve-kaydi", icon: Ticket },
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

  // Lock body scroll when drawer open
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
          <div className="flex items-center justify-between py-3">
            {/* Left: Drawer toggle + Logo */}
            <div className="flex items-center gap-3">
              <button
                className="p-2 -ml-2 text-summit-navy hover:bg-summit-orange/10 rounded transition-colors"
                onClick={() => setDrawerOpen(true)}
                aria-label="Menüyü aç"
                data-testid="drawer-open-btn"
              >
                <Menu size={24} />
              </button>

              <Link to="/" className="flex items-center gap-3" data-testid="nav-logo">
                <div className="relative">
                  <div className="w-11 h-11 rounded bg-gradient-to-br from-summit-orange to-summit-yellow flex items-center justify-center shadow-sm">
                    <span className="font-display font-bold text-white text-base tracking-wider">AYZ</span>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <div className="font-display font-bold text-sm leading-tight text-summit-navy tracking-wider">
                    ARSA YATIRIM ZİRVESİ
                  </div>
                  <div className="text-summit-orange text-xs tracking-[0.2em] uppercase font-bold">
                    2026 · İSTANBUL
                  </div>
                </div>
              </Link>
            </div>

            {/* Desktop links (center) */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`text-sm font-semibold tracking-wide uppercase transition-colors duration-200 ${
                    location.pathname === link.href
                      ? "text-summit-orange"
                      : "text-gray-700 hover:text-summit-navy"
                  }`}
                  data-testid={`nav-link-${link.label}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right CTAs */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/zirve-kaydi"
                className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded text-summit-navy border-2 border-summit-navy hover:bg-summit-navy hover:text-white transition-all"
                data-testid="nav-guest-btn"
              >
                Zirve Kaydı
              </Link>
              <Link
                to="/uyelik"
                className="btn-gold py-2 px-5"
                data-testid="nav-register-btn"
              >
                Ücretsiz Üyelik
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
            {/* Drawer Top Accent */}
            <div className="corp-accent-bar" />

            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded bg-gradient-to-br from-summit-orange to-summit-yellow flex items-center justify-center shadow">
                  <span className="font-display font-bold text-white text-lg tracking-wider">AYZ</span>
                </div>
                <div>
                  <div className="font-display font-bold text-summit-navy text-base leading-tight tracking-wider">
                    ARSA YATIRIM ZİRVESİ
                  </div>
                  <div className="text-summit-orange text-xs tracking-[0.2em] uppercase font-bold">2026</div>
                </div>
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
                    className={`flex items-center gap-4 px-6 py-3.5 border-l-[3px] transition-all ${
                      isActive
                        ? "bg-summit-orange/10 border-summit-orange text-summit-navy font-bold"
                        : "border-transparent text-gray-700 hover:bg-summit-orange/5 hover:border-summit-orange/40 hover:text-summit-navy"
                    }`}
                    data-testid={`drawer-link-${link.label}`}
                  >
                    <Icon size={18} className={isActive ? "text-summit-orange" : "text-gray-400"} />
                    <span className="text-sm font-semibold uppercase tracking-wider">{link.label}</span>
                  </Link>
                );
              })}

              {/* CTA Section */}
              <div className="px-6 pt-8 pb-2">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Kayıt</p>
              </div>
              {ctaLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="flex items-center gap-4 px-6 py-3.5 border-l-[3px] border-transparent hover:bg-summit-orange/5 hover:border-summit-orange/40 text-gray-700 hover:text-summit-navy transition-all"
                    data-testid={`drawer-cta-${link.label}`}
                  >
                    <Icon size={18} className="text-summit-orange" />
                    <span className="text-sm font-semibold uppercase tracking-wider">{link.label}</span>
                  </Link>
                );
              })}

              {/* Contact Info */}
              <div className="mt-8 mx-6 p-5 bg-summit-paper rounded border-l-4 border-summit-orange">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-summit-orange mb-3">İletişim</p>
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-2 text-xs text-gray-700">
                    <Calendar size={13} className="text-summit-orange mt-0.5 shrink-0" />
                    21 Mayıs 2026, Perşembe
                  </li>
                  <li className="flex items-start gap-2 text-xs text-gray-700">
                    <MapPin size={13} className="text-summit-orange mt-0.5 shrink-0" />
                    Hilton İstanbul Bosphorus, Şişli
                  </li>
                  <li className="flex items-start gap-2 text-xs text-gray-700">
                    <Mail size={13} className="text-summit-orange mt-0.5 shrink-0" />
                    info@arsayatirimzirvesi.com
                  </li>
                </ul>
              </div>
            </nav>

            {/* Drawer Footer CTA */}
            <div className="p-6 border-t border-gray-200 bg-summit-paper">
              <Link
                to="/uyelik"
                className="btn-gold w-full text-center text-sm py-3 block"
                data-testid="drawer-footer-cta"
              >
                Ücretsiz Üye Ol
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
