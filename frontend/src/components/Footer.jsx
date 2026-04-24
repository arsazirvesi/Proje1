import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Calendar, Mail, ArrowRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-summit-navy text-white pt-16 pb-8 relative">
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 corp-accent-bar" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded bg-gradient-to-br from-summit-orange to-summit-yellow flex items-center justify-center shadow">
                <span className="font-display font-bold text-white text-lg tracking-wider">AYZ</span>
              </div>
              <div>
                <div className="font-display font-bold text-white text-lg leading-tight tracking-wider">ARSA YATIRIM ZİRVESİ</div>
                <div className="text-summit-orange text-xs tracking-[0.2em] uppercase font-bold">2026 · İSTANBUL</div>
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed max-w-sm">
              Türkiye'nin en kapsamlı arsa yatırımı platformu. Uzman konuşmacılar, pratik bilgiler ve güçlü networking fırsatları.
            </p>
            <Link to="/uyelik" className="inline-flex items-center gap-2 mt-5 text-summit-orange font-bold text-xs uppercase tracking-widest hover:gap-3 transition-all" data-testid="footer-register-btn">
              Ücretsiz Üye Ol <ArrowRight size={14} />
            </Link>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display text-white text-base mb-4 tracking-wider uppercase">Hızlı Bağlantılar</h4>
            <ul className="space-y-2.5">
              {[["Ana Sayfa", "/"], ["Konuşmacılar", "/konusmacilar"], ["Program", "/program"], ["Etkinlikler", "/etkinlikler"], ["Blog", "/blog"]].map(([label, href]) => (
                <li key={href}>
                  <Link to={href} className="text-white/70 hover:text-summit-orange text-sm transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-white text-base mb-4 tracking-wider uppercase">İletişim</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Calendar size={14} className="text-summit-orange mt-0.5 shrink-0" />
                <span className="text-white/70 text-sm">21 Mayıs 2026, Perşembe</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={14} className="text-summit-orange mt-0.5 shrink-0" />
                <span className="text-white/70 text-sm">Hilton İstanbul Bosphorus, Şişli</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail size={14} className="text-summit-orange mt-0.5 shrink-0" />
                <span className="text-white/70 text-sm">info@arsayatirimzirvesi.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-white/50 text-xs">© 2026 Arsa Yatırım Zirvesi. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-2 text-white/50 text-xs flex-wrap justify-center">
            <span>Ana Sponsor:</span>
            <span className="text-summit-orange font-bold">FIRAT İNŞAAT & GAYRİMENKUL</span>
            <span>|</span>
            <span>Organizasyon:</span>
            <span className="text-summit-orange font-bold">JNR FUARCILIK</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
