import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { MapPin, Calendar, Users, Award, ChevronRight, Check, ArrowRight, Ticket, Building2, Mic2 } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({});
  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [targetDate]);
  return timeLeft;
}

export default function HomePage() {
  const [speakers, setSpeakers] = useState([]);
  const [program, setProgram] = useState([]);
  const [events, setEvents] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const countdown = useCountdown("2026-05-21T09:00:00+03:00");

  useEffect(() => {
    axios.get(`${API}/speakers`).then(r => setSpeakers(r.data)).catch(() => {});
    axios.get(`${API}/program`).then(r => setProgram(r.data.slice(0, 6))).catch(() => {});
    axios.get(`${API}/events`).then(r => setEvents(r.data.slice(0, 3))).catch(() => {});
    axios.get(`${API}/sponsors`).then(r => setSponsors(r.data)).catch(() => {});
  }, []);

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

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            {/* Left: Text */}
            <div className="lg:col-span-7">
              {/* Date stamp */}
              <div className="inline-flex items-center gap-3 mb-4 sm:mb-7 animate-fade-in stagger-1 opacity-0">
                <div className="w-8 sm:w-10 h-0.5 bg-summit-navy" />
                <span className="text-summit-navy text-[0.65rem] sm:text-xs font-semibold uppercase tracking-[0.2em] sm:tracking-[0.25em]">
                  21 Mayıs 2026 · Perşembe
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
                <span className="text-summit-navy text-xs sm:text-sm font-medium">Hilton İstanbul Bosphorus</span>
              </div>

              {/* Compact countdown (mobile-only visible) */}
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

              <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2 sm:gap-3 mt-5 sm:mt-8 animate-slide-up stagger-5 opacity-0">
                <Link to="/ziyaretci-kaydi" className="btn-navy px-5 sm:px-7 py-3 sm:py-3.5 inline-flex items-center justify-center gap-2 text-sm" data-testid="hero-visitor-btn">
                  Ziyaretçi Kaydı <ArrowRight size={14} />
                </Link>
                <Link to="/fuar-stant-kaydi" className="btn-outline-navy px-5 sm:px-7 py-3 sm:py-3.5 text-center text-sm" data-testid="hero-exhibitor-btn">
                  Stant Başvurusu
                </Link>
                <Link to="/konusmaci-basvuru" className="btn-outline-navy px-5 sm:px-7 py-3 sm:py-3.5 text-center text-sm" data-testid="hero-speaker-btn">
                  Konuşmacı / Sponsor
                </Link>
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
              <div className="bg-white border border-gray-200 shadow-xl p-7 rounded-md relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 corp-accent-bar" />
                <div className="flex items-center justify-between mb-6 mt-1">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Geri Sayım</p>
                    <h3 className="font-heading text-summit-navy text-xl mt-1">Zirveye Kalan Süre</h3>
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
                  {[["4", "Konuşmacı"], ["12", "Oturum"], ["600+", "Katılımcı"]].map(([n, l]) => (
                    <div key={l} className="text-center">
                      <div className="font-heading text-summit-navy text-2xl font-bold">{n}</div>
                      <div className="text-gray-500 text-[0.65rem] uppercase tracking-widest mt-1 font-medium">{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-gray-600 text-xs justify-center">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-medium uppercase tracking-widest text-[0.65rem]">Kayıtlar Açık · Katılım Ücretsiz</span>
              </div>
            </div>
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
              },
              {
                icon: Mic2,
                label: "Konuşmacı / Panel / Sponsor",
                desc: "Zirvede konuşmacı, panelist veya sponsor olarak yer almak için başvurun.",
                href: "/konusmaci-basvuru",
                cta: "Başvuru Yap",
                testid: "card-speaker",
              },
            ].map(({ icon: Icon, label, desc, href, cta, testid, popular }) => (
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
              </div>
            ))}
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
                  backgroundImage: "url(https://images.pexels.com/photos/30584407/pexels-photo-30584407.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)",
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

      {/* ===== SPEAKERS (equal grid - no featured) ===== */}
      {speakers.length > 0 && (
        <section className="py-12 sm:py-16 bg-white" data-testid="speakers-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="section-overline">Konuşmacılar</span>
              <h2 className="gyoder-section-title gyoder-section-title-center inline-block">Zirvenin Uzman İsimleri</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {speakers.map((sp) => (
                <div
                  key={sp.id}
                  className="bg-white border border-gray-200 overflow-hidden shadow-sm card-hover rounded-md flex flex-col"
                  data-testid={`speaker-card-${sp.name}`}
                >
                  <div className="h-72 bg-cover" style={{ backgroundImage: `url(${sp.image_url})`, backgroundPosition: 'center 20%' }} />
                  <div className="p-5 flex-1 flex flex-col">
                    <h4 className="font-heading text-summit-navy text-lg leading-tight">{sp.name}</h4>
                    <p className="text-summit-navy text-xs mt-1.5 font-semibold uppercase tracking-wide opacity-80">{sp.title}</p>
                    {sp.bio && (
                      <p className="text-gray-600 text-xs mt-3 leading-relaxed flex-1">{sp.bio}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link to="/konusmacilar" className="btn-outline-navy px-7 py-3 inline-flex items-center gap-2">
                Tüm Konuşmacı Detayları <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ===== PROGRAM PREVIEW ===== */}
      <section className="py-12 sm:py-16 bg-summit-paper" data-testid="program-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="section-overline">Zirve Programı</span>
            <h2 className="gyoder-section-title gyoder-section-title-center inline-block">Günün Akışı</h2>
            <p className="text-gray-500 mt-6 text-sm">21 Mayıs 2026 · 09:00 - 15:30</p>
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
