import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { MapPin, Calendar, Users, Award, ChevronRight, Star, Check } from "lucide-react";

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

      {/* ===== HERO (light) ===== */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-summit-paper via-white to-summit-gold/5"
        data-testid="hero-section"
      >
        {/* Decorative geometric background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full bg-summit-gold/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-32 w-[560px] h-[560px] rounded-full bg-summit-navy/5 blur-3xl" />
          {/* subtle grid */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-light" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1A2744" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-light)"/>
          </svg>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-28 pb-20">
          {/* Top badge */}
          <div className="inline-flex items-center gap-2 bg-white border border-summit-gold/30 rounded-full px-5 py-2 mb-6 shadow-sm animate-fade-in stagger-1 opacity-0">
            <span className="w-2 h-2 rounded-full bg-summit-gold animate-pulse" />
            <span className="text-summit-navy text-xs font-semibold tracking-widest uppercase">
              21 Mayıs 2026 &nbsp;|&nbsp; Hilton İstanbul Bosphorus
            </span>
          </div>

          <h1 className="font-heading font-bold text-summit-navy text-5xl sm:text-6xl lg:text-7xl leading-tight animate-slide-up stagger-2 opacity-0">
            Arsa Yatırım{" "}
            <span className="text-gold-gradient">Zirvesi</span>
            <br />
            <span className="text-summit-navy">2026</span>
          </h1>

          <p className="text-gray-600 text-lg mt-6 max-w-2xl mx-auto leading-relaxed animate-slide-up stagger-3 opacity-0">
            Türkiye'nin en kapsamlı arsa yatırım buluşmasında uzman konuşmacılar, stratejik içgörüler ve güçlü networking fırsatları sizi bekliyor.
          </p>

          {/* Countdown (light) */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-10 animate-slide-up stagger-4 opacity-0" data-testid="countdown-timer">
            {[["days", "Gün"], ["hours", "Saat"], ["minutes", "Dakika"], ["seconds", "Saniye"]].map(([key, label]) => (
              <div key={key} className="bg-white border border-gray-200 rounded-2xl py-4 px-5 min-w-[76px] shadow-sm">
                <div className="font-heading text-3xl sm:text-4xl font-bold text-summit-navy leading-none">
                  {String(countdown[key] ?? 0).padStart(2, "0")}
                </div>
                <div className="text-gray-500 text-[0.6rem] uppercase tracking-widest mt-2">{label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-slide-up stagger-5 opacity-0">
            <Link to="/uyelik" className="btn-gold text-base px-8 py-3.5" data-testid="hero-register-btn">
              Ücretsiz Üye Ol
            </Link>
            <Link to="/zirve-kaydi" className="btn-outline-navy text-base px-8 py-3.5" data-testid="hero-guest-btn">
              Zirveye Katıl
            </Link>
          </div>

          {/* Quick info row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-14 max-w-4xl mx-auto">
            {[
              { icon: Calendar, label: "21 Mayıs 2026" },
              { icon: MapPin, label: "Hilton Bosphorus" },
              { icon: Users, label: "4 Uzman Konuşmacı" },
              { icon: Award, label: "Ücretsiz Katılım" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center justify-center gap-2 bg-white/60 backdrop-blur border border-gray-200 rounded-xl py-3 px-4">
                <Icon size={15} className="text-summit-gold shrink-0" />
                <span className="text-gray-700 text-xs sm:text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section className="py-20 sm:py-28 bg-white" data-testid="about-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <span className="section-overline">Zirve Hakkında</span>
              <h2 className="font-heading text-summit-navy text-4xl sm:text-5xl leading-tight">
                Neden Arsa Yatırım <span className="text-gold-gradient">Zirvesi</span>?
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
                    <div className="w-5 h-5 rounded-full bg-summit-gold/15 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-summit-gold" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex gap-4 mt-10">
                <Link to="/zirve-kaydi" className="btn-gold px-6 py-3 text-sm" data-testid="about-register-btn">Zirveye Katıl</Link>
                <Link to="/program" className="btn-outline-navy px-6 py-3 text-sm">Programı İncele</Link>
              </div>
            </div>

            <div className="relative">
              <div
                className="w-full h-80 lg:h-96 rounded-2xl overflow-hidden shadow-xl"
                style={{
                  backgroundImage: "url(https://images.pexels.com/photos/30584407/pexels-photo-30584407.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              {/* Floating stats */}
              <div className="absolute -bottom-5 -left-5 bg-white border border-gray-200 rounded-xl p-5 shadow-xl">
                <div className="grid grid-cols-3 gap-5">
                  {[["600+", "Katılımcı"], ["4", "Konuşmacı"], ["12", "Oturum"]].map(([num, label]) => (
                    <div key={label} className="text-center">
                      <div className="font-heading text-summit-gold text-2xl font-bold">{num}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{label}</div>
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
              <span className="section-overline">Zirve Sahibi</span>
              <h2 className="font-heading text-summit-navy text-4xl sm:text-5xl">Öne Çıkan Konuşmacı</h2>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100" data-testid="featured-speaker-card">
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
                  <span className="featured-badge mb-4 inline-block w-fit">Zirve Sahibi & Organizatör</span>
                  <div className="flex items-center gap-1 mb-3">
                    {[1,2,3,4,5].map(i => <Star key={i} size={16} className="text-summit-gold fill-summit-gold" />)}
                  </div>
                  <h2 className="font-heading text-summit-navy text-3xl sm:text-4xl font-bold">{featured.name}</h2>
                  <p className="text-summit-gold text-lg mt-2 font-semibold">{featured.title}</p>
                  <p className="text-gray-600 text-sm mt-5 leading-relaxed">{featured.bio}</p>
                  <div className="mt-8">
                    <Link to="/zirve-kaydi" className="btn-gold px-6 py-3 text-sm" data-testid="featured-register-btn">
                      Zirveye Katıl
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Other speakers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
              {others.map((sp) => (
                <div key={sp.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm card-hover" data-testid={`speaker-card-${sp.name}`}>
                  <div className="h-48 bg-cover bg-top" style={{ backgroundImage: `url(${sp.image_url})` }} />
                  <div className="p-5">
                    <h4 className="font-heading text-summit-navy text-base font-semibold">{sp.name}</h4>
                    <p className="text-summit-gold text-xs mt-1.5 font-medium">{sp.title}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link to="/konusmacilar" className="btn-outline-navy px-7 py-3 text-sm inline-flex items-center gap-2">
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
            <span className="section-overline">Zirve Programı</span>
            <h2 className="font-heading text-summit-navy text-4xl sm:text-5xl">Günün Akışı</h2>
            <p className="text-gray-500 mt-3 text-sm">21 Mayıs 2026 | 09:00 - 15:30</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {program.map((session, i) => (
              <div
                key={session.id}
                className={`bg-white rounded-xl border border-gray-100 p-5 card-hover shadow-sm border-l-4 ${
                  session.session_type === "panel" ? "border-l-purple-500" :
                  session.session_type === "break" || session.session_type === "networking" ? "border-l-gray-300" :
                  "border-l-summit-gold"
                }`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-summit-gold text-xs font-mono font-semibold bg-summit-gold/10 px-2 py-1 rounded">
                    {session.time_start}
                  </span>
                  <span className="text-gray-400 text-xs">→</span>
                  <span className="text-gray-500 text-xs font-mono">{session.time_end}</span>
                </div>
                <h4 className="font-heading text-summit-navy text-sm font-semibold leading-snug">{session.title}</h4>
                {session.speaker_name && (
                  <p className="text-summit-gold text-xs mt-2 font-medium">{session.speaker_name}</p>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/program" className="btn-navy px-8 py-3 text-sm" data-testid="view-full-program-btn">
              Tüm Programı Gör
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SPONSORS ===== */}
      <div className="bg-summit-paper py-12 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-gray-400 text-xs uppercase tracking-widest mb-8 font-semibold">Destekçilerimiz</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {sponsors.map((sp) => (
              <div key={sp.id} className="flex flex-col items-center gap-2">
                <div className={`px-8 py-4 rounded-xl border font-heading text-base font-bold ${sp.tier === "main" ? "bg-summit-gold/8 border-summit-gold/30 text-summit-navy" : "bg-white border-gray-200 text-gray-600"}`}>
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
                <h2 className="font-heading text-summit-navy text-4xl sm:text-5xl">Büyüyen Bir Gelenek</h2>
              </div>
              <Link to="/etkinlikler" className="btn-outline-navy px-5 py-2.5 text-sm hidden sm:block">
                Tümünü Gör
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {events.map((ev) => (
                <div key={ev.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden card-hover shadow-sm" data-testid={`event-card-${ev.year}`}>
                  <div
                    className="h-44 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${ev.image_url})` }}
                  />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-summit-gold text-sm font-heading font-bold">{ev.year}</span>
                      {ev.attendee_count && <span className="text-gray-400 text-xs">{ev.attendee_count}+ Katılımcı</span>}
                    </div>
                    <h4 className="font-heading text-summit-navy text-base font-semibold">{ev.title}</h4>
                    <p className="text-gray-400 text-xs mt-1">{ev.venue}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== CTA (light) ===== */}
      <section className="relative bg-summit-paper py-24 sm:py-32 overflow-hidden" data-testid="cta-section">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-summit-gold/5 blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-summit-gold text-xs font-semibold uppercase tracking-widest mb-4">Sınırlı Kontenjan</span>
          <h2 className="font-heading text-summit-navy text-4xl sm:text-5xl leading-tight">Yerinizi Ayırtın</h2>
          <p className="text-gray-600 text-base mt-5 leading-relaxed max-w-xl mx-auto">
            Arsa yatırımı dünyasının zirvesinde yerinizi alın. Ücretsiz kayıt ile tüm oturumları ve networking etkinliğini keşfedin.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link to="/uyelik" className="btn-gold text-base px-10 py-4" data-testid="cta-member-btn">
              Üyelik Oluştur
            </Link>
            <Link to="/zirve-kaydi" className="btn-outline-navy text-base px-10 py-4" data-testid="cta-guest-btn">
              Zirve Kaydı
            </Link>
          </div>
          <p className="text-gray-400 text-xs mt-5">Katılım tamamen ücretsizdir</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
