import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Konuşmacılar", href: "/konusmacilar" },
  { label: "Program", href: "/program" },
  { label: "Etkinlikler", href: "/etkinlikler" },
  { label: "Blog", href: "/blog" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur shadow-sm border-b border-gray-100"
          : "bg-white/80 backdrop-blur border-b border-transparent"
      }`}
      data-testid="navbar"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3.5">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3" data-testid="nav-logo">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-summit-gold to-summit-gold-light flex items-center justify-center shadow-sm">
              <span className="font-heading font-bold text-white text-sm">AYZ</span>
            </div>
            <div>
              <div className="font-heading font-bold text-sm leading-tight text-summit-navy">
                Arsa Yatırım
              </div>
              <div className="text-summit-gold text-xs tracking-widest uppercase font-semibold">
                Zirvesi 2026
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors duration-200 ${
                  location.pathname === link.href
                    ? "text-summit-gold"
                    : "text-gray-600 hover:text-summit-navy"
                }`}
                data-testid={`nav-link-${link.label}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/zirve-kaydi"
              className="text-sm font-semibold px-4 py-2 rounded-lg text-summit-navy border border-summit-navy/20 hover:bg-gray-50 transition-all"
              data-testid="nav-guest-btn"
            >
              Zirve Kaydı
            </Link>
            <Link
              to="/uyelik"
              className="btn-gold text-sm py-2 px-5"
              data-testid="nav-register-btn"
            >
              Ücretsiz Üyelik
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-summit-navy"
            onClick={() => setMenuOpen(!menuOpen)}
            data-testid="mobile-menu-btn"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-2 shadow-lg">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="block text-gray-700 hover:text-summit-gold py-2.5 text-sm font-medium border-b border-gray-50"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex gap-3 pt-3">
            <Link to="/zirve-kaydi" className="flex-1 btn-outline-navy text-center text-sm py-2.5">Zirve Kaydı</Link>
            <Link to="/uyelik" className="flex-1 btn-gold text-center text-sm py-2.5">Üye Ol</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
