import React, { useEffect, useState } from "react";
import { Download, X, Share, Plus, Smartphone } from "lucide-react";

const DISMISS_KEY = "ayz-pwa-dismissed";
const DISMISS_DAYS = 7;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
}

function wasRecentlyDismissed() {
  try {
    const ts = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
    if (!ts) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) return;

    // Android / Chrome / Edge
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 8000); // show after 8s of browsing
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari fallback
    if (isIOS()) {
      setIosMode(true);
      setTimeout(() => setShow(true), 10000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setShow(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShow(false);
    } else {
      dismiss();
    }
    setDeferredPrompt(null);
  };

  if (!show) return null;

  // iOS variant — manual instructions
  if (iosMode) {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:bottom-4 sm:w-[360px] z-[60] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        data-testid="pwa-install-prompt-ios"
      >
        <div className="h-1 bg-gradient-to-r from-summit-navy via-amber-400 to-summit-navy" />
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-summit-navy flex items-center justify-center shrink-0">
              <Smartphone size={20} className="text-amber-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-heading font-bold text-summit-navy text-sm leading-tight">
                Ana Ekrana Ekle
              </div>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Etkinlik günü hızlı erişim için uygulamayı ana ekranınıza ekleyebilirsiniz:
              </p>
              <ol className="text-xs text-gray-700 mt-2 space-y-1.5">
                <li className="flex items-center gap-1.5">
                  <Share size={13} className="text-summit-navy shrink-0" />
                  <span>Safari'de <strong>Paylaş</strong> butonuna dokunun</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Plus size={13} className="text-summit-navy shrink-0" />
                  <span><strong>"Ana Ekrana Ekle"</strong>'yi seçin</span>
                </li>
              </ol>
            </div>
            <button onClick={dismiss} className="text-gray-400 hover:text-gray-700 shrink-0" data-testid="pwa-dismiss-ios">
              <X size={16} />
            </button>
          </div>
          <button
            onClick={dismiss}
            className="w-full mt-3 py-2 text-xs text-gray-500 hover:text-gray-700 font-semibold"
            data-testid="pwa-later-ios"
          >
            Daha sonra
          </button>
        </div>
      </div>
    );
  }

  // Android / Desktop variant
  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:bottom-4 sm:w-[380px] z-[60] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
      data-testid="pwa-install-prompt"
    >
      <div className="h-1 bg-gradient-to-r from-summit-navy via-amber-400 to-summit-navy" />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-summit-navy flex items-center justify-center shrink-0">
            <Download size={20} className="text-amber-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-heading font-bold text-summit-navy text-sm leading-tight">
              Uygulamayı Yükle
            </div>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Arsa Yatırım Zirvesi'ni telefonunuza ekleyin — etkinlik günü <strong>çevrimdışı bile</strong> programa, fuar haritasına ve kayıtlarınıza ulaşın.
            </p>
          </div>
          <button onClick={dismiss} className="text-gray-400 hover:text-gray-700 shrink-0" data-testid="pwa-dismiss">
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={dismiss}
            className="flex-1 py-2 text-xs text-gray-600 hover:text-gray-800 font-semibold rounded-lg border border-gray-200 hover:bg-gray-50"
            data-testid="pwa-later"
          >
            Daha sonra
          </button>
          <button
            onClick={install}
            className="flex-1 py-2 text-xs font-bold rounded-lg bg-summit-navy hover:bg-summit-navy-dark text-white inline-flex items-center justify-center gap-1.5"
            data-testid="pwa-install"
          >
            <Download size={13} /> Yükle
          </button>
        </div>
      </div>
    </div>
  );
}
