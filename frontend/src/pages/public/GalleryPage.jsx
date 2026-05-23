import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import { X, Play, Image as ImageIcon, Film, Youtube, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { API_BASE as API } from "../../lib/api";

const SITE = "https://arsayatirimzirvesi.com";

function getYouTubeEmbedUrl(item) {
  const id = item.youtube_id || extractYtId(item.youtube_url);
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null;
}
function extractYtId(url) {
  const m = (url || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [lightbox, setLightbox] = useState(null); // index into filtered array

  useEffect(() => {
    axios.get(`${API}/gallery`).then(r => setItems(r.data || [])).finally(() => setLoading(false));
  }, []);

  const years = useMemo(() => {
    const s = new Set(items.map(i => i.year).filter(Boolean));
    return Array.from(s).sort((a, b) => b - a);
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      if (yearFilter !== "all" && String(i.year) !== yearFilter) return false;
      return true;
    });
  }, [items, typeFilter, yearFilter]);

  const openLightbox = (idx) => setLightbox(idx);
  const closeLightbox = () => setLightbox(null);
  const prevItem = () => setLightbox(i => (i - 1 + filtered.length) % filtered.length);
  const nextItem = () => setLightbox(i => (i + 1) % filtered.length);

  useEffect(() => {
    if (lightbox === null) return;
    const handler = (e) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") setLightbox(i => (i - 1 + filtered.length) % filtered.length);
      if (e.key === "ArrowRight") setLightbox(i => (i + 1) % filtered.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, filtered.length]);

  const activeItem = lightbox !== null ? filtered[lightbox] : null;

  return (
    <div className="min-h-screen bg-white" data-testid="gallery-page">
      <Helmet>
        <title>Galeri | Arsa Yatırım Zirvesi — Fotoğraf ve Video Arşivi</title>
        <meta name="description" content="Arsa Yatırım Zirvesi galeri sayfası. Zirve fotoğrafları, konuşmacı videoları ve önemli anlar." />
        <link rel="canonical" href={`${SITE}/galeri`} />
        <meta property="og:title" content="Galeri | Arsa Yatırım Zirvesi" />
        <meta property="og:url" content={`${SITE}/galeri`} />
      </Helmet>

      <Navbar />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-gray-50 border-b border-gray-200 py-2.5 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-gray-500">
          <Link to="/" className="hover:text-summit-navy">Ana Sayfa</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-summit-navy font-semibold">Galeri</span>
        </div>
      </nav>

      {/* Page Header */}
      <div className="relative overflow-hidden" style={{ background: "#1A264F" }}>
        <div className="absolute inset-0 pointer-events-none">
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="gal-diag" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="60" stroke="#C9A961" strokeWidth="1.5" strokeOpacity="0.07"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gal-diag)"/>
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-4"
            style={{ background: "rgba(201,169,97,0.15)", border: "1px solid rgba(201,169,97,0.35)" }}>
            <ImageIcon size={12} style={{ color: "#C9A961" }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#C9A961" }}>Galeri</span>
          </div>
          <h1 className="font-heading text-white text-3xl sm:text-4xl lg:text-5xl leading-tight">
            Zirve <span style={{ color: "#C9A961" }}>Arşivi</span>
          </h1>
          <p className="text-white/65 text-sm sm:text-base mt-3 max-w-xl">
            Geçmiş zirvelerden fotoğraflar, konuşmacı videoları ve önemli anlar.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mr-2">Filtre:</span>
          {[
            ["all", "Tümü"],
            ["image", "Fotoğraflar"],
            ["video", "Videolar"],
            ["youtube", "YouTube"],
          ].map(([v, l]) => (
            <FilterPill key={v} active={typeFilter === v} onClick={() => setTypeFilter(v)}>{l}</FilterPill>
          ))}
          {years.length > 0 && (
            <>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              {years.map(y => (
                <FilterPill key={y} active={yearFilter === String(y)} onClick={() => setYearFilter(String(y))}>{y}</FilterPill>
              ))}
              {yearFilter !== "all" && (
                <FilterPill active={false} onClick={() => setYearFilter("all")}>Tümü Göster</FilterPill>
              )}
            </>
          )}
          <span className="ml-auto text-xs text-gray-400">{filtered.length} öğe</span>
        </div>
      </div>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <ImageIcon size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Henüz galeri içeriği yok.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((item, idx) => (
              <GalleryCard key={item.id} item={item} onClick={() => openLightbox(idx)} />
            ))}
          </div>
        )}
      </section>

      {/* Lightbox */}
      {activeItem && (
        <Lightbox
          item={activeItem}
          onClose={closeLightbox}
          onPrev={filtered.length > 1 ? prevItem : null}
          onNext={filtered.length > 1 ? nextItem : null}
          current={lightbox + 1}
          total={filtered.length}
        />
      )}

      <Footer />
    </div>
  );
}

function FilterPill({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
      style={active
        ? { background: "#1A264F", color: "#fff" }
        : { background: "#f5f5f5", color: "#666", border: "1px solid #e5e5e5" }
      }>
      {children}
    </button>
  );
}

function GalleryCard({ item, onClick }) {
  const thumb = item.thumbnail_url || item.media_url;
  const isVideo = item.type === "video" || item.type === "youtube";

  return (
    <button onClick={onClick}
      className="group relative rounded-lg overflow-hidden bg-gray-100 aspect-video w-full text-left shadow-sm hover:shadow-lg transition-all"
      data-testid={`gallery-card-${item.id}`}>
      {thumb ? (
        <img src={thumb} alt={item.title || "Galeri"} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: "#1A264F" }}>
          {item.type === "image" ? <ImageIcon size={28} className="text-white/30" /> : <Film size={28} className="text-white/30" />}
        </div>
      )}
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
      {/* Play button for videos */}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
            style={{ background: "rgba(201,169,97,0.9)" }}>
            <Play size={18} fill="#1A264F" style={{ color: "#1A264F", marginLeft: 2 }} />
          </div>
        </div>
      )}
      {/* Zoom icon for images */}
      {item.type === "image" && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(201,169,97,0.9)" }}>
            <ZoomIn size={16} style={{ color: "#1A264F" }} />
          </div>
        </div>
      )}
      {/* Type badge */}
      <div className="absolute top-2 right-2">
        {item.type === "youtube" && (
          <span className="inline-flex items-center gap-1 bg-red-600 text-white rounded px-1.5 py-0.5 text-[9px] font-bold uppercase">
            <Youtube size={9} /> YT
          </span>
        )}
        {item.type === "video" && (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
            style={{ background: "#1A264F", color: "#C9A961" }}>
            <Film size={9} /> Video
          </span>
        )}
      </div>
      {/* Title tooltip on hover */}
      {item.title && (
        <div className="absolute bottom-0 left-0 right-0 p-2.5 translate-y-full group-hover:translate-y-0 transition-transform"
          style={{ background: "linear-gradient(to top, rgba(26,38,79,0.9), transparent)" }}>
          <p className="text-white text-xs font-semibold line-clamp-1">{item.title}</p>
        </div>
      )}
    </button>
  );
}

function Lightbox({ item, onClose, onPrev, onNext, current, total }) {
  const embedUrl = item.type === "youtube" ? getYouTubeEmbedUrl(item) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()} data-testid="gallery-lightbox">
      {/* Close */}
      <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white" data-testid="gallery-lightbox-close">
        <X size={18} />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-xs font-mono">
        {current} / {total}
      </div>

      {/* Prev/Next */}
      {onPrev && (
        <button onClick={onPrev} className="absolute left-3 sm:left-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white" data-testid="gallery-prev">
          <ChevronLeft size={22} />
        </button>
      )}
      {onNext && (
        <button onClick={onNext} className="absolute right-3 sm:right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white" data-testid="gallery-next">
          <ChevronRight size={22} />
        </button>
      )}

      {/* Content */}
      <div className="max-w-5xl w-full mx-auto flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
        {item.type === "image" && (
          <img src={item.media_url} alt={item.title || "Galeri"} className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-2xl" />
        )}
        {item.type === "video" && (
          <video src={item.media_url} controls autoPlay className="max-h-[75vh] max-w-full rounded-lg shadow-2xl" style={{ width: "100%" }}>
            Tarayıcınız video oynatmayı desteklemiyor.
          </video>
        )}
        {item.type === "youtube" && embedUrl && (
          <div className="w-full rounded-lg overflow-hidden shadow-2xl" style={{ aspectRatio: "16/9", maxHeight: "75vh" }}>
            <iframe src={embedUrl} title={item.title || "YouTube Video"}
              className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen />
          </div>
        )}
        {/* Caption */}
        {(item.title || item.description) && (
          <div className="text-center max-w-2xl">
            {item.title && <p className="text-white font-heading text-lg font-bold">{item.title}</p>}
            {item.description && <p className="text-white/60 text-sm mt-1">{item.description}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
