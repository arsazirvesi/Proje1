import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { MapPin, Calendar, Users, Award, ChevronRight, Star, Check, ArrowRight } from "lucide-react";

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

  const featured = speakers.find(s => s.is_featured);
  const others = speakers.filter(s => !s.is_featured);

  return (
    <div className="bg-white min-h-screen font-body">
      <Navbar />

      {/* ===== HERO (Corporate AK Parti style) ===== */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden pt-24"
        data-testid="hero-section"
      >
        {/* Split background */}
        <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-7 bg-white relative">
            {/* Decorative grid */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0F2C5C" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hero-grid)"/>
            </svg>
            <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-summit-orange/10 blur-3xl" />
          </div>
          <div className="lg:col-span-5 bg-summit-paper hidden lg:block" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Text */}
            <div className="lg:col-span-7">
              {/* Date stamp */}
              <div className="inline-flex items-center gap-3 mb-6 animate-fade-in stagger-1 opacity-0">
                <div className="w-12 h-0.5 bg-summit-orange" />
                <span className="text-summit-orange text-xs font-bold uppercase tracking-[0.3em]">
                  21 Mayıs 2026 · Perşembe
                </span>
              </div>

              <h1 className="font-display text-summit-navy text-6xl sm:text-7xl lg:text-8xl leading-[0.9] tracking-wide animate-slide-up stagger-2 opacity-0">
                ARSA YATIRIM
                <br />
                <span className="text-orange-gradient">ZİRVESİ</span>
                <br />
                <span className="text-summit-navy">2026</span>
              </h1>

              <p className="text-gray-600 text-base sm:text-lg mt-8 max-w-xl leading-relaxed animate-slide-up stagger-3 opacity-0">
                Türkiye'nin en kapsamlı arsa yatırım buluşmasında uzman konuşmacılar, stratejik içgörüler ve güçlü networking fırsatları sizi bekliyor.
              </p>

              {/* Location pill */}
              <div className="inline-flex items-center gap-2 mt-6 bg-summit-paper border-l-4 border-summit-orange px-4 py-2.5 animate-slide-up stagger-4 opacity-0">
                <MapPin size={15} className="text-summit-orange" />
                <span className="text-summit-navy text-sm font-semibold">Hilton İstanbul Bosphorus · Zirve Salonu</span>
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-4 mt-10 animate-slide-up stagger-5 opacity-0">
                <Link to="/uyelik" className="btn-gold px-8 py-4" data-testid="hero-register-btn">
                  Ücretsiz Üye Ol
                </Link>
                <Link to="/zirve-kaydi" className="btn-outline-navy px-8 py-4 inline-flex items-center gap-2" data-testid="hero-guest-btn">
                  Zirveye Katıl <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            {/* Right: Countdown card */}
            <div className="lg:col-span-5">
              <div className="bg-white border-t-4 border-summit-orange shadow-2xl p-8 rounded-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Geri Sayım</p>
                    <h3 className="font-display text-summit-navy text-2xl tracking-wide mt-1">ZİRVEYE KALAN</h3>
                  </div>
                  <div className="w-10 h-10 rounded bg-summit-orange/10 flex items-center justify-center">
                    <Calendar size={18} className="text-summit-orange" />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2" data-testid="countdown-timer">
                  {[["days", "Gün"], ["hours", "Saat"], ["minutes", "Dk"], ["seconds", "Sn"]].map(([key, label]) => (
                    <div key={key} className="text-center bg-summit-paper border border-gray-200 py-4 rounded-sm">
                      <div className="font-display text-3xl sm:text-4xl font-bold text-summit-navy leading-none tracking-wider">
                        {String(countdown[key] ?? 0).padStart(2, "0")}
                      </div>
                      <div className="text-gray-500 text-[0.6rem] uppercase tracking-widest mt-2 font-bold">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-3">
                  {[["4", "KONUŞMACI"], ["12", "OTURUM"], ["600+", "KATILIMCI"]].map(([n, l]) => (
                    <div key={l} className="text-center">
                      <div className="font-display text-summit-orange text-2xl font-bold tracking-wider">{n}</div>
                      <div className="text-gray-500 text-[0.6rem] uppercase tracking-widest mt-1 font-bold">{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-gray-600 text-xs justify-center">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-semibold uppercase tracking-widest">Kayıtlar Açık · Katılım Ücretsiz</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section className="py-20 sm:py-28 bg-white border-t border-gray-100" data-testid="about-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <span className="section-overline">Zirve Hakkında</span>
              <h2 className="font-display text-summit-navy text-4xl sm:text-5xl lg:text-6xl leading-tight tracking-wide">
                NEDEN ARSA YATIRIM <br />
                <span className="text-orange-gradient">ZİRVESİ</span>?
              </h2>
              <p className="text-gray-600 text-base mt-6 leading-relaxed">
                Arsa Yatırım Zirvesi 2026, Türkiye'nin önde gelen gayrimenkul uzmanlarını, hukukçuları ve piyasa analistlerini bir araya getiren prestijli bir platform sunmaktadır.
              </p>
              <p className="text-gray-600 text-base mt-4 leading-relaxed">
                2026 fırsat haritasından başlayarak hukuki detaylara, bölgesel analizlere ve pratik yatırım stratejilerine kadar kapsamlı bir program sizi bekliyor.
              </p>

              <ul className="mt-8 space-y-3">
                {["Uzman konuşmacılardan birebir bilgi", "Hukuki sorularınıza cevaplar", "Yatırım fırsatlarını keşfedin", "Sektör profesyonelleriyle networking"].map(item => (
                  <li key={item} className="flex items-center gap-3 text-gray-700 text-sm">
                    <div className="w-6 h-6 rounded-sm bg-summit-orange/10 flex items-center justify-center shrink-0">
                      <Check size={13} className="text-summit-orange" />
                    </div>
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="flex gap-4 mt-10">
                <Link to="/zirve-kaydi" className="btn-gold px-6 py-3" data-testid="about-register-btn">Zirveye Katıl</Link>
                <Link to="/program" className="btn-outline-navy px-6 py-3">Programı İncele</Link>
              </div>
            </div>

            <div className="relative">
              <div
                className="w-full h-80 lg:h-[480px] rounded-sm overflow-hidden shadow-2xl"
                style={{
                  backgroundImage: "url(https://images.pexels.com/photos/30584407/pexels-photo-30584407.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              {/* Orange accent stripe */}
              <div className="absolute -top-5 -right-5 w-32 h-32 border-t-4 border-r-4 border-summit-orange rounded-tr-sm" />
              <div className="absolute -bottom-5 -left-5 w-32 h-32 border-b-4 border-l-4 border-summit-orange rounded-bl-sm" />

              {/* Floating stats */}
              <div className="absolute -bottom-10 right-5 bg-white border-l-4 border-summit-orange p-5 shadow-2xl">
                <div className="grid grid-cols-3 gap-5">
                  {[["600+", "KATILIMCI"], ["4", "KONUŞMACI"], ["12", "OTURUM"]].map(([num, label]) => (
                    <div key={label} className="text-center">
                      <div className="font-display text-summit-orange text-2xl font-bold tracking-wide">{num}</div>
                      <div className="text-gray-500 text-[0.6rem] uppercase tracking-widest mt-0.5 font-bold">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURED SPEAKER ===== */}
      {featured && (
        <section className="py-20 sm:py-28 bg-summit-paper" data-testid="featured-speaker-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <span className="section-overline section-overline-center">Zirve Sahibi</span>
              <h2 className="font-display text-summit-navy text-4xl sm:text-5xl lg:text-6xl tracking-wide">ÖNE ÇIKAN KONUŞMACI</h2>
            </div>

            <div className="bg-white shadow-xl border border-gray-200 relative" data-testid="featured-speaker-card">
              <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-summit-orange to-summit-yellow" />
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div
                  className="h-64 lg:h-auto min-h-96"
                  style={{
                    backgroundImage: `url(${featured.image_url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center top",
                  }}
                />
                <div className="p-8 sm:p-12 flex flex-col justify-center">
                  <span className="featured-badge mb-4 inline-block w-fit">ZİRVE SAHİBİ & ORGANİZATÖR</span>
                  <div className="flex items-center gap-1 mb-3">
                    {[1,2,3,4,5].map(i => <Star key={i} size={16} className="text-summit-orange fill-summit-orange" />)}
                  </div>
                  <h2 className="font-display text-summit-navy text-3xl sm:text-4xl lg:text-5xl font-bold tracking-wide uppercase">{featured.name}</h2>
                  <p className="text-summit-orange text-lg mt-2 font-bold uppercase tracking-wider">{featured.title}</p>
                  <p className="text-gray-600 text-sm mt-5 leading-relaxed">{featured.bio}</p>
                  <div className="mt-8">
                    <Link to="/zirve-kaydi" className="btn-gold px-6 py-3" data-testid="featured-register-btn">
                      Zirveye Katıl
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Other speakers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
              {others.map((sp) => (
                <div key={sp.id} className="bg-white border border-gray-200 overflow-hidden shadow-sm card-hover" data-testid={`speaker-card-${sp.name}`}>
                  <div className="h-48 bg-cover bg-top" style={{ backgroundImage: `url(${sp.image_url})` }} />
                  <div className="p-5 border-l-4 border-summit-orange">
                    <h4 className="font-display text-summit-navy text-lg font-bold tracking-wide uppercase">{sp.name}</h4>
                    <p className="text-summit-orange text-xs mt-1.5 font-bold uppercase tracking-wider">{sp.title}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link to="/konusmacilar" className="btn-outline-navy px-7 py-3 inline-flex items-center gap-2">
                Tüm Konuşmacılar <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ===== PROGRAM PREVIEW ===== */}
      <section className="py-20 sm:py-28 bg-white" data-testid="program-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="section-overline section-overline-center">Zirve Programı</span>
            <h2 className="font-display text-summit-navy text-4xl sm:text-5xl lg:text-6xl tracking-wide">GÜNÜN AKIŞI</h2>
            <p className="text-gray-500 mt-3 text-sm font-semibold uppercase tracking-widest">21 Mayıs 2026 · 09:00 - 15:30</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {program.map((session, i) => (
              <div
                key={session.id}
                className={`bg-white border border-gray-200 p-5 card-hover shadow-sm border-l-4 ${
                  session.session_type === "panel" ? "border-l-purple-500" :
                  session.session_type === "break" || session.session_type === "networking" ? "border-l-gray-300" :
                  "border-l-summit-orange"
                }`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-summit-orange text-xs font-mono font-bold bg-summit-orange/10 px-2 py-1">
                    {session.time_start}
                  </span>
                  <span className="text-gray-400 text-xs">→</span>
                  <span className="text-gray-500 text-xs font-mono">{session.time_end}</span>
                </div>
                <h4 className="font-display text-summit-navy text-base tracking-wide uppercase leading-snug">{session.title}</h4>
                {session.speaker_name && (
                  <p className="text-summit-orange text-xs mt-2 font-bold uppercase tracking-wider">{session.speaker_name}</p>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/program" className="btn-navy px-8 py-3" data-testid="view-full-program-btn">
              Tüm Programı Gör
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SPONSORS ===== */}
      <div className="bg-summit-paper py-12 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-gray-500 text-xs uppercase tracking-[0.3em] mb-8 font-bold">Destekçilerimiz</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {sponsors.map((sp) => (
              <div key={sp.id} className="flex flex-col items-center gap-2">
                <div className={`px-8 py-4 border font-display text-base font-bold tracking-wide uppercase ${sp.tier === "main" ? "bg-summit-orange/8 border-summit-orange/30 text-summit-navy" : "bg-white border-gray-200 text-gray-600"}`}>
                  {sp.name}
                </div>
                {sp.tier === "main" && <span className="tier-main">Ana Sponsor</span>}
                {sp.tier === "organization" && <span className="tier-organization">Organizasyon</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== PAST EVENTS PREVIEW ===== */}
      {events.length > 0 && (
        <section className="py-20 sm:py-28 bg-white" data-testid="past-events-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-14">
              <div>
                <span className="section-overline">Geçmiş Etkinlikler</span>
                <h2 className="font-display text-summit-navy text-4xl sm:text-5xl lg:text-6xl tracking-wide">BÜYÜYEN BİR GELENEK</h2>
              </div>
              <Link to="/etkinlikler" className="btn-outline-navy px-5 py-2.5 hidden sm:block">
                Tümünü Gör
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {events.map((ev) => (
                <div key={ev.id} className="group bg-white border border-gray-200 overflow-hidden card-hover shadow-sm" data-testid={`event-card-${ev.year}`}>
                  <div
                    className="h-44 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${ev.image_url})` }}
                  />
                  <div className="p-5 border-l-4 border-summit-orange">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-summit-orange text-lg font-display font-bold tracking-wider">{ev.year}</span>
                      {ev.attendee_count && <span className="text-gray-400 text-xs font-semibold">{ev.attendee_count}+ Katılımcı</span>}
                    </div>
                    <h4 className="font-display text-summit-navy text-base tracking-wide uppercase">{ev.title}</h4>
                    <p className="text-gray-500 text-xs mt-1 font-medium">{ev.venue}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== CTA ===== */}
      <section className="relative bg-summit-navy py-24 sm:py-32 overflow-hidden" data-testid="cta-section">
        <div className="absolute top-0 left-0 right-0 corp-accent-bar" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-summit-orange/10 blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-summit-orange text-xs font-bold uppercase tracking-[0.3em] mb-4">Sınırlı Kontenjan</span>
          <h2 className="font-display text-white text-4xl sm:text-5xl lg:text-6xl leading-tight tracking-wide">YERİNİZİ AYIRTIN</h2>
          <p className="text-white/70 text-base mt-5 leading-relaxed max-w-xl mx-auto">
            Arsa yatırımı dünyasının zirvesinde yerinizi alın. Ücretsiz kayıt ile tüm oturumları ve networking etkinliğini keşfedin.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link to="/uyelik" className="btn-gold px-10 py-4" data-testid="cta-member-btn">
              Üyelik Oluştur
            </Link>
            <Link to="/zirve-kaydi" className="btn-outline-gold px-10 py-4" data-testid="cta-guest-btn">
              Zirve Kaydı
            </Link>
          </div>
          <p className="text-white/40 text-xs mt-5 uppercase tracking-widest font-semibold">Katılım Tamamen Ücretsizdir</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
