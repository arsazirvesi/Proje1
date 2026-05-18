import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";
import { X, ArrowRight } from "lucide-react";
import { API_BASE as API } from "../lib/api";

// Page key → URL prefix mapping
const PAGE_MAP = {
  home: "/",
  program: "/program",
  speakers: "/konusmacilar",
  fair: "/fuar",
  blog: "/blog",
  game: "/yatirim-oyunu",
};

const matchesPage = (pages, pathname) => {
  if (!pages || pages.length === 0) return true;
  return pages.some((p) => {
    const url = PAGE_MAP[p];
    if (!url) return false;
    if (url === "/") return pathname === "/";
    return pathname === url || pathname.startsWith(url + "/");
  });
};

// dismissed banners cached per session
const SESSION_KEY = "ayz-banner-dismissed";

export default function PopupBannerHost() {
  const { pathname } = useLocation();
  const [banner, setBanner] = useState(null);
  const [show, setShow] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  useEffect(() => {
    // Don't show popups in admin / expert
    if (pathname.startsWith("/admin") || pathname.startsWith("/uzman") || pathname.startsWith("/tarama")) return;

    let cancelled = false;
    let timer = null;
    (async () => {
      try {
        // Find current page key
        const pageKey = Object.entries(PAGE_MAP).find(([, url]) => {
          if (url === "/") return pathname === "/";
          return pathname === url || pathname.startsWith(url + "/");
        })?.[0];

        const { data } = await axios.get(`${API}/banners`, { params: pageKey ? { page: pageKey } : {} });
        if (cancelled) return;
        const modals = (data || []).filter((b) => b.display_mode === "modal" && matchesPage(b.pages, pathname));
        if (modals.length === 0) return;

        // Take the first not dismissed in this session
        const dismissed = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "[]");
        const candidate = modals.find((b) => !dismissed.includes(b.id));
        if (!candidate) return;
        setBanner(candidate);
        timer = setTimeout(() => { if (!cancelled) setShow(true); }, (candidate.delay_seconds || 0) * 1000);
      } catch {/* ignore */}
    })();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [pathname]);

  const dismiss = () => {
    if (banner) {
      try {
        const dismissed = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "[]");
        if (!dismissed.includes(banner.id)) dismissed.push(banner.id);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(dismissed));
      } catch {/* ignore */}
    }
    setShow(false);
  };

  if (!banner || !show) return null;

  const imageSrc = (isMobile && banner.image_url_mobile) ? banner.image_url_mobile : banner.image_url;
  const cta = banner.cta_url || null;
  const isExternal = cta && /^(https?:)?\/\//.test(cta);
  const ButtonInner = (
    <>
      {banner.cta_text || "Detaylı İncele"} <ArrowRight size={15} />
    </>
  );

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 sm:px-6 animate-fade-in" data-testid="popup-banner">
      <div onClick={dismiss} className="absolute inset-0 bg-summit-navy/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up max-h-[92vh] flex flex-col">
        <button onClick={dismiss}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-gray-200 flex items-center justify-center text-summit-navy shadow-md"
          data-testid="popup-banner-close"
          aria-label="Kapat"
        >
          <X size={16} />
        </button>

        {imageSrc && (
          <div className="bg-summit-paper">
            <img src={imageSrc} alt={banner.title || "Banner"} className="w-full h-auto block max-h-[55vh] object-cover" />
          </div>
        )}

        {(banner.title || banner.subtitle || cta) && (
          <div className="p-5 sm:p-7">
            {banner.title && (
              <h3 className="font-heading text-summit-navy text-xl sm:text-2xl font-bold leading-tight">
                {banner.title}
              </h3>
            )}
            {banner.subtitle && (
              <p className="text-gray-600 text-sm sm:text-base mt-2 leading-relaxed">{banner.subtitle}</p>
            )}
            {cta && (
              <div className="mt-5">
                {isExternal ? (
                  <a href={cta} target="_blank" rel="noopener noreferrer"
                    onClick={dismiss}
                    className="inline-flex items-center gap-2 bg-summit-navy hover:bg-summit-navy-dark text-white font-bold text-sm px-6 py-3 rounded-lg transition-colors"
                    data-testid="popup-banner-cta">
                    {ButtonInner}
                  </a>
                ) : (
                  <Link to={cta} onClick={dismiss}
                    className="inline-flex items-center gap-2 bg-summit-navy hover:bg-summit-navy-dark text-white font-bold text-sm px-6 py-3 rounded-lg transition-colors"
                    data-testid="popup-banner-cta">
                    {ButtonInner}
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
