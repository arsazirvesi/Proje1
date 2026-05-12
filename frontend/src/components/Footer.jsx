import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  MapPin, Calendar, Mail, Phone, ArrowRight,
  Instagram, Linkedin, Facebook, Twitter, Youtube, MessageCircle, Share2
} from "lucide-react";
import { API_BASE as API } from "../lib/api";

const SOCIALS = [
  { key: "social_instagram", icon: Instagram, label: "Instagram" },
  { key: "social_linkedin", icon: Linkedin, label: "LinkedIn" },
  { key: "social_facebook", icon: Facebook, label: "Facebook" },
  { key: "social_twitter", icon: Twitter, label: "X" },
  { key: "social_youtube", icon: Youtube, label: "YouTube" },
  { key: "social_tiktok", icon: Share2, label: "TikTok" },
  { key: "social_whatsapp", icon: MessageCircle, label: "WhatsApp" },
];

export default function Footer() {
  const [seo, setSeo] = useState({});

  useEffect(() => {
    axios.get(`${API}/seo`).then(r => setSeo(r.data || {})).catch(() => setSeo({}));
  }, []);

  const visibleSocials = SOCIALS.filter(s => (seo[s.key] || "").trim() !== "");
  const contactEmail = seo.contact_email || "info@arsayatirimzirvesi.com";
  const contactPhone = seo.contact_phone || "";
  const contactAddress = seo.contact_address || "Hilton İstanbul Bosphorus, Şişli";

  return (
    <footer className="bg-summit-navy text-white pt-16 pb-8 relative" data-testid="site-footer">
      <div className="absolute top-0 left-0 right-0 corp-accent-bar" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-5">
              <div className="font-heading font-bold text-white text-xl leading-tight">Arsa Yatırım Zirvesi</div>
              <div className="text-summit-accent text-[0.68rem] tracking-[0.2em] uppercase font-semibold mt-1">2026 · İstanbul</div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed max-w-sm">
              Türkiye'nin en kapsamlı arsa yatırımı platformu. Uzman konuşmacılar, pratik bilgiler ve güçlü networking fırsatları.
            </p>
            <Link to="/ziyaretci-kaydi" className="inline-flex items-center gap-2 mt-5 text-summit-accent font-semibold text-sm hover:gap-3 transition-all" data-testid="footer-register-btn">
              Ücretsiz Ziyaretçi Kaydı <ArrowRight size={14} />
            </Link>

            {/* Social media */}
            {visibleSocials.length > 0 && (
              <div className="mt-7" data-testid="footer-social-row">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-semibold mb-3">Bizi takip edin</div>
                <div className="flex flex-wrap gap-2">
                  {visibleSocials.map(s => {
                    const Icon = s.icon;
                    return (
                      <a
                        key={s.key}
                        href={seo[s.key]}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s.label}
                        title={s.label}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-summit-accent hover:text-summit-navy text-white border border-white/15 flex items-center justify-center transition-all hover:scale-110"
                        data-testid={`footer-${s.key}`}
                      >
                        <Icon size={16} />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Links */}
          <div>
            <h4 className="font-heading text-white text-base mb-4 font-semibold">Hızlı Bağlantılar</h4>
            <ul className="space-y-2.5">
              {[
                ["Ana Sayfa", "/"],
                ["Konuşmacılar", "/konusmacilar"],
                ["Program", "/program"],
                ["Etkinlikler", "/etkinlikler"],
                ["Yatırım Simülatörü", "/yatirim-oyunu"],
                ["Blog", "/blog"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link to={href} className="text-white/70 hover:text-summit-accent text-sm transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading text-white text-base mb-4 font-semibold">İletişim</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Calendar size={14} className="text-summit-accent mt-0.5 shrink-0" />
                <span className="text-white/70 text-sm">21 Mayıs 2026, Perşembe</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={14} className="text-summit-accent mt-0.5 shrink-0" />
                <span className="text-white/70 text-sm whitespace-pre-line">{contactAddress}</span>
              </li>
              {contactPhone && (
                <li className="flex items-start gap-2">
                  <Phone size={14} className="text-summit-accent mt-0.5 shrink-0" />
                  <a href={`tel:${contactPhone.replace(/\s/g,'')}`} className="text-white/70 hover:text-summit-accent text-sm transition-colors" data-testid="footer-contact-phone">{contactPhone}</a>
                </li>
              )}
              <li className="flex items-start gap-2">
                <Mail size={14} className="text-summit-accent mt-0.5 shrink-0" />
                <a href={`mailto:${contactEmail}`} className="text-white/70 hover:text-summit-accent text-sm transition-colors" data-testid="footer-contact-email">{contactEmail}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <p className="text-white/50 text-xs">© 2026 Arsa Yatırım Zirvesi. Tüm hakları saklıdır.</p>
            <Link to="/gizlilik" className="text-white/60 hover:text-summit-accent text-xs transition-colors">Gizlilik</Link>
            <Link to="/kvkk" className="text-white/60 hover:text-summit-accent text-xs transition-colors">KVKK</Link>
          </div>
          <div className="flex items-center gap-2 text-white/50 text-xs flex-wrap justify-center">
            <span>Ana Sponsor:</span>
            <a href="https://firatconstruction.com" target="_blank" rel="noopener noreferrer" className="text-summit-accent font-semibold hover:underline" data-testid="footer-firat-link">FIRAT CONSTRUCTION YAPI A.Ş.</a>
            <span>|</span>
            <span>Organizasyon:</span>
            <span className="text-summit-accent font-semibold">JNR Fuarcılık</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
