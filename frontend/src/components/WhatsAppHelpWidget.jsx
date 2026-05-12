import React, { useState, useEffect } from "react";
import axios from "axios";
import { MessageCircle, X, Send } from "lucide-react";
import { API_BASE as API } from "../lib/api";

/**
 * Floating WhatsApp help widget.
 * - Bottom-right pill button on every page.
 * - Click → slide-in card with quick-reply options + direct WhatsApp link.
 * - Reads phone/email/whatsapp from /api/seo so admin can change without redeploy.
 */
export default function WhatsAppHelpWidget() {
  const [open, setOpen] = useState(false);
  const [seo, setSeo] = useState({});
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    axios.get(`${API}/seo`).then(r => setSeo(r.data || {})).catch(() => {});
  }, []);

  // After 4s show the hint bubble once per session
  useEffect(() => {
    const seen = sessionStorage.getItem("wa_hint_shown");
    if (seen) return;
    const t = setTimeout(() => {
      setShowHint(true);
      sessionStorage.setItem("wa_hint_shown", "1");
      setTimeout(() => setShowHint(false), 6000);
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  const waLink = seo.social_whatsapp || "https://wa.me/905352599377";
  const phone = seo.contact_phone || "+90 535 259 93 77";

  const buildWaMessage = (preset) => {
    const base = waLink.split("?")[0];
    return `${base}?text=${encodeURIComponent(preset)}`;
  };

  const quickReplies = [
    "Merhaba, Arsa Yatırım Zirvesi 2026 hakkında bilgi almak istiyorum.",
    "Ziyaretçi kaydı / katılım hakkında soru sormak istiyorum.",
    "Stant / sponsor başvurusu yapmak istiyorum.",
    "Konuşmacı başvurusu yapmak istiyorum.",
  ];

  return (
    <>
      {/* Backdrop when open */}
      {open && (
        <div
          className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Slide-in panel from right */}
      <div
        className={`fixed top-0 right-0 z-[100] h-full w-full sm:w-[380px] bg-white shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        data-testid="wa-help-panel"
        role="dialog"
        aria-hidden={!open}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366] text-white p-5 pb-12">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-md hover:bg-white/15 transition-colors"
              aria-label="Kapat"
              data-testid="wa-help-close"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shrink-0">
                <MessageCircle size={22} className="text-white" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-white/80">Canlı Destek</div>
                <div className="font-heading text-lg font-bold leading-tight">Yardıma mı ihtiyacın var?</div>
                <div className="text-xs text-white/85 mt-0.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                  Hemen yanıt veriyoruz
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 -mt-7 pb-4">
            <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100 mb-4">
              <div className="text-sm text-summit-navy leading-relaxed">
                <strong>Merhaba 👋</strong><br/>
                Arsa Yatırım Zirvesi 2026 hakkında sorularınız mı var?
                WhatsApp üzerinden anında yanıt alın.
              </div>
              <div className="mt-3 text-[11px] text-gray-500 flex items-center gap-2 pt-3 border-t border-gray-100">
                📞 <a href={`tel:${phone.replace(/\s/g,'')}`} className="hover:text-summit-navy">{phone}</a>
              </div>
            </div>

            <div className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-2 px-1">Hızlı Mesaj</div>
            <div className="space-y-2">
              {quickReplies.map((q, i) => (
                <a
                  key={i}
                  href={buildWaMessage(q)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="block bg-summit-paper hover:bg-[#25D366]/10 border border-gray-200 hover:border-[#25D366]/40 text-summit-navy rounded-xl p-3 text-sm transition-all group"
                  data-testid={`wa-quick-${i}`}
                >
                  <div className="flex items-start gap-2">
                    <Send size={13} className="text-[#25D366] shrink-0 mt-0.5" />
                    <span className="leading-snug">{q}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Footer big CTA */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe5a] text-white rounded-xl py-3.5 text-sm font-bold transition-colors shadow-lg shadow-green-500/30"
              data-testid="wa-open-chat"
            >
              <MessageCircle size={16} /> WhatsApp Sohbetini Aç
            </a>
            <p className="text-[10px] text-gray-500 text-center mt-2">
              Mesai saatleri içinde genellikle 5 dk içinde yanıtlıyoruz.
            </p>
          </div>
        </div>
      </div>

      {/* Floating bubble + tooltip */}
      <div className="fixed bottom-5 right-5 z-[95] flex flex-col items-end gap-3" data-testid="wa-help-fab-wrap">
        {/* Hint bubble */}
        {showHint && !open && (
          <button
            onClick={() => setOpen(true)}
            className="bg-white text-summit-navy rounded-2xl shadow-2xl border border-gray-200 px-4 py-3 text-sm font-semibold max-w-[260px] text-left animate-in fade-in slide-in-from-right relative"
            data-testid="wa-help-hint"
          >
            <div className="absolute top-2 right-2 text-gray-300 hover:text-gray-600" onClick={(e) => { e.stopPropagation(); setShowHint(false); }}>
              <X size={12} />
            </div>
            <div className="leading-snug pr-3">👋 Sorularınız mı var? <span className="text-[#25D366]">WhatsApp'tan bize yazın!</span></div>
            <div className="absolute -bottom-2 right-7 w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45" />
          </button>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setOpen(true)}
          className="group relative bg-[#25D366] hover:bg-[#1ebe5a] text-white w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl shadow-green-500/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          aria-label="WhatsApp yardım"
          data-testid="wa-help-fab"
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" aria-hidden />
          <MessageCircle size={26} strokeWidth={2.2} className="relative z-10" />
        </button>
      </div>
    </>
  );
}
