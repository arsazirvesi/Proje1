import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { MapPin, Calendar, Users, Award, ChevronRight, Star } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({});
  useEffect(() => {
    const calc = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
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

  const sessionTypeColor = (type) => {
    if (type === "break" || type === "networking") return "border-l-slate-500";
    if (type === "panel") return "border-l-purple-500";
    return "border-l-summit-gold";
  };

  return (
    <div className="bg-summit-navy min-h-screen font-body">
      <Navbar />

      {/* ===== HERO ===== */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        data-testid="hero-section"
        style={{
          backgroundImage: "url(https://images.pexels.com/photos/32990165/pexels-photo-32990165.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute inset-0 bg-summit-navy/30" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 pb-16">
          <span className="section-overline animate-fade-in stagger-1 opacity-0">
            21 Mayıs 2026 &nbsp;|&nbsp; Hilton İstanbul Bosphorus
          </span>

          <h1 className="font-heading font-bold text-white text-5xl sm:text-6xl lg:text-7xl leading-tight mt-4 animate-slide-up stagger-2 opacity-0">
            Arsa Yatırım{" "}
            <span className="text-gold-gradient">Zirvesi</span>{" "}
            <br />2026
          </h1>

          <p className="text-summit-text-secondary text-lg mt-6 max-w-2xl mx-auto leading-relaxed animate-slide-up stagger-3 opacity-0">
            Türkiye'nin en kapsamlı arsa yatırım buluşmasında uzman konuşmacılar, stratejik içgörüler ve güçlü networking fırsatları sizi bekliyor.
          </p>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 mt-10 animate-slide-up stagger-4 opacity-0" data-testid="countdown-timer">
            {[["days", "Gün"], ["hours", "Saat"], ["minutes", "Dakika"], ["seconds", "Saniye"]].map(([key, label]) => (
              <div key={key} className="countdown-box">
                <div className="countdown-number">{String(countdown[key] ?? 0).padStart(2, "0")}</div>
                <div className="countdown-label">{label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-slide-up stagger-5 opacity-0">
            <Link to="/uyelik" className="btn-gold text-base px-8 py-3.5" data-testid="hero-register-btn">
              Ücretsiz Kayıt Ol
            </Link>
            <Link to="/zirve-kaydi" className="btn-outline-gold text-base px-8 py-3.5" data-testid="hero-guest-btn">
              Zirveye Katıl
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float">
          <div className="w-px h-10 bg-gradient-to-b from-transparent to-summit-gold/60" />
          <div className="w-2 h-2 rounded-full bg-summit-gold/60" />
        </div>
      </section>

      {/* ===== INFO BAR ===== */}
      <div className="bg-summit-paper border-y border-summit-gold/15 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { icon: Calendar, label: "21 Mayıs 2026, Perşembe" },
              { icon: MapPin, label: "Hilton İstanbul Bosphorus" },
              { icon: Users, label: "4 Uzman Konuşmacı" },
              { icon: Award, label: "Ücretsiz Katılım" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center justify-center gap-2">
                <Icon size={16} className="text-summit-gold shrink-0" />
                <span className="text-summit-text-secondary text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== FEATURED SPEAKER (Muhammet Özdemir) ===== */}
      {featured && (
        <section className="py-24 sm:py-32" data-testid="featured-speaker-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="section-overline">Zirve Sahibi</span>
              <h2 className="font-heading text-white text-4xl sm:text-5xl">Konuk Konuşmacımız</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Featured speaker card - 8 cols */}
              <div className="lg:col-span-8 relative rounded-2xl overflow-hidden border border-summit-gold/25 gold-glow" data-testid="featured-speaker-card">
                <div className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${featured.image_url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center top",
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-summit-navy via-summit-navy/70 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-summit-navy/60 to-transparent" />

                <div className="relative z-10 p-8 sm:p-12 flex flex-col justify-end min-h-[480px]">
                  <span className="featured-badge mb-3 inline-block w-fit">Zirve Sahibi</span>
                  <div className="flex items-center gap-2 mb-1">
                    {[1,2,3,4,5].map(i => <Star key={i} size={14} className="text-summit-gold fill-summit-gold" />)}
                  </div>
                  <h3 className="font-heading text-white text-3xl sm:text-4xl font-bold">{featured.name}</h3>
                  <p className="text-summit-gold text-base mt-2">{featured.title}</p>
                  <p className="text-summit-text-secondary text-sm mt-4 max-w-xl leading-relaxed line-clamp-3">{featured.bio}</p>
                  <Link to="/konusmacilar" className="btn-gold mt-6 inline-flex items-center gap-2 text-sm w-fit px-6 py-2.5">
                    Profili İncele <ChevronRight size={16} />
                  </Link>
                </div>
              </div>

              {/* Other speakers - 4 cols */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {others.map((sp) => (
                  <div
                    key={sp.id}
                    className="bg-summit-paper rounded-xl border border-white/8 p-5 card-hover flex items-center gap-4 flex-1"
                    data-testid={`speaker-card-${sp.name}`}
                  >
                    <div
                      className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-summit-gold/20"
                      style={{ backgroundImage: `url(${sp.image_url})`, backgroundSize: "cover", backgroundPosition: "center top" }}
                    />
                    <div>
                      <h4 className="font-heading text-white text-base font-semibold leading-tight">{sp.name}</h4>
                      <p className="text-summit-gold text-xs mt-1">{sp.title}</p>
                    </div>
                  </div>
                ))}
                <Link
                  to="/konusmacilar"
                  className="bg-summit-surface/50 rounded-xl border border-summit-gold/20 p-5 flex items-center justify-center gap-2 text-summit-gold text-sm font-medium hover:bg-summit-surface transition-colors"
                >
                  Tüm Konuşmacılar <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== ABOUT ===== */}
      <section className="py-20 bg-summit-paper/30" data-testid="about-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <span className="section-overline">Zirve Hakkında</span>
              <h2 className="font-heading text-white text-4xl sm:text-5xl leading-tight">
                Neden Arsa Yatırım <span className="text-gold-gradient">Zirvesi</span>?
              </h2>
              <p className="text-summit-text-secondary text-base mt-6 leading-relaxed">
                Arsa Yatırım Zirvesi 2026, Türkiye'nin önde gelen gayrimenkul yatırım uzmanlarını, hukukçuları ve piyasa analistlerini bir araya getiren prestijli bir platform sunmaktadır.
              </p>
              <p className="text-summit-text-secondary text-base mt-4 leading-relaxed">
                2026 fırsat haritasından başlayarak hukuki detaylara, bölgesel analizlere ve pratik yatırım stratejilerine kadar kapsamlı bir program sizi bekliyor.
              </p>

              <div className="grid grid-cols-3 gap-5 mt-10">
                {[["600+", "Katılımcı"], ["4", "Konuşmacı"], ["12", "Oturum"]].map(([num, label]) => (
                  <div key={label} className="text-center">
                    <div className="font-heading text-summit-gold text-3xl font-bold">{num}</div>
                    <div className="text-summit-text-muted text-xs uppercase tracking-widest mt-1">{label}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 mt-10">
                <Link to="/zirve-kaydi" className="btn-gold px-6 py-3 text-sm" data-testid="about-register-btn">Zirveye Katıl</Link>
                <Link to="/program" className="btn-outline-gold px-6 py-3 text-sm">Programı İncele</Link>
              </div>
            </div>

            <div className="relative">
              <div
                className="w-full h-80 lg:h-96 rounded-2xl overflow-hidden border border-summit-gold/20"
                style={{
                  backgroundImage: "url(https://images.pexels.com/photos/30584407/pexels-photo-30584407.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              {/* Floating badge */}
              <div className="absolute -bottom-5 -left-5 bg-summit-paper border border-summit-gold/30 rounded-xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gold-gradient rounded-lg flex items-center justify-center">
                    <MapPin size={18} className="text-summit-navy" />
                  </div>
                  <div>
                    <div className="text-white text-xs font-semibold">Hilton İstanbul Bosphorus</div>
                    <div className="text-summit-text-muted text-xs">Zirve Salonu</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PROGRAM PREVIEW ===== */}
      <section className="py-24 sm:py-32" data-testid="program-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="section-overline">Zirve Programı</span>
            <h2 className="font-heading text-white text-4xl sm:text-5xl">Günün Akışı</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {program.map((session, i) => (
              <div
                key={session.id}
                className={`bg-summit-paper rounded-xl border-l-4 border border-white/8 p-5 card-hover ${sessionTypeColor(session.session_type)}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-summit-gold text-xs font-mono font-medium bg-summit-gold/10 px-2 py-1 rounded">
                    {session.time_start}
                  </span>
                  <span className="text-summit-text-muted text-xs">-</span>
                  <span className="text-summit-text-muted text-xs font-mono">{session.time_end}</span>
                </div>
                <h4 className="font-heading text-white text-sm font-semibold leading-snug">{session.title}</h4>
                {session.speaker_name && (
                  <p className="text-summit-gold text-xs mt-2">{session.speaker_name}</p>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/program" className="btn-outline-gold px-8 py-3 text-sm" data-testid="view-full-program-btn">
              Tüm Programı Gör
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SPONSORS ===== */}
      <div className="bg-summit-paper/30 py-12 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-summit-text-muted text-xs uppercase tracking-widest mb-8">Destekçilerimiz</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {sponsors.map((sp) => (
              <div key={sp.id} className="flex flex-col items-center gap-2">
                <div className={`px-6 py-3 rounded-lg border font-heading text-base font-semibold ${sp.tier === "main" ? "bg-summit-gold/10 border-summit-gold/40 text-summit-gold" : "bg-white/5 border-white/10 text-summit-text-secondary"}`}>
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
        <section className="py-24 sm:py-32" data-testid="past-events-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-14">
              <div>
                <span className="section-overline">Geçmiş Etkinlikler</span>
                <h2 className="font-heading text-white text-4xl sm:text-5xl">Büyüyen Bir Gelenek</h2>
              </div>
              <Link to="/etkinlikler" className="btn-outline-gold px-5 py-2.5 text-sm hidden sm:block">
                Tümünü Gör
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="group bg-summit-paper rounded-2xl border border-white/8 overflow-hidden card-hover"
                  data-testid={`event-card-${ev.year}`}
                >
                  <div
                    className="h-44 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${ev.image_url})` }}
                  />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-summit-gold text-xs font-mono font-bold">{ev.year}</span>
                      {ev.attendee_count && (
                        <span className="text-summit-text-muted text-xs">{ev.attendee_count}+ Katılımcı</span>
                      )}
                    </div>
                    <h4 className="font-heading text-white text-base">{ev.title}</h4>
                    <p className="text-summit-text-muted text-xs mt-1">{ev.venue}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== REGISTRATION CTA ===== */}
      <section
        className="py-24 sm:py-32 relative overflow-hidden"
        style={{
          backgroundImage: "url(https://images.pexels.com/photos/26202153/pexels-photo-26202153.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        data-testid="cta-section"
      >
        <div className="absolute inset-0 bg-summit-navy/85" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="section-overline">Sınırlı Kontenjan</span>
          <h2 className="font-heading text-white text-4xl sm:text-5xl">Yerinizi Ayırtın</h2>
          <p className="text-summit-text-secondary text-base mt-5 leading-relaxed">
            Arsa yatırımı dünyasının zirvesinde yerinizi alın. Ücretsiz kayıt ile tüm oturumları, networking etkinliğini ve 8. Gayrimenkul Proje Yatırım Fuarı'nı keşfedin.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link to="/uyelik" className="btn-gold text-base px-10 py-4" data-testid="cta-member-btn">
              Üyelik Oluştur
            </Link>
            <Link to="/zirve-kaydi" className="btn-outline-gold text-base px-10 py-4" data-testid="cta-guest-btn">
              Zirve Kaydı
            </Link>
          </div>
          <p className="text-summit-text-muted text-xs mt-5">* Katılım tamamen ücretsizdir</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
