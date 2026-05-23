import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { MapPin, Calendar, Users, Award, ChevronRight, Check, ArrowRight, Ticket, Building2, Mic2, Store, Crown, Star, Sparkles, Linkedin, Instagram, Twitter, GraduationCap } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

function useCountdown(targetDate) {
  // Immediate calc (avoids the 0/0/0/0 flash on first render)
  const compute = (target) => {
    if (!target) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const diff = new Date(target).getTime() - Date.now();
    if (isNaN(diff) || diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };
  const [timeLeft, setTimeLeft] = useState(() => compute(targetDate));
  useEffect(() => {
    setTimeLeft(compute(targetDate));
    const t = setInterval(() => setTimeLeft(compute(targetDate)), 1000);
    return () => clearInterval(t);
  }, [targetDate]);
  return timeLeft;
}

export default function HomePage() {
  const [speakers, setSpeakers] = useState([]);
  const [program, setProgram] = useState([]);
  const [events, setEvents] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState({
    event_datetime: "2026-05-21T09:00:00+03:00",
    event_date_label: "21 Mayıs 2026",
    event_time_label: "09:00 - 19:00",
    event_location: "Hilton İstanbul Bosphorus",
    speakers_count: 4,
    sessions_count: 12,
    attendees_count: "600+",
    countdown_title: "Zirveye Kalan Süre",
  });
  const countdown = useCountdown(siteSettings.event_datetime);

  useEffect(() => {
    axios.get(`${API}/speakers`).then(r => setSpeakers(r.data)).catch(() => {});
    axios.get(`${API}/program`).then(r => setProgram(r.data.slice(0, 6))).catch(() => {});
    axios.get(`${API}/events`).then(r => setEvents(r.data.slice(0, 3))).catch(() => {});
    axios.get(`${API}/sponsors`).then(r => setSponsors(r.data)).catch(() => {});
    axios.get(`${API}/hero-slides`).then(r => setHeroSlides(r.data)).catch(() => {});
    axios.get(`${API}/site-settings`).then(r => {
      if (r.data && Object.keys(r.data).length) setSiteSettings(s => ({ ...s, ...r.data }));
    }).catch(() => {});
  }, []);

  // Rotate hero slides every 5s
  useEffect(() => {
    if (heroSlides.length < 2) return;
    const t = setInterval(() => setActiveSlide(i => (i + 1) % heroSlides.length), 5000);
    return () => clearInterval(t);
  }, [heroSlides.length]);

  return (
    <div className="bg-white min-h-screen font-body">
      <Navbar />

      {/* ===== HERO (GYODER style - mobile optimized) ===== */}
      <section
        className="relative flex items-center overflow-hidden pt-16 sm:pt-20 lg:pt-20"
        data-testid="hero-section"
      >
        {/* Subtle pattern bg */}
        <div className="absolute inset-0 bg-summit-paper">
          <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#22316a" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)"/>
          </svg>
          <div className="absolute top-20 -right-32 w-[500px] h-[500px] rounded-full bg-summit-navy/5 blur-3xl" />
          <div className="absolute bottom-0 -left-32 w-[400px] h-[400px] rounded-full bg-summit-accent/10 blur-3xl" />
        </div>

        {/* Hero slideshow background — semi-transparent, auto-rotating */}
        {heroSlides.length > 0 && (
          <div className="absolute inset-0 overflow-hidden" data-testid="hero-slideshow">
            {heroSlides.map((s, i) => (
              <div
                key={s.id}
                aria-hidden="true"
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out"
                style={{
                  backgroundImage: `url(${s.image_url})`,
                  opacity: i === activeSlide ? (typeof s.opacity === "number" ? s.opacity / 100 : 0.45) : 0,
                }}
              />
            ))}
            {/* Soft white wash to keep text readable */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/35 to-white/55" />
          </div>
        )}

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            {/* Left: Text */}
            <div className="lg:col-span-7">
              {/* Date stamp */}
              <div className="inline-flex items-center gap-3 mb-4 sm:mb-7 animate-fade-in stagger-1 opacity-0">
                <div className="w-8 sm:w-10 h-0.5 bg-summit-navy" />
                <span className="text-summit-navy text-[0.65rem] sm:text-xs font-semibold uppercase tracking-[0.2em] sm:tracking-[0.25em]">
                  {siteSettings.event_date_label} · Perşembe
                </span>
              </div>

              <h1 className="font-heading text-summit-navy text-[2rem] sm:text-5xl lg:text-6xl leading-[1.05] animate-slide-up stagger-2 opacity-0">
                Arsa Yatırım{" "}
                <span className="text-summit-accent">Zirvesi</span>
                <br />
                2026
              </h1>

              <p className="text-gray-600 text-sm sm:text-base lg:text-lg mt-4 sm:mt-6 max-w-xl leading-relaxed animate-slide-up stagger-3 opacity-0">
                Türkiye'nin en kapsamlı arsa yatırım buluşmasında uzman konuşmacılar, stratejik içgörüler ve güçlü networking fırsatları.
              </p>

              {/* Location pill */}
              <div className="inline-flex items-center gap-2 mt-4 sm:mt-6 bg-white border border-gray-200 rounded-md px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm animate-slide-up stagger-4 opacity-0">
                <MapPin size={13} className="text-summit-navy shrink-0" />
                <span className="text-summit-navy text-xs sm:text-sm font-medium">{siteSettings.event_location}</span>
              </div>

              {/* Compact countdown (mobile-only visible) */}
              {siteSettings.event_is_active === false ? (
                <div className="lg:hidden mt-5 bg-gradient-to-r from-amber-400 to-amber-500 text-summit-navy shadow-lg rounded-md p-4 relative overflow-hidden" data-testid="event-completed-mobile">
                  <p className="text-[10px] uppercase tracking-widest font-bold mb-1">{siteSettings.completed_overline || "Bu Yılki Zirvemiz"}</p>
                  <p className="font-heading text-base font-bold leading-tight">{siteSettings.completed_title || "Bu Yılki Zirvemiz Başarıyla Tamamlandı"}</p>
                  <p className="text-summit-navy/80 text-xs mt-1.5 leading-relaxed">{siteSettings.next_event_label || "Bir sonraki zirve yakında"}</p>
                </div>
              ) : (
              <div className="lg:hidden mt-5 bg-white border border-gray-200 shadow-sm rounded-md p-4 relative overflow-hidden" data-testid="countdown-timer-mobile">
                <div className="absolute top-0 left-0 right-0 corp-accent-bar" />
                <div className="flex items-center justify-between mb-3 mt-1">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-gray-500">Zirveye Kalan</p>
                  <Calendar size={13} className="text-summit-navy" />
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[["days", "Gün"], ["hours", "Saat"], ["minutes", "Dk"], ["seconds", "Sn"]].map(([key, label]) => (
                    <div key={key} className="text-center bg-summit-paper rounded">
                      <div className="font-heading text-xl sm:text-2xl font-bold text-summit-navy leading-none py-2">
                        {String(countdown[key] ?? 0).padStart(2, "0")}
                      </div>
                      <div className="text-gray-500 text-[0.55rem] uppercase tracking-widest pb-1.5 font-medium">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
              )}

              <div className="flex flex-col items-stretch gap-2.5 mt-5 sm:mt-8 animate-slide-up stagger-5 opacity-0" data-testid="hero-register-cta">
                {!registerOpen && siteSettings.event_is_active !== false && (
                  <button
                    type="button"
                    onClick={() => setRegisterOpen(true)}
                    className="relative group inline-flex items-center justify-center gap-3 px-6 sm:px-8 py-4 sm:py-4 bg-summit-accent text-summit-navy font-heading font-bold text-base sm:text-lg rounded-md shadow-lg hover:shadow-xl hover:bg-summit-accent/90 transition-all overflow-hidden"
                    data-testid="hero-register-btn"
                  >
                    <span className="absolute -left-1 top-0 h-full w-1.5 bg-summit-navy" />
                    <span className="relative z-10">Kayıt Yap</span>
                    <ArrowRight size={18} className="relative z-10 transition-transform group-hover:translate-x-1" />
                    <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />
                  </button>
                )}

                {!registerOpen && siteSettings.event_is_active === false && siteSettings.next_event_cta_text && (
                  <Link
                    to={siteSettings.next_event_cta_url || "/ziyaretci-kaydi"}
                    className="relative group inline-flex items-center justify-center gap-3 px-6 sm:px-8 py-4 bg-summit-accent text-summit-navy font-heading font-bold text-base sm:text-lg rounded-md shadow-lg hover:shadow-xl hover:bg-summit-accent/90 transition-all overflow-hidden"
                    data-testid="hero-next-event-btn"
                  >
                    <span className="absolute -left-1 top-0 h-full w-1.5 bg-summit-navy" />
                    <span className="relative z-10">{siteSettings.next_event_cta_text}</span>
                    <ArrowRight size={18} className="relative z-10 transition-transform group-hover:translate-x-1" />
                  </Link>
                )}

                {!registerOpen && (
                  <Link
                    to="/seminer"
                    className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-summit-navy hover:text-amber-600 transition-colors"
                    data-testid="hero-seminer-cta"
                  >
                    <GraduationCap size={14} className="text-amber-500" />
                    <span className="uppercase tracking-wider">Yeni: Arsa Yatırım Semineri</span>
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}

                {registerOpen && (
                  <div className="bg-white border-2 border-summit-accent rounded-md p-3 sm:p-4 shadow-xl animate-slide-up" data-testid="hero-register-options">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-summit-navy">Kayıt Türünüzü Seçin</p>
                      <button
                        type="button"
                        onClick={() => setRegisterOpen(false)}
                        className="text-gray-400 hover:text-summit-navy text-xs"
                        aria-label="Kapat"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Link to="/ziyaretci-kaydi" className="group flex items-center gap-3 px-4 py-3 bg-summit-navy text-white rounded-md hover:bg-summit-navy/90 transition-colors" data-testid="hero-visitor-btn">
                        <Ticket size={18} className="shrink-0" />
                        <span className="text-sm font-semibold">Ziyaretçi Kaydı</span>
                        <ArrowRight size={14} className="ml-auto opacity-70 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                      <Link to="/fuar-stant-kaydi" className="group flex items-center gap-3 px-4 py-3 border-2 border-summit-navy text-summit-navy rounded-md hover:bg-summit-navy hover:text-white transition-colors" data-testid="hero-exhibitor-btn">
                        <Building2 size={18} className="shrink-0" />
                        <span className="text-sm font-semibold">Stant Başvurusu</span>
                        <ArrowRight size={14} className="ml-auto opacity-70 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                      <Link to="/konusmaci-basvuru" className="group flex items-center gap-3 px-4 py-3 border-2 border-summit-navy text-summit-navy rounded-md hover:bg-summit-navy hover:text-white transition-colors" data-testid="hero-speaker-btn">
                        <Mic2 size={18} className="shrink-0" />
                        <span className="text-sm font-semibold">Konuşmacı / Sponsor</span>
                        <ArrowRight size={14} className="ml-auto opacity-70 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* At-a-glance stats (mobile only) */}
              <div className="lg:hidden mt-5 grid grid-cols-3 gap-2" data-testid="hero-stats-mobile">
                {[["4", "Konuşmacı"], ["12", "Oturum"], ["600+", "Katılımcı"]].map(([n, l]) => (
                  <div key={l} className="bg-white border border-gray-200 rounded-md py-3 text-center">
                    <div className="font-heading text-summit-navy text-xl font-bold">{n}</div>
                    <div className="text-gray-500 text-[0.6rem] uppercase tracking-widest mt-0.5 font-medium">{l}</div>
                  </div>
                ))}
              </div>

              {/* Live indicator (mobile) */}
              <div className="lg:hidden mt-4 flex items-center gap-2 text-gray-600 text-[0.65rem] justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="font-medium uppercase tracking-widest">Kayıtlar Açık · Katılım Ücretsiz</span>
              </div>
            </div>

            {/* Right: Countdown card (desktop only) */}
            <div className="hidden lg:block lg:col-span-5">
              {siteSettings.event_is_active === false ? (
                <div className="bg-gradient-to-br from-amber-400 to-amber-500 text-summit-navy p-7 rounded-md relative overflow-hidden shadow-2xl" data-testid="event-completed-card">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-summit-navy" />
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-block w-2 h-2 rounded-full bg-summit-navy" />
                    <p className="text-summit-navy text-[10px] uppercase tracking-[0.22em] font-bold">{siteSettings.completed_overline || "Bu Yılki Zirvemiz"}</p>
                  </div>
                  <h3 className="font-heading text-2xl xl:text-3xl font-bold leading-tight mb-3">{siteSettings.completed_title || "Bu Yılki Zirvemiz Başarıyla Tamamlandı"}</h3>
                  <p className="text-summit-navy/85 text-sm mb-4 leading-relaxed">{siteSettings.completed_subtitle}</p>
                  {siteSettings.completed_thanks_message && (
                    <div className="bg-white/30 border border-white/50 rounded-lg p-3.5 text-summit-navy text-sm italic leading-relaxed mb-5">
                      "{siteSettings.completed_thanks_message}"
                    </div>
                  )}
                  <div className="border-t border-summit-navy/20 pt-4 mt-2">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-summit-navy/70 mb-2">{siteSettings.next_event_label || "Bir Sonraki Zirve Yakında"}</p>
                    {siteSettings.next_event_cta_text && (
                      <Link to={siteSettings.next_event_cta_url || "/ziyaretci-kaydi"}
                        className="inline-flex items-center gap-2 bg-summit-navy hover:bg-summit-navy-dark text-amber-400 font-bold px-5 py-2.5 rounded-md transition-colors text-sm">
                        {siteSettings.next_event_cta_text} <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
              <div className="bg-white border border-gray-200 shadow-xl p-7 rounded-md relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 corp-accent-bar" />
                <div className="flex items-center justify-between mb-6 mt-1">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Geri Sayım</p>
                    <h3 className="font-heading text-summit-navy text-xl mt-1">{siteSettings.countdown_title || "Zirveye Kalan Süre"}</h3>
                  </div>
                  <div className="w-11 h-11 rounded-md bg-summit-navy/10 flex items-center justify-center">
                    <Calendar size={18} className="text-summit-navy" />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2" data-testid="countdown-timer">
                  {[["days", "Gün"], ["hours", "Saat"], ["minutes", "Dk"], ["seconds", "Sn"]].map(([key, label]) => (
                    <div key={key} className="text-center bg-summit-paper border border-gray-100 py-4 rounded-md">
                      <div className="font-heading text-3xl sm:text-4xl font-bold text-summit-navy leading-none">
                        {String(countdown[key] ?? 0).padStart(2, "0")}
                      </div>
                      <div className="text-gray-500 text-[0.65rem] uppercase tracking-widest mt-2 font-medium">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-3">
                  {[
                    [String(siteSettings.speakers_count || 4), "Konuşmacı"],
                    [String(siteSettings.sessions_count || 12), "Oturum"],
                    [siteSettings.attendees_count || "600+", "Katılımcı"],
                  ].map(([n, l]) => (
                    <div key={l} className="text-center">
                      <div className="font-heading text-summit-navy text-2xl font-bold">{n}</div>
                      <div className="text-gray-500 text-[0.65rem] uppercase tracking-widest mt-1 font-medium">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
              )}

              <div className="mt-4 flex items-center gap-2 text-gray-600 text-xs justify-center">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-medium uppercase tracking-widest text-[0.65rem]">Kayıtlar Açık · Katılım Ücretsiz</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SPEAKERS (moved up - prominent on mobile) ===== */}
      <section className="py-12 sm:py-16 bg-white border-t border-gray-100" data-testid="speakers-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="section-overline">Konuşmacılar</span>
              <h2 className="gyoder-section-title gyoder-section-title-center inline-block">Zirvenin Uzman İsimleri</h2>
            </div>

            {(() => {
              const isModerator = (s) => /moderat[oö]r|sunucu/i.test(s.title || "");
              const moderators = speakers.filter(isModerator);
              const regulars = speakers.filter((s) => !isModerator(s));
              const TARGET = 4;
              const promoCount = Math.max(TARGET - regulars.length, regulars.length === 0 ? 4 : 0);
              const PromoSlot = ({ featured = false, isModerator: mod = false }) => (
                <Link
                  to="/konusmaci-basvuru"
                  className="group relative bg-gradient-to-br from-summit-navy via-summit-navy to-summit-navy-dark border-2 border-dashed border-amber-400/60 hover:border-amber-400 rounded-md overflow-hidden flex flex-col shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all"
                  data-testid="speaker-promo-card"
                >
                  <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-summit-navy text-[10px] uppercase tracking-[0.22em] font-bold py-1.5 text-center px-2">
                    {mod ? "Boş Slot · Sunucu / Moderatör" : "Boş Slot · Konuşmacı"}
                  </div>
                  <div className={`${featured ? "h-80" : "h-72"} flex flex-col items-center justify-center px-6 relative overflow-hidden`}>
                    <div className="absolute inset-0 opacity-[0.05]" style={{
                      backgroundImage: "radial-gradient(circle, #C9A961 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }} />
                    <div className="w-16 h-16 rounded-full bg-amber-400/15 border border-amber-400/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Mic2 size={28} className="text-amber-300" />
                    </div>
                    <p className="text-amber-300 text-[11px] uppercase tracking-[0.2em] font-bold mb-2">Bir Sonraki Zirve</p>
                    <h4 className="font-heading text-white text-xl text-center leading-tight">Konuşmacı Olun</h4>
                    <p className="text-white/70 text-xs text-center mt-3 leading-relaxed max-w-[220px]">
                      Uzmanlığınızı 600+ yatırımcıya anlatın. Yerinizi şimdiden ayırtın.
                    </p>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-2 mt-auto">
                      <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">Başvur</span>
                      <span className="w-7 h-7 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center group-hover:bg-amber-400 transition-colors">
                        <ArrowRight size={13} className="text-amber-300 group-hover:text-summit-navy transition-colors" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
              const SpeakerCardInline = ({ sp, featured }) => (
                <div
                  className="bg-white border border-amber-300 overflow-hidden shadow-sm card-hover rounded-md flex flex-col"
                  data-testid={`speaker-card-${sp.name}`}
                >
                  <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-summit-navy text-[10px] uppercase tracking-[0.22em] font-bold py-1.5 text-center px-2">
                    {sp.title || "Konuşmacı"}
                  </div>
                  <div className={`${featured ? "h-80" : "h-72"} bg-cover`} style={{ backgroundImage: `url(${sp.image_url})`, backgroundPosition: sp.image_position || 'center 20%' }} />
                  <div className="p-5 flex-1 flex flex-col">
                    <h4 className="font-heading text-summit-navy text-lg leading-tight">{sp.name}</h4>
                    <p className="text-summit-navy text-xs mt-1.5 font-semibold uppercase tracking-wide">{sp.title}</p>
                    {sp.bio && (
                      <p className="text-gray-600 text-xs mt-3 leading-relaxed flex-1">{sp.bio}</p>
                    )}
                    {(sp.social_linkedin || sp.social_instagram || sp.social_twitter) && (
                      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                        {sp.social_linkedin && (
                          <a href={sp.social_linkedin} target="_blank" rel="noopener noreferrer"
                            className="w-8 h-8 rounded-md bg-summit-paper border border-gray-200 flex items-center justify-center text-gray-500 hover:text-summit-navy hover:border-summit-navy/40 transition-colors" aria-label="LinkedIn">
                            <Linkedin size={14} />
                          </a>
                        )}
                        {sp.social_instagram && (
                          <a href={sp.social_instagram} target="_blank" rel="noopener noreferrer"
                            className="w-8 h-8 rounded-md bg-summit-paper border border-gray-200 flex items-center justify-center text-gray-500 hover:text-summit-navy hover:border-summit-navy/40 transition-colors" aria-label="Instagram">
                            <Instagram size={14} />
                          </a>
                        )}
                        {sp.social_twitter && (
                          <a href={sp.social_twitter} target="_blank" rel="noopener noreferrer"
                            className="w-8 h-8 rounded-md bg-summit-paper border border-gray-200 flex items-center justify-center text-gray-500 hover:text-summit-navy hover:border-summit-navy/40 transition-colors" aria-label="Twitter / X">
                            <Twitter size={14} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
              return (
                <>
                  {moderators.length > 0 ? (
                    <div className="flex justify-center mb-8 sm:mb-10">
                      <div className="w-full max-w-sm">
                        {moderators.map((sp) => (
                          <SpeakerCardInline key={sp.id} sp={sp} featured />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center mb-8 sm:mb-10">
                      <div className="w-full max-w-sm">
                        <PromoSlot featured isModerator />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {regulars.map((sp) => (
                      <SpeakerCardInline key={sp.id} sp={sp} />
                    ))}
                    {Array.from({ length: promoCount }).map((_, i) => (
                      <PromoSlot key={`promo-${i}`} />
                    ))}
                  </div>
                </>
              );
            })()}

            <div className="text-center mt-8">
              <Link to="/konusmacilar" className="btn-outline-navy px-7 py-3 inline-flex items-center gap-2">
                Tüm Konuşmacı Detayları <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </section>

      {/* ===== PROGRAM PREVIEW (moved up) ===== */}
      <section className="py-12 sm:py-16 bg-summit-paper" data-testid="program-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="section-overline">Zirve Programı</span>
            <h2 className="gyoder-section-title gyoder-section-title-center inline-block">Günün Akışı</h2>
            <p className="text-gray-500 mt-6 text-sm">21 Mayıs 2026 · 12:00 - 19:00</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {program.map((session, i) => (
              <div
                key={session.id}
                className={`bg-white border border-gray-200 p-5 card-hover shadow-sm rounded-md border-l-4 ${
                  session.session_type === "panel" ? "border-l-purple-500" :
                  session.session_type === "break" || session.session_type === "networking" ? "border-l-gray-300" :
                  "border-l-summit-navy"
                }`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-summit-navy text-xs font-mono font-semibold bg-summit-navy/8 px-2 py-1 rounded">
                    {session.time_start}
                  </span>
                  <span className="text-gray-400 text-xs">→</span>
                  <span className="text-gray-500 text-xs font-mono">{session.time_end}</span>
                </div>
                <h4 className="font-heading text-summit-navy text-base leading-snug">{session.title}</h4>
                {session.speaker_name && (
                  <p className="text-summit-navy text-xs mt-2 font-medium">{session.speaker_name}</p>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/program" className="btn-navy px-8 py-3">
              Tüm Programı Gör
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 3 KAYIT TÜRÜ CARDS ===== */}
      <section className="py-12 bg-white border-t border-gray-100" data-testid="registrations-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="section-overline">Kayıt Türleri</span>
            <h2 className="gyoder-section-title gyoder-section-title-center inline-block">Zirveye Nasıl Katılabilirsiniz?</h2>
            <p className="text-gray-600 mt-6 max-w-2xl mx-auto">
              Zirvemize 3 farklı başvuru türü ile katılabilirsiniz. Size en uygun olanı seçerek hemen başvurunuzu tamamlayın.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Ticket,
                label: "Ziyaretçi Kaydı",
                desc: "Zirveye katılarak oturumları dinleyin, networking yapın. Ücretsiz katılım.",
                href: "/ziyaretci-kaydi",
                cta: "Ziyaretçi Olarak Kaydol",
                testid: "card-visitor",
                popular: true,
              },
              {
                icon: Building2,
                label: "Fuar Stant Kaydı",
                desc: "Şirketinizi zirvede tanıtın. Stant alanı başvurusu ile ürün/hizmetlerinizi sergileyin.",
                href: "/fuar-stant-kaydi",
                cta: "Stant Başvurusu",
                testid: "card-exhibitor",
                extraLink: { text: "Fuar alanını incele →", href: "/fuar-alani" },
              },
              {
                icon: Mic2,
                label: "Konuşmacı / Panel / Sponsor",
                desc: "Zirvede konuşmacı, panelist veya sponsor olarak yer almak için başvurun.",
                href: "/konusmaci-basvuru",
                cta: "Başvuru Yap",
                testid: "card-speaker",
              },
            ].map(({ icon: Icon, label, desc, href, cta, testid, popular, extraLink }) => (
              <div key={href} className="group relative bg-white border border-gray-200 rounded-md p-7 card-hover" data-testid={testid}>
                {popular && (
                  <div className="absolute -top-3 left-7 px-3 py-1 bg-summit-accent text-summit-navy text-xs font-bold uppercase tracking-wider rounded">
                    En Popüler
                  </div>
                )}
                <div className="w-14 h-14 rounded-md bg-summit-navy/8 flex items-center justify-center mb-5 group-hover:bg-summit-navy group-hover:text-white transition-colors">
                  <Icon size={24} className="text-summit-navy group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-heading text-summit-navy text-xl mb-3">{label}</h3>
                <p className="text-gray-600 text-sm mb-6 leading-relaxed">{desc}</p>
                <Link to={href} className="inline-flex items-center gap-2 text-summit-navy font-semibold text-sm hover:gap-3 transition-all">
                  {cta} <ArrowRight size={15} />
                </Link>
                {extraLink && (
                  <Link to={extraLink.href} className="block mt-3 text-summit-navy/70 text-xs hover:text-summit-navy font-medium">
                    {extraLink.text}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FUAR ALANI HIGHLIGHT ===== */}
      <section className="py-14 sm:py-20 bg-gradient-to-br from-summit-paper via-white to-summit-paper relative overflow-hidden" data-testid="fair-highlight-section">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-summit-accent/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-summit-navy/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* IMAGE */}
            <div className="lg:col-span-7 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-summit-navy/10">
                <img
                  src={`${API}/uploads/fair_stands.jpeg?v=2`}
                  alt="8. Gayrimenkul Proje Yatırım Fuarı stantları"
                  className="w-full h-72 sm:h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-summit-navy/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 right-4 sm:right-6 text-white">
                  <span className="inline-block bg-summit-accent text-summit-navy px-3 py-1 rounded text-[0.65rem] font-bold uppercase tracking-widest mb-2 shadow-lg">
                    8. Yıl
                  </span>
                  <p className="font-heading text-2xl sm:text-3xl drop-shadow-lg">Gayrimenkul Proje Yatırım Fuarı</p>
                </div>
              </div>
              {/* Stats overlay */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center shadow-sm">
                  <div className="font-heading text-summit-navy text-2xl font-bold">36</div>
                  <div className="text-[0.65rem] text-gray-500 uppercase tracking-wider mt-0.5">Stant</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center shadow-sm">
                  <div className="font-heading text-summit-navy text-2xl font-bold">2</div>
                  <div className="text-[0.65rem] text-gray-500 uppercase tracking-wider mt-0.5">Gün</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center shadow-sm">
                  <div className="font-heading text-summit-navy text-2xl font-bold">5K+</div>
                  <div className="text-[0.65rem] text-gray-500 uppercase tracking-wider mt-0.5">Ziyaretçi</div>
                </div>
              </div>
            </div>

            {/* TEXT */}
            <div className="lg:col-span-5">
              <span className="section-overline">Fuar Alanı</span>
              <h2 className="gyoder-section-title inline-block mt-3">Maketler, Projeler, Yüz Yüze Görüşmeler</h2>
              <p className="text-gray-600 text-base mt-5 leading-relaxed">
                Türkiye'nin önde gelen müteahhit ve gayrimenkul firmalarının <strong className="text-summit-navy">36 standta</strong> sergilediği projeleri yerinde inceleyin.
                Maketleri görün, sektör temsilcileri ile <strong className="text-summit-navy">birebir görüşün</strong>, doğrudan kaynak yatırımcıdan bilgi alın.
              </p>

              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-start gap-3 text-gray-700">
                  <div className="w-7 h-7 rounded-full bg-summit-accent/20 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-summit-navy" strokeWidth={3} />
                  </div>
                  <span><strong className="text-summit-navy">Sınırsız ücretsiz katılım</strong> — kayıt formu doldurmanız yeterli</span>
                </li>
                <li className="flex items-start gap-3 text-gray-700">
                  <div className="w-7 h-7 rounded-full bg-summit-accent/20 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-summit-navy" strokeWidth={3} />
                  </div>
                  <span>20-21 Mayıs, dilediğiniz saatte giriş — esnek program</span>
                </li>
                <li className="flex items-start gap-3 text-gray-700">
                  <div className="w-7 h-7 rounded-full bg-summit-accent/20 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-summit-navy" strokeWidth={3} />
                  </div>
                  <span>Zirve katılımcısıysanız <strong className="text-summit-navy">ek başvuruya gerek yok</strong></span>
                </li>
              </ul>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/fuar-alani"
                  className="inline-flex items-center gap-2 bg-summit-navy hover:bg-summit-navy-dark text-white px-5 py-3 rounded-md text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                  data-testid="fair-highlight-detail-btn"
                >
                  <Store size={16} /> Fuar Alanını İncele <ArrowRight size={14} />
                </Link>
                <Link
                  to="/ziyaretci-kaydi"
                  className="inline-flex items-center gap-2 bg-summit-accent hover:bg-yellow-400 text-summit-navy px-5 py-3 rounded-md text-sm font-bold shadow-md hover:shadow-lg transition-all"
                  data-testid="fair-highlight-register-btn"
                >
                  Ücretsiz Kaydol <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SPONSORLUK DAVETİ ===== */}
      <section className="py-14 sm:py-20 bg-summit-navy relative overflow-hidden" data-testid="sponsor-invite-section">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
        <div className="absolute -top-32 right-0 w-96 h-96 rounded-full bg-summit-accent/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* TEXT */}
            <div className="lg:col-span-7 text-white order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 bg-summit-accent/20 border border-summit-accent/40 px-3 py-1.5 rounded-full mb-5">
                <Sparkles size={13} className="text-summit-accent" />
                <span className="text-summit-accent text-[0.65rem] font-bold uppercase tracking-[0.2em]">
                  Sponsor Başvuruları Açıldı
                </span>
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl leading-[1.1] mb-5">
                Türkiye'nin en prestijli<br />
                <span className="text-summit-accent italic">arsa yatırım zirvesinde</span><br />
                yer alın
              </h2>
              <p className="text-white/80 text-base leading-relaxed mb-7 max-w-xl">
                600+ üst düzey yatırımcı, 36 sektör liderini buluşturan zirvede markanızı hedef kitleye ulaştırın.
                <strong className="text-white"> Altın, Gümüş ve Bronz</strong> sponsor paketleri ile başvurular devam ediyor.
              </p>

              {/* Sponsor tier mini-grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-7">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-center opacity-60">
                  <Crown size={20} className="mx-auto text-summit-accent mb-1" />
                  <div className="text-[0.7rem] text-white/70 uppercase tracking-wider font-semibold">Ana Sponsor</div>
                  <div className="text-[0.6rem] text-red-300 font-bold mt-0.5">VERİLDİ</div>
                </div>
                <div className="bg-summit-accent/15 border border-summit-accent/40 rounded-lg p-3 text-center ring-2 ring-summit-accent/40">
                  <Award size={20} className="mx-auto text-summit-accent mb-1" />
                  <div className="text-[0.7rem] text-white uppercase tracking-wider font-semibold">Altın</div>
                  <div className="text-[0.6rem] text-summit-accent font-bold mt-0.5">EN POPÜLER</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-center">
                  <Award size={20} className="mx-auto text-slate-300 mb-1" />
                  <div className="text-[0.7rem] text-white/80 uppercase tracking-wider font-semibold">Gümüş</div>
                  <div className="text-[0.6rem] text-green-400 font-bold mt-0.5">MÜSAİT</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-center">
                  <Award size={20} className="mx-auto text-orange-400 mb-1" />
                  <div className="text-[0.7rem] text-white/80 uppercase tracking-wider font-semibold">Bronz</div>
                  <div className="text-[0.6rem] text-green-400 font-bold mt-0.5">MÜSAİT</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/konusmaci-basvuru"
                  className="inline-flex items-center gap-2 bg-summit-accent hover:bg-yellow-400 text-summit-navy px-6 py-3 rounded-md text-sm font-bold shadow-lg hover:shadow-xl transition-all"
                  data-testid="sponsor-invite-cta"
                >
                  <Crown size={16} /> Sponsor Olarak Başvur <ArrowRight size={14} />
                </Link>
                <Link
                  to="/konusmaci-basvuru"
                  className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/30 text-white hover:bg-white/20 px-6 py-3 rounded-md text-sm font-semibold transition-colors"
                  data-testid="speaker-invite-cta"
                >
                  <Mic2 size={16} /> Konuşmacı Başvurusu
                </Link>
              </div>
            </div>

            {/* IMAGE / TESTIMONIAL */}
            <div className="lg:col-span-5 order-1 lg:order-2">
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                  <img
                    src="https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/01rt3h3r_IMG_4927.jpeg"
                    alt="Sponsor değer önerisi"
                    className="w-full h-72 sm:h-96 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-summit-navy via-summit-navy/30 to-transparent" />
                </div>
                {/* Testimonial card overlay */}
                <div className="absolute -bottom-5 left-4 right-4 sm:left-6 sm:right-6 bg-white rounded-xl p-4 shadow-2xl border border-summit-accent/20">
                  <div className="flex gap-0.5 mb-2">
                    {[...Array(5)].map((_, k) => (
                      <Star key={k} size={12} className="text-summit-accent fill-summit-accent" />
                    ))}
                  </div>
                  <p className="text-summit-navy text-xs leading-relaxed italic">
                    "Standımıza gelen ziyaretçilerin <strong>%72'si karar mercii</strong> kişilerdi. Hiçbir fuarda bu kadar kaliteli izleyici görmedik."
                  </p>
                  <p className="text-gray-500 text-[0.65rem] mt-2 font-semibold uppercase tracking-wider">
                    Tolga A. · Marina Project
                  </p>
                </div>
              </div>
              {/* spacer for the absolute card */}
              <div className="h-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section className="py-12 sm:py-16 bg-summit-paper" data-testid="about-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <span className="section-overline">Zirve Hakkında</span>
              <h2 className="gyoder-section-title inline-block">Neden Arsa Yatırım Zirvesi?</h2>
              <p className="text-gray-600 text-base mt-6 leading-relaxed">
                Arsa Yatırım Zirvesi 2026, Türkiye'nin önde gelen gayrimenkul uzmanlarını, hukukçuları ve piyasa analistlerini bir araya getiren prestijli bir platform sunmaktadır.
              </p>
              <p className="text-gray-600 text-base mt-4 leading-relaxed">
                2026 fırsat haritasından başlayarak hukuki detaylara, bölgesel analizlere ve pratik yatırım stratejilerine kadar kapsamlı bir program sizi bekliyor.
              </p>

              <ul className="mt-8 space-y-3">
                {["Uzman konuşmacılardan birebir bilgi", "Hukuki sorularınıza cevaplar", "Yatırım fırsatlarını keşfedin", "Sektör profesyonelleriyle networking"].map(item => (
                  <li key={item} className="flex items-center gap-3 text-gray-700 text-sm">
                    <div className="w-6 h-6 rounded-full bg-summit-navy/10 flex items-center justify-center shrink-0">
                      <Check size={13} className="text-summit-navy" />
                    </div>
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="flex gap-4 mt-10">
                <Link to="/ziyaretci-kaydi" className="btn-navy px-6 py-3">Ziyaretçi Kaydı</Link>
                <Link to="/program" className="btn-outline-navy px-6 py-3">Programı İncele</Link>
              </div>
            </div>

            <div className="relative">
              <div
                className="w-full h-72 lg:h-[380px] rounded-md overflow-hidden shadow-xl"
                style={{
                  backgroundImage: "url(https://customer-assets.emergentagent.com/job_arsa-yatirim-zirvesi/artifacts/04eetgap_17e1e87f-b677-4054-92cc-c1972d6d0dd5.jpeg)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              {/* Floating stats */}
              <div className="absolute -bottom-8 right-5 bg-white border-l-4 border-summit-navy p-5 shadow-2xl rounded-md">
                <div className="grid grid-cols-3 gap-5">
                  {[["600+", "Katılımcı"], ["4", "Konuşmacı"], ["12", "Oturum"]].map(([num, label]) => (
                    <div key={label} className="text-center">
                      <div className="font-heading text-summit-navy text-2xl font-bold">{num}</div>
                      <div className="text-gray-500 text-[0.65rem] uppercase tracking-widest mt-0.5 font-medium">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SPONSORS ===== */}
      <div className="bg-white py-10 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-gray-500 text-xs uppercase tracking-[0.2em] mb-8 font-semibold">Destekçilerimiz</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {sponsors.map((sp) => {
              const cardContent = (
                <>
                  <div className={`px-8 py-4 rounded-md border font-heading text-base font-bold transition-all ${sp.tier === "main" ? "bg-summit-navy/5 border-summit-navy/30 text-summit-navy hover:bg-summit-navy hover:text-white" : "bg-white border-gray-200 text-gray-600"}`}>
                    {sp.name}
                  </div>
                  {sp.tier === "main" && <span className="tier-main">Ana Sponsor</span>}
                  {sp.tier === "organization" && <span className="tier-organization">Organizasyon</span>}
                </>
              );
              return (
                <div key={sp.id} className="flex flex-col items-center gap-2">
                  {sp.website_url ? (
                    <a href={sp.website_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2" data-testid={`sponsor-link-${sp.name}`}>
                      {cardContent}
                    </a>
                  ) : cardContent}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== PAST EVENTS PREVIEW ===== */}
      {events.length > 0 && (
        <section className="py-12 sm:py-16 bg-summit-paper" data-testid="past-events-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <span className="section-overline">Geçmiş Etkinlikler</span>
                <h2 className="gyoder-section-title inline-block">Büyüyen Bir Gelenek</h2>
              </div>
              <Link to="/etkinlikler" className="btn-outline-navy px-5 py-2.5 hidden sm:block">
                Tümünü Gör
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {events.map((ev) => (
                <div key={ev.id} className="group bg-white border border-gray-200 overflow-hidden card-hover shadow-sm rounded-md" data-testid={`event-card-${ev.year}`}>
                  <div
                    className="h-44 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${ev.image_url})` }}
                  />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-summit-navy text-lg font-heading font-bold">{ev.year}</span>
                      {ev.attendee_count && <span className="text-gray-400 text-xs">{ev.attendee_count}+ Katılımcı</span>}
                    </div>
                    <h4 className="font-heading text-summit-navy text-base">{ev.title}</h4>
                    <p className="text-gray-500 text-xs mt-1">{ev.venue}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== CTA ===== */}
      <section className="relative bg-summit-navy py-12 sm:py-16 overflow-hidden" data-testid="cta-section">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-white/3 blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-summit-accent text-xs font-bold uppercase tracking-[0.25em] mb-4">Sınırlı Kontenjan</span>
          <h2 className="font-heading text-white text-4xl sm:text-5xl leading-tight">Yerinizi Ayırtın</h2>
          <p className="text-white/75 text-base mt-5 leading-relaxed max-w-xl mx-auto">
            Arsa yatırımı dünyasının zirvesinde yerinizi alın. Ücretsiz kayıt ile tüm oturumları ve networking etkinliğini keşfedin.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link to="/ziyaretci-kaydi" className="btn-accent px-10 py-4" data-testid="cta-visitor-btn">
              Ziyaretçi Kaydı
            </Link>
            <Link to="/konusmaci-basvuru" className="btn-outline-gold px-10 py-4" data-testid="cta-speaker-btn">
              Konuşmacı / Sponsor Başvurusu
            </Link>
          </div>
          <p className="text-white/50 text-xs mt-5 uppercase tracking-widest font-semibold">Katılım Ücretsizdir · Yerler Sınırlıdır</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
