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
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-summit-navy/95 backdrop-blur-xl shadow-lg border-b border-summit-gold/10" : "bg-transparent"
      }`}
      data-testid="navbar"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3" data-testid="nav-logo">
            <div className="w-10 h-10 rounded-lg bg-gold-gradient flex items-center justify-center">
              <span className="font-heading font-bold text-summit-navy text-sm">AYZ</span>
            </div>
            <div>
              <div className="font-heading font-bold text-white text-sm leading-tight">Arsa Yatırım</div>
              <div className="text-summit-gold text-xs tracking-widest uppercase">Zirvesi 2026</div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-body transition-colors duration-200 ${
                  location.pathname === link.href
                    ? "text-summit-gold"
                    : "text-summit-text-secondary hover:text-white"
                }`}
                data-testid={`nav-link-${link.label}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/uyelik"
              className="btn-gold text-sm py-2 px-5"
              data-testid="nav-register-btn"
            >
              Ücretsiz Kayıt
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            data-testid="mobile-menu-btn"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-summit-paper border-t border-summit-gold/10 px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="block text-summit-text-secondary hover:text-summit-gold py-2 text-sm font-body"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/uyelik"
            className="block btn-gold text-center text-sm py-2.5 mt-2"
          >
            Ücretsiz Kayıt
          </Link>
        </div>
      )}
    </nav>
  );
}
