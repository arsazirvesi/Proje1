import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  Calendar, MapPin, Users, Mic2, X, Play, ChevronLeft, ChevronRight,
  ZoomIn, Image as ImageIcon, Film, Youtube, ArrowRight, Tag, Quote
} from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { API_BASE as API } from "../../lib/api";

function extractYtId(url) {
  const m = (url || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function PastEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | zirve | seminer
  const [selected, setSelected] = useState(null); // selected event id
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [lightbox, setLightbox] = useState(null); // gallery lightbox index

  useEffect(() => {
    axios.get(`${API}/events`).then(r => setEvents(r.data || [])).finally(() => setLoading(false));
  }, []);

  const openDetail = useCallback(async (ev) => {
    setSelected(ev.id);
    setDetail(null);
    setDetailLoading(true);
    setLightbox(null);
    try {
      const r = await axios.get(`${API}/events/${ev.id}`);
      setDetail(r.data);
    } catch {
      setDetail(ev);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = () => { setSelected(null); setDetail(null); setLightbox(null); };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        if (lightbox !== null) setLightbox(null);
        else closeDetail();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox]);

  const filtered = events.filter(e => filter === "all" || e.type === filter || (!e.type && filter === "zirve"));

  return (
    <div className="min-h-screen bg-white font-body" data-testid="archive-page">
      <Helmet>
        <title>Arşiv | Arsa Yatırım Zirvesi — Geçmiş Zirveler ve Seminerler</title>
        <meta name="description" content="Arsa Yatırım Zirvesi arşivi. Geçmiş zirveler, seminerler, konuşmacılar ve fotoğraf galerileri." />
      </Helmet>

      <Navbar />

      {/* Page Header */}
      <div className="relative overflow-hidden" style={{ background: "#1A264F" }}>
        <div className="absolute inset-0 pointer-events-none">
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="arch-diag" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="60" stroke="#C9A961" strokeWidth="1.5" strokeOpacity="0.07"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#arch-diag)"/>
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 pt-24 sm:pt-28">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-4"
            style={{ background: "rgba(201,169,97,0.15)", border: "1px solid rgba(201,169,97,0.35)" }}>
            <Calendar size={12} style={{ color: "#C9A961" }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#C9A961" }}>Arşiv</span>
          </div>
          <h1 className="font-heading text-white text-3xl sm:text-4xl lg:text-5xl leading-tight">
            Geçmiş <span style={{ color: "#C9A961" }}>Zirveler</span> &amp; Seminerler
          </h1>
          <p className="text-white/60 text-sm sm:text-base mt-3 max-w-xl">
            Her yıl büyüyen Arsa Yatırım platformunun geçmiş etkinliklerini keşfedin.
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2">
          {[["all","Tümü"],["zirve","Zirveler"],["seminer","Seminerler"]].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className="px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
              style={filter===v ? {background:"#1A264F",color:"#fff"} : {background:"#f5f5f5",color:"#666"}}>
              {l}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400">{filtered.length} etkinlik</span>
        </div>
      </div>

      {/* Cards Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-20 text-sm">Etkinlik bulunamadı.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((ev, i) => (
              <EventCard key={ev.id} ev={ev} onClick={() => openDetail(ev)} index={i} />
            ))}
          </div>
        )}

        {/* Next event teaser */}
        <div className="mt-16 rounded-xl p-8 text-center relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(201,169,97,0.12), rgba(201,169,97,0.05))", border: "1px solid rgba(201,169,97,0.3)" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(to right, transparent, #C9A961, transparent)" }} />
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#C9A961" }}>Sıradaki</p>
          <h2 className="font-heading text-summit-navy text-2xl sm:text-3xl">4. Arsa Yatırım Zirvesi 2026</h2>
          <p className="text-gray-500 text-sm mt-2">21 Mayıs 2026 &bull; Hilton İstanbul Bosphorus</p>
          <Link to="/zirve-kaydi" className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-md font-heading font-bold text-sm shadow-md"
            style={{ background: "#1A264F", color: "#C9A961" }} data-testid="next-event-register-btn">
            Hemen Kaydol <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* Detail Modal */}
      {selected && (
        <EventDetailModal
          detail={detail}
          loading={detailLoading}
          onClose={closeDetail}
          lightbox={lightbox}
          setLightbox={setLightbox}
        />
      )}

      <Footer />
    </div>
  );
}

/* ── Event Card ─────────────────────────────────────────────── */
function EventCard({ ev, onClick, index }) {
  const typeBadge = ev.type === "seminer"
    ? { label: "Seminer", bg: "#1A264F", color: "#C9A961" }
    : { label: "Zirve", bg: "#C9A961", color: "#1A264F" };

  return (
    <button onClick={onClick}
      className="group text-left bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5"
      style={{ animationDelay: `${index * 0.08}s` }}
      data-testid={`event-card-${ev.id}`}>
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gray-100">
        {ev.image_url ? (
          <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "#1A264F" }}>
            <Calendar size={36} className="text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Year badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="font-heading font-bold text-sm px-2.5 py-1 rounded-md" style={{ background: typeBadge.bg, color: typeBadge.color }}>
            {typeBadge.label}
          </span>
          <span className="font-heading font-bold text-sm px-2 py-1 rounded-md text-white" style={{ background: "rgba(0,0,0,0.5)" }}>
            {ev.year}
          </span>
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/15 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2">
            <ZoomIn size={13} /> Detayları Gör
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="p-5">
        <h3 className="font-heading text-summit-navy font-bold text-base leading-tight">{ev.title}</h3>
        <div className="mt-3 space-y-1.5">
          {ev.date_label && (
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Calendar size={11} style={{ color: "#C9A961" }} className="shrink-0" />
              {ev.date_label}
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <MapPin size={11} style={{ color: "#C9A961" }} className="shrink-0" />
            <span className="truncate">{ev.venue}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
          {ev.attendee_count && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Users size={11} style={{ color: "#C9A961" }} />
              <span className="font-semibold text-summit-navy">{ev.attendee_count}+</span> Katılımcı
            </div>
          )}
          {ev.speakers_count && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Mic2 size={11} style={{ color: "#C9A961" }} />
              <span className="font-semibold text-summit-navy">{ev.speakers_count}</span> Konuşmacı
            </div>
          )}
        </div>
        {ev.topics && ev.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {ev.topics.slice(0, 3).map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: "rgba(201,169,97,0.12)", color: "#8A6A20" }}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

/* ── Event Detail Modal ─────────────────────────────────────── */
function EventDetailModal({ detail, loading, onClose, lightbox, setLightbox }) {
  const gallery = detail?.gallery_items || [];
  const speakers = detail?.speakers || [];
  const ytId = detail?.video_url ? extractYtId(detail.video_url) : null;

  const activeGalleryItem = lightbox !== null ? gallery[lightbox] : null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-2xl lg:max-w-3xl bg-white shadow-2xl overflow-y-auto flex flex-col" data-testid="event-detail-modal">
        {/* Close btn */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white" data-testid="event-detail-close">
          <X size={18} />
        </button>

        {loading || !detail ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Hero image */}
            <div className="relative h-56 sm:h-72 shrink-0">
              {detail.image_url ? (
                <img src={detail.image_url} alt={detail.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: "#1A264F" }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              {/* Badges */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-md capitalize"
                  style={detail.type === "seminer"
                    ? { background: "#1A264F", color: "#C9A961" }
                    : { background: "#C9A961", color: "#1A264F" }}>
                  {detail.type === "seminer" ? "Seminer" : "Zirve"}
                </span>
                <span className="text-xs font-bold px-2 py-1 rounded-md text-white" style={{ background: "rgba(0,0,0,0.5)" }}>
                  {detail.year}
                </span>
              </div>
              {/* Title overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                <h2 className="font-heading text-white text-xl sm:text-2xl lg:text-3xl font-bold leading-tight">{detail.title}</h2>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-5 sm:p-7 space-y-8">

              {/* Meta pills */}
              <div className="flex flex-wrap gap-2">
                {detail.date_label && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium"
                    style={{ background: "rgba(26,38,79,0.07)", color: "#1A264F" }}>
                    <Calendar size={12} style={{ color: "#C9A961" }} /> {detail.date_label}
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium"
                  style={{ background: "rgba(26,38,79,0.07)", color: "#1A264F" }}>
                  <MapPin size={12} style={{ color: "#C9A961" }} /> {detail.venue}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  [detail.attendee_count ? `${detail.attendee_count}+` : "—", "Katılımcı", Users],
                  [detail.speakers_count || speakers.length || "—", "Konuşmacı", Mic2],
                  [(detail.topics || []).length || "—", "Konu Başlığı", Tag],
                ].map(([v, l, Icon]) => (
                  <div key={l} className="rounded-xl p-3 sm:p-4 text-center" style={{ background: "rgba(26,38,79,0.04)" }}>
                    <div className="font-heading text-xl sm:text-2xl font-bold" style={{ color: "#1A264F" }}>{v}</div>
                    <div className="text-gray-500 text-[10px] uppercase tracking-widest mt-1 font-medium flex items-center justify-center gap-1">
                      <Icon size={10} style={{ color: "#C9A961" }} /> {l}
                    </div>
                  </div>
                ))}
              </div>

              {/* Description */}
              {detail.description && (
                <div>
                  <SectionTitle>Etkinlik Hakkında</SectionTitle>
                  <p className="text-gray-600 text-sm leading-relaxed">{detail.description}</p>
                </div>
              )}

              {/* Highlight quote */}
              {detail.highlight_text && (
                <div className="rounded-xl p-4 sm:p-5 flex gap-3 sm:gap-4"
                  style={{ background: "rgba(201,169,97,0.08)", border: "1px solid rgba(201,169,97,0.3)" }}>
                  <Quote size={20} style={{ color: "#C9A961" }} className="shrink-0 mt-0.5" />
                  <p className="text-sm italic text-gray-700 leading-relaxed">"{detail.highlight_text}"</p>
                </div>
              )}

              {/* Topics */}
              {(detail.topics || []).length > 0 && (
                <div>
                  <SectionTitle>Ele Alınan Konular</SectionTitle>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {detail.topics.map(t => (
                      <span key={t} className="text-xs px-3 py-1.5 rounded-full font-semibold"
                        style={{ background: "rgba(26,38,79,0.08)", color: "#1A264F" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Video */}
              {ytId && (
                <div>
                  <SectionTitle>Etkinlik Videosu</SectionTitle>
                  <div className="mt-3 rounded-xl overflow-hidden shadow-md" style={{ aspectRatio: "16/9" }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                      title="Etkinlik videosu"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Speakers */}
              {speakers.length > 0 && (
                <div>
                  <SectionTitle>Konuşmacılar</SectionTitle>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {speakers.map(sp => (
                      <div key={sp.name} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                        {sp.image_url ? (
                          <img src={sp.image_url} alt={sp.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: "#1A264F", color: "#C9A961", fontSize: 16, fontWeight: 700 }}>
                            {sp.name?.[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-summit-navy truncate">{sp.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{sp.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gallery */}
              {gallery.length > 0 && (
                <div>
                  <SectionTitle>Etkinlik Galerisinden ({gallery.length})</SectionTitle>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {gallery.map((item, idx) => {
                      const thumb = item.thumbnail_url || (item.type === "image" ? item.media_url : null);
                      const isVideo = item.type !== "image";
                      return (
                        <button key={item.id} onClick={() => setLightbox(idx)}
                          className="group relative rounded-lg overflow-hidden aspect-video bg-gray-100"
                          data-testid={`detail-gallery-${item.id}`}>
                          {thumb ? (
                            <img src={thumb} alt={item.title || ""} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: "#1A264F" }}>
                              <Film size={20} className="text-white/30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                          {isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(201,169,97,0.85)" }}>
                                <Play size={14} fill="#1A264F" style={{ color: "#1A264F", marginLeft: 1 }} />
                              </div>
                            </div>
                          )}
                          {!isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(201,169,97,0.85)" }}>
                                <ZoomIn size={13} style={{ color: "#1A264F" }} />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <Link to="/galeri" className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold"
                    style={{ color: "#C9A961" }}>
                    Tüm Galeriyi Gör <ArrowRight size={12} />
                  </Link>
                </div>
              )}

            </div>
          </>
        )}
      </div>

      {/* Gallery Lightbox */}
      {activeGalleryItem && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <X size={18} />
          </button>
          {gallery.length > 1 && (
            <>
              <button onClick={() => setLightbox(i => (i - 1 + gallery.length) % gallery.length)}
                className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                <ChevronLeft size={22} />
              </button>
              <button onClick={() => setLightbox(i => (i + 1) % gallery.length)}
                className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                <ChevronRight size={22} />
              </button>
            </>
          )}
          <div className="max-w-4xl w-full mx-14" onClick={e => e.stopPropagation()}>
            {activeGalleryItem.type === "image" && (
              <img src={activeGalleryItem.media_url} alt="" className="max-h-[80vh] max-w-full rounded-lg mx-auto shadow-2xl object-contain" />
            )}
            {activeGalleryItem.type === "video" && (
              <video src={activeGalleryItem.media_url} controls autoPlay className="max-h-[80vh] w-full rounded-lg shadow-2xl" />
            )}
            {activeGalleryItem.type === "youtube" && (
              <div className="w-full rounded-lg overflow-hidden shadow-2xl" style={{ aspectRatio: "16/9" }}>
                <iframe src={`https://www.youtube.com/embed/${activeGalleryItem.youtube_id}?autoplay=1&rel=0`}
                  className="w-full h-full" allowFullScreen title="video" />
              </div>
            )}
            {activeGalleryItem.title && (
              <p className="text-white/70 text-sm text-center mt-3">{activeGalleryItem.title}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-0.5" style={{ background: "#C9A961" }} />
      <h3 className="font-heading font-bold text-summit-navy text-base">{children}</h3>
    </div>
  );
}
