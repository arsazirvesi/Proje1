import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Calendar, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-summit-navy text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-summit-gold to-summit-gold-light flex items-center justify-center shadow">
                <span className="font-heading font-bold text-white">AYZ</span>
              </div>
              <div>
                <div className="font-heading font-bold text-white text-lg leading-tight">Arsa Yatırım Zirvesi</div>
                <div className="text-summit-gold text-xs tracking-widest uppercase">2026</div>
              </div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed max-w-sm">
              Türkiye'nin en kapsamlı arsa yatırımı platformu. Uzman konuşmacılar, pratik bilgiler ve güçlü networking fırsatları.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-heading text-white text-sm mb-4 font-semibold">Hızlı Bağlantılar</h4>
            <ul className="space-y-2">
              {[["Ana Sayfa", "/"], ["Konuşmacılar", "/konusmacilar"], ["Program", "/program"], ["Etkinlikler", "/etkinlikler"], ["Blog", "/blog"]].map(([label, href]) => (
                <li key={href}>
                  <Link to={href} className="text-white/55 hover:text-summit-gold text-sm transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading text-white text-sm mb-4 font-semibold">İletişim</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Calendar size={14} className="text-summit-gold mt-0.5 shrink-0" />
                <span className="text-white/55 text-sm">21 Mayıs 2026, Perşembe</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={14} className="text-summit-gold mt-0.5 shrink-0" />
                <span className="text-white/55 text-sm">Hilton İstanbul Bosphorus, Şişli</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail size={14} className="text-summit-gold mt-0.5 shrink-0" />
                <span className="text-white/55 text-sm">info@arsayatirimzirvesi.com</span>
              </li>
            </ul>
            <div className="mt-5">
              <Link to="/uyelik" className="btn-gold text-xs py-2 px-4 inline-block" data-testid="footer-register-btn">
                Ücretsiz Üye Ol
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-white/35 text-xs">© 2026 Arsa Yatırım Zirvesi. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-2 text-white/35 text-xs flex-wrap justify-center">
            <span>Ana Sponsor:</span>
            <span className="text-summit-gold font-medium">Fırat İnşaat & Gayrimenkul</span>
            <span>|</span>
            <span>Organizasyon:</span>
            <span className="text-summit-gold font-medium">JNR Fuarcılık</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
