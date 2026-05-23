import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import {
  Crown, Sparkles, ArrowRight, X, Calendar, Linkedin, Instagram, Twitter,
  Users, ChevronRight,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { API_BASE as API } from "../../lib/api";

const SITE = "https://arsayatirimzirvesi.com";

export default function ZirveAilesiPage() {
  const [settings, setSettings] = useState(null);
  const [speakers, setSpeakers] = useState([]);
  const [yearFilter, setYearFilter] = useState("all");
  const [openDetail, setOpenDetail] = useState(null);

  useEffect(() => {
    axios.get(`${API}/family/settings`).then(r => setSettings(r.data || null));
    axios.get(`${API}/speakers`).then(r => setSpeakers(r.data || []));
  }, []);

  const founders = useMemo(() => speakers.filter(s => s.is_founder), [speakers]);
  const regulars = useMemo(() => {
    const list = speakers.filter(s => s.show_in_family !== false && !s.is_founder);
    // Most recent year first
    return list.sort((a, b) => {
      const ay = Math.max(...(a.summit_years || [0]));
      const by = Math.max(...(b.summit_years || [0]));
      if (by !== ay) return by - ay;
      return (a.order || 0) - (b.order || 0);
    });
  }, [speakers]);
  const allYears = useMemo(() => {
    const set = new Set();
    speakers.forEach(s => (s.summit_years || []).forEach(y => set.add(y)));
    return Array.from(set).sort((a, b) => b - a);
  }, [speakers]);

  const filtered = useMemo(() => {
    if (yearFilter === "all") return regulars;
    const y = Number(yearFilter);
    return regulars.filter(s => (s.summit_years || []).includes(y));
  }, [regulars, yearFilter]);

  if (!settings) {
    return <div className="min-h-screen bg-summit-navy flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  const canonical = `${SITE}${settings.canonical_path || "/zirve-ailesi"}`;
  const t = settings.hero_title || "Zirve Ailesi";
  const accent = settings.hero_accent || "Ailesi";
  const tStart = accent && t.endsWith(accent) ? t.slice(0, t.length - accent.length).trim() : t;
  const tEnd = accent && t.endsWith(accent) ? accent : "";

  const ogImage = settings.og_image || `${SITE}/og-zirve-ailesi.png`;
  const ogTitle = settings.og_title || settings.seo_title;
  const ogDesc = settings.og_description || settings.seo_description;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Ana Sayfa", "item": SITE },
      { "@type": "ListItem", "position": 2, "name": "Zirve Ailesi", "item": canonical },
    ],
  };
  const peopleLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": [...founders, ...regulars].slice(0, 20).map((s, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "Person",
        "name": s.name,
        "jobTitle": s.title,
        ...(s.image_url && { "image": s.image_url }),
        ...(s.bio && { "description": s.bio }),
      },
    })),
  };

  return (
    <div className="min-h-screen bg-white" data-testid="zirve-ailesi-page">
      <Helmet>
        <title>{settings.seo_title}</title>
        <meta name="description" content={settings.seo_description} />
        <meta name="keywords" content={settings.seo_keywords} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDesc} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={ogImage} />
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
        <script type="application/ld+json">{JSON.stringify(peopleLd)}</script>
      </Helmet>

      <Navbar />

      <nav aria-label="Breadcrumb" className="bg-gray-50 border-b border-gray-200 py-2.5 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-gray-500">
          <Link to="/" className="hover:text-summit-navy">Ana Sayfa</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-summit-navy font-semibold">Zirve Ailesi</span>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative bg-summit-navy text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-summit-navy via-summit-navy to-summit-navy-dark" />
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle, #C9A961 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-amber-500/15 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="inline-flex items-center gap-2 bg-amber-400/15 border border-amber-400/40 rounded-full px-3 py-1.5 mb-5">
            <Sparkles size={13} className="text-amber-300" />
            <span className="text-amber-300 text-[11px] uppercase tracking-[0.2em] font-bold">{settings.hero_overline}</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-4">
            {tStart}{tEnd && <><br /><span className="text-amber-400">{tEnd}</span></>}
          </h1>
          <h2 className="text-base sm:text-lg lg:text-xl text-white/85 max-w-2xl leading-relaxed">{settings.hero_subtitle}</h2>
        </div>
      </section>

      {/* FOUNDER */}
      {founders.length > 0 && (
        <section className="py-14 bg-summit-paper border-t border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <span className="section-overline inline-flex items-center gap-1.5"><Crown size={12} className="text-amber-500" /> {settings.founder_title}</span>
              <h3 className="gyoder-section-title gyoder-section-title-center inline-block mt-2">Kurucumuz</h3>
            </div>
            {founders.map(f => (
              <FounderCard key={f.id} sp={f} onOpen={() => setOpenDetail(f)} founderTitle={settings.founder_title} />
            ))}
          </div>
        </section>
      )}

      {/* SPEAKERS */}
      <section className="py-14 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="section-overline inline-flex items-center gap-1.5"><Users size={12} className="text-amber-500" /> Saha Uzmanları</span>
            <h3 className="gyoder-section-title gyoder-section-title-center inline-block mt-2">{settings.speakers_title || "Konuşmacılarımız"}</h3>
            {settings.speakers_subtitle && <p className="text-gray-500 text-sm mt-2 max-w-2xl mx-auto">{settings.speakers_subtitle}</p>}
          </div>

          {allYears.length > 1 && (
            <div className="flex flex-wrap justify-center gap-2 mb-8" data-testid="year-filter">
              <FilterPill active={yearFilter === "all"} onClick={() => setYearFilter("all")}>Tüm Zirveler</FilterPill>
              {allYears.map(y => (
                <FilterPill key={y} active={yearFilter === String(y)} onClick={() => setYearFilter(String(y))}>{y}</FilterPill>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-12">Bu yıl için kayıt yok.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(sp => (
                <SpeakerCard key={sp.id} sp={sp} onOpen={() => setOpenDetail(sp)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* DETAIL MODAL */}
      {openDetail && <DetailModal sp={openDetail} onClose={() => setOpenDetail(null)} founderTitle={settings.founder_title} />}

      <Footer />
    </div>
  );
}

function FounderCard({ sp, onOpen, founderTitle }) {
  return (
    <button onClick={onOpen} className="group w-full bg-white border border-gray-200 rounded-2xl overflow-hidden text-left hover:shadow-xl transition-all" data-testid="founder-card">
      <div className="grid sm:grid-cols-[280px_1fr]">
        <div className="h-72 sm:h-auto bg-cover bg-center" style={{
          backgroundImage: sp.image_url ? `url(${sp.image_url})` : "linear-gradient(135deg, #22316a, #1A264F)",
          backgroundPosition: 'center 25%',
        }} />
        <div className="p-6 sm:p-8 flex flex-col justify-center">
          <div className="inline-flex items-center gap-1.5 self-start bg-amber-100 border border-amber-300 text-amber-700 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider mb-3">
            <Crown size={10} /> {sp.founder_role || founderTitle}
          </div>
          <h3 className="font-heading text-2xl sm:text-3xl font-bold text-summit-navy leading-tight mb-1">{sp.name}</h3>
          <p className="text-summit-navy text-sm font-semibold uppercase tracking-wide mb-3">{sp.title}</p>
          {sp.bio && <p className="text-gray-700 text-sm leading-relaxed line-clamp-4">{sp.bio}</p>}
          <div className="mt-5 flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-summit-navy font-bold text-sm group-hover:text-amber-600 transition-colors">
              Detaylı Biyografi <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
            <SocialIcons sp={sp} />
          </div>
        </div>
      </div>
    </button>
  );
}

function SpeakerCard({ sp, onOpen }) {
  return (
    <button onClick={onOpen} className="group bg-white border border-gray-200 rounded-md overflow-hidden text-left hover:border-amber-400 hover:shadow-md transition-all" data-testid={`speaker-card-${sp.id}`}>
      <div className="h-48 sm:h-52 bg-cover bg-center" style={{
        backgroundImage: sp.image_url ? `url(${sp.image_url})` : "linear-gradient(135deg, #22316a, #1A264F)",
        backgroundPosition: 'center 20%',
      }} />
      <div className="p-3.5">
        <h4 className="font-heading text-summit-navy text-sm leading-tight font-bold line-clamp-1">{sp.name}</h4>
        {sp.title && <p className="text-gray-500 text-[11px] mt-1 line-clamp-1">{sp.title}</p>}
        {(sp.summit_years || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5 pt-2.5 border-t border-gray-100">
            {(sp.summit_years || []).sort((a,b)=>b-a).slice(0, 3).map(y => (
              <span key={y} className="bg-summit-navy text-amber-400 rounded px-1.5 py-0.5 text-[9px] font-bold tabular-nums">{y}</span>
            ))}
            {(sp.summit_years || []).length > 3 && (
              <span className="text-gray-400 text-[9px] font-bold">+{(sp.summit_years || []).length - 3}</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

function FilterPill({ active, onClick, children }) {
  return (
    <button onClick={onClick} data-testid={`year-${children}`}
      className={`px-3.5 py-2 rounded-full text-xs font-bold transition-colors ${active ? "bg-summit-navy text-white" : "bg-summit-paper border border-gray-200 text-gray-600 hover:border-summit-navy/40"}`}>
      {children}
    </button>
  );
}

function SocialIcons({ sp }) {
  const items = [
    sp.social_linkedin && { url: sp.social_linkedin, icon: Linkedin },
    sp.social_instagram && { url: sp.social_instagram, icon: Instagram },
    sp.social_twitter && { url: sp.social_twitter, icon: Twitter },
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <div className="flex items-center gap-1.5">
      {items.map((it, i) => (
        <a key={i} href={it.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          className="w-7 h-7 rounded-md bg-summit-paper border border-gray-200 flex items-center justify-center text-gray-500 hover:text-summit-navy">
          <it.icon size={12} />
        </a>
      ))}
    </div>
  );
}

function DetailModal({ sp, onClose, founderTitle }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) onClose(); }} data-testid="speaker-detail-modal">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
          <div className="relative">
            <div className="h-56 sm:h-72 bg-cover bg-center" style={{
              backgroundImage: sp.image_url ? `url(${sp.image_url})` : "linear-gradient(135deg, #22316a, #1A264F)",
              backgroundPosition: 'center 20%',
            }} />
            <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-summit-navy flex items-center justify-center shadow-md">
              <X size={16} />
            </button>
            {sp.is_founder && (
              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-amber-400 text-summit-navy rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                <Crown size={10} /> {sp.founder_role || founderTitle || "Kurucu"}
              </div>
            )}
          </div>
          <div className="p-6 sm:p-8">
            <h3 className="font-heading text-2xl sm:text-3xl font-bold text-summit-navy leading-tight">{sp.name}</h3>
            {sp.title && <p className="text-summit-navy/80 text-sm font-semibold uppercase tracking-wide mt-1">{sp.title}</p>}

            {(sp.summit_years || []).length > 0 && (
              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1.5 flex items-center gap-1"><Calendar size={11} /> Katıldığı Zirveler</div>
                <div className="flex flex-wrap gap-1.5">
                  {(sp.summit_years || []).sort((a, b) => b - a).map(y => (
                    <span key={y} className="bg-summit-navy text-amber-400 rounded px-2 py-1 text-xs font-bold tabular-nums">{y}</span>
                  ))}
                </div>
              </div>
            )}

            {sp.bio && (
              <div className="mt-5">
                <div className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1.5">Kısa Biyografi</div>
                <p className="text-gray-700 text-sm leading-relaxed">{sp.bio}</p>
              </div>
            )}
            {sp.extended_bio && (
              <div className="mt-5 bg-summit-paper border border-gray-200 rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-wider font-bold text-amber-600 mb-2">Detaylı Bilgi</div>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{sp.extended_bio}</p>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between gap-3">
              <SocialIcons sp={sp} />
              <button onClick={onClose} className="text-summit-navy font-bold text-sm hover:underline">Kapat</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
