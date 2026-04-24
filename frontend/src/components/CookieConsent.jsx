import React, { useState, useEffect } from "react";
import { Cookie, X } from "lucide-react";

const CONSENT_KEY = "cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      // Show after slight delay so it doesn't flash before page renders
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
    window.dispatchEvent(new Event("cookie-consent-change"));
  };

  const reject = () => {
    localStorage.setItem(CONSENT_KEY, "rejected");
    setVisible(false);
    window.dispatchEvent(new Event("cookie-consent-change"));
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[80] bg-white border-t-2 border-summit-navy shadow-2xl"
      data-testid="cookie-consent-banner"
      role="dialog"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-md bg-summit-navy/10 flex items-center justify-center shrink-0">
              <Cookie size={18} className="text-summit-navy" />
            </div>
            <div className="flex-1">
              <p className="text-summit-navy text-sm font-semibold mb-1">Çerez Kullanımı</p>
              <p className="text-gray-600 text-xs leading-relaxed">
                Deneyiminizi iyileştirmek ve site istatistiklerini toplamak için çerez kullanıyoruz. "Kabul Et" butonuna tıklayarak çerez kullanımını onaylamış olursunuz.
                {" "}
                <a href="/gizlilik" className="text-summit-navy font-semibold underline hover:text-summit-navy-dark">Detaylı bilgi</a>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={reject}
              className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-summit-navy border border-gray-200 rounded-md transition-colors"
              data-testid="cookie-reject-btn"
            >
              Reddet
            </button>
            <button
              onClick={accept}
              className="flex-1 sm:flex-none btn-navy px-6 py-2.5 text-sm"
              data-testid="cookie-accept-btn"
            >
              Kabul Et
            </button>
            <button
              onClick={reject}
              className="hidden sm:flex w-9 h-9 items-center justify-center text-gray-400 hover:text-summit-navy transition-colors"
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
